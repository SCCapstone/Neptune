/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *     Capstone Project 2022
 * 
 */

const NodeGUI = require("@nodegui/nodegui");
const NeptuneConfig = require("../Classes/NeptuneConfig");
const NeptuneWindow = require("./NeptuneWindow");


class preferencePage extends NeptuneWindow {

	constructor(arg) {
		super(arg);

        try {
            this.setWindowTitle('Neptune | Preference Page');
            this.setFixedSize(600, 175);
            this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);

            let centralWidget = new NodeGUI.QWidget(this);
            centralWidget.setObjectName("centralWidget");

            let font = new NodeGUI.QFont();
            font.setPointSize(12);
            font.setBold(false);
            font.setWeight(75);

            let serverNameLabel = new NodeGUI.QLabel(centralWidget);
            serverNameLabel.setObjectName("serverNameLabel");
            serverNameLabel.setGeometry(10, 10, 250, 24);
            serverNameLabel.setFont(font);
            serverNameLabel.setText("Change Server Name:")

            let newNameInput = new NodeGUI.QLineEdit(centralWidget);
            newNameInput.setObjectName("newNameInput");
            newNameInput.setGeometry(250, 10, 300, 24);
            newNameInput.setFont(font);
            newNameInput.setText(global.Neptune.config.friendlyName);

            let applyButton = new NodeGUI.QPushButton(centralWidget);
            applyButton.setObjectName("applyButton");
            applyButton.setGeometry(180, 60, 231, 31);
            applyButton.setFont(font);
            applyButton.setText("Apply Changes");

            let closeWindowButton = new NodeGUI.QPushButton(centralWidget);
            closeWindowButton.setObjectName("closeWindowButton");
            closeWindowButton.setGeometry(180, 107, 231, 31);
            closeWindowButton.setFont(font);
            closeWindowButton.setText("Close Window");

            this.setCentralWidget(centralWidget);
            let statusbar = new NodeGUI.QStatusBar(this);
            statusbar.setObjectName("statusbat");
            this.setStatusBar(statusbar);

            applyButton.addEventListener('clicked', (checked) => {
                global.Neptune.config.friendlyName = newNameInput.text();
                global.Neptune.clientManager.getClients().forEach(client => {
                    client.syncConfiguration();
                });
            });
            closeWindowButton.addEventListener('clicked',  (checked) => this.close());
        }
        catch (e) {
            console.log(e);
            this.close();
        }
    }
}

module.exports = preferencePage;