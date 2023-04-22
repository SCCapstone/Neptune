const crypto = require("crypto");
const fs = require("node:fs");


global.Neptune.setupConfigurations();

const Client = require("../src/Classes/Client");
const IPAddress = require("../src/Classes/IPAddress");
const ClientManager = require('../src/Classes/ClientManager.js');
const NeptuneConfig = require("../src/Classes/NeptuneConfig");
const NeptuneCrypto = require("../src/Support/NeptuneCrypto");



/** @type {ClientManager} */
global.Neptune.clientManager = new ClientManager(global.Neptune.configurationManager);
/** @type {ClientManager} */
let clientManager = global.Neptune.clientManager;

/** @type {NeptuneConfig} */
let neptuneConfig = global.Neptune.config


let clientUUID = crypto.randomUUID();
describe("ClientManager", () => {

    beforeEach(() => {
        clientUUID = crypto.randomUUID();
    });

    afterEach((done) => {
        try {
            let client = clientManager.getClients().get(clientUUID);
            client.delete();
    
            setTimeout(() => {
                done();
            }, 500);
        } catch {
            done();
        }
    });

    test('getClient(UUID) (new client)', () => {
        let client = clientManager.getClient(clientUUID);
        expect(client.clientId).toBe(clientUUID);
    });

    test('getClient(UUID) (existing client)', () => {
        let savedClient = new Client(global.Neptune.configurationManager, clientUUID)
        let client = clientManager.getClient(clientUUID);
        expect(client.clientId).toBe(clientUUID);
    });

    test('getClients()', () => {
        let clientUUID2 = crypto.randomUUID();
        let client = clientManager.getClient(clientUUID);
        let client2 = clientManager.getClient(clientUUID2);

        let clients = clientManager.getClients();
        expect(clients.has(clientUUID)).toBe(true);
        expect(clients.get(clientUUID)).toMatchObject(client);

        expect(clients.has(clientUUID2)).toBe(true);
        expect(clients.get(clientUUID2)).toMatchObject(client2);
    });

    test('updateSavedClientsInNeptuneConfig()', () => {
        let savedClient = new Client(global.Neptune.configurationManager, clientUUID)
        let client = clientManager.getClient(clientUUID);
        clientManager.updateSavedClientsInNeptuneConfig();

        let found = false
        neptuneConfig.clients.forEach(uuid => {
            if (uuid === clientUUID)
                found = true
        })

        expect(found).toBe(true);
    });

    test('loadClients()', () => {
        let savedClient = new Client(global.Neptune.configurationManager, clientUUID)
        let client = clientManager.getClient(clientUUID);
        clientManager.updateSavedClientsInNeptuneConfig();

        clientManager.loadClients();

        expect(clientManager.getClients().has(clientUUID)).toBe(true);
    });

    test('saveClients()', () => {
        let randomName = crypto.randomUUID();
        let savedClient = new Client(global.Neptune.configurationManager, clientUUID)
        let client = clientManager.getClient(clientUUID);
        client.friendlyName = NeptuneCrypto.randomString(6);
        client.saveSync();

        client.friendlyName = randomName;
        clientManager.saveClients();
        client.friendlyName = NeptuneCrypto.randomString(6);

        let clientAfterSave = new Client(global.Neptune.configurationManager, clientUUID);
        expect(clientAfterSave.friendlyName).toBe(randomName);
    });

    test('destroy()', async () => {
        let randomName = crypto.randomUUID();
        let savedClient = new Client(global.Neptune.configurationManager, clientUUID)
        let client = clientManager.getClient(clientUUID);
        client.friendlyName = randomName;
        client.saveSync();

        clientManager.destroy(); // should delete it

        await new Promise((resolve) => setTimeout(() => resolve(true), 1000));

        let clientAfterSave = new Client(global.Neptune.configurationManager, clientUUID)
        expect(clientAfterSave.friendlyName).not.toBe(randomName); // shouldn't be the same!
    });

    test('dropClient()', () => {
        let savedClient = new Client(global.Neptune.configurationManager, clientUUID)
        let client = clientManager.getClient(clientUUID);
        clientManager.updateSavedClientsInNeptuneConfig();

        let found = false
        neptuneConfig.clients.forEach(uuid => {
            if (uuid === clientUUID)
                found = true
        })

        expect(found).toBe(true);

        clientManager.dropClient(client);
        found = false
        neptuneConfig.clients.forEach(uuid => {
            if (uuid === clientUUID)
                found = true
        });

        expect(found).toBe(false);
    });
});


global.Neptune.tearDownConfigurations();