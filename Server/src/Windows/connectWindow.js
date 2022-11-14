
const NeptuneWindow = require("./NeptuneWindow");
const NodeGUI = require("@nodegui/nodegui");
const ResourceManager = new (require("../ResourceManager"))();

class connectWindow extends NeptuneWindow {

    constructor(arg) {
        super(arg);

        this.setWindowTitle('Connection Window');
        this.resize(400, 200);
        
        this.setStyleSheet( 
            `
                #rootLayout {
                    background-color: #EEEEEE;
                }
            `

        );

        let qLabel = this.createLabel("question", "Input Connection IP");
        qLabel.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter;");

        let connectInput = this.createInput("input");
        connectInput.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter;");

        let connectButton = this.createButton("connectButton", "Connect");
        connectButton.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter;");

        let closeButton = this.createButton("closeButton", "Close Connection Window");
        closeButton.setInlineStyle("font-size: 12px; font-weight: light; qproperty-alignment: AlignCenter;");

        connectButton.addEventListener('clicked', (checked) => console.log("clicked"));
        
        closeButton.addEventListener('clicked', (checked) => this.hideWindow());

        /*const rootStyleSheet = `
            #rootView {
                padding: 5px;
            }
            #fieldset {
                padding: 10px;
                border: 2px ridge #bdbdbd;
                margin-bottom: 4px;
            }
            #inputRow, #connectButtonRow {
                flex-direction: row;
            }
            #inputRow {
                margin-bottom: 5px;
            }
            #ipInput {
                width: 100px;
                margin-left: 2px;
            }
            #connectButtonRow {
                margin-bottom: 5px;
            }
            #connectButton {
                width: 120px;
            }
            #hideButton {
                width: 200px;
            }
        `;

        rootView.setStyleSheet(rootStyleSheet);

        this.setCentralWidget(rootView);
        
        this.show();*/



    }

    /**
     * Hides the window
     */
    hideWindow() {
        this.hide();
    }
}

module.exports = connectWindow;