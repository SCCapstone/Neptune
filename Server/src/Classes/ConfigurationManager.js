/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */


/* Imports */
const fs = require("node:fs");
const keytar = require("keytar");
const NeptuneCrypto = require('./../Support/NeptuneCrypto.js');

const ConfigItem = require('./ConfigItem.js');
const NeptuneConfig = require('./NeptuneConfig');
const ClientConfig = require('./ClientConfig.js');
const Neptune = global.Neptune;


/**
 * Manager class for configuration items
 */
class ConfigurationManager {

	/**
	 * Cached configurations
	 * @type {Map<string, (ConfigItem|NeptuneConfig|ClientConfig)>}
	 */
	#cachedItems = new Map();

	/**
	 * Encryption key used for storing config files
	 * @type {string} 
	 */
	#encryptionKey;

	/**
	 * Path to the configuration files
	 * @type {string}
	 */
	#configDirectory = "./../data/";
	get configDirectory() {
		return this.#configDirectory
	}

	/**
	 * @type {import('./LogMan').Logger}
	 */
	#log;


	/**
	 * Used to check if the config manager is being torn down
	 * @type {boolean}
	 */
	#isDestroying = false;

	/**
	 * @param {string} [configDirectory = "./../data/"] Base folder containing the config files
	 * @param {(string|Buffer)} [encryptionKey] Encryption key used (if applicable)
	 */
	constructor(configDirectory, encryptionKey) {
		if (configDirectory !== undefined) {
			if (typeof configDirectory !== "string")
				throw new TypeError("configDirectory expected string got " + (typeof configDirectory).toString());
			this.#configDirectory = configDirectory;

			if (fs.existsSync(configDirectory) === true) { // Exists
				if (!fs.lstatSync(configDirectory).isDirectory()) { // Is not dir
					fs.rmSync(configDirectory);
					fs.mkdirSync(configDirectory);
				}
			} else { // Does not exist
				fs.mkdirSync(configDirectory);
			}
		}

		if (encryptionKey !== undefined) {
			if (typeof encryptionKey !== "string" && !Buffer.isBuffer(encryptionKey))
				throw new TypeError("encryptionKey expected string got " + (typeof encryptionKey).toString());
			this.#encryptionKey = encryptionKey.toString();
		}

		this.#log = Neptune.logMan.getLogger("ConfigMan");
		this.#log.debug("Loaded, using config dir: " + configDirectory);
	}


	/**
	 * Close all config files
	 */
	destroy() {
		this.#log.debug("Destroying...");
		this.#isDestroying = true;
		this.#cachedItems.forEach((config) => {
			config.close(true);
		});
	}

	/**
	 * Sets the internal encryption key. If you set the key to something that is not the key, bad things may happen.\
	 * This is not intended to be used to change the encryption key! Use `ConfigurationManager.rekey(newkey)` instead.
	 * @param {string} newKey New (actual) encryption key
	 */
	setEncryptionKey(newKey) {
		this.#log.warn("Encryption key updated (externally)");
		this.#encryptionKey = newKey.toString();
	}

	/**
	 * Load a configuration from disk
	 * @param {string} configName The name of the configuration file (or path if isPath is set to true)
	 * @param {boolean} isPath Indicates that configName is in fact the path to the config file. ONLY set this to true IF you are reading a known good file.
	 * @param {(ConfigItem|NeptuneConfig|ClientConfig)} configClass Which class to initialize. This is the class type that will be returned
	 * @return {(ConfigItem|NeptuneConfig|ClientConfig)}
	 */
	loadConfig(configName, isPath, configClass) {
		if (typeof configName !== "string")
			throw new TypeError("configName expected string got " + (typeof configName).toString());

		try {
			let path = configName; // Might consider adding a check to ensure we do not read files outside our working directory.
			if (isPath !== true) // Config name provided
				path = this.#configDirectory + configName + ".json"; // strip .. (maybe allow \ and / ?)
				//path = this.#configDirectory + configName.replace(/[^0-9a-zA-Z]/g, ""); // strip .. (maybe allow \ and / ?)
			
			if (this.#cachedItems.has(path)) {
				this.#log.debug("Loaded config (cached): " + configName)
				return this.#cachedItems.get(path);
			} else {
				this.#log.debug("Loading config: " + configName);
			}

			var configItem;
			if (configClass !== undefined)
				configItem = new configClass(this, path);
			else
				configItem = new ConfigItem(this, path);
			this.#cachedItems.set(path, configItem);


			
			return configItem;
		} catch (err) {
			throw err;
		}
	}


	/**
	 * @param {ConfigItem} configItem Which item to remove from the cache
	 * @return {boolean} ConfigItem was removed from our cache
	 */
	removeConfigItemFromCache(configItem) {
		if (this.#isDestroying || !this.#cachedItems.has(configItem.getFileName()))
			return true;

		this.#log.debug("Removing: " + configItem.getFileNath());
		this.#cachedItems.delete(configItem.getFileName());
		return true;
	}

	/**
	 * Destroys the configuration manager and closes all open (cached) items
	 * @param {boolean} saveConfigs Save the config files when closed
	 */
	destroy(saveConfigs) {
		this.#log("Destroying");
		this.#isDestroying = true;
		this.#cachedItems.forEach((configItem) => {
			//this.#cachedItems.delete(configItem.getFileName());
			configItem.close(saveConfigs);
		});
		this.#cachedItems.clear();
	}


	/**
	 * Changes the encryption key on all configuration files. Essentially re-encrypts (or decrypts) all files.\
	 * Use this to enable / disable encryption.
	 * Saves the new key to the key chain.
	 * @param {(string|boolean)} [newKey] The new encryption key. If true we'll generate one, if empty or undefined we will disable encryption.
	 */
	rekey(newKey) {
		if (newKey == true) // Generate new key?
			newKey = NeptuneCrypto.randomString(Neptune.config.encryption.newKeyLength, 33, 220);
		else
			if (newKey == false)
				newKey == "";
		if (typeof newKey !== "string" && newKey !== undefined)
			throw new TypeError("newKey expected string got " + (typeof newKey).toString());

		var ugh = this;
		var rekeyed = true;

		let filesUpdated = []; // If something fails, revert!

		this.#log.debug("Rekeying");

		return new Promise((resolve, reject) => {
			if (fs.existsSync(this.#configDirectory) === true) { // Exists
				if (!fs.lstatSync(this.#configDirectory).isDirectory()) { // Is not dir
					fs.rmSync(this.#configDirectory);
					fs.mkdirSync(this.#configDirectory);
				}
			} else { // Does not exist
				fs.mkdirSync(this.#configDirectory);
			}

			// Read -> decrypt -> encrypt (new key) -> write
			async function updateFile(file) {
				if (!fs.lstatSync(file).isFile())
					return;
				let contents;
				try {
					contents = fs.readFileSync(file);
					if (NeptuneCrypto.isEncrypted(contents))
						contents = NeptuneCrypto.decrypt(contents, ugh.#encryptionKey);
					if (newKey !== undefined && newKey !== "")
						contents = NeptuneCrypto.encrypt(contents, newKey); // if re-encrypting
					fs.writeFileSync(file, contents);

					ugh.#log.silly("Rekey'd: " + file);
				} catch (err) {
					ugh.#log.warn("Cannot rekey: " + file, false);
					revert();
					reject(err);
					return false;
				}
			}

			function revert() {
				ugh.#log.error("Rekeying failed, reverting.");
				rekeyed = false;
				filesUpdated.forEach(file => {
					updateFile(file);
				});
			}

			function walkDir(dir) { 
				let files = fs.readdirSync(dir);
				
				files.forEach(file => {
					try {
						if (fs.lstatSync(dir + file).isDirectory())
							if (walkDir(dir + file)==false)
								return false;
						if (updateFile(dir + file) === true)
							filesUpdate.push(dir + file);
						else
							return false;
					} catch (err) {
						revert();
						reject(err);
						return false;
					}
				});

				// save the new key.
				if (rekeyed) {
					if (newKey === "" || newKey === undefined)
						keytar.deletePassword("Neptune","ConfigKey").then(() => {
							ugh.#encryptionKey = newKey;
							Neptune.config.encryption.enabled = false;
							Neptune.config.save();

							ugh.#log.info("Encryption disabled");
							ugh.#log.info("Rekeyed configuration files in: " + ugh.#configDirectory, false);
							resolve(true);
						});
					else {
						keytar.setPassword("Neptune","ConfigKey",newKey);
						ugh.#encryptionKey = newKey;
						Neptune.config.encryption.enabled = true;
						Neptune.config.save();
						ugh.#log.info("Encryption enabled");

						ugh.#log.info("Rekeyed configuration files in: " + ugh.#configDirectory);
						resolve(true);
					}
				}
			}

			try {
				if (fs.existsSync(this.#configDirectory + "../NeptuneConfig.json"))
					if (updateFile(this.#configDirectory + "../NeptuneConfig.json") === true) // Maybe risky ..
						filesUpdate.push(this.#configDirectory + "../NeptuneConfig.json");
			} catch (err) {
				revert();
				reject(err);
				return;
			}

			walkDir(this.#configDirectory);
		});
	}


	/**
	 * Returns the JSON contents of a file, decrypting/encrypting if need-be.
	 * @param {string} path Path to the file you wish to read
	 * @return {Promise<JSONObject>} The config contents
	 */
	readFileContents(path) {
		if (typeof path !== "string")
			throw new TypeError("path expected string got " + (typeof path).toString());

		return new Promise((resolve, reject) => {
			try {
				resolve(this.readFileContentsSync(path));
			} catch (err) {
				reject(err);
			}
		});	
	}

	/**
	 * Returns the JSON contents of a file, decrypting/encrypting if need-be.
	 * @param {string} path Path to the file you wish to read
	 * @return {object} The config contents
	 */
	readFileContentsSync(path) {
		if (typeof path !== "string")
			throw new TypeError("path expected string got " + (typeof path).toString());

		if (!fs.existsSync(path)) {
			this.#log.debug("Creating config file: " + path);
			fs.writeFileSync(path, "{}"); // Creates the config
			return {};
		}

		let data = fs.readFileSync(path);
		try {
			if (NeptuneCrypto.isEncrypted(data)) 
				data = NeptuneCrypto.decrypt(data, this.#encryptionKey);
			return JSON.parse(data);
		} catch (err) {
			this.#log.warn("Error reading config file: " + path + " . Error: " + err.message);
			this.#log.debug(err);
			// console.log("[ConfigurationManager] Read error: somewhere on line 210: " + err);
			if (err instanceof NeptuneCrypto.Errors.DataNotEncrypted) {
				return JSON.parse(data); // Not encrypted.
			} else if (err instanceof NeptuneCrypto.Errors.InvalidDecryptionKey || err instanceof NeptuneCrypto.Errors.MissingDecryptionKey) {
				// bad key.
				throw err;
			} else if (err instanceof SyntaxError) {
				// yep, json is broken
				return {};
			} else {
				// Another error
				err.message += "--Path: " + path;
				throw err;
			}
		}
	}

	/**
	 * Writes a string to a file, decrypting/encrypting if need-be. 
	 * @param {(string|object)} data Data you wish to write to the file. Will be converted to JSON string if not already a string.
	 * @param {string} path Path of the file you wish to write
	 * @return {Promise<boolean>} The config was saved
	 */
	writeFileContents(data, path) {
		if (typeof data !== "string") {
			try {
				data = JSON.stringify(data);
			} catch (err) {
				throw new TypeError("data expected string got " + (typeof data).toString());
			}
		}
		if (typeof path !== "string")
			throw new TypeError("path expected string got " + (typeof path).toString());

		return new Promise((resolve, reject) => {
			try {
				resolve(this.writeFileContentsSync(data, path));
			} catch (err) {
				reject(err);
			}
		});	
	}

	/**
	 * Writes a string to a file, decrypting/encrypting if need-be. 
	 * @param {(string|object)} data Data you wish to write to the file. Will be converted to JSON string if not already a string.
	 * @param {string} path Path of the file you wish to write
	 * @return {Promise<boolean>} The config was saved
	 */
	writeFileContentsSync(data, path) {
		if (typeof data !== "string") {
			try {
				data = JSON.stringify(data);
			} catch (err) {
				throw new TypeError("data expected string got " + (typeof data).toString());
			}
		}
		if (typeof path !== "string")
			throw new TypeError("path expected string got " + (typeof path).toString());

		// Encryption must be enabled + an encryption key must be present
		if (Neptune.config.encryption.enabled && (this.#encryptionKey !== undefined && this.#encryptionKey !== ""))
			data = NeptuneCrypto.encrypt(data, this.#encryptionKey);
		fs.writeFileSync(path, data);
		return true;
	}

	/**
	 * Deletes a config and removes it from the cache
	 * @param {ConfigItem} config
	 */
	delete(config) {
		let filePath = config.getFileName();
		if (fs.existsSync(filePath)) {
			this.#log.debug("Deleting \"" + config.getFileName() + "\"");
			fs.unlinkSync(filePath);
		}

		this.removeConfigItemFromCache(config);
	}

	/**
	 * Renames the config file
	 * @param {ConfigItem} config
	 * @param {string} fileName - New file name
	 * @param {string} isPath - Provided fileName is actual the real path
	 */
	rename(config, fileName, isPath) {
		if (typeof fileName !== "string")
			throw new TypeError("fileName expected string got " + (typeof fileName).toString());


		if (isPath !== true) {
			if (!fileName.endsWith(".json"))
				fileName += ".json"

			fileName = this.#configDirectory + fileName;
		}

		this.#log.debug("Renaming \"" + config.getFileName() + "\" to \"" + fileName + "\"");
		fs.renameSync(config.getFileName(), fileName);
		this.#cachedItems.delete(config.getFileName());
		config.setFileName(fileName);
		this.#cachedItems.set(fileName, config);
	}
}

module.exports = ConfigurationManager;