'use strict';
/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */


// Which came first? Chicken or the egg?
const Version = require('./Support/version');
const Neptune = {};
const defaults = {};






// Global behavioral changes (static stuff)
const debug = true;
Error.stackTraceLimit = 3;

Neptune.Version = new Version(0, 0, 1, ((debug)?"debug":"release"), "WkE_13");
defaults.enableFileEncryption = true;
defaults.encryptionKeyLength = 64;

/** @type {import('./Classes/ConfigurationManager')} */
Neptune.configManager;
/** @type {import('./Classes/ConfigItem')} */
Neptune.Config;

defaults.port = 25560;

process.Neptune = Neptune; // Anywhere down the chain you can use process.Neptune. Allows us to get around providing `Neptune` to everything





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
const ConfigurationManager = require('./Classes/ConfigurationManager.js'); // The data directory

const NeptuneCrypto = require('./Support/NeptuneCrypto.js');






// Logic based changes
if (debug)
	var endTerminalCode = "\x1b[0m";
else 
	var endTerminalCode = "\x1b[0m\x1b[47m\x1b[30m"; // Default colors, \x1b[47m\x1b[30m: Black text, white background

const isWin = process.platform === "win32"; // (must be true before we can use DPAPI. Do not change, okay thanks.)

Neptune.isWindows = isWin;
Neptune.debugMode = debug;

const ogLog = console.log;


const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});



// would like the below to be "cleaner" but eh
class EventEmitterN extends require('events') {
	#name;
	constructor(name) {
		super();
		this.#name = name;
	}
    emit(type, ...args) {
        console.log("[Event] Neptune.Events." + this.#name + "@" + type + " fired | " + util.inspect(arguments, {depth: 1}));
        super.emit(type, ...args);
    }
}
Neptune.Events = {
	application: new EventEmitterN("application"), // Application events (UI related, shutting down)
	server: new EventEmitterN("server") // Server events (new device connected, device paired)
}

async function Shutdown() {
	let shutdownTimeout = 1000;
	if (typeof shutdownTimeout !== "number") {
		shutdownTimeout = (debug)? 1000 : 5000;
	}

	// dlog("Fired @Neptune.Events.application#shutdown: " + shutdownTimeout);
	Neptune.Events.application.emit('shutdown', shutdownTimeout)
}

Neptune.Events.application.on('shutdown', (shutdownTimeout) => {
	console.log("\nShutting down");
	setTimeout(()=>{
		console.log("goodbye ...");
		process.exit(0)
	}, shutdownTimeout);
});
rl.on("close", function () {
	Shutdown();
});



/***
 * Logs to the console
 * @param {string} Message to log
 */
Neptune.log = function(msg) {
	ogLog(msg + endTerminalCode);
}

console.log = Neptune.log; // ooooh risky

console.error = function(msg) {
	Neptune.log(endTerminalCode + "\x1b[31m" + msg); // cool red color, eh?
}

/**
 * Debug logging
 */
function dlog(msg) {
	if (debug)
		Neptune.log("[Debug] " + msg);
}



// For debugging, allows you to output a nasty object into console. Neat
var utilLog = function(obj, depth) {
	console.log(util.inspect(obj, {depth: (depth!=undefined)? depth : 2}));
}

// This is our "error" handler. seeeesh
process.on('unhandledRejection', (error) => {
	console.error('=== UNHANDLED REJECTION ===');
	dlog(error.stack);
});







ogLog(" " + endTerminalCode);
ogLog();
if (!debug) {
	process.stdout.write("\x1B[0m\x1B[2;J\x1B[1;1H"); // Clear the terminal
	console.clear();
};





// Begin

Neptune.log("--== Neptune ==--");
if (!debug)
	Neptune.log("{ \x1b[1m\x1b[47m\x1b[34mProduction" + endTerminalCode + ", version: " + Neptune.Version.toString() + " }"); // Production mode
else
	Neptune.log("{ \x1b[1m\x1b[41m\x1b[33m**DEV MODE**" + endTerminalCode + ", version: " + Neptune.Version.toString() + " }"); // Developer (debug) mode

Neptune.log("] Running on \x1b[1m\x1b[34m" + process.platform);


async function promptUser(quetion) {
	function getPromise() {
		return new Promise(resolve => rl.question(question, ans => {
			rl.close();
			resolve(ans);
		}));
	}

	return await getPromise();
}

var firstRun = (fs.existsSync("./data/NeptuneConfig.json") === false);


keytar.getPassword("Neptune","ConfigKey").then(async (encryptionKey) => { // Do not start until we load that key. (also now we can use await)
	let keyFound = (encryptionKey !== null && encryptionKey !== "");
	if (encryptionKey == null)
		encryptionKey = undefined;

	
	try {
		Neptune.configManager = new ConfigurationManager("./data/configs/", (keyFound)? encryptionKey : undefined);
		Neptune.Config = Neptune.configManager.loadConfig("./data/NeptuneConfig.json", true);

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
		console.log("\u0007");
		if (err instanceof NeptuneCrypto.Errors.InvalidDecryptionKey) {
			console.error("Encryption key is invalid! Data is in a limbo state, possibly corrupted.");
			console.log("Neptune will halt. To load Neptune, please fix this error by deleting/moving the config files, fixing the encryption key, or fixing the configs.");
		} else if (err instanceof NeptuneCrypto.Errors.MissingDecryptionKey) {
			console.error("Encryption key is missing! Data is still there, but good luck decrypting it !");
			console.log("Neptune will halt. To load Neptune, please fix this error by deleting/moving the config files, fixing the encryption key, or fixing the configs.");
		} else {
			console.error("Config is completely broken!");
		}

		dlog("Encryption KEY: " + encryptionKey);

		console.log("")
		console.log(" === ::error on read Neptune config:: === ");
		console.error(err);

		console.log("");
		console.log("Stack: ");
		console.log(err.stack);

		process.exitCode = -1;
		process.exit();
	}

	if (Object.keys(Neptune.Config.entries).length < 1) {
		firstRun = true
		dlog("Config is completely empty, setting as first run...");
	}
	if (firstRun) {
		Neptune.Config.entries = {...defaults};
		dlog("First run! Generated default config file.");
		
		if (!keyFound && Neptune.Config.entries.enableFileEncryption) {
			// Set a new key
			encryptionKey = NeptuneCrypto.randomString(Neptune.Config.entries.encryptionKeyLength, 33, 220);
			dlog("Generated encryption key of length " + Neptune.Config.entries.encryptionKeyLength);
			keytar.setPassword("Neptune","ConfigKey",encryptionKey);
			Neptune.configManager.setEncryptionKey(encryptionKey);
			dlog("Encryption key loaded");
		} else if (keyFound && Neptune.Config.entries.enableFileEncryption) {
			dlog("Encryption key loaded from OS keychain");
		}
	}

	if (keyFound && Neptune.Config.entries.enableFileEncryption === false) {
		dlog("Key found, yet encryption is disabled. Odd. Running rekey to completely disable.")
		Neptune.configManager.rekey(); // Encryption is set to off, but the key is there? Make sure to decrypt everything and remove key
	}


	if (Neptune.Config.entries.enableFileEncryption && (encryptionKey !== undefined || encryptionKey !== ""))
		Neptune.log("] File encryption \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled");
	else
		Neptune.log("] File encryption \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled.");



	utilLog(Neptune.Config.entries);
	Neptune.Config.setProperty("testKey", true);
	Neptune.Config.entries["thisIsATest"] = { passed: true }
	Neptune.Config.save();

	dlog("Encryption KEY: " + encryptionKey);

	Neptune.Events.application.on('shutdown', (shutdownTimeout) => {
		Neptune.configManager.destroy(); // Save all configs!
	});


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
	Neptune.Events.application.on('shutdown', ()=>{
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
	tray.show();
	global.tray = tray; // prevents garbage collection of tray (not a fan!)


	// Main window
	const mainWindow = new (require('./Windows/mainWindow.js'))();
	// https://docs.nodegui.org/docs/api/generated/enums/widgeteventtypes
	// mainWindow.addEventListener(NodeGUI.WidgetEventTypes.Close, (abc) => console.log("close")); // redundant
	mainWindow.addEventListener(NodeGUI.WidgetEventTypes.Hide, () => {
		tActions.showMainWindow.setText("Show");
		dlog("mainWindow@Hide");
	});
	mainWindow.addEventListener(NodeGUI.WidgetEventTypes.Show, () => {
		tActions.showMainWindow.setText("Hide");
		dlog("mainWindow@Show");
	});
	mainWindow.show();









	/**
	 * _____________
	 * |           |
	 * |  Express  |
	 * |___________|
	 * 
	 */

	const app = Express();
	// app.use(bodyParser.urlencoded({ extended: true }));
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


	// Listener
	httpServer.listen(Neptune.Config.entries.port, () => {
		console.log("[Web] Express server listening on port " + Neptune.Config.entries.port);
	});






	// Command line listener


	// Server operator interaction

	var rkey = function(a) { Neptune.configManager.rekey(a).then((didIt) => console.log("Successful: " + didIt)).catch(err => console.error("Failed: " + err)); };

	var output;
	var defaultToEval = false;
	function processCMD(command) {
		try {
			if (defaultToEval) {
				try {
					output = eval(command);
					console.log("Output: ");
					utilLog(output, 2);
				} catch(err) {
					console.error(err);
				}
			}
			else {
				if (command == "exit" || command == "quit" || command == "end")
					Shutdown();
				else if (command == "showmain")
					mainWindow.show()
				else if (command.startsWith("eval ")) {
					let cmd = command.substr(5);
					try {
						output = eval(cmd);
						utilLog(output, 2);
					} catch(err) {
						console.error(err);
					}
				}
				else
					ogLog("Received input: " + command + " . (not a command)");
			}
		} catch(_) {
			// do a thing or something
		}
	}
	function prompt() {
		rl.question("", (command) => { // can't put any prompt there, breaks when someone prints to the console
			processCMD(command);
			prompt(); // the nested hell hole
		});
	}


	// Operator input
	prompt();
});