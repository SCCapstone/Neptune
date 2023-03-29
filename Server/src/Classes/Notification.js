/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */

const EventEmitter = require('node:events');
const Notifier = require("node-notifier"); // does not work with windows action center!
const Client = require('./Client.js');


/**
 * For reason that would take way too long to explain, notifications do not work 100% on Windows
 * 
 * For your application to receive the "activate" or "dismissed" events from the Action Center you need to "install" your application ... 
 * which pretty much means adding a Start Menu icon and registering a COM object
 * 
 *  
 * I did this before in a .NET WPF application, and it took days! Might not be 100% possible in Node.JS because it would just open the Node.JS interpreter and not our application ..
 * miiiiight be possible if we have a small node script `notificationServer.js` that is called by the COM server (when you activate the notification) and then makes a HTTP request to us (server)
 * 
 * This will _eventually_ get implemented, but no where near in time for the PoC. I do not have that much time on my hands!
 * 
 * For now, we'll use the node-notifier script, which works up-until the notification "timesout" (no longer visible to the user, goes to the action center).
 * if anyone asks, it's a bug .. a pretty major one at that.
 * 
 * 
 * node-notifier, MIGHT, work since it does allow you to specify the appId, so notificationServer+node-notifier might be fine.
 * 
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
     * @type {import('./LogMan').Logger}
     */
    #log;


    /**
     * Might be pulled directly into this class later, for now I am lazy
     * @type {NotificationData}
     */
    data;


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
        let pushNotification = function() { // Using notifier
            try {
                // send the notification
                let text = maybeThis.data.contents.text + maybeThis.data.contents.subtext
                if (text === undefined)
                    text = " "
                if (text.length == 0)
                    text = " "

                maybeThis.#notifierNotification = Notifier.notify({
                    title: maybeThis.data.title,
                    message: text,
                    id: maybeThis.data.notificationId,
                }, function(err, response, metadata) { // this is kinda temporary, windows gets funky blah blah blah read note at top
                    if (err) {
                        logger.error(err);
                    } else {
                        logger.debug("Action received: " + response);
                        logger.silly("action metadata: ");
                        logger.silly(metadata);
                        maybeThis.emit(response, metadata);
                    }
                });
            } catch (e) {
                logger.error("Unable to push notification to system! Error: " + e.message);
                logger.debug(e);

                // maybe use QT to push balloon notification ..?
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
                    id: this.data.notificationId,

                    clientId: this.#client.clientId,
                    clientName: this.#client.friendlyName,
                    applicationName: this.data.applicationName,
                    
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


                this.#log.silly(data);

                let contentsJsonString = JSON.stringify(this.data.contents);
                let contentsBase64Data = Buffer.from(contentsJsonString, 'utf8').toString('base64');
                let contentsDataString = `data:text/json;base64, ${contentsBase64Data}`;
                data.contents = contentsDataString;
                global.NeptuneRunnerIPC.sendData("notify-push", data);

                let func = this.#IPCActivation;
                let actuallyThis = this;
                if (global.NeptuneRunnerIPC._events['notify-client_' + this.clientId + ":" + this.data.notificationId] !== undefined)
                    delete global.NeptuneRunnerIPC._events['notify-client_' + this.clientId + ":" + this.data.notificationId];

                if (global.NeptuneRunnerIPC._events['notify-client_' + this.clientId + ":" + this.data.notificationId] === undefined) {
                    global.NeptuneRunnerIPC.once('notify-client_' + this.clientId + ":" + this.data.notificationId, (data) => {
                        func(actuallyThis, data);
                    });
                }
            } catch (e) {
                this.#log.error("Issue pushing notification via NeptuneRunner, error: " + e.message);
                this.#log.debug(e);
            }
        } else {
            pushNotification();
        }
    }

    /**
     * Processes IPC activation (NeptuneRunner)
     * @param {Notification} notification
     * @param {import('./NeptuneRunner.js').PipeDataReceivedEventArgs} ipcData
     */
    #IPCActivation(notification, ipcData) {
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

        if (data.Command == "notify-activated") {
            notification.activate(dataPackage);
        } else if (data.Command == "notify-dismissed") {
            notification.dismiss(dataPackage);
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
        this.#log.info("Activated! Data: " + data);
        this.emit("activate", data);
    }

    /**
     * Tells the client to dismiss this notification.
     */
    dismiss() {
        // Simulate a dismiss (swiped away)
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
            Notifier.notifiy(Object.assign(this.#notifierNotification, {
                remove: this.#id
            })); // ????
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