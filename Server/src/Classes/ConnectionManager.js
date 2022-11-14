/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */

const Client = require('./Client');


/* Imports */
// const IPAddress = require('IPAddress.js');

/**
 * @typedef {import('./Client.js')} Client
 */
/**
 * @typedef {import('./ConfigurationManager.js')} ConfigurationManager
 */


/**
 * Manager class for a connection between server (us) and a client device.
 * Each instance of Client will have an instance of ConnectionManager.
 */
class ConnectionManager {

	/**
	 * Whether we have setup the communication pipe (socket)
	 * @type {boolean}
	 */
	#hasNegotiated;

	/**
	 * Last time we communicated with the client
	 * @type {Date}
	 */
	#lastCommunicatedTime;

	/**
	 * Socket name, the URL the socket is hosted on
	 * @type {string}
	 */
	#socketId;


	/**
	 * The client we're representing
	 * @type {Client}
	 */
	#client;


	constructor(client) {
		if (!(client instanceof Client))
			throw new TypeError("client expected Client got " + (typeof client).toString());
		this.#client = client;
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