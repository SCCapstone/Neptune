const ConfigItem = require('ConfigItem.js');
const IPAddess = require('IPAddress.js');

class Client {

    /** @typedef {IPAddress} */
    #IPAddress;
    /** @typedef {ConnectionManager} */
    #connectionManager;
    /** @typedef {ConfigItem} */
    #configuration;
    /** @typedef {string} */
    #serverId;
    /** @typedef {string} */
    #friendlyName;
    /** @typedef {DateTime} */
    #dateAdded;
    /** @typedef {string[]} */
    #notifiableApps;

    /**
     * This is the default constructor
     */
    constructor() {
        this.#IPAddress = this.#IPAddress;
        this.#connectionManager = this.#connectionManager;
        this.#configuration = this.#configuration;
        this.#serverId = this.#serverId;
        this.#friendlyName = this.#friendlyName;
        this.#dateAdded = this.#dateAdded;
        this.#notifiableApps = this.#notifiableApps;
    }

    /**
     * This will contruct using a JSON
     * @param {JSONObject} JSONObject 
     */
    Client(JSONObject) {

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
     * This will send the Client's clipboard
     * @param {object} object 
     * @return {boolean}
     */
    sendClipboard(object) {
        return false;
    }

    /**
     * This will send a file
     * @param {string} string 
     * @return {boolean}
     */
    sendFile(string) {
        return false;
    }

    /**
     * This will send a ping to test connection
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
     * This will pair with a client
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
        return;
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