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

const NodeGUI = require("@nodegui/nodegui");
const NeptuneWindow = require("./NeptuneWindow");


class aboutWindow extends NeptuneWindow {

	constructor(arg) {
		super(arg);

		this.setWindowTitle('Neptune | About');
		this.resize(400, 200);

		this.setStyleSheet(
			`
				#rootLayout {
					background-color: #EEEEEE;
				}
			`
		);

		let mainLabel = this.createLabel("lblTitle","Project Neptune");
		mainLabel.setInlineStyle("font-size: 14px; qproperty-alignment: AlignCenter;");

		let lblVersion = this.createLabel("lblVersion", "Version " + global.Neptune.version.toString());
		lblVersion.setInlineStyle("font-size: 11px; font-weight: light; qproperty-alignment: AlignCenter;");

		// add button here :)


		let lblAuthors = this.createLabel("lblAuthors", "UofSC Capstone Project by:\nMatthew Sprinkle\nCody Newberry\nWill Amos\nRidge Johnson");
		lblAuthors.setInlineStyle("font-size: 11px; font-weight: light; qproperty-alignment: AlignCenter;");

		let closeWindowButton = this.createButton("closeWindowButton", "Close About Window");
		closeWindowButton.addEventListener('clicked', (checked) => this.hideWindow());
	}

	/**
	 * Hides the window.
	 */
	hideWindow() {
		this.hide();
	}
}

module.exports = aboutWindow;