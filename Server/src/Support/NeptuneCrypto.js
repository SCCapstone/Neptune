var NeptuneCrypto = {}

const hkdf = require("futoin-hkdf"); // wait what https://nodejs.org/api/crypto.html#cryptohkdfdigest-ikm-salt-info-keylen-callback
const crypto = require('node:crypto');
const { Neptune } = require("node:process");


const defaultCipherAlgorithm = "chacha20-poly1305" // P-good, although the slowest
const defaultHashAlgorithm = "sha256" // It works
const encryptedPrefix = "ncrypt::";

// A list of "supported" (we know the proper key lengths) ciphers for encrypting data
const encryptionCipherKeyLengths = { // algorithm: [keyLenght (bytes), iv/secondary (bytes)]
	'chacha20-poly1305': [32, 12], // 256 bit key, 96 bit nonce
	'chacha20': [32, 16], // 256 bit key, 96 bit nonce (nodejs implementation is broken, requires 16 bytes)
	'aes-256-gcm': [32, 16], // 256 bit key, 128 bit iv
	'aes-256-cbc': [32, 16], // See above
	'aes256': [32, 16], // See above

	'aes-192-gcm': [24, 16],
	'aes-192-cbc': [24, 16],
	'aes192': [24, 16],

	'aes-128-gcm': [16, 16],
	'aes-128-cbc': [16, 16],
	'aes128': [16, 16]
}

// Errors
class DataNotEncrypted extends Error {
	constructor() {
		let message = "Data not encrypted, cannot find encrypted prefix " + toString(encryptedPrefix);
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}
class EncryptedDataSplitError extends Error {
	/** @param {(string|number)} actualParts Number of splits in the data
	  * @param {(string|number)} requestedParts Number of splits required in the data */
	constructor(actualParts, requestedParts) {
		let message = "Encrypted data does not split properly (contains " + toString(actualParts) + " not " + toString(requestedParts) + " parts).";
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}
class EncryptedDataInvalidVersion extends Error {
	/** @param {(string|number)} version Reported version from encrypted data */
	constructor(version) {
		let message = "Invalid encrypted data version, no idea how to handle version: " + toString(version);
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}
class UnsupportedCipher extends Error {
	/** @param {string} requestedCipher Cipher requested but is not supported */
	constructor(requestedCipher) {
		let message = "Unsupported cipher: " + toString(requestedCipher) + ". Use chacha20, aes-256-gcm, or aes128.";
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}
class MissingDecryptionKey extends Error {
	constructor() {
		super("Empty decryption key passed in with encrypted data.");
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}
class InvalidDecryptionKey extends Error {
	constructor() {
		super("Provided key was unable to decrypt the data, wrong key.");
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

NeptuneCrypto.Errors = {
	DataNotEncrypted: DataNotEncrypted,
	EncryptedDataSplitError: EncryptedDataSplitError,
	EncryptedDataInvalidVersion: EncryptedDataInvalidVersion,
	UnsupportedCipher: UnsupportedCipher,
	MissingDecryptionKey: MissingDecryptionKey,
	InvalidDecryptionKey: InvalidDecryptionKey
}


// Methods
const convert = (str, from, to) => Buffer.from(str, from).toString(to)



/**
 * AES Key
 * @typedef {object} AESKey
 * @property {Buffer} key The AES key itself
 * @property {Buffer} iv The initialization vector
 */

 /**
  * HKDF options
  * @typedef {object} HKDFOptions
  * @property {string} [hashAlgorithm = "sha256"] Hashing algorithm used in deriving the key via HKDF
  * @property {int} [keyLength = 32] AES key length (this can just be your primary key)
  * @property {int} [ivLength = 16] IV length, needs to be 16 for any AES algorithm. If not needing a AES key, this can just be a secondary key (and ignored)
  * @property {boolean} [uniqueIV = true] The IV generated is random. DO NOT SET THIS TO FALSE! Only set to false IF the IV must be shared and cannot be synced/transmitted
  */



/**
 * Generates a random string. Does not touch the RNG seed, recommend you set that first.
 * @param {int} len Length of random string
 * @param {int} [minChar = 33] The lower character code. Must be >=33 (no control characters).
 * @param {int} [maxChar = 128] The upper character code. Must be <=220, but weird stuff happens above 128 (standard ASCII)
 */
NeptuneCrypto.randomString = function(len, minChar, maxChar) {
	var str = ""
	if (maxChar == undefined || maxChar > 220)
		maxChar = 128;
	if (minChar == undefined || minChar < 33)
		minChar = 33;

	if (minChar>maxChar) {
		minChar = minChar + maxChar;
		maxChar = minChar - maxChar;
		minChar = minChar - maxChar;
	}

	for (var i = 0; i<len; i++)
		str += String.fromCharCode((Math.random()* (maxChar - minChar) +minChar));
	return str;
}



/**
 * Derive an encryption key from a shared secret
 * @param {(string|int)} sharedSerect The shared secret
 * @param {string} [salt = undefined] The shared or stored salt
 * @param {HKDFOptions} [options] Additional things you can tweak (key length, iv length, hash algorithm)
 * @return {AESKey} AES key and IV
 */
NeptuneCrypto.HKDF = function(sharedSecret, salt, options) {
	if (typeof sharedSecret !== "string")
		throw new TypeError("sharedSecret expected string got " + (typeof sharedSecret).toString());
	if (salt !== undefined) {
		if (typeof salt !== "string")
			throw new TypeError("salt expected string got " + (typeof salt).toString());
	} else {
		salt = "mySalt1234";
	}
	if (options == undefined)
		options = {}

	if (sharedSecret == "")
		throw new TypeError("sharedSecret expected non-empty string, got an empty string. Your passkey cannot be empty.");

	var hashAlgorithm = "sha256";
	var keyLength = 32;
	var ivLength = 16; // pretty much everything
	var uniqueIV = true;
	if (options.hashAlgorithm !== undefined) {
		if (typeof options.hashAlgorithm === "string") {
			if (crypto.getHashes().includes(options.hashAlgorithm))
				hashAlgorithm = options.hashAlgorithm;
			else
				throw new TypeError("Unsupported hash algorithm " + options.hashAlgorithm);
		} else
			throw new TypeError("options.hashAlgorithm expected string got " + (typeof options.hashAlgorithm).toString());
	}
	if (options.keyLength !== undefined) {
		if (typeof options.keyLength !== "number")
			throw new TypeError("options.keyLength expected number got " + (typeof options.keyLength).toString());
		keyLength = options.keyLength;
		
	}

	if (options.ivLength !== undefined) {
		if (typeof options.ivLength !== "number")
			throw new TypeError("options.ivLength expected number got " + (typeof options.ivLength).toString());
		ivLength = options.ivLength;
	}
	if (options.uniqueIV === false)
		uniqueIV = false

	let hashLength = hkdf.hash_length(hashAlgorithm);
	let pseudoRandomKey = hkdf.extract(hashAlgorithm, hashLength, sharedSecret, salt); // Step 1
	let expandedAesKey = hkdf.expand(hashAlgorithm, hashLength, pseudoRandomKey, keyLength); // Step 2 (for shared AES key)
	
	var iv;
	if (uniqueIV)
		iv = Buffer.from(NeptuneCrypto.randomString(ivLength), 'utf8');
	else
		iv = hkdf.expand(hashAlgorithm, hashLength, pseudoRandomKey, ivLength); // use this ONLY when the IV needs to be shared between two separate clients
	
	return {key: expandedAesKey, iv: iv};
}



// see: https://gist.github.com/btxtiger/e8eaee70d6e46729d127f1e384e755d6

/**
 * @typedef {object} EncryptionOptions
 * @property {string} [hashAlgorithm = "sha256"] Hashing algorithm used in deriving the key via HKDF
 * @property {string} [cipherAlgorithm = ""] Encryption method. Can be: `chacha20-poly1305`, `aes-256-gcm`, `aes256` or anything else defined in `encryptionCipherKeyLengths`
 * 
 */

/**
 * Encrypts plain text data using the requested algorithm and key. Uses HKDF to derive the actual encryption keys from your provided key.
 * 
 * @throws {TypeError} Parameter types are incorrect
 * @throws {UnsupportedCipher} Unsupported cipher requested
 * 
 * @param {string} plainText Plain text you wish to encrypt
 * @param {string} key Encryption key (we'll use HKDF to derive the actual key)
 * @param {string} [salt] Encryption salt (passed to HKDF). If undefined, a random string of length 32 will be used
 * @param {EncryptionOptions} [options] Misc options, such as the hash algorithm or cipher used.
 * @return {string} Encrypted data
 */
NeptuneCrypto.encrypt = function(plainText, key, salt, options) {
	var cipherAlgorithm = defaultCipherAlgorithm;;
	if (options !== undefined) {
		if (options.cipherAlgorithm !== undefined)
			cipherAlgorithm = options.cipherAlgorithm;
	}
	
	if (Buffer.isBuffer(key))
		key = key.toString('utf8');

	if (typeof cipherAlgorithm !== "string")
		throw new TypeError("cipherAlgorithm expected string got " + (typeof cipherAlgorithm).toString());

	if (Buffer.isBuffer(plainText))
		plainText = plainText.toString('utf8');
	if (typeof plainText !== "string")
		throw new TypeError("plainText expected string got " + (typeof plainText).toString());
	if (typeof key !== "string")
		throw new TypeError("key expected string got " + (typeof key).toString());
	if (salt !== undefined) {
		if (typeof salt !== "string")
			throw new TypeError("salt expected string got " + (typeof salt).toString());
	} else {
		salt = NeptuneCrypto.randomString(32);
	}
	if (options == undefined)
		options = {}


	let keyParameters = encryptionCipherKeyLengths[cipherAlgorithm];
	if (keyParameters == undefined)
		throw new UnsupportedCipher(cipherAlgorithm);

	var useAAD = false;
	var AAD;
	var authTag;
	if (cipherAlgorithm == "aes-256-gcm" || cipherAlgorithm == "chacha20-poly1305" || cipherAlgorithm == "aes-192-gcm" || cipherAlgorithm == "aes-128-gcm") {
		useAAD = true;
		if (options.AAD !== undefined) {
			if (typeof options.AAD === "string")
				AAD =  Buffer.from(options.AAD)
		}
		if (AAD == undefined)
			AAD =  Buffer.from(NeptuneCrypto.randomString(16), 'utf8'); // 128 bit AAD
	}
	if (options.hashAlgorithm === undefined)
		options.hashAlgorithm = defaultHashAlgorithm;

	let encryptionKey = NeptuneCrypto.HKDF(key, salt, { hashAlgorithm: options.hashAlgorithm, keyLength: keyParameters[0], ivLength: keyParameters[1] });
	let cipher = crypto.createCipheriv(cipherAlgorithm, encryptionKey.key, encryptionKey.iv, { authTagLength: 16 });
	
	if (useAAD && AAD !== undefined)
		cipher.setAAD(AAD);

	let encryptedData = Buffer.concat([cipher.update(Buffer.from(plainText, 'utf8')), cipher.final()]);
	
	if (useAAD)
		authTag = cipher.getAuthTag();

	// We'll store data like this:
	// <prefix>::version:cipherAlgorithm:hashAlgorithm:salt:garbage:iv:encryptedData
	// <prefix>::version:cipherAlgorithm:hashAlgorithm:salt:garbage:iv:encryptedData:additionalData:authTag
	var ourOutput = encryptedPrefix;
	ourOutput += "1:"								// Version
	ourOutput += cipherAlgorithm + ":"				// Cipher algorithm
	ourOutput += options.hashAlgorithm + ":"		// HKDF hash algorithm
	ourOutput += convert(salt, 'utf8', 'base64') + ":"	// Salt
	ourOutput += convert(NeptuneCrypto.randomString(16), "utf8", "base64") + ":" // Garbage, means nothing
	ourOutput += encryptionKey.iv.toString('hex') + ":" // IV
	ourOutput += encryptedData.toString('base64');	// The data.
	if (useAAD) {
		ourOutput += ":" + convert(AAD, 'utf8', 'base64') + ":";
		ourOutput += authTag.toString('hex');
	}

	return ourOutput;
}




/**
 * Decrypts data using the encrypted data and key.\
 * Encrypted data needs to be in a special format, `ncrypt::version:a:b:c:d:e:f` with `:g:i` added at the end for AEAD ciphers
 * 
 * @throws {TypeError} Parameter types are incorrect.
 * @throws {DataNotEncrypted} Unable to find the encryption prefix, likely data is not even encrypted.
 * @throws {EncryptedDataSplitError} Data not stored correctly, cannot split on ':' enough times to be valid.
 * @throws {EncryptedDataInvalidVersion} Not sure how to decrypt this data, how is it stored (which parts mean what)?
 * @throws {UnsupportedCipher} Unsupported cipher used to encrypt the data
 * @throws {InvalidDecryptionKey} Wrong decryption key used
 * 
 * @param {(string|Buffer)} encryptedText Encrypted data provided by the encrypt function (at some point).
 * @param {string} key Key used to encrypt the data. HKDF used to derive actual encryption key.
 * @return {string} Decrypted text
 */
NeptuneCrypto.decrypt = function(encryptedText, key) {
	if (Buffer.isBuffer(encryptedText))
		encryptedText = encryptedText.toString('utf8');
	if (typeof encryptedText !== "string")
		throw new TypeError("encryptedText expected string got " + (typeof encryptedText).toString());

	if (typeof key !== "string" && key !== undefined) // can't be undefined .. used to throw error if encrypted.
		throw new TypeError("key expected string got " + (typeof key).toString());


	if (encryptedText.substring(0, encryptedPrefix.length) != encryptedPrefix) {// Check for prefix
		return encryptedText;
		//throw new DataNotEncrypted();
	}
	else if (key === undefined || key === "")
		throw new MissingDecryptionKey();


	let encryptedData = encryptedText.split(encryptedPrefix)[1].split(":");
	var version = encryptedData[0];
	var cipherAlgorithm = encryptedData[1];
	if (cipherAlgorithm == "aes-256-gcm" || cipherAlgorithm == "chacha20-poly1305" || cipherAlgorithm == "aes-192-gcm" || cipherAlgorithm == "aes-128-gcm") {
		if (encryptedData.length != 9) {
			throw new EncryptedDataSplitError(encryptedData.length, "9");
		}
	} else {
		if (encryptedData.length != 7) {
			throw new EncryptedDataSplitError(encryptedData.length, "7");
		}
	}

	// Extract some stuff
	
	
	var hashAlgorithm = encryptedData[2];
	var salt = convert(encryptedData[3], 'base64', 'utf8');
	var garbage = convert(encryptedData[4], 'base64', 'utf8');
	var iv = Buffer.from(encryptedData[5], 'hex');
	var data = Buffer.from(encryptedData[6], 'base64');

	var authTag;
	var AAD;
	if (encryptedData.length == 9) {
		AAD = Buffer.from(encryptedData[7], 'base64')
		authTag = Buffer.from(encryptedData[8], 'hex');
	}

	if (version != "1")
		throw new EncryptedDataInvalidVersion(encryptedData[0]);

	let keyParameters = encryptionCipherKeyLengths[cipherAlgorithm];
	if (keyParameters == undefined)
		throw new UnsupportedCipher(cipherAlgorithm);
	
		

	
	try {
		let encryptionKey = NeptuneCrypto.HKDF(key, salt, { hashAlgorithm: hashAlgorithm, keyLength: keyParameters[0], ivLength: keyParameters[1] });
		let decipher = crypto.createDecipheriv(cipherAlgorithm, encryptionKey.key, iv, { authTagLength: 16 });
		if (AAD !== undefined) {
			decipher.setAAD(AAD);
			decipher.setAuthTag(authTag);
		}

		let decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');

		return decrypted;
	} catch (err) {
		throw new InvalidDecryptionKey();
	}
}



NeptuneCrypto.isEncrypted = function(data) {
	if (Buffer.isBuffer(data))
		data = data.toString('utf8');
	if (typeof data !== "string")
		throw new TypeError("data expected string got " + (typeof data).toString());
	return (data.substring(0, encryptedPrefix.length) === encryptedPrefix);
}





/**
 * This will test each supported crypto function to make sure data can be encrypted and then decrypted correctly.
 * @param {boolean} [simplePassFail=false] If false, an object containing the results of each supported cipher is returned. If true, `true` is returned if all ciphers pass, or `false` if one fails.
 * @param {(string|number)} [msg] Data you would like to test with. If none provided, a random string of length 256 (or if an number provided, a string of that length) is used.
 * @param {(string|number)} [key] Encryption key to use. If none provided, a random string of length 128 (or if an number provided, a string of that length) is used.
 * @param {boolean} [testAllHashes = false] Very dangerous. Runs the tests for all supported ciphers AND hashing algorithms (a lot). Expect ~495 tests :)
 */
NeptuneCrypto.testEncryption = function(simplePassFail, msg, key, testAllHashes) {
	if (typeof msg === "number")
		msg = NeptuneCrypto.randomString(msg);
	if (typeof key === "number")
		key = NeptuneCrypto.randomString(key);

	if (typeof msg !== "string" || msg === undefined)
		msg = NeptuneCrypto.randomString(256);
	if (typeof key !== "string" || key === undefined)
		key = NeptuneCrypto.randomString(128);


	var testedHashes = {}
	var allPassed = true;
	var executionTimeAverage = 0;
	var timesRan = 0;

	function runWithHash(hash) {
		let testedAlgorithms = {}
		for (const [oKey, oValue] of Object.entries(encryptionCipherKeyLengths)) {
			// start timer
			let hrstart = process.hrtime();
			let encryptedValue = NeptuneCrypto.encrypt(msg, key, undefined, { hashAlgorithm: hash, cipherAlgorithm: oKey });
			let decryptedValue = NeptuneCrypto.decrypt(encryptedValue, key);
			let exeTime = process.hrtime(hrstart);
			// end timer

			let valid = (decryptedValue == msg);
			testedAlgorithms[oKey] = {
				//encryptedValue: encryptedValue,
				valid: valid,
				executionTime: (exeTime[1]/1000000)
			}
			executionTimeAverage += (exeTime[1]/1000000);
			timesRan += 1;

			if (!valid) {
				allPassed = false;
			}
		}
		return testedAlgorithms
	}

	if (testAllHashes === true) {
		let supportedHashes = crypto.getHashes();
		for (var i = 0; i<supportedHashes.length; i++) {
			try {
				testedHashes[supportedHashes[i]] = runWithHash(supportedHashes[i]);
			} catch (e) {}
		}
	} else {
		testedHashes = runWithHash();
	}

	if (simplePassFail) {
		console.log("Runs: " + timesRan);
		console.log("Total time: " + (executionTimeAverage) + "ms");
		console.log("Average time: " + (executionTimeAverage/timesRan) + "ms");
	}
	else
		testedHashes["averageExecutionTime"] = executionTimeAverage/timesRan;

	return (simplePassFail === true)? allPassed : testedHashes;
}





module.exports = NeptuneCrypto;