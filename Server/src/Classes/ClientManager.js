/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *      Capstone Project 2022
 */

const Client = require('./Client');

/** @type {import('./NeptuneConfig.js')} */
var NeptuneConfig = global.Neptune.config;

/**
 * Management class for clients
 */
class ClientManager {
    /** @typedef {import('./Client')} Client */


    /** @type {Map<string, Client>} */
    #clients = new Map();

    /** @type {import('./ConfigurationManager.js')} */
    #configManager;

    #log;


    /**
     * This is the constructor
     */
    constructor(configurationManager) {
        this.#log = global.Neptune.logMan.getLogger("ClientManager");
        NeptuneConfig = global.Neptune.config;
        this.#configManager = configurationManager;
        this.loadClients();
    }


    /**
     * This will pair a new Client
     * @param {client} client 
     * @param {IPAddress} IPAddress 
     * @returns {Client}
     */
    pair(client, IPAddress) {
        client.pair(); // ehhh
    }

    /**
     * This will unpair the Client
     * @param {Client} client 
     * @returns {boolean}
     */
    unpair(client) {
        client.unpair();
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
            //let config = this.#configManager.loadConfig(global.Neptune.config.clientDirectory + clientId);
            client = new Client(this.#configManager, clientId);
            this.#clients.set(clientId, client);
        }
        return client;
    }

    /**
     * This will return all the Clients
     * @returns {Map<string, Client>}
     */
    getClients() {
        return this.#clients;
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

    dropClient(client) {
        this.#clients.delete(client?.clientId);
        this.updateSavedClientsInNeptuneConfig();
    }

    /**
     * Updates the NeptuneConfig.clients array to the current clients we've loaded.
     */
    updateSavedClientsInNeptuneConfig() {
        this.#log.debug("Updating saved clients in Neptune config");
        NeptuneConfig.clients = [];
        this.#clients.forEach(client => {
            if (client !== undefined || client !== null) {
                if (client.clientId !== null) {
                    this.#log.silly("adding clientId: " + client.clientId);
                    NeptuneConfig.clients.push(client.clientId);
                }
            }
        });
        NeptuneConfig.saveSync();
    }

    /**
     * This will save the current Clients
     * @returns {void}
     */
    saveClients() {
        this.#log.info("Saving clients ...");
        // ehh
        this.#clients.forEach(client => {
            client.save();
        });
    }

    destroy() {
        // Save all, unload. Deletes any clients NOT paired!
        this.#log.info("Destroying...");
        this.#clients.forEach(client => {
            try {
                if (client.pairKey !== undefined) {
                    try {
                        client.save();
                    } catch(e) {
                        // huh
                        this.#log.error("Failed to save " + client.clientId + "! Error: " + e.message);
                        this.#log.debug(e);
                        // client.delete();
                    }
                } else {
                    client.delete(); // Remove the config file.
                }
            } catch (e) {}
        });
        this.updateSavedClientsInNeptuneConfig();
    }
}

module.exports = ClientManager;