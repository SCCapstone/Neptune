const crypto = require("crypto");
const fs = require("node:fs");


global.Neptune.setupConfigurations();

const Client = require("../src/Classes/Client");
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

const MainWindow = new (require('../src/Windows/mainWindow.js'))();
MainWindow.show();

describe("Client class (non-API) tests", () => {

    var clientUUID = undefined;
    var client = undefined;

    beforeEach(() => {
        clientUUID = crypto.randomUUID();
        client = global.Neptune.clientManager.getClient(clientUUID);
        client.friendlyName = "MyTestDevice";
        client.batteryLevel = 60;
        global.testing = true;
        MainWindow.AddClientToDeviceList(client);
    });

    afterEach((done) => {
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

    afterAll(() => {
        MainWindow.hide();
    })

    test("Clipboard sharing updates buttons", async () => {
        if (MainWindow.chkSyncClipboard.isChecked())
            MainWindow.chkSyncClipboard.click(); // turn off

        expect(MainWindow.btnSendClipboard.isEnabled()).toBe(false);
        expect(MainWindow.btnReceiveClipboard.isEnabled()).toBe(false);

        MainWindow.chkSyncClipboard.click();

        expect(MainWindow.btnSendClipboard.isEnabled()).toBe(true);
        expect(MainWindow.btnReceiveClipboard.isEnabled()).toBe(true);
    });

    test("File sharing updates buttons", async () => {
        if (MainWindow.chkFileSharingEnable.isChecked())
            MainWindow.chkFileSharingEnable.click(); // turn off

        expect(MainWindow.btnSendFile.isEnabled()).toBe(false);

        MainWindow.chkFileSharingEnable.click();

        expect(MainWindow.btnSendFile.isEnabled()).toBe(true);
    });

    test("Client emits delete on delete press", () => {
        let cclient = global.Neptune.clientManager.getClient(clientUUID);
        jest.useFakeTimers();
        const eventSpy = jest.fn();
        eventSpy();
        cclient.eventEmitter.on('deleted', eventSpy);

        MainWindow.btnDelete.click();

        jest.advanceTimersByTime(1000);
        // Expect the event to have been emitted
        expect(eventSpy).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });
});