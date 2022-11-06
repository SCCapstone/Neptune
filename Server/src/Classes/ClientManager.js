const NotificationManager = require('NotificationManager.js');

class ClientManager {
    
    /** @typedef {Map<clientId: string, Client} */
    #clients = new Map();

    /**
     * This is the constructor
     */
    constructor() {
        this.#clients = this.#clients;
    }

    /**
     * This will remove a Client
     * @returns {void}
     */
    #removeClient() {
        return;
    }

    /**
     * This will add a Client
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
        return;
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
        return;
    }
}

modules.export = ClientManager;