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
const Neptune = {}






// Global behavioral changes (static stuff)
const debug = true;
Error.stackTraceLimit = 3;

Neptune.Version = new Version(0, 0, 1, ((debug)?"debug":"release"), "Skeleton");
Neptune.enableFileEncryption = true;
Neptune.encryptionKeyLength = 64;

var port = 25560;

process.Neptune = Neptune; // Anywhere down the chain you can use process.Neptune. Allows us to get around providing `Neptune` to everything





/*
 * Pull in externals here, imports, libraries
 * 
 */
// Basic
const path = require("path");

const keytar = require("keytar");

// GUI
const NodeGUI = require("@nodegui/nodegui");

// Web
const http = require('http');
const Express = require('express'); // also kinda important
const multer = require('multer');





// Logic based changes
if (debug)
	var endTerminalCode = "\x1b[0m";
else 
	var endTerminalCode = "\x1b[0m\x1b[47m\x1b[30m"; // Default colors, \x1b[47m\x1b[30m: Black text, white background

const isWin = process.platform === "win32"; // (must be true before we can use DPAPI. Do not change, okay thanks.)

Neptune.isWindows = isWin;
Neptune.debugMode = debug;

const ogLog = console.log;


// would like the below to be "cleaner" but eh

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
const util = require('util');
utilLog = function(obj, depth) {
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



/**
 * Generates a random string. Does not touch the RNG seed, recommend you set that first.
 * @param {int} len Length of random string
 * @param {int} [minChar = 33] The lower character code
 * @param {int} [maxChar = 220] The upper character code
 */
function randomString(len, minChar, maxChar) {
	var str = ""
	if (maxChar == undefined || maxChar > 220)
		maxChar = 220;
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



// Begin

Neptune.log("--== Neptune ==--");
if (!debug)
	Neptune.log("{ \x1b[1m\x1b[47m\x1b[34mProduction" + endTerminalCode + ", version: " + Neptune.Version.toString(true) + " }"); // Production mode
else
	Neptune.log("{ \x1b[1m\x1b[41m\x1b[33m**DEV MODE**" + endTerminalCode + ", version: " + Neptune.Version.toString(true) + " }"); // Developer (debug) mode

Neptune.log("] Running on \x1b[1m\x1b[34m" + process.platform);


keytar.getPassword("Neptune","ConfigKey").then((encryptionKey) => { // Do not start until we load that key.
	let keyFound = (encryptionKey !== undefined && encryptionKey !== "");
	if (keyFound && Neptune.enableFileEncryption) {
		// Set a new key
		encryptionKey = randomString(Neptune.encryptionKeyLength);
		keytar.setPassword("Neptune","ConfigKey",encryptionKey); // error catching (we can't save this key, what's the point ??)
	}

	if (Neptune.enableFileEncryption && (encryptionKey !== undefined || encryptionKey !== ""))
		Neptune.log("] File encryption \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled");
	else
		Neptune.log("] File encryption \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled.");

	if (!keyFound) {
		dlog("Encryption key not set | Neptune.enableFileEncryption == " + Neptune.enableFileEncryption);
		if (Neptune.enableFileEncryption)
			dlog("generated key of length " + Neptune.encryptionKeyLength);
	} else
		dlog("Encryption key loaded from OS keychain");

	Neptune.configurationManager = new (require('./Classes/ConfigurationManager.js'))("./data/", encryptionKey); // The data directory
	dlog("Configuration manager loaded | base: ./data/"); // probably should make that dynamic


	// /^v/^\v/^\v/^\v/^\v^\
	console.log("\n");




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
	// https://docs.nodegui.org/docs/api/generated/classes/qsystemtrayicon/
	const menu = new NodeGUI.QMenu();
	const tray = new NodeGUI.QSystemTrayIcon();
	tray.setIcon(ResourceManager.ApplicationIcon);
	tray.setToolTip("Neptune Server running");
	tray.addEventListener('clicked',(checked)=>console.log("clicked"));
	tray.show();
	global.tray = tray; // prevents garbage collection of tray (not a fan!)


	// Main window
	const mainWindow = new (require('./Windows/mainWindow.js'))();
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
	httpServer.listen(port, () => {
		console.log("[Web] Express server listening on port " + port);
	});






	// Command line listener
	Shutdown = async function() {
		console.log("\nShutting down");
		process.exit(0);
	}


	// Server operator interaction

	const readline = require("readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	function processCMD(command) {
		try {
			if (command == "exit" || command == "quit" || command == "end")
				Shutdown();
			else if (command == "showmain")
				mainWindow.show()
			else
				ogLog("Received input: " + command + " . (not a command)");
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

	rl.on("close", function () {
		Shutdown();
	});

	// Operator input
	prompt();
});