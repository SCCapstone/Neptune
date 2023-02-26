/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 * 
 * 		The client device object for server (client being the other guy)
 */

const ConfigItem = require('./ConfigItem.js');
const ConnectionManager = require('./ConnectionManager.js');
const NotificationManager = require('./NotificationManager.js');
const IPAddress = require('./IPAddress.js');
const Notification = require('./Notification.js');
const crypto = require("node:crypto")


/** @type {import('./NeptuneConfig.js')} */
var NeptuneConfig = global.Neptune.config;



const ClientConfig = require('./ClientConfig.js');
const { timeStamp } = require('node:console');


/**
 * Represents a client device
 */
class Client extends ClientConfig {
	/** @type {ConnectionManager} */
	#connectionManager;

	/** @type {NotificationManager} */
	#notificationManager;


	// Temp
	#secret;



	// Not config items, but related to the client
	/**
	 * Current battery level
	 * @type {number}
	 */
	batteryLevel;
	/**
	 * Battery temperature reported by the client in terms of degrees C
	 * @type {number}
	 */
	batteryTemperature;
	/**
	 * Charger type reported by the client (ac, discharging, etc)
	 * @type {string}
	 */
	batteryChargerType;

	/**
	 * Battery charge time remaining reported by the client in seconds.
	 * @type {number}
	 */
	batteryTimeRemaining;

	/**
	 * Whether this client has connected and is connected.
	 */
	get isConnected() {
		if (this.#connectionManager === undefined)
			return false;
		if (this.#connectionManager.hasNegotiated)
			return true; // replace by a ping that is successful
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
	 * Initialize a new Client from the configuration file. If the file does not exist it'll be created.
	 * 
	 * Any deviations will error out.
	 * @param {import('./ConfigurationManager')} configManager ConfigurationManager instance
	 * @param {string} clientId Unique id of the client (this will be used as a part of the config file name)
	 */
	constructor(configurationManager, clientId) {
		NeptuneConfig = global.Neptune.config;
		super(configurationManager, configurationManager.configDirectory + NeptuneConfig.clientDirectory + "client_" + clientId + ".json")
		this.clientId = clientId;
		this.#notificationManager = new NotificationManager(this);
		this.log = global.Neptune.logMan.getLogger("Client-" + clientId);
	}

	/**
	 * Called after a socket has been opened with this client
	 * @param {Buffer} secret - Shared secret key
	 * @param {object} miscData - Misc data, such as the createdAt date
	 */
	setupConnectionManager(secret, miscData) {
		this.#connectionManager = new ConnectionManager(this, secret, miscData);
		this.#secret = crypto.createHash('sha256').update(secret).digest('hex');

		this.log.debug("Connection manager setup successful, listening for commands.");

		this.#connectionManager.hasNegotiated = true;

		this.#connectionManager.on('command', (command, data) => {
			this.#handleCommand(command, data);
		});
	}

	/**
	 * Request handler
	 * @param {string} command
	 * @param {object} data
	 */
	#handleCommand(command, data) {
		if (command == "/api/v1/echo") {
			this.#connectionManager.sendRequest("/api/v1/echoed", data);

		} else if (command == "/api/v1/server/ping") {
			let receivedAt = new Date(data["timestamp"]);
			let timestamp = new Date();
			this.#connectionManager.sendRequest("/api/v1/client/pong", {
				receivedAt: data["timestamp"],
				timestamp: timestamp.toISOString()
			});
			let a = Math.max(timestamp.getTime(), receivedAt.getTime());
			let b = Math.min(timestamp.getTime(), receivedAt.getTime());
			this.log.debug("Ping response time ~~: " + Math.round(a-b) + "ms");

		} else if (command == "/api/v1/server/pong") {
			let sentAt = new Date(data["receivedAt"]);
			let receivedAt = new Date(data["timestamp"]);
			let timeNow = new Date();
			this.log.debug("Pong response time: " + Math.round(timestamp.getTime() - receivedAt.getTime()) + "ms");
			this.#connectionManager.emit('pong', {
				receivedAt: sentAt, // Time WE sent the ping request
				timestamp: receivedAt, // Time CLIENT replied
				timeNow: timeNow, // NOW
				totalTime: Math.round(timestamp.getTime() - receivedAt.getTime()), // One-way time
				RTT: Math.round(timeNow.getTime() - receivedAt.getTime()), // Round trip time
			});

		} else if (command == "/api/v1/server/unpair") {
			this.log.debug("Unpair request from client, dropping");
			this.pairId = "";
			this.pairKey = "";
			this.delete();
			this.#connectionManager.sendRequest("/api/v1/server/unpair", {});

		} else if (command == "/api/v1/client/battery/info") {
			if (data["level"] !== undefined)
				this.batteryLevel = data["level"]
			if (data["temperature"] !== undefined)
				this.batteryTemperature = data["temperature"]
			if (data["chargerType"] !== undefined)
				this.batteryChargerType = data["chargerType"]
			if (data["batteryTimeRemaining"] !== undefined)
				this.batteryTimeRemaining = data["batteryTimeRemaining"]

			let timeRemainingMsg = (this.batteryTimeRemaining !== undefined)? ", " + this.batteryTimeRemaining/60 + " minutes until full" : "";
			let chargeMessage = (this.batteryChargerType!="discharging")? "charging via " + this.batteryChargerType + timeRemainingMsg : "discharging";
			this.log.debug("Received battery data from client. Client is at " + this.batteryLevel + "% and is " + chargeMessage + ". Temperature: " + this.batteryTemperature);

			this.#connectionManager.sendRequest("/api/v1/server/ack", {});


		} else if (command == "/api/v1/server/sendNotification" || command == "/api/v1/server/updateNotification") {
			if (this.notificationSettings.enabled === false)
				return;

			if (Array.isArray(data)) {
				for (var i = 0; i<data.length; i++) {
					this.receiveNotification(new Notification(this, data[i]));
				}
			} else {
				// invalid data.. should be an array but whatever
				this.receiveNotification(new Notification(this, data));
			}
			this.#connectionManager.sendRequest("/api/v1/server/ack", {});

		// Config
		} else if (command == "/api/v1/server/configuration/set") {
			this.log.debug("Updating client config using: " + data);
			
			// Set things we care to update
			if (typeof data["notificationSettings"] === "object") {
				
			}
			if (typeof data["clipboardSettings"] === "object") {
				if (data["clipboardSettings"].enabled === false) // Only allow client to disable it
					this.clipboardSettings.enabled = false;
			}

			if (typeof data["fileSharingSettings"] === "object") {
				if (data["fileSharingSettings"].enabled === false)
					this.fileSharingSettings.enabled = false;

				this.fileSharingSettings.clientBrowsable = (data["fileSharingSettings"].clientBrowsable === true)? true : false;
			}

			if (typeof data["friendlyName"] === "string")
				this.friendlyName = data["friendlyName"];

			this.save();

			this.#connectionManager.sendRequest("/api/v1/server/ack", {});

			//this.fromJSON(data);
		} else if (command == "/api/v1/server/configuration/get") {
			this.#connectionManager.sendRequest("/api/v1/client/pong", {
				friendlyName: NeptuneConfig.friendlyName,
				notificationSettings: {
					enabled: this.notificationSettings.enabled
				},
				clipboardSettings: {
					enabled: this.clipboardSettings.enabled,
					autoSendToClient: this.clipboardSettings.autoSendToClient,
				},
				fileSharingSettings: {
					enabled: this.fileSharingSettings.enabled,
					autoReceiveFromClient: this.fileSharingSettings.autoReceiveFromClient,
					serverBrowsable: this.fileSharingSettings.serverBrowsable,
				}
			});

		}
	}

	setupConnectionManagerWebsocket(webSocket) {
		this.#connectionManager.setWebsocket(webSocket);
	}
	processHTTPRequest(data, callback) { // ehh
		this.#connectionManager.processHTTPRequest(data, callback);
	}
	/**
	 * Send a request (or response) to the client. (connectionManager.sendRequest)
	 * 
	 * @param {string} command - The client endpoint to send to.
	 * @param {object} data - Data to send (will be converted to Json).
	 */
	sendRequest(command, data) { // Refine later
		if (this.#connectionManager !== undefined) {
			if (this.#connectionManager.initiateConnection()) {
				return this.#connectionManager.sendRequest(command, data);
			}
		}
	}


	/**
	 * For connection manager
	 * 
	 */
	getSecret() {
		return this.#secret;
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
	}
	/**
	 * Get the client's clipboard
	 * @return {object}
	 */
	getClipboard() {
		return "";
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
		notification.push();
	}



	/**
	 * @typedef {object} PingData
	 * @property {Date} pingSentAt - Time we sent ping request.
	 * @property {Date} pongSentAt - Time client sent the pong response (questionable reliability).
	 * @property {Date} pongReceivedAt - Time we received the pong response.
	 * @property {number} pingTime - Time between sending the ping request and client receiving the ping in ms.
	 * @property {number} RTT - Total time to ping and receive a response (use this) in ms.
	 */

	/**
	 * Send ping packet, return delay
	 * @return {Promise<PingData>} Delay in MS
	 */
	ping() {
		return new Promise((resolve, reject) => {
			this.#connectionManager.once('pong', (data) => {
				resolve({
					pingSentAt: data["receivedAt"],
					pongSentAt: data["timestamp"],
					pongReceivedAt: data["timeNow"],
					pingTime: data["totalTime"],
					RTT: data["RTT"]
				});
			});

			this.sendRequest('/api/v1/client/ping', {
				timestamp: new Date().toISOString(),
			});
		});
	}

	/**
	 * Send configuration settings to the client device. Sync the config.
	 */
	syncConfiguration() {
		this.sendRequest("/api/v1/client/configuration/set", {
			friendlyName: NeptuneConfig.friendlyName,
			notificationSettings: {
				enabled: this.notificationSettings.enabled
			},
			clipboardSettings: {
				enabled: this.clipboardSettings.enabled,
				autoSendToClient: this.clipboardSettings.autoSendToClient,
			},
			fileSharingSettings: {
				enabled: this.fileSharingSettings.enabled,
				autoReceiveFromClient: this.fileSharingSettings.autoReceiveFromClient,
				serverBrowsable: this.fileSharingSettings.serverBrowsable,
			}
		});
	}

	/**
	 * This will unpair a client
	 * @return {boolean} True if unpair request sent, or false if already unpaired
	 */
	unpair() {
		if (this.isPaired) {
			this.log.info("Unpairing");
			this.#connectionManager.unpair();
			this.delete();
			return true;
		} else
			return false
	}

	/**
	 * This will pair with a client, generating the required pairId and pairKey
	 */
	pair() {
		this.#connectionManager.pair();
		client.saveSync();
	}


	delete() {
		global.Neptune.clientManager.dropClient(this);
		try {
			this.unpair();
			this.#connectionManager.destroy(true);
			this.#notificationManager.destroy(true);
		} catch (err) {}
		finally {
			super.delete();
			this.log.warn("Deleted");
		}
	}
}

module.exports = Client;