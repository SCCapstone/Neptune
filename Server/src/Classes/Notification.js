/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */


let Notifier = require("node-notifier"); // does not work with windows action center!
let Client = require('./Client.js');

let { PipeDataReceivedEventArgs } = require('./NeptuneRunner.js');

let { Logger } = require('./LogMan');

let EventEmitter = require("node:events");

const crypto = require("node:crypto");


/**
 * Neptune
 */
const Neptune = global.Neptune;

/**
 * Neptune Server Notification class
 * 
 * Notification acts as an abstraction layer for sending the notification to the computer via node-notifier.
 * You create the notification, push it out, and the Notification class handles the notification from there and emits Events to notify you of changes. 
 * 
 */
class Notification extends EventEmitter {
    /**
     * Notification Id shared between the server and client, used to reference a notification
     * @type {number}
     */
    #id;
    get id() {
        return this.#id;
    }

    /**
     * Client id that own this notification
     * @type {number}
     */
    get clientId() {
        return this.#client.clientId;
    }


    /**
     * Client this notification belongs to
     * @type {Client}
     */
    #client;


    /**
     * Notifier id, provided by node-notify. *Should* be the same as the id.
     * @type {number}
     */
    #notifierId


    /**
     * Data returned by Notifier.notify().
     */
    #notifierNotification;


    /**
     * @type {Logger}
     */
    #log;


    /**
     * Might be pulled directly into this class later, for now I am lazy
     * @type {NotificationData}
     */
    data;

    #neptuneRunnerId;


    /**
     * @typedef {Object} NotificationAction
     * @property {string} id - The 'name' of the action
     * @property {string} type - Button, textbox, or combobox
     * @property {string} [contents] - The contents (title/text/name) of the button
     * @property {string} [hintText] - Unique to text box and combobox, the "hint"
     * @property {boolean} [allowGeneratedReplies] - Allow those generated smart replies (for textbox only)
     * @property {string[]} [choices] - Choices the user gets (for combobox only)
     */

    /**
     * @typedef {Object} TimerData
     * @property {boolean} countingDown - Whether the chronometer is counting down (true) or up (false)
     */

    /**
     * @typedef {Object} Progress
     * @property {number} value - Current position
     * @property {number} max - Maximum value
     * @property {boolean} isIndeterminate - Indeterminate state of the progress bar
     */

    /**
     * @typedef {Object} Contents
     * @property {string} text - The text description
     * @property {string} subtext - Subtext
     * @property {string} image - Image in base64
     * @property {NotificationAction[]} actions - Buttons or textboxes, things the user can interact with
     * @property {TimerData} timerData - Data related to timer
     * @property {Progress} progress - Progress data
     */

    /**
     * @typedef {Object} NotificationData
     * @property {string} action - What to do with this data, how to process (create, remove, update)
     * @property {string} applicationName - The app that created the notification
     * @property {string} applicationPackage - The package name of that application
     * @property {number} notificationId - Notification ID provided by Android, used to refer to this notification on either end
     * @property {string} notificationIcon - Base64 representation of the notification icon
     * @property {string} title - Title of the notification
     * @property {string} type - Notification type (standard, timer, progress, media, call)
     * @property {Contents} contents - Content of the notification
     * @property {boolean} onlyAlertOnce - Only play the sound, vibrate, and ticker if the notification is not already showing
     * @property {string} priority - Can be "max", "high", "default", "low", and "min"
     * @property {string} timestamp - When this item was displayed
     * @property {boolean} isSilent - Display this / is silent
     */


    /**
     * Data provided by the client
     * @typedef {object} NotificationDataLegacy
     * @property {string} action - What the do with this data, how to process (create, remove, update)
     * @property {string} applicationName - The app that created the notification (it's friendly name)
     * @property {string} applicationPackage - The package name of the application that created the notification
     * @property {number} notificationId - Notification Id provided by Android, used to refer to this notification on either end
     * @property {string} notificationIcon - Base64 representation of the notification icon. This must be saved to the disk before being used (Windows only accepts URIs to icons)
     * @property {string} title - Title of the notification
     * @property {string} type - Notification type (text, image, inline, chronometer, progress bar). This will determine the data in `contents`.
     * @property {(TextNotification)} contents - Content of the notification (type set by above)
     * @property {object} extras - Unused currently, reserved for misc data
     * @property {boolean} persistent - Notification is persistent
     * @property {number} color - Color of the notification
     * @property {boolean} onlyAlertOnce - Only let the sound, vibration and ticker to be played if the notification is not already showing.
     * @property {string} category - Category of notification, https://developer.android.com/reference/android/app/Notification#category
     * @property {number} priority - Android #setImportance
     * @property {string} timestamp - ISO date time stamp
     * @property {number} timeoutAfter - Duration in milliseconds after which this notification should be canceled, if it is not already canceled
     * @property {boolean} isActive - Display this notification
     */

    /**
     * @param {Client} client - Client this notification came from
     * @param {NotificationData} data - The notification data provided by the client
     */
	constructor(client, data) {
        super();


        this.#client = client;


        // not testing if data is proper just yet, but hoping it follows the API doc

        this.#log = Neptune.logMan.getLogger("Notification-" + data.notificationId);
        this.#log.debug("New notification created. Title: " + data.title + " .. type: " + data.type + " .. text: " + data.contents.text);

        this.data = data;
        if (this.data.contents === null) {
            this.data.contents = {
                text: " ",
            }
        }
        this.#id = data.notificationId;
        this.#neptuneRunnerId  = crypto.createHash("sha1").update(data.notificationId).digest('hex')
    }



    /**
     * Pushes the notification out to the OS
     * @return {void}
     */
    push() {
        if (this.data.action == "delete") {
            this.delete();
        }

        let logger = this.#log;
        let maybeThis = this;
        let name = this.#client.friendlyName;
        let pushNotification = function() { // Using notifier
            try {
                // don't do media ones :!
                if (maybeThis.data.type === "media")
                    return;

                // send the notification
                let text = maybeThis.data.contents.text + maybeThis.data.contents.subtext
                if (text === undefined)
                    text = " "
                if (text.length == 0)
                    text = " "

                let hasTextbox = false;
                let choices = []; // combobox choices
                let actions = []; // buttons

                if (maybeThis.data.contents.actions !== undefined) {
                    for (var i = 0; i<maybeThis.data.contents.actions.length; i++) {
                        let action = maybeThis.data.contents.actions[i];
                        if (action.type == "combobox") {
                            choices = action.choices;
                        } else if (action.type == "textbox") {
                            hasTextbox = true;
                        } else if (action.type == "button") {
                            actions.push(action.contents);
                        }
                    }
                }

                let notifierData = {
                    title: name + maybeThis.data.title,
                    message: text,
                    id: maybeThis.data.notificationId,

                    sound: maybeThis.data.isSilent === false,

                    actions: actions,
                    reply: false,
                };

                if (global.NeptuneRunnerIPC.pipeAuthenticated) {
                    notifierData.appID = "Neptune.Server.V2"
                }


                maybeThis.#notifierNotification = Notifier.notify(notifierData, (err, response, metadata) => {
                    try {
                        if (err) {
                            logger.error("Notifier error: " + err, false);
                            maybeThis.error();
                        } else {
                            let action = metadata.action === "dismissed"? "dismissed" : "activated";
                            let id = metadata.button === undefined? "" : Buffer.from(metadata.button, "utf8").toString("base64");
                            let text = metadata.text === undefined? "" : Buffer.from(metadata.text, "utf8").toString("base64");

                            let dataPackage = {
                                action: action,
                                actionParameters: {
                                    id: id,
                                    text: text,
                                    comboBoxChoice: undefined,
                                }
                            }

                            
                            logger.silly("action metadata: ", false);
                            logger.silly(metadata, false);

                            if (action == "activated") {
                                maybeThis.activate(dataPackage);
                            } else if (action == "dismissed") {
                                maybeThis.dismiss(dataPackage);
                            }
                        }
                    } catch(e) {
                        logger.error("Unable to react to notifier notification. See log for more details");
                        logger.error(e, false);
                    }
                });
            } catch (e) {
                logger.error("Unable to push notification to system! Error: " + e.message);
                logger.error(e, false);

                // maybe use QT to push balloon notification ..?
                // damn straight
                maybeThis.error();
            }
        }

        if (process.platform === "win32" && global.NeptuneRunnerIPC !== undefined) {
            if (!global.NeptuneRunnerIPC.pipeAuthenticated) {
                pushNotification();
                return;
            }

            try {
                let data = {
                    action: this.data.action,
                    id: this.#neptuneRunnerId,

                    clientId: this.#client.clientId,
                    clientName: this.#client.friendlyName,
                    applicationName: this.data.applicationName,
                    applicationPackage: this.data.applicationPackage,
                    
                    notificationIcon: this.data.notificationIcon,
                    title: this.data.title,
                    type: this.data.type,

                    onlyAlertOnce: this.data.onlyAlertOnce,
                    priority: this.data.priority,
                    timestamp: this.data.timestamp,
                    isSilent: this.data.isActive,
                }

                data.text = this.data.contents.text;
                data.subtext = this.data.contents.subtext;



                let contentsJsonString = JSON.stringify(this.data.contents);
                let contentsBase64Data = Buffer.from(contentsJsonString, 'utf8').toString('base64');
                let contentsDataString = `data:text/json;base64, ${contentsBase64Data}`;
                data.contents = contentsDataString;
                this.#log.silly(data, false);
                global.NeptuneRunnerIPC.sendData("notify-push", data);

                let func = this.#IPCActivation;
                let actuallyThis = this;
                if (global.NeptuneRunnerIPC._events['notify-client_' + this.clientId + ":" + this.#neptuneRunnerId] !== undefined)
                    delete global.NeptuneRunnerIPC._events['notify-client_' + this.clientId + ":" + this.#neptuneRunnerId];

                if (global.NeptuneRunnerIPC._events['notify-client_' + this.clientId + ":" + this.#neptuneRunnerId] === undefined) {
                    global.NeptuneRunnerIPC.once('notify-client_' + this.clientId + ":" + this.#neptuneRunnerId, (data) => {
                        func(actuallyThis, data);
                    });
                }
            } catch (e) {
                this.#log.error("Issue pushing notification via NeptuneRunner, error: " + e.message);
                this.#log.debug(e);
                pushNotification();
            }
        } else {
            pushNotification();
        }
    }

    /**
     * Processes IPC activation (NeptuneRunner)
     * @param {Notification} notification
     * @param {PipeDataReceivedEventArgs} ipcData
     */
    #IPCActivation(notification, ipcData) {
        try {
            let data = ipcData.toDictionary();

            let actionString = data.Command == "notify-activated"? "activated" : "dismissed";
            let dataPackage = {
                action: actionString,
                actionParameters: {
                    id: data.buttonId,
                    text: data.textboxText,
                    comboBoxChoice: data.comboBoxSelectedItem
                }
            }

            if (ipcData.Command == "notify-activated") {
                notification.activate(dataPackage);
            } else if (ipcData.Command == "notify-dismissed") {
                notification.dismiss(dataPackage);
            } else if (ipcData.Command == "notify-error") {
                this.#log.error("Failed to display a notification using NeptuneRunner, see console for more info.");
                this.#log.error("Failed reason: " + ipcData["failureReason"] + " -- more details: " + ipcData["failureMoreDetails"], false);
                error(); // backup methods
            }
        } catch (e) {
            console.error(e);
            //this.#log.error("Error on processing IPC activation data, check log for details.");
            //this.#log.error(e, false);
        } 
    }

    /**
     * Called when the notification failed to be displayed.
     * 
     * Utilizes the TrayIcon we created for MainWindow to send out a balloon tooltip icon.
     * 
     */
    error() {
        // do some check to whether or not we actually have to do this
        if (global.Neptune.sendNotification !== undefined && typeof global.Neptune.sendNotification === "function") {
            let text = this.data.contents.text + this.data.contents.subtext
            if (text === undefined)
                text = " "
            if (text.length == 0)
                text = " "

            let maybeThis = this;
            global.Neptune.sendNotification(this.#client.friendlyName + ": " + this.data.title, text, 5000, () => {
                maybeThis.activate({
                    action: "activated",
                    actionParameters: {}
                });
            });
        }
    }


    /**
     * @typedef {object} NotificationActionParameters
     * @property {string} [id] - Id of the button clicked
     * @property {string} [text] - Optional text input (if action is a text box)
     * @property {string} [comboBoxChoice] - Optional selected choice of the combo box.
     */
    /**
     * @typedef {object} UpdateNotificationData
     * @property {string} action - Activated or dismissed.
     * @property {NotificationActionParameters} [actionParameters] - Data related to user input.
     */


    /**
     * The notification was activated (clicked). Causes class to emit 'activate'
     * @param {UpdateNotificationData} [data] - User input from the notification
     */
    activate(data) {
        this.#log.info("Activated!");
        this.#log.info(data, false);
        this.emit("activate", data);
    }

    /**
     * Tells the client to dismiss this notification.
     */
    dismiss() {
        // Simulate a dismiss (swiped away)
        this.#log.info("Dismissed!");
        this.emit("dismissed");
    }

    /**
     * Deletes the notification from this computer.
     */
    delete() {
        //?
        this.emit('dismissed');
        if (process.platform === "win32") {
            global.NeptuneRunnerIPC.sendData('notify-delete', {
                clientId: this.#client.clientId,
                id: this.data.notificationId,
            })
        } else {
            if (!this.#notifierNotification !== undefined) {
                this.#notifierNotification.close();
            }
        }
    }


    /**
     * Updates the notification data and the toast notification on the OS side.
     * @param {NotificationData} data - The notification data provided by the client
     */
    update(data) {
        this.#log.debug("Updating notification..");
        this.#log.silly(data);
        this.data = data;
        this.#id = data.notificationId;
        this.push();
    }
}



module.exports = Notification;