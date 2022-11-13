const fs = require("node:fs");
const keytar = require("keytar");
keytar.getPassword("Neptune","ConfigKey").then(key => {
	console.log("Encryption key: " + key);
	console.log("Base64 encoded to encryptionKey.txt")
	fs.writeFileSync("encryptionKey.txt", "ASCII: " + key + "\n\nBase64: " + Buffer.from(key, 'utf8').toString('base64'));
});