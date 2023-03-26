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
const { connect }= require("http2");
const ResourceManager = new (require("../ResourceManager"))();
const NeptuneWindow = require("./NeptuneWindow");


const Notifier = require("node-notifier"); // does not work with windows action center!
const Client = require("../Classes/Client");
const Notification = require("../Classes/Notification");

class thisTest extends NeptuneWindow {
	/**
	 * Whether tooltips are enabled or not. Default no, they're a bit laggy.
	 * @type {boolean}
	 */
	enableToolTips = false;


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
	actionBrowse_for_file;

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


	/** @type {import('./../Classes/LogMan').Logger} */
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

		let clientManager = Neptune.clientManager;
		let clients = clientManager.getClients();
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
			this.txtFileSharingSaveDirectory.setEnabled(enabled === true);
			this.btnFileSharingSaveDirectoryBrowse.setEnabled(enabled === true);

			this.actionToggleAllowClientToUpload.setEnabled(enabled === true);
			this.actionSend_file.setEnabled(enabled === true);
			this.actionBrowse_for_file.setEnabled(enabled === true);
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
			this.chkSyncClipboard.setChecked(client.clipboardSettings.enabled === true);

			this.chkAutoSendClipboard.setChecked(client.clipboardSettings.autoSendToClient === true);
			this.chkAutoSendClipboard.setEnabled(client.clipboardSettings.enabled === true);

			this.chkClipboardAllowClientToGet.setChecked(client.clipboardSettings.allowClientToGet === true);
			this.chkClipboardAllowClientToGet.setEnabled(client.clipboardSettings.enabled === true);
			


			// file sharing
			this.chkFileSharingEnable.setChecked(client.fileSharingSettings.enabled === true);
			this.btnSendFile.setEnabled(client.fileSharingSettings.enabled === true);

			this.chkFileSharingAutoAccept.setChecked(client.fileSharingSettings.autoReceiveFromClient === true);
			this.chkFileSharingAutoAccept.setEnabled(client.fileSharingSettings.enabled === true);

			this.chkFileSharingNotify.setChecked(client.fileSharingSettings.notifyOnReceive === true);
			this.chkFileSharingNotify.setEnabled(client.fileSharingSettings.enabled === true);

			this.chkFilesharingAllowClientToUpload.setChecked(client.fileSharingSettings.allowClientToUpload === true);
			this.chkFilesharingAllowClientToUpload.setEnabled(client.fileSharingSettings.enabled === true);

			this.txtFileSharingSaveDirectory.setText(client.fileSharingSettings.receivedFilesDirectory !== undefined? client.fileSharingSettings.receivedFilesDirectory : "");
			this.txtFileSharingSaveDirectory.setEnabled(client.fileSharingSettings.enabled === true);
			this.btnFileSharingSaveDirectoryBrowse.setEnabled(client.fileSharingSettings.enabled === true);
		}
	}
	saveClientData() {
		let client = this.GetSelectedClient();
		if (client == undefined) {
			this.menuClient_settings_action.setEnabled(false);
			this.scrollArea.setEnabled(false);
			this.actionRefresh_client_info.setEnabled(false);
		} else {
			this.menuClient_settings_action.setEnabled(true);
			this.scrollArea.setEnabled(true);
			this.actionRefresh_client_info.setEnabled(true);

			client.notificationSettings.enabled = this.chkSyncNotifications.isChecked(); //(client.notificationSettings.enabled !== false);
			// clipboard
			client.clipboardSettings.enabled = this.chkSyncClipboard.isChecked(); //(client.clipboardSettings.enabled === true);
			client.clipboardSettings.autoSendToClient = this.chkAutoSendClipboard.isChecked(); //(client.clipboardSettings.autoSendToClient === true);
			client.clipboardSettings.allowClientToGet = this.chkClipboardAllowClientToGet.isChecked(); //(client.clipboardSettings.allowClientToGet === true);

			// file sharing
			client.fileSharingSettings.enabled = this.chkFileSharingEnable.isChecked(); //(client.fileSharingSettings.enabled === true);
			client.fileSharingSettings.autoReceiveFromClient = this.chkFileSharingAutoAccept.isChecked(); //(client.fileSharingSettings.autoReceiveFromClient === true);
			client.fileSharingSettings.notifyOnReceive = this.chkFileSharingNotify.isChecked(); //(client.fileSharingSettings.notifyOnReceive === true);
			client.fileSharingSettings.allowClientToUpload = this.chkFilesharingAllowClientToUpload.isChecked(); //(client.fileSharingSettings.allowClientToUpload === true);

			client.fileSharingSettings.receivedFilesDirectory = this.txtFileSharingSaveDirectory.text(); //(client.fileSharingSettings.receivedFilesDirectory);


			client.save();
			client.syncConfiguration();
		}
	}


	constructor(arg) {
		super(arg);

		try {
			this.log = global.Neptune.logMan.getLogger("MainWindow");

			this.setWindowTitle('Neptune | Main window');
			this.resize(599, 522);
			this.setMinimumSize(425, 300);

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
					this.log("Saving + syncing configuration");
					client.save();
					client.syncConfiguration();
				}
			});

			this.actionToggleClipboardSharing = new NodeGUI.QAction(this.MainWindow);
			this.actionToggleClipboardSharing.setObjectName("actionToggleClipboardSharing");
			this.actionToggleClipboardSharing.setCheckable(true);
			this.actionToggleClipboardSharing.setEnabled(false);
			this.actionToggleClipboardSharing.setText("Enable clipboard sharing");
			this.actionToggleClipboardSharing.addEventListener('triggered', (checked) => {
				let client = this.GetSelectedClient()
				if (client !== undefined) {
					this.updateEnableClipboardSharing(checked);
					this.log("Saving + syncing configuration");
					client.save();
					client.syncConfiguration();
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
			this.actionToggleFileSharing.setEnabled(false);
			this.actionToggleFileSharing.setText("Enable file sharing");
			this.actionToggleFileSharing.addEventListener('triggered', (checked) => {
				let client = this.GetSelectedClient()
				if (client !== undefined) {
					this.updateEnableFileSharing(checked);
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
			this.actionBrowse_for_file = new NodeGUI.QAction(this.MainWindow);
			this.actionBrowse_for_file.setObjectName("actionBrowse_for_file");
			this.actionBrowse_for_file.setEnabled(false);
			this.actionBrowse_for_file.setText("Browse for file");

			this.actionDelete_client = new NodeGUI.QAction(this.MainWindow);
			this.actionDelete_client.setObjectName("actionDelete_client");
			this.actionDelete_client.setText("Delete client");
			this.actionDelete_client.addEventListener('triggered', () => {
				// prompt to confirm.
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					this.RemoveClientFromDeviceList(client.friendlyName);
					client.delete();
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
				if (selectedItem !== undefined) {
					let newConnectionDetails = this.newChildWindow('newConnectionDetails');
					newConnectionDetails.setClient(selectedItem);
					newConnectionDetails.show();
				}
			});


			this.actionRefresh_device_list = new NodeGUI.QAction(this.MainWindow);
			this.actionRefresh_device_list.setObjectName("actionRefresh_device_list");
			this.actionRefresh_device_list.setText("Refresh device list");
			this.actionRefresh_device_list.addEventListener('triggered', () => {
				this.addedClients.clear();
				this.clientListItems.clear();
				this.deviceList.clear();

				let clientManager = Neptune.clientManager;
				let clients = clientManager.getClients();
				clients.forEach((client, name) => {
					this.AddClientToDeviceList(client);
				});
			});



			// Generic
			this.actionPreferences = new NodeGUI.QAction(this.MainWindow);
			this.actionPreferences.setObjectName("actionPreferences");
			// actionPreferences.setMenuRole(QAction::PreferencesRole);
			this.actionPreferences.setText("Preferences");
			this.actionPreferences.addEventListener('triggered', () => {
				// Open setting window
				console.log("Blah! No preference window... :(");
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
					title: 'Neptune Test',
					contents: { text: 'This is a test notification. If you are seeing this, notifications are working!' },
					applicationPackage: 'com.neptune.server',
					applicationName: 'NeptuneServer',
					notificationId: '11223344550',
					type: 'text'
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
			this.menuClient_settings.addAction(this.actionBrowse_for_file);
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
			this.menuFile.addAction(this.actionRefresh_device_list);
			this.menuFile.addSeparator();
			this.menuFile.addAction(this.actionRefresh_client_info);
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
				if (this.GetSelectedClient() == undefined) {
					this.menuClient_settings_action.setEnabled(false);
					this.scrollArea.setEnabled(false);
					this.actionRefresh_client_info.setEnabled(false);
					this.lblClientName.setText("");
					this.lblClientBatteryLevel.setText("");
					this.updateClientData();
				} else {
					this.menuClient_settings_action.setEnabled(true);
					this.scrollArea.setEnabled(true);
					// this.scrollArea.setFocus(NodeGUI.FocusReason.OtherFocusReason);
					this.actionRefresh_client_info.setEnabled(true);
					this.updateClientData();
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
			this.chkSyncNotifications.addEventListener('stateChanged', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.notificationSettings.enabled = (state === 2);
					this.actionSync_notifications.setChecked(state === 2);
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
			this.chkSyncClipboard.addEventListener('stateChanged', (state) => {
				this.updateEnableClipboardSharing(state === 2? true : false);
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
			this.chkAutoSendClipboard.addEventListener('stateChanged', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.clipboardSettings.synchronizeClipboardToClient = (state === 2);
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
			this.chkClipboardAllowClientToGet.addEventListener('stateChanged', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined)
					client.clipboardSettings.allowClientToGet = (state === 2);
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
			this.chkFileSharingEnable.addEventListener('stateChanged', (state) => {
				this.updateEnableFileSharing(state == 2? true : false);
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
			this.chkFileSharingAutoAccept.addEventListener('stateChanged', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined)
					client.fileSharingSettings.autoReceiveFromClient = (state === 2);
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
			this.chkFileSharingNotify.addEventListener('stateChanged', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined)
					client.fileSharingSettings.notifyOnReceive = (state === 2);
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
			this.chkFilesharingAllowClientToUpload.addEventListener('stateChanged', (state) => {
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					client.fileSharingSettings.allowClientToUpload = (state === 2);
					this.actionToggleAllowClientToUpload.setChecked(state === 2);
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
				// prompt to confirm
				let client = this.GetSelectedClient();
				if (client !== undefined) {
					this.RemoveClientFromDeviceList(client.friendlyName);
					client.delete();
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

				/** @type {import('./../Classes/ClientManager.js')} */
				let clientManager = Neptune.clientManager;
				let clients = clientManager.getClients();
				clients.forEach((client, name) => {
					this.AddClientToDeviceList(client);
				});


				// this.addEventListener(NodeGUI.WidgetEventTypes.Hide, () => {
				// 	clientManager.removeListener('added', (client) => {
				// 		removeFunction(client);
				// 	});
				// 	clientManager.removeListener('removed', (client) => {
				// 		addFunction(client);
				// 	});


				// 	this.removeEventListener(NodeGUI.WidgetEventTypes.Hide);
				// });


				// clientManager.addListener('added', (client) => {
				// 	removeFunction(client);
				// });
				// clientManager.addListener('removed', (client) => {
				// 	addFunction(client);
				// });

				this.updateClientData();
			} catch (ee) {}
		} catch(e) {
			console.log(e)
		}
	}

}

module.exports = thisTest;