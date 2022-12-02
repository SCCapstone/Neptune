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

 class errorWindow extends NeptuneWindow {

    constructor(arg) {
        super(arg);

        this.setWindowTitle('Error Window');
        this.resize(600, 200);
        
        this.setStyleSheet( 
            `
                #rootLayout {
                    background-color: #EEEEEE;
                }
            `

        );

        const errorMessage = this.createLabel("clientLabel", "Please Connect A Client First");
		errorMessage.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 20px");

		let closeButton = this.createButton("closeButton", "Close Error Window");
        closeButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 90px;");
        
        closeButton.addEventListener('clicked', (checked) => this.hideWindow());
    }

    hideWindow() {
        this.hide();
    }
 }

 module.exports = errorWindow;