class NeptuneNotification {
	
	/** @typedef {StatusBarNotification} */
	#Notification;
	/** @typedef {Map<string, boolean>} */
	#pushedClients = new Map();
	/** @typedef {string} */
	#id;
	
	/** This is the constructor */
	constructor() {
		this.#Notification = this.#Notification;
		this.#pushedClients = this.#pushedClients;
		this.#id = this.#id;
	}

	/**
	 * This will activate a notification
	 * @return {void}
	 */
	activate() {
		return;
	}

	/**
	 * This will dismiss the notification
	 * @return {void}
	 */
	dismiss() {
		return;
	}

	/**
	 * This will push the notification to the client
	 * @return {void}
	 */
	pushToClient() {
		return;
	}
}

modules.export = NeptuneNotification;