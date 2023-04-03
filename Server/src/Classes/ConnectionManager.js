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
const crypto = require("node:crypto");
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
	hasNegotiated;

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

	#conInitUUID;
	#socketUUID;

	/**
     * @type {import('./LogMan').Logger}
     */
    #log;

    // temp, for sending response via HTTP
    #sendRequestCallback

 	/**
 	 * @type {NeptuneCrypto.EncryptionOptions}
 	 */
    #encryptionParameters;


    /**
     * 
     * 
     */
    #requestQueues;


	constructor(client, sharedSecret, miscData) {
		super();
		// if (!(client instanceof Client))
		// 	throw new TypeError("client expected Client got " + (typeof client).toString());

		this.#log = Neptune.logMan.getLogger("ConManager-" + client.clientId);

		this.#client = client;
		this.#secret = sharedSecret;
		this.#conInitUUID = miscData.conInitUUID;
		this.#socketUUID = miscData.socketUUID;
		this.#encryptionParameters = {
			cipherAlgorithm: miscData.encryptionParameters.cipherAlgorithm,
			hashAlgorithm: miscData.encryptionParameters.hashAlgorithm
		}

		this.#log.debug("cipher: " + this.#encryptionParameters.cipherAlgorithm + " -- hashAlgorithm: " + this.#encryptionParameters.hashAlgorithm);
	}


	setWebsocket(webSocket) {
		this.#webSocket = webSocket;
		this.#setupWebsocketListeners();
	}

	/**
	 * Returns the conInitUUID
	 * @return {string}
	 */
	getConInitUUID() {
		return this.#conInitUUID;
	}
	/**
	 * Returns the socketUUID
	 * @return {string}
	 */
	getSocketUUID() {
		return this.#socketUUID;
	}

	
	/**
	 * Sends a request to the client OR a response!
	 * @param {string} apiURL
	 * @param {object} requestData
	 * @return {void}
	 */
	sendRequest(apiURL, requestData) {
		this.#log.debug("Sending request to client: " + apiURL);
		this.#log.silly(requestData);

		if (typeof requestData !== "string" && typeof requestData !== "object")
			throw new TypeError("requestData expected type string or object got " + (typeof requestData).toString());

		if (typeof requestData !== "string")
			requestData = JSON.stringify(requestData);
		let encryptedData = NeptuneCrypto.encrypt(requestData, this.#secret, undefined, this.#encryptionParameters);

		let packet = JSON.stringify({
			"conInitUUID": this.#conInitUUID,
			"command": apiURL,
			"data": encryptedData,
			//"dataDecrypted": requestData,
		});

		if (this.#webSocket !== undefined)
			this.#webSocket.send(packet);
	
		if (this.#sendRequestCallback !== undefined) {
			if (typeof this.#sendRequestCallback === "function") {
				this.#sendRequestCallback(packet);
				this.#sendRequestCallback = undefined;
			}
		}
	}
	

	/**
	 * Bless
	 * @return {boolean}
	 */
	initiateConnection() {
		// good question
		return this.hasNegotiated;
	}


	pair() {

	}
	unpair() {
		this.sendRequest("/api/v1/server/unpair", {});
	}
	


	disconnect() {
		this.#webSocket.close(1001, "disconnect");
	}
	/**
	 * @param {boolean} force
	 * @return {void}
	 */
	destroy(force) {
		if (this.#webSocket !== undefined)
			this.#webSocket.close(1001, "destroy");
		this.removeAllListeners();
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

	/**
	 * This is called to pair the device
	 * @param {object} packet - POST request data
	 */
	#processPairRequest(packet) {
		this.#log.debug("Processing pair request: " + packet);
		if (this.#client.isPaired)
			return true;
		if (packet.command == "/api/v1/server/newPairRequest") {
			// new window/notification to accept pair request


			let newPairId = crypto.randomUUID();
			let newPairKey = NeptuneCrypto.randomString(64, 65, 122);

			this.#client.pairId = newPairId;
			this.#client.pairKey = newPairKey;
			this.#client.friendlyName = packet.data.friendlyName;

			this.#client._dateAdded = new Date();

			this.#client.save();
			
			this.sendRequest("/api/v1/server/newPairResponse", {
				pairId: newPairId,
				pairKey: newPairKey,
				serverId: global.Neptune.config.serverId,
				friendlyName: global.Neptune.config.friendlyName
			});

			this.#log.info("Successfully paired! PairId: " + newPairId);
			Neptune.clientManager.updateSavedClientsInNeptuneConfig();
		}
	}

	processHTTPRequest(packet, callback) {
		packet = this.#unwrapPacket(packet);
		this.#log.debug("HTTP request received.");
		this.#log.silly(packet.data);
		this.#sendRequestCallback = callback;

		if (this.#client.pairId === undefined || this.#client.pairId == "") // Paired?
			if (!this.#processPairRequest(packet)) // Okay, paired now?
				return; // Do not process, failed to pair.

		if (packet.command == "/api/v1/server/newPairRequest") {
			this.sendRequest("/api/v1/server/newPairResponse", {
				error: "alreadyPaired",
				errorMessage: "Device has already been paired. Please unpair in the server to repair device."
			})
			return;
		}

		this.emit('command', packet.command, packet.data);
	}

	#setupWebsocketListeners() {
		// WS: https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket
		this.#webSocket.on('message', (packet, isBinary) => {
			packet = this.#unwrapPacket(packet);
			this.#log.debug("Web socket request received.");
			this.#log.silly(packet.data);
			
			if (this.#client.isPaired === false) // Paired?
				if (!this.#processPairRequest(packet)) // Okay, paired now?
					return; // Do not process, failed to pair.

			this.emit('command', packet.command, packet.data);
		});

		this.#webSocket.on('close', (code, reason) => {
			// clean up!
			this.#log.info("WebSocket: client disconnected (code: " + code + ", reason: " + reason + ").");
		});

		this.#webSocket.on('pong', (data) => {
			// pong response
			this.#log.debug("WebSocket: client sent pong response");
		});

		this.#webSocket.on('open', () => {
			// opened up
			this.#log.debug("WebSocket: opened");

		});

		this.#webSocket.on('ping', (data) => {
			this.#log.debug("WebSocket: pinged, sending pong.");
			this.#webSocket.pong();
			this.emit('ping', data);
		});

		this.#log.info("WebSocket: connected and listening...");

		//this.sendRequest("/api/v1/client/battery/get", {}); // Get battery data on WebSocket connection
	}
}

module.exports = ConnectionManager;