Neptune is a tool for receiving your Android device's notifications on your computer (mainly Windows).\
Neptune also supports sharing files and clipboard data between the two devices. This is useful for quickly transferring images, text and other data between devices.

No active internet connection is required, all data is sent between the devices using the local network.


_**Final demo video goes here**_


## Authors
[Will Amos](https://github.com/wmamos)\
[Ridge Johnson](https://github.com/ridgetj)\
[Cody Newberry](https://cnewb.co/)\
[Matthew Sprinkle](https://github.com/Sprinklem)


---


## Troubleshooting:
[Enabling notification access on Neptune Client](Enabling%20Notification%20Access%20on%20Neptune%20Client.html)\
[Windows notifications not working](Troubleshooting/ServerToastNotifications.html)

## Developer documentation:
[Clipboard](Clipboard.html)\
[Server JSDoc](Dev/Server/)

### UML Diagrams:
[Client](UML%20Neptune%20-%20Client.pdf)\
[Server](UML%20Neptune%20-%20Server%20Back-End.pdf)\
[Server-Client negotiation](UML%20Neptune%20-%20ServerClient%20Negotiation.pdf)


---


## The Client
The Android app is commonly referred to as the "client". The Android app is the one that connects to the server to send notification data to, usually over a web socket.\
Without the web socket, the server is unable to send data back to the client. Notifications will still come through, but you'll be unable to interact with them on the server side.

Client requires a few permissions to operate properly.\
First off is the most important permission: notification access. Without notification access, notifications **will not work**! If the app detects it does not have this permission, it'll display a message walking you through the steps of enabling the permission.\
Storage access: for saving files Neptune needs access to your storage. While we do not utilize Android's Scoped Storage, we _do not_ access any personal data. We only save files to either your downloads folder or a folder you specify. For reading, we only obtain specific access to files you select and send.\
Sending notifications: as of Android 13 applications must request permission to send notifications. Neptune sends two notifications on the Android app: for requesting permission to receive a file from the server and notifying you of a received file.

Here's a video of setting up the client app:
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230439492-05dfcfef-7aa6-4fc2-adee-77450d9b3b30.mp4" height="500px"></video>
</center>



## The Server
The Node.JS (Qt) application is referred to as the "server". The server accepts incoming connections from the client devices and host a web server (HTTP) and web socket server.\
Without the web socket, the server is unable to send data back to the client. Notifications and receiving clipboard data will still function properly.

The server is written in JavaScript and requires Node.JS version 18 and above. We use NodeGUI (an adaptation of Qt) to drive the user interface.\
Using Qt as opposed to another Chromium based UI, (like Electron), allows the application to use drastically less device RAM (<90MBs). This does make working with notifications a bit harder, but well worth the lower resources.

Configuration data on the server is encrypted by default so long as developer mode is disabled (`debug = false`). For the v0.9 release of Neptune, debug mode was left enabled to provide better log data.
Lastly, Neptune Server contains a log file in the `log` directory. The log data depends again on whether you are running in developer mode or production mode. In developer mode, a lot of data is stored in this log file, such as client web requests. In production mode request data is not logged.


---


# Pairing your devices
After downloading and install the application on both your Android and computer, you can then pair the devices from the client app.

1) Open the client app
2) Tap the "Add a device" button at the top
3) The device should appear, if it does tap the "+" to add it. If the device does not appear, tap "Add server via IP"
    1) Enter the IP address of the server (you can obtain your device's IP from running `ipconfig` on Windows or `ifconfig` on Linux, or in your router's settings)
    2) Tap "Ok", the client device will begin the initiation steps
4) If the devices successfully paired, you'll see it added to the device list. If a failure was encountered you will see an error message describing the issue.

From here you can then enable clipboard sharing and file sharing. By default these are disabled for security.\
Additionally, both devices must have the settings enabled for them to work. This is because, for security, one device cannot enable file sharing or clipboard sharing for the other device. What this means is if the server disables file sharing then the client cannot enable it.\
The devices can, however, disable file sharing or clipboard sharing for the other device. So, the server disabling file sharing should cause the client to also disable file sharing.



Here's a demo video:
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230435879-1f880635-07e8-4623-b56b-c4fb06e0932e.mp4" height="500px"></video>
</center>


---


# Renaming devices
On first run each application sets the device name to the, well, device's name. So, on client that is usually the device model and on server that's the device's network hostname.

You can rename your devices, however, to whatever you want.\
Here's a demo:
<center>
<video controls="true" src="https://user-images.githubusercontent.com/55852895/230443093-c06f0be8-36b1-47c7-94d1-ed4881f7abb3.mp4" width="650px"></video>
</center>


---


# Notifications:
The client app allows you to specify which app notifications are sent to the server, allowing you to have notifications from the applications you want appear on your computer while ignoring notifications you don't care for.\
To manage the apps whose notifications we send, click the "Manage app notifications" button on the settings page for a server (in the client app).

Neptune allows you to also interact with these notifications, meaning you can click the notifications, dismiss them, click buttons in them, or type a reply and all that is sent back to the client for processing.\
So, a notification with a inline reply, such as a text message, will allow you to type a reply on your computer and have that reply sent off as if you typed it on your phone.\
Same applied to buttons, clicking (or activating) the notification and dismissing notifications: all of this is simulated on your Android device as if you did those actions there.

Here is a demo video of different notification types:
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230439911-2c6dcee1-ff7c-4cbe-b9f5-098c3d139db7.mp4" height="750px"></video>
</center>


---


# Clipboard data:
Clipboard data can contain images, text and HTML formatting information (for the text). More information is available in the [clipboard doc](/Clipboard.md).\
On client, we cannot read the clipboard contents unless the app is "active" (currently open). This is due to Android security.

Server can automatically send the clipboard data whenever the clipboard is updated.


### Demo using text data:
_Plain text data._
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230440586-534bd125-0d4e-4656-b1aa-b7070024bd65.mp4" width="650px"></video>
</center>


### Demo of the automatic clipboard setting for server:
_Clipboard updates can include text, images, or HTML formatting data._
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230440600-0b32ddab-13ec-473b-a376-f7dba72f7c15.mp4" width="650px"></video>
</center>


### Demo of images in the clipboard:
_Images received on the client are saved to the device's "pictures" folder._
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230440615-3b39840b-33ef-44fd-b391-b95a1117e57f.mp4" width="650px"></video>
</center>


---

# File sharing:
For each application you can specify the location received files are saved to. By default, the client app saves received files to the "`Downloads`" folder and the server saves files to the "`./data/receivedFiles`" folder.\

No limits are placed on files types, although files sizes are limited (at least on upload to server) to 1,000 MBs. Large files above 1GB may not work and are reliant on your network's abilities.

Here's a demo of sending files to the server:
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230442604-b7ed3f8e-3857-42aa-82de-a4a7923da5c1.mp4" width="600px"></video>
</center>

And a demo of sending files to the client:
<center>
	<video controls="true" src="https://user-images.githubusercontent.com/55852895/230442621-6b909714-3ab4-4649-93f1-1b1228426068.mp4" width="600px"></video>
</center>