/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 * 
 *      Client Impersonator: pretend to be a client to mimic and test client<->server interaction (test script, in a way)
 */


// const ConfigManager = require('./../src/Classes/ConfigurationManager.js');
// const ConfigItem = require('./../src/Classes/ConfigItem.js');

const http = require('http');
const Express = require('express'); // also kinda important
    
const app = Express();
// app.use(Express.urlencoded());
app.use(Express.json());


const httpServer = http.createServer(app);

// Web page
app.get("/", (req, res) => {
    res.end(`<html>
    <head>
        <title>Neptune (clientImpersonator)</title>
    </head>
    <body>
        <h1>Oh my Neptune.</h1>
    </body>
</html>`);
});


var conInitUUIDs = {};



const crypto = require("node:crypto");
const convert = (str, from, to) => Buffer.from(str, from).toString(to);

const NeptuneCrypto = require("../src/Support/NeptuneCrypto.js");
const { decode } = require('punycode');

// https://nodejs.org/api/crypto.html#class-diffiehellman
app.post('/respondTo/api/v1/server/initiateConnection', (req, res) => {
    console.log("Received: " + JSON.stringify(req.body));

    let bob = crypto.createDiffieHellman(Buffer.from(req.body.p1,'base64'), Buffer.from(req.body.g1,'base64'));
    let bobKey = bob.generateKeys();


    let bobSecret = bob.computeSecret(Buffer.from(req.body.a1,'base64'));

    let conInitUUID = req.body.conInitUUID;

    conInitUUIDs[conInitUUID] = {
        secret: NeptuneCrypto.HKDF(bobSecret, "mySalt1234", {hashAlgorithm: req.body.selectedHashAlgorithm, keyLength: 32}).key
    }

    let chkMsg = Buffer.from(NeptuneCrypto.randomString(64),'utf8').toString('base64');
    let chkMsgHash = crypto.createHash('sha256').update(chkMsg).digest('hex');

    let chkMsgEncrypted = NeptuneCrypto.encrypt(chkMsg, conInitUUIDs[conInitUUID].secret); // generates a "ncrypt" string!

    conInitUUIDs[conInitUUID].chkMsg = chkMsg;
    conInitUUIDs[conInitUUID].chkMsgHash = chkMsgHash;


    let responseString = JSON.stringify({
        "b1": bob.getPublicKey().toString('base64'), // Base64, our key
        "newPair": true,                             // New pair
        "chkMsg": chkMsgEncrypted,                   // chkMsgEncrypted (string)
        "chkMsgHash": chkMsgHash,                    // chkMsgHsah (hex)
        "chkMsgHashFunction": "sha256",              // Created via sha256

        "clientId": NeptuneCrypto.encrypt("testClient", conInitUUIDs[conInitUUID].secret), // Our name (encrypted)

        "anticipatedConfMsg": crypto.createHash("sha256").update(chkMsg + chkMsgHash).digest('hex'), // for testing
    });
    console.log("Responded to UUID: " + conInitUUID);
    res.status(200).send(responseString);
});

app.post('/respondTo/api/v1/server/initiateConnection/:conInitUUID', (req, res) => {
    try {
        let conInitUUID = req.params.conInitUUID;
        if (conInitUUIDs[conInitUUID] == undefined) {
            console.error("Unknown UUID");
            res.status(400).send("{\"error\": \"Unknown conInitUUID\" }");
            return;
        }
        console.log("Step 2 decrypt for UUID" + conInitUUID);

        console.log(req.body);

        let decryptedData = NeptuneCrypto.decrypt(req.body.data, conInitUUIDs[conInitUUID].secret);

        try {
            let data = JSON.parse(decryptedData);
            if (data["confMsg"] !== null) {
                let chkMsg = conInitUUIDs[conInitUUID].chkMsg;
                let chkMsgHash = conInitUUIDs[conInitUUID].chkMsgHash;
                data["expectedConfMsg"] = crypto.createHash("sha256").update(chkMsg + chkMsgHash).digest('hex')
            }
            decryptedData = JSON.stringify(data);
        } catch(e) {
            console.error(e);
        }

        console.log("Sending: " + decryptedData);
        res.status(200).send(decryptedData);
    } catch(error) {
        res.status(500).send({
            error: "Failed to decrypt data.",
            errorCode: error.toString()
        });
    }
});



// Listener
httpServer.listen(25561, () => {
    console.log("Express server listening on port 25561");
});