// Basics
const crypto = require("node:crypto");
const path = require("node:path");
const { exec } = require('node:child_process');
const fs = require("node:fs");

// Web
const http = require('http');
const Express = require('express'); // also kinda important
const multer = require('multer');

// Ours
const Notification = require('./Notification.js');
const Client = require('./Client.js');
const IPAddress = require("./IPAddress.js");
const { Logger } = require("./LogMan.js");
const NeptuneCrypto = require('../Support/NeptuneCrypto.js');


const isWin = process.platform === "win32"; // Can change notification handling behavior

/**
 * Time to wait before ending HTTP requests (if the server never did it itself)
 * @type {number}
 */
const autoKillRequestTimeout = (global.__TESTING !== undefined && global.__TESTING === true)? 5000 : 30000;

/**
 * Web log
 * @type {Logger}
 */
global.Neptune.webLog = global.Neptune.logMan.getLogger("Web");



/**
 * @typedef {object} conInitObject
 * @property {Logger} log - Logging object
 * @property {crypto.DiffieHellmanGroup} aliceDHObject - This is our keys
 * @property {crypto.DiffieHellmanGroup} dynamicSaltDHObject - The dynamic salt DH keys
 * @property {boolean} enabled - Whether we're allowing step 2 or 3 to go through
 * @property {boolean} socketCreated - Accepting connections via the socket
 * @property {string} socketUUID - Socket id
 * @property {string} secret - Shared secret key
 * @property {string} createdTime - ISO timestamp when this initiation attempt started. 5 minutes after this time we invalidate this attempt
 * @property {string[]} supportedCiphers - Array of NeptuneCrypto ciphers the client wishes to use
 * @property {string} selectedCipher - Cipher algorithm we've accepted
 * @property {string[]} supportedHashAlgorithms - Array of NeptuneCrypto HKDF hash algorithms the client wishes to use
 * @property {string} selectedHashAlgorithm - Hash algorithm we've accepted
 * @property {string[]} supportedKeyGroups - Array of DH key groups the client supported
 * @property {string} selectedKeyGroup - Key group we've agreed to use
 * @property {string} clientId - Client UUID
 * @property {Client} client - Client object
 */

/**
 * A collection of connection initiation ids. Key is the conInitUUID, 
 * @type {Map<String,conInitObject>}
 */
var conInitUUIDs = {};

/**
 * A collection of socket UUIDs mapped to conInitUUIDs.
 * @type {Map<String, String>}
 */
var socketUUIDs = {};




/**
 * Express app
 * @type {Express}
 */
const app = Express();
// Create HTTP server
const httpServer = http.createServer(app);
const WebSocketServer = require('ws').Server;
app.set('trust proxy', true);
// app.use(Express.urlencoded());
app.use(Express.json());
// app.use(session({
// 	secret: "fThx4TVHS7XvW84274W0uoY4GvhmsDN7nN0W3mhRGH2fgFFEZUEZYIeCGoDNoGojW4YfCUlfNZupiekNiOXI1wuOeS2HICpRsrQdndecLCFKtYXr26jLTEtekpPJpFJ7gt8DSmtOYx8WRVz0Jbb211Vqiwnnc8ENl7Z8iDldh01cICNHBrG4F5E6Uz6IRBJonHOPbi3TiNjnW4nxCywjuhpOkzpDGKhox1A3EythsBLNEJp4Br6X3Uef8muOxKzN",
// 	saveUninitialized: true,
// 	resave: true
// }));

var upload = multer({
	dest: './data/uploads/',
	limits: {
		fileSize: 1000000000, // 1,000MB
	},
}); // For uploads

// Reset uploads folder!
try {
	if (fs.existsSync('./data/uploads')) {
		fs.rmSync('./data/uploads', { recursive: true, force: true });
	}

	fs.mkdirSync('./data/uploads');
} catch (e) {}
// Heartbeat
var sounds = ["Thoomp-thoomp", "Bump-bump", "Thump-bump"];
app.get("/heartbeat", (req, res) => {
	let sound = sounds[Math.floor(Math.random()*sounds.length)];
	global.Neptune.webLog.verbose(sound + " (heartbeat)");
	res.status(200).end('ok');
});

// Web page
app.get("/", (req, res) => {
	res.status(200).end(`<html>
	<head>
		<title>Neptune</title>
	</head>
	<body>
		<h1>Oh my Neptune.</h1>
	</body>
</html>`);

	mainWindow.show();
});


// https://nodejs.org/api/crypto.html#class-diffiehellman
// This is the initial endpoint for the client
app.post('/api/v1/server/initiateConnection', (req, res) => {
	try {
		let conInitUUID = crypto.randomUUID(); // NeptuneCrypto.convert(NeptuneCrypto.randomString(16), "utf8", "hex"); // string (len 16) -> HEX
		let conInitLog = global.Neptune.logMan.getLogger("ConInit-" + conInitUUID);
		conInitLog.info("Initiating new client connection, uuid: " + conInitUUID);

		// https://nodejs.org/api/crypto.html#class-diffiehellmangroup
		let supportedKeyGroups = ['modp14', 'modp15', 'modp16'];
		let keyGroup = 'modp16';
		if (req.body.supportedKeyGroups !== undefined) {
			for (var i = 0; i<req.body.supportedKeyGroups.length; i++) {
				if (supportedKeyGroups.indexOf(req.body.supportedKeyGroups[i]) != -1) {
					keyGroup = req.body.supportedKeyGroups[i];
				}
			}
		}
		conInitLog.debug("Selected DH key group: " + keyGroup);

		// Select the cipher and hash
		let supportedCiphers = ["chacha20-poly1305", "chacha20", "aes-256-gcm", "aes-128-gcm"];
		let supportedHashAlgorithms = ["sha256", "sha512"];
		let cipher = "aes-128-gcm";
		let hashAlgorithm = "sha256";

		if (req.body.supportedCiphers !== undefined) {
			for (var i = 0; i<req.body.supportedCiphers.length; i++) {
				if (supportedCiphers.indexOf(req.body.supportedCiphers[i]) != -1) {
					cipher = req.body.supportedCiphers[i];
				}
			}
		}
		conInitLog.silly("Selected cipher: " + cipher);

		if (req.body.supportedHashAlgorithms !== undefined) {
			for (var i = 0; i<req.body.supportedHashAlgorithms.length; i++) {
				if (supportedHashAlgorithms.indexOf(req.body.supportedHashAlgorithms[i]) != -1) {
					hashAlgorithm = req.body.supportedHashAlgorithms[0];
				}
			}
		}
		conInitLog.silly("Selected hash algorithm: " + hashAlgorithm);
		


		let alice = crypto.getDiffieHellman(keyGroup);
		alice.generateKeys();

		let useDynamicSalt = false;
		let dynamicSalt;
		if (req.body.useDynamicSalt == true) {
			conInitLog.silly("Using dynamicSalt");
			useDynamicSalt = true;
			dynamicSalt = crypto.getDiffieHellman(keyGroup);
			dynamicSalt.generateKeys();
		}


		// Store this data. Create our response
		conInitUUIDs[conInitUUID] = {
			log: conInitLog,
			enabled: true,
			socketCreated: false,
			aliceDHObject: alice,
			createdTime: new Date().toISOString(),
			supportedCiphers: req.body.acceptedCrypto,
			selectedCipher: cipher,
			supportedHashAlgorithms: req.body.acceptedHashTypes,
			selectedHashAlgorithm: hashAlgorithm,
			supportedKeyGroups: req.body.acceptedKeyGroups,
			selectedKeyGroup: keyGroup,
		}

		let myResponsePacket = {
			"g1": alice.getGenerator('base64'),
			"p1": alice.getPrime('base64'),
			"a1": alice.getPublicKey('base64'),
			"conInitUUID": conInitUUID,
			selectedKeyGroup: keyGroup,
			selectedCipher: cipher,
			selectedHashAlgorithm: hashAlgorithm
		};

		if (useDynamicSalt && dynamicSalt !== undefined) {
			myResponsePacket.g2 = dynamicSalt.getGenerator('base64');
			myResponsePacket.p2 = dynamicSalt.getPrime('base64');
			myResponsePacket.a2 = dynamicSalt.getPublicKey('base64');
			conInitUUIDs[conInitUUID].dynamicSaltDHObject = dynamicSalt;
		}

		let responseString = JSON.stringify(myResponsePacket);
		conInitLog.silly("Sending: " + responseString);
		res.status(200).send(responseString);
	} catch (e) {
		global.Neptune.webLog.error(e, false);

		if (res != undefined)
			res.status(500).send("{}");
	}
});



// This is the final part of negotiation, creates the socket and opens up command inputting
app.post('/api/v1/server/initiateConnection/:conInitUUID', (req, res) => {
	try {
		let conInitUUID = req.params.conInitUUID;
		global.Neptune.webLog.silly("POST: /api/v1/server/initiateConnection/" + conInitUUID + " .. body: " + JSON.stringify(req.body));
		if (conInitUUIDs[conInitUUID] !== undefined) {
			if (conInitUUIDs[conInitUUID].socketCreated !== false) {
				global.Neptune.webLog.warn("Attempt to use disabled conInitUUID! UUID: " + conInitUUID);
				res.status(403).send('{ "error": "Invalid conInitUUID" }');
				return;
			}
		} else {
			global.Neptune.webLog.silly("Attempt to use invalid conInitUUID: " + conInitUUID);
			res.status(401).send('{ "error": "Invalid conInitUUID" }');
			return;
		}

		/** @type {conInitObject} */
		let conInitObject = conInitUUIDs[conInitUUID];

		// Validate timestamp
		let timeNow = new Date();
		if (((timeNow - conInitObject.createdTime)/(60000)) >= 5) { // Older than 5 minutes
			conInitObject.log.warn("Attempt to use old conInitUUID! UUID: " + conInitUUID + " . createdAt: " + conInitObject.createdTime.toISOString());
			delete conInitUUIDs[conInitUUID];
			res.status(408).send('{ "error": "Request timeout for conInitUUID" }');
			return;
		}

		// Validate no other requests
		for (const [initUuid, initValue] of Object.entries(conInitUUIDs)) {
			if (initValue.clientId !== undefined) {
				if (initValue == req.body.clientId) {
					res.status(409).end(`{ "end": "Initiation request already in progress" }`);
					return;
				}
			}
		}


		// Generate shared secret
		let aliceSecret = conInitObject.aliceDHObject.computeSecret(Buffer.from(req.body.b1,'base64'));
		conInitObject.secret = NeptuneCrypto.HKDF(aliceSecret, "mySalt1234", {hashAlgorithm: conInitObject.selectedHashAlgorithm, keyLength: 32}).key;

		
		// Validate chkMsg
		var chkMsg = req.body.chkMsg;
		conInitObject.clientId = req.body.clientId;
		var client;
		try {
			if (NeptuneCrypto.isEncrypted(conInitObject.clientId))
				conInitObject.clientId = NeptuneCrypto.decrypt(conInitObject.clientId, conInitObject.secret);

			// Get/create client object
			client = global.Neptune.clientManager.getClient(conInitObject.clientId)
			client.clientId = conInitObject.clientId;
			conInitObject.client = client;

			if (client.pairKey !== undefined) {
				// Regenerate key using shared pair key
				conInitObject.log.debug("Using pairKey!");
				conInitObject.secret = NeptuneCrypto.HKDF(aliceSecret, client.pairKey, {hashAlgorithm: conInitObject.selectedHashAlgorithm, keyLength: 32}).key;
			}

			if (NeptuneCrypto.isEncrypted(chkMsg))
				chkMsg = NeptuneCrypto.decrypt(chkMsg, conInitObject.secret);
		} catch (err) {
			conInitObject.log.silly(err);
			if (err instanceof NeptuneCrypto.Errors.InvalidDecryptionKey || err instanceof NeptuneCrypto.Errors.MissingDecryptionKey) {
				// bad key.
				conInitObject.log.warn("Socket setup, bad key! UUID: " + conInitUUID);
				res.status(400).send(`{ "error": "Invalid encryption key" }`);
			} else {
				// Another error
				conInitObject.log.warn("Decryption of chkMsg failed, error: " + err.message);
				res.status(400).send(`{ "error": "Decryption of chkMsg failed" }`);
			}
			delete conInitUUIDs[conInitUUID];
			return;
		}
		
		let chkMsgHash = crypto.createHash(req.body.chkMsgHashFunction).update(chkMsg).digest('hex');
		chkMsgHash = req.body.chkMsgHash; // remove this later

		if (chkMsgHash !== req.body.chkMsgHash) {
			conInitObject.log.warn(`Invalid chkMsg hash! chkMsg: ${chkMsg} ... ourHash: ${chkMsgHash} ... clientHash: ${req.body.chkMsgHash}`);
			res.status(400).send(`{ "error": "Invalid chkMsgHash" }`);
			return;
		}


		try {
			if (typeof req.ip === "string" && req.ip !== "::1") {
				let ip = req.ip;
				if (ip.includes(":")) {
					ipArray = ip.split(":");
					ip = ipArray[ipArray.length-1];
				}
				client.IPAddress = new IPAddress(ip, "25560");
			}
			client.saveSync();
		} catch (e) {}



		// Create socket
		let socketUUID = crypto.randomUUID();
		socketUUIDs[socketUUID] = conInitUUID;
		conInitObject.socketCreated = true; // Done		

		// Setup connection manager (enables HTTP listener)
		client.setupConnectionManager(conInitObject.secret, {
			conInitUUID: conInitUUID,
			socketUUID: socketUUID,
			encryptionParameters: {
				cipherAlgorithm: conInitObject.selectedCipher,
				hashAlgorithm: conInitObject.selectedHashAlgorithm,
			}
		});
		

		// Create response
		let response = JSON.stringify({
			confMsg: crypto.createHash(req.body.chkMsgHashFunction).update(chkMsg + req.body.chkMsgHash).digest('hex'),
			socketUUID: socketUUID,
		});
		

		let encryptedResponse = NeptuneCrypto.encrypt(response, conInitObject.secret, undefined, {
			hashAlgorithm: conInitObject.selectedHashAlgorithm,
			cipherAlgorithm: conInitObject.selectedCipher
		});

		conInitObject.log.info(conInitUUID + " setup completed.");

		res.status(200).send(encryptedResponse);
	} catch (e) {
		global.Neptune.webLog.error(e, false);

		if (res != undefined)
			res.status(500).send("{}");
	}
});
app.post('/api/v1/server/initiateConnection/:conInitUUID/scrap', (req, res) => {
	try {
		let conInitUUID = req.params.conInitUUID;
		if (conInitUUIDs[conInitUUID] !== undefined) {
			global.Neptune.webLog.info("Scrapping initiation request for conInitUUID: " + conInitUUID.substr(0,48));
			if (conInitUUIDs[conInitUUID].client !== undefined)
				conInitUUIDs[conInitUUID].client.destroyConnectionManager();

			conInitUUIDs[conInitUUID].enabled = false;
			delete conInitUUIDs[conInitUUID];
			res.status(200).end("{}");
		} else
			res.status(404).end("{}");
	} catch (_) {}
});

app.post('/api/v1/server/socket/:socketUUID/http', (req, res) => {
	try {
		var sentResponse = false;
		let conInitUUID = req.body.conInitUUID;

		if (conInitUUIDs[conInitUUID] !== undefined) {
			if (conInitUUIDs[conInitUUID].enabled !== true) {
				global.Neptune.webLog.warn("Attempt to use disabled conInitUUID! UUID: " + conInitUUID);
				res.status(403).send('{ "error": "Invalid conInitUUID" }');
				return;
			}
		} else {
			res.status(401).send('{ "error": "Invalid conInitUUID" }');
			return;
		}

		conInitUUIDs[conInitUUID].client.processHTTPRequest(JSON.stringify(req.body), (data) => {
			conInitUUIDs[conInitUUID].log.silly(data);
			if (!sentResponse) {
				sentResponse = true;
				res.status(200).end(data);
			}
		});

		setTimeout(()=>{ // sends OK after 30 seconds (likely no response from server?)
			if (!sentResponse) {
				sentResponse = true;
				res.status(200).send("{}");
			}
		}, autoKillRequestTimeout);
	} catch (e) {
		global.Neptune.webLog.error(e, false);

		if (res != undefined)
			res.status(500).send("{}");
	}
});

SocketServer = new WebSocketServer({server: httpServer});
// Listen for socket connections
global.SocketServer.on('connection', (ws, req) => {
	try {
		if (req.url === undefined) {
			global.Neptune.webLog.error("New connection via WebSocket, no URL specified. Terminating.");
			ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
			ws.close();
			return;
		}
		let urlParts = req.url.split("/");
		if (urlParts.length != 6) {
			global.Neptune.webLog.error("New connection via WebSocket, URL (" + req.url + ") invalid. Terminating.");
			ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
			ws.close();
			return;
		}

		let socketUUID = urlParts[5].toLowerCase();
		let conInitUUID = socketUUIDs[socketUUID];
		if (conInitUUID === undefined || conInitUUIDs[conInitUUID] === undefined) {
			global.Neptune.webLog.error("New connection via WebSocket, invalid socket UUID (" + socketUUID +"). Terminating.");
			ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
			ws.close(1002, "InvalidSocketUUID"); // Tells client to reinitialize the connection
			return;
		}

		let conInitObject = conInitUUIDs[conInitUUID];
		let client = conInitObject.client;
		if (client === undefined) {
			global.Neptune.webLog.error("New connection via WebSocket, socket UUID (" + socketUUID +") valid, but unable to find the client to setup the socket with. Terminating.");
			ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
			ws.close(1002, "InvalidClient"); // Tells client to reinitialize the connection
			return;
		}

		global.Neptune.webLog.info("Client " + client.clientId + " connected to socket, socketUUID: " + socketUUID);
		client.setupConnectionManagerWebsocket(ws);
	} catch (e) {
		global.Neptune.webLog.error(e, false);

		if (res != undefined)
			res.status(500).send("{}");
	}
});



/**
 * 
 * Downloading / uploading 
 * 
 */
/**
 * @typedef {object} fileSharingObject
 * @property {string} fileUUID - File UUID
 * @property {string} fileName - File name for when the file is copied to the received folder
 * @property {boolean} enabled - Whether the file is able to be downloaded/uploaded. Once the fileUUID is used, this is flipped off and the object is deleted.
 * @property {string} createdTime - Time object was created (ISO) (file have a life time of 2 minutes)
 * @property {boolean} isUpload - File is being uploaded
 * @property {string} filePath - If upload, this is the directory the file is being saved to. If not an uploaded, this is the file we're serving.
 * @property {string} clientUUID - UUID of the client.
 * @property {string} clientName - Friendly name of the client.
 * @property {string} socketUUID - UUID of the socket client uses.
 * @property {string} authenticationCode - Random string of length 64 to represent a unique key only the client will know. Only used for download
 */


/**
 * Holds file sharing setup functions
 * @namespace
 */
global.Neptune.filesharing = {};

/**
 * A collection of file sharing ids. Key is the fileUUID
 * @type {Map<String, fileSharingObject>}
 */
let fileUUIDs = {};

/**
* Sanitizes a filename for Windows and Linux devices by removing illegal characters and reserved file names on Windows.
* If the filename is empty (excluding the file extension), sets it to "file".
*
* @param {string} filename - The filename to sanitize.
* @returns {string} The sanitized filename.
*/
function sanitizeFilename(filename) {
	// Remove illegal characters
	const sanitizedFilename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

	// Remove reserved file names for Windows
	const filenameWithoutExtension = path.parse(sanitizedFilename).name;
	const extension = path.parse(sanitizedFilename).ext;

	if (isWin) {
		const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
		if (filenameWithoutExtension.length > 0 && reservedNames.includes(filenameWithoutExtension.toUpperCase())) {
			return "file_" + sanitizedFilename;
		}
	}

	return filenameWithoutExtension.length > 0 ? sanitizedFilename : 'file' + extension;
}


/**
 * Used by the Client class to setup a file download
 * @function global.Neptune.filesharing.newClientDownload
 * @param {Client} client - Client that will be downloading this file.
 * @param {string} filepath - Path to the file being downloaded by the client.
 * @return {fileSharingObject} fileSharingObject
 */
global.Neptune.filesharing.newClientDownload = function(client, filepath) {
	if (client === undefined) {
		global.Neptune.log.error("newClientDownload: client is undefined!");
		throw new Error("client is undefined.");
	}
		

	if (!client.fileSharingSettings.enabled) { // don't check this, client does that: || !client.fileSharingSettings.allowClientToDownload)
		global.Neptune.log.error("newClientDownload: client has file sharing disabled (likely forgot to save the settings!)");
		throw new Error("file sharing disabled for " + client.friendlyName + ".\nBe sure to check \"Enable file sharing\" and save the settings.");
	}

	if (fs.existsSync(filepath) && fs.lstatSync(filepath).isFile()) {
		let fileUUID = crypto.randomUUID();

		/** @type {fileSharingObject} */
		let fileSharingObject = {
			fileUUID: fileUUID,
			enabled: true,
			createdTime: new Date().toISOString(),
			isUpload: false,
			filePath: filepath,
			clientUUID: client.clientId,
			clientName: client.friendlyName,
			authenticationCode: Buffer.from(NeptuneCrypto.randomString(64), "utf8").toString("base64"),
			socketUUID: client.getSocketUUID(),
		}

		fileUUIDs[fileUUID] = fileSharingObject;

		return fileSharingObject;
	} else {
		throw new Error("File does not exist.");
	}
}

/**
 * Used by the Client class to setup a file upload
 * @alias global.Neptune.filesharing.newClientUpload
 * @param {Client} client - Client that will be uploading this file.
 * @param {string} saveToDirectory - Path to save the uploaded file to.
 * @return {fileSharingObject} fileSharingObject
 */
global.Neptune.filesharing.newClientUpload = function(client, fileName, saveToDirectory) {
	if (client === undefined) {
		global.Neptune.log.error("newClientDownload: client is undefined!");
		throw new Error("client is undefined.");
	}
		

	if (!client.fileSharingSettings.enabled) {
		global.Neptune.log.error("newClientDownload: client has file sharing disabled (likely forgot to save the settings!)");
		throw new Error("file sharing disabled for " + client.friendlyName + ".\nBe sure to check \"Enable file sharing\" and save the settings.");
	}

	if (!client.fileSharingSettings.allowClientToUpload) {
		global.Neptune.log.error("newClientDownload: client is not allowed to upload files");
		throw new Error("receiving files for " + client.friendlyName + " is disabled.\nBe sure to check \"Enable file sharing\" and save the settings.");
	}

	try {
		if (!fs.existsSync(saveToDirectory))
			fs.mkdirSync(saveToDirectory)

		if (fs.existsSync(saveToDirectory) && fs.lstatSync(saveToDirectory).isDirectory()) {
			let fileUUID = crypto.randomUUID();

			// Sanitize file name (remove illegal characters + reserved file names on windows)
			fileName = sanitizeFilename(fileName);

			/** @type {fileSharingObject} */
			let fileSharingObject = {
				fileUUID: fileUUID,
				fileName: fileName,
				enabled: true,
				createdTime: new Date().toISOString(),
				isUpload: true,
				filePath: saveToDirectory,
				clientUUID: client.clientId,
				clientName: client.friendlyName,
				authenticationCode: Buffer.from(NeptuneCrypto.randomString(64), "utf8").toString("base64"),
				socketUUID: client.getSocketUUID(),
			}

			fileUUIDs[fileUUID] = fileSharingObject;
			return fileSharingObject;
		} else {
			throw new Error("Directory does not exist: " + saveToDirectory);
		}
	} catch (e) {
		global.Neptune.webLog.error(e, false);
	}
}

// Download/upload endpoint
app.post('/api/v1/server/socket/:socketUUID/filesharing/:fileUUID/download', (req, res) => {
	try {
		/** @type {string} */
		let fileUUID = req.params.fileUUID;
		let socketUUID = req.params.socketUUID;



		global.Neptune.webLog.silly("Download requested: /api/v1/server/socket/" + socketUUID + "/" + fileUUID);
		if (fileUUIDs[fileUUID] !== undefined) {
			if (fileUUIDs[fileUUID].enabled !== true) {
				global.Neptune.webLog.warn("Attempt to use disabled fileUUID! UUID: " + fileUUID);
				delete fileUUIDs[fileUUID];
				res.status(403).end('{ "error": "Invalid fileUUID" }');
				return;
			}
		} else {
			global.Neptune.webLog.silly("Attempt to use invalid fileUUID: " + fileUUID);
			res.status(401).end('{ "error": "Invalid fileUUID" }');
			return;
		}

		/** @type {fileSharingObject} */
		let fileSharingObject = fileUUIDs[fileUUID];

		// Validate timestamp
		let timeNow = new Date();
		if (((timeNow - fileSharingObject.createdTime)/(60000)) >= 5) { // Older than 5 minutes
			global.Neptune.webLog.warn("Attempt to use expired fileUUID! UUID: " + fileUUID + " . createdAt: " + fileSharingObject.createdTime.toISOString());
			delete fileUUID[fileUUID];
			res.status(408).end('{ "error": "Request timeout for fileUUID" }');
			return;
		}

		// Validate socketUUID
		if (fileSharingObject.socketUUID !== socketUUID) {
			global.Neptune.webLog.warn("File upload socketUUID mismatch! FileUUID: " + fileUUID + " .");
			delete fileUUID[fileUUID];
			res.status(408).send('{ "error": "Invalid socketUUID" }');
			deleteFiles();
			return;
		}


		// For download?
		if (fileSharingObject.isUpload) {
			global.Neptune.webLog.warn("Attempt to download using a upload fileUUID.");
			delete fileUUIDs[fileUUID];
			res.status(405).end('{ "error": "Attempt to upload using a download fileUUID." }');
			return;
		}


		// Check validation code
		if (req.body.authenticationCode !== fileSharingObject.authenticationCode) {
			global.Neptune.webLog.warn("Invalid authenticationCode used on fileUUID: " + fileUUID);
			res.status(401).end('{ "error": "Invalid authenticationCode" }');
			return;
		}




		let filePath = fileSharingObject.filePath;
		global.Neptune.webLog.info("Client " + fileSharingObject.clientUUID + " has downloaded " + filePath);

		fileUUIDs[fileUUID].enabled = false;
		delete fileUUIDs[fileUUID];

		// Serve the file
		let filename = filePath.replace(/^.*[\\\/]/, '');
		res.setHeader('Content-disposition', 'attachment; filename=' + filename);
		res.download(filePath);

		return;
	} catch (e) {
		global.Neptune.webLog.error(e, false);

		if (res != undefined)
			res.status(500).send("{}");
	}
});


// Upload
app.post('/api/v1/server/socket/:socketUUID/filesharing/:fileUUID/upload', upload.single('file'), (req, res) => {
	try {
		let fileUUID = req.params.fileUUID;
		let socketUUID = req.params.socketUUID;

		function deleteFiles() {
			if (fs.existsSync('./' + req.file.path)) {
				fs.unlink('./' + req.file.path, err => {
					global.Neptune.webLog.warn("Failed to delete blocked upload: " + req.file.filename)
				});
			}
		}


		global.Neptune.webLog.silly("Upload requested: /api/v1/server/socket/" + socketUUID + "/filesharing/" + fileUUID + "/upload");
		if (fileUUIDs[fileUUID] !== undefined) {
			if (fileUUIDs[fileUUID].enabled !== true) {
				global.Neptune.webLog.warn("Attempt to use disabled fileUUID! UUID: " + fileUUID);
				delete fileUUIDs[fileUUID];
				res.status(403).send('{ "error": "Invalid fileUUID" }');
				deleteFiles();
				return;
			}
		} else {
			global.Neptune.webLog.silly("Attempt to use invalid fileUUID: " + fileUUID);
			res.status(401).send('{ "error": "Invalid fileUUID" }');
			deleteFiles();
			return;
		}

		if (req.file == undefined) {
			// No file????
			global.Neptune.webLog.warn("No file included in upload! UUID: " + fileUUID);
			delete fileUUIDs[fileUUID];
			res.status(403).send('{ "error": "Missing file" }');
			deleteFiles();
			return;
		}

		/** @type {fileSharingObject} */
		let fileSharingObject = fileUUIDs[fileUUID];

		// Validate timestamp
		let timeNow = new Date();
		if (((timeNow - fileSharingObject.createdTime)/(60000)) >= 5) { // Older than 5 minutes
			global.Neptune.webLog.warn("Attempt to use expired fileUUID! UUID: " + fileUUID + " . createdAt: " + fileSharingObject.createdTime.toISOString());
			delete fileUUID[fileUUID];
			res.status(408).send('{ "error": "Request timeout for fileUUID" }');
			deleteFiles();
			return;
		}

		// Validate socketUUID
		if (fileSharingObject.socketUUID !== socketUUID) {
			global.Neptune.webLog.warn("File upload socketUUID mismatch! FileUUID: " + fileUUID + " .");
			delete fileUUID[fileUUID];
			res.status(408).send('{ "error": "Invalid socketUUID" }');
			deleteFiles();
			return;
		}

		// For upload?
		if (!fileSharingObject.isUpload) {
			global.Neptune.webLog.warn("Attempt to upload using a download fileUUID.");
			delete fileUUIDs[fileUUID];
			res.status(405).send('{ "error": "Attempt to upload using a download fileUUID." }');
			deleteFiles();
			return;
		}

		let client = global.Neptune.clientManager.getClient(fileSharingObject.clientUUID);
		let fileName = (fileSharingObject.fileName !== undefined? fileSharingObject.fileName : fileUUID);
		let acceptedFunction = function() {

			if (client.fileSharingSettings.notifyOnClientUpload) {
				let actionButtonContents = "Show me in folder";
				let notification = new Notification({
					clientId: "Neptune",
					friendlyName: "MainWindow",
				}, {
					action: 'create',
					applicationPackage: 'com.global.Neptune.server',
					applicationName: 'Neptune Server',
					notificationId: 'fileReceivedNotification-' + fileUUID,
					title: 'Received file from ' + (fileSharingObject.clientName != undefined? fileSharingObject.clientName : 'a client') + '.',
					type: 'standard',

					contents: {
						text: 'Received a file: ' + fileName,
						subtext: "File received",
						actions: [
							{
								"id": "showme",
								"type": "button",
								"contents": actionButtonContents
							},
						]
					},

					onlyAlertOnce: true,
					priority: "default",
					isSilent: false,
				});
				notification.push();
				notification.on('activate', (data) => {
					try {
						let button = "";
						if (data.actionParameters !== undefined) {
							if (data.actionParameters.id !== undefined)
								button = Buffer.from(data.actionParameters.id, "base64").toString("utf8");
						}

						if (button != undefined)
							button = button.toLowerCase();

						console.log(button);

						if (button == actionButtonContents.toLowerCase()) {
							// Opens the file browser and selects the received file
							let absolutePath = path.resolve(__dirname, "..", fileSharingObject.filePath, fileName);
							if (process.platform === 'win32') {
								const explorerPath = path.join(process.env.SystemRoot, 'explorer.exe');
								exec(`"${explorerPath}" /select, "${absolutePath}"`, (error, stdout, stderr) => {});
							} else if (process.platform === 'darwin') {
								exec(`open -R "${absolutePath}"`, (error, stdout, stderr) => {});
							} else if (process.platform === 'linux' && process.env.DESKTOP_SESSION === 'gnome') {
								exec(`gnome-open "${absolutePath}"`, (error, stdout, stderr) => {});
							}
						}
					} catch (e) {
						global.Neptune.webLog.error("Failed to open file browser to select received file. See log for details.");
						global.Neptune.webLog.error(e, false);
					}
				});
			}

			// Process
			let targetPath = path.resolve(fileSharingObject.filePath + "/" + fileName);
			global.Neptune.webLog.info("Received file \"" + fileName + "\" from client " + fileSharingObject.clientUUID);
			global.Neptune.webLog.info("Received files directory: " + fileSharingObject.filePath, false);
			if (fs.existsSync(targetPath)) {
				// Target file already exists, generate a unique file name
				let counter = 1;
				let newTargetPath = fileName.replace(/\.[^.]+$/, '') + ' (' + counter + ')' + path.extname(fileName);

				while (fs.existsSync(newTargetPath)) {
					// Increment the counter until a unique file name is found
					counter++;
					newTargetPath = fileName.replace(/\.[^.]+$/, '') + ' (' + counter + ')' + path.extname(fileName);
				}

				global.Neptune.webLog.debug("Saving received file (conflict) to: " + path.resolve(fileSharingObject.filePath + "/" + newTargetPath))

				// Rename the file to the new unique name
				fs.renameSync(req.file.path, path.resolve(fileSharingObject.filePath + "/" + newTargetPath));

			} else {
				global.Neptune.webLog.debug("Saving received file to: " + targetPath)
				fs.renameSync(req.file.path, targetPath);
			}

			res.status(200).end("{ \"status\": \"success\", \"approved\": true }");
		}


		if (client.fileSharingSettings.requireConfirmationOnClinetUploads) {
			let requestPermissionNotification = new Notification({
				clientId: "Neptune",
				friendlyName: "MainWindow",
			}, {
				action: 'create',
				applicationPackage: 'com.global.Neptune.server',
				applicationName: 'Neptune Server',
				notificationId: 'fileRequestNotification-' + fileUUID,
				title: 'Accept incoming file?',
				type: 'standard',

				contents: {
					text: 'New file request from: ' + fileSharingObject.clientName + '\r\n' + 'Accept file? Name: ' + fileName,
					subtext: "File received",
					actions: [
						{
							"id": "deny",
							"type": "button",
							"contents": "Deny"
						},
						{
							"id": "accept",
							"type": "button",
							"contents": "Accept"
						}
					]
				},

				onlyAlertOnce: true,
				priority: "default",
				isSilent: false,
			});
			requestPermissionNotification.push();

			let alreadyProcessedPleaseDoNotRaceMe = false; // we love race conditions
			requestPermissionNotification.on('activate', (data) => {
				try {
					let button = "";
					if (data.actionParameters !== undefined) {
						if (data.actionParameters.id !== undefined)
							button = Buffer.from(data.actionParameters.id, "base64").toString("utf8");
					}

					if (button != undefined)
						button = button.toLowerCase();

					console.log(button);

					if (button === "accept") {
						alreadyProcessedPleaseDoNotRaceMe = true;
						acceptedFunction();
					} else {
						if (fs.existsSync(req.file.path))
							fs.unlinkSync(req.file.path)

						alreadyProcessedPleaseDoNotRaceMe = true;
						res.status(418).end("{ \"status\": \"rejected by user\", \"approved\": false }");
					}
				} catch (e) {
					global.Neptune.webLog.error("Failed to process accept/deny notification for received file. See log for details.");
					global.Neptune.webLog.error(e, false);
					try {
						if (req.file.path !== undefined) {
							if (fs.existsSync(req.file.path))
								fs.unlinkSync(req.file.path)
		
							res.status(418).end("{ \"status\": \"unable to request approval\", \"approved\": false }");
						}
					} catch (_) {}
				}
			});

			setTimeout(() => {
				if (requestPermissionNotification != undefined) {
					requestPermissionNotification.delete();
				}

				if (alreadyProcessedPleaseDoNotRaceMe)
					return;

				if (req.file.path !== undefined) {
					if (fs.existsSync(req.file.path))
						fs.unlinkSync(req.file.path)

					res.status(418).end("{ \"status\": \"timed out\", \"approved\": false }");
				}
			}, 30000); // 30 second timeout
		} else {
			acceptedFunction();
		}
	} catch (e) {
		global.Neptune.webLog.error("Error receiving file from client. See log for details.");
		global.Neptune.webLog.error(e, false);

		if (res != undefined)
			res.status(500).end("{ \"status\": \"error receiving file\", \"approved\": false }");
	}
});



module.exports = { 
	app: app,
	httpServer: httpServer,
};