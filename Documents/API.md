# APIs

## Common API Calls:


"Packet" set between `Server<->client`
```json
{
    "connectionId": "{currentConnectionId}",
    "data": "{data being sent}",
}
```
This data is a layer on the _actual_ data the client is sending. The `data` portion is encrypted using the shared AES key and contains the command, clientId, and command parameters.
The server or client would receive this "packet" of data and peel it (decrypt the `data` portion) to read the request/response of the other application. This is to provide always applied encryption to requests and responses.\
Before we have a connectionId, we add `"negotiating": true` to signify we're setting that up.\
If the server receives a packet without a connectionId, only the `newSocketConnection` command will be accepted. 


#### Key negotiation, pairing
Before the two applications can talk to each other, we need to setup a socket connection. A socket will allow the server to send data to the client device without having to host a whole web server on the client app.

At the time of writing the idea is that the _client_ initiates the socket request, that is _client_ asks the server to for the socket details and then connects to that socket.

It is possible to host a socket server on the client side, and this may be a reasonable option so long as it doesn't obliterate the battery of the device.

A new socket connection can be called thru an existing socket itself to reestablish a shared secret. This is done once we hit the TTL limit.

1) Client sends HTTP post to `/api/v1/server/newSocketConnection`:\
    POST (client sends):\
        `acceptedKeyGroups`: DH key groups\
        `acceptedHashTypes`: allowed hash functions\
        `acceptedCrypto`: allowed crypto functions (AES256-GCM, ChaCha20, AES256-CBC, AES128-GCM, AES128-CBC)\
        `useDynamicSalt`: use separate DH exchange to derive the salt used to derive the AES key/iv.

    REPLY (server sends): g1, p1, A1, conInitId, g2, p2, A2.\
        `g1`: base _There are two, second set is optional and used to derive a salt._\
        `p1`: modulus\
        `A1`: server's public integer\
        `conInitId`: random string of length 16, used to identify the client's next call\
        `g2`, `p2`, `A2`: Are the base, modulus, and server's public integer for deriving a shared _dynamic_ salt (_if `useDynamicSalt` was true in the client's request_).

2) Client sends HTTP post to `/api/v1/server/newSocketConnection/{conInitId}`:\
    POST:\
        `B1`: client's public integer\
        `B2`: client's public integer (dynamic salt)\
        `pairId`: encrypted. Tells the server which client we are, used in deriving the salt used to create the AES key and iv. Provides the server with an assurance that we've talked before. If a client and server have not paired before, this will be empty.
        `newPair`: if the server and client have not paired before, this will be true, otherwise false or exempt. Singles that a pair request will follow after socket connection.
        `chkMsg`: encrypted random string of length 64. Encrypted using the derived AES key and iv created from the shared secret (DH). Used to validate encryption (both parties have the same key).\
        `chkMsgHash`: hash (SHA256/SHA1) of the decrypted `chkMsg` string.\
        `chkMsgHashFunction`: sha256, sha1, md5. Function used to create `chkMsgHash`.

    REPLY:\
        `socketId`: the socket id the client needs to connect to (`/api/v1/server/socket/{socketId}`).\
        `confMsg`: hash of the decrypted `chkMsg` concatenated with the `chkMsgHash`. Used to tell the client the server can decrypt and encrypt.

3) Client connects to the socket `/api/v1/server/socket/{socketId}` and finalizes connection setup:\
    Send (if already paired):\
        `command`: `/api/v1/server/newClientConnection`,
        `clientId`: the client identifier (this is who we are)\
        `pairId`: ensure the correct pair identifier was sent (likely redundant, pairIds used to derive salt/pepper)\
        `TTL`: time-to-live, how long until we require a renegotiation. (our maximum accepted time).

    Reply:\
        `command`: `/api/v1/server/newClientConnection`,
        `TTL`: decided time-to-live (will be <= client's requested TTL)
        `connectionId`: a unique identifier to represent this client connection. 


    Alternatively, if a new pair connection is needed, send:\
        `command`: `/api/v1/server/newPairRequest`,
        `TTL`: time-to-live, how long until we require a renegotiation. (our maximum accepted time).
        `clientId`: the client identifier (unique, hopefully)\
        `friendlyName`: the client's display name (_John's Phone_)\
        `listeningIpAddress`: likely the current IP of the client device, whatever the SocketServer is bound to\
        `listeningPort`: port SocketServer is bound to\
        `configuration`: the configuration data, JSON key value pair. Similar to `/api/v1/server/updateConfiguration`.

    Reply:
        `command`: `/api/v1/server/newPairResponse`,
        `pairId`: the unique identifier to represent a pair relationship between two devices (server and client)
        `sharedPairKey`: a shared key used in encryption (think of this as the salt or the pepper used to derive the AES keys). Only the server and client know this. Persistent for as long as the devices are paired, however, can be changed via a request.
        `TTL`: decided time-to-live (will be <= client's requested TTL)
        `connectionId`: a unique identifier to represent this client connection. 
        
At any time the client can send a scrap request to halt the connection `/api/v1/server/newSocketConnection/{conInitId}/scrap`. The server will delete any socket and remove any references.


### Sending data to the server:
Command: `/api/v1/server/sendNotification`:
Used to send one or more notifications to the server
```json
    [
     {
        "applicationName": "Notification Tester", // The app that created the notification
        "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
        "notificationId": "23", // Notification ID provided by Android
        "notificationIcon": "base64:image", // Base64 representation of the notification icon
        "title": "Testing", // Title of the notification
        "type": "text", // Notification type (text, image, inline)
        "contents": { // Content of the notification
            "text": "Just a basic notification", // The text description
            "image": "base64:image", // Image in base64 (may later replace with an ImageId and have client upload image as a file?)
            "actions": [
                {
                    "id": "action_read", // The 'name' of the action
                    "text": "Mark as Read", // The text displayed on the button
                    "type": "button" // Button
                }
            ]
        },
        "persistent": false,
        "color": 64132 // Color of the notification (Notification#Color)

     }   
    ]
```
Array of notifications






`client/{clientId}`: Endpoint to update client configurations


`client/{clientId}/pair`: Pair a new device
    POST: client sends:

```json
    {
        "fiendlyName": "",
        "ipAddress": "",
        "configuration": {
            "syncNotifications": true,
            "keyNegotiationType": "",
            ""
        }
    }
```

`notifications/{clientId}#`:

/api/v1/:
    client/    
    server/








# Server side 
Since this is a Node.JS application, `npm` will be used as our package manager for modules.

To "package" our Node.JS server application into a "one-click" executable we will use PKG: https://www.npmjs.com/package/pkg

Packages:
    express: Web application framework, the "web server" portion of server that receives data from the client, hosts the REST API.
    socket.io: For socket communications with the client app.
    futoin-hkdf: Used to generate a shared encryption key
    nodegui: Creating the GUI for the server application
    node-notifier: For sending notifications to the server OS.
    PKG: See above, used to package our server into a one-click application.




# Client side
Gradle.

Dependencies:
    https://github.com/patrickfav/hkdf 1.1 `implementation group: 'at.favre.lib', name: 'hkdf', version: '1.1.0'`






