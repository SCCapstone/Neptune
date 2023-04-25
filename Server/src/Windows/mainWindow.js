/**
 *	  _  _ 
 *	 | \| |
 *	 | .` |
 *	 |_|\_|eptune
 *
 *	 Capstone Project 2022
 * 
 *	 Main Window
 */

const NodeGUI = require("@nodegui/nodegui");
const NeptuneWindow = require("./NeptuneWindow");


const Client = require("../Classes/Client");
const Notification = require("../Classes/Notification");
const { Logger } = require("./../Classes/LogMan");
const ClientManager = require("../Classes/ClientManager");


const NepConfig = require('../Classes/NeptuneConfig.js');
const { ServiceState } = require("@homebridge/ciao");
const { randomUUID } = require("node:crypto");

/** @type {NepConfig} */
var NeptuneConfig = global.Neptune.config;


class thisTest extends NeptuneWindow {
	/**
	 * Whether tooltips are enabled or not. Default no, they're a bit laggy.
	 * @type {boolean}
	 */
	enableToolTips = false;


	/** @type {ClientManager} */
	clientManager = Neptune.clientManager;


	/** @type {Map<string, Client>} */
	addedClients = new Map();
	/** @type {Map<string, NodeGUI.QListWidgetItem>} */
	clientListItems = new Map();


	// UI Elements
	// menus
	/** @type {NodeGUI.QMenuBar} */
	menuBar;

	// File menu
	/** @type {NodeGUI.QMenu} */
	menuFile;

	/** @type {NodeGUI.QAction} */
	actionPair_client;
	
	/** @type {NodeGUI.QMenu} */
	menuClient_settings;
	/** @type {NodeGUI.QAction} */
	menuClient_settings_action;
	// menuClient_settings_action actions:
	/** @type {NodeGUI.QAction} */
	actionRefresh_client_info;

	/** @type {NodeGUI.QAction} */
	actionSync_notifications;

	/** @type {NodeGUI.QAction} */
	actionToggleClipboardSharing;
	/** @type {NodeGUI.QAction} */
	actionSend_clipboard;
	/** @type {NodeGUI.QAction} */
	actionReceive_clipboard;

	/** @type {NodeGUI.QAction} */
	actionToggleFileSharing;
	/** @type {NodeGUI.QAction} */
	actionToggleAllowClientToUpload;
	/** @type {NodeGUI.QAction} */
	actionSend_file;

	/** @type {NodeGUI.QAction} */
	actionDelete_client;
	/** @type {NodeGUI.QAction} */
	actionSync_configuration_with_client;
	/** @type {NodeGUI.QAction} */
	actionView_connection_details;

	// bottom file menu
	/** @type {NodeGUI.QAction} */
	actionRefresh_device_list;

	/** @type {NodeGUI.QAction} */
	actionPreferences;
	/** @type {NodeGUI.QAction} */
	actionToggleConsoleVisibility;
	/** @type {NodeGUI.QAction} */
	actionExit;
	

	// Help menu
	/** @type {NodeGUI.QMenu} */
	menuHelp;
	/** @type {NodeGUI.QAction} */
	actionView_GitHub_page;
	/** @type {NodeGUI.QAction} */
	actionTest_notification;
	/** @type {NodeGUI.QAction} */
	actionAbout_Neptune;







	// devices
	/** @type {NodeGUI.QListWidget} */
	deviceList;
	
	// settings view
	/** @type {NodeGUI.QScrollArea} */
	scrollArea;

	// top bar client info
	/** @type {NodeGUI.QLabel} */
	lblClientName
	/** @type {NodeGUI.QLabel} */
	lblClientBatteryLevel;


	/** @type {NodeGUI.QCheckBox} */
	chkSyncNotifications;

	// clipboard
	/** @type {NodeGUI.QCheckBox} */
	chkSyncClipboard;
	/** @type {NodeGUI.QCheckBox} */
	chkAutoSendClipboard;
	/** @type {NodeGUI.QCheckBox} */
	chkClipboardAllowClientToGet;

	// file sharing
	/** @type {NodeGUI.QCheckBox} */
	chkFileSharingEnable;
	/** @type {NodeGUI.QCheckBox} */
	chkFileSharingAutoAccept;
	/** @type {NodeGUI.QCheckBox} */
	chkFileSharingNotify;
	/** @type {NodeGUI.QCheckBox} */
	chkFilesharingAllowClientToUpload;
	/** @type {NodeGUI.QLineEdit} */
	txtFileSharingSaveDirectory;
	/** @type {NodeGUI.QPushButton} */
	btnFileSharingSaveDirectoryBrowse;


	// Buttons
	/** @type {NodeGUI.QPushButton} */
	btnSave;
	/** @type {NodeGUI.QPushButton} */
	btnDelete;
	/** @type {NodeGUI.QPushButton} */
	btnSendFile;
	/** @type {NodeGUI.QPushButton} */
	btnSendClipboard;
	/** @type {NodeGUI.QPushButton} */
	btnReceiveClipboard;


	/** @type {Logger} */
	log;


	/**
	 * Returns the selected client object
	 * @return {Client} Current selected client in the device list on the left side
	 */
	GetSelectedClient() {
		try {
			let items = this.deviceList.selectedItems();
			if (items.length >= 1) {
				/** @type {NodeGUI.QListWidgetItem} */
				let selectedItem = items[0];
				let clientName = selectedItem.text();
				if (this.addedClients.has(clientName))
					return this.addedClients.get(clientName);
				
				return undefined;
			}
		} catch (a) {
			this.log.error("Error grabbing selected item: " + a);
		}
		return undefined;
	}

	/**
	 * Adds a client to the client list on the left side
	 * @param {Client} client - Client to add
	 */
	AddClientToDeviceList(client) {
		let listItem = new NodeGUI.QListWidgetItem();
		if (client.friendlyName == undefined) {
			client.eventEmitter.removeAllListeners('paired'); // protect against race conditions
			client.eventEmitter.once('paired', () => this.AddClientToDeviceList(client));
			this.log.debug("Attempt to add device with no friendly name. Listening for pair event...");
			return;
		}

		if (this.addedClients.has(client.friendlyName)) {
			return;
		}

		listItem.setText(client.friendlyName);
		if (this.enableToolTips) {
			if (client.isPaired)
				listItem.setToolTip("Paired and connected client device " + client.friendlyName);
			else
				listItem.setToolTip("Unpaired client device " + client.friendlyName);
		}

		this.addedClients.set(client.friendlyName, client);
		this.clientListItems.set(client.friendlyName, listItem);
		this.deviceList.addItem(listItem);
		this.log.debug("Added client to device list: " + client.friendlyName);

		if (this.deviceList.count() == 1) {
			this.deviceList.setCurrentItem(listItem);
		}
	}

	/**
	 * Removes a client from the client list on the left side.
	 * @param {string} clientName - Name of the client to remove (the text of the ListItem).
	 */
	RemoveClientFromDeviceList(clientName) {
		if (this.clientListItems.has(clientName)) {
			this.deviceList.removeItemWidget(this.clientListItems.get(clientName));
			this.clientListItems.delete(clientName);
		}

		if (this.addedClients.has(clientName))
			this.addedClients.delete(clientName);


		// THIS IS TEMPORARY!!!
		this.addedClients.clear();
		this.clientListItems.clear();
		this.deviceList.clear();

		let clients = this.clientManager.getClients();
		clients.forEach((client, name) => {
			this.AddClientToDeviceList(client);
		});
	}


	receiveClipboardData() {
		let client = this.GetSelectedClient();
		if (!client.clipboardSettings.enabled)
			return;

		let clipboardData = this.GetSelectedClient().getClipboard();
		if (clipboardData !== undefined && typeof clipboardData === "string") {
			let clipboard = NodeGUI.QApplication.clipboard();
			clipboard.pixmap(NodeGUI.QClipboardMode.Clipboard);
			clipboard.setText(clipboardData);
		}
	}
	sendClipboardData() {
		try {
			let client = this.GetSelectedClient();
			if (!client.clipboardSettings.enabled)
				return;

			let clipboard = NodeGUI.QApplication.clipboard();
			clipboard.pixmap(NodeGUI.QClipboardMode.Clipboard);
			let clipboardData = clipboard.text();
			if (clipboardData !== undefined && typeof clipboardData === "string") {
				client.sendClipboard(clipboardData);
			}
		} catch (e) {}
	}

	// Enable/disable file sharing settings if file sharing is enabled/disabled
	updateEnableFileSharing(enabled) {
		let client = this.GetSelectedClient();

		if (client !== undefined) {
			client.fileSharingSettings.enabled = enabled;
			this.btnSendFile.setEnabled(enabled === true);
			this.chkFileSharingAutoAccept.setEnabled(enabled === true);
			this.chkFileSharingNotify.setEnabled(enabled === true);
			this.chkFilesharingAllowClientToUpload.setEnabled(enabled === true);
			//this.txtFileSharingSaveDirectory.setEnabled(enabled === true);
			this.btnFileSharingSaveDirectoryBrowse.setEnabled(enabled === true);

			this.actionToggleAllowClientToUpload.setEnabled(enabled === true);
			this.actionSend_file.setEnabled(enabled === true);
		}
	}
	// Enable/disable clipboard settings if clipboard sync is enabled/disabled
	updateEnableClipboardSharing(enabled) {
		let client = this.GetSelectedClient();

		if (client !== undefined) {
			client.clipboardSettings.enabled = enabled;
			this.btnSendClipboard.setEnabled(enabled === true);
			this.btnReceiveClipboard.setEnabled(enabled === true);
			this.chkAutoSendClipboard.setEnabled(enabled === true);
			this.chkClipboardAllowClientToGet.setEnabled(enabled === true);

			this.actionSend_clipboard.setEnabled(enabled === true);
			this.actionReceive_clipboard.setEnabled(enabled === true);
		}
	}


	// This is used to update all the items in the settings
	updateClientData() {
		let client = this.GetSelectedClient();
		if (client == undefined) {
			this.menuClient_settings_action.setEnabled(false);
			this.scrollArea.setEnabled(false);
			this.actionRefresh_client_info.setEnabled(false);
		} else {
			this.menuClient_settings_action.setEnabled(true);
			this.scrollArea.setEnabled(true);
			this.actionRefresh_client_info.setEnabled(true);

			let statusText = "offline";
			if (client.isConnected) {
				statusText = "online";
			}
			this.lblClientName.setText(client.friendlyName + " (" + statusText + ")");

			let batteryString = client.batteryLevel !== undefined? client.batteryLevel + "%" : "unknown%";
			if (client.batteryChargerType !== undefined && client.batteryChargerType !== "discharging") {
				batteryString = "+" + batteryString;

				if (client.batteryTimeRemaining !== undefined) {
					batteryString += " (full in ";
					if ((client.batteryTimeRemaining/60)>60)
						batteryString += Math.round(((client.batteryTimeRemaining/60/60) + Number.EPSILON) * 100) / 100 + " hours)"
					else
						batteryString += Math.round(((client.batteryTimeRemaining/60) + Number.EPSILON) * 100) / 100 + " minutes)"
				}
			}
			this.lblClientBatteryLevel.setText(batteryString);
			
			this.chkSyncNotifications.setChecked(client.notificationSettings.enabled === true);
			


			// clipboard
			this.updateEnableClipboardSharing(client.clipboardSettings.enabled);
			this.chkSyncClipboard.setChecked(client.clipboardSettings.enabled === true);
			this.actionToggleClipboardSharing.setChecked(client.clipboardSettings.enabled === true);
			this.chkAutoSendClipboard.setChecked(client.clipboardSettings.synchronizeClipboardToClient === true);
			this.chkClipboardAllowClientToGet.setChecked(client.clipboardSettings.allowClientToGet === true);
			


			// file sharing
			this.updateEnableFileSharing(client.fileSharingSettings.enabled);
			this.chkFileSharingEnable.setChecked(client.fileSharingSettings.enabled === true);
			this.actionToggleFileSharing.setChecked(client.fileSharingSettings.enabled === true);
			this.chkFileSharingAutoAccept.setChecked(client.fileSharingSettings.requireConfirmationOnClinetUploads !== true);
			this.chkFileSharingNotify.setChecked(client.fileSharingSettings.notifyOnClientUpload === true);
			this.chkFilesharingAllowClientToUpload.setChecked(client.fileSharingSettings.allowClientToUpload === true);
			this.actionToggleAllowClientToUpload.setChecked(client.fileSharingSettings.allowClientToUpload === true);
			this.txtFileSharingSaveDirectory.setText(client.fileSharingSettings.receivedFilesDirectory !== undefined? client.fileSharingSettings.receivedFilesDirectory : "");
			//this.txtFileSharingSaveDirectory.setEnabled(client.fileSharingSettings.enabled === true);
		}
	}
	saveClientData() {
		let client = this.GetSelectedClient();
		if (client == undefined) {
			this.menuClient_settings_action.setEnabled(false);
			this.scrollArea.setEnabled(false);
			this.actionRefresh_client_info.setEnabled(false);
		} else {
			if (client.friendlyName !== undefined)
				this.log.debug("Configuration saved for: " + client.friendlyName, false);

			this.menuClient_settings_action.setEnabled(true);
			this.scrollArea.setEnabled(true);
			this.actionRefresh_client_info.setEnabled(true);

			client.notificationSettings.enabled = this.chkSyncNotifications.isChecked(); //(client.notificationSettings.enabled !== false);
			// clipboard
			client.clipboardSettings.enabled = this.chkSyncClipboard.isChecked(); //(client.clipboardSettings.enabled === true);
			client.clipboardSettings.synchronizeClipboardToClient = this.chkAutoSendClipboard.isChecked(); //(client.clipboardSettings.synchronizeClipboardToClient === true);
			client.clipboardSettings.allowClientToGet = this.chkClipboardAllowClientToGet.isChecked(); //(client.clipboardSettings.allowClientToGet === true);

			// file sharing
			client.fileSharingSettings.enabled = this.chkFileSharingEnable.isChecked(); //(client.fileSharingSettings.enabled === true);
			client.fileSharingSettings.requireConfirmationOnClinetUploads = !this.chkFileSharingAutoAccept.isChecked(); //(client.fileSharingSettings.autoReceiveFromClient === true);
			client.fileSharingSettings.notifyOnClientUpload = this.chkFileSharingNotify.isChecked(); //(client.fileSharingSettings.notifyOnReceive === true);
			client.fileSharingSettings.allowClientToUpload = this.chkFilesharingAllowClientToUpload.isChecked(); //(client.fileSharingSettings.allowClientToUpload === true);

			client.fileSharingSettings.receivedFilesDirectory = this.txtFileSharingSaveDirectory.text(); //(client.fileSharingSettings.receivedFilesDirectory);


			client.save();
			client.syncConfiguration();

			this.updateClientData();
		}
	}

	clientSettingChanged() {
		if (!NeptuneConfig.applicationSettings.requireSaveButton) {
			this.saveClientData();
		}
	}


	constructor(arg) {
		super(arg);

		try {
			this.log = global.Neptune.logMan.getLogger("MainWindow");

			this.setWindowTitle('Neptune | Main window');
			this.resize(599, 522);
			this.setMinimumSize(425, 300);

			NeptuneConfig.eventEmitter.removeAllListeners('updated');
			NeptuneConfig.eventEmitter.on('updated', () => {
				if (global.Neptune.shuttingDown)
					return;

				try {
					this.log("Configuration updated... applying changes.");

					try {
						this.clientManager.getClients().forEach(client => {
							client.syncConfiguration();
						});
					} catch {}

					try {
						if (NeptuneConfig.applicationSettings.requireSaveButton) {
							this.btnSave.setVisible(true);
							this.btnSave.setEnabled(true);
						} else {
							this.btnSave.setVisible(false);
							this.btnSave.setEnabled(false);
						}
					} catch {}

					try {
						global.Neptune.mdnsService.updateTxt({
							version: global.Neptune.version.toString(),
							name: global.Neptune.config.friendlyName,
						});

						if (NeptuneConfig.applicationSettings.advertiseNeptune) {
							if (global.Neptune.mdnsService.serviceState !== ServiceState.ANNOUNCED) {
								global.Neptune.mdnsService.advertise().then(() => {
									global.Neptune.webLog.verbose("MDNS service now advertising");
								});
							}
						} else {
							if (global.Neptune.mdnsService.serviceState !== ServiceState.UNANNOUNCED) {
								global.Neptune.mdnsService.end().then(() => {
									global.Neptune.webLog.verbose("MDNS service has stopped advertising!!");
								});
							}
						}
					} catch {}
				} catch (e) {
					this.log.error("Failed to apply configuration changes. See log for more details.");
					this.log.error("Error: " + e, false);
				}
			});

			// Top bar actions
			// Client settings (menu)
			this.actionPair_client = new NodeGUI.QAction(this.MainWindow);
			this.actionPair_client.setObjectName("actionPair_client");
			this.actionPair_client.setText("Pair client");
			this.actionPair_client.addEventListener('triggered', () => {
				let tempConnectWindow = this.newChildWindow('tempConnectWindow');
				tempConnectWindow.show();
			});

			this.actionRefresh_client_info = new NodeGUI.QAction(this.MainWindow);
			this.actionRefresh_client_info.setObjectName("actionRefresh_client_info");
			this.actionRefresh_client_info.setText("Refresh client info");
			this.actionRefresh_client_info.addEventListener('triggered', () => {
				this.updateClientData();
			});
			


			this.actionSync_notifications = new NodeGUI.QAction(this.MainWindow);
			this.actionSync_notifications.setObjectName("actionSync_notifications");
			this.actionSync_notifications.setCheckable(true);
			this.actionSync_notifications.setChecked(true);
			this.actionSync_notifications.setText("Sync notifications");
			this.actionSync_notifications.addEventListener('triggered', (checked) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.notificationSettings.enabled = checked;
					this.chkSyncNotifications.setChecked(checked);
					client.save();
					client.syncConfiguration();
					this.saveClientData();
				}
			});

			this.actionToggleClipboardSharing = new NodeGUI.QAction(this.MainWindow);
			this.actionToggleClipboardSharing.setObjectName("actionToggleClipboardSharing");
			this.actionToggleClipboardSharing.setCheckable(true);
			this.actionToggleClipboardSharing.setText("Enable clipboard sharing");
			this.actionToggleClipboardSharing.addEventListener('triggered', (checked) => {
				let client = this.GetSelectedClient()
				if (client !== undefined) {
					this.updateEnableClipboardSharing(checked);
					if (this.chkSyncClipboard.isChecked() !== checked)
						this.chkSyncClipboard.setChecked(checked === true);
					this.saveClientData();
				}
			});

			this.actionSend_clipboard = new NodeGUI.QAction(this.MainWindow);
			this.actionSend_clipboard.setObjectName("actionSend_clipboard");
			this.actionSend_clipboard.setEnabled(false);
			this.actionSend_clipboard.setText("Send clipboard");
			this.actionSend_clipboard.addEventListener('triggered', () => {
				this.sendClipboardData();
			});
			this.actionReceive_clipboard = new NodeGUI.QAction(this.MainWindow);
			this.actionReceive_clipboard.setObjectName("actionReceive_clipboard");
			this.actionReceive_clipboard.setEnabled(false);
			this.actionReceive_clipboard.setText("Receive clipboard");
			this.actionReceive_clipboard.addEventListener('triggered', () => {
				this.receiveClipboardData();
			});
			
			this.actionToggleFileSharing = new NodeGUI.QAction(this.MainWindow);
			this.actionToggleFileSharing.setObjectName("actionToggleFileSharing");
			this.actionToggleFileSharing.setCheckable(true);
			this.actionToggleFileSharing.setText("Enable file sharing");
			this.actionToggleFileSharing.addEventListener('triggered', (checked) => {
				let client = this.GetSelectedClient()
				if (client !== undefined) {
					this.updateEnableFileSharing(checked);
					if (this.chkFileSharingEnable.isChecked() !== checked)
						this.chkFileSharingEnable.setChecked(checked);
					this.log("Saving + syncing configuration");
					client.save();
					client.syncConfiguration();
				}
			});
			this.actionToggleAllowClientToUpload = new NodeGUI.QAction(this.MainWindow);
			this.actionToggleAllowClientToUpload.setObjectName("actionToggleAllowClientToUpload");
			this.actionToggleAllowClientToUpload.setCheckable(true);
			this.actionToggleAllowClientToUpload.setEnabled(false);
			this.actionToggleAllowClientToUpload.setText("Allow client to upload");
			this.actionToggleAllowClientToUpload.addEventListener('triggered', (checked) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.fileSharingSettings.allowClientToUpload = checked;
					this.chkFilesharingAllowClientToUpload.setChecked(checked);
					this.log("Saving + syncing configuration");
					client.save();
					client.syncConfiguration();
				}
			});

			this.actionSend_file = new NodeGUI.QAction(this.MainWindow);
			this.actionSend_file.setObjectName("actionSend_file");
			this.actionSend_file.setEnabled(false);
			this.actionSend_file.setText("Send file");
			this.actionSend_file.addEventListener('triggered', () => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					this.#sendFile(client);
				}
			});

			this.actionDelete_client = new NodeGUI.QAction(this.MainWindow);
			this.actionDelete_client.setObjectName("actionDelete_client");
			this.actionDelete_client.setText("Delete client");
			this.actionDelete_client.addEventListener('triggered', () => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					let yesButton = new NodeGUI.QPushButton();
					yesButton.setText("Yes");

					let noButton = new NodeGUI.QPushButton();
					noButton.setText("No");

					let result = this.displayMessageBox("Delete and unpair " + (client.friendlyName === undefined? "the client" : client.friendlyName) + "?",
						"Are you sure you want to delete and unpair with " + (client.friendlyName === undefined? "the client" : client.friendlyName) + "?",
						[
							{ button: yesButton, buttonRole: NodeGUI.ButtonRole.AcceptRole },
							{ button: noButton, buttonRole: NodeGUI.ButtonRole.RejectRole },
						]);

					if (result != NodeGUI.DialogCode.Accepted) { // ?
						this.RemoveClientFromDeviceList(client.friendlyName);
						client.delete();
					}
				}
			});
			
			this.actionSync_configuration_with_client = new NodeGUI.QAction(this.MainWindow);
			this.actionSync_configuration_with_client.setObjectName("actionSync_configuration_with_client");
			this.actionSync_configuration_with_client.setText("Sync client configuration");
			this.actionSync_configuration_with_client.addEventListener('triggered', () => {
				let selectedItem = this.GetSelectedClient();
				if (selectedItem !== undefined) {
					selectedItem.syncConfiguration();
				}
			});

			this.actionView_connection_details = new NodeGUI.QAction(this.MainWindow);
			this.actionView_connection_details.setObjectName("actionView_connection_details");
			this.actionView_connection_details.setText("View connection details");
			this.actionView_connection_details.addEventListener('triggered', () => {
				let selectedItem = this.GetSelectedClient();
				if (selectedItem !== undefined && selectedItem.isConnected) {
					let connectionDetails = this.newChildWindow('ConnectionDetails');
					connectionDetails.setClient(selectedItem);
					connectionDetails.show();
				} else if (!selectedItem.isConnected) {
					let okayButton = new NodeGUI.QPushButton();
					okayButton.setText("Okay");
					this.displayMessageBox("Not connected", "Device is not connected",
						[{ button: okayButton, buttonRole: NodeGUI.ButtonRole.AcceptRole }]);
				}
			});


			this.actionRefresh_device_list = new NodeGUI.QAction(this.MainWindow);
			this.actionRefresh_device_list.setObjectName("actionRefresh_device_list");
			this.actionRefresh_device_list.setText("Refresh device list");
			this.actionRefresh_device_list.addEventListener('triggered', () => {
				this.addedClients.clear();
				this.clientListItems.clear();
				this.deviceList.clear();

				let clients = this.clientManager.getClients();
				clients.forEach((client, name) => {
					this.AddClientToDeviceList(client);
				});
			});


			let preferencePageShown = false;
			let preferencePage = this.newChildWindow('preferencePage');
			preferencePage.addEventListener(NodeGUI.WidgetEventTypes.Close, () => {
				preferencePageShown = false;
			});

			// Generic
			this.actionPreferences = new NodeGUI.QAction(this.MainWindow);
			this.actionPreferences.setObjectName("actionPreferences");
			// actionPreferences.setMenuRole(QAction::PreferencesRole);
			this.actionPreferences.setText("Preferences");
			this.actionPreferences.addEventListener('triggered', () => {
				// Open setting window
				if (preferencePageShown == false) {
					preferencePage.show();
					preferencePageShown = true;
				} else {
					preferencePage.setFocus(NodeGUI.FocusReason.PopupFocusReason);
				}
			});

			this.actionToggleConsoleVisibility = new NodeGUI.QAction(this.MainWindow);
			this.actionToggleConsoleVisibility.setObjectName("actionToggleConsoleVisibility");
			// actionPreferences.setMenuRole(QAction::PreferencesRole);
			this.actionToggleConsoleVisibility.setText("Toggle console visibility");
			this.actionToggleConsoleVisibility.addEventListener('triggered', () => {
				if (global.NeptuneRunnerIPC !== undefined) {
					if (global.consoleVisible) {
						global.NeptuneRunnerIPC.sendData("hideconsolewindow", {});
						this.actionToggleConsoleVisibility.setText("Show console");
					} else {
						global.NeptuneRunnerIPC.sendData("showconsolewindow", {});
						this.actionToggleConsoleVisibility.setText("Hide console");
					}
					global.consoleVisible = !global.consoleVisible;
				}
			});


			this.actionExit = new NodeGUI.QAction(this.MainWindow);
			this.actionExit.setObjectName("actionExit");
			// actionExit.setMenuRole(QAction::QuitRole);
			this.actionExit.setText("Exit");
			this.actionExit.addEventListener('triggered', () => {
				// Prompt if unsaved?
				this.close();
				process.Shutdown();
			});

			// Help menu
			this.actionView_GitHub_page = new NodeGUI.QAction(this.MainWindow);
			this.actionView_GitHub_page.setObjectName("actionView_GitHub_page");
			this.actionView_GitHub_page.setText("View GitHub page");
			this.actionView_GitHub_page.addEventListener('triggered', () => {
				// Open in browser
				var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
				require('node:child_process').exec(start + ' https://github.com/SCCapstone/Neptune');
			});
			this.actionTest_notification = new NodeGUI.QAction(this.MainWindow);
			this.actionTest_notification.setObjectName("actionTest_notification");
			this.actionTest_notification.setText("Test notifications");
			this.actionTest_notification.addEventListener('triggered', () => {
				let notification = new Notification({
					clientId: "Neptune",
					friendlyName: "MainWindow",
				}, {
					action: 'create',
					applicationPackage: 'com.neptune.server',
					applicationName: 'NeptuneServer',
					notificationId: 'mainwindow.testNotification',
					title: 'Neptune Test',
					type: 'text',

					contents: {
						text: 'This is a test notification. If you are seeing this, notifications are working!',
						subtext: "Main window",
						image: "data:image/jpeg;base64, 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",
						
						actions: [
							{
								"id": "btnLeft",
								"type": "button",
								"contents": "Reply"
							},
							{
								"id": "btnRight",
								"type": "button",
								"contents": "Button"
							},
							{
								"id": "textbox", // The 'name' of the action
								"type": "textbox", // Button OR textbox OR combobox

								"hintText": "Type a message...", // Unique to text box, the "hint"
							},
							{
								"id": "combobox", // The 'name' of the action
								"type": "combobox", // Button OR textbox OR combobox

								"choices": [ // Choices the user gets
									"Choice 1",
									"A different choice",
									"3rd choice!"
								],
							}
						]
					},

					onlyAlertOnce: false,
					priority: "default",
					isSilent: false,
				});
				notification.once('activate', (data) => {
					try {
						let button = "";
						let textbox = "";
						let combobox = "";
						if (data.actionParameters !== undefined) {
							if (data.actionParameters.id !== undefined) {
								button = Buffer.from(data.actionParameters.id, "base64").toString("utf8");
							}

							if (data.actionParameters.text !== undefined) {
								textbox = Buffer.from(data.actionParameters.text, "base64").toString("utf8");
							}

							if (data.actionParameters.comboBoxChoice !== undefined) {
								combobox = Buffer.from(data.actionParameters.comboBoxChoice, "base64").toString("utf8");
							}
						}


						this.displayMessageBox("Test notification activated", "The test notification was activated! Data:\n"
							+ ((button !== "")? "Button clicked: " + button : "Notification clicked") + "\n"
							+ ((textbox !== "")? "Entered text: " + textbox : "No text entered") + "\n"
							+ ((combobox !== "")? "Combo box selection: " + combobox : "No combo box selection made."));
					} catch (e) {
						
					}
				});
				notification.once('dismissed', () => {
					this.displayMessageBox("Test notification dismissed", "The test notification was dismissed!");
				});
				notification.push();
			});

			this.actionAbout_Neptune = new NodeGUI.QAction(this.MainWindow);
			this.actionAbout_Neptune.setObjectName("actionAbout_Neptune");
			// actionAbout_Neptune.setMenuRole(QAction::AboutRole);
			this.actionAbout_Neptune.setText("About Neptune");
			this.actionAbout_Neptune.addEventListener('triggered', () => {
				let aboutWindow = this.newChildWindow('aboutWindow');
				aboutWindow.show();
			});



			// MenuBar
			this.menuBar = new NodeGUI.QMenuBar();
			this.menuBar.setObjectName("menuBar");
			this.menuBar.setGeometry(0, 0, 598, 22);
			this.menuFile = new NodeGUI.QMenu();
			this.menuFile.setObjectName("menuFile");
			this.menuFile.setTitle("File")
			this.menuClient_settings = new NodeGUI.QMenu(this.menuFile);
			this.menuClient_settings.setObjectName("menuClient_settings");
			this.menuClient_settings.setTitle("Client settings");
			this.menuHelp = new NodeGUI.QMenu();
			this.menuHelp.setObjectName("menuHelp");
			this.menuHelp.setTitle("Help")


			// client settings
			this.menuClient_settings.addAction(this.actionSync_notifications);
			this.menuClient_settings.addSeparator();
			this.menuClient_settings.addAction(this.actionToggleClipboardSharing);
			this.menuClient_settings.addAction(this.actionSend_clipboard);
			this.menuClient_settings.addAction(this.actionReceive_clipboard);
			this.menuClient_settings.addSeparator();
			this.menuClient_settings.addAction(this.actionToggleFileSharing);
			this.menuClient_settings.addAction(this.actionToggleAllowClientToUpload);
			this.menuClient_settings.addAction(this.actionSend_file);
			this.menuClient_settings.addSeparator();
			this.menuClient_settings.addAction(this.actionDelete_client);
			this.menuClient_settings.addSeparator();
			this.menuClient_settings.addAction(this.actionSync_configuration_with_client);
			this.menuClient_settings.addAction(this.actionView_connection_details);
			this.menuClient_settings_action = new NodeGUI.QAction();
			this.menuClient_settings_action.setMenu(this.menuClient_settings);
			this.menuClient_settings_action.setText("Client settings");

			// file
			this.menuFile.addAction(this.actionPair_client);
			// this.menuFile.addAction(this.actionRefresh_device_list);
			this.menuFile.addSeparator();
			this.menuFile.addAction(this.menuClient_settings_action);
			this.menuFile.addSeparator();
			this.menuFile.addAction(this.actionPreferences);
			this.menuFile.addAction(this.actionToggleConsoleVisibility);
			this.menuFile.addSeparator();
			this.menuFile.addAction(this.actionExit);

			// help
			this.menuHelp.addAction(this.actionView_GitHub_page);
			this.menuHelp.addAction(this.actionTest_notification);
			this.menuHelp.addSeparator();
			this.menuHelp.addAction(this.actionAbout_Neptune);

			this.menuBar.addMenu(this.menuFile);
			this.menuBar.addAction(this.actionRefresh_device_list);
			this.menuBar.addAction(this.actionRefresh_client_info);
			// menuBar.addMenu(this.menuClient_settings);
			this.menuBar.addMenu(this.menuHelp);

			this.setMenuBar(this.menuBar);



			// Window
			let centralwidget = new NodeGUI.QWidget(this);
			centralwidget.setObjectName("centralwidget");
			let gridLayout_3 = new NodeGUI.QGridLayout(centralwidget);
			gridLayout_3.setSpacing(0);
			gridLayout_3.setObjectName("gridLayout_3");
			gridLayout_3.setContentsMargins(10, 10, 10, 10);
			let mainLayout = new NodeGUI.QGridLayout();
			mainLayout.setObjectName("mainLayout");
			mainLayout.setHorizontalSpacing(10);
			mainLayout.setVerticalSpacing(0);
			mainLayout.setContentsMargins(0, 0, 0, 0);

			// Device list box (side)
			let leftHandContainer = new NodeGUI.QGridLayout();
			leftHandContainer.setObjectName("leftHandContainer");
			leftHandContainer.setContentsMargins(0, 0, 0, 0);
			this.deviceList = new NodeGUI.QListWidget(centralwidget);
			this.deviceList.setObjectName("deviceList");
			this.deviceList.setSizePolicy(NodeGUI.QSizePolicyPolicy.Fixed, NodeGUI.QSizePolicyPolicy.Expanding);
			this.deviceList.setMinimumSize(50, 100);
			this.deviceList.setMaximumSize(125, 16777215);
			// this.deviceList.setToolTip("Client device selector.");
			this.deviceList.setAutoScroll(true);
			this.deviceList.addEventListener('itemSelectionChanged', () => {
				let clients = this.clientManager.getClients();

				if (this.GetSelectedClient() == undefined) {
					clients.forEach((client, name) => {
						client.eventEmitter.removeAllListeners();
					});

					this.menuClient_settings_action.setEnabled(false);
					this.scrollArea.setEnabled(false);
					this.actionRefresh_client_info.setEnabled(false);
					this.lblClientName.setText("");
					this.lblClientBatteryLevel.setText("");
					this.updateClientData();
				} else {
					clients.forEach((client, name) => {
						client.eventEmitter.on('configuration_update', () => this.updateClientData());
						client.eventEmitter.on('connected', () => this.updateClientData());
						client.eventEmitter.on('websocket_connected', () => this.updateClientData());
						client.eventEmitter.on('websocket_disconnected', () => this.updateClientData());
						client.eventEmitter.on('deleted', () => this.deviceList.clearSelection());
					});

					this.updateClientData();
					this.menuClient_settings_action.setEnabled(true);
					this.scrollArea.setEnabled(true);
					// this.scrollArea.setFocus(NodeGUI.FocusReason.OtherFocusReason);
					this.actionRefresh_client_info.setEnabled(true);
				}
			})

			leftHandContainer.addWidget(this.deviceList, 0, 0, 1, 1);

			let btnPair = new NodeGUI.QPushButton(centralwidget);
			btnPair.setObjectName("btnPair");
			if (this.enableToolTips)
				btnPair.setToolTip("Show instructions to connect a new device.");
			btnPair.setText("Pair");
			btnPair.addEventListener('clicked', () => {
				let tempConnectWindow = this.newChildWindow('tempConnectWindow');
				tempConnectWindow.show();
			});

			leftHandContainer.addWidget(btnPair, 1, 0, 1, 1);
			mainLayout.addLayout(leftHandContainer, 0, 0, 1, 1);


			// Main contents (setting view)
			this.scrollArea = new NodeGUI.QScrollArea(centralwidget);
			this.scrollArea.setObjectName("scrollArea");
			this.scrollArea.setMinimumSize(125, 175);
			this.scrollArea.setHorizontalScrollBarPolicy(NodeGUI.ScrollBarPolicy.ScrollBarAlwaysOff);
			this.scrollArea.setWidgetResizable(true);
			let scrollAreaWidgetContents = new NodeGUI.QWidget();
			scrollAreaWidgetContents.setObjectName("scrollAreaWidgetContents");
			scrollAreaWidgetContents.setGeometry(0, 0, 440, 498);
			scrollAreaWidgetContents.setMinimumSize(175, 0);
			let gridLayout = new NodeGUI.QGridLayout(scrollAreaWidgetContents);
			gridLayout.setSpacing(10);
			gridLayout.setObjectName("gridLayout");
			gridLayout.setContentsMargins(0, 0, 0, 0);

			// Top bar
			let deviceInfoWidget = new NodeGUI.QWidget(scrollAreaWidgetContents);
			deviceInfoWidget.setObjectName("deviceInfoWidget");

			// QSizePolicy sizePolicy1(QSizePolicy::Expanding, QSizePolicy::Fixed);
			// sizePolicy1.setHorizontalStretch(0);
			// sizePolicy1.setVerticalStretch(25);
			// sizePolicy1.setHeightForWidth(deviceInfoWidget.sizePolicy().hasHeightForWidth());
			deviceInfoWidget.setSizePolicy(NodeGUI.QSizePolicyPolicy.Expanding, NodeGUI.QSizePolicyPolicy.Fixed);
			deviceInfoWidget.setMinimumSize(0, 25);
			deviceInfoWidget.setMaximumSize(16777215, 25);
			let horizontalLayout = new NodeGUI.QBoxLayout(NodeGUI.Direction.LeftToRight, deviceInfoWidget);
			horizontalLayout.setObjectName("horizontalLayout");
			horizontalLayout.setContentsMargins(0, 0, 0, 0);
			this.lblClientName = new NodeGUI.QLabel(deviceInfoWidget);
			this.lblClientName.setObjectName("lblClientName");
			this.lblClientName.setMinimumSize(100, 25);
			this.lblClientName.setText("");

			horizontalLayout.addWidget(this.lblClientName);

			this.lblClientBatteryLevel = new NodeGUI.QLabel(deviceInfoWidget);
			this.lblClientBatteryLevel.setObjectName("lblClientBatteryLevel");
			this.lblClientBatteryLevel.setMinimumSize(138, 25);
			this.lblClientBatteryLevel.setMaximumSize(138, 25);
			this.lblClientBatteryLevel.setText("");
			this.lblClientBatteryLevel.setAlignment(NodeGUI.AlignmentFlag.AlignRight | NodeGUI.AlignmentFlag.AlignVCenter);

			horizontalLayout.addWidget(this.lblClientBatteryLevel);


			gridLayout.addWidget(deviceInfoWidget, 0, 0, 1, 1);


			// Settings
			let deviceSettingsWidget = new NodeGUI.QWidget(scrollAreaWidgetContents);
			deviceSettingsWidget.setObjectName("deviceSettingsWidget");
			let gridDeviceSettings = new NodeGUI.QGridLayout(deviceSettingsWidget);
			gridDeviceSettings.setObjectName("gridDeviceSettings");
			gridDeviceSettings.setHorizontalSpacing(0);
			gridDeviceSettings.setVerticalSpacing(8);
			gridDeviceSettings.setContentsMargins(0, 0, 0, 20);
			let syncSettingsContainer = new NodeGUI.QWidget(deviceSettingsWidget);
			syncSettingsContainer.setObjectName("syncSettingsContainer");
			// QSizePolicy sizePolicy2(QSizePolicy::Preferred, QSizePolicy::Preferred);
			// sizePolicy2.setHorizontalStretch(0);
			// sizePolicy2.setVerticalStretch(0);
			// sizePolicy2.setHeightForWidth(syncSettingsContainer.sizePolicy().hasHeightForWidth());
			// syncSettingsContainer.setSizePolicy(sizePolicy2);
			let gridLayout_2 = new NodeGUI.QGridLayout(syncSettingsContainer);
			gridLayout_2.setObjectName("gridLayout_2");
			gridLayout_2.setContentsMargins(0, 0, 0, 0);
			let lblSyncSettings = new NodeGUI.QLabel(syncSettingsContainer);
			lblSyncSettings.setObjectName("lblSyncSettings");
			// sizePolicy.setHeightForWidth(lblSyncSettings.sizePolicy().hasHeightForWidth());
			lblSyncSettings.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			lblSyncSettings.setMinimumSize(30, 0);
			lblSyncSettings.setMaximumSize(16777215, 30);
			let font = new NodeGUI.QFont();
			font.setPointSize(14);
			font.setBold(true);
			font.setWeight(75);
			lblSyncSettings.setFont(font);
			if (this.enableToolTips)
				lblSyncSettings.setToolTip("");
			lblSyncSettings.setText("Sync settings");
			lblSyncSettings.setAlignment(NodeGUI.AlignmentFlag.AlignBottom | NodeGUI.AlignmentFlag.AlignLeft);

			gridLayout_2.addWidget(lblSyncSettings, 0, 0, 1, 1);

			let vlayCheckBoxes = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom);
			vlayCheckBoxes.setSpacing(5);
			vlayCheckBoxes.setObjectName("vlayCheckBoxes");
			let syncSettingsNotificationsContainer = new NodeGUI.QWidget(syncSettingsContainer);
			syncSettingsNotificationsContainer.setObjectName("syncSettingsNotificationsContainer");
			// sizePolicy.setHeightForWidth(syncSettingsNotificationsContainer.sizePolicy().hasHeightForWidth());
			syncSettingsNotificationsContainer.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			let verticalLayout_3 = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom, syncSettingsNotificationsContainer);
			verticalLayout_3.setObjectName("verticalLayout_3");
			verticalLayout_3.setContentsMargins(0, 0, 0, 0);
			this.chkSyncNotifications = new NodeGUI.QCheckBox(syncSettingsNotificationsContainer);
			this.chkSyncNotifications.setObjectName("chkSyncNotifications");
			let font1 = new NodeGUI.QFont();
			this.chkSyncNotifications.setFont(font1);
			this.chkSyncNotifications.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkSyncNotifications.setToolTip("Receive notifications from the client device.");
			this.chkSyncNotifications.setText("Sync notifications");
			this.chkSyncNotifications.setChecked(true);
			this.chkSyncNotifications.addEventListener('clicked', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.notificationSettings.enabled = (state === 2);
					this.actionSync_notifications.setChecked(state === 2);

					this.clientSettingChanged();
				}
			});


			verticalLayout_3.addWidget(this.chkSyncNotifications);


			vlayCheckBoxes.addWidget(syncSettingsNotificationsContainer);

			let hlineUnderNotifications = new NodeGUI.QFrame(syncSettingsContainer);
			hlineUnderNotifications.setObjectName("hlineUnderNotifications");
			hlineUnderNotifications.setFrameShape(NodeGUI.Shape.HLine);
			hlineUnderNotifications.setFrameShadow(NodeGUI.Shadow.Sunken);

			vlayCheckBoxes.addWidget(hlineUnderNotifications);

			let syncSettingsClipboardContainer = new NodeGUI.QWidget(syncSettingsContainer);
			syncSettingsClipboardContainer.setObjectName("syncSettingsClipboardContainer");
			//syncSettingsClipboardContainer.setEnabled(false);
			// sizePolicy.setHeightForWidth(syncSettingsClipboardContainer.sizePolicy().hasHeightForWidth());
			syncSettingsClipboardContainer.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			let verticalLayout_2 = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom, syncSettingsClipboardContainer);
			verticalLayout_2.setObjectName("verticalLayout_2");
			verticalLayout_2.setContentsMargins(0, 0, 0, 0);
			this.chkSyncClipboard = new NodeGUI.QCheckBox(syncSettingsClipboardContainer);
			this.chkSyncClipboard.setObjectName("chkSyncClipboard");
			this.chkSyncClipboard.setFont(font1);
			this.chkSyncClipboard.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkSyncClipboard.setToolTip("Allow syncing the clipboard between this computer and the client device.");
			this.chkSyncClipboard.setText("Enable sharing clipboard");
			this.chkSyncClipboard.addEventListener('clicked', (state) => {
				this.updateEnableClipboardSharing(state === 2? true : false);
				if (this.actionToggleClipboardSharing.isChecked() !== (state === 2))
					this.actionToggleClipboardSharing.setChecked(state === 2);

				this.clientSettingChanged();
			});

			verticalLayout_2.addWidget(this.chkSyncClipboard);

			this.chkAutoSendClipboard = new NodeGUI.QCheckBox(syncSettingsClipboardContainer);
			this.chkAutoSendClipboard.setObjectName("chkAutoSendClipboard");
			this.chkAutoSendClipboard.setFont(font1);
			this.chkAutoSendClipboard.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkAutoSendClipboard.setToolTip("Automatically send this computer's clipboard data to the client.");
			this.chkAutoSendClipboard.setStyleSheet("margin-left: 25px;");
			this.chkAutoSendClipboard.setText("Automatically send to client");
			this.chkAutoSendClipboard.addEventListener('clicked', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.clipboardSettings.synchronizeClipboardToClient = (state === 2);
					this.clientSettingChanged();
				}
			});

			verticalLayout_2.addWidget(this.chkAutoSendClipboard);

			this.chkClipboardAllowClientToGet = new NodeGUI.QCheckBox(syncSettingsClipboardContainer);
			this.chkClipboardAllowClientToGet.setObjectName("chkClipboardAllowClientToGet");
			this.chkClipboardAllowClientToGet.setFont(font1);
			this.chkClipboardAllowClientToGet.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkClipboardAllowClientToGet.setToolTip("Allows the client to request and receive this computer's clipboard contents.");
			this.chkClipboardAllowClientToGet.setStyleSheet("margin-left: 25px;");
			this.chkClipboardAllowClientToGet.setText("Allow client to request clipboard data");
			this.chkClipboardAllowClientToGet.addEventListener('clicked', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.clipboardSettings.allowClientToGet = (state === 2);
					this.clientSettingChanged();
				}
			});

			verticalLayout_2.addWidget(this.chkClipboardAllowClientToGet);


			vlayCheckBoxes.addWidget(syncSettingsClipboardContainer);

			let hlineUnderClipboard = new NodeGUI.QFrame(syncSettingsContainer);
			hlineUnderClipboard.setObjectName("hlineUnderClipboard");
			hlineUnderClipboard.setFrameShape(NodeGUI.Shape.HLine);
			hlineUnderClipboard.setFrameShadow(NodeGUI.Shadow.Sunken);

			vlayCheckBoxes.addWidget(hlineUnderClipboard);

			let syncSettingsFileSharingContainer = new NodeGUI.QWidget(syncSettingsContainer);
			syncSettingsFileSharingContainer.setObjectName("syncSettingsFileSharingContainer");
			//syncSettingsFileSharingContainer.setEnabled(false);
			// sizePolicy.setHeightForWidth(syncSettingsFileSharingContainer.sizePolicy().hasHeightForWidth());
			syncSettingsFileSharingContainer.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			let gridLayout_4 = new NodeGUI.QGridLayout(syncSettingsFileSharingContainer);
			gridLayout_4.setObjectName("gridLayout_4");
			gridLayout_4.setContentsMargins(0, 0, 0, 0);
			let fileSharingCheckboxes = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom);
			fileSharingCheckboxes.setObjectName("fileSharingCheckboxes");
			this.chkFileSharingEnable = new NodeGUI.QCheckBox(syncSettingsFileSharingContainer);
			this.chkFileSharingEnable.setObjectName("chkFileSharingEnable");
			this.chkFileSharingEnable.setFont(font1);
			this.chkFileSharingEnable.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkFileSharingEnable.setToolTip("Enable sending and receiving files for this client.");
			this.chkFileSharingEnable.setText("Enable file sharing");
			this.chkFileSharingEnable.addEventListener('clicked', (state) => {
				this.updateEnableFileSharing(state == 2? true : false);
				if (this.actionToggleFileSharing.isChecked() !== (state === 2))
					this.actionToggleFileSharing.setChecked(state === 2);
				this.clientSettingChanged();
			});

			fileSharingCheckboxes.addWidget(this.chkFileSharingEnable);

			this.chkFileSharingAutoAccept = new NodeGUI.QCheckBox(syncSettingsFileSharingContainer);
			this.chkFileSharingAutoAccept.setObjectName("chkFileSharingAutoAccept");
			this.chkFileSharingAutoAccept.setFont(font1);
			this.chkFileSharingAutoAccept.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkFileSharingAutoAccept.setToolTip("Automatically accept incoming files from this device.");
			this.chkFileSharingAutoAccept.setStyleSheet("margin-left: 25px;");
			this.chkFileSharingAutoAccept.setText("Automatically accept incoming files");
			this.chkFileSharingAutoAccept.addEventListener('clicked', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.fileSharingSettings.requireConfirmationOnClinetUploads = (state !== 2);
					this.clientSettingChanged();
				}
			});

			fileSharingCheckboxes.addWidget(this.chkFileSharingAutoAccept);

			this.chkFileSharingNotify = new NodeGUI.QCheckBox(syncSettingsFileSharingContainer);
			this.chkFileSharingNotify.setObjectName("chkFileSharingNotify");
			this.chkFileSharingNotify.setFont(font1);
			this.chkFileSharingNotify.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkFileSharingNotify.setToolTip("Notify on incoming files for this device.");
			this.chkFileSharingNotify.setStyleSheet("margin-left: 25px;");
			this.chkFileSharingNotify.setText("Notify on receive");
			this.chkFileSharingNotify.addEventListener('clicked', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.fileSharingSettings.notifyOnReceive = (state === 2);
					this.clientSettingChanged();
				}
			});

			fileSharingCheckboxes.addWidget(this.chkFileSharingNotify);

			this.chkFilesharingAllowClientToUpload = new NodeGUI.QCheckBox(syncSettingsFileSharingContainer);
			this.chkFilesharingAllowClientToUpload.setObjectName("chkFilesharingAllowClientToUpload");
			this.chkFilesharingAllowClientToUpload.setFont(font1);
			this.chkFilesharingAllowClientToUpload.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.chkFilesharingAllowClientToUpload.setToolTip("Allows the client to browse the files on this computer.");
			this.chkFilesharingAllowClientToUpload.setStyleSheet("margin-left: 25px;");
			this.chkFilesharingAllowClientToUpload.setText("Allow client to upload files.");
			this.chkFilesharingAllowClientToUpload.addEventListener('clicked', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.fileSharingSettings.allowClientToUpload = (state === 2);
					this.actionToggleAllowClientToUpload.setChecked(state === 2);
					this.clientSettingChanged();
				}
			});

			fileSharingCheckboxes.addWidget(this.chkFilesharingAllowClientToUpload);


			gridLayout_4.addLayout(fileSharingCheckboxes, 0, 0, 1, 1);

			let widget = new NodeGUI.QWidget(syncSettingsFileSharingContainer);
			widget.setObjectName("widget");
			// sizePolicy.setHeightForWidth(widget.sizePolicy().hasHeightForWidth());
			widget.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			widget.setMinimumSize(0, 0);
			let gridLayout_5 = new NodeGUI.QGridLayout(widget);
			gridLayout_5.setObjectName("gridLayout_5");
			this.txtFileSharingSaveDirectory = new NodeGUI.QLineEdit(widget);
			this.txtFileSharingSaveDirectory.setObjectName("txtFileSharingSaveDirectory");
			this.txtFileSharingSaveDirectory.setEnabled(false);
			let saveDirectory = "";
			if (this.GetSelectedClient() !== undefined) {
				let client = this.GetSelectedClient();
				saveDirectory = client.getReceivedFilesDirectory();
			}
			this.txtFileSharingSaveDirectory.setText(saveDirectory);
			if (this.enableToolTips)
				this.txtFileSharingSaveDirectory.setToolTip("Directory incoming files are saved to.");

			gridLayout_5.addWidget(this.txtFileSharingSaveDirectory, 1, 0, 1, 1);

			this.btnFileSharingSaveDirectoryBrowse = new NodeGUI.QPushButton(widget);
			this.btnFileSharingSaveDirectoryBrowse.setObjectName("btnFileSharingSaveDirectoryBrowse");
			this.btnFileSharingSaveDirectoryBrowse.setFont(font1);
			this.btnFileSharingSaveDirectoryBrowse.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.btnFileSharingSaveDirectoryBrowse.setToolTip("Open folder picker dialog.");
			this.btnFileSharingSaveDirectoryBrowse.setText("Browse");
			this.btnFileSharingSaveDirectoryBrowse.addEventListener('clicked', () => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					let fileDialog = new NodeGUI.QFileDialog();
					fileDialog.setFileMode(NodeGUI.FileMode.Directory);
					fileDialog.setWindowTitle("Select a download folder for " + (client.friendlyName !== undefined? client.friendlyName : "the client") + ".");
					fileDialog.setOptions(NodeGUI.Option.ShowDirsOnly);
					let acceptedOrDenied = fileDialog.exec();
					if (acceptedOrDenied == NodeGUI.DialogCode.Accepted) {
						let selectedFolder = fileDialog.selectedFiles()[0];
						client.fileSharingSettings.receivedFilesDirectory = selectedFolder;
						saveDirectory = client.getReceivedFilesDirectory(); // runs checks ?
						this.txtFileSharingSaveDirectory.setText(saveDirectory);
						this.clientSettingChanged();
					}
				}
			});


			gridLayout_5.addWidget(this.btnFileSharingSaveDirectoryBrowse, 1, 1, 1, 1);

			let lblSaveFilesTo = new NodeGUI.QLabel(widget);
			lblSaveFilesTo.setObjectName("lblSaveFilesTo");
			lblSaveFilesTo.setFont(font1);
			lblSaveFilesTo.setText("Save files to:");

			gridLayout_5.addWidget(lblSaveFilesTo, 0, 0, 1, 1);


			gridLayout_4.addWidget(widget, 1, 0, 1, 1);


			vlayCheckBoxes.addWidget(syncSettingsFileSharingContainer);


			gridLayout_2.addLayout(vlayCheckBoxes, 1, 0, 1, 1);


			gridDeviceSettings.addWidget(syncSettingsContainer, 1, 0, 1, 1);

			let bottomButtonContiner = new NodeGUI.QWidget(deviceSettingsWidget);
			bottomButtonContiner.setObjectName("bottomButtonContiner");
			// sizePolicy.setHeightForWidth(bottomButtonContiner.sizePolicy().hasHeightForWidth());
			bottomButtonContiner.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			let verticalLayout_4 = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom, bottomButtonContiner);
			verticalLayout_4.setSpacing(5);
			verticalLayout_4.setObjectName("verticalLayout_4");
			verticalLayout_4.setContentsMargins(0, 0, 0, 0);
			let hlaySaveButton = new NodeGUI.QBoxLayout(NodeGUI.Direction.LeftToRight);
			hlaySaveButton.setObjectName("hlaySaveButton");
			this.btnSave = new NodeGUI.QPushButton(bottomButtonContiner);
			this.btnSave.setObjectName("btnSave");
			// QSizePolicy sizePolicy3(QSizePolicy::Fixed, QSizePolicy::Fixed);
			// sizePolicy3.setHorizontalStretch(0);
			// sizePolicy3.setVerticalStretch(0);
			// sizePolicy3.setHeightForWidth(btnSave.sizePolicy().hasHeightForWidth());
			this.btnSave.setSizePolicy(NodeGUI.QSizePolicyPolicy.Fixed, NodeGUI.QSizePolicyPolicy.Fixed);
			this.btnSave.setMinimumSize(200, 30);
			this.btnSave.setFont(font1);
			this.btnSave.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.btnSave.setToolTip("Save client settings.");
			this.btnSave.setText("Save");
			this.btnSave.addEventListener('clicked', () => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					this.saveClientData();
				}
			});
			hlaySaveButton.addWidget(this.btnSave);

			verticalLayout_4.addLayout(hlaySaveButton);


			if (!NeptuneConfig.applicationSettings.requireSaveButton) {
				this.btnSave.setVisible(false);
				this.btnSave.setEnabled(false);
			}



			let hlayDeleteButton = new NodeGUI.QBoxLayout(NodeGUI.Direction.LeftToRight);
			hlayDeleteButton.setObjectName("hlayDeleteButton");
			this.btnDelete = new NodeGUI.QPushButton(bottomButtonContiner);
			this.btnDelete.setObjectName("btnDelete");
			this.btnDelete.setSizePolicy(NodeGUI.QSizePolicyPolicy.Fixed, NodeGUI.QSizePolicyPolicy.Fixed);
			this.btnDelete.setMinimumSize(200, 30);
			this.btnDelete.setFont(font1);
			this.btnDelete.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.btnDelete.setToolTip("Delete this client.");
			this.btnDelete.setText("Delete");
			this.btnDelete.addEventListener('clicked', () => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					let okayButton = new NodeGUI.QPushButton();
					okayButton.setText("Yes");

					let cancelButton = new NodeGUI.QPushButton();
					cancelButton.setText("No");

					let result = this.displayMessageBox("Delete and unpair " + (client.friendlyName === undefined? "the client" : client.friendlyName) + "?",
						"Are you sure you want to delete and unpair with " + (client.friendlyName === undefined? "the client" : client.friendlyName) + "?",
						[
							{ button: okayButton, buttonRole: NodeGUI.ButtonRole.AcceptRole },
							{ button: cancelButton, buttonRole: NodeGUI.ButtonRole.RejectRole },
						]);

					if (result != NodeGUI.DialogCode.Accepted) {
						this.RemoveClientFromDeviceList(client.friendlyName);
						client.delete();
					}
				}
			});

			hlayDeleteButton.addWidget(this.btnDelete);


			verticalLayout_4.addLayout(hlayDeleteButton);


			gridDeviceSettings.addWidget(bottomButtonContiner, 3, 0, 1, 1);

			let topButtonContainer = new NodeGUI.QWidget(deviceSettingsWidget);
			topButtonContainer.setObjectName("topButtonContainer");
			topButtonContainer.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			topButtonContainer.setMinimumSize(250, 0);
			let verticalLayout = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom, topButtonContainer);
			verticalLayout.setSpacing(5);
			verticalLayout.setObjectName("verticalLayout");
			verticalLayout.setContentsMargins(0, 0, 0, 0);
			this.btnSendFile = new NodeGUI.QPushButton(topButtonContainer);
			this.btnSendFile.setObjectName("btnSendFile");
			this.btnSendFile.setMinimumSize(255, 30);
			this.btnSendFile.setFont(font1);
			this.btnSendFile.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.btnSendFile.setToolTip("Open the file selector dialog and send a file to the client device.");
			this.btnSendFile.setText("Send file");
			this.btnSendFile.setEnabled(false);
			this.btnSendFile.addEventListener('clicked', () => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					this.#sendFile(client);
				}
			});

			verticalLayout.addWidget(this.btnSendFile);

			let hlayClipboardContainer = new NodeGUI.QWidget(topButtonContainer);
			hlayClipboardContainer.setObjectName("hlayClipboardContainer");
			// QSizePolicy sizePolicy4(QSizePolicy::Preferred, QSizePolicy::Fixed);
			// sizePolicy4.setHorizontalStretch(0);
			// sizePolicy4.setVerticalStretch(30);
			// sizePolicy4.setHeightForWidth(hlayClipboardContainer.sizePolicy().hasHeightForWidth());
			hlayClipboardContainer.setSizePolicy(NodeGUI.QSizePolicyPolicy.Preferred, NodeGUI.QSizePolicyPolicy.Fixed);
			hlayClipboardContainer.setMinimumSize(255, 30);
			hlayClipboardContainer.setMaximumSize(16777215, 30);
			let horizontalLayout_3 = new NodeGUI.QBoxLayout(NodeGUI.Direction.LeftToRight, hlayClipboardContainer);
			horizontalLayout_3.setSpacing(5);
			horizontalLayout_3.setObjectName("horizontalLayout_3");
			horizontalLayout_3.setContentsMargins(0, 0, 0, 0);
			this.btnSendClipboard = new NodeGUI.QPushButton(hlayClipboardContainer);
			this.btnSendClipboard.setObjectName("btnSendClipboard");
			this.btnSendClipboard.setMinimumSize(115, 30);
			this.btnSendClipboard.setFont(font1);
			this.btnSendClipboard.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.btnSendClipboard.setToolTip("Send this computer's clipboard data to the client device.");
			this.btnSendClipboard.setText("Send clipboard");
			this.btnSendClipboard.setEnabled(false);
			this.btnSendClipboard.addEventListener('clicked', () => {
				this.sendClipboardData();
			});

			horizontalLayout_3.addWidget(this.btnSendClipboard);

			this.btnReceiveClipboard = new NodeGUI.QPushButton(hlayClipboardContainer);
			this.btnReceiveClipboard.setObjectName("btnReceiveClipboard");
			this.btnReceiveClipboard.setMinimumSize(115, 30);
			this.btnReceiveClipboard.setFont(font1);
			this.btnReceiveClipboard.setCursor(NodeGUI.CursorShape.PointingHandCursor);
			if (this.enableToolTips)
				this.btnReceiveClipboard.setToolTip("Request the clipboard data from the client device.");
			this.btnReceiveClipboard.setText("Receive clipboard");
			this.btnReceiveClipboard.setEnabled(false);
			this.btnReceiveClipboard.addEventListener('clicked', () => {
				this.receiveClipboardData();
			});

			horizontalLayout_3.addWidget(this.btnReceiveClipboard);


			verticalLayout.addWidget(hlayClipboardContainer);


			gridDeviceSettings.addWidget(topButtonContainer, 0, 0, 1, 1);


			gridLayout.addWidget(deviceSettingsWidget, 2, 0, 1, 1);

			this.scrollArea.setWidget(scrollAreaWidgetContents);

			mainLayout.addWidget(this.scrollArea, 0, 1, 1, 1);


			gridLayout_3.addLayout(mainLayout, 0, 0, 1, 1);

			this.setCentralWidget(centralwidget);


			// add clients
			try {
				var removeFunction = this.RemoveClientFromDeviceList;
				var addFunction = this.AddClientToDeviceList;

				let clients = this.clientManager.getClients();
				clients.forEach((client, name) => {
					this.AddClientToDeviceList(client);
				});

				let maybeThis = this;
				this.clientManager.addListener('added', (client) => {
					if (maybeThis.isVisible()) {
						console.log("ADDED")
						maybeThis.AddClientToDeviceList(client);
					}
				});
				this.clientManager.addListener('removed', (client) => {
					if (maybeThis.isVisible()) {
						maybeThis.RemoveClientFromDeviceList(client);
					}
				});

				this.updateClientData();
			} catch (ee) {}
		} catch(e) {
			console.log(e)
		}
	}

	/**
	 * @typedef {object} messageboxButtons
	 * @property {NodeGUI.QPushButton} button
	 * @property {NodeGUI.ButtonRole} buttonRole
	 */

	/**
	 * Displays a message box with custom buttons.
	 *
	 * @param {string} title - The title of the message box.
	 * @param {string} message - The message text of the message box.
	 * @param {messageboxButtons[]} buttons - An array of objects representing each custom button to add to the message box. Each object should contain a `button` property representing the `QPushButton` object, and an optional `buttonRole` property representing the button role (defaults to `ButtonRole.AcceptRole` if not specified).
	 *
	 * @returns {NodeGUI.DialogCode} - Whether the dialog was accepted `NodeGUI.DialogCode.Accepted` or rejected `NodeGUI.DialogCode.Rejected`.
	 */
	displayMessageBox(title, message, buttons) {
		if (!this.isVisible())
			return;

		const messageBox = new NodeGUI.QMessageBox();
		messageBox.setWindowTitle(title);
		messageBox.setText(message);
		if (!global.RunningTest) // I hate this
			messageBox.setWindowIcon(process.ResourceManager.ApplicationIcon);
		if (process.platform == 'win32') {
			try {
				// This allows NeptuneRunner to fix the window's taskbar data
				messageBox.addEventListener(NodeGUI.WidgetEventTypes.Show, () => {
					global.NeptuneRunnerIPC.pipe.write("fixwinhwnd" + this.winId() + "");
				});
			} catch (_) {}
		}

		if (buttons === undefined) {
			let okayButton = new NodeGUI.QPushButton();
			okayButton.setText("Okay");
			buttons = [{ button: okayButton, buttonRole: NodeGUI.ButtonRole.AcceptRole }]
		}

		// Add custom buttons to the message box
		buttons.forEach(({ button, buttonRole }) => {
			messageBox.addButton(button, buttonRole || NodeGUI.ButtonRole.AcceptRole);

			button.addEventListener('clicked', () => {
				messageBox.done(buttonRole || NodeGUI.ButtonRole.AcceptRole);
			});
		});

		// Show the message box and return the result
		const result = messageBox.exec();
		return result;
	}


	/**
	 * Open the file dialog picker for the user to select files to send to a client.
	 * @param {Client} client - The client files will be sent to.
	 */
	#sendFile(client) {
		try {
			let fileDialog = new NodeGUI.QFileDialog();
			fileDialog.setFileMode(NodeGUI.FileMode.ExistingFiles);
			fileDialog.setWindowTitle("Send a file to " + (client.friendlyName !== undefined? client.friendlyName : "the client") + ".");
			fileDialog.setOptions(NodeGUI.Option.DontConfirmOverwrite);
			fileDialog.setNameFilter('All files (*.*)');
			let acceptedOrDenied = fileDialog.exec();
			if (acceptedOrDenied == NodeGUI.DialogCode.Accepted) {
				let files = fileDialog.selectedFiles();

				files.forEach(filePath => {
					client.sendFile(filePath);
				});
			}
		} catch(error) {

			let okayButton = new NodeGUI.QPushButton();
			okayButton.setText("Okay");

			this.displayMessageBox(
				"Failed to send file.",
				"Failed to send selected file(s) to the client.\nReason: " + error.message,
				[
					{ button: okayButton, buttonRole: NodeGUI.ButtonRole.AcceptRole },
				]
			);
		}
	}
}

module.exports = thisTest;