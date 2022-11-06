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


var port = 25560;

const useDPAPI = false; // Toggles use of Window's Data Protection API. DPAPI is used to protect configuration files, account data and more.


process.Neptune = Neptune; // Anywhere down the chain you can use process.Neptune. Allows us to get around providing `Neptune` to everything





/*
 * Pull in externals here, imports, libraries
 * 
 */
// Basic
const path = require("path");

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




// Used "globally"
const ApplicationIcon = new NodeGUI.QIcon(path.resolve(__dirname, "../src/Support/coconut.jpg"));


const qApp = NodeGUI.QApplication.instance();
qApp.setQuitOnLastWindowClosed(false); // required so that app doesn't close if we close all windows.


// Tray icon
const menu = new NodeGUI.QMenu();


// https://docs.nodegui.org/docs/api/generated/classes/qsystemtrayicon/
const tray = new NodeGUI.QSystemTrayIcon();
tray.setIcon(ApplicationIcon);
tray.setToolTip("Neptune Server running");
tray.addEventListener('clicked',(checked)=>console.log("clicked"));

tray.show();



global.tray = tray; // prevents garbage collection of tray




const mainWindow = new NodeGUI.QMainWindow();
mainWindow.setWindowTitle('Neptune');
mainWindow.setWindowIcon(ApplicationIcon);
mainWindow.resize(400, 200);
mainWindow.addEventListener(NodeGUI.WidgetEventTypes.Close, () => {
	console.log('Window closed.')
});

const centralWidget = new NodeGUI.QWidget();
centralWidget.setObjectName("myroot");
const rootLayout = new NodeGUI.FlexLayout();
centralWidget.setLayout(rootLayout);

const label = new NodeGUI.QLabel();
label.setInlineStyle("font-size: 16px; font-weight: bold;");
label.setText("Project Neptune");

rootLayout.addWidget(label);
mainWindow.setCentralWidget(centralWidget);
mainWindow.setStyleSheet(
  `
    #myroot {
      background-color: #009688;
    }
  `
);
mainWindow.show();

global.mainWindow = mainWindow;




// Express
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