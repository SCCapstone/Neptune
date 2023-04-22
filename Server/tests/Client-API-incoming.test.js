/**
 * Incoming means the API requests INCOMING to the server
 * 
 * So, client -> server
 * 
 * (we're testing how the Client class handles incoming requests from a client) 
 */

const crypto = require("crypto");

global.Neptune.setupConfigurations();

const Client = require("../src/Classes/Client");
const ClientManager = require('../src/Classes/ClientManager.js');

const Clipboard = require("../src/Classes/Clipboard.js");


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
describe('Client API tests (client -> server)', () => {
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
     * 
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
        done();
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

        setTimeout(() => {
            server.close(done);
        }, 5000);
    });


    // verify echo endpoint
    describe("echo endpoint: /api/v1/echo", () => {
        let randomId = crypto.randomUUID();
        const echoData = Object.freeze({
            sampleKey: "sampleValue",
            randomId: randomId,
            message: "Hey! Testing testing!",
            boolean: true,
        });

        var response = {};
        var responseData = {};

        beforeAll(async () => {
            let testClient = await getSharedApiClient();

            response = JSON.parse( (await sendClientAPIRequest(testClient, "/api/v1/echo", echoData)).text );
            responseData = decryptServerResponse(testClient.secret, response.data);
        });

        test("valid response command", () => {
            expect(response.command).toBe("/api/v1/echoed");
        });

        test("response data matches request data", () => {
            expect(responseData).toMatchObject(echoData);
        });        
    });

    // ping?
    describe("ping endpoint: /api/v1/server/ping", () => {
        const pingData = {
            timestamp: new Date(),
        }
        let testRandomDelay = Math.floor(Math.random() * 10) + 1;
        pingData.timestamp.setSeconds(pingData.timestamp.getSeconds() - testRandomDelay);
        pingData.timestamp = pingData.timestamp.toISOString();

        var response = {};
        var responseData = {};

        beforeAll(async () => {
            let testClient = await getSharedApiClient();

            response = JSON.parse( (await sendClientAPIRequest(testClient, "/api/v1/server/ping", pingData)).text );
            responseData = decryptServerResponse(testClient.secret, response.data);
        });


        test("valid response command", () => {
            expect(response.command).toBe("/api/v1/client/pong");
        })

        test("valid response", async () => {
            expect(responseData).toHaveProperty("receivedAt");
            expect(responseData).toHaveProperty("timestamp");
        });

        test("valid receivedAt time", () => {
            expect(responseData.receivedAt).toBe(pingData.timestamp);
        });
    });

    // pong emits ??
    describe("pong endpoint: /api/v1/server/pong", () => {
        var pongData = {}
        let testRandomDelay = Math.floor(Math.random() * 10) + 1;


        var timesCalled = 0;
        var pongResponseData = {};

        beforeAll(async () => {
            // connect
            let testClient = await getSharedApiClient();

            // Pong time
            pongData.timestamp = new Date().toISOString();
            pongData.receivedAt = new Date(pongData.timestamp);
            pongData.receivedAt.setSeconds(pongData.receivedAt.getSeconds() - testRandomDelay);
            pongData.receivedAt = pongData.receivedAt.toISOString();

            /** @type {Client} */
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            client.getConnectionManager().on('pong', (data) => {
                timesCalled++;
                pongResponseData = data;
            });
            
            await sendClientAPIRequest(testClient, "/api/v1/server/pong", pongData);
        });

        test("connection manager emitted \"pong\" event once", () => {
            expect(timesCalled).toBe(1);
        });

        test("valid response", async () => {
            expect(pongResponseData).toHaveProperty("receivedAt");
            expect(pongResponseData).toHaveProperty("timestamp");
            expect(pongResponseData).toHaveProperty("timeNow");
        });

        test("valid receivedAt time", () => {
            expect(pongResponseData.receivedAt.toISOString()).toBe(pongData.receivedAt);
        });
        test("valid timestamp time", () => {
            expect(pongResponseData.timestamp.toISOString()).toBe(pongData.timestamp);
        });

        test("valid RTT", () => {
            // within 50ms?
            let testRandomDelayInMs = testRandomDelay*1000;
            expect(pongResponseData.RTT).toBeGreaterThan(testRandomDelayInMs - 50);
            expect(pongResponseData.RTT).toBeLessThan(testRandomDelayInMs + 50);
        });
    });


    /**
     * 
     * Configuration
     * 
     */

    // verify cannot enable notifications, file or clipboard from client
    // verify that the "enabled" for notifications, file and clipboard sharing disabled. No other changes.
    function setConfiguration(allTrue) {
        describe("configuration (set) endpoint: /api/v1/server/configuration/set: (" + (allTrue? "all true" : "all false") + ")", () => {
            /** @type {Client} */
            var client;
            var expectedNotificationSettings;
            var expectedClipboardSettings;
            var expectedFileSharingSettings;
            var expectedFriendlyName;

            beforeAll(async () => {
                let testClient = await pairClient();
                client = global.Neptune.clientManager.getClient(testClient.clientUUID);

                let original = getClientSettings(!allTrue);
                let setTo = getClientSettings(allTrue);
                client.fileSharingSettings = original.fileSharingSettings;
                client.clipboardSettings = original.clipboardSettingsAllFalse;
                client.notificationSettings = original.notificationSettings;
                client.friendlyName = "myPhone";
                client.saveSync();

                expectedNotificationSettings = {... client.notificationSettings};
                expectedClipboardSettings = {... client.clipboardSettings};
                expectedFileSharingSettings = {... client.fileSharingSettings};
                expectedFriendlyName = NeptuneCrypto.randomString(16);


                // set all settings to enable

                configData = {
                    fileSharingSettings: setTo.fileSharingSettings,
                    clipboardSettings: setTo.clipboardSettingsAllFalse,
                    notificationSettings: setTo.notificationSettings,
                    friendlyName: expectedFriendlyName,
                }

                await sendClientAPIRequest(testClient, "/api/v1/server/configuration/set", configData);
            });

            afterAll((done) => {
                client.delete();
                setTimeout(done, 1000);
            });

            test("client name not updated to undefined", () => {
                expect(client.friendlyName).toBe(expectedFriendlyName);
            });
            test("client can disable notification sync on server", () => {
                if (!allTrue)
                    expectedNotificationSettings.enabled = false;
                else
                    expectedNotificationSettings.enabled = true;
                expect(client.notificationSettings).toMatchObject(expectedNotificationSettings);
            });
            test("client can disable clipboard sharing on server", () => {
                if (!allTrue)
                    expectedClipboardSettings.enabled = false;
                expect(client.clipboardSettings).toMatchObject(expectedClipboardSettings);
            });
            test("client can disable file sharing on server", () => {
                if (!allTrue)
                    expectedFileSharingSettings.enabled = false;
                expect(client.fileSharingSettings).toMatchObject(expectedFileSharingSettings);
            });
        });
    }
    setConfiguration(true);
    setConfiguration(false);

    function getConfiguration(allTrue) {
        // can get?
        describe("configuration (get) endpoint: /api/v1/server/configuration/get (" + (allTrue? "all true" : "all false") + ")", () => {
            var client;
            var expectedNotificationSettings;
            var expectedClipboardSettings;
            var expectedFileSharingSettings;
            var expectedFriendlyName;


            var response = {};
            var responseData = {};

            beforeAll(async () => {
                let testClient = await pairClient();
                client = global.Neptune.clientManager.getClient(testClient.clientUUID);

                let settings = getClientSettings(allTrue);
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


                response = JSON.parse( (await sendClientAPIRequest(testClient, "/api/v1/server/configuration/get", {})).text );
                responseData = decryptServerResponse(testClient.secret, response.data);
            });

            afterAll((done) => {
                client.delete();
                setTimeout(done, 1000);
            });

            test("valid response command", () => {
                expect(response.command).toBe("/api/v1/server/configuration/data");
            });
            test("valid updated to settings", () => {
                expect(responseData.friendlyName).toBe(expectedFriendlyName);
            });
            test("valid notification sync settings", () => {
                expect(responseData).toHaveProperty("notificationSettings");
                expect(responseData.notificationSettings).toMatchObject(expectedNotificationSettings);
            });
            test("valid clipboard sharing settings", () => {
                expect(responseData).toHaveProperty("clipboardSettings");
                expect(responseData.clipboardSettings).toMatchObject(expectedClipboardSettings);
            });
            test("valid file sharing settings", () => {
                expect(responseData).toHaveProperty("fileSharingSettings");
                expect(responseData.fileSharingSettings).toMatchObject(expectedFileSharingSettings);
            });
        });
    }
    getConfiguration(true);
    getConfiguration(false);




    // file UUID
    function getFileUUID(requestId, fileName) {
        // can get?
        describe("new file UUID (upload) endpoint: /api/v1/server/filesharing/upload/newFileUUID"
                + (requestId === undefined? " (requestId undefined)" : "")
                + (fileName === undefined? " (fileName undefined)" : ""),
        () => {
            var client;

            var response = {};
            var responseData = {};

            beforeAll(async () => {
                let testClient = await getSharedApiClient();
                client = global.Neptune.clientManager.getClient(testClient.clientUUID);
                client.fileSharingSettings.enabled = true;
                client.fileSharingSettings.allowClientToUpload = true;
                client.save();

                let requestData = {
                    requestId: requestId,
                    fileName: fileName,
                };

                response = JSON.parse( (await sendClientAPIRequest(testClient, "/api/v1/server/filesharing/upload/newFileUUID", requestData)).text );
                responseData = decryptServerResponse(testClient.secret, response.data);
            });

            /*afterAll((done) => {
                client.delete();
                setTimeout(done, 1000);
            });*/
            test("valid response command", () => {
                expect(response.command.toLowerCase()).toBe("/api/v1/server/filesharing/upload/fileuuid");
            });
            test("valid request id", () => {
                if (requestId === undefined)
                    expect(responseData.requestId).toBe(undefined);
                else
                    expect(responseData).toHaveProperty("requestId", requestId);
            });
            test("valid has UUID", () => {
                expect(responseData).toHaveProperty("fileUUID");
            });
        });
    }
    getFileUUID(NeptuneCrypto.randomString(16), "myFileName");
    getFileUUID(NeptuneCrypto.randomString(16), undefined);
    getFileUUID(undefined, "superFile");
    getFileUUID(undefined, undefined);

    var clipboardData = {
        Text: "data:text/plain;base64, TmVwdHVuZQ==",
        Image: "data:image/bmp;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==",
    }

    // clipboard
    describe("clipboard (get) endpoint: /api/v1/server/clipboard/get", () => {
        var client;

        var response = {};
        var responseData = {};

        var oldClipboardData = {};
        
        beforeAll(async () => {
            oldClipboardData = await Clipboard.getStandardizedClipboardData();
            await Clipboard.setStandardizedClipboardData(clipboardData);

            let testClient = await getSharedApiClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            client.clipboardSettings.enabled = true;
            client.clipboardSettings.allowClientToGet = true;
            client.clipboardSettings.allowClientToSet = true;
            client.saveSync();

            response = JSON.parse( (await sendClientAPIRequest(testClient, "/api/v1/server/clipboard/get", {})).text );
            responseData = decryptServerResponse(testClient.secret, response.data);
        });

        afterAll(async () => {
            await Clipboard.setStandardizedClipboardData(oldClipboardData);
        })

        test("valid response command", () => {
            expect(response.command.toLowerCase()).toBe("/api/v1/server/clipboard/data");
        });

        test("contains status", () => {
            expect(responseData).toHaveProperty("status", "okay");
        });

        test("valid text", () => {
            expect(responseData.data).toHaveProperty("Text", clipboardData.Text);
        });
        test("valid image", () => {
            expect(responseData.data).toHaveProperty("Image", clipboardData.Image);
        });
        /*test("valid html", () => {
            expect(responseData).toHaveProperty("HTML", clipboardData.HTML);
        })*/
    });

    describe("clipboard (set) endpoint: /api/v1/server/clipboard/set", () => {
        var client;

        var response = {};
        var responseData = {};

        var oldClipboardData = {};
        var clientClipboardData;
        beforeAll(async () => {
            oldClipboardData = await Clipboard.getStandardizedClipboardData();

            let testClient = await getSharedApiClient();
            client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            client.clipboardSettings.enabled = true;
            client.clipboardSettings.allowClientToGet = true;
            client.clipboardSettings.allowClientToSet = true;
            client.saveSync();

            response = JSON.parse( (await sendClientAPIRequest(testClient, "/api/v1/server/clipboard/set", clipboardData)).text );
            responseData = decryptServerResponse(testClient.secret, response.data);

            clientClipboardData = await Clipboard.getStandardizedClipboardData();
        });

        afterAll(async () => {
            await Clipboard.setStandardizedClipboardData(oldClipboardData);
        })

        test("valid response command", () => {
            expect(response.command.toLowerCase()).toBe("/api/v1/server/clipboard/uploadstatus");
        });

        test("contains status", () => {
            expect(responseData).toHaveProperty("status", "okay");
        });

        test("valid text", () => {
            expect(clientClipboardData).toHaveProperty("Text", clipboardData.Text);
        });
        test("valid image", () => {
            expect(clientClipboardData).toHaveProperty("Image", clipboardData.Image);
        });
        /*test("valid html", () => {
            expect(responseData).toHaveProperty("HTML", clipboardData.HTML);
        })*/
    });




    // disconnect
    describe("unpair endpoint: /api/v1/server/disconnect", () => {
        test("valid response code", async () => {
            let testClient = await pairClient();
            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            
            let response = await sendClientAPIRequest(testClient, "/api/v1/server/disconnect", {});
            expect(response.statusCode).toBe(200);

            global.jestLogger.info("!!!Removing disconnect test client: " + testClient.clientUUID + "!!");
            client.delete();
        });
    });


    // unpair (remove)
    describe("unpair endpoint: /api/v1/server/unpair", () => {
        test("device emits deleted", async () => {
            testClient = await pairClient();

            let client = global.Neptune.clientManager.getClient(testClient.clientUUID);
            const eventSpy = jest.fn();
            client.eventEmitter.on('deleted', eventSpy);

            jest.useFakeTimers();
            global.jestLogger.info("!!!Unpairing (via request) unpair test client: " + testClient.clientUUID + "!!");
            await sendClientAPIRequest(testClient, "/api/v1/server/unpair", {});
            jest.advanceTimersByTime(1000);

            expect(eventSpy).toHaveBeenCalledTimes(1);
            jest.useRealTimers();
        });
    });
});



global.Neptune.tearDownConfigurations();