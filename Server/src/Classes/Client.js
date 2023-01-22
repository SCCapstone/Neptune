const ConfigItem = require('./ConfigItem.js');
const ConnectionManager = require('./ConnectionManager.js');
const NotificationManager = require('./NotificationManager.js');
const IPAddress = require('./IPAddress.js');
const Notification = require('./Notification.js');


/** @type {import('./ConfigurationManager.js')} */
const ConfigurationManager = global.Neptune.configManager;
/** @type {import('./NeptuneConfig.js')} */
const NeptuneConfig = global.Neptune.config;


const ws = require('ws');


/**
 * Represents a client device
 * 
 */
class Client {
	/** @type {ConnectionManager} */
	#connectionManager;


	/** @type {NotificationManager} */
	#notificationManager;


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
	/** @type {boolean} */
	#isPaired;

	/**
	 * @type {import('./LogMan').Logger}
	 */
	#log;

	// Public properties (the same as private, + getter and setters)
	// The one JSDoc type will apply to both.
	// Use these to save the config on changes!

	/** @type{IPAddress} */
	get IPAddress() {
		return this.#IPAddress;
	}
	/**@param {(string|IPAddress)} ip
	 */
	set IPAddress(ip) {
		if (ip instanceof IPAddress) {
			this.#IPAddress = ip;
			this.#config.entries.IPAddress = this.#IPAddress;
			this.#config.save();
		} else if (typeof ip === "string") {
			this.#IPAddress = new IPAddess(ip);
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
		this.#config.entries.pairId = pairId;
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
	get isPaired() {
		return this.#pairKey;
	}
	set isPaired(isPaired) {
		if (typeof isPaired !== "boolean")
			throw new TypeError("isPaired expected boolean got " + (typeof isPaired).toString());
		this.#isPaired = isPaired;
		this.#config.entries.isPaired = isPaired;
		this.#config.save();
	}


	// Temp
	#secret;





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
	constructor(data, loadConfig) {
		if (loadConfig) {
			if (typeof data !== "string")
				throw new TypeError("data expected string got " + (typeof data).toString());
			data = new global.Neptune.configManager.loadConfig(global.Neptune.config.clientDirectory + data);
		}
		if (data instanceof ConfigItem) {
			try {
				if (this.#isValidConfigData(data.entries, true)) {
					this.#config = data;
				} else {
					throw new TypeError("ConfigItem is invalid, does not represent the config of a client.");
				}
			} catch (e) {
				// throw e
			}
		} else if (typeof data === "string") {
			let data = JSON.parse(data);
			this.#isValidConfigData(data, true);
			// Load config
			this.#config = global.Neptune.configManager.loadConfig(global.Neptune.config.clientDirectory + this.#clientId);
		} else if (typeof data === "object") {
			this.#isValidConfigData(data, true);
			// Load config
			this.#config = global.Neptune.configManager.loadConfig(global.Neptune.config.clientDirectory + this.#clientId);
		}

		this.#notificationManager = new NotificationManager(this);
		this.#log = Neptune.logMan.getLogger("Client-" + this.#clientId);
	}

	/**
	 * Checks if an object contains the correct properties
	 * @param {constructorData} obj
	 * @param {boolean} setData If true, we assign the values in obj to their respective properties
	 */
	#isValidConfigData(obj, setData) {
		if (obj === undefined)
			throw new TypeError("data cannot be undefined.");

		// if (typeof obj.IPAddress === "string") {
		// 	obj.IPAddress = new IPAddress(obj.IPAddress);
		// } else if (!(obj.IPAddress instanceof IPAddress))
		// 	throw new TypeError("IPAddress expected instance of IPAddress, got " + (typeof obj.IPAddress).toString());

		if (typeof obj.clientId !== "string")
			throw new TypeError("clientId expected type got " + (typeof obj.clientId).toString());

		// if (typeof obj.friendlyName !== "string")
		// 	throw new TypeError("friendlyName expected string got " + (typeof obj.friendlyName).toString());

		// if (!(obj.dateAdded instanceof Date)) {
		// 	dateTime = new Date(obj.dateAdded);
		// 	if (!isNaN(obj.dateTime))
		// 		this.#dateAdded = dateTime;
		// 	else
		// 		throw new RangeError("Invalid time value.");
		// }

		// pairId and pairKey not needed?
		if (setData) {
			// This technically validates the data .. but eh
			this.#IPAddress = obj.IPAddress;
			this.#clientId = obj.clientId;
			this.#friendlyName = obj.friendlyName;
			this.#dateAdded = obj.dateAdded;
			if (typeof obj.pairId === "string")
				this.#pairId = obj.pairId;
			if (typeof obj.pairKey === "string")
				this.#pairKey = obj.pairKey;
		}

		return true;
	}


	/**
	 * Called after a socket has been opened with this client
	 * @param {Buffer} secret - Shared secret key
	 * @param {object} miscData - Misc data, such as the createdAt date
	 */
	setupConnectionManager(secret, miscData) {
		this.#secret = secret;
		this.#connectionManager = new ConnectionManager(this, secret, miscData);

		this.#log.debug("Connection manager setup successful, listening for commands.");

		this.#connectionManager.on('command', (command, data) => {
			//this.#log.debug("Received command:" + command);

			if (command == "/api/v1/echo") {
				this.#connectionManager.sendRequest("/api/v1/echoed", data);
			} else if (command == "/api/v1/server/unpair") {
				this.unpair();
			} else if (command == "/api/v1/server/sendNotification") {
				if (Array.isArray(data)) {
					for (var i = 0; i<data.length; i++) {
						this.receiveNotification(new Notification(data[i]));
					}
				} else {
					// invalid data.. should be an array but whatever
					this.receiveNotification(new Notification(data));
				}
			}
		});
	}

	setupConnectionManagerWebsocket(webSocket) {
		this.#connectionManager.setWebsocket(webSocket);
	}
	processHTTPRequest(data, callback) { // ehh
		this.#connectionManager.processHTTPRequest(data, callback);
	}
	sendRequest(command, data) { // Refine later
		this.#connectionManager.sendRequest(command, data);
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
		notification.on("dismissed", (notifierMetadata)=> {
			this.#connectionManager.sendRequest("/api/v1/client/updateNotification", [{
				applicationName: notification.data.applicationName,
				applicationPackage: notification.data.applicationPackage,
				notificationId: notification.data.notificationId,
				action: "dismiss"
			}]);
		});
		notification.on('activate', (notifierMetadata)=> {
			// activate the notification on the client device
			this.#connectionManager.sendRequest("/api/v1/client/updateNotification", [{
				applicationName: notification.data.applicationName,
				applicationPackage: notification.data.applicationPackage,
				notificationId: notification.data.notificationId,
				action: "activate"
			}]);
		});
		this.#notificationManager.newNotification(notification);
	}



	/**
	 * Test device connection
	 * @return {boolean}
	 */
	ping() {
		this.#connectionManager.ping();
	}

	/**
	 * This will unpair a client
	 * @return {boolean}
	 */
	unpair() {
		this.#log.info("Unpairing");
		this.#pairId = null;
		this.#pairKey = null;
		this.#isPaired = false;
		this.delete();
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
	 * @return {string}
	 */
	toJSON() {
		return JSON.stringify({
			IPAddress: this.#IPAddress,
			clientId: this.#clientId,
			friendlyName: this.#friendlyName,
			dateAdded: this.#dateAdded,
			pairId: this.#pairId,
			pairKey: this.#pairKey,
			isPaired: this.#isPaired,
		})
	}

	// Temp
	getSecret() {
		return this.#secret;
	}

	/**
	 * This will save the current configuration
	 * @return {void}
	 */
	save() {
		this.#config.setProperty("IPAddress", this.#IPAddress);
		this.#config.setProperty("clientId", this.#clientId);
		this.#config.setProperty("friendlyName", this.#friendlyName);
		this.#config.setProperty("dateAdded", this.#dateAdded);
		this.#config.setProperty("pairId", this.#pairId);
		this.#config.setProperty("pairKey", this.#pairKey);
		this.#config.setProperty("isPaired", this.#isPaired);
		this.#config.save();
	}

	load() {
		this.#config.load();
		this.#IPAddress = this.#config.getProperty("IPAddress");
		this.#clientId = this.#config.getProperty("clientId");
		this.#friendlyName = this.#config.getProperty("friendlyName");
		this.#dateAdded = this.#config.getProperty("dateAdded");
		this.#pairId = this.#config.getProperty("pairId");
		this.#pairKey = this.#config.getProperty("pairKey");
		this.#isPaired = this.#config.getProperty("isPaired");
	}

	delete() {
		Neptune.clientManager.dropClient(this);
		this.#connectionManager.destroy();
		this.#config.delete();
	}
}

module.exports = Client;