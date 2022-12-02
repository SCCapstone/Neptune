/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *		Capstone Project 2022
 * 
 *		NeptuneConfig is for documentation, really. Representation of the NeptuneConfig file, extends ConfigItem.
 * */

const ConfigItem = require('./ConfigItem.js');


/**
 * Config item
 */
class NeptuneConfig extends ConfigItem {

	/**
	 * Configuration version, so if we introduce any configuration updates that break older versions we can convert them.
	 * @type {number}
	 */
	configVersion = 1.1;

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
	 * This is only used in debugging / development roles
	 * Think of it as advance tunables
	 * @type {object}
	 */
	applicationSettings = {

	}



	/**
	 * @param {string} filePath The path to the config file
	 * @return {ConfigItem}
	 */
	constructor(configManager, filePath) {
		super(configManager, filePath);
	
		// load
		this.load();
	}

	/**
	 * Sets the entries property with the config items
	 */
	#setEntries() {
		this.entries["configVersion"] = this.configVersion;
		this.entries["encryption"] = this.encryption;
		this.entries["web"] = this.web;
		this.entries["clients"] = this.clients;
		this.entries["clientDirectory"] = this.clientDirectory;
	}



	/**
	 * Reload the configuration from disk
	 * @return {Promise<boolean>} Load successful
	 */
	load() {
		super.loadSync();

		// Hand move the entries over
		if (this.entries !== undefined) {
			for (var [key, value] of Object.entries(this.entries)) {
				if (this[key] !== undefined)
					this[key] = value;
			}
		}
	}

	loadSync() {
		this.load();
	}
	
	/**
	 * Save the configuration
	 * @return {void}
	 */
	save() {
		this.#setEntries();
		super.save();
	}
	

	/**
	 * Get a config value
	 * @param {string} key The configuration item to get
	 * @return {object}
	 */
	getProperty(key) {
		if (typeof key !== "string")
			throw new TypeError("key expected string got " + (typeof key).toString());

		return this[key];
	}
	
	/**
	 * @param {string} key Configuration item to save
	 * @param {any} value Value to set the item to
	 * @return {void}
	 */
	setProperty(key, value) {
		if (typeof key !== "string")
			throw new TypeError("key expected string got " + (typeof key).toString());

		this[key] = value;
		this.save();
	}

	/**
	 * @return {JSON}
	 */
	toJSON() {
		this.#setEntries();
		return { ... this.entries };
	}

	/**
	 * @param {JSON} JSONObject JSON interpretation of the configuration 
	 */
	setJSON(JSONObject) {
		this.entries = { ... JSONObject };
		// Hand move the entries over
		if (this.entries !== undefined) {
			for (var [key, value] of Object.entries(this.entries)) {
				if (this[key] !== undefined)
					this[key] = value;
			}
		}
	}
}

module.exports = NeptuneConfig;