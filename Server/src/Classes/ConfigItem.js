/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */

const Version = require('./Version');

/**
 * Config item
 */
class ConfigItem {
	/**
	 * Config file version
	 * @type {Version}
	 */
	version = new Version(1,1,0);



	/** @type {import('./ConfigurationManager')} */
	#configManager;

	/** @type {import('./LogMan').Logger} */
	log;

	/**
	 * Name of the config file
	 * @type {string}
	 */
	#fileName = "";

	/**
	 * Indicates that the file is still open
	 * @type {boolean}
	 */
	#isAlive = true;

	


	/**
	 * @param {import('./ConfigurationManager')} configManager ConfigurationManager instance
	 * @param {string} fileName The path to the config file
	 * @return {ConfigItem}
	 */
	constructor(configManager, fileName) {
		if (typeof fileName !== "string")
			throw new TypeError("fileName expected string got " + (typeof fileName).toString());

		if (!fileName.endsWith(".json"))
			fileName += ".json"

		this.#fileName = fileName;
		this.#configManager = configManager;

		this.log = Neptune.logMan.getLogger("Config-" + fileName);

		// load
		this.loadSync();
	}

	/**
	 * @param {boolean} save Save the file on close .. no reason to call this really.
	 * @return {void}
	 */
	close(save) {
		if (!this.#isAlive)
			return;

		this.log.debug("closing configuration file.");

		if (save === true)
			this.save();

		this.#isAlive = false;
		
		this.#configManager.removeConfigItemFromCache(this)
	}

	/**
	 * Reads the config file from disk and sets the contents
	 * @return {void}
	 */
	load() {
		this.read().then((data) => {
			this.fromJSON(data);
		});
	}
	/**
	 * Reads the config file from disk (synchronously) and sets the contents
	 * @return {void}
	 */
	async loadSync() {
		let data = this.readSync()
		this.fromJSON(data);
	}
	
	/**
	 * Read the configuration from disk
	 * @return {Promise<string>} Load successful
	 */
	read() {
		return new Promise((resolve, reject) => {
			this.#configManager.readFileContents(this.#fileName).then((data) => {
				resolve(data);
			}).catch(err => {
				this.log.error("Error loading, message: " + err.message, false);
				this.log.error("Stack: " + err.stack, false);
				reject(err);
			});
		});
	}
	/**
	 * Read the configuration from disk (synchronously)
	 * @return {string} Config file data
	 */
	readSync() {
		return this.#configManager.readFileContentsSync(this.#fileName);
	}
	
	/**
	 * Save the configuration
	 * @return {void}
	 */
	save() {
		if (this.#isAlive) {
			this.log.debug("Saving");
			return this.#configManager.writeFileContents(this.toString(), this.#fileName);
		}
		else {
			this.log.warn("Failed to save, config file closed and not active.", false);
			//throw new Error("Config file closed, not active.");
		}
	}
	
	/**
	 * Save the configuration
	 * @return {void}
	 */
	saveSync() {
		if (this.#isAlive) {
			this.log.silly("Saving");
			return this.#configManager.writeFileContentsSync(this.toString(), this.#fileName);
		}
		else {
			this.log.warn("Failed to save, config file closed and not active.", false);
			//throw new Error("Config file closed, not active.");
		}
	}
	

	/**
	 * Returns the configItem's file path
	 * @return {string}
	 */
	getFileName() {
		return this.#fileName;
	}
	/**
	 * Sets the configItem's file path (does not rename it!)
	 * Use rename(fileName) to rename the file
	 * @param {string} fileName
	 */
	setFileName(fileName) {
		if (typeof fileName !== "string")
			throw new TypeError("fileName expected string got " + (typeof fileName).toString());
		this.#fileName = fileName;
	}


	/**
	 * Return JSON stringifying version of this config item
	 * @return {string}
	 */
	toString() {
		let str = JSON.stringify(this.toJSON());
		this.log.silly("str: " + str)
		return (str !== undefined && str !== "")? str : "{}";
	}

	/**
	 * Get a sterilized version of this config item
	 * @return {object}
	 */
	toJSON() {
		return {
			version: this.version
		};
	}

	/**
	 * Set config properties using provided json
	 * @param {(string|object)} JSONObject JSON interpretation of the configuration 
	 * @return {void}
	 */
	fromJSON(JSONObject) {
		if (typeof JSONObject !== "string" && typeof JSONObject !== "object")
			throw new TypeError("JSONObject expected string or object got " + (typeof JSONObject).toString());
		
		if (typeof JSONObject === "string")
			JSONObject = JSON.parse(JSONObject);

		this.log.silly("fromJSON(): " + JSONObject);

		if (JSONObject["version"] !== undefined)
			this.version = JSONObject["version"];
	}


	/**
	 * Indicates that the config is still open
	 * @return {boolean}
	 */
	getIsAlive() {
		return this.#isAlive;
	}

	/**
	 * Deletes the config file from the system.
	 */
	delete() {
		this.#configManager.delete(this)
	}

	/**
	 * Renames the config file
	 * @param {string} fileName - New file name
	 */
	rename(fileName) {
		this.#configManager.rename(this, fileName, false);
	}
}

module.exports = ConfigItem;