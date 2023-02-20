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
	}

    constructor(arg) {
        super(arg);

        this.setWindowTitle("Connection Details");
        this.resize(800, 600);

        /** @type {import(./../Classes/Client.js)} **/
		this.clientSection = this.createLabel("clientLabel", "Connected Client");
		this.clientSection.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		this.nameLabel = this.createLabel("name", "No client set.");
		this.nameLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		this.ipLabel = this.createLabel("ipName", "No client set.");
		this.ipLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

        this.dateLabel = this.createLabel("date", "No client set.");
        this.dateLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

        this.idLabel = this.createLabel("clientId", "No client set.");
        this.idLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		this.keyLabel = this.createLabel("keyLabel", "Key Negotiation: Auto [DH]");
		this.keyLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		this.actualKeyaLabel = this.createLabel("actualKeyLabel", "No client set.");
		this.actualKeyaLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		this.pingLabel = this.createLabel("pingLabel", "RTT latency: ???ms");
		this.pingLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter");

		this.pingButton = this.createButton("pingButton", "Ping Device");
		this.pingButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		// this.unpairButton = this.createButton("unpairButton", "Unpair and delete device");
		// this.unpairButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		this.closeButton = this.createButton("closeButton", "Close Connection Window");
        this.closeButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");


		this.pingButton.addEventListener('clicked', () => {
			this.client.ping().then((pingData) => {
				this.pingLabel.setText("RTT latency: " + pingData.RTT + "ms");
			});
		});
		// this.unpairButton.addEventListener('clicked', (checked) => console.log("unpair"));
		this.closeButton.addEventListener('clicked', () => this.close());
    }
}

module.exports = connectionDetails;