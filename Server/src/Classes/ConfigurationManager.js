/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */


/* Imports */
const ConfigItem = require('ConfigItem.js');


/**
 * Manager class for configuration items
 */
class ConfigurationManager {

	/**
	 * Cached configurations
	 * @type {Map<string, ConfigItem>}
	 */
	#cachedItems;

	constructor() {
		// Do stuff here?
		// Probably grab the base encryption key for files
	}

	/**
	 * Load a configuration from disk
	 * @param {string} filePath
	 * @return {ConfigItem}
	 */
	loadConfig(filePath) {
		let configItem = new ConfigItem(filePath);
		this.#cachedItems.set(filePath, configItem);
		return configItem;
	}

}

module.exports = ConfigurationManager;