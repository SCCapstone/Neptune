var NeptuneCrypto = {}

const hkdf = require("futoin-hkdf"); // wait what https://nodejs.org/api/crypto.html#cryptohkdfdigest-ikm-salt-info-keylen-callback
const crypto = require('node:crypto');


const defaultCipherAlgorithm = "chacha20-poly1305" // P-good
const defaultHashAlgorithm = "sha256" // It works
const encryptedPrefix = "ncrypt::";



const convert = (str, from, to) => Buffer.from(str, from).toString(to)

// A list of "supported" (we know the proper key lengths) ciphers for encrypting data
const encryptionCipherKeyLengths = { // algorithm: [keyLenght (bytes), iv/secondary (bytes)]
	'chacha20-poly1305': [32, 12], // 256 bit key, 96 bit nonce
	'chacha20': [32, 16], // 256 bit key, 128 bit nonce
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

/**
 * AES Key
 * @typedef {object} AESKey
 * @param {Buffer} key The AES key itself
 * @param {Buffer} iv The initialization vector
 */

 /**
  * HKDF options
  * @param {string} [hashAlgorithm = "sha256"] Hashing algorithm used in deriving the key via HKDF
  * @param {int} [keyLength = 32] AES key length (this can just be your primary key)
  * @param {int} [ivLength = 16] IV length, needs to be 16 for any AES algorithm. If not needing a AES key, this can just be a secondary key (and ignored)
  * @param {boolean} [uniqueIV = true] The IV generated is random. DO NOT SET THIS TO FALSE! Only set to false IF the IV must be shared and cannot be synced/transmitted
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
 * Encrypts plain text data using the requested algorithm and key. Uses HKDF to derive the actual encryption keys from your provided key.
 * @param {string} cipherAlgorithm Encryption method. Can be: `chacha20-poly1305`, `aes-256-gcm`, `aes256` or anything else defined in `encryptionCipherKeyLengths`
 * @param {string} plainText Plain text you wish to encrypt
 * @param {string} key Encryption key (we'll use HKDF to derive the actual key)
 * @param {string} [salt] Encryption salt (passed to HKDF)
 * @param {object} [options] Misc options. Currently the only options is hashAlgorithm (defaulted to sha256). Passed to the HKDF function
 * @return {string} Encrypted data
 */
NeptuneCrypto.encrypt = function(cipherAlgorithm, plainText, key, salt, options) {
	if (cipherAlgorithm === undefined)
		cipherAlgorithm == defaultCipherAlgorithm;
	if (typeof cipherAlgorithm !== "string")
		throw new TypeError("cipherAlgorithm expected string got " + (typeof cipherAlgorithm).toString());
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
		throw new Error("Unsupported/unknown cipher algorithm. Use chacha20-poly1305, aes-256-gcm, or aes256 not " + toString(cipherAlgorithm))

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
	ourOutput += "2:"								// Version
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
 * Decrypts data using the encrypted data and key.
 * 
 * Encrypted data needs to be in a special format, `ncrypt::version:a:b:c:d:e:f` with `:g:i` added at the end for AEAD ciphers
 * @param {string} encryptedText Encrypted data provided by the encrypt function (at some point).
 * @param {string} key Key used to encrypt the data. HKDF used to derive actual encryption key.
 * @return {string} Decrypted text
 */
NeptuneCrypto.decrypt = function(encryptedText, key) {
	if (typeof encryptedText !== "string")
		throw new TypeError("encryptedText expected string got " + (typeof encryptedText).toString());
	if (typeof key !== "string")
		throw new TypeError("key expected string got " + (typeof key).toString());

	if (encryptedText.substring(0, encryptedPrefix.length) != encryptedPrefix)
		throw new Error("Data not encrypted. Cannot find encrypted prefix " + toString(encryptedPrefix));

	let encryptedData = encryptedText.split(encryptedPrefix)[1].split(":");
	var version = encryptedData[0];
	var cipherAlgorithm = encryptedData[1];
	if (cipherAlgorithm == "aes-256-gcm" || cipherAlgorithm == "chacha20-poly1305" || cipherAlgorithm == "aes-192-gcm" || cipherAlgorithm == "aes-128-gcm") {
		if (encryptedData.length != 9) {
			throw new Error("Damaged encrypted data. Data does not split properly, does not contain 9 parts.");
		}
	} else {
		if (encryptedData.length != 7) {
			throw new Error("Damaged encrypted data. Data does not split properly, does not contain 7 parts.");
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

	if (version != "2")
		throw new Error("Unknown/invalid encrypted data version, no idea how to handle that. Version read: " + toString(encryptedData[0]));

	let keyParameters = encryptionCipherKeyLengths[cipherAlgorithm];
	if (keyParameters == undefined)
		throw new Error("Unsupported/unknown cipher algorithm. Use chacha20-poly1305, aes-256-gcm, or aes256 not " + toString(cipherAlgorithm))
	
		

	
	let encryptionKey = NeptuneCrypto.HKDF(key, salt, { hashAlgorithm: hashAlgorithm, keyLength: keyParameters[0], ivLength: keyParameters[1] });
	let decipher = crypto.createDecipheriv(cipherAlgorithm, encryptionKey.key, iv, { authTagLength: 16 });
	if (AAD !== undefined) {
		decipher.setAAD(AAD);
		decipher.setAuthTag(authTag);
	}

	let decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString();

	return decrypted;
}








/**
 * This will test each supported crypto function to make sure data can be encrypted and then decrypted correctly.
 * @param {boolean} [simplePassFail = false] If false, an object containing the results of each supported cipher is returned. If true, `true` is returned if all ciphers pass, or `false` if one fails.
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
			let encryptedValue = NeptuneCrypto.encrypt(oKey, msg, key, undefined, { hashAlgorithm: hash });
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