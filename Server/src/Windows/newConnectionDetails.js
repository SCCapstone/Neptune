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
const NeptuneCrypto = require("../Support/NeptuneCrypto");

class newConnectionDetails extends NeptuneWindow {

    	/** @type {Client} */
	client;

	/** @type {NodeGUI.QLabel} */
	nameLabel;
	/** @type {NodeGUI.QLabel} */
	ipLabel;
	/** @type {NodeGUI.QLabel} */
	dateLabel;
	/** @type {NodeGUI.QLabel} */
	keyNegotiationLabel;
	/** @type {NodeGUI.QLabel} */
	actualKeyLabel;
	/** @type {NodeGUI.QLabel} */
	batteryLabel;
	/** @type {NodeGUI.QLabel} */
	pingLabel;

	/** @type {NodeGUI.QPushButton} */
	closeWindowButton;
	/** @type {NodeGUI.QPushButton} */
	pingButton;

    setClient(client) {
		this.client = client;
		this.updateLabels();
	}

    updateLabels() {
		this.nameLabel.setText("Device Name: " + this.client.friendlyName);
		this.ipLabel.setText("Device IP: " + (this.client.IPAddress == undefined? "unknown" : this.client.IPAddress.toString()));
        this.dateLabel.setText("Date Added: " + (this.client.dateAdded == undefined? "unknown" : this.client.dateAdded.toLocaleString()));
		this.actualKeyLabel.setText("Key: " + (this.client.getSecret() == undefined? NeptuneCrypto.randomString(32) : this.client.getSecret()));

        let batteryString = "Battery: ";
		batteryString = this.client.batteryLevel !== undefined? this.client.batteryLevel + "%" : "unknown%";
        this.batteryLabel.setText(batteryString);
    }

    constructor(arg) {
        super(arg);
        try {
            this.setWindowTitle("Neptune | ConnectionWindow");
            this.setFixedSize(475,330);
            this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);

            this.centralwidget = new NodeGUI.QWidget();
            this.centralwidget.setObjectName("centalwidget");

            let font = new NodeGUI.QFont();
            font.setPointSize(12);
            font.setBold(false);
            font.setWeight(75);

            this.nameLabel = new NodeGUI.QLabel(this.centralwidget);
            this.nameLabel.setObjectName("nameLabel");
            this.nameLabel.setGeometry(11, 10, 451, 31);
            this.nameLabel.setFont(font);
            this.nameLabel.setText("No Client Set");

            this.ipLabel = new NodeGUI.QLabel(this.centralwidget);
            this.ipLabel.setObjectName("ipLabel");
            this.ipLabel.setGeometry(11, 50, 451, 31);
            this.ipLabel.setFont(font);
            this.ipLabel.setText("No Client Set");

            this.keyNegotiationLabel = new NodeGUI.QLabel(this.centralwidget);
            this.keyNegotiationLabel.setObjectName("keyNegotiationLabel");
            this.keyNegotiationLabel.setGeometry(11, 90, 451, 31);
            this.keyNegotiationLabel.setFont(font);
            this.keyNegotiationLabel.setText("Key Negotiation: Auto [DH]");

            this.actualKeyLabel = new NodeGUI.QLabel(this.centralwidget);
            this.actualKeyLabel.setObjectName("actualKeyLabel");
            this.actualKeyLabel.setGeometry(11, 130, 451, 31);
            this.actualKeyLabel.setFont(font);
            this.actualKeyLabel.setText("No Client Set");

            this.dateLabel = new NodeGUI.QLabel(this.centralwidget);
            this.dateLabel.setObjectName("dateLabel");
            this.dateLabel.setGeometry(11, 170, 451, 31);
            this.dateLabel.setFont(font);
            this.dateLabel.setText("No Client Set");

            this.latencyLabel = new NodeGUI.QLabel(this.centralwidget);
            this.latencyLabel.setObjectName("latencyLabel");
            this.latencyLabel.setGeometry(11, 210, 311, 31);
            this.latencyLabel.setFont(font);
            this.latencyLabel.setText("RTT latency: ???ms");

            let font2 = new NodeGUI.QFont();
            font2.setPointSize(10);
            font2.setBold(false);
            font2.setWeight(75);

            this.pingButton = new NodeGUI.QPushButton(this.centralwidget);
            this.pingButton.setObjectName("pingButton");
            this.pingButton.setGeometry(300, 210, 131, 31);
            this.pingButton.setFont(font);
            this.pingButton.setText("Ping");

            this.closeWindowButton = new NodeGUI.QPushButton(this.centralwidget);
            this.closeWindowButton.setObjectName("closeWindowButton");
            this.closeWindowButton.setGeometry(100, 260, 271, 31);
            this.closeWindowButton.setFont(font);
            this.closeWindowButton.setText("Close Window");

            this.batteryLabel = new NodeGUI.QLabel(this.centralwidget);
            this.batteryLabel.setObjectName("batteryLabel");
            this.batteryLabel.setGeometry(300, 50, 180, 31);
            this.batteryLabel.setFont(font);
            this.batteryLabel.setText("Battery: 100%");

            this.setCentralWidget(this.centralwidget);
            let statusbar = new NodeGUI.QStatusBar(this);
            statusbar.setObjectName("statusbar");
            this.setStatusBar(statusbar);

            let maybeThis = this;
            this.pingButton.addEventListener('clicked', () => {
                this.client.ping().then((pingData) => {
                    maybeThis.latencyLabel.setText("RTT latency: " + pingData.RTT + "s");
                });
            });

            this.closeWindowButton.addEventListener('clicked', () => this.close());
        }
        catch (e) {
            console.log(e);
            this.close();
        }
    }
}

module.exports = newConnectionDetails;