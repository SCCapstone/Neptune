/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */


/* Imports */
const ConfigItem = require('./ConfigItem.js');


/**
 * Manager class for configuration items
 */
class ConfigurationManager {

	/**
	 * Cached configurations
	 * @type {Map<string, ConfigItem>}
	 */
	#cachedItems;

	/**
	 * Encryption key used for storing config files
	 * @type {string} 
	 */
	#encryptionKey;

	/**
	 * Path to the configuration files
	 * @type {string}
	 */
	#configDirectory = "./data/configs/";

	constructor(configDirectory, encryptionKey) {
		this.#configDirectory = configDirectory;
		this.#encryptionKey = encryptionKey;
	}

	/**
	 * Load a configuration from disk
	 * @param {string} configName The name of the configuration file (or path if isPath is set to true)
	 * @param {boolean} isPath Indicates that configName is in fact the path to the config file
	 * @return {ConfigItem}
	 */
	loadConfig(configName, isPath) {
		if (typeof configName !== "string")
			throw new TypeError("configName expected string got " + (typeof configName).toString());

		let path = configName;
		if (isPath !== true)
			path = this.#configDirectory + configName.replace(/[^0-9a-zA-Z]/g, ""); // strip
		
		let configItem = new ConfigItem(this, path);
		this.#cachedItems.set(path, configItem);
		
		return configItem;
	}

	/**
	 * Changes the encryption key on all configuration files
	 * @param {string} newKey The new encryption key. If empty or undefined that will disable encryption.
	 */
	rekey(newKey) {

	}

}

module.exports = ConfigurationManager;