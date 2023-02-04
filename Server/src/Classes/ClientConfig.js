/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */

const ConfigItem = require('./ConfigItem.js');
const IPAddress = require('./IPAddress.js');
/**
 * @typedef {import('./IPAddress.js')} IPAddress
 * 
 */

/**
 * Client configuration data
 */
class ClientConfig extends ConfigItem {
	/** 
	 * Last known IP address of the client
	 * @type {IPAddress}
	 */
	#IPAddress;
	/**
	 * The last known IP address of the client
	 * @type{IPAddress}
	 */
	get IPAddress() {
		return this.#IPAddress;
	}
	/** @param {(string|IPAddress)} ip */
	set IPAddress(ip) {
		if (ip instanceof IPAddress) {
			this.#IPAddress = ip;
			// this.save();
		} else if (typeof ip === "string") {
			this.#IPAddress = new IPAddess(ip);
			// this.save();
		} else {
			throw new TypeError("IPAddess expected string or IPAddress, got " + (typeof ip).toString());
		}
	}



	/** @type {string} */
	#clientId;
	/**
	 * Unique client identifier (provided by the client)
	 * @type{string}
	 */
	get clientId() {
		return this.#clientId;
	}
	set clientId(clientId) {
		if (typeof clientId !== "string")
			throw new TypeError("clientId expected string got " + (typeof clientId).toString());
		this.#clientId = clientId;
		// this.save();
	}



	/** @type {string} */
	#friendlyName;
	/**
	 * Display name of the client (John's Phone)
	 * @type {string}
	 */
	get friendlyName() {
		return this.#friendlyName;
	}
	set friendlyName(friendlyName) {
		if (typeof friendlyName !== "string")
			throw new TypeError("friendlyName expected string got " + (typeof friendlyName).toString());

		this.#friendlyName = friendlyName; // probably should restrict this
		// this.save();
	}



	/** @type {Date} */
	#dateAdded;
	/**
	 * Date the client and server paired
	 * @type {Date}
	 */
	get dateAdded() {
		return this.#dateAdded;
	}
	/** @param {(Date|string)} dateAdded Either a date object or a string of the ISO time stamp */
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
		// this.save();
	}



	// Pair data
	/** @type {string} */
	#pairId;
	/** 
	 * UUID representing the unique pair between this server and the client
	 * @type {string}
	 */
	get pairId() {
		return this.#pairId;
	}
	set pairId(pairId) {
		if (typeof pairId !== "string")
			throw new TypeError("pairId expected string got " + (typeof pairId).toString());
		this.#pairId = pairId;
		// this.save();
	}


	/** @type {string} */
	#pairKey;
	/**
	 * Unique pair key shared by the two devices, used to verify a client
	 * @type {string}
	 */
	get pairKey() {
		return this.#pairKey;
	}
	set pairKey(pairKey) {
		if (typeof pairKey !== "string")
			throw new TypeError("pairKey expected string got " + (typeof pairKey).toString());
		this.#pairKey = pairKey;
		// this.save();
	}

	/** 
	 * Pair key and pair id set
	 * @type {boolean}
	 */
	get isPaired() {
		return (this.#pairKey !== undefined && this.#pairKey !== "") && (this.#pairId !== undefined && this.#pairId !== "");
	}




	/**
	 * @param {import('./ConfigurationManager')} configManager ConfigurationManager instance
	 * @param {string} fileName The path to the config file
	 * @return {ClientConfig}
	 */
	constructor(configManager, fileName) {
		super(configManager, fileName);
		this.loadSync();
	}

	/**
	 * @inheritdoc
	 */
	toJSON() {
		let JSONObject = super.toJSON();

		JSONObject["IPAddress"] = this.#IPAddress;
		JSONObject["clientId"] = this.#clientId;
		JSONObject["friendlyName"] = this.#friendlyName;
		JSONObject["dateAdded"] = this.#dateAdded;
		JSONObject["pairId"] = this.#pairId;
		JSONObject["pairKey"] = this.#pairKey;

		return JSONObject;
	}

	/**
	 * @inheritdoc
	 */
	fromJSON(JSONObject) {
		if (typeof JSONObject !== "string" && typeof JSONObject !== "object")
			throw new TypeError("JSONObject expected string or object got " + (typeof JSONObject).toString());
		
		if (typeof JSONObject === "string")
			JSONObject = JSON.parse(JSONObject);

		if (JSONObject["version"] !== undefined)
			this.version = JSONObject["version"];

		if (JSONObject["IPAddress"] !== undefined)
			this.#IPAddress = JSONObject["IPAddress"];
		if (JSONObject["clientId"] !== undefined)
			this.#clientId = JSONObject["clientId"];
		if (JSONObject["friendlyName"] !== undefined)
			this.#friendlyName = JSONObject["friendlyName"];
		if (JSONObject["dateAdded"] !== undefined)
			this.#dateAdded = JSONObject["dateAdded"];
		if (JSONObject["pairId"] !== undefined)
			this.#pairId = JSONObject["pairId"];
		if (JSONObject["pairKey"] !== undefined)
			this.#pairKey = JSONObject["pairKey"];
	}
}

module.exports = ClientConfig;