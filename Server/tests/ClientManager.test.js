const crypto = require("crypto");
const fs = require("node:fs");


global.Neptune.setupConfigurations();

const Client = require("../src/Classes/Client");
const IPAddress = require("../src/Classes/IPAddress");
const ClientManager = require('../src/Classes/ClientManager.js');



/** @type {ClientManager} */
global.Neptune.clientManager = new ClientManager(global.Neptune.configurationManager);
/** @type {ClientManager} */
let clientManager = global.Neptune.clientManager;

function getClientSettings(value) {
    return {
        fileSharingSettings: {
            allowClientToDownload: value,
            allowClientToUpload: value,
            enabled: value,
            notifyOnClientUpload: value,
            requireConfirmationOnClinetUploads: value,
        },
        clipboardSettingsAllFalse: {
            allowClientToGet: value,
            allowClientToSet: value,
            enabled: value,
            synchronizeClipboardToClient: value,
        },
        notificationSettings: {
            enabled: value,
        }
    }
}


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
});


global.Neptune.tearDownConfigurations();