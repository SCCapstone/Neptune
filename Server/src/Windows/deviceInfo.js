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
			`
		);

        /** @type {import(./../Classes/Client.js)} **/
		var client = global.client;

        //let name = "Device Name: " + client.friendlyName;
		const nameLabel = this.createLabel("name", "name");
        nameLabel.setInlineStyle("font-size: 30px; font-weight: light; qproperty-alignment: AlignCenter; margin: 2px;");

        const sendFileButton = this.createButton("sendFileButton", "Send File");

        const sendClipboardButton = this.createButton("sendClipboardButton", " Send Clipboard");

        const receiveClipboardButton = this.createButton("receiveClipboardButton", "Receive Clipboard");
        
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

        const browsePath = this.createInput("browsePath");
        browsePath.setInlineStyle("font-size: 18px; font-weight: light;");

        const browseButton = this.createButton("browseButton", "Browse");
        browseButton.setInlineStyle("font-size: 18px; font-weight: light;");

        const ConnectSettingsLabel = this.createLabel("connectSettingsLabel", "Connection Settings");
        ConnectSettingsLabel.setInlineStyle("font-size: 20px; font-weight: light; padding: 2px; min-width: 225px; max-width: 225px; magin-left: 3px;");

        const autoNegoate = this.createCheckBox("autoNegate", "Auto Negotiate");
        autoNegoate.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const preShareBox  = this.createCheckBox("preShareBox", "Pre-Shared Key");
        preShareBox.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const ipLabel = this.createLabel("ipLabel", "IP Address: ");
        ipLabel.setInlineStyle("font-size: 18px; font-weight: light; margin-left: 15px;");

        const testConnectionButton = this.createButton("testConnectionButton", "Test Connection");
        testConnectionButton.setInlineStyle("font-size: 18px; font-weight: light;");

        const viewConnectionButton = this.createButton("viewConnectionButton", "View Connection Details");
        viewConnectionButton.setInlineStyle("font-size: 18px; font-weight: light;");

        const saveButton = this.createButton("saveButton", "Save");
        saveButton.setInlineStyle("font-size: 18px; font-weight: light;");

        const deleteButton = this.createButton("deleteButton", "Delete");
        deleteButton.setInlineStyle("font-size: 18px; font-weight: light;");

        const closeButton = this.createButton("closeButton", "Close Window");
        closeButton.setInlineStyle("font-size: 18px; font-weight: light;");

        // Functionallity for all buttons

        closeButton.addEventListener('clicked', (checked) => this.hideWindow());
    }

    /**
     * Hides the window
     */
        hideWindow() {
            this.hide();
        }

}

module.exports = deviceInfo;