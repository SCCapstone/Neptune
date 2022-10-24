const ConnectionManager = require('ConnectionManager.js');

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
        this.#IPAddress = address;
        this.#port = port;
    }

    /**
     * This checks if the IPAdress is valid
     * @param {string} address 
     * @return {boolean}
     */
    isValidIPAddress(address) {
        return false;
    }

    /**
     * This checks if the port number is valid
     * @param {int} port 
     * @return {boolean}
     */
    isValidPort(port) {
        return false;
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
     * @param {int} port 
     * @return {void}
     */
    setIPAddress(address, port = 55420) {
        console.log(address);
    }

    /**
     * This will set the port number
     * @param {int} port
     * @return {void} 
     */
    setPort(port) {
        console.log(port);
    }

    /**
     * This will print the object
     * @return {void}
     */
    toString() {
        console.log("string");
    }


}

modules.exports = IPAddress;