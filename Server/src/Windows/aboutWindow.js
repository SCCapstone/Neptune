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
		this.setFixedSize(450, 200);
		this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);

		this.centralWidget().setInlineStyle(`
            height: '100%';
            align-items: 'center';
            justify-content: 'center';
            flex-direction: column;
		`);

		let mainLabel = this.createLabel("lblTitle","Project Neptune");
		mainLabel.setInlineStyle("font-size: 18px; qproperty-alignment: AlignCenter;");

		let lblVersion = this.createLabel("lblVersion", "Version: " + global.Neptune.version.toString());
		lblVersion.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter; font-style: italic;");

		// add button here :)


		let lblAuthors = this.createLabel("lblAuthors", "UofSC Capstone Project by:\nMatthew Sprinkle\nCody Newberry\nWill Amos\nRidge Johnson");
		lblAuthors.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter; margin-top: 10px");

		let closeWindowButton = this.createButton("closeWindowButton", "Close About Window");
		closeWindowButton.setInlineStyle("font-size: 12px; font-weight: light; padding: 2px; min-width: 225px; max-width: 225px; margin-top: 15px");
		
		closeWindowButton.addEventListener('clicked', (checked) => this.close());
	}
}

module.exports = aboutWindow;