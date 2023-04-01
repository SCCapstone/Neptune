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

const ConnectionManager = require('./ConnectionManager.js');
const NotificationManager = require('./NotificationManager.js');
const IPAddress = require('./IPAddress.js');
const Notification = require('./Notification.js');
const crypto = require("node:crypto")
const fs = require("node:fs");


/** @type {import('./NeptuneConfig.js')} */
var NeptuneConfig = global.Neptune.config;



const ClientConfig = require('./ClientConfig.js');
const Clipboard = require('./Clipboard.js');
const path = require('node:path');


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
		if (this.#connectionManager !== undefined) {
			try {
				this.#connectionManager.removeAllListeners();
				this.#connectionManager.destroy(); // Close that one!
			} catch (e) {}
			finally {
				this.#connectionManager = undefined;
			}
		}
		
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
			this.sendRequest("/api/v1/echoed", data);

		} else if (command == "/api/v1/server/ping") {
			let receivedAt = new Date(data["timestamp"]);
			let timestamp = new Date();
			this.sendRequest("/api/v1/client/pong", {
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
			this.sendRequest("/api/v1/server/unpair", {});

		}  else if (command == "/api/v1/server/disconnect") {
			this.#connectionManager.disconnect();

		} else if (command == "/api/v1/client/battery/info") {
			if (data["level"] !== undefined)
				this.batteryLevel = data["level"]
			if (data["temperature"] !== undefined)
				this.batteryTemperature = data["temperature"]
			if (data["chargerType"] !== undefined)
				this.batteryChargerType = data["chargerType"]
			if (data["batteryTimeRemaining"] !== undefined)
				this.batteryTimeRemaining = data["batteryTimeRemaining"]

			// let timeRemainingMsg = (this.batteryTimeRemaining !== undefined)? ", " + this.batteryTimeRemaining/60 + " minutes until full" : "";
			let timeRemainingMsg = "";
			let chargeMessage = (this.batteryChargerType!="discharging")? "charging via " + this.batteryChargerType + timeRemainingMsg : "discharging";
			this.log.debug("Received battery data from client. Client is at " + this.batteryLevel + "% and is " + chargeMessage + ". Temperature: " + this.batteryTemperature);

			this.sendRequest("/api/v1/server/ack", {});


		} else if (command == "/api/v1/server/notifications/send" || command == "/api/v1/server/notifications/update") {
			if (this.notificationSettings.enabled !== true)
				return;

			if (Array.isArray(data)) {
				for (var i = 0; i<data.length; i++) {
					this.receiveNotification(new Notification(this, data[i]));
				}
			} else {
				// invalid data.. should be an array but whatever
				this.receiveNotification(new Notification(this, data));
			}
			this.sendRequest("/api/v1/server/ack", {});

		// Configuration
		} else if (command == "/api/v1/server/configuration/set" || command == "/api/v1/client/configuration/data") {
			this.log.silly("Updating client config using: " + data);
			
			// Set things we care to update
			if (typeof data["notificationSettings"] === "object") {
				this.notificationSettings.enabled = (data["notificationSettings"].enabled === false)? false : true;
			}

			// Clipboard
			if (typeof data["clipboardSettings"] === "object") {
				if (data["clipboardSettings"].enabled === false) // Only allow client to disable it
					this.clipboardSettings.enabled = false;

				if (typeof data["clipboardSettings"].synchronizeClipboardToServer === "boolean") // For parity
					this.clipboardSettings.synchronizeClipboardToServer = data["clipboardSettings"].synchronizeClipboardToServer;
			}

			if (typeof data["fileSharingSettings"] === "object") {
				if (data["fileSharingSettings"].enabled === false)
					this.fileSharingSettings.enabled = false;
			}

			if (typeof data["friendlyName"] === "string")
				this.friendlyName = data["friendlyName"];

			this.save();

			this.sendRequest("/api/v1/server/ack", {});

			//this.fromJSON(data);
		} else if (command == "/api/v1/server/configuration/get") {
			this.syncConfiguration(true);


		// Clipboard
		} else if (command == "/api/v1/server/clipboard/set" || command == "/api/v1/client/clipboard/data") {
			let isReponse = command === "/api/v1/client/clipboard/data"; // Response from client, that is

			if (this.clipboardSettings.enabled) {
				if (this.clipboardSettings.allowClientToSet || isReponse) { // Allowed to set?
					this.clipboardModificationsLocked = true; // DO NOT SEND WHAT WE JUST GOT! RACE CONDITION!
					this.log.silly(data);
					Clipboard.setStandardizedClipboardData(data).then((success) => {
						if (success)
							this.sendRequest("/api/v1/server/clipboard/uploadStatus", { status: "success" });
						else
							this.sendRequest("/api/v1/server/clipboard/uploadStatus", { status: "failed" });
					}).catch((err) => {
						this.log.error("Error retrieving clipboard data using Clipboard class. Falling back to QT?")
						this.log.debug(err);

						if (!isReponse) {
							this.sendRequest("/api/v1/server/clipboard/uploadStatus", {
								status: "failed",
								errorMessage: "Unknown server error"
							});
						}
					});

					if (isReponse) {
						let maybeThis = this;
						setTimeout(() => { maybeThis.clipboardModificationsLocked = false }, 1000);
					}
				} else {
					if (!isReponse)
						this.sendRequest("/api/v1/server/clipboard/uploadStatus", { status: "setBlocked" });
				}
			} else {
				if (!isReponse)
					this.sendRequest("/api/v1/server/clipboard/uploadStatus", { status: "clipboardSharingOff" });
			}

		} else if (command == "/api/v1/server/clipboard/get") {
			if (this.clipboardSettings.enabled) {
				if (this.clipboardSettings.allowClientToGet) {
					this.log.debug("Client requested clipboard data, sending.");
					this.sendClipboard(true);
				} else
					this.sendRequest("/api/v1/server/data", { status: "getBlocked" });
			} else
				this.sendRequest("/api/v1/server/data", { status: "clipboardSharingOff" });
		} else if (command == "/api/v1/client/clipboard/uploadStatus") {
			this.clipboardModificationsLocked = false;

		} else if (command == "/api/v1/server/filesharing/upload/newFileUUID") {
			// Client is uploading a file.
			if (this.fileSharingSettings.enabled && this.fileSharingSettings.allowClientToUpload) {
				let saveToDirectory = this.getReceivedFilesDirectory();
				let fileUUIDPackage = global.Neptune.filesharing.newClientUpload(this, data["filename"], saveToDirectory);

				this.log.info("Client request file upload, new fileUUID: " + fileUUIDPackage.fileUUID);
				this.sendRequest("/api/v1/server/filesharing/upload/fileUUID", {
					fileUUID: fileUUIDPackage.fileUUID,
					requestId: data.requestId,
					authenticationCode: fileUUIDPackage.authenticationCode,
				});
			}

		}
	}

	getReceivedFilesDirectory() {
		let saveToDirectory = this.fileSharingSettings.receivedFilesDirectory;
		if (saveToDirectory === undefined || !fs.existsSync(saveToDirectory)) {
			this.log.debug("Received files directory not set or does not exist, using ./data/receivedFiles/");
			saveToDirectory = "./data/receivedFiles/";
		} else {
			try {
				// Check if the path points to a valid directory
				let stats = fs.statSync(saveToDirectory);
				if (!stats.isDirectory()) {
					this.log.debug("Received files directory exists, but it's not actually a directory (?), using ./data/receivedFiles/");
					saveToDirectory = "./data/receivedFiles/";
				}
			} catch (_) {
				saveToDirectory = "./data/receivedFiles/";
			}
		}


		this.log.debug("Received files directory: " + saveToDirectory);
		return saveToDirectory;
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
	 * Returns the conInitUUID
	 * @return {string}
	 */
	getConInitUUID() {
		return this.#connectionManager.getConInitUUID();
	}
	/**
	 * Returns the socketUUID
	 * @return {string}
	 */
	getSocketUUID() {
		return this.#connectionManager.getSocketUUID();
	}


	/**
	 * For connection manager
	 * 
	 */
	getSecret() {
		return this.#secret;
	}


	/**
	 * @typedef {object} NotificationActionParameters
	 * @property {string} id - Id of the action
	 * @property {string} [text] - Optional text input (if action is a text box)
	 */
	/**
	 * @typedef {object} UpdateNotificationData
	 * @property {string} action - Activated or dismissed.
	 * @property {NotificationActionParameters} [actionParameters] - Data related to user input.
	 */

	/**
	 * This will send the Notification ??
	 * @param {Notification} notification - Notification to update
	 * @param {UpdateNotificationData} metaData - Actions preformed on notification
	 * @return {boolean}
	 */
	updateNotification(notification, metaData) {
		this.log.silly("Updating notification: " + notification.id);

		// not sure to be honest
		if (!(notification instanceof Notification))
			throw new TypeError("notification expected instance of Notification got " + (typeof notification).toString());

		if (metaData === undefined) {
			metaData = {
				action: "dismiss",
				actionParameters: {}
			}
		}

		let notificationActionData = {
			applicationName: notification.data.applicationName,
			applicationPackage: notification.data.applicationPackage,
			notificationId: notification.data.notificationId,
			action: metaData.action === undefined? "dismiss" : metaData.action,
			actionParameters: metaData.actionParameters,
		};

		this.sendRequest("/api/v1/client/notifications/update", notificationActionData)
	}

	/**
	 * Send out clipboard over to the client.
	 * @return {void}
	 */
	sendClipboard(isResponse) {
		Clipboard.getStandardizedClipboardData().then(clipboardData => {
			try {
				this.sendRequest("/api/v1/client/clipboard/set", clipboardData)
			} catch (e) {}
		});

		let apiUrl = "/api/v1/client/clipboard/set"
		if (isResponse)
			apiUrl = "/api/v1/server/clipboard/data";

		if (this.clipboardSettings.enabled) {
			if (this.clipboardSettings.allowClientToGet || isResponse) {
				Clipboard.getStandardizedClipboardData().then((clipboardData) => {
					this.sendRequest(apiUrl, {
						data: clipboardData,
						status: "okay",
					});
				}).catch((err) => {
					try {
						this.log.error("Error retrieving clipboard data using Clipboard class. Falling back to QT.")
						this.log.error(err);

						// let clipboard = NodeGUI.QApplication.clipboard();
						// let data = {};
						// let text = clipboard.text();
						// if (text != undefined && text != "") {
						// 	data.Text = "data:text/plain;base64, " + Buffer.from(text).toString('base64');
						// }
						// add picture support

						this.sendRequest("/api/v1/server/data", {
							data: data,
							status: "failed",
							errorMessage: "Main clipboard retrieval failed, using fallback method (simple data mode)."
						});
					} catch (simpleModeError) {
						this.log.error("Error retrieving clipboard data using QT.")
						this.log.error(err);
						this.sendRequest("/api/v1/server/data", {
							data: {},
							status: "failed",
							errorMessage: "Unknown server error."
						});
					} 
				});
			}
		}
	}

	/**
	 * Get the client's clipboard. Is should be noted, this only _requests_ the clipboard data. Clipboard data will be processed by the request handler.
	 * @return {void}
	 */
	getClipboard() {
		this.sendRequest("/api/v1/client/clipboard/get", {});
	}

	/**
	 * Get the client's battery info. Is should be noted, this only _requests_ the battery data. Battery data will be processed by the request handler.
	 * @return {void}
	 */
	getBattery() {
		this.sendRequest("/api/v1/client/battery/get", {});
	}

	/**
	 * Request that the client downloads a file.
	 * @param {string} filePath - File to send
	 * @return {boolean}
	 */
	sendFile(filePath) {
		let fileSharingObject = global.Neptune.filesharing.newClientDownload(this, filePath);

		if (fileSharingObject !== undefined);

		this.log.info("Server request file download (-> client), new fileUUID: " + fileSharingObject.fileUUID);
		this.sendRequest("/api/v1/client/filesharing/receive", {
			fileUUID: fileSharingObject.fileUUID,
			authenticationCode: fileSharingObject.authenticationCode,
			fileName: path.basename(filePath),
		});
	}


	/**
	 * ConnectionManager received notification data, push this to the NotificationManager
	 * @param {import('./Notification.js')} notification Notification received
	 */
	receiveNotification(notification) {
		let maybeThis = this;
		notification.on("dismissed", (metaData) => {
			if (metaData === undefined) { metaData = {}; }
			metaData.action = "dismiss";
			maybeThis.updateNotification(notification, metaData);
		});
		notification.on('activate', (metaData) => {
			// activate the notification on the client device
			if (metaData === undefined) { metaData = {}; }
			metaData.action = "activate";
			maybeThis.updateNotification(notification, metaData);
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
	 * @param {boolean} [isResponse=false] - Whether this is in response to the get configuration request.
	 */
	syncConfiguration(isResponse) {
		let apiUrl = "/api/v1/client/configuration/set";
		if (isResponse)
			apiUrl = "/api/v1/server/configuration/data";

		this.sendRequest(apiUrl, {
			friendlyName: NeptuneConfig.friendlyName,
			notificationSettings: {
				enabled: this.notificationSettings.enabled
			},
			clipboardSettings: {
				enabled: this.clipboardSettings.enabled,
				allowClientToSet: this.clipboardSettings.allowClientToSet,
				allowClientToGet: this.clipboardSettings.allowClientToGet,
				synchronizeClipboardToClient: this.clipboardSettings.synchronizeClipboardToClient,
			},
			fileSharingSettings: {
				enabled: this.fileSharingSettings.enabled,
				allowClientToUpload: this.fileSharingSettings.allowClientToUpload,
				allowClientToDownload: this.fileSharingSettings.allowClientToDownload
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
			this._pairId = undefined;
			this._pairKey = undefined;
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


	destroyConnectionManager() {
		this.#connectionManager.destroy();
	}

	delete() {
		try {
			this.unpair();
			this.#connectionManager.destroy(true);
			this.#notificationManager.destroy(true);
		} catch (err) {
			this.log.error(err);
		}
		finally {
			global.Neptune.clientManager.dropClient(this);
			super.delete();
			this.log.warn("Deleted");
		}
	}
}

module.exports = Client;