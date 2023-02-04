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


/** @type {import('./NeptuneConfig.js')} */
var NeptuneConfig = global.Neptune.config;



const ClientConfig = require('./ClientConfig.js');


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

		this.log.debug("Connection manager setup successful, listening for commands.");

		this.#connectionManager.on('command', (command, data) => {
			//this.log.debug("Received command:" + command);

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
		this.log.info("Unpairing");
		this.#connectionManager.unpair();
		this.delete();
		return false;
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
		this.unpair();
		this.#connectionManager.destroy(true);
		this.#notificationManager.destroy(true);
		super.delete();
	}
}

module.exports = Client;