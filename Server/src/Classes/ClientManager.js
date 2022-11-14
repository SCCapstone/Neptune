/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *      Capstone Project 2022
 */

const EventEmitter = require('node:events');

/** @type {import('./NotificationManager.js')} */
const NotificationManager = global.Neptune.notificationManager;

/** @type {import('./ConfigurationManager.js')} */
const ConfigurationManager = global.Neptune.configurationManager;

/** @type {import('./ConfigItem.js')} */
const NeptuneConfig = global.Neptune.config;

/**
 * Management class for clients
 */
class ClientManager {
    /** @typedef {import('./Client')} Client */
    /**
     * @typedef {object} PairData
     * @property {string} pairId Id representing this pair
     * @property {string} pairKey Shared secret used to enhance encryption
     * @property {string} clientId Id of the client this pair is for
     */



    /** @type {Map<string, Client>} */
    #clients = new Map();

    /** @type {Map<string, string>} */
    #pairIdMap = new Map(); // eh


    Events = new EventEmitter();


    /**
     * This is the constructor
     */
    constructor() {
        this.loadClients();
    }

    /**
     * This will remove a Client, call after unpair. Literal cleanup.
     * @returns {void}
     */
    #removeClient() {
        return;
    }

    /**
     * This will add a Client ??
     * @returns {void}
     */
    #addClient() {
        return;
    }

    /**
     * This will pair a new Client
     * @param {string} name 
     * @param {IPAddress} IPAddress 
     * @returns {Client}
     */
    pair(name, IPAddress) {
        return;
    }

    /**
     * This will unpair the Client
     * @param {Client} client 
     * @returns {boolean}
     */
    unpair(client) {
        return false;
    }

    /**
     * This will return a Client
     * @param {string} clientId 
     * @returns {Client}
     */
    getClient(clientId) {
        return this.#clients.get(clientId);
    }

    /**
     * This will return all the Clients
     * @returns {Client[]}
     */
    getClients() {
        return new Map(this.#clients);
    }

    /**
     * This will load all the Clients
     * @returns {void}
     */
    loadClients() {
        
    }

    /**
     * This will save the current Clients
     * @returns {void}
     */
    saveClients() {
        this.#clients.forEach(client => {
            client.save();
        });
    }
}

module.exports = ClientManager;