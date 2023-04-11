const crypto = require("crypto");
const fs = require("node:fs");


global.Neptune.setupConfigurations();

const Client = require("../src/Classes/Client");
const IPAddress = require("../src/Classes/IPAddress");
const ClientManager = require('../src/Classes/ClientManager.js');



/** @type {ClientManager} */
global.Neptune.clientManager = new ClientManager(global.Neptune.configurationManager);
const clientUUID = crypto.randomUUID();
var client = new Client(global.Neptune.configurationManager, clientUUID);


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


describe("Client (no API) tests", () => {
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


// (client) API tests
describe('Client API tests', () => {
    const request = require('supertest');
    const { app, httpServer } = require("../src/Classes/ExpressApp.js");
    const NeptuneCrypto = require("../src/Support/NeptuneCrypto.js");


    var conInitUUIDs = {};
    var apiClientUUID = crypto.randomUUID();
    var conInitUUID = crypto.randomUUID();
    function generateStep2Request(step1ResponseBody, isNewPair) {
        let bob = crypto.createDiffieHellman(Buffer.from(step1ResponseBody.p1,'base64'), Buffer.from(step1ResponseBody.g1,'base64'));
        let bobKey = bob.generateKeys();


        let bobSecret = bob.computeSecret(Buffer.from(step1ResponseBody.a1,'base64'));

        let conInitUUID = step1ResponseBody.conInitUUID;

        conInitUUIDs[conInitUUID] = {
            secret: NeptuneCrypto.HKDF(bobSecret, "mySalt1234", {hashAlgorithm: step1ResponseBody.selectedHashAlgorithm, keyLength: 32}).key
        }

        let chkMsg = Buffer.from(NeptuneCrypto.randomString(64),'utf8').toString('base64');
        let chkMsgHash = crypto.createHash('sha256').update(chkMsg).digest('hex');

        let chkMsgEncrypted = NeptuneCrypto.encrypt(chkMsg, conInitUUIDs[conInitUUID].secret); // generates a "ncrypt" string!

        conInitUUIDs[conInitUUID].chkMsg = chkMsg;
        conInitUUIDs[conInitUUID].chkMsgHash = chkMsgHash;


        return {
            "b1": bob.getPublicKey().toString('base64'), // Base64, our key
            "newPair": isNewPair,                             // New pair
            "chkMsg": chkMsgEncrypted,                   // chkMsgEncrypted (string)
            "chkMsgHash": chkMsgHash,                    // chkMsgHsah (hex)
            "chkMsgHashFunction": "sha256",              // Created via sha256

            "clientId": NeptuneCrypto.encrypt(apiClientUUID, conInitUUIDs[conInitUUID].secret), // Our name (encrypted)

            "anticipatedConfMsg": crypto.createHash("sha256").update(chkMsg + chkMsgHash).digest('hex'), // for testing
        };
    }
    /**
     * @param {(string|object)} data - JSON data to decrypt
     * @returns {object} JSON data
     */
    function decryptServerResponse(data) {
        if (typeof data !== "string")
            data = JSON.stringify(data);

        return JSON.parse(NeptuneCrypto.decrypt(data, conInitUUIDs[conInitUUID].secret));
    }
    /**
     * @param {(string|object)} data - JSON data to decrypt
     * @returns {object} JSON data
     */
    function encryptServerRequest(data) {
        if (typeof data !== "string")
            data = JSON.stringify(data);

        return NeptuneCrypto.encrypt(data, conInitUUIDs[conInitUUID].secret);
    }

    /**
     * Fires off a request to the server
     */
    function sendClientAPIRequest(command, data) {
        return request(app)
            .post('/api/v1/server/socket/' + conInitUUIDs[conInitUUID].socketUUID + '/http')
            .send({
                conInitUUID: conInitUUID,
                command: command,
                data: encryptServerRequest(data),
            });
    }

    beforeEach(async () => {
        apiClientUUID = crypto.randomUUID(); // new UUID

        const step1Data = Object.freeze({
            "supportedKeyGroups": [
                "modp14",
                "modp16",
                "modp17"
            ],
            "supportedCiphers": [
                "chacha20",
                "aes-256-gcm",
                "aes-192-gcm"
            ],
            "supportedHashAlgorithm": [
                "sha256",
                "sha512"
            ],
            "useDynamicSalt": false
        });
        var step1ResponseBody = {};

        const initiationStep1 = await request(app)
            .post('/api/v1/server/initiateConnection')
            .send(step1Data);
        step1ResponseBody = JSON.parse(initiationStep1.text);
        conInitUUID = step1ResponseBody.conInitUUID;

        expect(initiationStep1.statusCode).toBe(200);

        expect(step1ResponseBody).toHaveProperty("conInitUUID");
        expect(step1ResponseBody).toHaveProperty("g1");
        expect(step1ResponseBody).toHaveProperty("p1");
        expect(step1ResponseBody).toHaveProperty("a1");

        expect(step1ResponseBody).toHaveProperty("selectedKeyGroup");
        expect(step1Data.supportedKeyGroups).toContain(step1ResponseBody.selectedKeyGroup); // Selected a valid key group
        expect(step1ResponseBody).toHaveProperty("selectedCipher");
        expect(step1Data.supportedCiphers).toContain(step1ResponseBody.selectedCipher); // Valid cipher
        expect(step1ResponseBody).toHaveProperty("selectedHashAlgorithm");
        expect(step1Data.supportedHashAlgorithm).toContain(step1ResponseBody.selectedHashAlgorithm) // Valid algorithm

        expect(step1ResponseBody).not.toHaveProperty("g2");
        expect(step1ResponseBody).not.toHaveProperty("p2");
        expect(step1ResponseBody).not.toHaveProperty("a2");


        var step2Request = generateStep2Request(step1ResponseBody, true); // Generate our response
        var step2ResponseBody = {};
        const initiationStep2 = await request(app)
            .post('/api/v1/server/initiateConnection/' + conInitUUID)
            .send(step2Request);
        step2ResponseBody = initiationStep2.text;
        expect(initiationStep2.statusCode).toBe(200);

        expect(step2ResponseBody.trim().startsWith("ncrypt:")).toBe(true);
        step2ResponseBody = decryptServerResponse(step2ResponseBody);
        expect(step2ResponseBody).not.toHaveProperty("error");

        expect(step2ResponseBody).toHaveProperty("socketUUID");
        conInitUUIDs[conInitUUID].socketUUID = step2ResponseBody.socketUUID;
        expect(step2ResponseBody).toHaveProperty("confMsg");
        expect(step2ResponseBody.confMsg).toBe(step2Request.anticipatedConfMsg);

        // pair..
        let response = await sendClientAPIRequest("/api/v1/server/newPairRequest", {
            clientId: apiClientUUID,
            friendlyName: "MyPhone",
        });

        let pairData = JSON.parse(response.text);
        let data = decryptServerResponse(pairData.data);
        expect(pairData.command).toBe("/api/v1/server/newPairResponse");
        expect(data).toHaveProperty("pairId");
        expect(data).toHaveProperty("pairKey");
        expect(data).toHaveProperty("serverId", global.Neptune.config.serverId);
        expect(data).toHaveProperty("friendlyName", global.Neptune.config.friendlyName);
    });

    // Delete the API client
    afterEach(async () => {
        let client = global.Neptune.clientManager.getClient(apiClientUUID);
        await client.delete();
    });

    // should be connected!
    // verify echo endpoint
    test("echo endpoint: /api/v1/echo", async () => {
        let randomId = crypto.randomUUID();
        const echoData = Object.freeze({
            sampleKey: "sampleValue",
            randomId: randomId,
            message: "Hey! Testing testing!",
            boolean: true,
        });

        let response = await sendClientAPIRequest("/api/v1/echo", echoData);
        let responseData = JSON.parse(response.text);
        expect(responseData.command).toBe("/api/v1/echoed");
        expect(decryptServerResponse(responseData.data)).toMatchObject(echoData);
    });


    // disconnect
    test("unpair endpoint: /api/v1/server/disconnect", async () => {
        let response = await sendClientAPIRequest("/api/v1/server/disconnect", {});
        expect(response.statusCode).toBe(200);
    });


    // unpair (remove)
    test("unpair endpoint: /api/v1/server/unpair", async () => {
        jest.useFakeTimers();
        let client = global.Neptune.clientManager.getClient(apiClientUUID);
        const eventSpy = jest.fn();
        client.eventEmitter.on('deleted', eventSpy);

        let response = await sendClientAPIRequest("/api/v1/server/unpair", {});

        jest.advanceTimersByTime(1000);
        // Expect the event to have been emitted
        expect(eventSpy).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });
});



global.Neptune.tearDownConfigurations();