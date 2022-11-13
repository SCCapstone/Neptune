const ConfigItem = require('ConfigItem.js');
const IPAddess = require('IPAddress.js');

class Client {

	/** @typedef {IPAddress} */
	#IPAddress;
	/** @typedef {ConfigItem} */
	config;
	/** @typedef {string} */
	clientId;
	/** @typedef {string} */
	friendlyName;
	/** @typedef {Date} */
	dateAdded;

	/** @typedef {string} */
	pairId;
    /** @typedef {string} */
    pairKey;



	/**
	 * @typedef {object} constructorData
	 * @property {IPAddress} IPAddress 
	 * @property {string} clientId Unique Id of the device (provided by the device)
	 * @property {string} friendlyName Friendly name of the device
     * @property {Date} dateAdded If null, current date time
	 */


	/**
	 * Initialize a new Client
	 * @param {(string|ConfigItem|constructorData)} [data] Config name, ConfigItem, or the required constructor data (IP, clientId, friendlyName, dateAdded)  
	 */
	constructor(data) {

	}


	/**
	 * This will send the Notification
	 * @param {Notification} notification 
	 * @return {boolean}
	 */
	sendNotification(notification) {
		return false;
	}

	/**
	 * Send data to the client's clipboard
	 * @param {object} object 
	 * @return {boolean}
	 */
	sendClipboard(object) {
		return false;
	}

	/**
	 * Send a file to the client
	 * @param {string} string 
	 * @return {boolean}
	 */
	sendFile(string) {
		return false;
	}

	/**
	 * Test device connection
	 * @return {boolean}
	 */
	sendPing() {
		return false;
	}

	/**
	 * This will set the IPAddress
	 * @param {IPAddress} ipAddress 
	 * @return {void}
	 */
	setIPAddress(ipAddress) {
		this.#IPAddress = ipAddress;
		return;
	}

	/**
	 * This will return the IPAdress
	 * @return {IPAddress}
	 */
	getIPAddress() {
		return this.#IPAddress;
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
	saveConfiguration() {
		return false;
	}
}

modules.export = Client;