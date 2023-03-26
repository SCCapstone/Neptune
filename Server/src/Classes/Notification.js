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
     * Notification actions (cancel, mark as read, etc)
     * @typedef {object} NotificationAction
     * @property {string} id - 'Name' of the action
     * @property {string} text - Text displayed on the button or is inside the textbox
     * @property {boolean} isTextbox - Type of action is a textbox
     * @property {string} textboxHint - The hint for the textbox
     */

    /**
     * Text based notification
     * @typedef {object} TextNotification
     * @property {string} text - The main contents of the notification (body)
     * @property {string} subtext - This is additional data shown on notifications next to the application name ([icon] MyCoolApp - SubText)
     * @property {NotificationAction[]} actions - Available actions (mark as read, cancel, etc) 
     */


    /**
     * Data provided by the client
     * @typedef {object} NotificationData
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
        this.#id = data.notificationId;        
    }

    /**
     * Pushes the notification out to the OS
     * @return {void}
     */
    push() {
        let logger = this.#log;
        let maybeThis = this;
        let pushNotification = function() { // Using notifier
            try {
                // send the notification
                maybeThis.#notifierNotification = Notifier.notify({
                    title: maybeThis.data.title,
                    message: maybeThis.data.contents.text.length == 0? " " : maybeThis.data.contents.text, // data.contents.subtext + "\n" +
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
                    clientId: this.#client.clientId,
                    clientName: this.#client.friendlyName,
                    id: this.data.notificationId,
                    action: this.data.action,
                    applicationName: this.data.applicationName,
                    //notificationIcon: this.data.notificationIcon,
                    title: this.data.title,
                    timestamp: this.data.timestamp,
                    silent: this.data.isActive,
                }
                if (this.data.type == "text") {
                    data.text = this.data.contents.text; // data.contents.subtext + "\n" +
                    data.attribution = this.data.contents.subtext;

                }
                this.#log.silly(data);
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

    #IPCActivation(notification, ipcData) {
        /** @type {import('./NeptuneRunner.js').PipeDataReceivedEventArgs} */
        let data = ipcData;
        if (data.Command == "notify-activated") {
            notification.activate();
        } else if (data.Command == "notify-dismissed") {
            notification.dismiss();
        }
    }


    /**
     * The notification was activated (clicked). Causes class to emit 'activate'
     * @param {string} [data] - User input from the notification
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