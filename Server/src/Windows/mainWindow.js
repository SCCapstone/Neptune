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
const ResourceManager = new (require("../ResourceManager"))();
const NeptuneWindow = require("./NeptuneWindow");


class mainWindow extends NeptuneWindow {

	constructor(arg) {
		super(arg);

		this.setWindowTitle('Neptune | Main window');
		this.resize(400, 200);

		const label = this.createLabel("lblMain","Project Neptune");
		label.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter;");

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
        let aboutWindow = this.newChildWindow('aboutWindow');
        aboutWindow.show();
	}
}

module.exports = mainWindow;