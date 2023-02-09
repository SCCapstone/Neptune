
const Notification = require('./Notification.js');
const Client = require('./Client.js');

class NotificationManager {
	
	/** @type {Client} */
	#client;
	/** @type {Map<string, Notification>} */
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
	 * @param {string} id - Notification's identification (provided by client)
	 * @return {void}
	 */
	updateNotification(id, newData) {
		return;
	}

	/**
	 * Remove a notification from the OS tray and this manager
	 * @param {string} id - Notification's identification (provided by client)
	 * @return {boolean} True if notification was delete or false if the notification does not exist
	 */
	deleteNotification(id) {
		if (this.#notifications.has(id) == true) {
			this.#notifications.get(id).delete();
		}
		return this.#notifications.delete(id);
	}


	/**
	 * 
	 * @param {string} id - Notification's identification (provided by client)
	 * @return {void}
	 */
	notificationDismissed(id) {
		deleteNotification(id);
	}

	/**
	 * Notification was activated by the client on the client side
	 * Removes the notification from the OS notification tray and this manager
	 * @param {string} id - Notification's identification (provided by client)
	 * @return {void}
	 */
	notificationActivated(id) {
		deleteNotification(id);
	}

	/**
	 * @param {boolean} [dismissAllNotifications=false] Remove all notifications from this manager from the OS notification tray
	 */
	destroy(dismissAllNotifications) {
		if (dismissAllNotifications === true)
			this.#notifications.forEach((notification) => {
				notification.delete();
			});
		this.#notifications.clear();
	}
}

module.exports = NotificationManager;