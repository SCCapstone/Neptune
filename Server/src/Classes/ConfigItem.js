/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */



/**
 * Manager class for configuration items
 */
class ConfigurationManager {

	/**
	 * Cached configurations
	 * @type {Map<string, any>}
	 */
	#configEntries = new Map();


	/**
	 * File path to the config file
	 * @type {string}
	 */
	#filePath = "";

	/**
	 * @param {string} filePath The path to the config file
	 * @return {ConfigItem}
	 */
	constructor(filePath) {
		if (typeof filePath !== "string")
			throw new TypeError("filePath expected string got " + (typeof filePath).toString());

		// check if file exists

		this.#filePath = filePath;

		// load
		this.loadConfig();
	}

	/**
	 * @param {boolean} save Save the file on close
	 * @return {void}
	 */
	closeConfig(save) {
		if (save === true)
			this.saveConfig();
	}
	
	/**
	 * Reload the configuration from disk
	 * @return {void}
	 */
	loadConfig() {

	}
	
	/**
	 * Save the configuration
	 * @return {void}
	 */
	saveConfig() {

	}
	
	/**
	 * Get a config value
	 * @param {string} key The configuration item to get
	 * @return {object}
	 */
	getProperty(key) {
		if (typeof key !== "string")
			throw new TypeError("key expected string got " + (typeof key).toString());

		return this.#configEntries.get(key);
	}
	
	/**
	 * @param {string} key Configuration item to save
	 * @param {any} value Value to set the item to
	 * @return {void}
	 */
	setProperty(key, value) {
		if (typeof key !== "string")
			throw new TypeError("key expected string got " + (typeof key).toString());

		this.#configEntries.set(key, value);
	}
	
	/**
	 * 
	 * @return {string}
	 */
	getConfigFilePath() {
		return this.#filePath;
	}

	/**
	 * I cannot remember what this means.
	 * @return {boolean}
	 */
	getIsAlive() {
		return this.#isAlive;
	}


	/**
	 * @return {JSON}
	 */
	toJSON() {
		return JSON.stringify(Object.fromEntries(this.#configEntries));
	}

	/**
	 * @param {JSON} JSONObject JSON interpretation of the configuration 
	 */
	setJSON(JSONObject) {
		// stuff
	}

}

module.exports = ConfigurationManager;