/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */


/* Imports */
const ipaddress = require('IPAddress.js');

/**
 * @typedef {import('ConfigurationManager.js')}
 */


/**
 * Manager class for a connection between server (us) and a client device.
 * Each instance of Client will have an instance of ConnectionManager.
 */
class ConnectionManager {

	/**
	 * Whether we have
	 * @type {boolean}
	 */
	#hasNegotiated;

	/**
	 * Last time we communicated with the client
	 * @type {DateTime}
	 */
	#lastCommunicatedTime;

	/**
	 * Little more complicated, likely the express instance so we can throw down sockets
	 * @type {object}
	 */
	#Socket;


	// Note: UML incorrect, ServerSocket not a thing.
	// Nor AsyncHttpClient*

	/**
	 * The client's IP
	 * @type {ipaddress}
	 */
	#IPAddress;


	/**
	 * Configuration manager
	 * @type {ConfigurationManager}
	 */
	#Configuration;


	constructor(IPAddress, Config) {

	}
	
	/**
	 * @param {string} apiURL
	 * @param {JSONObject} requestData
	 * @return {void}
	 */
	sendRequest(apiURL, requestData) {

	}
	
	/**
	 * @param {string} apiURL
	 * @param {JSONObject} requestData
	 * @param {function} callback
	 * @return {void}
	 */
	sendRequest(apiURL, requestData, callback) {

	}
	
	/**
	 * 
	 * @return {boolean}
	 */
	initiateConnection() {

	}
	
	/**
	 * Send ping packet, return delay
	 * @return {float} Delay in MS
	 */
	ping() {

	}
	
	/**
	 * @param {boolean} force
	 * @return {void}
	 */
	destroy(force) {

	}
	
	/**
	 * @param {IPAddress} IPAddress
	 * @return {void}
	 */
	setIPAddress(IPAddress) {

	}
	
	/**
	 * 
	 * @return {IPAddress}
	 */
	getIPAddress() {
		return this.#IPAddress;
	}
	
	
	/**
	 * 
	 * @return {DateTime}
	 */
	getLastCommunicatedTime() {
		return this.#lastCommunicatedTime;
	}
}

module.exports = ConnectionManager;