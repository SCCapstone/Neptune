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

const Client = require("./../Classes/Client.js");

class connectionDetails extends NeptuneWindow {

	/** @type {Client} */
	client;

	/** @type {NodeGUI.QLabel} */
	clientSection;
	/** @type {NodeGUI.QLabel} */
	nameLabel;
	/** @type {NodeGUI.QLabel} */
	ipLabel;
	/** @type {NodeGUI.QLabel} */
	dateLabel;
	/** @type {NodeGUI.QLabel} */
	idLabel;
	/** @type {NodeGUI.QLabel} */
	keyLabel;
	/** @type {NodeGUI.QLabel} */
	actualKeyaLabel;
	/** @type {NodeGUI.QLabel} */
	lblBat;
	/** @type {NodeGUI.QLabel} */
	pingLabel;

	/** @type {NodeGUI.QPushButton} */
	closeButton;
	/** @type {NodeGUI.QPushButton} */
	pingButton;
	/** @type {NodeGUI.QPushButton} */
	unpairButton;

	/**
	 * Set the client we're view the details of.
	 * @param {Client} client - Client to view
	 */
	setClient(client) {
		this.client = client;
		this.updateLabels();
	}

	updateLabels() {
		this.nameLabel.setText("Device Name: " + this.client.friendlyName);
		this.ipLabel.setText("Device IP: " + this.client.IPAddress);
        this.dateLabel.setText("Date Added: " + this.client.dateAdded);
        this.idLabel.setText("Client Id: " + this.client.id);
		this.actualKeyaLabel.setText("Key: " + this.client.getSecret());


		let batteryString = this.client.batteryLevel !== undefined? this.client.batteryLevel + "%" : "unknown%";
		if (this.client.batteryChargerType !== undefined && this.client.batteryChargerType !== "discharging") {
			batteryString += " (charging via " + this.client.batteryChargerType + ")" 

			if (this.client.batteryTimeRemaining !== undefined) {
				batteryString += "- full in ";
				if ((this.client.batteryTimeRemaining/60)>60)
					batteryString += Math.round(((this.client.batteryTimeRemaining/60/60) + Number.EPSILON) * 100) / 100 + " hours"
				else
					batteryString += Math.round(((this.client.batteryTimeRemaining/60) + Number.EPSILON) * 100) / 100 + " minutes"
			}
		}
		if (this.client.batteryTemperature !== undefined) {
			let tF = Math.round((((this.client.batteryTemperature*(9/5)) + 32) + Number.EPSILON) * 100) / 100;
			batteryString += " - temperature: " + this.client.batteryTemperature + "°C OR " + tF + "°F"
		}

		this.lblBat.setText(batteryString);
	}

    constructor(arg) {
        super(arg);

        this.setWindowTitle("Connection Details");
        this.setFixedSize(600, 300);
        this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);

        /** @type {import(./../Classes/Client.js)} **/
		this.clientSection = this.createLabel("clientLabel", "Connected Client");
		this.clientSection.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

		this.nameLabel = this.createLabel("name", "No client set.");
		this.nameLabel.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

		this.ipLabel = this.createLabel("ipName", "No client set.");
		this.ipLabel.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

        this.dateLabel = this.createLabel("date", "No client set.");
        this.dateLabel.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

        this.idLabel = this.createLabel("clientId", "No client set.");
        this.idLabel.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

		this.keyLabel = this.createLabel("keyLabel", "Key Negotiation: Auto [DH]");
		this.keyLabel.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

		this.actualKeyaLabel = this.createLabel("actualKeyLabel", "No client set.");
		this.actualKeyaLabel.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

		this.lblBat = this.createLabel("lblBat", "No client set.");
		this.lblBat.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter; margin-top: 6px; margin-bottom: 6px");


		this.pingLabel = this.createLabel("pingLabel", "RTT latency: ???ms");
		this.pingLabel.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter");

		this.pingButton = this.createButton("pingButton", "Ping Device");
		this.pingButton.setInlineStyle("font-size: 16px; font-weight: light; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 90px;");

		// this.unpairButton = this.createButton("unpairButton", "Unpair and delete device");
		// this.unpairButton.setInlineStyle("font-size: 16px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		this.closeButton = this.createButton("closeButton", "Close Connection Window");
        this.closeButton.setInlineStyle("font-size: 16px; font-weight: light; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 90px;");
		this.closeButton.addEventListener('clicked', () => this.close());


		let maybeThis = this;
		this.pingButton.addEventListener('clicked', () => {
			this.client.ping().then((pingData) => {
				maybeThis.pingLabel.setText("RTT latency: " + pingData.RTT + "ms");
			});
		});
		// this.unpairButton.addEventListener('clicked', (checked) => console.log("unpair"));
    }
}

module.exports = connectionDetails;