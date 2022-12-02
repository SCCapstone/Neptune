/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *      Capstone Project 2022
 */

const EventEmitter = require('node:events');
const Client = require('./Client');

/** @type {import('./ConfigurationManager.js')} */
var ConfigurationManager = global.Neptune.configManager;

/** @type {import('./NeptuneConfig.js')} */
var NeptuneConfig = global.Neptune.config;

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


    #log;


    /**
     * This is the constructor
     */
    constructor() {
        this.#log = global.Neptune.logMan.getLogger("ClientManager");
        NeptuneConfig = global.Neptune.config;
        ConfigurationManager = global.Neptune.configManager;
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
        this.#log.info("Grabbing client " + clientId);
        let client = this.#clients.get(clientId);
        if (client === undefined) {
            let config = ConfigurationManager.loadConfig(global.Neptune.config.clientDirectory + clientId);
            client = new Client(config);
        }
        return client;
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
        /*
            Clients are stored in Neptune.config.clientConfigurationSubdirectory + clientName
            iterate through the Neptune.config.clients array, which is the clientIds, and load those clients in
        */

        this.#log.info("Loading clients ...");

        NeptuneConfig.clients.forEach((clientId) => {
            this.getClient(clientId);
            // this.#clients.set(clientId, new Client(clientId));
        });
        
    }

    /**
     * This will save the current Clients
     * @returns {void}
     */
    saveClients() {
        this.#log.info("Loading clients ...");
        // ehh
        this.#clients.forEach(client => {
            client.save();
        });
    }
}

module.exports = ClientManager;