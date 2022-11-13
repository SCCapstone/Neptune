/**
 *	  _  _ 
 *	 | \| |
 *	 | .` |
 *	 |_|\_|eptune
 *
 *	  Capstone Project 2022
 */


/**
 * Represent an IP address. Includes helper functions to keep you on track 
 */
class IPAddress {
	
	/** @typedef {string} */
	#IPAddress;
	/** @typedef {int} */
	#port;

	/**
	 * This is the constructor
	 * @param {string} address 
	 * @param {int} port 
	 */
	constructor(address, port) {
		if (this.isValidIPAddress(address))
			this.#IPAddress = address;
		if (this.isValidPort(port))
			this.#port = port;
	}

	/**
	 * This checks if the IPAdress is valid
	 * @param {string} address 
	 * @return {boolean}
	 */
	isValidIPAddress(address) {
		if (typeof address !== "string")
			throw new TypeError("address expected string got " + (typeof address).toString());
		return /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(address);
	}

	/**
	 * This checks if the port number is valid
	 * @param {int} port 
	 * @return {boolean}
	 */
	isValidPort(port) {
		if (typeof address !== "string")
			throw new TypeError("address expected string got " + (typeof address).toString());
		return (port > 1000 && port < 65535);
	}

	/**
	 * This will return the IPAddress
	 * @return {string}
	 */
	getIPAddress() {
		return this.#IPAddress;
	}

	/**
	 * This will return the port number
	 * @return {int}
	 */
	getPort() {
		return this.#port;
	}

	/**
	 * This will set the IPAddress and port number
	 * @param {string} address
	 * @return {void}
	 */
	setIPAddress(address) {
		if (this.isValidIPAddress(address))
			this.#IPAddress = address;
		else
			throw new Error("Invalid IP address");
	}

	/**
	 * This will set the port number
	 * @param {int} port
	 * @return {void}
	 */
	setPort(port) {
		if (this.isValidPort(port))
			this.#port = port;
		else
			throw new Error("Invalid port");
	}

	/**
	 * Returns the IP address as a string
	 * @return {string}
	 */
	toString() {
		return this.#IPAddress + ":" + this.#port.toString();
	}


}

modules.exports = IPAddress;