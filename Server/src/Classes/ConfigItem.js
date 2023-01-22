/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */

/**
 * Config item
 */
class ConfigItem {

	/**
	 * Cached configurations
	 * @type {object}
	 */
	entries = {};


	/**
	 * File path to the config file
	 * @type {string}
	 */
	#filePath = "";

	/**
	 * Indicates that the file is still open
	 * @type {boolean}
	 */
	#isAlive = true;


	/**
	 * @type {import('./ConfigurationManager')}
	 */
	#configManager;

	/**
	 * @type {import('./LogMan').Logger}
	 */
	log;
	// Private MEANS private in JavaScript, no protected properties here. So log cannot be private as subclasses will be using it :/


	/**
	 * @param {string} filePath The path to the config file
	 * @return {ConfigItem}
	 */
	constructor(configManager, filePath) {
		if (typeof filePath !== "string")
			throw new TypeError("filePath expected string got " + (typeof filePath).toString());

		// check if file exists

		this.#filePath = filePath;
		this.#configManager = configManager;

		this.log = Neptune.logMan.getLogger("Config-" + filePath);

		// load
		this.loadSync();
	}

	/**
	 * @param {boolean} save Save the file on close .. no reason to call this really.
	 * @return {void}
	 */
	close(save) {
		if (save === true)
			this.save();
		this.#isAlive = false;
		delete this.entries;
	}
	
	/**
	 * Reload the configuration from disk
	 * @return {Promise<boolean>} Load successful
	 */
	load() {
		return new Promise((resolve, reject) => {
			this.#configManager.readFileContents(this.#filePath).then((data) => {
				this.entries = data;
				resolve(true);
			}).catch(err => {
				this.log.error("Error loading, message: " + err.message, false);
				this.log.error("Stack: " + err.stack, false);
				reject(err);
			});
		});
		
	}
	/**
	 * Loads the configuration from disk (synchronously)
	 * @return {boolean} Load successful
	 */
	async loadSync() {
		this.entries = this.#configManager.readFileContentsSync(this.#filePath);
		return true;
	}
	
	/**
	 * Save the configuration
	 * @return {void}
	 */
	save() {
		if (this.#isAlive) {
			this.log.silly("Saved");
			return this.#configManager.writeFileContents(JSON.stringify(this.entries), this.#filePath);
		}
		else {
			this.log.warn("Failed to save, config file closed and not active.", false);
			throw new Error("Config file closed, not active.");
		}
	}
	
	/**
	 * Save the configuration
	 * @return {void}
	 */
	async saveSync() {
		if (this.#isAlive) {
			this.log.silly("Saved");
			return this.#configManager.writeFileContentsSync(JSON.stringify(this.entries), this.#filePath);
		}
		else {
			this.log.warn("Failed to save, config file closed and not active.", false);
			throw new Error("Config file closed, not active.");
		}
	}
	




	/**
	 * Get a config value
	 * @param {string} key The configuration item to get
	 * @return {object}
	 */
	getProperty(key) {
		if (typeof key !== "string")
			throw new TypeError("key expected string got " + (typeof key).toString());

		return this.entries[key];
	}
	
	/**
	 * @param {string} key Configuration item to save
	 * @param {any} value Value to set the item to
	 * @return {void}
	 */
	setProperty(key, value) {
		if (typeof key !== "string")
			throw new TypeError("key expected string got " + (typeof key).toString());

		this.entries[key] = value;
		this.save();
	}
	
	/**
	 * Returns the configItem's file path
	 * @return {string}
	 */
	getConfigFilePath() {
		return this.#filePath;
	}
	/**
	 * Sets the configItem's file path (does not rename it!)
	 * @param {string} filePath
	 */
	setConfigFilePath(filePath) {
		if (typeof filePath !== "string")
			throw new TypeError("filePath expected string got " + (typeof filePath).toString());
		this.#filePath = filePath;
	}

	/**
	 * Indicates that the config is still open
	 * @return {boolean}
	 */
	getIsAlive() {
		return this.#isAlive;
	}


	/**
	 * @return {JSON}
	 */
	toJSON() {
		return { ... this.entries };
	}

	/**
	 * @return {string}
	 */
	toString() {
		return JSON.stringify(this.entries);
	}

	/**
	 * @param {JSON} JSONObject JSON interpretation of the configuration 
	 */
	setJSON(JSONObject) {
		this.entries = { ... JSONObject };
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