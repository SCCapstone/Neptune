/**
 *	  _  _ 
 *	 | \| |
 *	 | .` |
 *	 |_|\_|eptune
 *
 *	 Capstone Project 2022
 * 
 *	 Main Window
 */

 const NodeGUI = require("@nodegui/nodegui");
 const { connect }= require("http2");
 const ResourceManager = new (require("../ResourceManager"))();
 const NeptuneWindow = require("./NeptuneWindow");
 
 const Client = require("../Classes/Client");
 
 class connectWindow extends NeptuneWindow {

    constructor(arg) {
        super(arg)
        try {
            this.log = global.Neptune.logMan.getLogger("ConnectWindow");

            this.setWindowTitle('Neptune | Connect Window');
            this.setMaximumSize(450,250);
            this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);
        
            let centralwidget = new NodeGUI.QWidget(this);
            centralwidget.setObjectName("centralwidget");

            let deviceName = new NodeGUI.QLabel(centralwidget);
            deviceName.setObjectName("deviceName");
            deviceName.setGeometry(10, 30, 140, 28);
            let font = new NodeGUI.QFont();
            font.setPointSize(12);
            //font.setBold(true);
            font.setWeight(75);
            deviceName.setFont(font);
            deviceName.setText("Device Name:");

            let connectLabel = new NodeGUI.QLabel(centralwidget);
            connectLabel.setObjectName("connectLabel");
            connectLabel.setGeometry(10, 90, 150, 28);
            connectLabel.setFont(font);
            connectLabel.setText("Connection IP:");

            let connectButton = new NodeGUI.QPushButton(centralwidget);
            connectButton.setObjectName("connectButton");
            connectButton.setGeometry(80, 150, 291, 28);
            let font1 = new NodeGUI.QFont();
            font1.setPointSize(12);
            //font1.setBold(true);
            font1.setWeight(75);
            connectButton.setFont(font1);
            connectButton.setText("Connect Device");

            let closeWindowButton = new NodeGUI.QPushButton(centralwidget);
            closeWindowButton.setObjectName("setWindowButton");
            closeWindowButton.setGeometry(80, 180, 291, 28);
            closeWindowButton.setFont(font1);
            closeWindowButton.setText("Close Window");
            
            let nameInput = new NodeGUI.QLineEdit(centralwidget);
            nameInput.setObjectName("nameInput");
            nameInput.setGeometry(170, 30, 251, 34);
            nameInput.setFont(font);

            let ipInput = new NodeGUI.QLineEdit(centralwidget);
            ipInput.setObjectName("ipInput");
            ipInput.setGeometry(170, 90, 251, 34);
            ipInput.setFont(font);

            this.setCentralWidget(centralwidget);
            let statusBar = new NodeGUI.QStatusBar(this);
            statusBar.setObjectName("statusBar");
            this.setStatusBar(statusBar);


        }
        catch (e) {
            console.log(e);
            this.close();
        }
    }
 }

 module.exports = connectWindow;