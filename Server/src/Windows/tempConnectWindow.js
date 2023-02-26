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


class tempConnectWindow extends NeptuneWindow {

	constructor(arg) {
		super(arg);

        try {
            this.setWindowTitle('Neptune | tempConnectWindow');
            this.setFixedSize(700, 300);
            this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);
        
            let centralwidget = new NodeGUI.QWidget();
            centralwidget.setObjectName("centalwidget");
            
            let step1Label = new NodeGUI.QLabel(centralwidget);
            step1Label.setObjectName("step1Label");
            step1Label.setGeometry(10, 70, 620, 24);
            let font = new NodeGUI.QFont();
            font.setPointSize(12);
            font.setBold(false);
            font.setWeight(75);
            step1Label.setFont(font);
            step1Label.setText("Step1: Open the android app while the desktop app is open.")

            let step2Label = new NodeGUI.QLabel(centralwidget);
            step2Label.setObjectName("step2Label");
            step2Label.setGeometry(10, 120, 600, 24);
            step2Label.setFont(font);
            step2Label.setText("Step 2: Navigate through the app to the connection page.");
            
            let step3Label = new NodeGUI.QLabel(centralwidget);
            step3Label.setObjectName("step3Label");
            step3Label.setGeometry(10, 170, 600, 24);
            step3Label.setFont(font);
            step3Label.setText("Step 3: Fill out the connection page to connect your device.");

            let titleLabel = new NodeGUI.QLabel(centralwidget);
            titleLabel.setObjectName("titleLabel");
            titleLabel.setGeometry(208, 20, 600, 28);
            let font1 = new NodeGUI.QFont();
            font1.setPointSize(14);
            font1.setBold(false);
            font1.setWeight(75);
            titleLabel.setFont(font1);
            titleLabel.setText("How to connect a device")

            let closeButton = new NodeGUI.QPushButton(centralwidget);
            closeButton.setObjectName("closeButton");
            closeButton.setGeometry(240, 230, 221, 37);
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