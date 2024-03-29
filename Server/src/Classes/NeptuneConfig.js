/**
 *			_	_ 
 *		 | \| |
 *		 | .` |
 *		 |_|\_|eptune
 *
 *		Capstone Project 2022
 * 
 *		NeptuneConfig is for documentation, really. Representation of the NeptuneConfig file, extends ConfigItem.
 * */

const ConfigItem = require('./ConfigItem.js');
const crypto = require("node:crypto");
const Version = require('./Version.js');

const os = require("node:os");
const ConnectionManager = require('./ConnectionManager.js');
const EventEmitter = require('node:events');


/**
 * Config item
 */
class NeptuneConfig extends ConfigItem {

	/**
	 * Configuration version, so if we introduce any configuration updates that break older versions we can convert them.
	 * @type {Version}
	 */
	configVersion = new Version(1,1,0);

	/**
	 * First run?
	 * @type {boolean}
	 */
	firstRun = false;

	/**
	 * Encryption settings
	 * @typedef {object} EncryptionDescriptor
	 * @property {boolean} enabled - Whether or not encryption is enabled (and we'll encrypt files on save)
	 * @property {boolean} active - Unused reserved property.
	 * @property {number} newKeyLength - Length newly generated encryption keys should be (keys we create)
	 */

	/**
	 * Encryption settings
	 * @type {EncryptionDescriptor}
	 */
	encryption = {
		enabled: false,
		active: false,
		newKeyLength: 64
	}


	/**
	 * @typedef {object} WebDescriptor
	 * @property {number} port - Port the web server is listening on 
	 */

	/**
	 * Web (express) server settings
	 * @type {WebDescriptor}
	 */
	web = {
		port: 25560,
	}

	/**
	 * Array of clientIds saved
	 * @type {string[]}
	 */
	clients = [];

	/**
	 * This is added onto the configuration directory (which is set in index.js to be ./data/ - so this would be ./data/clients/)
	 * @type {string}
	 */
	clientDirectory = "clients/";


	/**
	 * 
	 * @typedef {object} NeptuneApplicationSettings
	 * @property {boolean} [requireSaveButton=false] - Whether or not the save button is visible and required in the MainWindow. If false, settings are saved when changed.
	 * @property {boolean} [advertiseNeptune=true] - Whether or not to use MDNS to advertise (broadcast) this server on to the network. Doing so allows client devices to pair without entering an IP.
	 * @property {boolean} [startMinimized=false] - Whether the main window should not be displayed on startup
	 */

	/**
	 * This is only used in debugging / development roles
	 * Think of it as advance tunables
	 * @type {NeptuneApplicationSettings}
	 */
	applicationSettings = {
		requireSaveButton: false,
		advertiseNeptune: true,
		startMinimized: false,
	}


	/**
	 * Unique server Id
	 * @type {string}
	 */
	serverId = crypto.randomUUID();


	/**
	 * Friendly device name
	 * @type {string}
	 */
	friendlyName = "";


	eventEmitter = new EventEmitter();

	save() {
		super.save();
		this.eventEmitter.emit("updated");
	}

	saveSync() {
		super.saveSync();
		this.eventEmitter.emit("updated");
	}


	#getComputerName() {
		switch (process.platform) {
			case "win32":
				return process.env.COMPUTERNAME;
			case "darwin":
				return cp.execSync("scutil --get ComputerName").toString().trim();
			case "linux":
				const prettyname = cp.execSync("hostnamectl --pretty").toString().trim();
				return prettyname === "" ? os.hostname() : prettyname;
			default:
				return os.hostname();
		}
	}

	/**
	 * @param {ConnectionManager} configManager ConfigurationManager instance
	 * @param {string} fileName The path to the config file
	 * @return {NeptuneConfig}
	 */
	constructor(configManager, fileName) {
		super(configManager, fileName);

		if (this.firstRun || this.friendlyName == "")
			this.friendlyName = this.#getComputerName();

		this.loadSync();
	}

	/**
	 * @inheritdoc
	 */
	toJSON() {
		let JSONObject = super.toJSON();
		JSONObject["serverId"] = this.serverId;
		JSONObject["friendlyName"] = this.friendlyName;
		JSONObject["encryption"] = this.encryption;
		JSONObject["web"] = this.web;
		JSONObject["clients"] = this.clients;
		JSONObject["clientDirectory"] = this.clientDirectory;
		JSONObject["applicationSettings"] = this.applicationSettings;

		return JSONObject;
	}

	/**
	 * @inheritdoc
	 */
	fromJSON(JSONObject) {
		if (typeof JSONObject !== "string" && typeof JSONObject !== "object")
			throw new TypeError("JSONObject expected string or object got " + (typeof JSONObject).toString());
		
		if (typeof JSONObject === "string")
			JSONObject = JSON.parse(JSONObject);

		if (JSONObject["version"] !== undefined)
			this.version = JSONObject["version"];

		if (JSONObject["serverId"] !== undefined)
			this.serverId = JSONObject["serverId"];
		if (JSONObject["friendlyName"] !== undefined)
			this.friendlyName = JSONObject["friendlyName"];

		if (JSONObject["encryption"] !== undefined)
			this.encryption = JSONObject["encryption"];
		if (JSONObject["web"] !== undefined)
			this.web = JSONObject["web"];
		if (JSONObject["clients"] !== undefined)
			this.clients = JSONObject["clients"];
		if (JSONObject["clientDirectory"] !== undefined)
			this.clientDirectory = JSONObject["clientDirectory"];

		if (JSONObject["applicationSettings"] !== undefined)
			this.applicationSettings = JSONObject["applicationSettings"];
	}
}

module.exports = NeptuneConfig;