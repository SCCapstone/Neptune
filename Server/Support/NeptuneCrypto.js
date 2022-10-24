var NeptuneCrypto = {}

const hkdf = require("futoin-hkdf");

/**
 * AES Key
 * @typedef {object} AESKey
 * @param {Buffer} key The AES key itself
 * @param {Buffer} iv The initialization vector
 */

/**
 * Derive an encryption key from a shared secret
 * @param {(string|int)} sharedSerect The shared secret
 * @param {string} [salt = undefined] The shared or stored salt
 */
NeptuneCrypto.HDFK = function(sharedSecret, salt) {
	sharedSecret = "18" // The example shared secret for the DH wiki page
	salt = "SuperSecureSaltg8pLcriqI#istlsWu"; // Static, in future use seperate DH exchange for salt?
	// Would likely be SHA256(DH2_SharedSecret)
	
	let hashLength = hkdf.hash_length('sha256');
	let pseudoRandomKey = hkdf.extract('sha256', hashLength, sharedSecret, salt); // Step 1
	let expandedAesKey = hkdf.expand('sha256', 32, pseudoRandomKey, 256, 'aes-key'); // Step 2 (for shared AES key)
	let expandedIV = hkdf.expand('sha256', 32, pseudoRandomKey, 16, 'aes-iv').toString('hex'); // Step 2 (for iv)
	
	return {key: expandedAesKey, iv: expandedIV};
}

module.exports = NeptuneCrypto;