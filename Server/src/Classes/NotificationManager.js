
const Notification = require('./Notification.js');
const Client = require('./Client.js');

class NotificationManager {
	
	/** @typedef {Client} */
	#client;
	/** @typedef {Map<string, Notification>} */
	#notifications = new Map();
	
	/**
	 * Creates a new notification manager. Kinda pointless for now.. and likely later too
	 * @param {Client} client - Client we represent
	 */
	constructor(client) {
		this.#client = client;
	}

	/**
	 * 
	 * @param {Notification} notification
	 * @return {void}
	 */
	newNotification(notification) {
		this.#notifications.set(notification.id, notification);
	}

	/**
	 * 
	 * @param {string} string 
	 * @return {void}
	 */
	updateNotification(string) {
		return;
	}

	/**
	 * 
	 * @param {number} id - Id of the notification that was dismissed
	 * @return {void}
	 */
	notificationDismissed(id) {
		this.#notifications.delete(id);
	}

	/**
	 * 
	 * @param {number} id - Id of the notification that was activated
	 * @return {void}
	 */
	notificationActivated(string) {
		this.#notifications.delete(id);
	}
}

module.exports = NotificationManager;