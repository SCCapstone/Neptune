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



class mainWindow extends NeptuneWindow {

	constructor(arg) {
		super(arg);


		this.setWindowTitle('Neptune | Main window');
		this.resize(800, 600);

		const label = this.createLabel("lblMain","Project Neptune");
		label.setInlineStyle("font-size: 24px; font-weight: light; qproperty-alignment: AlignCenter; margin: 10px;");

		const connectButton = this.createButton("toConnect", "Connect Page");
		connectButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");
	
		const aboutButton = this.createButton("toAbout", "About Page");
		aboutButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		const detailButton = this.createButton("toDetail", "Connection Details");
		detailButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

		aboutButton.addEventListener('clicked', () => this.openAbout());

		connectButton.addEventListener('clicked', () => {
			global.Neptune.connected = true;
			this.openConnect();
		});

		detailButton.addEventListener('clicked', () => this.openConnectionDetails(global.Neptune.connected));

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
		if (connected == false) {
			let errorWindow = this.newChildWindow('errorWindow');
			errorWindow.show();
		} else {
			let connectionDetails = this.newChildWindow('connectionDetails');
			connectionDetails.show();
		}
	}
}

module.exports = mainWindow;