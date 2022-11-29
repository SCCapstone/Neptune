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

const ws = require('ws');
const EventEmitter = require('node:events');
const NeptuneCrypto = require('../Support/NeptuneCrypto');


/**
 * Manager class for a connection between server (us) and a client device.
 * Each instance of Client will have an instance of ConnectionManager.
 */
class ConnectionManager extends EventEmitter {

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
	 * @type {ws}
	 */
	#webSocket;


	/**
	 * The client we're representing
	 * @type {Client}
	 */
	#client;

	/**
	 * Shared secret key
	 * @type {Buffer}
	 */
	#secret

	#conInitUUID

	/**
     * @type {import('./LogMan').Logger}
     */
    #log;



	constructor(client, webSocket, sharedSecret, miscData) {
		super();
		// if (!(client instanceof Client))
		// 	throw new TypeError("client expected Client got " + (typeof client).toString());

		this.#log = Neptune.logMan.getLogger("ConManager-" + client.clientId);

		this.#client = client;
		this.#webSocket = webSocket;
		this.#secret = sharedSecret;

		this.#conInitUUID = miscData.conInitUUID;

		this.#setupWebsocketListeners();
	}


	
	/**
	 * @param {string} apiURL
	 * @param {object} requestData
	 * @return {void}
	 */
	sendRequest(apiURL, requestData) {
		this.#log.debug("Sending request to client: " + apiURL);

		let data = JSON.stringify(requestData);
		let encryptedData = NeptuneCrypto.encrypt(data, this.#secret);
		this.#webSocket.send(JSON.stringify({
			"conInitUUID": this.#conInitUUID,
			"command": apiURL,
			"data": encryptedData,
			"dataDecrypted": data,
		}));
	}
	

	/**
	 * Bless
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
	 * 
	 * @return {DateTime}
	 */
	getLastCommunicatedTime() {
		return this.#lastCommunicatedTime;
	}


	/**
	 * Decrypt data (safe-ishly)
	 */
	#decryptMessage(data) {
		try {
			if (NeptuneCrypto.isEncrypted(data))
				data = NeptuneCrypto.decrypt(data, this.#secret);
			return JSON.parse(data);
		} catch (err) {
			this.#log.error(err);
			if (err instanceof NeptuneCrypto.Errors.InvalidDecryptionKey || err instanceof NeptuneCrypto.Errors.MissingDecryptionKey) {
				// bad key.
				throw err;
			} else if (err instanceof SyntaxError) {
				this.#log.silly(data);
				// yep, json is broken
				return {};
			} else {
				// Another error
				throw err;
			}
		}
	}

	/**
	 * Verifies the packet, decrypts data
	 */
	#unwrapPacket(packet) {
		packet = JSON.parse(packet); // first stage, has conInitUUID, command and data (should be encrypted)
		if (packet.conInitUUID == this.#conInitUUID) {
			return {command: packet.command, data: this.#decryptMessage(packet.data)};
		} else {
			this.#log.error("Unable to accept socket packet: conInitUUID mismatch! Packet conInitUUID " + packet.conInitUUID + "!=" + this.#conInitUUID);
			// This is unofficial, add doc for it later
			this.sendRequest("/api/v1/error/socket", {"error": "invalidConInitUUID", "errorText": "Previous packet contains an invalid conInitUUID, cannot process."});
			return {};
		}
	}


	#setupWebsocketListeners() {
		// WS: https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket
		this.#webSocket.on('message', (packet, isBinary) => {
			packet = this.#unwrapPacket(packet);
			this.#log.silly(packet.data);

			this.emit('command', packet.command, packet.data);
		});

		this.#webSocket.on('close', (code, reason) => {
			// clean up!
			this.#log.info("Client disconnected");
		});

		this.#webSocket.on('pong', (data) => {
			// pong response
			this.#log.debug("Client sent pong response");
		});

		this.#webSocket.on('open', () => {
			// opened up
		});

		this.#webSocket.on('ping', (data) => {
			this.#log.debug("Pong!");
			this.#webSocket.pong();
		});

		this.#log.info("Listening...");
	}
}

module.exports = ConnectionManager;