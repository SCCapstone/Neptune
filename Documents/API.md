# ZeroConf Service
Neptune utilizes a ZeroConfig network service to advertise Neptune servers which Neptune clients will see and present to the user for pairing.\
ZeroConfig, Bonjour, etc, is technology used by many devices and services and has become nearly essential in allowing devices to talk to each other without configuring them, hence the name _zero config(uration)_.\
Ever wondered why your Chromecast appears on your phone? How Windows is able to detect printers on your network? That would be this (sorta, at the end of the day we're achieving the same goal although some discovery services are technically different).


The service name we use is named "neptune" (go figure). The server will advertise itself using "Server:" and the server's UUID. So, the name of the advertisement server sends out is "Server:00000000-0000-0000-0000-000000000000".\
The advertisement sets the port to the configured port the Server is using (`25560` by default).\
We also advertise the friendly name of the computer (so the user can see the server's name in the AddDevice page) and the version of Neptune server running.\
Due to the way these advertisements are broadcast, the device IP is automatically set and correct for whichever interface the broadcast is sent out on.


So, this is what a normal advertisement looks like:
```json5
{
    "Name": "Server:00000000-0000-0000-0000-000000000000", // Server:<server UUID>
    "RegType": "_neptune._tcp", // Service name, protocol (TCP = HTTP)
    "Domain": "local.", // Always
    "Address": "<server's address>:25560", // Address of the interface this was broadcasted on
    "TXT": {
        "name": "MyComputer", // Server's friendly name
        "version": "1.0.0-debug+R1" // Server's version
    }
}
```

Here's an example broadcast (ServiceBrowser app for Android):\
<img alt="Neptune Server ZeroConf broadcast" src="https://user-images.githubusercontent.com/55852895/230802665-2ac4ad7e-1934-4019-8f0c-f16ea8070dc3.png" height="300px" />

_And on the client app:_\
<img alt="Neptune Client ZeroConf" src="https://user-images.githubusercontent.com/55852895/230803091-21783a82-4ac7-4a9f-8ba4-eedffd7ede8e.png" height="250px" />




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



## Server Queuing
Queuing is an alternative method to sending data to the client.\
If a WebSocket connection is not established, Neptune Server will store all requests in a 'queue'. This queue can be retrieved using `/api/v1/server/requestQueue/get`.\
The server will then respond with an array of request, (data "packets"), the client will then have to deal with as a batch.

POST Data:
```json5
{}
```

Server response (multiple items):
```json5
{
    "command": "/api/v1/server/requestQueue/queue",
    "data": [
        {
            "command": "/api/v1/client/configuration/set",
            "data": {
                // ...
            }
        },
        {
            "command": "/api/v1/client/battery/get",
            "data": {}
        },
        {
            // ...
        }
    ]
}
```
One item:
```json5
{
    "command": "/api/v1/server/requestQueue/queue",
    "data": {
        "command": "/api/v1/client/battery/get",
        "data": {}
    }
}
```

For server responses, the root data property is encrypted as normal. But, for each request packet in data, those packet's data properties are also encrypted.\
For example with two requests, this would the outer response:
```json5
{
    "command": "/api/v1/server/requestQueue/queue",
    "data": "blah blah encrypted data"
}
```
`data` would be decrypted to:
```json5
[
    {
        "command": "/api/v1/client/battery/get", // API endpoint
        "data": "blah blah encrypted data" // Encrypted data...
    },
    {
        "command": "/api/v1/client/configuration/set", // Endpoint
        "data": "blah blah encrypted data" // Encrypted data...
    }
]
    
```


## Client Queuing
The client can also queue up requests. This is done if the client is unable to reach the server when the request was made.\
**Note: polling requests DO NOT queue!**\
The queue is drained (sent to the server) when a request is able to reach the server or when the client polls the server.\

Server endpoint (client sending queue): `/api/v1/client/requestQueue/queue` (this represents the queue of the client)\
Client endpoint (requesting): `/api/v1/client/requestQueue/get` (this requests the queue of the client)

Sending the queue to the server is the exact same as the response from server when requesting the queue (the above response data is our request data!)

POST Data:\
Multiple items:
```json5
{
    "command": "/api/v1/client/requestQueue/queue",
    "data": [
        {
            "command": "/api/v1/server/configuration/data",
            "data": {
                // ...
            }
        },
        {
            "command": "/api/v1/client/battery/info",
            "data": {}
        },
        {
            // ...
        }
    ]
}
```
One item:
```json5
{
    "command": "/api/v1/server/requestQueue/queue",
    "data": {
        "command": "/api/v1/client/battery/info",
        "data": {}
    }
}
```

For client requests, the root data property is encrypted as normal. But, for each request packet in data, those packet's data properties are also encrypted.\
For example with two requests, this would the outer response:
```json5
{
    "command": "/api/v1/client/requestQueue/queue",
    "data": "blah blah encrypted data"
}
```
`data` would be decrypted to:
```json5
[
    {
        "command": "/api/v1/client/battery/info", // API endpoint
        "data": "blah blah encrypted data" // Encrypted data...
    },
    {
        "command": "/api/v1/client/configuration/data", // Endpoint
        "data": "blah blah encrypted data" // Encrypted data...
    }
]
    
```

There's no response to this request.



---



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
    
    "clientId": "ncrypt::1:aes-128-gcm:sha256:RUVeekg1dmI0WS9XPiUmV0R1KFIzXiBxbDpINUNOLig=:KUw6RUZtTksjcmBhJGNFJg==:3EC393B11AA8CBD149930839:8hRlIsC2qkESBAIBkuPBQFZRf3Ii+cVcALGXlyb4BXWW7qBY:QmU+IHk4Jz5wMnNWMTlKZg==:919A25DC8B99CD2076C78920C0A603A3", // The client UUID (this is who we are, encrypted). NOTE!!! This is encrypted using a key generated using a static salt! All other data is encrypted with a key generated using the pairKey (if present) this is NOT! Static salt: "mysalt1234"
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
    "socketUUID": "708384c6-e8fe-4188-97b0-95988b5db546", // The socket id the client needs to connect to (/api/v1/server/socket/{socketId}).
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


The server will save all files uploaded, _then_ follow the auto receive/prompt user. All files are saved to the server under the UUID and without any file extensions until it is determined that the file is to be accepted by the user. This is to prevent any acidental executation of unallowed files.



Step one is generating this UUID:

#### Generating a file UUID:
Server endpoint: `/api/v1/server/filesharing/upload/newFileUUID` -> `/api/v1/server/filesharing/upload/fileUUID`

POST Data:
```json5
{
    "requestId": 123, // Client provided id to track which file this uuid is for, returned as is in response.
    "fileName": "myDocument.pdf", // Name of the file being uploaded. Raw name, extension and all
}
```

Response:
```json5
{
    "fileUUID": "d5a11522-99b2-4a99-8e0c-1017f7e1efa2", // The file UUID, this is used to create the URL to upload the file.
    "requestId": 123, // Client provided id to track which file this is for
}
```
If not allowed, no fileUUID we be provided.



#### Uploading file:
Files are to uploaded, _not in a packet, over websocket or otherwise_, to `/api/v1/server/socket/{{socketUUID}}/filesharing/{{fileUUID}}/upload` -> (response) `/api/v1/server/filesharing/uploadStatus`

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
    "fileName": "abc" // Name of the file
}
```

Reponse: none

#### Downloading from server:
Server endpoint (raw, not over websocket): `/api/v1/server/socket/{{socketUUID}}/filesharing/{{fileUUID}}/download` -> _raw file data_

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
We send the following formats across: text (plain, Unicode/ASCII), image data (bitmap, png, DIB), rich text, HTML data.\


There are multiple types of data that can be stored inside the clipboard of each host OS. We **do not** support all types, but do support some of the more major ones.\
For a list of types on Windows, see: https://learn.microsoft.com/en-us/windows/win32/dataxchg/standard-clipboard-formats \
For Server, there's the Clipboard class that get/sets the clipboard data.\
**Read data from Windows, all line endings are changed to just a linefeed character (we remove the carriage return). Setting data in Windows we replace all line endings with a carriage return/linefeed combination (we add a carriage return).**\
Here's an example of RichText clipboard data in Windows. (The data is "Abc" copied from `write.exe`):
```json5
{
    "RTF As Text": "data:application/octet-stream;hex, 7B5C727466315C616E73695C616E7369637067313235325C64656666305C6E6F7569636F6D7061745C6465666C616E67313033337B5C666F6E7474626C7B5C66305C666E696C5C6663686172736574302043616C696272693B7D7D0D0A7B5C2A5C67656E657261746F722052696368656432302031302E302E31393034317D5C766965776B696E64345C756331200D0A5C706172645C73613230305C736C3237365C736C6D756C74315C66305C667332325C6C616E6739204162635C7061720D0A7D0D0A00",
    "Text": "data:text/plain;base64, QQBiAGMA",
    "RichEdit Binary": "data:application/octet-stream;hex, 80885800000081901800000041C012000000430061006C00690062007200690084901C00000094881600000040180000431000004418DC004A200900000085901A0000009588140000004820C80000004920170000004B100500A08816000000A8C0080000004162630DA9180000AC180000",
    "Object Descriptor": "data:application/octet-stream;hex, 7800000080DCFD73A9AE1A1098A700AA00374959010000000000000000000000000000000000000000000000340000005600000057006F0072006400700061006400200044006F00630075006D0065006E007400000057006F0072006400700061006400200044006F00630075006D0065006E0074000000",
    UnicodeText: "data:text/plain;base64, QQBiAGMA",
    "Rich Text Format Without Objects": "data:application/octet-stream;hex, 7B5C727466315C616E73695C616E7369637067313235325C64656666305C6E6F7569636F6D7061745C6465666C616E67313033337B5C666F6E7474626C7B5C66305C666E696C5C6663686172736574302043616C696272693B7D7D0D0A7B5C2A5C67656E657261746F722052696368656432302031302E302E31393034317D5C766965776B696E64345C756331200D0A5C706172645C73613230305C736C3237365C736C6D756C74315C66305C667332325C6C616E6739204162635C7061720D0A7D0D0A00",
    "Rich Text Format": "data:text/rtf;base64, ewBcAHIAdABmADEAXABhAG4AcwBpAFwAYQBuAHMAaQBjAHAAZwAxADIANQAyAFwAZABlAGYAZgAwAFwAbgBvAHUAaQBjAG8AbQBwAGEAdABcAGQAZQBmAGwAYQBuAGcAMQAwADMAMwB7AFwAZgBvAG4AdAB0AGIAbAB7AFwAZgAwAFwAZgBuAGkAbABcAGYAYwBoAGEAcgBzAGUAdAAwACAAQwBhAGwAaQBiAHIAaQA7AH0AfQANAAoAewBcACoAXABnAGUAbgBlAHIAYQB0AG8AcgAgAFIAaQBjAGgAZQBkADIAMAAgADEAMAAuADAALgAxADkAMAA0ADEAfQBcAHYAaQBlAHcAawBpAG4AZAA0AFwAdQBjADEAIAANAAoAXABwAGEAcgBkAFwAcwBhADIAMAAwAFwAcwBsADIANwA2AFwAcwBsAG0AdQBsAHQAMQBcAGYAMABcAGYAcwAyADIAXABsAGEAbgBnADkAIABBAGIAYwBcAHAAYQByAA0ACgB9AA0ACgA="
}
```

We try and store everything as base64, but in some instances that does not work (such as for byte arrays). In those cases we use hex encoding.\
The key is the format name ("Text", "Rich Text Format", etc), and the value is a string that contains the mime type, encoding method, and data (`data:<mime_type>;<encoding>, <data>`).

Here's an example of plain text in Windows. (The contents is "Neptune"):
```json5
{
    "OEMText": "data:text/cp437;base64, TmVwdHVuZQ==", // CF_OEMTEXT: Text format containing characters in the OEM character set. Each line ends with a carriage return/linefeed (CR-LF) combination. A null character signals the end of the data.
    "UnicodeText": "data:text/plain;base64, TgBlAHAAdAB1AG4AZQA=", // CF_UNICODETEXT, Unicode text format. Each line ends with a linefeed character (LF)!! Not a carriage return/linefeed combination (CR-LF).
    "Locale": "data:application/octet-stream;hex, 09040000", // Windows specific, CF_LOCALE, the locale identifier.
    "Text": "data:text/plain;base64, TgBlAHAAdAB1AG4AZQA=" // CF_TEXT (base64 encoded ASCII text)
}
```

Images are stored a few different ways in the clipboard. It appears most applications use and accept CF_DIB (DeviceIndependentBitmap), which is what we'll use most of the time. Occasionally there's PNG data, if this is the case that will take precedent when sending between devices.\
Here's an example of image data in Windows. (A 5x5 image copied from Chrome):
```json5
{
    "Bitmap": "data:image/bitmap;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==",
    "Format17": "data:application/octet-stream;hex, 7C000000050000000500000001002000000000000000000000000000000000000000000000000000000000000000000000000000000000FF206E695700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", // CF_DIBV5
    "HTML Format": "data:text/html;base64, ~~snipped~~", // Would be HTML code for displaying the image by using the source image URL. (<img src="..." />)
    "PNG": "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAQSURBVBhXY/iPBVBf8P9/AG8TY51nJdgkAAAAAElFTkSuQmCC",
    "DeviceIndependentBitmap": "data:image/bitmap;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w=="
}
```



We cannot share all types of clipboard data between devices, but we can share rich-text, plain text, and images at the bare minimum. Here's what the "universal" style looks like using the "Neptune" clipboard example above:
```json5
{
    "Text": "data:text/plain;base64, TgBlAHAAdAB1AG4AZQA=" // The Unicode value OR "Text" if Unicode is not an available
}
```

If we wanted to transfer rich text, it would be:
```json5
{
    "Text": "data:text/plain;base64, QQBiAGMA", // "Abc" without rich text
    "RichText": "data:text/rtf;base64, ewBcAHIAdABmADEAXABhAG4AcwBpAFwAYQBuAHMAaQBjAHAAZwAxADIANQAyAFwAZABlAGYAZgAwAFwAbgBvAHUAaQBjAG8AbQBwAGEAdABcAGQAZQBmAGwAYQBuAGcAMQAwADMAMwB7AFwAZgBvAG4AdAB0AGIAbAB7AFwAZgAwAFwAZgBuAGkAbABcAGYAYwBoAGEAcgBzAGUAdAAwACAAQwBhAGwAaQBiAHIAaQA7AH0AfQANAAoAewBcACoAXABnAGUAbgBlAHIAYQB0AG8AcgAgAFIAaQBjAGgAZQBkADIAMAAgADEAMAAuADAALgAxADkAMAA0ADEAfQBcAHYAaQBlAHcAawBpAG4AZAA0AFwAdQBjADEAIAANAAoAXABwAGEAcgBkAFwAcwBhADIAMAAwAFwAcwBsADIANwA2AFwAcwBsAG0AdQBsAHQAMQBcAGYAMABcAGYAcwAyADIAXABsAGEAbgBnADkAIABOAGUAcAB0AHUAbgBlAFwAcABhAHIADQAKAH0ADQAKAA==" // The letters "Abc" with rich text
}
```

An image:
```json5
{
    "Image": "data:image/bitmap;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w=="
    "HTML": "data:text/html;base64, ~~snipped~~" // We'll preserve this data as well
}
```



### Sending clipboard
There are settings to prevent the clipboard to be set by the other side. _In addition to having clipboard sharing enabled._\
On server, the variable `client.clipboardSettings.allowClientToSet` must be true for the client to upload and set the clipboard.\
On client, the variable `server.clipboardSettings.allowServerToSet` must be true for the server to set the clipboard.


Server endpoint: `/api/v1/server/clipboard/set` -> `/api/v1/server/clipboard/uploadStatus`\
Client endpoint: `/api/v1/client/clipboard/set` -> `/api/v1/client/clipboard/uploadStatus`

POST Data:
```json5
{
    "data": { // Clipboard contents. Object key represents the data type, value represents .. the value.
        "Image": "data:image/bitmap;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==", // Image data
        "HTML": "data:text/html;base64, ~~snipped~~", // HTML formatting data
        "Text": "data:text/plain;base64, TgBlAHAAdAB1AG4AZQA=", // Plain text
        "RichText": "data:text/rtf;base64, ~~snipped~~" // Rich text data
    },
}
```

Response:
```json5
{
    "status": "okay", // Whether or not the data was successfully used by the server or not (going to be likely if you're receiving this response at all)
    "errorMessage": "", // Error message (if an error was encountered)
}
```
Status can be one of the following:\
okay: Clipboard updated\
clipboardSharingOff: Unable to set, clipboard sharing disabled.\
setBlocked: Server/client does not allow the other device to set the clipboard contents.\
failed: Generic error.




### Requesting clipboard
There are settings to prevent the other side from "stealing" clipboard data that must be enabled before requests are fulfilled. _In addition to having clipboard sharing enabled._\
On server, to allow the _client_ to request and get the clipboard data `client.clipboardSettings.allowClientToGet` must be true, otherwise we ignore the request.\
On client, to allow the _server_ to request and get the clipboard data `server.clipboardSettings.allowServerToGet` must be true, otherwise we ignore the request.

Server endpoint: `/api/v1/server/clipboard/get` -> `/api/v1/server/clipboard/data`\
Client endpoint: `/api/v1/client/clipboard/get` -> `/api/v1/client/clipboard/data`

POST Data: (no data necessary)
```json5
{}
```

Response:
```json5
{
    "data": { // Clipboard contents. Object key represents the data type, value represents .. the value.
        "Image": "data:image/bitmap;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==", // Image data
        "HTML": "data:text/html;base64, ~~snipped~~", // HTML formatting data
        "Text": "data:text/plain;base64, TgBlAHAAdAB1AG4AZQA=", // Plain text
        "RichText": "data:text/rtf;base64, ~~snipped~~" // Rich text data
    },

    "status": "okay", // Status (okay, no permissions, etc)
    "errorMessage": "", // Error message if an error was encountered
}
```
okay: Clipboard updated\
clipboardSharingOff: Unable to get, clipboard sharing disabled.\
getBlocked: Server/client does not allow the other device to get the clipboard contents.\
failed: Generic error.


---



## Notifications
_NOTE: this is a work in progress, API subject to drastic change_

### Images
Convert to base64, see the clipboard for an example of the expected format.



### Sending notifications to the server {needs updating: server}:
Used to send one or more notifications to the server. Update, create or remove.

Server endpoint: `/api/v1/server/notifications/send` -> (no response)

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
    "type": "text", // Notification type (standard, timer, progress, media, call, conversation)

    "contents": { // Content of the notification
        "text": "Just a basic notification", // The text description
        "subtext": "Beep bop", // Subtext
        "image": "base64:image", // Image in base64
        
        "actions": [ // Buttons or textboxes, things the user can interact with
            {
                "id": "action_read", // The 'name' of the action
                "type": "button", // Button OR textbox OR combobox
                
                "contents": "Mark as Read", // The contents (title/text/name) of the button
            },
            {
                "id": "textbox", // The 'name' of the action
                "type": "textbox", // Button OR textbox OR combobox

                "hintText": "Type a message...", // Unique to text box, the "hint"
                "allowGeneratedReplies": true, // Allow those generated smart replies
                "contents": "", // The text already typed (may not be accessible, pretend this does not exist)
            },
            {
                "id": "textbox", // The 'name' of the action
                "type": "combobox", // Button OR textbox OR combobox

                "choices": [ // Choices the user gets
                    "Option 1",
                    "This option"
                ],
            }
        ],

        "conversationData": [
            {
                "name": "Beeg Yoshi",
                "icon": "data:image/jpeg;base64, abcdef...", // User's picture
                "message": "ahh you know, just sitting here.", // Contents of the message
                "image": "data:image/jpeg;base64, abcdef..." // Image in the message
            },
        ]

        "timerData": {
            "countingDown": true  // Whether the chronometer is counting down (true) or up (false) (default true)
        }, // Data related to timer
        "progress": {
            "value": 50, // Current position
            "max": 100, // Maximum value
            "isIndeterminate": false,
        }
    },

    "onlyAlertOnce": true, // only like the sound, vibrate and ticker to be played if the notification is not already showing.
    "priority": "default", // Can be "max", "high", "default", "low", and "min"
    "timestamp": "2040-04-23T18:25:43.511Z", // When this item was displayed
    "isSilent": true // Display this / is silent
 }   
]
```

No response:



### Activating/dismissing a notification {client: not implemented}
Used to activate or dismiss a notification on the client.

Client endpoint: `/api/v1/client/notifications/update` -> (no response)

POST Data:
```json5
{
    "applicationPackage": "com.cnewb.notificationtester", // The package name of that application
    "notificationId": "23", // Notification ID provided by Android
    "action": "action", // "activate" OR "dismiss"
    "actionParameters": {
        "id": "action_read", // Name of the action user clicked on server
        "text": "" // If action included text, this would be the text.
    }
}   
```

No response



### Misc notification requests {not implemented}
Asks the client to send all active notifications over (via `/api/v1/server/notifications/send`).\
There is a "search list" and "ignore list". Each have the same keys/properties and do the same thing, except the search list is used to get notifications that **match** parameters where as the ignore list is to ignore/skip notifications that match parameters.\
Example parameters given with the ignore list (you can switch it to searchList to ONLY get notifications matching these parameters).

Client endpoint: `/api/v1/server/notifications/getAll` -> (no response)

POST Data:
```json5
{
    "ignoreList": { // Optional, we filter out these notifications
            "applicationName": [ // If the notification's application name is this, do not send
                "Notification Tester"
            ],
            
            "applicationPackage": [ // If the notification's package name is this, do not send
                "com.cnewb.notificationtester"
            ],

            "notificationId": [ // Ignore these notification ids
                "23"
            ], 
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


Data to send to server:
```json5
{
    "fiendlyName": "", // Device display name
    "notificationSettings": { // Notification settings
        "enabled": true // Send notification data
    },
    "clipboardSettings": {
        "enabled": false, // this && two below

        // These cannot be changed by the server
        "allowServerToSet": false, // Allow server to set the client's clipboard (client) - this is mainly for parity and cannot be changed by the client nor is it used.
        "allowServerToGet": false, // Allow server to get the client's clipboard (client) - this is mainly for parity and cannot be changed by the client nor is it used.
        "synchronizeClipboardToServer": false, // Automatically send to server (client) - this is mainly for parity and cannot be changed by the client nor is it used.
    },
    "fileSharingSettings": {
        "enabled": true, // Enable file sharing
        "allowServerToUpload": true, // Whether server can upload any files. This toggles the ability to receive files from the server. - this is mainly for parity and cannot be changed by the client nor is it used.
        "allowServerToDownload": true, // Whether server can download files (that we send it). This toggles the ability to send files to the server. - this is mainly for parity and cannot be changed by the client nor is it used.
    }
}
```


Data to send to client:
```json5
{
    "fiendlyName": "", // Device display name
    "notificationSettings": { // Notification settings
        "enabled": true // Send notification data
    },
    "clipboardSettings": {
        "enabled": false, // this && two below
        // These cannot be change by the client
        "allowClientToSet": false, // Allow client to set the server's clipboard (server)
        "allowClientToGet": false, // Allow client to get the server's clipboard (server)
        "synchronizeClipboardToClient": false, // Automatically send to client - this is mainly for parity and isn't used by the client.
    },
    "fileSharingSettings": {
        "enabled": true, // Enable file sharing
        "allowClientToUpload": true, // Whether client can upload any files. This toggles the ability to receive files from the client. - this is mainly for parity and isn't used by the client.
        "allowClientToDownload": true, // Whether client can download files (that we send it). This toggles the ability to send files to the client. - this is mainly for parity and isn't used by the client.
    }
}
```



No response



### Get configuration
Used to retrieve current configuration data from the other side

Sever endpoint: `/api/v1/server/configuration/get` -> `/api/v1/server/configuration/data`\
Client endpoint: `/api/v1/client/configuration/get` -> `/api/v1/client/configuration/data`

POST data:
```json5
{}
```

Response from client:
```json5
{
    "fiendlyName": "", // Device display name
    "notificationSettings": { // Notification settings
        "enabled": true // Send notification data
    },
    "clipboardSettings": {
        "enabled": false, // this && two below

        // These cannot be changed by the server
        "allowServerToSet": false, // Allow server to set the client's clipboard (client) - this is mainly for parity and cannot be changed by the client nor is it used.
        "allowServerToGet": false, // Allow server to get the client's clipboard (client) - this is mainly for parity and cannot be changed by the client nor is it used.
        "synchronizeClipboardToServer": false, // Automatically send to server (client) - this is mainly for parity and cannot be changed by the client nor is it used.
    },
    "fileSharingSettings": {
        "enabled": true, // Enable file sharing
        "allowServerToUpload": true, // Whether server can upload any files. This toggles the ability to receive files from the server. - this is mainly for parity and cannot be changed by the client nor is it used.
        "allowServerToDownload": true, // Whether server can download files (that we send it). This toggles the ability to send files to the server. - this is mainly for parity and cannot be changed by the client nor is it used.
    }
}
```


Response from server:
```json5
{
    "fiendlyName": "", // Device display name
    "notificationSettings": { // Notification settings
        "enabled": true // Send notification data
    },
    "clipboardSettings": {
        "enabled": false, // this && two below
        // These cannot be change by the client
        "allowClientToSet": false, // Allow client to set the server's clipboard (server)
        "allowClientToGet": false, // Allow client to get the server's clipboard (server)
        "synchronizeClipboardToClient": false, // Automatically send to client - this is mainly for parity and isn't used by the client.
    },
    "fileSharingSettings": {
        "enabled": true, // Enable file sharing
        "allowClientToUpload": true, // Whether client can upload any files. This toggles the ability to receive files from the client. - this is mainly for parity and isn't used by the client.
        "allowClientToDownload": true, // Whether client can download files (that we send it). This toggles the ability to send files to the client. - this is mainly for parity and isn't used by the client.
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


Server command: `/api/v1/server/battery/get` -> (reply) `/api/v1/server/battery/info`\
Client command: `/api/v1/client/battery/get` -> (reply) `/api/v1/client/battery/info`\
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
Used by the server to tell the client request was received and there is no response generated. (So the client stops waiting for a response.)

Server will respond with `/api/v1/server/ack` on all requests that otherwise do NOT have a response. No data with this response.
