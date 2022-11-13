const NotificationManager = require('NotificationManager.js');

class ClientManager {
    /** @typedef {import('./Client')} Client */
    /**
     * @typedef {object} PairData
     * @property {string} pairId Id representing this pair
     * @property {string} pairKey Shared secret used to enhance encryption
     * @property {string} clientId Id of the client this pair is for
     */



    /** @typedef {Map<string, Client>} */
    #clients = new Map();

    /** @typedef {Map<string, PairData>} */
    #pairData = new Map();

    /**
     * This is the constructor
     */
    constructor() {
        this.#clients = this.#clients;
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
        return;
    }

    /**
     * This will load all the Clients
     * @returns {void}
     */
    loadClients() {
        return;
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

modules.export = ClientManager;