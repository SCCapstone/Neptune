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
		this.ipLabel.setText("Device IP: " + this.client.IPAddress);
        this.dateLabel.setText("Date Added: " + this.client.dateAdded);
		this.actualKeyLabel.setText("Key: " + this.client.getSecret());

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

            let centralwidget = new NodeGUI.QWidget();
            centralwidget.setObjectName("centalwidget");

            let font = new NodeGUI.QFont();
            font.setPointSize(12);
            font.setBold(false);
            font.setWeight(75);

            let nameLabel = new NodeGUI.QLabel(centralwidget);
            nameLabel.setObjectName("nameLabel");
            nameLabel.setGeometry(11, 10, 451, 31);
            nameLabel.setFont(font);
            nameLabel.setText("No Client Set");

            let ipLabel = new NodeGUI.QLabel(centralwidget);
            ipLabel.setObjectName("ipLabel");
            ipLabel.setGeometry(11, 50, 451, 31);
            ipLabel.setFont(font);
            ipLabel.setText("No Client Set");

            let keyNegotiationLabel = new NodeGUI.QLabel(centralwidget);
            keyNegotiationLabel.setObjectName("keyNegotiationLabel");
            keyNegotiationLabel.setGeometry(11, 90, 451, 31);
            keyNegotiationLabel.setFont(font);
            keyNegotiationLabel.setText("Key Negotiation: Auto [DH]");

            let actualKeyLabel = new NodeGUI.QLabel(centralwidget);
            actualKeyLabel.setObjectName("actualKeyLabel");
            actualKeyLabel.setGeometry(11, 130, 451, 31);
            actualKeyLabel.setFont(font);
            actualKeyLabel.setText("No Client Set");

            let dateLabel = new NodeGUI.QLabel(centralwidget);
            dateLabel.setObjectName("dateLabel");
            dateLabel.setGeometry(11, 170, 451, 31);
            dateLabel.setFont(font);
            dateLabel.setText("No Client Set");

            let latencyLabel = new NodeGUI.QLabel(centralwidget);
            latencyLabel.setObjectName("latencyLabel");
            latencyLabel.setGeometry(11, 210, 311, 31);
            latencyLabel.setFont(font);
            latencyLabel.setText("RTT latency: ???ms");

            let font2 = new NodeGUI.QFont();
            font2.setPointSize(10);
            font2.setBold(false);
            font2.setWeight(75);

            let pingButton = new NodeGUI.QPushButton(centralwidget);
            pingButton.setObjectName("pingButton");
            pingButton.setGeometry(300, 210, 131, 31);
            pingButton.setFont(font2);
            pingButton.setText("Ping");

            let closeWindowButton = new NodeGUI.QPushButton(centralwidget);
            closeWindowButton.setObjectName("closeWindowButton");
            closeWindowButton.setGeometry(100, 260, 271, 31);
            closeWindowButton.setFont(font);
            closeWindowButton.setText("Close Window");

            let batteryLabel = new NodeGUI.QLabel(centralwidget);
            batteryLabel.setObjectName("batteryLabel");
            batteryLabel.setGeometry(300, 50, 180, 31);
            batteryLabel.setFont(font);
            batteryLabel.setText("Battery: 100%");

            this.setCentralWidget(centralwidget);
            let statusbar = new NodeGUI.QStatusBar(this);
            statusbar.setObjectName("statusbar");
            this.setStatusBar(statusbar);

            this.pingButton.addEventListener('clicked', () => {
                this.client.ping().then((pingData) => {
                    this.pingLabel.setText("RTT latency: " + pingData.RTT + "ms");
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