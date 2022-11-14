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
const { connect } = require("http2");
const ResourceManager = new (require("../ResourceManager"))();
const NeptuneWindow = require("./NeptuneWindow");


class mainWindow extends NeptuneWindow {

	constructor(arg) {
		super(arg);

		this.setWindowTitle('Neptune | Main window');
		this.resize(400, 200);

		const label = this.createLabel("lblMain","Project Neptune");
		label.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter;");


		const connectButton = this.createButton("toConnect", "Connect Page");
		connectButton.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter");

		const aboutButton = this.createButton("toAbout", "About Page");
		aboutButton.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter");

		aboutButton.addEventListener('clicked', (checked) => this.openAbout());
		connectButton.addEventListener('clicked', (checked) => this.openConnect());

		this.setStyleSheet(
			`
				#rootLayout {
					background-color: #EEEEEE;
				}
				#connectButton {
					width: 200px;
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
}

module.exports = mainWindow;