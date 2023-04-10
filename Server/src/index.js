'use strict';
/**
 *    _  _ 
 *	 | \| |
 *	 | .` |
 *	 |_|\_|eptune
 *
 *	 Capstone Project 2022
 */


// ---==---

// Which came first? Chicken or the egg?
const Version = require('./Classes/Version.js');
const isWin = process.platform === "win32"; // Can change notification handling behavior






// Global behavioral changes (static stuff)
/**
 * Debug mode - special stuff
 * @type {boolean}
 */
const debug = true; // change this later idk

/**
 * output the silly log level to console (it goes	every other level > silly, silly is the lowest priority, literal spam)
 * @type {boolean}
 */
const displaySilly = false; // 
Error.stackTraceLimit = (debug)? 8 : 4;
global.consoleVisible = true;


/** @namespace Neptune */
const Neptune = {};
/** @type {Neptune} */
global.Neptune = Neptune; // Anywhere down the chain you can use process.Neptune. Allows us to get around providing `Neptune` to everything

/**
 * Neptune version
 * @type {Version}
 */
Neptune.version = new Version(0, 9, 0, ((debug)?"debug":"release"), "RC1");


// Type definitions
/**
 * True if running on Windows
 * @type {boolean}
 */
Neptune.isWindows = isWin;

/**
 * True if in debug mode
 * @type {boolean}
 */
Neptune.debugMode = debug;




/*
 * Pull in externals here, imports, libraries
 * 
 */
// Basic
const path = require("node:path");
const fs = require("node:fs")
const EventEmitter = require('node:events');
const util = require('node:util');
const { exec } = require('node:child_process');

// Crypto
const keytar = require("keytar");


// GUI
const NodeGUI = require("@nodegui/nodegui");
/**
 * NodeGUI application instance 
 */
const qApp = NodeGUI.QApplication.instance();
global.qApp = qApp;

// Interaction
const readline = require("readline");


// Web
const http = require('http');
const Express = require('express'); // also kinda important
const multer = require('multer');
const ciao = require("@homebridge/ciao"); // MDNS broadcasts
const responder = ciao.getResponder();



// Classes
const ConfigurationManager = require('./Classes/ConfigurationManager.js');
const NeptuneConfig = require('./Classes/NeptuneConfig.js');
const ClientManager = require('./Classes/ClientManager.js');
const Notification = require('./Classes/Notification.js');
const NotificationManager = require('./Classes/NotificationManager.js');
const Client = require('./Classes/Client.js')
const { LogMan, Logger } = require('./Classes/LogMan.js');
const IPAddress = require("./Classes/IPAddress.js");
const NeptuneCrypto = require('./Support/NeptuneCrypto.js');



/** @type {ConfigurationManager} */
Neptune.configManager;
/** @type {NeptuneConfig} */
Neptune.config;
/** @type {ClientManager} */
Neptune.clientManager;
/** @type {NotificationManager} */
Neptune.notificationManager;





// Logging
/** @type {LogMan.ConstructorOptions} */
let logOptions = {
	fileWriteLevel: {
		silly: debug
	},
	consoleDisplayLevel: {
		silly: displaySilly
	},
	cleanLog: true,
	consoleMessageCharacterLimit: (debug? 750 : 1250),
	fileMessageCharacterLimit: (debug? 4000 : 7500),
}
/**
 * Neptune Log creator
 * @type {LogMan}
 */
Neptune.logMan = new LogMan("Neptune", "./logs", logOptions);
// Log name: Neptune, in the logs folder, do not display silly messages (event fired!)

/**
 * Neptune main logger
 * @type {Logger}
 */
Neptune.log = Neptune.logMan.getLogger("Neptune"); // You can call this (log) to log as info

Neptune.logMan.on('close', () => { // Reopen log file if closed (and not shutting down)
	if (!global.shuttingDown) {
		console.warn("..log file unexpectedly closed..\nReopening ...");
		Neptune.logMan.reopen();
	}
});

// For debugging, allows you to output a nasty object into console. Neat
var utilLog = function(obj, depth) {
	Neptune.log.debug(util.inspect(obj, {depth: (depth!=undefined)? depth : 3}));
}

// This is our "error" handler. seeeesh
process.on('unhandledRejection', (error) => {
	Neptune.log.error('Unhandled rejection: ' + error.message + "\n" + error.stack, debug);
	Neptune.log.error(error, false);
	// Should close now..
});
process.on('uncaughtException', (error) => {
	Neptune.log.error('Unhandled exception: ' + error.message + "\n" + error.stack, debug);
	Neptune.log.error(error, false);
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

/**
 * Neptune events
 * @namespace
 */
Neptune.events = {
	/**
	 * Application events (UI related)
	 * @type {EventEmitter}
	 */
	application: new EmitterLogger("application"),

	/**
	 * Server events (new device connected, device paired)
	 * @type {EventEmitter}
	 */
	server: new EmitterLogger("server")
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
process.Shutdown = Shutdown;

/**
 * Whether Neptune is currently shutting down or not.
 * @type {boolean}
 */
Neptune.shuttingDown = false;

/**
 * @event Neptune.events.application#shutdown
 * @type {object}
 * @property {number} shutdownTimeout - Amount of time to wait before shutting down completely.
 */
Neptune.events.application.on('shutdown', (shutdownTimeout) => {
	if (Neptune.shuttingDown)
		return;

	Neptune.log.info("Shutdown signal received, shutting down in " + (shutdownTimeout/1000) + " seconds.");
	Neptune.shuttingDown = true;

	try {
		if (Neptune.mdnsService !== undefined) {
			Neptune.mdnsService.destroy();
		}
	} catch {}

	setTimeout(()=>{
		Neptune.log.info("Goodbye world!");
		if (qApp !== undefined)
			qApp.quit();
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

setTimeout(() => { confirmExit = true; console.log("CTRL+C capture enabled.") }, 5000); // when packaged CTRL+C is auto sent on startup .. wait a sec before listening

if (process.stdin !== undefined)
	rl.on("close", function () { // to-do: realize, hey, there's no console.
		if (confirmExit === true) {
			Shutdown(); // Capture CTRL+C
		} else {
			confirmExit = true;
			Neptune.log.warn("CTRL+C is ignored during the first 5 seconds. Please type \"q\" to quit.");
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



// If Win32, connect to the NeptuneRunner application pipe
if (isWin) {
	try {
		let NRIPC = require("./Classes/NeptuneRunner.js")
		global.NeptuneRunnerIPC = new NRIPC.NeptuneRunnerIPC();
	} catch (e) {}
}



// two things: blah blah blah main function can't be async, catastrophic error catching
async function main() {
	if (!fs.existsSync("./data/"))
		fs.mkdirSync("./data/")
	if (!fs.existsSync("./data/clients/"))
		fs.mkdirSync("./data/clients/")


	var firstRun = (fs.existsSync("./data/NeptuneConfig.json") === false);

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
	let data = Neptune.config.readSync()
	if (data == "" || data == "{}") {
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
		Neptune.config.encryption.enabled = !debug;
		Neptune.config.saveSync();

		if (!keyFound && Neptune.config.encryption.enabled) {
			// Set a new key
			Math.random(); // .. seed the machine later (roll own RNG ? Probably a bad idea.)
			encryptionKey = NeptuneCrypto.randomString(Neptune.config.encryption.newKeyLength, 33, 220);
			Neptune.log.verbose("Generated encryption key of length " + Neptune.config.encryption.newKeyLength);
			keytar.setPassword("Neptune","ConfigKey",encryptionKey);
			Neptune.configManager.setEncryptionKey(encryptionKey);
			Neptune.log.verbose("Encryption key loaded");
			Neptune.config.saveSync();
		} else if (keyFound && Neptune.config.encryption.enabled) {
			Neptune.log.verbose("Encryption key loaded from OS keychain");
		}
	}

	if (keyFound && Neptune.config.encryption.enabled === false) {
		Neptune.log.verbose("Key found, yet encryption is disabled. Odd. Running re-key to completely disable.")
		Neptune.configManager.rekey(); // Encryption is set to off, but the key is there? Make sure to decrypt everything and remove key
	}


	if (Neptune.config.encryption.enabled && (encryptionKey !== undefined && encryptionKey !== ""))
		Neptune.log("File encryption \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled");
	else {
		Neptune.log("File encryption \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled.");
		Neptune.log.debug("Neptune config:");
		utilLog(Neptune.config);
	}


	//Neptune.log.debug("Encryption KEY: " + encryptionKey); // ?!?! why ???
	if (encryptionKey !== undefined) {
		encryptionKey = NeptuneCrypto.randomString(encryptionKey.length); // Don't need that, configuration manager has it now
		//delete encryptionKey
	}

	Neptune.events.application.on('shutdown', (shutdownTimeout) => {
		Neptune.clientManager.destroy(); // Remove any unpaired
	});

	Neptune.log("Loading previous clients...");
	Neptune.clientManager = new ClientManager(Neptune.configManager);



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


	qApp.setQuitOnLastWindowClosed(false); // required so that app doesn't close if we close all windows.
	process.env["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
	process.env["QT_ENABLE_HIGHDPI_SCALING"] = "1"

	var clipboard = NodeGUI.QApplication.clipboard();
	if (clipboard) {
		clipboard.addEventListener('changed', () => {
			// Clipboard changed, push to client
			// Neptune.log.silly("Clipboard data changed, pushing to clients.");
			Neptune.clientManager.getClients().forEach(client => {
				if (client.clipboardSettings.synchronizeClipboardToClient && !client.clipboardModificationsLocked)
					client.sendClipboard();
			});
		});
	} else {
		Neptune.log.debug("No clipboard object, clipboard support questionable.");
	}


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
		try {
			// Actually web...but removes the upload folder
			if (fs.existsSync('./data/uploads'))
				fs.rmSync('./data/uploads', { recursive: true, force: true });
		} catch (e) {}
		
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

	let onClickTrayFunction; // tray icon click event3
	tray.addEventListener('messageClicked', () => {
		if (typeof onClickTrayFunction === "function")
			onClickTrayFunction();
	});

	/**
	 * Sends a balloon tooltip notification using the QSystemTrayIcon class in NodeGUI and the global qApp instance.
	 *
	 * @function Neptune.sendNotification
	 * @param {string} title - The title of the notification.
	 * @param {string} message - The message of the notification.
	 * @param {number} timeout - The timeout of the notification in milliseconds.
	 * @param {function} onClick - The function called whenever the balloon is clicked.
	 */
	Neptune.sendNotification = function(title, message, timeout, onClick) {
		tray.showMessage(title, message, ResourceManager.ApplicationIcon, timeout);

		if (typeof onClick === "function")
			onClickTrayFunction = onClick;
		else
			onClickTrayFunction = undefined;
	}



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

	if (!Neptune.config.applicationSettings.startMinimized) {
		Neptune.log.debug("Main open");
		mainWindow.show();
	}









	/**
	 * _____________
	 * |           |
	 * |  Express  |
	 * |___________|
	 * 
	 */

	/**
	 * Web log
	 * @type {Logger}
	 */
	Neptune.webLog = Neptune.logMan.getLogger("Web");
	
	/**
	 * Express app
	 * @type {Express}
	 */
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


	// advertise ourselves via mdns

	/**
	 * MDNS Service
	 * @type {ciao.CiaoService}
	 */
	Neptune.mdnsService = responder.createService({
		name: "Server:" + Neptune.config.serverId,
		type: 'neptune',
		port: Neptune.config.web.port,
		txt: {
			version: Neptune.version.toString(),
			name: Neptune.config.friendlyName,
		}
	});

	if (Neptune.config.applicationSettings.advertiseNeptune) {
		Neptune.mdnsService.advertise().then(() => {
			Neptune.webLog.verbose("MDNS service now advertising");
		});
	}





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
	


	const crypto = require("node:crypto");

	// https://nodejs.org/api/crypto.html#class-diffiehellman
	// This is the initial endpoint for the client
	app.post('/api/v1/server/initiateConnection', (req, res) => {
		try {
			let conInitUUID = crypto.randomUUID(); // NeptuneCrypto.convert(NeptuneCrypto.randomString(16), "utf8", "hex"); // string (len 16) -> HEX
			let conInitLog = Neptune.logMan.getLogger("ConInit-" + conInitUUID);
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
			Neptune.webLog.error(e, false);

			if (res != undefined)
				res.status(500).send("{}");
		}
	});



	// This is the final part of negotiation, creates the socket and opens up command inputting
	app.post('/api/v1/server/initiateConnection/:conInitUUID', (req, res) => {
		try {
			let conInitUUID = req.params.conInitUUID;
			Neptune.webLog.silly("POST: /api/v1/server/initiateConnection/" + conInitUUID + " .. body: " + JSON.stringify(req.body));
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
				client = Neptune.clientManager.getClient(conInitObject.clientId)
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
			Neptune.webLog.error(e, false);

			if (res != undefined)
				res.status(500).send("{}");
		}
	});
	app.post('/api/v1/server/initiateConnection/:conInitUUID/scrap', (req, res) => {
		try {
			let conInitUUID = req.params.conInitUUID;
			if (conInitUUIDs[conInitUUID] !== undefined) {
				Neptune.webLog.info("Scrapping initiation request for conInitUUID: " + conInitUUID.substr(0,48));
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
					Neptune.webLog.warn("Attempt to use disabled conInitUUID! UUID: " + conInitUUID);
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
					res.status(200).send(data);
				}
			});

			setTimeout(()=>{ // sends OK after 30 seconds (likely no response from server?)
				if (!sentResponse) {
					sentResponse = true;
					res.status(200).send("{}");
				}
			}, 30000);
		} catch (e) {
			Neptune.webLog.error(e, false);

			if (res != undefined)
				res.status(500).send("{}");
		}
	});

	let SocketServer = new WebSocketServer({server: httpServer});
	// Listen for socket connections
	SocketServer.on('connection', (ws, req) => {
		try {
			if (req.url === undefined) {
				Neptune.webLog.error("New connection via WebSocket, no URL specified. Terminating.");
				ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
				ws.close();
				return;
			}
			let urlParts = req.url.split("/");
			if (urlParts.length != 6) {
				Neptune.webLog.error("New connection via WebSocket, URL (" + req.url + ") invalid. Terminating.");
				ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
				ws.close();
				return;
			}

			let socketUUID = urlParts[5].toLowerCase();
			let conInitUUID = socketUUIDs[socketUUID];
			if (conInitUUID === undefined || conInitUUIDs[conInitUUID] === undefined) {
				Neptune.webLog.error("New connection via WebSocket, invalid socket UUID (" + socketUUID +"). Terminating.");
				ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
				ws.close(1002, "InvalidSocketUUID"); // Tells client to reinitialize the connection
				return;
			}

			let conInitObject = conInitUUIDs[conInitUUID];
			let client = conInitObject.client;
			if (client === undefined) {
				Neptune.webLog.error("New connection via WebSocket, socket UUID (" + socketUUID +") valid, but unable to find the client to setup the socket with. Terminating.");
				ws.send("{ \"command\": \"/api/v1/client/disconnect\" }");
				ws.close(1002, "InvalidClient"); // Tells client to reinitialize the connection
				return;
			}

			Neptune.webLog.info("Client " + client.clientId + " connected to socket, socketUUID: " + socketUUID);
			client.setupConnectionManagerWebsocket(ws);
		} catch (e) {
			Neptune.webLog.error(e, false);

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
	Neptune.filesharing = {};

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
	 * @function Neptune.filesharing.newClientDownload
	 * @param {Client} client - Client that will be downloading this file.
	 * @param {string} filepath - Path to the file being downloaded by the client.
	 * @return {fileSharingObject} fileSharingObject
	 */
	Neptune.filesharing.newClientDownload = function(client, filepath) {
		if (client === undefined) {
			Neptune.log.error("newClientDownload: client is undefined!");
			throw new Error("client is undefined.");
		}
			

		if (!client.fileSharingSettings.enabled) { // don't check this, client does that: || !client.fileSharingSettings.allowClientToDownload)
			Neptune.log.error("newClientDownload: client has file sharing disabled (likely forgot to save the settings!)");
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
	 * @alias Neptune.filesharing.newClientUpload
	 * @param {Client} client - Client that will be uploading this file.
	 * @param {string} saveToDirectory - Path to save the uploaded file to.
	 * @return {fileSharingObject} fileSharingObject
	 */
	Neptune.filesharing.newClientUpload = function(client, fileName, saveToDirectory) {
		if (client === undefined) {
			Neptune.log.error("newClientDownload: client is undefined!");
			throw new Error("client is undefined.");
		}
			

		if (!client.fileSharingSettings.enabled) {
			Neptune.log.error("newClientDownload: client has file sharing disabled (likely forgot to save the settings!)");
			throw new Error("file sharing disabled for " + client.friendlyName + ".\nBe sure to check \"Enable file sharing\" and save the settings.");
		}

		if (!client.fileSharingSettings.allowClientToUpload) {
			Neptune.log.error("newClientDownload: client is not allowed to upload files");
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
			Neptune.webLog.error(e, false);
		}
	}

	// Download/upload endpoint
	app.post('/api/v1/server/socket/:socketUUID/filesharing/:fileUUID/download', (req, res) => {
		try {
			/** @type {string} */
			let fileUUID = req.params.fileUUID;
			let socketUUID = req.params.socketUUID;



			Neptune.webLog.silly("Download requested: /api/v1/server/socket/" + socketUUID + "/" + fileUUID);
			if (fileUUIDs[fileUUID] !== undefined) {
				if (fileUUIDs[fileUUID].enabled !== true) {
					Neptune.webLog.warn("Attempt to use disabled fileUUID! UUID: " + fileUUID);
					delete fileUUIDs[fileUUID];
					res.status(403).end('{ "error": "Invalid fileUUID" }');
					return;
				}
			} else {
				Neptune.webLog.silly("Attempt to use invalid fileUUID: " + fileUUID);
				res.status(401).end('{ "error": "Invalid fileUUID" }');
				return;
			}

			/** @type {fileSharingObject} */
			let fileSharingObject = fileUUIDs[fileUUID];

			// Validate timestamp
			let timeNow = new Date();
			if (((timeNow - fileSharingObject.createdTime)/(60000)) >= 5) { // Older than 5 minutes
				Neptune.webLog.warn("Attempt to use expired fileUUID! UUID: " + fileUUID + " . createdAt: " + fileSharingObject.createdTime.toISOString());
				delete fileUUID[fileUUID];
				res.status(408).end('{ "error": "Request timeout for fileUUID" }');
				return;
			}

			// Validate socketUUID
			if (fileSharingObject.socketUUID !== socketUUID) {
				Neptune.webLog.warn("File upload socketUUID mismatch! FileUUID: " + fileUUID + " .");
				delete fileUUID[fileUUID];
				res.status(408).send('{ "error": "Invalid socketUUID" }');
				deleteFiles();
				return;
			}


			// For download?
			if (fileSharingObject.isUpload) {
				Neptune.webLog.warn("Attempt to download using a upload fileUUID.");
				delete fileUUIDs[fileUUID];
				res.status(405).end('{ "error": "Attempt to upload using a download fileUUID." }');
				return;
			}


			// Check validation code
			if (req.body.authenticationCode !== fileSharingObject.authenticationCode) {
				Neptune.webLog.warn("Invalid authenticationCode used on fileUUID: " + fileUUID);
				res.status(401).end('{ "error": "Invalid authenticationCode" }');
				return;
			}




			let filePath = fileSharingObject.filePath;
			Neptune.webLog.info("Client " + fileSharingObject.clientUUID + " has downloaded " + filePath);

			fileUUIDs[fileUUID].enabled = false;
			delete fileUUIDs[fileUUID];

			// Serve the file
			let filename = filePath.replace(/^.*[\\\/]/, '');
			res.setHeader('Content-disposition', 'attachment; filename=' + filename);
			res.download(filePath);

			return;
		} catch (e) {
			Neptune.webLog.error(e, false);

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
						Neptune.webLog.warn("Failed to delete blocked upload: " + req.file.filename)
					});
				}
			}


			Neptune.webLog.silly("Upload requested: /api/v1/server/socket/" + socketUUID + "/filesharing/" + fileUUID + "/upload");
			if (fileUUIDs[fileUUID] !== undefined) {
				if (fileUUIDs[fileUUID].enabled !== true) {
					Neptune.webLog.warn("Attempt to use disabled fileUUID! UUID: " + fileUUID);
					delete fileUUIDs[fileUUID];
					res.status(403).send('{ "error": "Invalid fileUUID" }');
					deleteFiles();
					return;
				}
			} else {
				Neptune.webLog.silly("Attempt to use invalid fileUUID: " + fileUUID);
				res.status(401).send('{ "error": "Invalid fileUUID" }');
				deleteFiles();
				return;
			}

			if (req.file == undefined) {
				// No file????
				Neptune.webLog.warn("No file included in upload! UUID: " + fileUUID);
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
				Neptune.webLog.warn("Attempt to use expired fileUUID! UUID: " + fileUUID + " . createdAt: " + fileSharingObject.createdTime.toISOString());
				delete fileUUID[fileUUID];
				res.status(408).send('{ "error": "Request timeout for fileUUID" }');
				deleteFiles();
				return;
			}

			// Validate socketUUID
			if (fileSharingObject.socketUUID !== socketUUID) {
				Neptune.webLog.warn("File upload socketUUID mismatch! FileUUID: " + fileUUID + " .");
				delete fileUUID[fileUUID];
				res.status(408).send('{ "error": "Invalid socketUUID" }');
				deleteFiles();
				return;
			}

			// For upload?
			if (!fileSharingObject.isUpload) {
				Neptune.webLog.warn("Attempt to upload using a download fileUUID.");
				delete fileUUIDs[fileUUID];
				res.status(405).send('{ "error": "Attempt to upload using a download fileUUID." }');
				deleteFiles();
				return;
			}

			let client = Neptune.clientManager.getClient(fileSharingObject.clientUUID);
			let fileName = (fileSharingObject.fileName !== undefined? fileSharingObject.fileName : fileUUID);
			let acceptedFunction = function() {

				if (client.fileSharingSettings.notifyOnClientUpload) {
					let actionButtonContents = "Show me in folder";
					let notification = new Notification({
						clientId: "Neptune",
						friendlyName: "MainWindow",
					}, {
						action: 'create',
						applicationPackage: 'com.neptune.server',
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
				Neptune.webLog.info("Received file \"" + fileName + "\" from client " + fileSharingObject.clientUUID);
				Neptune.webLog.info("Received files directory: " + fileSharingObject.filePath, false);
				if (fs.existsSync(targetPath)) {
					// Target file already exists, generate a unique file name
					let counter = 1;
					let newTargetPath = fileName.replace(/\.[^.]+$/, '') + ' (' + counter + ')' + path.extname(fileName);

					while (fs.existsSync(newTargetPath)) {
						// Increment the counter until a unique file name is found
						counter++;
						newTargetPath = fileName.replace(/\.[^.]+$/, '') + ' (' + counter + ')' + path.extname(fileName);
					}

					Neptune.webLog.debug("Saving received file (conflict) to: " + path.resolve(fileSharingObject.filePath + "/" + newTargetPath))

					// Rename the file to the new unique name
					fs.renameSync(req.file.path, path.resolve(fileSharingObject.filePath + "/" + newTargetPath));

				} else {
					Neptune.webLog.debug("Saving received file to: " + targetPath)
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
					applicationPackage: 'com.neptune.server',
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
			Neptune.webLog.error("Error receiving file from client. See log for details.");
			Neptune.webLog.error(e, false);

			if (res != undefined)
				res.status(500).end("{ \"status\": \"error receiving file\", \"approved\": false }");
		}
	});


	// Listener
	httpServer.listen(Neptune.config.web.port, () => {
		Neptune.webLog.info("Express server listening on port " + Neptune.config.web.port);
	});




	/**
	 * 
	 * CMD interaction
	 * 
	 */



	// Command line listener
	process.stdout.write(`${String.fromCharCode(27)}]0;Neptune Server${String.fromCharCode(7)}`);

	// Server operator interaction

	var output;
	var defaultToEval = false; // use `eval defaultToEval=true` in the terminal to flip into eval only mode

	var cLog = Neptune.logMan.getLogger("Console");

	let debugWindows = {};
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
				if (command == "exit" || command == "quit" || command == "end" || command == "q")
					Shutdown();
				else if (command == "showmain")
					mainWindow.show()
				else if (command.startsWith("rekey")) {
					let cmd = command.substr(6);
					Neptune.configManager.rekey(cmd).then((didIt) => cLog.info("Successful: " + didIt)).catch(err => cLog.error("Failed: " + err));
				} else if (command.startsWith("pipe send ")) {
					Neptune.NeptuneRunnerPipe.write(command.substr(10));
				}
				else if (command.startsWith("showwin")) {
					let windowName = command.substr(8).replace(/[^0-9a-zA-Z]/g, "");
					if (!fs.existsSync("./Src/Windows/" + windowName + ".js")) {
						console.warn("./Src/Windows/" + windowName + ".js does not exist!")
						return;
					}
					console.log("showing window: " + windowName)
					delete require.cache[require.resolve("./Windows/" + windowName + ".js")]
					let uWindow = new (require("./Windows/" + windowName + ".js"))();
					uWindow.show();
				}
				else if (command.startsWith("debugwin")) {
					let windowName = command.substr(8).replace(/[^0-9a-zA-Z]/g, "");
					if (!fs.existsSync("./Src/Windows/" + windowName + ".js")) {
						console.warn("./Src/Windows/" + windowName + ".js does not exist!")
						return;
					}
					console.log("debugging window: " + windowName)
					let path = "./Windows/" + windowName + ".js";
					let uWindow = new (require(path))();
						uWindow.show();
						uWindow.move(oPosition.x, oPosition.y);
						debugWindows[windowName] = uWindow;
					fs.watchFile("./Src/Windows/" + windowName + ".js", () => {
						console.log("reloading window: " + windowName)

						let oPosition = {x: 0, y: 0}
						if (debugWindows[windowName] !== undefined) {
							oPosition = debugWindows[windowName].pos();
							debugWindows[windowName].close();
						}
						
						delete require.cache[require.resolve(path)]
						delete require.cache[require.resolve("./Windows/NeptuneWindow.js")];
						let uWindow = new (require(path))();
						uWindow.show();
						uWindow.move(oPosition.x, oPosition.y);
						debugWindows[windowName] = uWindow;
					});
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


	try {
		if (global.NeptuneRunnerIPC !== undefined && debug !== true) {
			global.NeptuneRunnerIPC.once('authenticated', () => {
				global.NeptuneRunnerIPC.sendData("hideconsolewindow", {});
				global.consoleVisible = false;
			});
		}
	} catch (e) {}

	// Operator input
	prompt();
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