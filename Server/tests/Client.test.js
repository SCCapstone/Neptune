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

    test("can create client", () => {
        expect(client.clientId).toBe(clientUUID);
    });

    test("can save settings", () => {
        let allFalse = getClientSettings(false);
        let allTrue = getClientSettings(true);

        client.fileSharingSettings = allFalse.fileSharingSettings;
        client.clipboardSettings = allFalse.clipboardSettingsAllFalse;
        client.notificationSettings = allFalse.notificationSettings;
        client.friendlyName = "save1";
        client.IPAddress = new IPAddress("127.0.0.1", "11111");

        client.saveSync(); // save
        // change
        client.fileSharingSettings = allTrue.fileSharingSettings;
        client.clipboardSettings = allTrue.clipboardSettingsAllFalse;
        client.notificationSettings = allTrue.notificationSettings;
        client.friendlyName = "change1";
        client.IPAddress = new IPAddress("127.1.0.1", "22222");

        // load (flip back)
        client.loadSync();
        expect(client.friendlyName).toBe("save1");
        expect(client.IPAddress.toString()).toBe("127.0.0.1:11111");
        expect(client.fileSharingSettings).toMatchObject(allFalse.fileSharingSettings);
        expect(client.clipboardSettings).toMatchObject(allFalse.clipboardSettingsAllFalse);
        expect(client.notificationSettings).toMatchObject(allFalse.notificationSettings);

        // set all true
        client.fileSharingSettings = allTrue.fileSharingSettings;
        client.clipboardSettings = allTrue.clipboardSettingsAllFalse;
        client.notificationSettings = allTrue.notificationSettings;

        client.saveSync(); // save
        //flip
        client.fileSharingSettings = allFalse.fileSharingSettings;
        client.clipboardSettings = allFalse.clipboardSettingsAllFalse;
        client.notificationSettings = allFalse.notificationSettings;

        // load (flip back)
        client.loadSync();
        expect(client.fileSharingSettings).toMatchObject(allTrue.fileSharingSettings);
        expect(client.clipboardSettings).toMatchObject(allTrue.clipboardSettingsAllFalse);
        expect(client.notificationSettings).toMatchObject(allTrue.notificationSettings);
    });


    test("can delete client", () => {
        jest.useFakeTimers();
        client.delete();
        jest.advanceTimersByTime(1000);
        //await new Promise(res => setTimeout(() => { res(); }, 1000)) // delete has a 500ms delay, wait for it.
        expect(fs.existsSync('./tests/data/clients/' + clientUUID + ".json")).toBe(false);
    });


    test("emits delete on delete", () => {
        client = new Client(global.Neptune.configurationManager, clientUUID);

        jest.useFakeTimers();
        const eventSpy = jest.fn();
        client.eventEmitter.on('deleted', eventSpy);

        client.delete();

        jest.advanceTimersByTime(1000);
        // Expect the event to have been emitted
        expect(eventSpy).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });
});


global.Neptune.tearDownConfigurations();