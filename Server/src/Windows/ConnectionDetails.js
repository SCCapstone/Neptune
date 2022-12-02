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

class connectionDetails extends NeptuneWindow {

    constructor(arg) {
        super(arg);

        this.setWindowTitle("Connection Details");
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

		const clientSection = this.createLabel("clientLabel", "Connected Client");
		clientSection.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		let name = "Device Name: " + client.friendlyName;
		const nameLabel = this.createLabel("name", name);
		nameLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		let ip = "Device IP: " + client.IPAddress
		const ipLabel = this.createLabel("ipName", ip);
		ipLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

        let dateAdded = "Date Added: " + client.dateAdded;
        const dateLabel = this.createLabel("date", dateAdded);
        dateLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

        let clientId = "Client Id: " + client.id;
        const idLabel = this.createLabel("clientId", clientId);
        idLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		const keyLabel = this.createLabel("keyLabel", "Key Negotiation: Auto [DH]");
		keyLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		let actualKey = "Key: " + client.getSecret();
		const actualKeyaLabel = this.createLabel("actualKeyLabel", actualKey);
		actualKeyaLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		const pingLabel = this.createLabel("pingLabel", "Latency: 000ms");
		pingLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		const pingButton = this.createButton("pingButton", "Ping Device");
		pingButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		const unpairButton = this.createButton("unpairButton", "Unpair Device");
		unpairButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		let closeButton = this.createButton("closeButton", "Close Connection Window");
        closeButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");


		pingButton.addEventListener('clicked', (checked) => console.log("ping"));
		unpairButton.addEventListener('clicked', (checked) => console.log("unpair"));
		closeButton.addEventListener('clicked', (checked) => this.hideWindow());
    }

	hideWindow() {
        this.hide();
    }
}

module.exports = connectionDetails;