## Log data

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


If you are logging a large chunk of data or otherwise sensitive data, please use the `silly` level. This is because in production mode `silly` is disabled.

### Using logs to debug
The log offers an incredible tool in debugging the application as it provides you with context on what the application is / was doing.\
The log file also provides way more data to pick through than the console output alone.

In developer mode (where `debug=false` at the top of the index.js file), a lot of log data is blocked. That is, in a production run we do not log as much data out.\
This is important in limiting the amount of personal data saved to the disk and also reducing the log file size, as in debug mode with `silly` enabled the log can get quite large (>10mb).

When uploading a bug ticket, please include the log file!

The log file is automatically recreated/reset when the application opens and is saved to `./logs/Neptune.log`.




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
```json5
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


### ConnectionManager
`command`: string apiUrl, object commandData\
Called when an API call is received, used by Client to process requests.

`paired`: no args\
When the client pairs.


`websocket_connected`: no args\
When the client connects to the websocket

`websocket_disconnected`: int code, string reason\
When the client disconnects from the websocket

`ping`: ??data??\
When the client pings the websocket


### Client
`.eventEmitter`

`connected`: no args\
When the connection manager is setup.

`configuration_update`: no args\
For MainWindow to get notified when a device configuration has been updated by the client.


`websocket_connected`: no args\
When the client connects to the websocket. Rebroadcast of `ConnectionManager#websocket_connected`.

`websocket_disconnected`: int code, string reason\
When the client disconnects from the websocket. Rebroadcast of `ConnectionManager#websocket_connected`.


### ClientManager
`removed`: Client client

`added`: Client client

---


## Configurations


`NeptuneConfig.js`: `Config.json`:
```JSON5
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
```JSON5
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


## ClientManager
### Events:
`added`: when a new client is loaded/added into cache (`client` is the only passed parameter. This is the client added in).\
`removed`: when a client is removed from the cache (`client` is the only passed parameter. This is the client removed).




---

# NeptuneRunner
NeptuneRunner is a special lil fella.



NeptuneRunner is born out of the need to have an application that can register itself to the Window's StartMenu and Registry.\
This is required in order to properly process Windows Notifications. _See any notes on Windows notifications within Neptune to understand the need for this._


Originally the idea was to have a separate application that handles just notifications, but this would create a _lot_ of overhead.\
How would this notification application send data to Neptune? What if Neptune is not running? How do we know if Neptune is running? Why is there a console window popping up for a split second when I click on notifications?

...

That and when someone right clicks the main window in the taskbar, it says "Qode.js JavaScript Runtime for Qt". I can hear people asking: "What the hell is that?"\
![Message displayed right-clicking the main window](https://user-images.githubusercontent.com/55852895/218279902-3e99126d-37c4-434a-825a-5642d0645f60.png)

There's no ability to change this, to my understanding, within Node.JS itself. There _are_ Win32 API calls to do this (which is what NeptuneRunner does).


So the thought came, why not combine these two needs into one application? And with that, NeptuneRunner is born.\
Ultimately, NeptuneRunner allows us to "wrap" around `qode.exe` and tell Windows that this `qode.exe` instance is actually us (NeptuneRunner). NeptuneRunner also creates a IPC pipe NeptuneServer can use to create, edit, and remove notifications from Windows. Additionally, since NeptuneRunner creates the notifications, Windows activates NeptuneRunner and tells it to handle notification events.\
Perfect! NeptuneRunner reskins/titles the main window (allowing users to pin the application) and handles notifications, wonderful.


Here is a run down of what NeptuneRunner does:
1) Setup the console window (remove the close button, enable ANSI codes, set the CTRL handler, and if NOT debugging hides the console).
2) Search for `qode.exe` or `qode` (working its way up directories starting with NeptuneRunner's directory)
3) Register the application (create StartMenu shortcut)
4) Start Neptune, (redirect STDOUT, STDERR, STDIN, register close handles, create named pipe, start background thread to redirect inputs to Neptune)
5) Wait for Neptune's main window, setup taskbar appid for window



## Notifications
Neptune Runner creates a startmenu shortcut on run and calls `ToastNotificationManagerCompat.CreateToastNotifier`, which, presumably (it's not documented what it actually does),creates a registry key (`\HKCU\SOFTWARE\Classes\CLSID\<Application GUID>\`) and registers a new COM Object.\
This is a requirement for receiving activation data from toast notifications on Windows. Without this, after a notification times out into the action center (or otherwise is in the action center) the application (us) is not activated and does not receive any updates for that toast.\
(We'll only get updates for notifications in the action center IF we register a startmenu shortcut and create the registery key).

Learn more about toast notifications on Windows here: https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/toast-notifications-overview \
Toast content: https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml \
COM activation (relating to toast notifications): https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/send-local-toast-other-apps


If you wish to remove NeptuneRunner's startmenu shortcut or COM object in registery, run NeptuneRunner with the argument `-uninstall` (so, `NeptuneRunner.exe -uninstall`).\
Alternatively you could just delete the shortcut.





## NeptuneRunner IPC:
NeptuneRunner creates a named pipe (stage 4). This named pipe is used for Neptune Server to send/receive notification data, fix window taskbar settings, etc.


### Format
Normal data follows the follow style:\
`<STX><KEY><US><VALUE><RS>....<ETX>`

Data begins with the `STX` (start of text) character (`0x02`)\
...\
followed by a key (for example, `fixwin` or `ckey`) \
separated using the `US` (unit separator) character (`0x1f`)\
followed by key's value\
ended with the `RS` (record separator) character (`0x1e`)\
... and repeat as many commands as possible\
and finally ended with the `ETX` character (`0x03`)

The first key is the [command](#commands) and its value is empty.


So, for example, the new window command is:
`fixwinhwnd<handleAddress>` (you can imagine it as `fixwin:,hwnd:<data>,`)

`` begins the data
`fixwin` is the key (since it's the first key, this is the command)
`` separates the key (empty)
`` ends the key/value pair
`hwnd` is the key
`` separates the key (hwnd) and value
`<handleAddress>` is the value (`<handleAddress>` is a placeholder)
`` ends the key/value pair
`` ends the data block



### Commands
fixwin: tells NeptuneRunner a new window has been opened and to set the proper window handle settings (sets the AppUserModelID for them)\
Parameters:\
`hwnd <IntPtr>`: the window handle (int)



notify-push: Tells NeptuneRunner to create (or update) a toast notification\
`title`: required string, toast title\
`id`: required string, toast id\
`text`: required string, toast contents (text)\
`attribution`: toast attribution text, use this for the application name\
`clientId`: client id that sent the notification, used to differentiate notifications and clients\
`clientName`: client's friendly name, not used\
`applicationName`: application name provided by the client of the notification (the application that sent this notification on the phone)\
`timestamp`: the notification's timestamp as provided by the client\
`createNew`: if true, we DO NOT update the notification! If NeptuneRunner finds\
`contents`: the `contents` property of the notification (in server) represented as a JSON string and encoded as base64. Neptune Runner decodes from Base64 -> JSON then loads the content from that JSON data.
_among others_


notify-delete: Tells NeptuneRunner to delete a toast notification\
`id`: notification id to delete\
`clientId`: client id that pushed the notification


notify-dismissed: Toast notification was dismissed by the user\
`id`: notification id\
`clientId`: client id that sent this notification\
`reason`: always "user"


notify-failed: Toast notification failed to be displayed\
`id`: notification id\
`clientId`: client id that sent this notification\
`failureReason`: reason the notification failed to send (DisabledForApplication, DisabledForUser, DisabledByGroupPolicy, DisabledByManifest, GenericError)\
`failureMoreDetails`: explains the reason (DisabledForApplication, DisabledForUser, DisabledByGroupPolicy)


notify-activated: Toast notification activated (clicked)\
`id`: notification id\
`clientId`: client id that sent this notification\
`textboxText`: string containing the user's input (if any)
`comboBoxSelectedItem`: selected item for the combo box

showconsolewindow: Unhides the NeptuneRunner console window\
hideconsolewindow: Hides the NeptuneRunner console window