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
const debug = false; // change this later idk

/**
 * output the silly log level to console (it goes	every other level > silly, silly is the lowest priority, literal spam)
 * @type {boolean}
 */
const displaySilly = false; // 
Error.stackTraceLimit = (debug)? 8 : 4;
global.consoleVisible = false;


/** @namespace Neptune */
const Neptune = {};
/** @type {Neptune} */
global.Neptune = Neptune; // Anywhere down the chain you can use process.Neptune. Allows us to get around providing `Neptune` to everything

/**
 * Neptune version
 * @type {Version}
 */
Neptune.version = new Version(1, 0, 0, ((debug)?"debug":"release"), "R1");


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
const fs = require("node:fs")
const EventEmitter = require('node:events');
const util = require('node:util');

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
const ciao = require("@homebridge/ciao"); // MDNS broadcasts
const responder = ciao.getResponder();



// Classes
const ConfigurationManager = require('./Classes/ConfigurationManager.js');
const NeptuneConfig = require('./Classes/NeptuneConfig.js');
const ClientManager = require('./Classes/ClientManager.js');
const NotificationManager = require('./Classes/NotificationManager.js');
const { LogMan, Logger } = require('./Classes/LogMan.js');
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
			Neptune.log.silly("Clipboard data changed, pushing to clients.");
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

	var { app, httpServer } = require('./Classes/ExpressApp.js');

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

	// Listener
	try {
		httpServer.listen(Neptune.config.web.port, () => {
			Neptune.webLog.info("Express server listening on port " + Neptune.config.web.port);
		});
	} catch (error) {
		Neptune.webLog.critical("!!!Express server error!!!");
		Neptune.webLog.critical(error);
	}




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