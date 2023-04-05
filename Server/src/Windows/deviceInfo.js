/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *     Capstone Project 2022
 * 
 *     About Window
 */

const NeptuneWindow = require("./NeptuneWindow");
const NodeGUI = require("@nodegui/nodegui");
const ResourceManager = new (require("../ResourceManager"))();
const connectWindow = require("./connectWindow");
const Client = require("../Classes/Client");

class deviceInfo extends NeptuneWindow {
    
    constructor(arg) {
        super(arg);

        this.setWindowTitle('Device Info');
        this.resize(800, 600);
        this.setStyleSheet(
			`
				#rootLayout {
					background-color: #EEEEEE;
				}
                #flex: 1;
			`
		);

		const nameLabel = this.createLabel("name", "name");
        nameLabel.setInlineStyle("font-size: 30px; font-weight: light; qproperty-alignment: AlignCenter; margin: 2px;");

        const sendFileButton = this.createButton("sendFileButton", "Send File");
        sendFileButton.setInlineStyle("font-size: 18px; font-weight: light; alignment: AlignCenter; padding: 5px; min-width: 300px; max-width: 300px; margin-left: 122.5px;");
        
        const clipBoardRow = new NodeGUI.QWidget();
        const clipboardRowLayout = new NodeGUI.FlexLayout();
        clipBoardRow.setLayout(clipboardRowLayout);
        clipBoardRow.setObjectName("clipboardRow");

        const sendClipboardButton = new NodeGUI.QPushButton();
        sendClipboardButton.setText("Send Clipboard");
        sendClipboardButton.setObjectName("sendClipboardButton");

        const receiveClipboardButton = new NodeGUI.QPushButton();
        receiveClipboardButton.setText("Receive Clipboard");
        receiveClipboardButton.setObjectName("receiveClipboardButton");

        clipboardRowLayout.addWidget(sendClipboardButton);
        clipboardRowLayout.addWidget(receiveClipboardButton);
        this.addToWidgetList(clipBoardRow);

        clipBoardRow.setStyleSheet("#clipboardRow {flex-direction: row;} #clipboardRow {margin-left: 245px;} #sendClipboardButton {font-size: 18px; min-width: 150px; max-width: 150px; padding: 5px;} #receiveClipboardButton {font-size: 18px; padding: 5px; min-width: 150px; max-width: 150px;}");

        const syncLable = this.createLabel("syncLabel","Sync Settings");
        syncLable.setInlineStyle("font-size: 20px; font-weight: light; padding: 2px; min-width: 225px; max-width: 225px; magin-left: 3px;");
        
        const syncNotif = this.createCheckBox("syncChekBox", "Sync Notifications");
        syncNotif.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const syncClip = this.createCheckBox("syncClipBoard", "Sync ClipBoard");
        syncClip.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const autoSend = this.createCheckBox("autoSendSet", "Automatically Send");
        autoSend.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 30px; margin-bottom: 2px;");

        const fileShareLabel = this.createLabel("fileShareLabel", "File Sharing Settings");
        fileShareLabel.setInlineStyle("font-size: 20px; font-weight: light; padding: 2px; min-width: 225px; max-width: 225px; magin-left: 3px;");

        const fileShare = this.createCheckBox("fileShareSetting", "File Sharing");
        fileShare.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const autoAccept = this.createCheckBox("autoAcceptSetting", "Automatically Accept");
        autoAccept.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 30px");

        const notifyReceive = this.createCheckBox("notifOnReceive", "Notify on receive");
        notifyReceive.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 30px;");

        const fileBrowseRow = new NodeGUI.QWidget();
        const fileBrowseRowLayout = new NodeGUI.FlexLayout();
        fileBrowseRow.setLayout(fileBrowseRowLayout);
        fileBrowseRow.setObjectName("fileBrowseRow");

        const browsePath = new NodeGUI.QLineEdit();
        browsePath.setObjectName("browsePath");

        const browesButton = new NodeGUI.QPushButton();
        browesButton.setText("Browse");
        browesButton.setObjectName("browseButton");

        fileBrowseRowLayout.addWidget(browsePath);
        fileBrowseRowLayout.addWidget(browesButton);
        this.addToWidgetList(fileBrowseRow);

        fileBrowseRow.setStyleSheet("#fileBrowseRow {flex-direction: row;} #browsePath {font-size: 18px; font-weight: light; min-width: 450px; max-width: 450px;} #browseButton {font-size: 18px; font-weight: light;}");

        const ConnectSettingsLabel = this.createLabel("connectSettingsLabel", "Connection Settings");
        ConnectSettingsLabel.setInlineStyle("font-size: 20px; font-weight: light; padding: 2px; min-width: 225px; max-width: 225px; magin-left: 3px;");

        const autoNegoate = this.createCheckBox("autoNegate", "Auto Negotiate");
        autoNegoate.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const preShareBox  = this.createCheckBox("preShareBox", "Pre-Shared Key");
        preShareBox.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const ipLabel = this.createLabel("ipLabel", "IP Address: ");
        ipLabel.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const connectionRow = new NodeGUI.QWidget();
        const connectionRowLayout = new NodeGUI.FlexLayout();
        connectionRow.setLayout(connectionRowLayout);
        connectionRow.setObjectName("connectionRow");

        const testConnectionButton = new NodeGUI.QPushButton();
        testConnectionButton.setText("Test Connection");
        testConnectionButton.setObjectName("testConnectionButton");

        const viewConnectionButton = new NodeGUI.QPushButton();
        viewConnectionButton.setText("View Connection");
        viewConnectionButton.setObjectName("viewConnectionButton");

        connectionRowLayout.addWidget(testConnectionButton);
        connectionRowLayout.addWidget(viewConnectionButton);
        this.addToWidgetList(connectionRow);

        connectionRow.setStyleSheet("#connectionRow {flex-direction: row;} #connectionRow {margin-left: 245px;} #testConnectionButton {font-size: 18px; padding: 5px; min-width: 150px; max-width: 150px;} #viewConnectionButton {font-size: 18px; padding: 5px; min-width: 150px; max-width: 150px;}")

        const saveDeleteRow = new NodeGUI.QWidget();
        const saveDeleteRowLayout = new NodeGUI.FlexLayout();
        saveDeleteRow.setLayout(saveDeleteRowLayout);
        saveDeleteRow.setObjectName("saveDeleteRow");

        const saveButton = new NodeGUI.QPushButton();
        saveButton.setText("Save");
        saveButton.setObjectName("saveButton");

        const deleteButton = new NodeGUI.QPushButton();
        deleteButton.setText("Delete");
        deleteButton.setObjectName("deleteButton");

        saveDeleteRowLayout.addWidget(saveButton);
        saveDeleteRowLayout.addWidget(deleteButton);
        this.addToWidgetList(saveDeleteRow);

        saveDeleteRow.setStyleSheet("#saveDeleteRow {flex-direction: row;} #saveDeleteRow {margin-left: 245px;} #saveButton {font-size: 18px; padding: 5px; min-width: 150px; max-width: 150px; background-color: green;} #deleteButton {font-size: 18px; padding: 5px; min-width: 150px; max-width: 150px; background-color: red;}");

        const closeButton = this.createButton("closeButton", "Close Window");
        closeButton.setInlineStyle("font-size: 18px; font-weight: light; alignment: AlignCenter; padding: 5px; min-width: 300px; max-width: 300px; margin-left: 122.5px;");

        // Functionallity for all buttons

        closeButton.addEventListener('clicked', (checked) => this.hideWindow());
    }

    /**
     * Hides the window
     */
        hideWindow() {
            this.close();
        }

}

module.exports = deviceInfo;