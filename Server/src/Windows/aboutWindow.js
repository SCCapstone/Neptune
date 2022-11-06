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
const ResourceManager = new (require("../ResourceManager"))();
const NeptuneWindow = require("./NeptuneWindow");


class aboutWindow extends NeptuneWindow {

	constructor(arg) {
		super(arg);

		this.setWindowTitle('Neptune | About');
		this.resize(420, 200);

		this.setStyleSheet(
			`
				#rootLayout {
					background-color: #EEEEEE;
				}
			`
		);

		let mainLabel = this.createLabel("lblTitle","Project Neptune");
		mainLabel.setInlineStyle("font-size: 14px; qproperty-alignment: AlignCenter;");

		let lblVersion = this.createLabel("lblVersion", "Version " + process.Neptune.Version.toString());
		lblVersion.setInlineStyle("font-size: 11px; font-weight: light; qproperty-alignment: AlignCenter;");

		// add button here :)


		let lblAuthors = this.createLabel("lblAuthors", "UofSC Capstone Project by:\nMatthew Sprinkle\nCody Newberry\nWill Amos\nRidge Johnson");
		lblAuthors.setInlineStyle("font-size: 11px; font-weight: light; qproperty-alignment: AlignCenter;");
	}
}

module.exports = aboutWindow;