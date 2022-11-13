class NotificationManager {
	
	/** @typedef {ClientManager} */
	#clientManager;
	/** @typedef {Map<notificationId: string, Notification>} */
	#notifications = new Map();
	
	/**
	 * This is the constuctor
	 */
	constructor() {
		this.#clientManager = this.#clientManager;
		this.#notifications = this.#notifications;
	}

	/**
	 * 
	 * @param {Notification} notification
	 * @return {void}
	 */
	newNotification(notification) {
		return
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
	 * @param {string} string 
	 * @return {void}
	 */
	notificationDismissed(string) {
		return;
	}

	/**
	 * 
	 * @param {string} string 
	 * @return {void}
	 */
	notificationActivated(string) {
		return;
	}
}

modules.export = NotificationManager;