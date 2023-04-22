/**
 * Incoming means the API requests INCOMING to the server
 * 
 * So, client -> server
 * 
 * (we're testing how the Client class handles incoming requests from a client) 
 */

const crypto = require("node:crypto");
const path = require("node:path")

global.Neptune.setupConfigurations();

const Client = require("../src/Classes/Client");
const ClientManager = require('../src/Classes/ClientManager.js');

const Clipboard = require("../src/Classes/Clipboard.js");

const WebSocket = require('ws');

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


// (client) API tests
describe('Client API tests (server -> client)', () => {
    const supertest = require('supertest');
    const { app, httpServer } = require("../src/Classes/ExpressApp.js");
    const NeptuneCrypto = require("../src/Support/NeptuneCrypto.js");


    var request = null;
    var server = null;

    server = app.listen();
    request = supertest.agent(server);

    function generateStep2Request(clientUUID, step1ResponseBody, isNewPair) {
        let bob = crypto.createDiffieHellman(Buffer.from(step1ResponseBody.p1,'base64'), Buffer.from(step1ResponseBody.g1,'base64'));
        let bobKey = bob.generateKeys();


        let bobSecret = bob.computeSecret(Buffer.from(step1ResponseBody.a1,'base64'));

        let conInitUUID = step1ResponseBody.conInitUUID;

        let secret = NeptuneCrypto.HKDF(bobSecret, "mySalt1234", {hashAlgorithm: step1ResponseBody.selectedHashAlgorithm, keyLength: 32}).key

        let chkMsg = Buffer.from(NeptuneCrypto.randomString(64),'utf8').toString('base64');
        let chkMsgHash = crypto.createHash('sha256').update(chkMsg).digest('hex');

        let chkMsgEncrypted = NeptuneCrypto.encrypt(chkMsg, secret); // generates a "ncrypt" string!



        return {
            "b1": bob.getPublicKey().toString('base64'), // Base64, our key
            "newPair": isNewPair,                             // New pair
            "chkMsg": chkMsgEncrypted,                   // chkMsgEncrypted (string)
            "chkMsgHash": chkMsgHash,                    // chkMsgHsah (hex)
            "chkMsgHashFunction": "sha256",              // Created via sha256

            "clientId": NeptuneCrypto.encrypt(clientUUID, secret), // Our name (encrypted)

            "anticipatedConfMsg": crypto.createHash("sha256").update(chkMsg + chkMsgHash).digest('hex'), // for testing
            secret: secret,
            conInitUUID: conInitUUID,
        };
    }
    /**
     * @param {(string|object)} data - JSON data to decrypt
     * @returns {object} JSON data
     */
    function decryptServerResponse(secret, data) {
        if (typeof data !== "string")
            data = JSON.stringify(data);

        return JSON.parse(NeptuneCrypto.decrypt(data, secret));
    }
    /**
     * @param {(string|object)} data - JSON data to decrypt
     * @returns {object} JSON data
     */
    function encryptServerRequest(secret, data) {
        if (typeof data !== "string")
            data = JSON.stringify(data);

        return NeptuneCrypto.encrypt(data, secret);
    }

    /**
     * Fires off a request to the server
     * @param {ClientPairDetails} clientData
     */
    function sendClientAPIRequest(clientData, command, data) {
        return request
            .post('/api/v1/server/socket/' + clientData.socketUUID + '/http')
            .send({
                conInitUUID: clientData.conInitUUID,
                command: command,
                data: encryptServerRequest(clientData.secret, data),
            });
    }

    /**
     * @typedef {object} ClientPairDetails
     * @property {string} socketUUID - Socket id
     * @property {string} conInitUUID - Connection id
     * @property {string} secret - Shared secret
     * @property {string} clientUUID - Client id
     * @property {WebSocket} webscoket - Web socket client
     */

    /**
     * Pairs a client via HTTP
     * @returns {Promise<ClientPairDetails>} 
     */
    function pairClient() {
        return new Promise(async (resolve, reject) => {
            try {
                let clientUUID = crypto.randomUUID(); // new UUID

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

                const initiationStep1 = await request
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

                var step2Request = generateStep2Request(clientUUID, step1ResponseBody, true); // Generate our response
                var step2ResponseBody = {};
                const initiationStep2 = await request
                    .post('/api/v1/server/initiateConnection/' + conInitUUID)
                    .send(step2Request);
                step2ResponseBody = initiationStep2.text;
                expect(initiationStep2.statusCode).toBe(200);

                expect(step2ResponseBody.trim().startsWith("ncrypt:")).toBe(true);
                step2ResponseBody = decryptServerResponse(step2Request.secret, step2ResponseBody);
                expect(step2ResponseBody).not.toHaveProperty("error");

                expect(step2ResponseBody).toHaveProperty("socketUUID");
                expect(step2ResponseBody).toHaveProperty("confMsg");
                expect(step2ResponseBody.confMsg).toBe(step2Request.anticipatedConfMsg);

                let clientPairData = {
                    conInitUUID: conInitUUID,
                    secret: step2Request.secret,
                    clientUUID: clientUUID,
                }

                // pair..
                let response = await sendClientAPIRequest(clientPairData, "/api/v1/server/newPairRequest", {
                    clientId: clientUUID,
                    friendlyName: "MyPhone",
                });

                let pairData = JSON.parse(response.text);
                let data = decryptServerResponse(step2Request.secret, pairData.data);
                expect(pairData.command).toBe("/api/v1/server/newPairResponse");
                expect(data).toHaveProperty("pairId");
                expect(data).toHaveProperty("pairKey");
                expect(data).toHaveProperty("serverId", global.Neptune.config.serverId);
                expect(data).toHaveProperty("friendlyName", global.Neptune.config.friendlyName);

                clientPairData.socketUUID = step2ResponseBody.socketUUID,

                resolve(clientPairData);
            } catch (err) {
                global.Neptune.webLog.error(err);
                console.error(err);
            }
        });
    };

    /** @type {ClientPairDetails} */
    var currentClientData = null;
    beforeAll((done) => {
        httpServer.listen(25560, function() {
            done();
        });
    });

    /**
     * 
     * @returns {Promise<ClientPairDetails>}
     */
    function getSharedApiClient() {
        return new Promise((resolve) => {
            if (currentClientData !== null && currentClientData.clientUUID !== undefined) {
                resolve(currentClientData);
            } else {
                pairClient().then((data) => {
                    currentClientData = data;
                    resolve(currentClientData);
                });
            }
        });
    };

    afterAll((done) => {
        try {
            if (currentClientData !== undefined) {
                global.jestLogger.info("!!!Removing shared client: " + currentClientData.clientUUID + "!!");
                let client = global.Neptune.clientManager.getClient(currentClientData.clientUUID);
                client.delete();
            }
        } catch {}

        try {
            httpServer.close();
        } catch {}

        setTimeout(() => {
            server.close(done);
        }, 5000);
    });


    // getBattery()
    describe("Get battery request: client.getBattery()", () => {
        /** @type {Client} */
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await getSharedApiClient();
        });

        test("valid battery request", (done) => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/battery/get");
                    expect(requestData).toMatchObject({});

                    ws.close();


                    done();
                }
            });

            ws.on('open', () => {
                client.getBattery();
            });
        });
    });


    // clipboard
    describe("client.sendClipboard() -> /api/v1/client/clipboard/set", () => {
        /** @type {Client} */
        var client = undefined;
        var testClient = undefined;

        var clipboardData = {
            Text: "data:text/plain;base64, TmVwdHVuZQ==",
            Image: "data:image/bmp;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==",
        }
        beforeAll(async () => {
            oldClipboardData = await Clipboard.getStandardizedClipboardData();
            await Clipboard.setStandardizedClipboardData(clipboardData);

            testClient = await getSharedApiClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            client.clipboardSettings.enabled = true;
            client.clipboardSettings.allowClientToGet = true;
            client.clipboardSettings.allowClientToSet = true;
            client.saveSync();
        });

        test("valid sendClipboard request", (done) => {
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/clipboard/set");
                    expect(requestData.data).toHaveProperty("Text", clipboardData.Text);
                    expect(requestData.data).toHaveProperty("Image", clipboardData.Image);

                    ws.close();
                    done();
                }
            });

            ws.on('open', () => {
                client.sendClipboard(false);
            });
        });
    });
    // getClipboard()
    describe("Get clipboard request: client.getClipboard()", () => {
        /** @type {Client} */
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await getSharedApiClient();
        });

        test("valid getClipboard request", (done) => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/clipboard/get");
                    expect(requestData).toMatchObject({});

                    ws.close();


                    done();
                }
            });

            ws.on('open', () => {
                client.getClipboard(false);
            });
        });
    });

    // sendFile()
    describe("Request file download: client.sendFile()", () => {
        var fileName = "client-api-outgoing.test.js";

        /** @type {Client} */
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await getSharedApiClient();
        });

        test("valid file download request", (done) => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/filesharing/receive");
                    expect(requestData).toHaveProperty("fileUUID");
                    expect(requestData).toHaveProperty("fileName", fileName);
                    expect(requestData).toHaveProperty("authenticationCode");

                    ws.close();


                    done();
                }
            });

            ws.on('open', () => {
                client.sendFile(path.join(__dirname, fileName));
            });
        });
    });


    // syncConfiguration()
    describe("client.syncConfiguration() -> /api/v1/client/configuration/set", () => {
        /** @type {Client} */
        var client = undefined;
        var testClient = undefined;

        var expectedNotificationSettings;
        var expectedClipboardSettings;
        var expectedFileSharingSettings;
        var expectedFriendlyName;

        beforeAll(async () => {
            testClient = await getSharedApiClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            let settings = getClientSettings(true);
            client.fileSharingSettings = settings.fileSharingSettings;
            client.clipboardSettings = settings.clipboardSettingsAllFalse;
            client.notificationSettings = settings.notificationSettings;
            global.Neptune.config.friendlyName = NeptuneCrypto.randomString(16);
            global.Neptune.config.save();
            client.saveSync();

            expectedNotificationSettings = {... client.notificationSettings};
            expectedClipboardSettings = {... client.clipboardSettings};
            expectedFileSharingSettings = {... client.fileSharingSettings};
            delete expectedFileSharingSettings.notifyOnClientUpload;
            delete expectedFileSharingSettings.requireConfirmationOnClinetUploads;
            expectedFriendlyName = global.Neptune.config.friendlyName;
        });

        test("valid syncConfiguration request", (done) => {
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/configuration/set");
                    expect(requestData.friendlyName).toBe(expectedFriendlyName)
                    expect(requestData).toHaveProperty("notificationSettings");
                    expect(requestData.notificationSettings).toMatchObject(expectedNotificationSettings);
                    expect(requestData).toHaveProperty("clipboardSettings");
                    expect(requestData.clipboardSettings).toMatchObject(expectedClipboardSettings);
                    expect(requestData).toHaveProperty("fileSharingSettings");
                    expect(requestData.fileSharingSettings).toMatchObject(expectedFileSharingSettings);

                    ws.close();
                    done();
                }
            });

            ws.on('open', () => {
                client.syncConfiguration(false);
            });
        });
    });


    // client.ping()
    describe("Get ping: client.ping()", () => {
        /** @type {Client} */
        var client = undefined;
        var testClient = undefined;

        var pongData = {}
        let testRandomDelay = Math.floor(Math.random() * 10) + 1;

        beforeAll(async () => {
            testClient = await getSharedApiClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID); 
        });

        test("Can send ping and process pong", (done) => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', async function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/ping");

                    pongData = {
                        receivedAt: requestData["timestamp"],
                        timestamp: new Date()
                    }
                    let receivedAt = new Date(pongData.receivedAt);
                    receivedAt.setSeconds(receivedAt.getSeconds() - testRandomDelay); // uh yeah we totally sent the ping request X seconds ago!
                    pongData.receivedAt = receivedAt.toISOString();

                    let dataPacket = JSON.stringify({
                        conInitUUID: testClient.conInitUUID,
                        command: "/api/v1/server/pong",
                        data: encryptServerRequest(testClient.secret, pongData),
                    });

                    ws.send(dataPacket);
                    ws.close();
                }
            });

            ws.on('open', () => {
                client.ping().then((pingData) => {
                    expect(pingData).toHaveProperty("pingSentAt", new Date(pongData.receivedAt));
                    expect(pingData).toHaveProperty("pongSentAt", new Date(pongData.timestamp));
                    expect(pingData).toHaveProperty("pongReceivedAt");
                    let pongReceivedAtSentAtDelta = (pingData.pongReceivedAt.getTime() - new Date(pongData.timestamp).getTime())
                    expect(pongReceivedAtSentAtDelta).toBeGreaterThan(0);
                    expect(pongReceivedAtSentAtDelta).toBeLessThan(100);
                    expect(pingData).toHaveProperty("pingTime");

                    let testRandomDelayInMs = testRandomDelay*1000;
                    expect(pingData.RTT).toBeGreaterThan(testRandomDelayInMs - 50);
                    expect(pingData.RTT).toBeLessThan(testRandomDelayInMs + 50);

                    done();
                });
            });
        });
    });


    // Simple


    describe("client.getConInitUUID()", () => {
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await getSharedApiClient();
        });

        test("client returns correct conInitUUID", () => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            expect(client.getConInitUUID()).toBe(testClient.conInitUUID);
        })
    });
    
    describe("client.getSocketUUID()", () => {
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await getSharedApiClient();
        });

        test("client returns correct conInitUUID", () => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            expect(client.getSocketUUID()).toBe(testClient.socketUUID);
        })
    });

    describe("client.getSecret()", () => {
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await getSharedApiClient();
        });

        test("client returns hash of secret", () => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            let expected = crypto.createHash('sha256').update(testClient.secret).digest('hex');
            expect(client.getSecret()).toBe(expected);
        })
    });
    describe("client.isConnected()", () => {
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await getSharedApiClient();
        });

        test("client returns correct secret", () => {
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            expect(client.isConnected).toBe(true);
        })
    });


    // Removal
    describe("client.unpair() -> /api/v1/client/unpair", () => {
        /** @type {Client} */
        var client = undefined;
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await pairClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID);
        });

        afterAll(() => {
            client.delete();
        })

        test("unpair request", (done) => {
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/unpair");
                    expect(requestData).toMatchObject({});

                    ws.close();
                    done();
                }
            });

            ws.on('open', () => {
                client.unpair();
            });
        });
    });

    describe("client.unpair() -> /api/v1/client/unpair", () => {
        /** @type {Client} */
        var client = undefined;
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await pairClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID);
        });

        test("unpair request", (done) => {
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('message', function(message) {
                if (!hasReceived) {
                    hasReceived = true;
                    let request = JSON.parse(message);
                    let requestData = decryptServerResponse(testClient.secret, request.data);

                    expect(request.command).toBe("/api/v1/client/unpair");
                    expect(requestData).toMatchObject({});

                    ws.close();
                    done();
                }
            });

            ws.on('open', () => {
                client.delete();
            });
        });
    });

    describe("client.destroyConnectionManager() disconnects websocket", () => {
        /** @type {Client} */
        var client = undefined;
        var testClient = undefined;
        beforeAll(async () => {
            testClient = await pairClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID);
        });

        test("disconnects request", (done) => {
            let ws = new WebSocket("ws://localhost:" + httpServer.address().port + "/api/v1/server/socket/" + testClient.socketUUID);

            let hasReceived = false;
            ws.on('close', function(message) {
                hasReceived = true
            });

            ws.on('open', () => {
                client.destroyConnectionManager();
            });

            setTimeout(() => {
                expect(hasReceived).toBe(true);
                done();
            }, 500);
        });
    });
});



global.Neptune.tearDownConfigurations();