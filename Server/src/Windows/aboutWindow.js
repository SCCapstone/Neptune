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
		this.resize(800, 600);

		this.setStyleSheet(
			`
				#rootLayout {
					background-color: #EEEEEE;
				}
			`
		);

		let mainLabel = this.createLabel("lblTitle","Project Neptune");
		mainLabel.setInlineStyle("font-size: 18px; qproperty-alignment: AlignCenter;");

		let lblVersion = this.createLabel("lblVersion", "Version " + global.Neptune.version.toString());
		lblVersion.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter;");

		// add button here :)


		let lblAuthors = this.createLabel("lblAuthors", "UofSC Capstone Project by:\nMatthew Sprinkle\nCody Newberry\nWill Amos\nRidge Johnson");
		lblAuthors.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter;");

		let closeWindowButton = this.createButton("closeWindowButton", "Close About Window");
		closeWindowButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");
		
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