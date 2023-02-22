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
     * @property {string} text - Text displayed on the button
     * @property {string} type - Type of action (almost always button) 
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
     * @property {number} priority - Android #setImportance
     * @property {string} timestamp - ISO date time stamp
     * @property {number} timeoutAfter - Duration in milliseconds after which this notification should be canceled, if it is not already canceled
     * @property {boolean} isActive - Display this notification
     */

    /**
     * @param {NotificationData} data - The notification data provided by the client
     */
	constructor(data) {
        super();


        // not testing if data is proper just yet, but hoping it follows the API doc

        this.#log = Neptune.logMan.getLogger("Notification-" + data.notificationId);
        this.#log.debug("New notification created. Title: " + data.title + " .. type: " + data.type + " .. text: " + data.contents.text);

        this.data = data;    
    }

    /**
     * Pushes the notification out to the OS
     * @return {void}
     */
    push() {
        if (this.data === undefined)
            return;
        if (this.data.title === undefined || this.data.contents.text === undefined || this.data.notificationId === undefined)
            return;

        if (this.data.title === "" || this.data.contents.text === "")
            return;

        if (process.platform === "win32" && false) { // blah blah good enough for now. In the works, see master-cn-NeptuneNotifier
            // Use NeptuneNotifier program (again, see notes at top)
            // we'll need to generate our own Windows Toast XML: https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml
            // fun!

        } else {
            let logger = this.#log;
            let maybeThis = this;
            // send the notification
            this.#notifierNotification = Notifier.notify({
                title: this.data.title,
                message: this.data.contents.text, // data.contents.subtext + "\n" +
                id: this.data.notificationId,
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
        }
    }

    activate() {
        // Simulate a click (activation)
        // for now we just emit
        this.emit("activate");
    }

    dismiss() {
        // Simulate a dismiss (swiped away)
        this.emit("dismissed");
    }

    delete() {
        //?
    }
}

module.exports = Notification;