/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *     Capstone Project 2022
 * 
 *     Main Window
 */

const NodeGUI = require("@nodegui/nodegui");
const { connect }= require("http2");
const ResourceManager = new (require("../ResourceManager"))();
const NeptuneWindow = require("./NeptuneWindow");

const Notifier = require("node-notifier"); // does not work with windows action center!

class mainWindow extends NeptuneWindow {

	#logger = Neptune.logMan.getLogger("MainWindow");;

	constructor(arg) {
		super(arg);

		this.setWindowTitle('Neptune | Main window');
		this.resize(800, 600);

		const label = this.createLabel("lblMain","Project Neptune");
		label.setInlineStyle("font-size: 24px; font-weight: light; qproperty-alignment: AlignCenter; margin: 10px;");

		const aboutButton = this.createButton("toAbout", "About Page");
		aboutButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		const connectButton = this.createButton("toConnect", "Connect New Device");
		connectButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		const deviceListLabel = this.createLabel("deviceList", "List of Devices Connected: ");
		deviceListLabel.setInlineStyle("font-size: 20px; font-weight: light; margin-left: 135px; padding: 5px; margin-bottom: 5px;");
		
		let deviceOneName = "No Device Connected";
		const deviceOneLabel = this.createLabel("deviceOneLabel", deviceOneName);
		deviceOneLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter;");

		const detailButton = this.createButton("toDetail", "Connection Details");
		detailButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px; margin-bottom: 10px;");

		const notificationButton = this.createButton("toDetail", "Test notifications");
		notificationButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");
		notificationButton.addEventListener('clicked', () => {
			let logger = this.#logger;
			Notifier.notify({
	            title: "Testing notifications on server",
	            message: "This is just a test.", // data.contents.subtext + "\n" +
	            id: 12345,
	        }, function(err, response, metadata) { // this is kinda temporary, windows gets funky blah blah blah read note at top
	            if (err) {
	                logger.error(err);
	            } else {
	                logger.debug("Action received: " + response);
	                logger.silly("action metadata: ");
	                logger.silly(metadata);
	            }
	        });
		});

		aboutButton.addEventListener('clicked', () => this.openAbout());

		connectButton.addEventListener('clicked', () => {
			this.openConnect();
		});

		//detailButton.addEventListener('clicked', () => this.openConnectionDetails(global.Neptune.connected));
		detailButton.addEventListener('clicked', () => this.openDeviceInfo());

		this.setStyleSheet(
			`
				#rootLayout {
					background-color: #EEEEEE;
				}
			`
		);

        // blah show authors window
        /**
         * The aboutWindow
         * @type {import('./aboutWindow')}
         */

		//let aboutWindow = this.newChildWindow('aboutWindow');
        //aboutWindow.show();

		//let connectWindow = this.newChildWindow('connectWindow');
		//connectWindow.show();
	}

	openAbout() {
		let aboutWindow = this.newChildWindow('aboutWindow');
		aboutWindow.show();
	}

	openConnect() {
		let connectWindow = this.newChildWindow('connectWindow');
		connectWindow.show();
	}

	openConnectionDetails(connected) {
		if (connected == false || global.client === undefined) {
			let errorWindow = this.newChildWindow('errorWindow');
			errorWindow.show();
		} else {
			let connectionDetails = this.newChildWindow('ConnectionDetails');
			connectionDetails.show();
		}
	}

	openDeviceInfo() {
		let deviceInfo = this.newChildWindow('deviceInfo');
		deviceInfo.show();
	}

}

module.exports = mainWindow;