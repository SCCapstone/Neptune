/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */

const ConfigItem = require('./ConfigItem.js');
const IPAddress = require('./IPAddress.js');
/**
 * @typedef {import('./IPAddress.js')} IPAddress
 * 
 */

/**
 * Client configuration data
 */
class ClientConfig extends ConfigItem {
	/** 
	 * Last known IP address of the client
	 * @type {IPAddress}
	 */
	_IPAddress;
	/**
	 * The last known IP address of the client
	 * @type{IPAddress}
	 */
	get IPAddress() {
		return this._IPAddress;
	}
	/** @param {(string|IPAddress)} ip */
	set IPAddress(ip) {
		if (ip instanceof IPAddress) {
			this._IPAddress = ip;
			// this.save();
		} else if (typeof ip === "string") {
			this._IPAddress = new IPAddess(ip);
			// this.save();
		} else {
			throw new TypeError("IPAddess expected string or IPAddress, got " + (typeof ip).toString());
		}
	}



	/** @type {string} */
	_clientId;
	/**
	 * Unique client identifier (provided by the client)
	 * @type{string}
	 */
	get clientId() {
		return this._clientId;
	}
	set clientId(clientId) {
		if (typeof clientId !== "string")
			throw new TypeError("clientId expected string got " + (typeof clientId).toString());
		this._clientId = clientId;
		// this.save();
	}



	/** @type {string} */
	_friendlyName;
	/**
	 * Display name of the client (John's Phone)
	 * @type {string}
	 */
	get friendlyName() {
		return this._friendlyName;
	}
	set friendlyName(friendlyName) {
		if (typeof friendlyName !== "string")
			throw new TypeError("friendlyName expected string got " + (typeof friendlyName).toString());

		this._friendlyName = friendlyName; // probably should restrict this
		// this.save();
	}

	/** @type {Date} */
	_dateAdded;
	/**
	 * Date the client and server paired
	 * @type {Date}
	 */
	get dateAdded() {
		return this._dateAdded;
	}
	/** @param {(Date|string)} dateAdded Either a date object or a string of the ISO time stamp */
	set dateAdded(dateAdded) {
		if (dateAdded instanceof Date)
			this._dateAdded = dateAdded;
		else {
			dateTime = new Date(dateAdded);
			if (!isNaN(dateTime))
				this._dateAdded = dateTime;
			else
				throw new RangeError("Invalid time value");
		}
		// this.save();
	}



	// Pair data
	/** @type {string} */
	_pairId;
	/** 
	 * UUID representing the unique pair between this server and the client
	 * @type {string}
	 */
	get pairId() {
		return this._pairId;
	}
	set pairId(pairId) {
		if (typeof pairId !== "string")
			throw new TypeError("pairId expected string got " + (typeof pairId).toString());
		this._pairId = pairId;
		// this.save();
	}


	/** @type {string} */
	_pairKey;
	/**
	 * Unique pair key shared by the two devices, used to verify a client
	 * @type {string}
	 */
	get pairKey() {
		return this._pairKey;
	}
	set pairKey(pairKey) {
		if (typeof pairKey !== "string")
			throw new TypeError("pairKey expected string got " + (typeof pairKey).toString());
		this._pairKey = pairKey;
		// this.save();
	}

	/** 
	 * Pair key and pair id set
	 * @type {boolean}
	 */
	get isPaired() {
		return (this._pairKey !== undefined && this._pairKey !== "") && (this._pairId !== undefined && this._pairId !== "");
	}



	// Synced data
	/**
	 * @typedef {object} NotificationSettings
	 * @property {boolean} [enabled=true] - Notifications are sent/received between the two
	 */
	/**
	 * Notification settings, synced between the two devices (you have to call client.syncSettings())
	 * @type {NotificationSettings}
	 */
	notificationSettings = {};

	/**
	 * @typedef {object} ClipboardSettings
	 * @property {boolean} [enabled=false] - Clipboard data sent/received synced between the two
	 * @property {boolean} [allowAutoReceive=false] - Clipboard data allowed to be set automatically (when receive from client)
	 * @property {boolean} [autoSendToClient=false] - Clipboard data auto received from client (them)
	 */
	/**
	 * Clipboard settings, synced between the two devices (you have to call client.syncSettings())
	 * @type {ClipboardSettings}
	 */
	clipboardSettings = {};


	/**
	 * @typedef {object} FileSharingSettings
	 * @property {boolean} [enabled=false] - Clipboard data sent/received synced between the two
	 * @property {boolean} [autoReceiveFromClient=false] - Auto receive and download files sent from the client (them)
	 * @property {boolean} [clientBrowsable=false] - Remote client device is browsable
	 * @property {boolean} [serverBrowsable=false] - Allow the client device to remotely browse our files
	 */
	/**
	 * File sharing settings settings, synced between the two devices (you have to call client.syncSettings())
	 * @type {FileSharingSettings}
	 */
	fileSharingSettings = {};






	/**
	 * @param {import('./ConfigurationManager')} configManager ConfigurationManager instance
	 * @param {string} fileName The path to the config file
	 * @return {ClientConfig}
	 */
	constructor(configManager, fileName) {
		super(configManager, fileName);
		this.loadSync();
	}

	/**
	 * @inheritdoc
	 */
	toJSON() {
		let JSONObject = super.toJSON();

		if (this.IPAddress !== undefined)
			JSONObject["IPAddress"] = this.IPAddress.toString();
		if (this.clientId !== undefined)
			JSONObject["clientId"] = this.clientId;
		if (this.friendlyName !== undefined)
			JSONObject["friendlyName"] = this.friendlyName;
		if (this.dateAdded !== undefined)
			JSONObject["dateAdded"] = this.dateAdded.toISOString();

		if (this.pairId !== undefined)
			JSONObject["pairId"] = this.pairId;
		if (this.pairKey !== undefined)
			JSONObject["pairKey"] = this.pairKey;

		if (this.notificationSettings !== undefined)
			JSONObject["notificationSettings"] = this.notificationSettings;
		if (this.clipboardSettings !== undefined)
			JSONObject["clipboardSettings"] = this.clipboardSettings;
		if (this.fileSharingSettings !== undefined)
			JSONObject["fileSharingSettings"] = this.fileSharingSettings;

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

		if (JSONObject["IPAddress"] !== undefined)
			this.IPAddress = new IPAddress(JSONObject["IPAddress"]);
		if (JSONObject["clientId"] !== undefined)
			this.clientId = JSONObject["clientId"];
		if (JSONObject["friendlyName"] !== undefined)
			this.friendlyName = JSONObject["friendlyName"];
		if (JSONObject["dateAdded"] !== undefined)
			this.dateAdded = new Date(JSONObject["dateAdded"]);
		if (JSONObject["pairId"] !== undefined)
			this.pairId = JSONObject["pairId"];
		if (JSONObject["pairKey"] !== undefined)
			this.pairKey = JSONObject["pairKey"];

		if(JSONObject["notificationSettings"] !== undefined)
			this.notificationSettings = JSONObject["notificationSettings"];
		if(JSONObject["clipboardSettings"] !== undefined)
			this.clipboardSettings = JSONObject["clipboardSettings"];
		if(JSONObject["fileSharingSettings"] !== undefined)
			this.fileSharingSettings = JSONObject["fileSharingSettings"];
	}
}

module.exports = ClientConfig;