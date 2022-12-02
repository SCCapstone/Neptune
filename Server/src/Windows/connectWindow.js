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
const Client = require("../Classes/Client.js");
const IPAddress = require("../Classes/IPAddress");

class connectWindow extends NeptuneWindow {

    constructor(arg) {
        super(arg);

        this.setWindowTitle('Connection Window');
        this.resize(800, 600);
        
        this.setStyleSheet( 
            `
                #rootLayout {
                    background-color: #EEEEEE;
                }
            `

        );

        let tLabel = this.createLabel("title", "Connect Your Device Here");
        tLabel.setInlineStyle("font-size: 24px; font-weight: light; qproperty-alignment: AlignCenter; margin: 10px;");

        let qLabel = this.createLabel("question", "Input Connection IP");
        qLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter;");

        let connectInput = this.createInput("input");
        connectInput.setInlineStyle("font-size: 18px; font-weight: light; min-width: 250px; max-width: 250px; qproperty-alignment: AlignCenter; padding: 3px; margin-left: 137px;");

        let nameLabel = this.createLabel("nameQ", "Input Device Name");
        nameLabel.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter;");

        let nameInput = this.createInput("name");
        nameInput.setInlineStyle("font-size: 18px; font-weight: light; min-width: 250px; max-width: 250px; qproperty-alignment: AlignCenter; padding: 3px; margin-left: 137px;");

        let connectButton = this.createButton("connectButton", "Connect");
        connectButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 100px; max-width: 100px; margin-left: 170px;");

        let closeButton = this.createButton("closeButton", "Close Connection Window");
        closeButton.setInlineStyle("font-size: 18px; font-weight: light; qproperty-alignment: AlignCenter; padding: 5px; min-width: 225px; max-width: 225px; margin-left: 140px;");

        connectButton.addEventListener('clicked', (checked) => {
            const ipAdress = connectInput.text();
            const name = nameInput.text();
            const dateAdded = new Date();
            console.log(ipAdress);
            console.log(name);
            module.exports.data = {
                clientAddress: ipAdress,
                clientName: name,
                added: dateAdded,
                id: "001"
            };
            const realIpAddress = new IPAddress(ipAdress, "25560");
            const newClient = {
                "IPAddress": realIpAddress,
                "clientId": "001",
                "friendlyName": name,
                "dateAdded": dateAdded
            }
            console.log(newClient);
            global.Neptune.client = new Client(newClient, false);
        });
        
        closeButton.addEventListener('clicked', (checked) => this.hideWindow());

    }

    /**
     * Hides the window
     */
    hideWindow() {
        this.hide();
    }
}

module.exports = connectWindow;