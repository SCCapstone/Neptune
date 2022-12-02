/**
 *	  _  _ 
 *	 | \| |
 *	 | .` |
 *	 |_|\_|eptune
 *
 *	  Capstone Project 2022
 * 
 * 	  Logging module
 */

const EventEmitter = require("node:events");
const fs = require("node:fs");
const Util = require("node:util");

class ExtensibleFunction extends Function { 
  constructor(f) {						  
	return Object.setPrototypeOf(f, new.target.prototype);
  }
}


/**
 * Provides an easy to use logging functionality
 * 
 * Outputs to the console and to a file (if enabled)
 * 
 * This class is to be used as a manager, represents a log. To log to that log, use `getLogger` to return a `Logger` that can be used to actual log data.
 * 
 * ```javascript
 * const LogMan = require('logman');
 * 
 * var myLog = LogMan("application");
 * var securityLogger = myLog.getLogger("SecurityObj");
 * var miscLogger = myLog.getLogger("Misc");
 * 
 * securityLogger.info("Security looking good!"); // Outputs: [Security][Info] Security looking good!
 * miscLogger.warn("Something went wrong!"); // Outputs: [Misc][Warn] Something went wrong!
 * ```
 * 
 * You can log any string, but note if you pass an object we'll _try_ our best to print it using `Util.inspect`
 * 
 * 
 * Close event tells you this logger is done.
 * 
 * Events for each level, such as `logMan.on('info', (sectionName, message) => console.log);`
 * 
 * Or for generic logs: `logMan.on('log', (level, sectionName, message) => console.log);`
 * 
 * When a call to getLogger() is made: `logMan.on('newLogger', (loggerName) => console.log);`
 * 
 */
class LogMan extends EventEmitter {
	/**
	 * The name of this log (application, administration, security)
	 * @type {string}
	 */
	#logName;
	get logName() {
		return this.#logName;
	}

	/**
	 * Write stream that writes to a file.
	 * @type {fs.WriteStream}
	 */
	#logFile;

	/**
	 * Name of the log file (dynamic, made at runtime, logFolde + "/" + logName + ".log")
	 * @type {string}
	 */
	#logFileName;

	/**
	 * Whether the log is open (ready to receive data) or closed (not available). Default false, but when `Logger.close()` is called and the `logFile` is no longer open, this flips to `true`. 
	 * @type {boolean}
	 */
	#closed = false;
	get closed() {
		return this.#closed || this.#logFile.closed;
	}

	get logFileName() {
		return this.#logFileName;
	}

	/**
	 * String of text at the front of ALL messages.
	 * 
	 * You can include %date% for the date and %time% for the time
	 * 
	 * %logName% for the name of this log
	 * 
	 * `<consolePrefix><consolePrefixes.level> message <consoleSufixes.level><consoleSufix>`
	 * @type {string}
	 */
	consolePrefix = "";
	
	/**
	 * String of text at the end of ALL messages (reset color)
	 * 
	 * `<consolePrefix><consolePrefixes.level> message <consoleSufixes.level><consoleSufix>`
	 * @type {string}
	 */
	consoleSufix = "\x1b[0m";


	/**
	 * New line character in log file
	 * 
	 * `\r\n` for Win32
	 * 
	 * `\n` for not Win32
	 */
	fileLineTerminator = (process.platform === "win32")? "\r\n" : "\n";


	/**
	 * @typedef {object} logLevelsString
	 * @property {string} critical
	 * @property {string} error
	 * @property {string} warn
	 * @property {string} info
	 * @property {string} http
	 * @property {string} verbose
	 * @property {string} debug
	 * @property {string} silly
	 */

	/**
	 * @typedef {object} logLevelsBoolean
	 * @property {boolean} critical
	 * @property {boolean} error
	 * @property {boolean} warn
	 * @property {boolean} info
	 * @property {boolean} http
	 * @property {boolean} verbose
	 * @property {boolean} debug
	 * @property {boolean} silly
	 */

	/**
	 * String in front of messages logged to the console
	 * 
	 * `<consolePrefix><consolePrefixes.level> message <consoleSufixes.level><consoleSufix>`
	 * @type {logLevelsString}
	 */
	consolePrefixes = {
		critical: "\x1b[91m", // Red, but bright
		error: "\x1b[31m", // Red
		warn: "\x1b[31m", // Red
		info: "",
		http: "",
		verbose: "",
		debug: "",
		silly: "",
	}
	
	/**
	 * String at the end of messages logged to the console
	 * 
	 * `<consolePrefix><consolePrefixes.level> message <consoleSufixes.level><consoleSufix>`
	 * @type {logLevelsString}
	 */
	consoleSufixes = {
		critical: "",
		error: "",
		warn: "",
		info: "",
		http: "",
		verbose: "",
		debug: "",
		silly: "",
	}

	/**
	 * Which levels to output to the console, (default is all, except debug and silly if `process.env.NODE_ENV !== "development"`)
	 * @type {logLevelsBoolean}
	 */
	consoleDisplayLevel = {
		critical: true,
		error: true,
		warn: true,
		info: true,
		http: true,
		verbose: true,
		debug: (process.env.NODE_ENV === "development")? true : false,
		silly: (process.env.NODE_ENV === "development")? true : false,
	}

	/**
	 * Which levels to make a ding sound on (output bell character at the end of the console suffix)
	 * @type {logLevelsBoolean}
	 */
	consoleBeepOnLevel = {
		critical: true,
		error: false,
		warn: false,
		info: false,
		http: false,
		verbose: false,
		debug: false,
		silly: false,
	}


	/**
	 * String of text at the front of ALL messages written to FILE
	 * 
	 * You can include %date% for the date and %time% for the time
	 * 
	 * %logName% for the name of this log
	 * 
	 * `<filePrefix><filePrefixes.level> message <fileSufixes.level><fileSufix><fileLineTerminator>`
	 * @type {string}
	 */
	filePrefix = "[%date%T%time%]";
	
	/**
	 * String of text at the end of ALL messages written to FILE
	 * 
	 * `<filePrefix><filePrefixes.level> message <fileSufixes.level><fileSufix><fileLineTerminator>`
	 * @type {string}
	 */
	fileSufix = "";

	/**
	 * String in front of messages written to the file
	 * 
	 * `<filePrefix><filePrefixes.level> message <fileSufixes.level><fileSufix><fileLineTerminator>`
	 * @type {logLevelsString}
	 */
	filePrefixes = {
		critical: "",
		error: "",
		warn: "",
		info: "",
		http: "",
		verbose: "",
		debug: "",
		silly: "",
	}
	
	/**
	 * String at the end of messages written to the file
	 * 
	 * `<filePrefix><filePrefixes.level> message <fileSufixes.level><fileSufix><fileLineTerminator>`
	 * @type {logLevelsString}
	 */
	fileSufixes = {
		critical: "",
		error: "",
		warn: "",
		info: "",
		http: "",
		verbose: "",
		debug: "",
		silly: "",
	}

	/**
	 * Which log levels are written to the log file (default is all, except debug and silly if `process.env.NODE_ENV !== "development"`)
	 * @type {logLevelsBoolean}
	 */
	fileWriteLevel = {
		critical: true,
		error: true,
		warn: true,
		info: true,
		http: true,
		verbose: true,
		debug: true,
		silly: true,
	}


	/**
	 * Whether we output to the console. True by default
	 * @type {boolean}
	 */
	outputToConsole = true;

	/**
	 * Whether we output to the console. True by default
	 * @type {boolean}
	 */
	outputToFile = true;

	/**
	 * When logging objects, this dictates how deep we render the object. Default 2
	 * @type {number}
	 */
	objectRenderDepth = 2;


	/**
	 * @typedef {object} ConstructorOptions
	 * @property {logLevelsString} [consolePrefixes] - String in front of messages logged to the console
	 * @property {logLevelsString} [consoleSufixes] - String at the end of messages logged to the console
	 * @property {string} [consolePrefix=""] - String of text at the front of ALL messages.
	 * @property {string} [consoleSufix="\x1b[0m"] - String of text at the end of ALL messages (reset color)
	 * 
	 * @property {logLevelsString} [filePrefixes] - String in front of messages written to file
	 * @property {logLevelsString} [fileSufixes] - String at the end of messages written to file
	 * @property {string} [filePrefix="[%date%-%time%]"] - String of text at the front of ALL messages written to file
	 * @property {string} [fileSufix=""] - String of text at the end of ALL messages written to file
	 * 
	 * @property {logLevelsBoolean} [consoleDisplayLevel] - Which levels to output to the console, (default is all, except debug and silly if `process.env.NODE_ENV !== "development"`)
	 * @property {logLevelsBoolean} [consoleBeepOnLevel] - Which levels to make a ding sound on (output bell character)
	 * @property {logLevelsBoolean} [fileWriteLevel] - Which log levels are written to the log file (default is all)
	 * 
	 * @property {string} [fileLineTerminator="\r\n"] - New line character, sets to appropriate value based on platform.
	 * @property {boolean} [outputToConsole=true] - Output to the console
	 * @property {boolean} [outputToFile=true] - Output to the file
	 * 
	 * @property {number} [objectRenderDepth=2] - When logging objects, this dictates how deep we render the object. Default 2
	 * @property {boolean} [cleanLog=false] - Delete any log file
	 */

	/**
	 * Constructor, provide the folder containing the logs and name of this log.
	 * 
	 * Logs are saved as: logFolder/logName.log
	 * 
	 * @param {string} logName
	 * @param {string} [logFolder="."]
	 * @param {ConstructorOptions} [options]
	 */
	constructor(logName, logFolder, options) {
		super();

		if (typeof logName !== "string")
			throw new TypeError("logName expected string got " + (typeof logName).toString());

		if (logFolder === undefined)
			logFolder = ".";
		if (typeof logFolder !== "string")
			throw new TypeError("logFolder expected string got " + (typeof logFolder).toString());

		this.#logFileName = logFolder + "/" + logName + ".log";

		// Make log directory
		if (fs.existsSync(logFolder) === true) { // Exists
			if (!fs.lstatSync(logFolder).isDirectory()) { // Is not dir
				fs.rmSync(logFolder);
				fs.mkdirSync(logFolder);
			}
		} else { // Does not exist
			fs.mkdirSync(logFolder);
		}

		let flag = 'a';
		if (options !== undefined)
			if (options.cleanLog === true)
				flag = 'w';
		this.#logFile = fs.createWriteStream(this.#logFileName, {flags: flag});

		// Set options
		if (options !== undefined && typeof options === "object") {
			if (options.consolePrefixes !== undefined) {
				for (var [key, value] of Object.entries(options.consolePrefixes)) {
					if (typeof value === "string" && this.consolePrefixes[key] !== undefined)
						this.consolePrefixes[key] = value; // Only add strings, and if valid level
				}
			}
			if (options.consoleSufixes !== undefined) {
				for (var [key, value] of Object.entries(options.consoleSufixes)) {
					if (typeof value === "string" && this.consoleSufixes[key] !== undefined)
						this.consoleSufixes[key] = value; // Only add strings, and if valid level
				}
			}

			if (options.filePrefixes !== undefined) {
				for (var [key, value] of Object.entries(options.filePrefixes)) {
					if (typeof value === "string" && this.filePrefixes[key] !== undefined)
						this.filePrefixes[key] = value; // Only add strings, and if valid level
				}
			}
			if (options.fileSufixes !== undefined) {
				for (var [key, value] of Object.entries(options.fileSufixes)) {
					if (typeof value === "string" && this.fileSufixes[key] !== undefined)
						this.fileSufixes[key] = value; // Only add strings, and if valid level
				}
			}

			// Displayable / write-able
			if (options.consoleDisplayLevel !== undefined) {
				for (var [key, value] of Object.entries(options.consoleDisplayLevel)) {
					if (typeof value === "boolean" && this.consoleDisplayLevel[key] !== undefined)
						this.consoleDisplayLevel[key] = value; // Only add boolean, and if valid level
				}
			}
			if (options.fileWriteLevel !== undefined) {
				for (var [key, value] of Object.entries(options.fileWriteLevel)) {
					if (typeof value === "boolean" && this.fileWriteLevel[key] !== undefined)
						this.fileWriteLevel[key] = value; // Only add boolean, and if valid level
				}
			}

			// Beep
			if (options.consoleBeepOnLevel !== undefined) {
				for (var [key, value] of Object.entries(options.consoleBeepOnLevel)) {
					if (typeof value === "boolean" && this.consoleBeepOnLevel[key] !== undefined)
						this.consoleBeepOnLevel[key] = value; // Only add boolean, and if valid level
				}
			}

			if (typeof options.consoleSufix === "string")
				this.consoleSufix = options.consoleSufix;
			if (typeof options.consolePrefix === "string")
				this.consolePrefix = options.consolePrefix;

			if (typeof options.fileLineTerminator === "boolean")
				this.fileLineTerminator = options.fileLineTerminator;
			if (typeof options.outputToConsole === "boolean")
				this.outputToConsole = options.outputToConsole;
			if (typeof options.outputToFile === "boolean")
				this.outputToFile = options.outputToFile;
		}

		if (this.#logFile.writable) {
			let dateTime = new Date();
			let date = dateTime.toISOString().split('T')[0];
			let time = dateTime.toISOString().split('T')[1].split('.')[0]; // very cool

			this.#logFile.write(this.fileLineTerminator + this.fileLineTerminator + "--- Logger {" + logName + "} started @" + time + " on " + date + " ---" + this.fileLineTerminator);
		}
	}

	/**
	 * Outputs the message to the console (if enabled) and file (if enabled)
	 * @fires LogMan#log
	 * @param {string} [sectionName] - Name of the Logger logging this. If undefined we'll ignore it
	 * @param {string} - level The level of this data (info, warn, etc)
	 * @param {any} msg - Message being logged. Wish it was a string, but we'll try our best.
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	#log(sectionName, level, msg, outputToConsole) {
		if (this.#closed === true)
			throw new Error("Log is closed. (Someone called Logger.close())");

		if (typeof sectionName !== "string" && sectionName !== undefined)
			throw new TypeError("sectionName expected string got " + (typeof sectionName).toString());
		if (typeof level !== "string")
			throw new TypeError("level expected string got " + (typeof level).toString());
		if (typeof msg === "object") {
			msg = Util.inspect(msg, {depth: (this.objectRenderDepth!=undefined)? this.objectRenderDepth : 2});
		} else if (typeof msg !== "string") {
			msg = (new String(msg)).toString();
		}

		outputToConsole = (outputToConsole===false)? false : true; // Set to false if false, true if literally anything else.

		let l = level.toLowerCase();
		let dateTime = new Date();
		let date = dateTime.toISOString().split('T')[0];
		let time = dateTime.toISOString().split('T')[1].split('.')[0]; // very cool
		
		var consolePrefix = this.consolePrefix.toString();
		if (this.consolePrefixes[l] !== undefined)
			consolePrefix += this.consolePrefixes[l].toString();
		consolePrefix = consolePrefix.replace("%date%", date)
		consolePrefix = consolePrefix.replace("%time%", time)
		consolePrefix = consolePrefix.replace("%logName%", this.#logName);

		var message = ((sectionName!==undefined)? ("[" + sectionName + "]") : "") + "[" + level + "] " + msg;				// Only display section name if defined
		var messageFile = "[" + level + "]" + ((sectionName!==undefined)? ("[" + sectionName + "] ") : " ") + msg; 	// Only display section name if defined
		// File: [Debug][Section] msg... || console: [Section][Debug] msg ...

		var consoleSufix = "";
		if (this.consoleSufixes[l] !== undefined)
			consoleSufix += this.consoleSufixes[l].toString();
		consoleSufix += this.consoleSufix.toString();

		if (this.outputToConsole == true && outputToConsole === true) {
			if (this.consoleBeepOnLevel[l] === true) {
				consoleSufix += "\u0007";
			}
			if (this.consoleDisplayLevel[l] === true) { // Output?
				if (l == "critical" || l == "error")
					console.error(consolePrefix + message + consoleSufix);
				else if (l == "warn")
					console.warn(consolePrefix + message + consoleSufix);
				else
					console.log(consolePrefix + message + consoleSufix);
			}
		}

		if (this.outputToFile == true) {
			if (!this.#logFile.closed && this.fileWriteLevel[l] === true) {
				var filePrefix = this.filePrefix.toString();
				if (this.filePrefixes[l] !== undefined)
					filePrefix += this.filePrefixes[l].toString();
				
				filePrefix = filePrefix.replace("%date%", date)
				filePrefix = filePrefix.replace("%time%", time)
				filePrefix = filePrefix.replace("%logName%", this.#logName);

				var fileSufix = "";
				if (this.fileSufixes[l] !== undefined)
					fileSufix += this.fileSufixes[l].toString();
				fileSufix += this.fileSufix.toString();
				// the regex strips any ansi stuff
				this.#logFile.write(filePrefix + messageFile.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "") + fileSufix + this.fileLineTerminator);
			}
		}

		//this.emit(l, sectionName, msg.toString()); // If you had the error type it would crash the whole thing!
		this.emit('log', l, sectionName, msg.toString());
	}

	/**
	 * Closes the log file, no logging is permitted to file OR console after this. You can reopen via `Logger.reopen()`
	 * Only works if `this.outputToFile` is true.
	 * @fires LogMan#close
	 */
	close() {
		let dateTime = new Date();
		let date = dateTime.toISOString().split('T')[0];
		let time = dateTime.toISOString().split('T')[1].split('.')[0]; // very cool
		this.#logFile.write("--- Logger {" + this.#logName + "} ended @" + time + " on " + date + " ---" + this.fileLineTerminator);
		this.#logFile.end();
		this.#closed = true;
		this.emit("close");
	}

	/**
	 * Reopens the log files. Permits logging if previously closed.
	 */
	open() {
		if (this.closed) {
			if (this.#logFile.writable) {
				let dateTime = new Date();
				let date = dateTime.toISOString().split('T')[0];
				let time = dateTime.toISOString().split('T')[1].split('.')[0]; // very cool

				this.#logFile.write("--- Logger {" + logName + "} reopened @" + time + " on " + date + " ---" + this.fileLineTerminator);
				this.#closed = false;
			}
		}
	}
	/**
	 * Gives you a logger object so you can actually log data out.
	 * @fires Logger#newLogger
	 * 
	 * @param {string} loggerName - Name of this logger (section, class)
	 * @param {boolean} [hideSectionName] - Allows you to hide the name of this logger
	 * 
	 * @return {Logger} Logger instance
	 */
	getLogger(loggerName, hideSectionName) {
		this.emit("newLogger", loggerName);
		return new Logger((name, level, msg, printOnConsole) => { 
			this.#log((hideSectionName===true)? undefined : name, level, msg, printOnConsole);
		}, loggerName);
	}
}

/**
 * Class used to actual log data. Can treat an instance like a function, will just log as info.
 * Levels include: (RFC5424)
 * 
 * error: `0`, warn: `1`, info: `2`, http: `3`, verbose: `4`, debug: `5`, silly: `6`
 */
class Logger extends ExtensibleFunction {
	/**
	 * Logger name (section name)
	 * @type {string}
	 */
	#name;

	/**
	 * Parent log function
	 * @type {function}
	 */
	#logManLogFunction

	#options = {
		objectRenderDepth: 2,
	};

	/**
	 * Constructor, pass the logging function and log name
	 * @param {function} logManLogFunction Function called when we want to log data
	 * @param {string} logName Name of this log (section) 
	 */
	constructor(logManLogFunction, logName, options) {
		super(function(msg, outputToConsole) {
			// `this` isn't a thing here, we're in the shadow realm. Work around:
			if (typeof msg === "object") {
				var uO = {depth: 2}
				if (options !== undefined && typeof options === "object")
					if (options.objectRenderDepth !== undefined)
						uO.depth = options.objectRenderDepth;

				msg = Util.inspect(msg, uO);
			} else if (typeof msg !== "string") {
				msg = (new String(msg)).toString();
			}
			outputToConsole = (outputToConsole===false)? false : true; // Set to false if false, true if literally anything else.

			logManLogFunction(logName, "Info", msg, outputToConsole);
		});
		

		if (typeof logManLogFunction !== "function")
			throw new TypeError("logManLogFunction expected function, got " + (typeof logManLogFunction).toString() )
		if (typeof logName !== "string")
			throw new TypeError("logName expected string got " + (typeof logName).toString());

		if (options !== undefined && typeof options === "object")
			if (options.objectRenderDepth !== undefined)
				this.#options.objectRenderDepth = options.objectRenderDepth

		this.#logManLogFunction = logManLogFunction;
		this.#name = logName;

		//return this.bind(this);
	}

	/**
	 * What actually does the logging* sorta, we pass it up to logMan
	 * @param {string} - level The level of this data (info, warn, etc)
	 * @param {any} msg - Message being logged. Wish it was a string, but we'll try our best.
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	#log(level, msg, outputToConsole) {
		if (typeof msg === "object") {
			msg = Util.inspect(msg, {depth: (this.#options.objectRenderDepth!=undefined)? this.#options.objectRenderDepth : 2});
		} else if (typeof msg !== "string") {
			msg = (new String(msg)).toString();
		}
		outputToConsole = (outputToConsole===false)? false : true; // Set to false if false, true if literally anything else.

		this.#logManLogFunction(this.#name, level, msg, outputToConsole);
	}

	/**
	 * Log data at level error
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	critical(msg, outputToConsole) {
		this.#log("Critical", msg, outputToConsole);
	}
	/**
	 * Log data at level error
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	error(msg, outputToConsole) {
		this.#log("Error", msg, outputToConsole);
	}
	/**
	 * Log data at level warn
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	warn(msg, outputToConsole) {
		this.#log("Warn", msg, outputToConsole);
	}
	/**
	 * Log data at level info
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	info(msg, outputToConsole) {
		this.#log("Info", msg, outputToConsole);
	}
	/**
	 * Log data at level http
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	http(msg, outputToConsole) {
		this.#log("HTTP", msg, outputToConsole);
	}
	/**
	 * Log data at level verbose
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	verbose(msg, outputToConsole) {
		this.#log("Verbose", msg, outputToConsole);
	}
	/**
	 * Log data at level debug
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	debug(msg, outputToConsole) {
		this.#log("Debug", msg, outputToConsole);
	}
	/**
	 * Log data at level silly
	 * @param {(string|object|any)} msg - Message / data you wish to log
	 * @param {boolean} [outputToConsole=true] - Output this particular message to the console. Defaults to true
	 */
	silly(msg, outputToConsole) {
		this.#log("Silly", msg, outputToConsole);
	}
}

module.exports = {
	LogMan: LogMan,
	Logger: Logger
};