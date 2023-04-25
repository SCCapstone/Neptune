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
const os = require('os');



class tempConnectWindow extends NeptuneWindow {

	constructor(arg) {
		super(arg);

        try {
            this.setWindowTitle('Neptune | tempConnectWindow');
            this.setFixedSize(500, 300);
            this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);
        
            let centralwidget = new NodeGUI.QWidget();
            centralwidget.setObjectName("centalwidget");
            
            let step1Label = new NodeGUI.QLabel(centralwidget);
            step1Label.setObjectName("step1Label");
            step1Label.setGeometry(10, 50, 650, 24);
            let font = new NodeGUI.QFont();
            // font.setPointSize(12);
            // font.setBold(false);
            // font.setWeight(75);
            step1Label.setFont(font);
            step1Label.setText("Step1: Open the android app while the desktop app is open.")

            let step2Label = new NodeGUI.QLabel(centralwidget);
            step2Label.setObjectName("step2Label");
            step2Label.setGeometry(10, 75, 650, 24);
            step2Label.setFont(font);
            step2Label.setText("Step 2: Tap \"Add New Device\" and fill in your IP Address.");
            
            let step3Label = new NodeGUI.QLabel(centralwidget);
            step3Label.setObjectName("step3Label");
            step3Label.setGeometry(10, 100, 650, 24);
            step3Label.setFont(font);
            step3Label.setText("Devices on the same network should connect automatically.");

            var ips = [];
            try {
                var networkInterfaces = os.networkInterfaces();
                let interfaceNames = Object.keys(networkInterfaces);
                interfaceNames.forEach((interfaceName) => {
                    try {
                        let addresses = Object.values(networkInterfaces[interfaceName]);

                        addresses.forEach((address) => {
                            if (address === undefined)
                                return;


                            if (address.family === "IPv4" && !address.internal) {
                                ips.push(address.address + " [" + interfaceName + "]");
                            }
                        });
                    } catch {}
                });
            } catch (err) {
                // huh
            }
            let IpLabel = new NodeGUI.QLabel(centralwidget);
            IpLabel.setObjectName("IpLabel");
            IpLabel.setGeometry(10, 110, 600, 125);
            IpLabel.setFont(font);
            let text = "Unable to lookup your IP addresses. Run `ipconfig` in Command Prompt to view your device's IP."
            if (ips !== undefined && ips.length > 0) {
                text = "Your IP address" + ((ips.length > 1)? "es:\n\t" : ": ") + ips.join("\n\t");
            }
            IpLabel.setText(text);
            // Your IP address: 127.0.0.1 (Wi-Fi)
            // Your IP addresses:\n127.0.0.1 (Wi-Fi)\n127.0.0.1 (not Wi-Fi)
            let titleLabel = new NodeGUI.QLabel(centralwidget);
            titleLabel.setObjectName("titleLabel");
            titleLabel.setGeometry(135, 20, 600, 28);
            let font1 = new NodeGUI.QFont();
            font1.setPointSize(14);
            font1.setBold(false);
            font1.setWeight(75);
            titleLabel.setFont(font1);
            titleLabel.setText("How to connect a device")

            let closeButton = new NodeGUI.QPushButton(centralwidget);
            closeButton.setObjectName("closeButton");
            closeButton.setGeometry(140, 230, 221, 37);
            closeButton.setFont(font1);
            closeButton.setText("Close Window");
            closeButton.addEventListener('clicked', (checked) => this.close());
            closeButton.setCursor(NodeGUI.CursorShape.PointingHandCursor);

            this.setCentralWidget(centralwidget);
            let statusbar = new NodeGUI.QStatusBar(this);
            statusbar.setObjectName("statusbar");
            this.setStatusBar(statusbar);
        }
        catch (e) {
            console.log(e);
            this.close();
        }
    }
}
module.exports = tempConnectWindow;