# APIs

`/api/v1/client/` <- Hosted by the CLIENT, server sends these commands.\
`/api/v1/server/` <- Received by the SERVER, client sends these.


There are a few places hosted on the server's HTTP server (that is these are NOT normal 'API' endpoints/commands):\
`/api/v1/server/socket/{{socketUUID}}/`: The socket connection for a client-server connection, any path _after_ this path is used for this client-server connection only, such as\
`/api/v1/server/socket/{{socketUUID}}/http`: If the client wishes to send packet data as HTTP requests, this is where the server is listening for thse. This is an alternative to using a websocket.\
`/api/v1/server/socket/{{socketUUID}}/filesharing/{{fileUUID}}`: If a file needs to be uploaded to the server, this is where the file is uploaded at.

All other paths (commands) are not actually "real" persay, and only label what a packet is meant for ("where it should go") but these packets **must** be sent over the websocket or as a HTTP request.




## API "packet":
"Packet" set between `Server<->client`
```json5
{
    "command": "{command being called (URL)}",
    "data": "{data being sent}",
}
```
This data is a layer on the _actual_ data the client is sending. The `data` portion is encrypted using the shared AES key and contains the command, clientId, and command parameters.
The server or client would receive this "packet" of data and peel it (decrypt the `data` portion) to read the request/response of the other application. This is to provide always applied encryption to requests and responses.\



## Key negotiation, pairing
Before the two applications can talk to each other, we need to setup a socket connection. A socket will allow the server to send data to the client device without having to host a whole web server on the client app.\
At the time of writing the idea is that the _client_ initiates the socket request, that is _client_ asks the server to for the socket details and then connects to that socket.\
It is possible to host a socket server on the client side, and this may be a reasonable option so long as it doesn't obliterate the battery of the device.\
A new socket connection can be called thru an existing socket itself to reestablish a shared secret. This is done once we hit the TTL limit.\

Data is set at the body. We do not use "the packet" for this.

1) Client sends HTTP post to `/api/v1/server/initiateConnection`\
2) Client sends HTTP post to `/api/v1/server/initiateConnection/{conInitId}`\
3) Client connects to the socket `/api/v1/server/socket/{socketId}`. Everything is setup!\
_(Client can also use HTTP POST to `localhost:25560/api/v1/server/socket/{{socketUUID}}/http` rather than a socket)._

After step 1, but before step 2, the client can send a scrap request to halt the connection `/api/v1/server/initiateConnection/{conInitId}/scrap`. They can also just not respond, conInitIds automatically expire after 5 minutes.


### Step 1, client engages
Client sends an HTTP POST request to the server endpoint

Server endpoint: `/api/v1/server/initiateConnection`

POST Data:
```json5
{
    "supportedKeyGroups": ["modp14", "modp15", "modp16", "modp17", "modp18"], // Supported DH key groups
    "supportedHashAlgorithm": ["sha256"], // allowed hash functions
    "supportedCiphers": ["aes-128-gcm"], // allowed crypto functions (AES256-GCM, ChaCha20, AES256-CBC, AES128-GCM, AES128-CBC)
    "useDynamicSalt": false // use separate DH exchange to derive the salt used to derive the AES key/iv.
}
```

Response:
```json5
{
    "conInitId": "", // UUID, used to identify the client's next call
    
    "g1": "", // DH base, encoded in base64
    "p1": "", // DH modulus encoded in base64
    "a1": "", // Server's DH public key, encoded in base64
    
    "selectedCipher": "aes-128-gcm", // Cipher algorithm we've accepted
    "selectedKeyGroup": "modp16", // Key group we're using
    "selectedHashAlgorithm": "sha256", // Hash algorithm we've accepted 
    
    "g2": "", "p2": "", "a2": "", // The base, modulus, and server's public key for deriving a shared dynamic salt (if useDynamicSalt was true in the client's request).
}
```


### Step 2, client responds
Client sends an HTTP POST request to the server endpoint

Server endpoint: `/api/v1/server/initiateConnection/{conInitId}`

POST Data:
```json5
{
    "b1": "APx0efpXjbQwbHHoKdKbYk+KdVWrM9hh71YNKWO67JkuANy1+ZPGjuDBE+YPri4uaXBUDZU94A5nkDtAQvlpfq4eiRLB/5e/fw/clara/Nx190Sv56Jmmg/do+BQ3gdmy3zxnhB+N0etM5r59qyR4JAEd2/ysI44jrd1vBE/eKvCCsYDXwqopXC6yxk8aXggGkdj/sUZnVQj//CHZ5wzwVwHTyFyweT2PFvDJi3OZF0Xw/Fsm8igqJ1LQNyxSMhp7q/xirTRvC90EOR9VROOWvt7oBRiKE6ik/DfW9XtxOcNg9rkmT0/dqK0CQlxPoY+CYBJ6mARjd8+PTCXKL3yk/Hq1ESsaZvqjxZYg7GtrkebjzUu4zpwStV4pI62OLtXmqgFUalUGJpkZMqPQzWUW+eB4cg+rN+nqsrclXFHjHhnZszRr8PCm/CuzZSAWMyhG2mBNIm+0s/d2vye3OFUCCY071wsUesrGph9mHWMm3S65BDr+mF9+sjRUx91HBqg2X70KsTAEXNZw2BZOXFfKSov1B1q6CJsmO3uPL8HUweAYFw1AZxlei9eXHYp0ngaFyOnkUoFAYBwmEkx6y92rRy8PQQBjYzdz9M/fjK/N88Jcj/1t1ETqL6CgBYT6DmCNB8WoqhpG0m6Ijta7uNm9cM7wY0zn3hVS46KMFH7T95a", // Client's public DH key\
    "b2": "", // Client's public DH key (if using dynamic salt)
    
    "clientId": "ncrypt::1:aes-128-gcm:sha256:RUVeekg1dmI0WS9XPiUmV0R1KFIzXiBxbDpINUNOLig=:KUw6RUZtTksjcmBhJGNFJg==:3EC393B11AA8CBD149930839:8hRlIsC2qkESBAIBkuPBQFZRf3Ii+cVcALGXlyb4BXWW7qBY:QmU+IHk4Jz5wMnNWMTlKZg==:919A25DC8B99CD2076C78920C0A603A3", // The client UUID (this is who we are, encrypted)
    "newPair": true, // If the server and client have not paired before, this will be true, otherwise false / exempt. Signals that a pair request will follow after socket connection.
    "pairId": null, // Encrypted, used in deriving the salt used to create the AES key and iv. Provides the server with an assurance that we've talked before. Empty if client/server have not paired before.
    
    "chkMsg": "ncrypt::1:aes-128-gcm:sha256:O2cqOX1meEtpezNDPW1CLzpxSCx8J011b144UygqLEs=:QmVVV3c/OUk/bEVHYXBMVg==:22EC86E04EE135E955A622BC:mMHBlVYVyO87M4/3vNA3Rk3gzAHF9p+i7P9lrAUU1faswy8oTINkhAo8GYkmR6xHPNoo2cJtyyVfoziujO3hQZS/cfhW42RfQNxmWJsDV3MqsVk6ko9kcg==:YXxLeW85ZGp9IT00MU9bKg==:8589AC6767870C8B6A06767A13E035CF", // Encrypted random string of length 64. Encrypted using the derived AES key and iv created from the shared secret (DH). Used to validate encryption (both parties have the same key).
    "chkMsgHash": "C44E54A1A4DA0C8FE4FEA4C6270BBBFE918481CBA17BCB59D41156328463991E", // hash (SHA256/SHA1) of the decrypted chkMsg string.
    "chkMsgHashFunction": "sha256", // sha256, sha1, md5. Function used to create chkMsgHash. Should be the selectedHashAlgorithm
}
```

Response:
```json5
{
    "socketId": "708384c6-e8fe-4188-97b0-95988b5db546", // The socket id the client needs to connect to (/api/v1/server/socket/{socketId}).
    "confMsg": "c6e5e46c59267114f91d64df0e069b0dae176f9a134656820bba1e6164318980", // Hash of the decrypted chkMsg concatenated with the chkMsgHash. Used to tell the client the server can decrypt and encrypt.
}
```


### Step 3, client connects
Client connects to the socket hosted at `/api/v1/server/socket/{socketId}`.\
Everything is setup!\
_Client can also use HTTP POST to `localhost:25560/api/v1/server/socket/{{socketUUID}}/http` rather than a socket._



### Pairing
Used to pair the two devices together. If the client and server are not paired, the server ignores all requests and deletes the client configuration on exit.

Server endpoint: `/api/v1/server/newPairRequest` -> `/api/v1/server/newPairResponse`

POST Data:
```json5
{
    "clientId": "1631278c-83d1-4371-a678-f0a9aae192f9", // Client UUID (repetitive, sent in previous request)\
    "friendlyName": "John's Phone", // Client's display name
}
```

Response:
```json5
{
    "pairId": "2980d4de-d59d-4d6a-8cb2-88360a1d768f", // the unique identifier (UUID) to represent a pair relationship between two devices (server and client)\
    "pairKey": "sRDHHmu^VXDqpn[bAjuAywZxSfCiOyPf_tMMUqRcdTp][[kpLXRkZwNB`qUfMBTN", // A shared key only the server and client know. Persistent for as long as the devices are paired, but can changed via a request.
    "serverId": "726b3f84-ff46-4a84-b42d-dfd8acd882a6", // UUID of the server
    "friendlyName": "Bob's computer" // Friendly name of the server
}
```



---



## File sharing
File sharing is centered around the server. That is, the client downloads the files from the server and the client uploads the files to the client. The server does **not** download from the client and does **not** upload to the client.


### Uploading (client -> server)
Uploading a file to the server requires 2 steps:
1) Client requests a new file upload id, that is a unique string used to determine the URL used to upload a file (also includes metadata).
2) Client uploads raw file (regular web upload) to the special URL.

Here's the steps broken further down:
1) Client sends a request to the server with information about the file upload (file name, size, date, etc)
2) Server replies with a UUID (fileUUID). This UUID is used only for _this_ upload.
3) Client uploads (regular HTTP upload) to the unique URL (`/api/v1/server/socket/{{socketUUID}}/filesharing/{{fileUUID}}`)

The filesharing upload can be used for other things than _just_ file sharing, such as large images from the clipboard, images from notifications, etc.\
Set upload types:
```c#
enum UploadType {
    FileSharing = 0, // This file is being uploaded as a part of file sharing. Save this file, treat as file sharing.
    NotificationImage = 1, // If a notification is a "big image" (contains an image) then this is the image that notification contains. This is going to be used in a notification.
    NotificationIcon = 2, // Notifications have icons, if the icon, for whatever reason, cannot be uploaded in base64 in the original notification data then this would be how it is uploaded.
    ClipboardImage = 5, // This is an image is going to be a part of the clipboard. Do not treat this as file sharing, put in clipboard.
}
```

The server will save all files uploaded, _then_ follow the auto receive/prompt user. All files are saved to the server under the UUID and without any file extensions until it is determined that the file is to be accepted by the user. This is to prevent any acidental executation of unallowed files.



Step one is generating this UUID:

#### Generating a file UUID:
Server endpoint: `/api/v1/server/filesharing/upload`

POST Data:
```json5
{
    "filename": "myDocument.pdf", // Name of the file being uploaded. Raw name, extension and all
    "extension": "pdf", // File type/extension
    "uploadType": 0, // What this upload is for, why this is being uploaded (see: filesharing.uploadType)
    "notificationId": 1234, // If upload type is NotificationImage (1) or NotificationIcon (2) then this is the notification this image belongs to
}
```

Response:
```json5
{
    "fileUUID": "d5a11522-99b2-4a99-8e0c-1017f7e1efa2" // The file UUID, this is used to create the URL to upload the file.
}
```

#### Uploading file:
Files are to uploaded, _not in a packet, over websocket or otherwise_, to `/api/v1/server/socket/{{socketUUID}}/filesharing/{{fileUUID}}` -> (response) `/api/v1/server/filesharing/uploadStatus`

Data sent: the raw file.

Response:
```json5
{
    "status": "success" // Whether or not the file was successfully downloaded by the server or not (going to be likely if you're receiving this resposne at all)
    "approved": true, // If filesharing, whether the file was approved or not.
}
```


### Downloading (server -> client)
The server is required to notify the client that a file needs to be downloaded, which follows:\
1) Server notifies the client of a new file that needs to be downloaded\
2) Client connects using the fileUUID and downloads said file


#### Request client to download:
If the server wants to send a file to the client, it has to tell it _what_ it is downloading:\
Client endpoint: `/api/v1/client/filesharing/receive` -> (no respone)

POST Data:
```json5
{
    "fileUUID": "d5a11522-99b2-4a99-8e0c-1017f7e1efa2", // The file UUID the client needs to download
    "authenticationCode": "1234", // Code used to authenticate the client

    "filename": "myDocument.pdf", // Name of the file being uploaded. Raw name, extension and all
    "extension": "pdf", // File type/extension
}
```

Reponse: none

#### Downloading from server:
Server endpoint (raw, not over websocket): `/api/v1/server/socket/{{socketUUID}}/filesharing/{{fileUUID}}` -> _raw file data_

POST Data:
```json5
{
    "authenticationCode": "1234", // Code to authenticate the client
}
```

Response data: _raw file data_



---



## Clipboard
No special endpoints required, all data can be sent as normally as a packet.\
At the time we are targeting raw text (no rich text) and images. Possibility to include rich text is possible, but any other type of arbitrary data may pose a risk.


There are multiple types of data that can be stored inside the clipboard of each host OS. We **do not** support all types, but do support some of the more major ones.\
For a list of types on Windows, see: https://learn.microsoft.com/en-us/windows/win32/dataxchg/standard-clipboard-formats \
Data types:
```c#
{
    enum ClipboardDataType {
        Binary = 0, // Binary or raw data. Encoded as base64
        Text = 1, // Text data, Unicode
        RichText = 2, // Rich text data
        HTML = 5, // HTML format
        Image = 10, // Image data, treat as raw here
        DIBv5 = 11, // DIBv5 image format
        DIB = 12, // Standard windows DIB format
        PNG = 13, // PNG data
        JPG = 14, // JPG data
    }
}
```

HTML is used, some times in conjuction to rich text, to keep formatting data.


### Sending clipboard
Server endpoint: `/api/v1/server/clipboard/upload` -> `/api/v1/server/clipboard/uploadStatus`\
Client endpoint: `/api/v1/client/clipboard/upload` -> `/api/v1/client/clipboard/uploadStatus`

POST Data:
```json5
{
    "data": "1234ABC my clipboard data!", // Clipboard contents
    "dataType": 1, // Data type, text, image, richtext, binrary. (See: clipboard.dataType)
    "encoding": "utf8", // How the data is encoded (almost always base64)
}
```

Response:
```json5
{
    "status": "success" // Whether or not the file was successfully downloaded by the server or not (going to be likely if you're receiving this resposne at all)
    "approved": true, // If filesharing, whether the file was approved or not.
}
```


### Requesting clipboard
Server endpoint: `/api/v1/server/clipboard/request` -> `/api/v1/server/clipboard/data`\
Client endpoint: `/api/v1/client/clipboard/request` -> `/api/v1/client/clipboard/data`

POST Data: (no data necessary)
```json5
{}
```

Response:
```json5
{
    "data": "1234ABC my clipboard data!", // Clipboard contents
    "dataType": 1, // Data type, text, image, richtext, binrary. (See: clipboard.dataType)
    "encoding": "utf8", // How the data is encoded (almost always base64)
}
```

---



## Notifications
_NOTE: this is a work in progress, API subject to drastic change_

### Images
_See filesharing and uploading. Use upload type `Image`._



### Sending notifications to the server:
Used to send one or more notifications to the server. Update, create or remove.

Server endpoint: `/api/v1/server/sendNotification` -> (no response)

POST Data:
```json5
[
 {
    "action": "create", // What to do with this data, how to process (create, remove, update)
    "applicationName": "Notification Tester", // The app that created the notification
    "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
    "notificationId": 23, // Notification ID provided by Android, used to refer to this notification on either end
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
    "onlyAlertOnce": true, // only like the sound, vibrate and ticker to be played if the notification is not already showing.
    "priority": 0, // #setImportance
    "timestamp": "2040-04-23T18:25:43.511Z", // When this item was displayed
    "timeoutAfter": 0, // duration in milliseconds after which this notification should be canceled, if it is not already canceled.
    "isActive": true // Display this.
 }   
]
```

No response:



### Activating/dismissing a notification:
Used to activate or dismiss a notification on the client.

Client endpoint: `/api/v1/client/updateNotification` -> (no response)

POST Data:
```json5
[
 {
    "applicationName": "Notification Tester", // The app that created the notification
    "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
    "notificationId": "23", // Notification ID provided by Android
    "action": "action", // Activate, dismiss, action
    "actionParameters": {
        "id": "action_read", // Name of the action user clicked on server
        "text": "" // If action included text, this would be the text.
    }
 }   
]
```

No response



### Misc notification requests
Asks the client to send all active notifications over (via `/api/v1/server/sendNotification`).

Client endpoint: `/api/v1/server/getNotifications` -> (no response)

POST Data:
```json5
{
    "ignoreList": [ // Don't send these, (optional)
        {
            "applicationName": "Notification Tester", // The app that created the notification
            "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
            "notificationId": "23", // Notification ID provided by Android
        }
    ]
}
```

No response


---


## Configuration
### Set configuration
Used to sync common configuration settings between the two devices.

Sever endpoint: `/api/v1/server/configuration/set` -> (no response)\
Client endpoint: `/api/v1/client/configuration/set` -> (no response)


Data
```json5
{
    "fiendlyName": "", // Device display name
    "notificationSettings": { // Notification settings
        "enabled": true // Send notification data
    },
    "clipboardSettings": {
        "enabled": false, // this && two below
        "autoSendToServer": false, // Automatically send to server (sent and ignored by client)
        "autoSendToClient": false // Automatically send to client (sent and ignored by server)
    },
    "fileSharingSettings": {
        "enabled": false, // Enable file sharing
        "autoReceiveFromServer": false, // Auto receive files from the server (sent and ignored by client)
        "autoReceiveFromClient": false, // Auto receive files from the client (sent and ignored by server)
        "serverBrowsable": false, // Client can view the files on the server (sent and ignored by server)
        "clientBrowsable": false // Server can view the files on client (remotely) (sent and ignored by client)
    }
}
```

No response



### Get configuration
Used to retrieve current configuration data from the other side

Sever endpoint: `/api/v1/server/configuration/get` -> `/api/v1/server/configuration`\
Client endpoint: `/api/v1/client/configuration/get` -> `/api/v1/client/configuration`

POST data:
```json5
{}
```

Response:
```json5
{
    "fiendlyName": "", // Device display name
    "notificationSettings": { // Notification settings
        "enabled": true // Send notification data
    },
    "clipboardSettings": {
        "enabled": false, // this && two below
        "autoSendToServer": false, // Automatically send to server (sent and ignored by client)
        "autoSendToClient": false // Automatically send to client (sent and ignored by server)
    },
    "fileSharingSettings": {
        "enabled": false, // Enable file sharing
        "autoReceiveFromServer": false, // Auto receive files from the server (sent and ignored by client)
        "autoReceiveFromClient": false, // Auto receive files from the client (sent and ignored by server)
        "serverBrowsable": false, // Client can view the files on the server (sent and ignored by server)
        "clientBrowsable": false // Server can view the files on client (remotely) (sent and ignored by client)
    }
}
```


---


## Unpairing a device
Used to unpair the server from the client or vice-versa.

Server endpoint: `/api/v1/server/unpair` -> no reply\
Client endpoint: `/api/v1/client/unpair` -> no reply

POST data:
```json5
{}
```

Other end will not respond, the device that sent the request will remove and unpair regardless of the other end.


---


## Misc commands

### Battery
Used to request battery information of a device, no parameters.


Server command: `/api/v1/server/battery/getInfo` -> (reply) `/api/v1/server/battery/info`\
Client command: `/api/v1/client/battery/getInfo` -> (reply) `/api/v1/client/battery/info`\
POST data:
```
{}
```

Response data:
```json5
{
    "level": 100, // Battery percentage
    "temperature": 36, // In Celsius.
    "chargerType": "discharging" // discharging, AC, UBS, wireless, whatever
    "batteryTimeRemaining": 24 // time in seconds until fully charged. Android P and higher.
}
```



### Ping
Used to measure the amount of delay between two devices. **NOTE:** the time on the machines can _and will_ differ. Do not use these times. Instead, you should ping then use calculate the difference from the time YOU sent to the time YOU received the pong reply. This way the time is not goofy.

Server endpoint: `/api/v1/server/ping` -> `/api/v1/client/pong`\
Client endpoint: `/api/v1/client/ping` -> `/api/v1/server/pong`

POST data:
```json5
{
    "timestamp": "2040-04-23T18:25:43.511Z" // Time ping was sent
}
```


Reply:
```json5
{
    "receivedAt": "2040-04-23T18:25:43.511Z", // Time we received the ping
    "timestamp": "2040-04-23T18:25:43.711Z" // Time reply was sent.
}
```



### Scrap connection initiation
Kills a connection, requires a new connection to be setup via `/api/v1/server/initiateConnection`.

Server endpoint: `/api/v1/server/initiateConnection/{conInitId}/scrap` -> (no response)\
Client endpoint: `/api/v1/client/initiateConnection/{conInitId}/scrap` -> (no response)

POST data:
```json5
{
    "reason": "" // Optional reason, logged and shown to user
}
```

No response



### Disconnect
Used to disconnect from the device after a connection initiation has taken place. Will require a new connection to be setup via `/api/v1/server/initiateConnection` afterwards.

Server endpoint: `/api/v1/server/disconnect` -> (no response)\
Client endpoint: `/api/v1/client/disconnect` -> (no response)

POST data:
```json5
{}
```

No response (they've disconnected).




### Acknowledge
Used by the server to tell the client request was received and there is no response generated. (So the client stops waiting for a resposne.)

Server will respond with `/api/v1/server/ack` on all requests that otherwise do NOT have a response. No data with this response.
