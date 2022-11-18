/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */

const Events = require("node:events");
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

/**
 * Neptune Server Notification class
 * 
 * Notification acts as an abstraction layer for sending the notification to the computer via node-notifier.
 * You create the notification, push it out, and the Notification class handles the notification from there and emits Events to notify you of changes. 
 * 
 */
class Notification {
	
}

module.exports = Notification;