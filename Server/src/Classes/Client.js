const ConfigItem = require('./ConfigItem.js');
const IPAddess = require('./IPAddress.js');

/** @type {import('./NotificationManager.js')} */
const NotificationManager = global.Neptune.notificationManager;
/** @type {import('./ConfigurationManager.js')} */
const ConfigurationManager = global.Neptune.configurationManager;
/** @type {import('./ConfigItem.js')} */
const NeptuneConfig = global.Neptune.config;


/**
 * Represents a client device
 * 
 */
class Client {
	/** @type {ConfigItem} */
	#config;


	/** @type {IPAddress} */
	#IPAddress;

	/** @type {string} */
	#clientId;

	/** @type {string} */
	#friendlyName;

	/** @type {Date} */
	#dateAdded;

	/** @type {string} */
	#pairId;
	/** @type {string} */
	#pairKey;


	// Public properties (the same as private, + getter and setters)
	// The one JSDoc type will apply to both.
	// Use these to save the config on changes!

	/** @type{IPAddress} */
	get IPAddress() {
		return this.#IPAddress;
	}
	/**@param {(string|IPAddress)} ip
	 * @param {(string|number)} [port]
	 */
	set IPAddress(ip, port) {
		if (ip instanceof IPAddess) {
			this.#IPAddress = ip;
			this.#config.entries.IPAddress = this.#IPAddress;
			this.#config.save();
		} else if (typeof ip === "string") {
			this.#IPAddress = new IPAddess(ip, port);
			this.#config.entries.IPAddress = this.#IPAddress;
			this.#config.save();
		} else {
			throw new TypeError("IPAddess expected string or IPAddress, got " + (typeof ip).toString());
		}
	}

	/** @type{string} */
	get clientId() {
		return this.#clientId;
	}
	set clientId(clientId) {
		if (typeof clientId !== "string")
			throw new TypeError("clientId expected string got " + (typeof clientId).toString());

		// probably shouldn't be able to change this ??
		this.#clientId = clientId;
		this.#config.entries.clientId = clientId;
		this.#config.save();
	}

	/** @type {string} */
	get friendlyName() {
		return this.#friendlyName;
	}
	set friendlyName(friendlyName) {
		if (typeof friendlyName !== "string")
			throw new TypeError("friendlyName expected string got " + (typeof friendlyName).toString());

		this.#friendlyName = friendlyName; // probably should restrict this
		this.#config.entries.friendlyName = friendlyName;
		this.#config.save();
	}

	/** @type {Date} */
	get dateAdded() {
		return this.#dateAdded;
	}
	set dateAdded(dateAdded) {
		if (dateAdded instanceof Date)
			this.#dateAdded = dateAdded;
		else {
			dateTime = new Date(dateAdded);
			if (!isNaN(dateTime))
				this.#dateAdded = dateTime;
			else
				throw new RangeError("Invalid time value");
		}
		this.#config.entries.dateAdded = this.#dateAdded;
		this.#config.save();
	}

	/** @type {string} */
	get pairId() {
		return this.#pairId;
	}
	set pairId(pairId) {
		if (typeof pairId !== "string")
			throw new TypeError("pairId expected string got " + (typeof pairId).toString());
		this.#pairId = pairId;
		this.#config.entries = pairId;
		this.#config.save();
	}

	/** @type {string} */
	get pairKey() {
		return this.#pairKey;
	}
	set pairKey(pairKey) {
		if (typeof pairKey !== "string")
			throw new TypeError("pairKey expected string got " + (typeof pairKey).toString());
		this.#pairKey = pairKey;
		this.#config.entries.pairKey = pairKey;
		this.#config.save();
	}





	/**
	 * @typedef {object} constructorData
	 * @property {IPAddress} IPAddress 
	 * @property {string} clientId Unique Id of the device (provided by the device)
	 * @property {string} friendlyName Friendly name of the device
	 * @property {Date} dateAdded If null, current date time
	 * @property {string} [pairId] Id representing the pair between the devices
	 * @property {string} [pairKey] Shared secret between the two devices
	 */


	/**
	 * Initialize a new Client.
	 * You will either need to pass an existing ConfigItem for this client, a string (JSON) representation of the config, or an object containing:
	 * ```javascript
	 * {
	 * 		IPAddress: "ip:port",
	 * 		clientId: "clientId",
	 * 		friendlyName: "My phone",
	 * 		dateAdded: "2022-11-13T16:55:14.459Z"
	 * }
	 * ```
	 * 
	 * Any deviations will error out.
	 * @param {(string|ConfigItem|constructorData)} [data] Config name, ConfigItem, or the required constructor data (IP, clientId, friendlyName, dateAdded)  
	 */
	constructor(data) {
		if (data instanceof ConfigItem) {
			if (this.#isValidConfigData(data.entries))
				this.#config = data;
			else
				throw new TypeError("ConfigItem is invalid, does not represent the config of a client.");
		} else if (typeof data === "string") {
			let data = JSON.parse(data);
			this.#isValidConfigData(data, true);
			// Load config
			this.#config = ConfigurationManager.loadConfig(NeptuneConfig.entries.clientConfigurationsSubdirectory + this.#clientId);
		} else if (typeof data === "object") {
			this.#isValidConfigData(data, true);
			// Load config
			this.#config = ConfigurationManager.loadConfig(NeptuneConfig.entries.clientConfigurationsSubdirectory + this.#clientId);
		}
	}

	/**
	 * Checks if an object contains the correct properties
	 * @param {constructorData} obj
	 * @param {boolean} setData If true, we assign the values in obj to their respective properties
	 */
	#isValidConfigData(obj, setData) {
		if (obj === undefined)
			throw new TypeError("data cannot be undefined.");

		if (typeof obj.IPAddress === "string") {
			obj.IPAddress = new IPAddess(obj.IPAddress);
		} else if (!(obj.IPAddress instanceof IPAddress))
			throw new TypeError("IPAddress expected instance of IPAddress, got " + (typeof obj.IPAddress).toString());

		if (typeof obj.clientId !== "string")
			throw new TypeError("clientId expected type got " + (typeof obj.clientId).toString());

		if (typeof obj.friendlyName !== "string")
			throw new TypeError("friendlyName expected string got " + (typeof obj.friendlyName).toString());

		if (!(obj.dateAdded instanceof Date)) {
			dateTime = new Date(obj.dateAdded);
			if (!isNaN(obj.dateTime))
				this.#dateAdded = dateTime;
			else
				throw new RangeError("Invalid time value.");
		}

		// pairId and pairKey not needed?
		if (setData) {
			// This technically validates the data .. but eh
			this.IPAddress = obj.IPAddress;
			this.clientId = obj.clientId;
			this.friendlyName = obj.friendlyName;
			this.dateAdded = obj.dateAdded;
			if (typeof obj.pairId === "string")
				this.pairId = obj.pairId;
			if (typeof obj.pairKey === "string")
				this.pairKey = obj.pairKey;
		}

	}


	/**
	 * This will send the Notification ??
	 * @param {Notification} notification 
	 * @return {boolean}
	 */
	sendNotification(notification) {
		// not sure to be honest
	}

	/**
	 * Send data to the client's clipboard
	 * @param {object} object 
	 * @return {boolean}
	 */
	sendClipboard(object) {
		throw new Error("Not implemented.");
	}

	/**
	 * Send a file to the client
	 * @param {string} string 
	 * @return {boolean}
	 */
	sendFile(string) {
		throw new Error("Not implemented.");
	}


	/**
	 * ConnectionManager received notification data, push this to the NotificationManager
	 * @param {import('./Notification.js')} notification Notification received
	 */
	receiveNotification(notification) {

	}



	/**
	 * Test device connection
	 * @return {boolean}
	 */
	ping() {
		return false;
	}

	/**
	 * This will unpair a client
	 * @return {boolean}
	 */
	unpair() {
		return false;
	}

	/**
	 * This will pair with a client, generating the required pairId and pairKey
	 * @return {boolean}
	 */
	pair() {
		return false;
	}

	/**
	 * This will return the client in a JSON format
	 * @return {JSONObject}
	 */
	toJSON() {
		return JSON.stringify({
			IPAddress: this.#IPAddress,

		})
	}

	/**
	 * This will save the current configuration
	 * @return {void}
	 */
	save() {
		this.#config.entries.IPAddress = this.#IPAddress;
		this.#config.entries.clientId = this.#clientId;
		this.#config.entries.friendlyName = this.#friendlyName;
		this.#config.entries.dateAdded = this.#dateAdded;
		this.#config.entries.pairId = this.#pairId;
		this.#config.entries.pairKey = this.#pairKey;
		this.#config.save();
	}
}

module.exports = Client;