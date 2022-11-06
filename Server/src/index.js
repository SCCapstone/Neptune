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



const useDPAPI = false; // Toggles use of Window's Data Protection API. DPAPI is used to protect configuration files, account data and more.


process.Neptune = Neptune; // Anywhere down the chain you can use process.Neptune. Allows us to get around providing `Neptune` to everything





/*
 * Pull in externals here, imports, libraries
 * 
 */

const Express = require('express'); // also kinda important






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
	process.stdout.write('\033c'); // Clear the terminal
	console.clear();
};




// Begin

Neptune.log("--== Neptune ==--");
if (!debug)
	Neptune.log("{ \x1b[1m\x1b[47m\x1b[34mProduction" + endTerminalCode + ", version: " + Neptune.Version.toString(true) + " }"); // Production mode
else
	Neptune.log("{ \x1b[1m\x1b[41m\x1b[33m**DEV MODE**" + endTerminalCode + ", version: " + Neptune.Version.toString(true) + " }"); // Developer (debug) mode

Neptune.log("] Running on \x1b[1m\x1b[34m" + process.platform);
if (isWin) {
	if (useDPAPI)
		Neptune.log("] DPAPI \x1b[1m\x1b[32mACTIVE" + endTerminalCode + ", file security enabled"); // DPAPI active
	else
		Neptune.log("] DPAPI \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled."); // DPAPI not-active (disabled)
} else
	Neptune.log("] DPAPI \x1b[1m\x1b[33mDEACTIVE" + endTerminalCode + ", file security disabled."); // DPAPI not-active (unsupported platform)

// /^v/^\v/^\v/^\v/^\v^\
console.log("\n");





// const mainWindow = new NodeGUI.QMainWindow();

// mainWindow.show();

const {
  QMainWindow,
  QWidget,
  QLabel,
  FlexLayout
} = require("@nodegui/nodegui");

const win = new QMainWindow();
win.setWindowTitle('Neptune');
win.resize(400, 200);

const centralWidget = new QWidget();
centralWidget.setObjectName("myroot");
const rootLayout = new FlexLayout();
centralWidget.setLayout(rootLayout);

const label = new QLabel();
label.setInlineStyle("font-size: 16px; font-weight: bold;");
label.setText("Project Neptune");

rootLayout.addWidget(label);
win.setCentralWidget(centralWidget);
win.setStyleSheet(
  `
    #myroot {
      background-color: #009688;
    }
  `
);
win.show();

global.win = win;