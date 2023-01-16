'use strict';
/**
 *    _  _ 
 *   | \| |
 *   | .` |
 *   |_|\_|eptune
 *
 *   Capstone Project 2022
 */


// Which came first? Chicken or the egg?
const Version = require('./Classes/Version.js');
const Neptune = {};
const isWin = process.platform === "win32"; // Can change notification handling behavior






// Global behavioral changes (static stuff)
const debug = process.env;
const displaySilly = false; // output the silly log level to console (it goes  every other level > silly, silly is the lowest priority, literal spam)
Error.stackTraceLimit = (debug)? 8 : 4;

Neptune.version = new Version(0, 0, 1, ((debug)?"debug":"release"), "PoC");

global.Neptune = Neptune; // Anywhere down the chain you can use process.Neptune. Allows us to get around providing `Neptune` to everything





/*
 * Pull in externals here, imports, libraries
 * 
 */
// Basic
const path = require("node:path");
const fs = require("node:fs")
const EventEmitter = require('node:events');
const util = require('node:util');

// Crypto
const keytar = require("keytar");


// GUI
const NodeGUI = require("@nodegui/nodegui");
// Interaction
const readline = require("readline");


// Web
const http = require('http');
const Express = require('express'); // also kinda important
const multer = require('multer');


// Classes
const ConfigurationManager = require('./Classes/ConfigurationManager.js');
const NeptuneConfig = require('./Classes/NeptuneConfig.js');
const ClientManager = require('./Classes/ClientManager.js');
const NotificationManager = require('./Classes/NotificationManager.js');
/** @type {import('./Classes/LogMan').LogMan} */
const LogMan = require('./Classes/LogMan.js').LogMan;
const IPAddress = require("./Classes/IPAddress.js");
const NeptuneCrypto = require('./Support/NeptuneCrypto.js');





// Type definitions
Neptune.isWindows = isWin;
Neptune.debugMode = debug;

/** @type {ConfigurationManager} */
Neptune.configManager;
/** @type {import('./Classes/NeptuneConfig')} */
Neptune.config;
/** @type {ClientManager} */
Neptune.clientManager;
/** @type {NotificationManager} */
Neptune.notificationManager;



// Logging
/** @type {LogMan} */
Neptune.logMan = new LogMan("Neptune", "./logs", { fileWriteLevel: { silly: debug }, consoleDisplayLevel: { silly: displaySilly }, cleanLog: true });
// Log name: Neptune, in the logs folder, do not display silly messages (event fired!)

Neptune.log = Neptune.logMan.getLogger("Neptune"); // You can call this (log) to log as info

Neptune.logMan.on('close', () => { // Reopen log file if closed (and not shutting down)
	if (!global.shuttingDown) {
		console.warn("..log file unexpectedly closed..\nReopening ...");
		Neptune.logMan.reopen();
	}
});

// For debugging, allows you to output a nasty object into console. Neat
var utilLog = function(obj, depth) {
	Neptune.log.debug(util.inspect(obj, {depth: (depth!=undefined)? depth : 2}));
}

// This is our "error" handler. seeeesh
process.on('unhandledRejection', (error) => {
	Neptune.log.error('Unhandled rejection: ' + error.message + "\n" + error.stack, debug);
	// Should close now..
});
process.on('uncaughtException', (error) => {
	Neptune.log.error('Unhandled exception: ' + error.message + "\n" + error.stack, debug);
});



// Events
// would like the below to be "cleaner" but eh
class EmitterLogger extends require('events') {
	#name;
	constructor(name) { super(); this.#name = name; }
	emit(type, ...args) {
		Neptune.log.debug("Event Neptune.events." + this.#name + "@" + type + " fired | " + util.inspect(arguments, {depth: 1}), false);
		super.emit(type, ...args);
	}
}

Neptune.events = {
	application: new EmitterLogger("application"), // Application events (UI related, shutting down)
	server: new EmitterLogger("server") // Server events (new device connected, device paired)
}


// Shutdown handling
/**
 * Call this function to initiate a clean shutdown
 * @param {number} [shutdownTimeout=1500] - Time to wait before closing the process
 */
async function Shutdown(shutdownTimeout) {
	if (typeof shutdownTimeout !== "number") {
		shutdownTimeout = 1500;
	}

	global.shuttingDown = true; // For when we kill the logger
	Neptune.events.application.emit('shutdown', shutdownTimeout)
}
Neptune.events.application.on('shutdown', (shutdownTimeout) => {
	Neptune.log.info("Shutdown signal received, shutting down in " + (shutdownTimeout/1000) + " seconds.");

	setTimeout(()=>{
		Neptune.log.info("Goodbye world!");
		process.exit(0);
	}, shutdownTimeout);
});
process.on('beforeExit', code => {
	Neptune.log("Exit code: " + code);
	Neptune.logMan.close();
});
process.on('SIGTERM', signal => {
	Neptune.log.warn(`Process ${process.pid} received a SIGTERM signal`);
	Shutdown(500);
})

// User console input
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
var confirmExit = false; // windows will kill it if you press CTRL+C twice

setTimeout(() => { confirmExit = true }, 5000); // when packaged CTRL+C is auto sent on startup .. wait a sec before listening

if (process.stdin !== undefined)
	rl.on("close", function () { // to-do: realize, hey, there's no console.
		if (confirmExit === true) {
			Shutdown(); // Capture CTRL+C
		} else {
			confirmExit = true;
			Neptune.log.warn("Press CTRL+C again within 10 seconds to confirm exit!");
			setTimeout(() => { confirmExit = false; }, 10000);
		}
	});

async function promptUser(quetion) {
	function getPromise() {
		return new Promise(resolve => rl.question(question, ans => {
			rl.close();
			resolve(ans);
		}));
	}
	return await getPromise();
}











// Begin

const endTerminalCode = "\x1b[0m"; // Reset font color
if (!debug) {
	process.stdout.write("\x1B[0m\x1B[2;J\x1B[1;1H"); // Clear the terminal
	console.clear();
	console.log(endTerminalCode + "--== Neptune ==--");
} else {
	console.log(endTerminalCode);
}

Neptune.log.info("Hello world!"); // :wave:

if (!debug) {
	Neptune.log("\x1b[1m\x1b[47m\x1b[34mProduction" + endTerminalCode + ", version: " + Neptune.version.toString()); // Production mode
}
else
	Neptune.log("\x1b[1m\x1b[41m\x1b[33m**DEV MODE**" + endTerminalCode + ", version: " + Neptune.version.toString()); // Developer (debug) mode

Neptune.log("Running on \x1b[1m\x1b[34m" + process.platform);


if (!fs.existsSync("./data/"))
	fs.mkdirSync("./data/")
if (!fs.existsSync("./data/clients/"))
	fs.mkdirSync("./data/clients/")


var firstRun = (fs.existsSync("./data/NeptuneConfig.json") === false);

// two things: blah blah blah main function can't be async, catastrophic error catching
async function main() {
	let encryptionKey = await keytar.getPassword("Neptune","ConfigKey");
	let keyFound = (encryptionKey !== null && encryptionKey !== "");
	if (encryptionKey == null)
		encryptionKey = undefined;

	
	try {
		Neptune.configManager = new ConfigurationManager("./data/", (keyFound)? encryptionKey : undefined);
		Neptune.config = Neptune.configManager.loadConfig("./data/NeptuneConfig.json", true, NeptuneConfig);

		// For whatever reason, this try block just does not work! Very cool!
		// manually check the encryption:
		let encryptionCheck = fs.readFileSync("./data/NeptuneConfig.json");
		if (NeptuneCrypto.isEncrypted(encryptionCheck)) { // if there's actual encryption.
			encryptionCheck = NeptuneCrypto.decrypt(encryptionCheck, encryptionKey);
			// eh probably worked.
			encryptionCheck = JSON.parse(encryptionCheck);
			encryptionCheck = {}; // good enough
		}
	} catch (err) {
		if (err instanceof NeptuneCrypto.Errors.InvalidDecryptionKey) {
			Neptune.log.error("Encryption key is invalid! Data is in a limbo state, possibly corrupted.");
			Neptune.log.warn("Neptune will halt. To load Neptune, please fix this error by deleting/moving the config files, fixing the encryption key, or fixing the configs.");
		} else if (err instanceof NeptuneCrypto.Errors.MissingDecryptionKey) {
			Neptune.log.error("Encryption key is missing! Data is still there, but good luck decrypting it !");
			Neptune.log.warn("Neptune will halt. To load Neptune, please fix this error by deleting/moving the config files, fixing the encryption key, or fixing the configs.");
		} else {
			Neptune.log.error("Config is completely broken!");
		}

		Neptune.log.debug("Encryption KEY: " + encryptionKey);

		console.log("")
		Neptune.log.critical(" === ::error on read Neptune config:: === ");
		Neptune.log.critical(err);

		console.log("");
		Neptune.log.error("Stack: ");
		Neptune.log.error(err.stack);

		process.exitCode = -1;
		process.exit();
	}
	

	// Config empty?
	if (Object.keys(Neptune.config.entries).length < 1) {
		firstRun = true
		Neptune.log.verbose("Config is completely empty, setting as first run...");
	} else {
		if (Neptune.config.firstRun === true) {
			firstRun = Neptune.config.firstRun;
			Neptune.log.verbose("Config has firstRun set to true. Either a reset, or new config.");
		}
	}
	if (firstRun) {
		Neptune.log.verbose("First run! Generated default config file.");
	
		Neptune.config = new NeptuneConfig(Neptune.configManager, "./data/NeptuneConfig.json");
		Neptune.config.save();
		Neptune.config.close();
		Neptune.config = Neptune.configManager.loadConfig("./data/NeptuneConfig.json", true, NeptuneConfig);

		if (!keyFound && Neptune.config.encryption.enabled) {
			// Set a new key
			Math.random(); // .. seed the machine later (roll own RNG ? Probably a bad idea.)
			encryptionKey = NeptuneCrypto.randomString(Neptune.config.encryption.newKeyLength, 33, 220);
			Neptune.log.verbose("Generated encryption key of length " + Neptune.config.encryption.newKeyLength);
			keytar.setPassword("Neptune","ConfigKey",encryptionKey);
			Neptune.configManager.setEncryptionKey(encryptionKey);
			Neptune.log.verbose("Encryption key loaded");
		} else if (keyFound && Neptune.config.encryption.enabled) {
			Neptune.log.verbose("Encryption key loaded from OS keychain");
		}
	}

	if (keyFound && Neptune.config.encryption.enabled === false) {
		Neptune.log.verbose("Key found, yet encryption is disabled. Odd. Running rekey to completely disable.")
		Neptune.configManager.rekey(); // Encryption is set to off, but the key is there? Make sure to decrypt everything and remove key
	}


	if (Neptune.config.encryption.enabled && (encryptionKey !== undefined || encryptionKey !== ""))
		Neptune.log("File encryption \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled");
	else
		Neptune.log("File encryption \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled.");



	Neptune.log.debug("Neptune config:");
	utilLog(Neptune.config.entries);

	Neptune.log.debug("Encryption KEY: " + encryptionKey);
	if (encryptionKey !== undefined)
		encryptionKey = NeptuneCrypto.randomString(encryptionKey.length*2); // Don't need that, configuration manager has it now

	Neptune.events.application.on('shutdown', (shutdownTimeout) => {
		Neptune.configManager.destroy(); // Save all configs!
	});

	Neptune.log("Loading previous clients...");
	Neptune.clientManager = new ClientManager();



	/**
	 * _____________
	 * |           |
	 * |    GUI    |
	 * |___________|
	 * 
	 */



	// Used "globally"
	const ResourceManager = new (require("./ResourceManager"))();
	process.ResourceManager = ResourceManager;


	const qApp = NodeGUI.QApplication.instance();
	qApp.setQuitOnLastWindowClosed(false); // required so that app doesn't close if we close all windows.


	// Tray icon
	// https://docs.nodegui.org/docs/api/generated/classes/qsystemtrayicon/ | https://github.com/nodegui/examples/blob/master/nodegui/systray/src/index.ts
	const tray = new NodeGUI.QSystemTrayIcon();
	tray.setIcon(ResourceManager.ApplicationIcon);
	tray.setToolTip("Neptune Server running");
	tray.addEventListener('activated',(clickType)=> {
		// 1: right click, 2: left, 3: double, 4: middle
		switch(clickType) {
			case 3:
				if (mainWindow.isVisible()) {
					mainWindow.hide();
				} else {
					mainWindow.show();
				}
				break;
		}
	});
	Neptune.events.application.on('shutdown', ()=>{
		tray.hide();
	});
	
	const tMenu = new NodeGUI.QMenu();
	// tMenu.setStyleSheet("QMenu::item { height: 25%; margin: 0px }")
	var tActions = {}; // trayActions

	// Quit action
	tActions.quit = new NodeGUI.QAction();
	tActions.quit.setText("Shutdown Neptune");
	tActions.quit.addEventListener("triggered", () => {
		Shutdown();
	});

	// Show window
	tActions.showMainWindow = new NodeGUI.QAction();
	tActions.showMainWindow.setText("Show");
	tActions.showMainWindow.addEventListener("triggered", () => {
		if (mainWindow.isVisible()) {
			mainWindow.hide();
		} else {
			mainWindow.show();
		}
	});

	// Add actions
	tMenu.addAction(tActions.showMainWindow);
	tMenu.addAction(tActions.quit);

	tray.setContextMenu(tMenu);
	Neptune.log.debug("Tray shown");
	tray.show();
	global.tray = tray; // prevents garbage collection of tray (not a fan!)


	// Main window
	const mainWindow = new (require('./Windows/mainWindow.js'))();
	// https://docs.nodegui.org/docs/api/generated/enums/widgeteventtypes
	// mainWindow.addEventListener(NodeGUI.WidgetEventTypes.Close, (abc) => Neptune.log("close")); // redundant
	mainWindow.addEventListener(NodeGUI.WidgetEventTypes.Hide, () => {
		tActions.showMainWindow.setText("Show");
		Neptune.log.silly("mainWindow@Hide");
	});
	mainWindow.addEventListener(NodeGUI.WidgetEventTypes.Show, () => {
		tActions.showMainWindow.setText("Hide");
		Neptune.log.silly("mainWindow@Show");
	});
	Neptune.log.debug("Main open");
	mainWindow.show();









	/**
	 * _____________
	 * |           |
	 * |  Express  |
	 * |___________|
	 * 
	 */

	Neptune.webLog = Neptune.logMan.getLogger("Web");
	
	const app = Express();
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
			fileSize: 40000000, // 40MB
		},
		fileFilter: function (req, file, callback) {
			var ext = path.extname(file.originalname);
			if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') { // Only allow JPG's
				return callback(new Error('Only images are allowed'))
			}
			callback(null, true)
		},
	}); // For uploads


	const httpServer = http.createServer(app);


	// Heartbeat
	var sounds = ["Thoomp-thoomp", "Bump-bump", "Thump-bump"];
	app.get("/heartbeat", (req, res) => {
		let sound = sounds[Math.floor(Math.random()*sounds.length)];
		Neptune.webLog.verbose(sound + " (heartbeat)");
		res.status(200).send('ok');
	});

	// Web page
	app.get("/", (req, res) => {
		res.end(`<html>
		<head>
			<title>Neptune</title>
		</head>
		<body>
			<h1>Oh my Neptune.</h1>
		</body>
	</html>`);

		mainWindow.show();
	});


	var conInitUUIDs = {};
	


	const crypto = require("node:crypto");

	// https://nodejs.org/api/crypto.html#class-diffiehellman
	// This is the initial endpoint for the client
	app.post('/api/v1/server/newSocketConnection', (req, res) => {
		let conInitUUID = crypto.randomUUID(); // NeptuneCrypto.convert(NeptuneCrypto.randomString(16), "utf8", "hex"); // string (len 16) -> HEX
		Neptune.webLog.info("Initiating new client connection, uuid: " + conInitUUID);

		let alice = crypto.getDiffieHellman('modp14');
		let alicePublic = alice.generateKeys();

		conInitUUIDs[conInitUUID] = {
			"enabled": true,
			"socketCreated": false,
			dhObject: alice,
			"g1": alice.getGenerator().toString('base64'),
			"p1": alice.getPrime().toString('base64'),
			"a1": alice.getPublicKey().toString('base64'),
			createdAt: new Date().toISOString(),
			cipher: req.body.acceptedCrypto,
			hashAlgorithm: req.body.acceptedHashTypes
		}

		res.status(200).send(JSON.stringify({
			"g1": conInitUUIDs[conInitUUID]["g1"],
			"p1": conInitUUIDs[conInitUUID]["p1"],
			"a1": conInitUUIDs[conInitUUID]["a1"],
			"conInitUUID": conInitUUID,
		}));
	});

	// This is the final part of negotiation, creates the socket and opens up command inputting
	app.post('/api/v1/server/newSocketConnection/:conInitUUID', (req, res) => {
		let conInitUUID = req.params.conInitUUID;
		Neptune.webLog.silly("POST: /api/v1/server/newSocketConnection/" + conInitUUID + " .. body: " + JSON.stringify(req.body));
		if (conInitUUIDs[conInitUUID] !== undefined) {
			if (conInitUUIDs[conInitUUID].socketCreated !== false) {
				Neptune.webLog.warn("Attempt to use disabled conInitUUID! UUID: " + conInitUUID);
				res.status(403).send('{ "error": "Invalid conInitUUID" }');
				return;
			}
		} else {
			Neptune.webLog.silly("Attempt to use invalid conInitUUID: " + conInitUUID);
			res.status(401).send('{ "error": "Invalid conInitUUID" }');
			return;
		}

		// Validate timestamp
		let timeNow = new Date();
		let createdTime = conInitUUIDs[conInitUUID].createdAt;

		if (((timeNow - createdTime)/(60000)) >= 5) { // Older than 5 minutes
			Neptune.webLog.warn("Attempt to use old conInitUUID! UUID: " + conInitUUID + " . createdAt: " + createdTime.toISOString());
			delete conInitUUIDs[conInitUUID];
			res.status(408).send('{ "error": "Request timeout for conInitUUID" }');
		}

		let socketUUID = crypto.randomUUID();

		let aliceSecret = conInitUUIDs[conInitUUID].dhObject.computeSecret(Buffer.from(req.body.b1,'base64'));
		conInitUUIDs[conInitUUID].secret = NeptuneCrypto.HKDF(aliceSecret, "mySalt1234", {hashAlgorithm: "sha256", keyLength: 32}).key;

		// Neptune.webLog.silly(conInitUUID + " bob public key (hex): " + Buffer.from(req.body.b1,'base64').toString('hex'));
		// Neptune.webLog.silly(conInitUUID + " alice public key (hex): " + Buffer.from(conInitUUIDs[conInitUUID]["a1"], "base64").toString('hex'));
		// Neptune.webLog.silly(conInitUUID + " DH secret key (hex): " + aliceSecret.toString('hex'));
		// Neptune.webLog.silly(conInitUUID + " shared key (hex): " + conInitUUIDs[conInitUUID].secret.toString('hex'));

		

		var chkMsg = req.body.chkMsg;
		try {
			if (NeptuneCrypto.isEncrypted(chkMsg))
				chkMsg = NeptuneCrypto.decrypt(chkMsg, conInitUUIDs[conInitUUID].secret);
		} catch (err) {
			if (err instanceof NeptuneCrypto.Errors.InvalidDecryptionKey || err instanceof NeptuneCrypto.Errors.MissingDecryptionKey) {
				// bad key.
				Neptune.webLog.warn("Socket setup, bad key! UUID: " + conInitUUID);
				// res.status(400).send(`{ "error": "Invalid encryption key" }`);
			} else {
				// Another error
				Neptune.webLog.warn("Decryption of chkMsg failed, error: " + err.message);
				res.status(400).send(`{ "error": "Decryption of chkMsg failed" }`);
			}
			//return;
		}
		
		let chkMsgHash = crypto.createHash(req.body.chkMsgHashFunction).update(chkMsg).digest('hex');
		chkMsgHash = req.body.chkMsgHash; // remove this later

		if (chkMsgHash !== req.body.chkMsgHash) {
			Neptune.webLog.warn(`Invalid chkMsg hash! chkMsg: ${chkMsg} ... ourHash: ${chkMsgHash} ... clientHash: ${req.body.chkMsgHash}`);
			res.status(400).send(`{ "error": "Invalid chkMsgHash" }`);
			return;
		} else {
			Neptune.webLog.info("Generating socket, id: " + socketUUID);
			conInitUUIDs[conInitUUID].socketCreated = false; // Done
			// Create the socket here.
			// get the client
			conInitUUIDs[conInitUUID].clientId = NeptuneCrypto.decrypt(req.body.clientId, conInitUUIDs[conInitUUID].secret.toString('utf8'));
			/** @type {Client} client **/
			let client = Neptune.clientManager.getClient(conInitUUIDs[conInitUUID].clientId)

			
			if (req.socket.remoteAddress !== "::1") {
				client.IPAddress = new IPAddress(req.socket.remoteAddress, "25560");
			}


			// DELETE these later!
			global.client = client;
			client.friendlyName = "Test device";
			client.clientId = conInitUUIDs[conInitUUID].clientId;
			client.dateAdded = new Date();

			conInitUUIDs[conInitUUID].client = client; // this is temporary.. delete later

			var ws = new WebSocketServer({server: httpServer, path: '/api/v1/server/socket/' + socketUUID});

			ws.on("connection", function(ws){
				Neptune.webLog.info("Client connected to socket " + socketUUID);
				client.setupConnectionManagerWebsocket(ws);
			});

			client.setupConnectionManager(conInitUUIDs[conInitUUID].secret, {
				conInitUUID: conInitUUID,
				createdAt: conInitUUIDs[conInitUUID].createdAt,
			});
			

			// This should be encrypted.
			let response = JSON.stringify({
				confMsg: crypto.createHash(req.body.chkMsgHashFunction).update(chkMsg + req.body.chkMsgHash).digest('hex'),
				socketUUID: socketUUID,
			});

			let supportedCiphers = ["chacha20-poly1305", "chacha20", "aes-256-gcm", "aes-128-gcm"];
			let supportedHashAlgorithms = ["sha256", "sha512"];

			var cipher = "chacha20-poly1305";
			var hashAlgorithm = "sha256";

			if (conInitUUIDs[conInitUUID].cipher !== undefined) {
				for (var i = 0; i<conInitUUIDs[conInitUUID].cipher.length; i++) {
					if (supportedCiphers.indexOf(conInitUUIDs[conInitUUID].cipher[i]) != -1) {
						cipher = conInitUUIDs[conInitUUID].cipher[i];
					}
				}
			}

			if (conInitUUIDs[conInitUUID].hashAlgorithm !== undefined) {
				for (var i = 0; i<conInitUUIDs[conInitUUID].hashAlgorithm.length; i++) {
					if (supportedHashAlgorithms.indexOf(conInitUUIDs[conInitUUID].hashAlgorithm[i]) != -1) {
						hashAlgorithm = conInitUUIDs[conInitUUID].hashAlgorithm[0];
					}
				}
			}

			let encryptedResponse = NeptuneCrypto.encrypt(response, conInitUUIDs[conInitUUID].secret, undefined, {hashAlgorithm: hashAlgorithm, cipherAlgorithm: cipher})

			Neptune.webLog.info(conInitUUID + " setup completed.");

			res.status(200).send(encryptedResponse);
		}
	});


	app.post('/api/v1/server/socket/:socketUUID/http', (req, res) => {
		var sentResponse = false;
		let conInitUUID = req.body.conInitUUID;

		// if (conInitUUIDs[conInitUUID] !== undefined) {
		// 	if (conInitUUIDs[conInitUUID].enabled !== true) {
		// 		Neptune.webLog.warn("Attempt to use disabled conInitUUID! UUID: " + conInitUUID);
		// 		res.status(403).send('{ "error": "Invalid conInitUUID" }');
		// 		return;
		// 	}
		// } else {
		// 	res.status(401).send('{ "error": "Invalid conInitUUID" }');
		// 	return;
		// }

		conInitUUIDs[conInitUUID].client.processHTTPRequest(JSON.stringify(req.body), (data) => {
			Neptune.webLog.silly(data);
			if (!sentResponse) {
				sentResponse = true;
				res.status(200).send(data);
			}
		});

		setTimeout(()=>{ // sends OK after 10 seconds (likely no response from server?)
			if (!sentResponse) {
				sentResponse = true;
				res.status(200).send("{}");
			}
		}, 10000);
	})


	// Listener
	httpServer.listen(Neptune.config.web.port, () => {
		Neptune.webLog("Express server listening on port " + Neptune.config.web.port);
	});




	// Command line listener


	// Server operator interaction

	var output;
	var defaultToEval = false; // use `eval defaultToEval=true` in the terminal to flip into eval only mode

	var cLog = Neptune.logMan.getLogger("Console");

	function processCMD(command) {
		cLog.info("Received user input: " + command.toString(), false);
		try {
			if (defaultToEval) {
				try {
					output = eval(command);
					// cLog.info("Output: ");
					utilLog(output, 2);
				} catch(err) {
					cLog.error(err);
				}
			} else {
				if (command == "exit" || command == "quit" || command == "end")
					Shutdown();
				else if (command == "showmain")
					mainWindow.show()
				else if (command.startsWith("rekey")) {
					let cmd = command.substr(6);
					Neptune.configManager.rekey(cmd).then((didIt) => cLog.info("Successful: " + didIt)).catch(err => cLog.error("Failed: " + err));
				}
				else if (command.startsWith("eval ")) {
					let cmd = command.substr(5);
					try {
						output = eval(cmd);
						utilLog(output, 2);
					} catch(err) {
						cLog.error(err);
					}
				}
				else
					console.log("Received input: " + command + " . (not a command)");
			}
		} catch(_) {
			// do a thing or something
		}
	}

	async function prompt() {
		for await (const line of rl) {
			processCMD(line);
		}
	}


	// Operator input
	prompt();
	console.log("END")
}

if (debug) {
	main(); // I don't want that stupid crash report
} else
main().catch((err) => {
	// Catastrophic failure!

	var crashReportWritten = false;
	try {
		// Write crash report
		let dateTime = new Date();
		let date = dateTime.toISOString().split('T')[0];
		let time = dateTime.toISOString().split('T')[1].split('.')[0]; // very cool
		
		let crashReport = `He's dead, Jim.

Neptune has crashed catastrophically, here's what we know:

DateTime: ${dateTime.toISOString()}\\
Neptune version: ${Neptune.version}\\
Debug: ${debug}
Platform: ${process.platform}


== Error info ==
Message: ${err.message}\\
Stack: \`${err.stack}\`


== Process info ==\\
arch: ${process.arch}\\
platform: ${process.platform}
exitCode: ${process.exitCode}\\
env.NODE_ENV: "${process.env.NODE_ENV}"\\
debugPort: ${process.debugPort}


title: "${process.title}"\\
argv: "${process.argv.toString()}"
execArgv: ${process.execArgv}\\
pid: ${process.pid}\\
ppid: ${process.ppid}\\



versions:
\`\`\`JSON
  {
    "node": "${process.versions.node}",
    "v8": "${process.versions.v8}",
    "uv": "${process.versions.uv}",
    "zlib": "${process.versions.zlib}",
    "brotli": "${process.versions.brotli}",
    "ares": "${process.versions.ares}",
    "modules": "${process.versions.modules}",
    "nghttp2": "${process.versions.nghttp2}",
    "napi": "${process.versions.napi}",
    "llhttp": "${process.versions.llhttp}",
    "openssl": "${process.versions.openssl}",
    "cldr": "${process.versions.cldr}",
    "icu": "${process.versions.icu}",
    "tz": "${process.versions.tz}",
    "unicode": "${process.versions.unicode}",
    "ngtcp2": "${process.versions.ngtcp2}",
    "nghttp3": "${process.versions.nghttp3}"
  }
\`\`\`

process.features:
\`\`\`JSON
  {
    "inspector": ${process.features.inspector},
    "debug": ${process.features.debug},
    "uv": ${process.features.uv},
    "ipv6": ${process.features.ipv6},
    "tls_alpn": ${process.features.tls_alpn},
    "tls_sni": ${process.features.tls_sni},
    "tls_ocsp": ${process.features.tls_ocsp},
    "tls": ${process.features.tls}
  }
\`\`\``;

		fs.writeFileSync(__dirname + "/crashReport-" + date + "T" + time.replace(/:/g,"_") + ".md", crashReport);
		crashReportWritten = true;
		Neptune.logMan.open();
		Neptune.log.critical(crashReport.replace(/`/g,'').replace(/\\/g,'').replace(/JSON/g,''))
		console.log("");
		Neptune.log.critical("Please send the crash report and Neptune log to the team and we'll look into it.");
		Neptune.log.info("The crash report was written to \"" + __dirname + "/crashReport-" + date + "T" + time.replace(/:/g,"_") + ".md\" (and in the Neptune log file ./logs/Neptune.log)");
		console.log("")
		Neptune.log.info("Exiting now", false);
		global.shuttingDown = true;
		Neptune.logMan.close();
	} catch(error) {
		Neptune.log("\n\nGee billy, your mom lets you have TWO errors?");
		Neptune.log.error(`Neptune has crashed catastrophically, and then crashed trying to tell you it crashed. Go figure.

Please send any data over to the team and we'll look into it.
If the crash report was written, it'll be at ./crashReport-<date>.md (./ signifying the current running directory).
Crash report written: ${crashReportWritten}

---
First error: ${err.message}

First error stack: ${err.stack}

---

Second error: ${error.message}

Second error stack: ${error.stack}`);
	} finally {
		console.log("Exiting... (using abort, expect a bunch of junk below)");
		if (process.exitCode === undefined)
			process.exitCode = -9001;
		process.abort();
	}
});