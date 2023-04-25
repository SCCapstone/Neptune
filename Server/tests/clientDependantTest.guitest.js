const crypto = require("crypto");
const fs = require("node:fs");


global.Neptune.setupConfigurations();

const Client = require("../src/Classes/Client");
const IPAddress = require("../src/Classes/IPAddress");
const ClientManager = require('../src/Classes/ClientManager.js');



/** @type {ClientManager} */
global.Neptune.clientManager = new ClientManager(global.Neptune.configurationManager);



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

describe("Client class (non-API) tests", () => {

    var clientUUID = null;
    var client = null;

    beforeAll(() => {
        let MainWindow = new (require('../src/Windows/mainWindow.js'))();
        clientUUID = crypto.randomUUID();
        client = new Client(global.Neptune.configurationManager, clientUUID);
    });

    afterAll((done) => {
        if (client) {
            try {
            client.delete();
        
                setTimeout(() => {
                    done();
                }, 1000);
            } catch {
                done();
            }
        } else {
            done();
        }
    });

    test("Enable clickboard sharing updates buttons", async () => {
    
    });

    /*test("emits delete on delete", () => {
        client = new Client(global.Neptune.configurationManager, clientUUID);

        jest.useFakeTimers();
        const eventSpy = jest.fn();
        client.eventEmitter.on('deleted', eventSpy);

        client.delete();

        jest.advanceTimersByTime(1000);
        // Expect the event to have been emitted
        expect(eventSpy).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });*/
});