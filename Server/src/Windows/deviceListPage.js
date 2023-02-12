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
const ResourceManager = new (require("../ResourceManager"))();
const connectWindow = require("./connectWindow");

class deviceInfo extends NeptuneWindow {
    
    constructor(arg) {
        super(arg);

        this.setWindowTitle(deviceInfo);
        this.resize(800, 600);
        this.setStyleSheet(
			`
				#rootLayout {
					background-color: #EEEEEE;
				}
			`
		);
    }
}