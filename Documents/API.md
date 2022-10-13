# APIs

### Server side API:


"Packet" set between `Server<->client`
```{
    "connectionId": "{currentConnectionId}",
    "data": "{data being sent}",
    "checksum": ""
}```

#### Key negotiation

`client/{clientId}/key/dh_initiate`: Begin key exchange
            POST: client sends nothing
            REPLY: server sends p, g and its key

`client/{clientId}/key/dh_initiate`
            POST: client sends its key
            REPLY: 	server sends "challenge" (random string encrypted using the service's public key, tests service's identity),
                    "challengeServer" (random string encrypted using server private key, used to validate our (server's) identity),
                    "challengeServerHash" (hash of the challenge)
                    "hashMethod" the method used to generate hashes
                    "returnAddress" (random string the client should send it's computed challengeHash)

`client/{clientId}/key/challenge/{returnAddress}: Validates the computed challengeHash from a client
            POST: client sends "challengeHash" which is the computed hash of the decrypted string from "challenge"
            REPLY: server sends a new "serviceKey"




`client/{clientId}`: Endpoint to update client configurations


`client/{clientId}/pair`: Pair a new device
            POST: client sends:
                ```{
                    "fiendlyName": "",
                    "ipAddress": "",
                    "configuration": {
                        "syncNotifications": true,
                        "keyNegotiation": "",

                        "",
                        "",
                    }
                }```

`notifications/{clientId}#`:


/api/v1/:
    client/

    
    server/




# Server side 
Since this is a Node.JS application, `npm` will be used as our package manager for modules.

To "package" our Node.JS server application into a "one-click" executable we will use PKG: https://www.npmjs.com/package/pkg

Packages:
    express: Web application framework, the "web server" portion of server that receives data from the client, hosts the REST API.
    nodegui: Creating the GUI for the server application
    node-notifier: For sending notifications to the server OS.
    PKG: See above, used to package our server into a one-click application.



# Client side
Gradle.






