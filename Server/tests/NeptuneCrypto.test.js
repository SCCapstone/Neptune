/*
 *
 * Example Jest unit test file
 *
*/

const NeptuneCrypto = require("../src/Support/NeptuneCrypto");

test('NeptuneCrypto: randomString of length N', () => {
	let randomString = NeptuneCrypto.randomString(42);

	expect(randomString).not.toBeNull();
	expect(randomString).toBeDefined();
	expect(randomString.length).toBe(42);
});

test('NeptuneCrypto: randomString can clamp', () => {
	let randomString = NeptuneCrypto.randomString(10, 51, 51);

	expect(randomString).not.toBeNull();
	expect(randomString).toBeDefined();
	expect(randomString).toBe("3333333333");
});

test('NeptuneCrypto: randomString different', () => {
	expect(NeptuneCrypto.randomString(100)).not.toBe(NeptuneCrypto.randomString(100));
});



// HKDF
test('NeptuneCrypto: hkdf generates same key', () => {
	let key = NeptuneCrypto.HKDF("1234", "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+");
	let keyTwo = NeptuneCrypto.HKDF("1234", "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+");

	expect(key.key).toBeDefined();
	expect(keyTwo.key).toBeDefined();
	expect(key.key).toBe(key.key);
});

test('NeptuneCrypto: hkdf generates same IV', () => {
	let key = NeptuneCrypto.HKDF("1234", "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+", { uniqueIV: false });
	let keyTwo = NeptuneCrypto.HKDF("1234", "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+", { uniqueIV: false });

	expect(key.iv).toBeDefined();
	expect(keyTwo.iv).toBeDefined();
	expect(key.iv).toBe(key.iv);
});

test('NeptuneCrypto: hkdf verify key generation', () => {
	let key = NeptuneCrypto.HKDF("1234", "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+");
	let knownGood = Buffer.from("e1de998fa0d81dc5c51151d9cf95f5a4902492a609d3f0bbcda81478828f3707", "hex")


	expect(key.key).toBeDefined();
	expect(knownGood).toBeDefined();
	expect(key.key).toStrictEqual(knownGood);
});



// Encryption/decryption
test('NeptuneCrypto: ChaCha20-Poly1305', () => {
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", "1234", undefined, {
		cipherAlgorithm: "chacha20-poly1305"
	});

	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});
test('NeptuneCrypto: can decrypt ChaCha20-Poly1305', () => {
	let encrypted = "ncrypt::1:chacha20-poly1305:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md:JlRgVD4zKHF7Rnc7KSw4Kw==:a2a97395d037cc554fe765272ffae9c8";
	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});

// ChaCha20
test('NeptuneCrypto: ChaCha20', () => {
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", "1234", null, {
		cipherAlgorithm: "chacha20"
	});

	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});
test('NeptuneCrypto: can decrypt ChaCha20', () => {
	let encrypted = "ncrypt::1:chacha20:sha256:c1k0UE84ODdgJlJUeCojYU49cF9eITtCYEBqJ2VDKDs=:a21lYkhjJkhKUzAmdi1PeA==:5d776921486e477f2248317e35445362:wwzUKV/l/3QGM+XtbaGftWu+k8a/SG+L";
	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});

// AES256
test('NeptuneCrypto: AES-256-GCM', () => {
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", "1234", null, {
		cipherAlgorithm: "aes-256-gcm"
	});

	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});
test('NeptuneCrypto: can decrypt AES-256-GCM', () => {
	let encrypted = "ncrypt::1:aes-256-gcm:sha256:a2pMYjtBKFI5WXFHdkRHaEF1IT5aZXUjblBwbyowSG4=:NV8kI2N1cSo5XShcRSkhVw==:635c743e7c3a474f6a584a33:fFd4b0WueI24w248z0AlB6YLOPW5YcgY:d0gkbGJEN0RQWl5ecENXKA==:5c859760918ee4f558d326dc986bdddb";
	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});

// AES128
test('NeptuneCrypto: AES-128-GCM', () => {
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", "1234", null, {
		cipherAlgorithm: "aes-128-gcm"
	});

	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});
test('NeptuneCrypto: can decrypt AES-128-GCM', () => {
	let encrypted = "ncrypt::1:aes-128-gcm:sha256:JXF0YGEwKThvOUArTn5rMSFVIUFhWnpTJidbJWJvRSg=:TnZXL3VcKCNwU2dfSUZodg==:50663b262b6047446a39765d:RmEViplfGo9nJTlcPwEuhO6GKtvAp1GI:TnZcVH91az40LUtpV3h5Jw==:4b3e3cda451650e10ca8ee5c62ab6839";
	expect(NeptuneCrypto.decrypt(encrypted,"1234")).toBe("This is a sample message");
});



// Error handling

test('NeptuneCrypto: can catch incorrect split', () => {
	expect(() => {
		// Too few
		NeptuneCrypto.decrypt("ncrypt::1:chacha20-poly1305sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md:JlRgVD4zKHF7Rnc7KSw4Kw==:a2a97395d037cc554fe765272ffae9c8", "1234");
	}).toThrow(NeptuneCrypto.Errors.EncryptedDataSplitError);
	expect(() => {
		// Too many
		NeptuneCrypto.decrypt("ncrypt::1:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md:JlRgVD4zKHF7Rnc7KSw4Kw==:a2a97395d037cc554fe765272ffae9c8", "1234");
	}).toThrow(NeptuneCrypto.Errors.EncryptedDataSplitError);
});

test('NeptuneCrypto: can catch incorrect version', () => {
	expect(() => {
		// Too high
		NeptuneCrypto.decrypt("ncrypt::100:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md", "1234");
	}).toThrow(NeptuneCrypto.Errors.EncryptedDataInvalidVersion);
	expect(() => {
		// Too low
		NeptuneCrypto.decrypt("ncrypt::0:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md", "1234");
	}).toThrow(NeptuneCrypto.Errors.EncryptedDataInvalidVersion);
});

// If no / incorrect prefix we just return the text
// test('NeptuneCrypto: can catch no prefix', () => {
// 	expect(() => {
// 		// Missing
// 		NeptuneCrypto.decrypt("1:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md", "1234");
// 	}).toThrow(NeptuneCrypto.Errors.DataNotEncrypted);
// 	expect(() => {
// 		// Wrong
// 		NeptuneCrypto.decrypt("something::1:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md", "1234");
// 	}).toThrow(NeptuneCrypto.Errors.DataNotEncrypted);
// });

test('NeptuneCrypto: can catch unknown cipher', () => {
	expect(() => {
		NeptuneCrypto.decrypt("ncrypt::1:blowfish:sha256:TXlSYW5kb21TYWx0:NEMrWGVGMHV0SmRMXDt5SA==:6a703f346a326e3935755959774a6a74:CB6uO9s8Wv1HbGTcUoOfHCXn5We/VKrh", "1234");
	}).toThrow(NeptuneCrypto.Errors.UnsupportedCipher);

	expect(() => {
		NeptuneCrypto.encrypt("This is a sample message", "1234", null, {
			cipherAlgorithm: "turbocrypt"
		});
	}).toThrow(NeptuneCrypto.Errors.UnsupportedCipher);
});

test('NeptuneCrypto: can catch wrong key', () => {
	let cipherText = "ncrypt::1:aes-256-gcm:sha256:TXlSYW5kb21TYWx0:NEMrWGVGMHV0SmRMXDt5SA==:6a703f346a326e3935755959774a6a74:CB6uO9s8Wv1HbGTcUoOfHCXn5We/VKrh:T0dqLCZrcC9jcn1PZEhtJw==:f5b972e9127eba3f25632bbaf341cb0a";

	expect(() => {
		NeptuneCrypto.decrypt(cipherText, "NotThis");
	}).toThrow(NeptuneCrypto.Errors.InvalidDecryptionKey);

	expect(() => {
		NeptuneCrypto.decrypt(cipherText);
	}).toThrow(NeptuneCrypto.Errors.MissingDecryptionKey);
});



//--

test('NeptuneCrypto: AES-128-GCM with 16-byte key', () => {
	let key = '1234567890123456';
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", key, null, {
		cipherAlgorithm: "aes-128-gcm"
	});

	expect(NeptuneCrypto.decrypt(encrypted, key)).toBe("This is a sample message");
});

test('NeptuneCrypto: AES-256-GCM with 32-byte key', () => {
	let key = '12345678901234567890123456789012';
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", key, null, {
		cipherAlgorithm: "aes-256-gcm"
	});

	expect(NeptuneCrypto.decrypt(encrypted, key)).toBe("This is a sample message");
});

test('NeptuneCrypto: ChaCha20-Poly1305 with 32-byte key', () => {
	let key = '12345678901234567890123456789012';
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", key, null, {
		cipherAlgorithm: "chacha20-poly1305"
	});

	expect(NeptuneCrypto.decrypt(encrypted, key)).toBe("This is a sample message");
});

test('NeptuneCrypto: AES-256-GCM with 12-byte IV', () => {
	let key = '12345678901234567890123456789012';
	let iv = '123456789012';
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", key, iv, {
		cipherAlgorithm: "aes-256-gcm"
	});

	expect(NeptuneCrypto.decrypt(encrypted, key, iv)).toBe("This is a sample message");
});

test('NeptuneCrypto: AES-128-GCM with 8-byte IV', () => {
	let key = '1234567890123456';
	let iv = '12345678';
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", key, iv, {
		cipherAlgorithm: "aes-128-gcm"
	});

	expect(NeptuneCrypto.decrypt(encrypted, key, iv)).toBe("This is a sample message");
});

test('NeptuneCrypto: ChaCha20-Poly1305 with 24-byte IV', () => {
	let key = '12345678901234567890123456789012';
	let iv = '123456789012345678901234';
	let encrypted = NeptuneCrypto.encrypt("This is a sample message", key, iv, {
		cipherAlgorithm: "chacha20-poly1305"
	});

	expect(NeptuneCrypto.decrypt(encrypted, key, iv)).toBe("This is a sample message");
});

describe('NeptuneCrypto: HKDF with different hashing algorithms', () => {
  const secret = '1234';
  const salt = '(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+';
  const length = 32;

  test('SHA256', () => {
    const key1 = NeptuneCrypto.HKDF(secret, salt, { length, hashAlgorithm: 'sha256' });
    const key2 = NeptuneCrypto.HKDF(secret, salt, { length, hashAlgorithm: 'sha256' });

    expect(key1.key).toEqual(key2.key);
  });

  test('SHA384', () => {
    const key1 = NeptuneCrypto.HKDF(secret, salt, { length, hashAlgorithm: 'sha384' });
    const key2 = NeptuneCrypto.HKDF(secret, salt, { length, hashAlgorithm: 'sha384' });

    expect(key1.key).toEqual(key2.key);
  });

  test('SHA512', () => {
    const key1 = NeptuneCrypto.HKDF(secret, salt, { length, hashAlgorithm: 'sha512' });
    const key2 = NeptuneCrypto.HKDF(secret, salt, { length, hashAlgorithm: 'sha512' });

    expect(key1.key).toEqual(key2.key);
  });
});