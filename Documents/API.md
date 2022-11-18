# APIs

`/api/v1/client/` <- Hosted by the CLIENT, server sends these commands.\
`/api/v1/server/` <- Received by the SERVER, client sends these.

## API "packet":


"Packet" set between `Server<->client`
```json
{
    "connectionId": "{currentConnectionId}",
    "command": "{command being called (URL)}",
    "data": "{data being sent}",
}
```
This data is a layer on the _actual_ data the client is sending. The `data` portion is encrypted using the shared AES key and contains the command, clientId, and command parameters.
The server or client would receive this "packet" of data and peel it (decrypt the `data` portion) to read the request/response of the other application. This is to provide always applied encryption to requests and responses.\
Before we have a connectionId, we add `"negotiating": true` to signify we're setting that up.\
If the server receives a packet without a connectionId, only the `newSocketConnection` command will be accepted. 


## Key negotiation, pairing
Before the two applications can talk to each other, we need to setup a socket connection. A socket will allow the server to send data to the client device without having to host a whole web server on the client app.

At the time of writing the idea is that the _client_ initiates the socket request, that is _client_ asks the server to for the socket details and then connects to that socket.

It is possible to host a socket server on the client side, and this may be a reasonable option so long as it doesn't obliterate the battery of the device.

A new socket connection can be called thru an existing socket itself to reestablish a shared secret. This is done once we hit the TTL limit.

Data is set at the body. We do not use "the packet" for this.

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
        `clientId`: the client identifier (this is who we are, this encrypted)\
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
        `command`: `/api/v1/server/newClientConnection`,\
        `pairId`: ensure the correct pair identifier was sent (likely redundant, pairIds used to derive salt/pepper)\
        `TTL`: time-to-live, how long until we require a renegotiation. (our maximum accepted time).

    Reply:\
        `command`: `/api/v1/server/newClientConnection`,\
        `TTL`: decided time-to-live (will be <= client's requested TTL)\
        `connectionId`: a unique identifier to represent this client connection. 


    Alternatively, if a new pair connection is needed, send:\
        `command`: `/api/v1/server/newPairRequest`,\
        `TTL`: time-to-live, how long until we require a renegotiation. (our maximum accepted time).
        `clientId`: the client identifier (unique, hopefully)\
        `friendlyName`: the client's display name (_John's Phone_)\
        `listeningIpAddress`: likely the current IP of the client device, whatever the SocketServer is bound to\
        `listeningPort`: port SocketServer is bound to\
        `configuration`: the configuration data, JSON key value pair. Similar to `/api/v1/server/updateConfiguration`.

    Reply:\
        `command`: `/api/v1/server/newPairResponse`,\
        `pairId`: the unique identifier to represent a pair relationship between two devices (server and client)\
        `pairKey`: a shared key used in encryption (think of this as the salt or the pepper used to derive the AES keys). Only the server and client know this. Persistent for as long as the devices are paired, however, can be changed via a request.\
        `TTL`: decided time-to-live (will be <= client's requested TTL)\
        `connectionId`: a unique identifier to represent this client connection. 
        
At any time the client can send a scrap request to halt the connection `/api/v1/server/newSocketConnection/{conInitId}/scrap`. The server will delete any socket and remove any references.


## Notifications
Command: `/api/v1/server/image/newImageId`:
Used to create a unique "imageId" so we can upload an image
```json
{
    "imageType": "notificationIcon" // NotificationIcon, notificationImage, personImage, misc
}
```
Server replies with:
```json
{
    "imageId": "" // Random string length 16
}
```

Images are then uploaded to the file endpoint via HTTPS `/api/v1/server/image/{imageId}/upload`.
After successful upload, then we can reference that imageId. Client can request to delete an image with command: `/api/v1/server/image/{imageId}/delete`.
Images can be pulled down via `/api/v1/server/image/{imageId}/get`



### Sending data to the server:
Command: `/api/v1/server/sendNotification`:
Used to send one or more notifications to the server. Update, create or remove.
```json
[
 {
    "action": "create", // What to do with this data, how to process (create, remove, update)
    "applicationName": "Notification Tester", // The app that created the notification
    "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
    "notificationId": "23", // Notification ID provided by Android
    "notificationIcon": "base64:image", // Base64 representation of the notification icon
    "title": "Testing", // Title of the notification
    "type": "text", // Notification type (text, image, inline, chronometer)
    "contents": { // Content of the notification
        "text": "Just a basic notification", // The text description
        "subtext": "Beep bop", // Subtext
        "image": "base64:image", // Image in base64 OR
        "imageId": "", // Image id of the upload image
        "timerData": {}, // Data related to timer
        "progress": {
            "max": 100, // Maximum value
            "min": 0, // Minimum value
            "current": 50 // Current position
        },
        "actions": [
            {
                "id": "action_read", // The 'name' of the action
                "text": "Mark as Read", // The text displayed on the button
                "type": "button" // Button
            }
        ]
    },
    "extras": {}, // Extra data.
    "persistent": false, // Notification is persistent
    "color": 64132, // Color of the notification (Notification#Color)
    "onlyAlretOnce": true, // only like the sound, vibrate and ticker to be played if the notification is not already showing.
    "priority": 0, // #setImportance
    "timestamp": "2040-04-23T18:25:43.511Z", // When this item was displayed
    "timeoutAfter": "0", // duration in milliseconds after which this notification should be canceled, if it is not already canceled.
    "isActive": true // Display this.
 }   
]
```


### Reacting to a notification (response to client):
Command: `/api/v1/client/updateNotification`:
Used to activate or dismiss a notification on the client.
```json
[
 {
    "applicationName": "Notification Tester", // The app that created the notification
    "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
    "notificationId": "23", // Notification ID provided by Android
    "action": "action", // Activate, dismiss, action
    "actionParameters": {
        "id": "action_read", // Name of the action user clicked on server
    }
 }   
]
```


### Misc notification requests
Command: `/api/v1/server/getNotifications`:
Asks the client to send all active notifications over (via `/api/v1/server/sendNotification`).
```json
{
    "ignoreList": [ // Don't send these
        {
            "applicationName": "Notification Tester", // The app that created the notification
            "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
            "notificationId": "23", // Notification ID provided by Android
        }
    ]
}
```




## Configuration
### Updating client config
Command: `/api/v1/server/setConfiguration`:
Used for the client to tell the server of configuration changes. Sent during a pair as the "configuration" item)
Similar for server->client, just change client to server.
```json
{
    "clientId": "", // In case this needs to be updated (should not happen!)
    "pairKey": "", // To update the shared pair key
    "fiendlyName": "", // Device display name
    "ipAddress": "", // Current IP address of device
    "port": 123, // Port to connect to ?
    "syncNotifications": true, // Send notification data
    "notificationSettings": {}, // Notification settings
    "syncClipboard": false,
    "clipboardSettings": {
        "autoSendToServer": "", // Automatically send to server
        "autoSendToClient": "" // Automatically send to client
    },
    "fileSharing": false, // Enable file sharing
    "fileSharingSettings": {
        "autoReceiveFromServer": false, // Auto receive files from the server
        "autoReceiveFromClient": false, // Auto receive files from the client
        "clientBrowsable": false, // Server can view the files on client (remotely)
        "serverBrowsable": false // Client can view the files on the server
    }
}
```



## Unpairing a device
Command: `/api/v1/server/unpair` or `/api/v1/server/unpair`:
Used to unpair the server from the client or vice-versa.
```json
{
    "pairId": "", // Id for this particular pair
    "clientId": "", // (if going to server) client identifier
    "serverId": "", // (if going to client) server identifier
}
```
Other end will respond with `200: OK`, allowing the device that sent the request to remove and unpair.



## Misc commands
`/api/v1/server/getBatteryInfo`:
For server to request battery information of the client, no parameters.
Reply (also the data the client sends with `/api/v1/client/sendBatteryLevel`):
```json
{
    "level": 100, // Battery percentage
    "temperature": 36, // In Celsius.
    "chargerType": "discharging" // discharging, AC, computer
}
```



`/api/v1/server/ping`:
For pinging the client. Same for server, just change "client" to "server"
```json
{
    "timestamp": "2040-04-23T18:25:43.511Z" // Time command was sent
}
```
Reply:
```json
{
    "receivedAt": "2040-04-23T18:25:43.511Z", // Time we received the ping
    "timestamp": "2040-04-23T18:25:43.511Z" // Time reply was sent.
}
```




`/api/v1/server/destroyConnection`:
Kills a connection, requires a new connection to be setup via `/api/v1/server/newClientConnection`.\
Client / server request.
```json
{
    "connectionId": "" // The connection id
}
```



`/api/v1/server/destroySocket`:
Kills a socket and connection, requires a new connection to be setup via `/api/v1/server/newSocketConnection`.\
Client / server request.
```json
{
    "socketId": "", // Id of the socket
    "connectionId": "" // The connection id
}
```