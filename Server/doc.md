Inside Neptune, use `global.Neptune.logMan.getLogger("your class name")` to obtain a logger to log data.\
See LogMan.js, loggers have these functions:\
`critical(message, outputToConsole=true);`\
`error(message, outputToConsole=true);`\
`warn(message, outputToConsole=true);`\
`info(message, outputToConsole=true);`\
`http(message, outputToConsole=true);`\
`verbose(message, outputToConsole=true);`\
`debug(message, outputToConsole=true);`\
`silly(message, outputToConsole=true);`\
and output to the log file (./logs/Neptune.log) and console (if outputToConsole is true)



## To build/run:
Run this ONCE: `npx nodegui-packer --init NeptuneServer`

Then to rebuild run this command: `npm run build`\
this will build the packed executable and other files, explorer will automatically open.

To run: `npm start`


## Application
Most things are stored in the `Neptune` object, which is accessible globally via `global.Neptune`.
Using this you can gain access to the NotificationManager `Neptune.notificationManager`, ConfigurationManager `Neptune.configurationManager`, and ClientManager `Neptune.clientManager` in addition to the application's config `Neptune.config`.

Other properties:
`Neptune.version`: Application version, instance of Version
`Neptune.debug`: Whether this application is in debug mode or not


conInitUUID: A collection of connection initiation request data.
```json
{
	"UUID": {
		"log": {}, // LogMan.Logger object for logging
		"enabled": true, // Whether we are allowing this UUID to setup a connection (set to false once completed)
		"socketCreated": false,
		"socketId": "1234", // Socket UUID
		"aliceDHObject": {}, // Our DH keys (type: crypto.DiffieHellmanGroup)
		"aliceDynamicSaltDHObject": {}, // Our dynamic salt DH keys
		"createdTime": "2023-01-21T16:46:53.286Z", // Time the connection initiation request began (we invalidate this request after 5 minutes) 
		"supportedCiphers": ["aes-128-gcm","chacha20-poly1305"], // Array provided by the newSocketConnection request from client, ciphers the client supports
		"selectedCipher": "aes-128-gcm", // Selected cipher
		"supportedHashAlgorithms": ["sha256", "sha512"], // Provided by client (above), hash algorithms support by the client (sha256).
		"selectedHashAlgorithm": "sha256", // Selected hash function
		"supportedKeyGroups": ["modp14", "modp16"], // Provided by client (above)
		"selectedKeyGroup": "modp16", // Selected key group for DH key



		"clientId": "1234", // Client UUID
		"client": {} // Client object (from clientManager) - after paired 
	}
}
```



## Events

### Server (application)
`Neptune.events` or `global.Neptune.events`

For server, (as in like the application running), Neptune.events will fire off for import events that impact the whole application. These events include:
`Shutdown`: 1 arg, `shutdownTimeout`, which indicates the amount of time before the application exists. Use this to safely shutdown the application.


### NotificationManager
`NotificationManager.events`


---


## Configurations


`NeptuneConfig.js`: `Config.json`:
```JSON
{
	"encryption": {
		"enabled": false,	// If file encryption is enabled
		"active": false,	// Unused, reserved
		"newKeyLength":64,	// What the key length should be when we generate the encryption key
	},

	"web": {
		"port":25560,		// Express web server port (port we listen to)
	},

	// Appended to the end of the configuration directory (./data/). Requires "/" at the end!
	"clientDirectory": "clients/",

	// Array of client ids we're connected/paired with
	"clients": ["exampleClient"],

	// Application specific settings, advance tunables
	"applicationSettings": {
	}
}
```


Client example config, `clientId.json`:
```JSON
{
	"IPAddress": "127.0.0.1:25565",
	"clientId": "clientId",
	"friendlyName": "My phone",
	"dateAdded": "2022-11-13T16:55:14.459Z",
	"pairId": "ifPaired",
	"pairKey": "ifPaired"
}
```

---