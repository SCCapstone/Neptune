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

/**
 * NodeGUI
 */
const NodeGUI = require("@nodegui/nodegui");
const NeptuneWindow = require("./NeptuneWindow");


class aboutWindow extends NeptuneWindow {

    /**
     * Close window button
     * @type {NodeGUI.QPushButton}
     */
    btnClose;

	constructor(arg) {
		super(arg);

        try {
            this.setWindowTitle('Neptune | About');
            this.setFixedSize(450, 250);
            this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);

            let centralwidget = new NodeGUI.QWidget(this);
            centralwidget.setObjectName("centralwidget");
            let verticalLayout = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom, centralwidget);
            verticalLayout.setObjectName("verticalLayout");
            let lblTitle = new NodeGUI.QLabel(centralwidget);
            lblTitle.setObjectName("lblTitle");
            let font = new NodeGUI.QFont();
            font.setPointSize(14);
            font.setBold(true);
            font.setWeight(75);
            lblTitle.setFont(font);
            lblTitle.setAlignment(NodeGUI.AlignmentFlag.AlignCenter);
            lblTitle.setText("Neptune");

            verticalLayout.addWidget(lblTitle);

            let lblVersion = new NodeGUI.QLabel(centralwidget);
            lblVersion.setObjectName("lblVersion");
            lblVersion.setAlignment(NodeGUI.AlignmentFlag.AlignCenter);
            lblVersion.setText("Version " + global.Neptune.version.toString());

            verticalLayout.addWidget(lblVersion);

            let hlayGitButton = new NodeGUI.QBoxLayout(NodeGUI.Direction.LeftToRight);
            hlayGitButton.setObjectName("hlayGitButton");
            let btnViewOnGit = new NodeGUI.QPushButton(centralwidget);
            btnViewOnGit.setObjectName("btnViewOnGit");
            btnViewOnGit.setMinimumSize(100, 0);
            btnViewOnGit.setMaximumSize(100, 16777215);
            btnViewOnGit.setFlat(true);
            btnViewOnGit.setText("View on GitHub");
            btnViewOnGit.addEventListener('clicked', (checked) => {
                // Open in browser
                var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
                require('node:child_process').exec(start + ' https://github.com/SCCapstone/Neptune');
            });
            btnViewOnGit.setCursor(NodeGUI.CursorShape.PointingHandCursor);

            hlayGitButton.addWidget(btnViewOnGit);


            verticalLayout.addLayout(hlayGitButton);

            let lblProjectBy = new NodeGUI.QLabel(centralwidget);
            lblProjectBy.setObjectName("lblProjectBy");
            lblProjectBy.setAlignment(NodeGUI.AlignmentFlag.AlignBottom | NodeGUI.AlignmentFlag.AlignHCenter);
            lblProjectBy.setText("U(of)SC Capstone Project by:");

            verticalLayout.addWidget(lblProjectBy);

            let lblNames = new NodeGUI.QLabel(centralwidget);
            lblNames.setObjectName("lblNames");
            lblNames.setMinimumSize(0, 75);
            lblNames.setAlignment(NodeGUI.AlignmentFlag.AlignHCenter | NodeGUI.AlignmentFlag.AlignTop);
            lblNames.setText("Matthew Sprinkle\nWill Amos\nRidge Johnson\nCody Newberry");

            verticalLayout.addWidget(lblNames);

            let hlayCloseButton = new NodeGUI.QBoxLayout(NodeGUI.Direction.LeftToRight);
            hlayCloseButton.setObjectName("hlayCloseButton");
            let btnClose = new NodeGUI.QPushButton(centralwidget);
            btnClose.setObjectName("btnClose");
            btnClose.setMinimumSize(150, 0);
            btnClose.setMaximumSize(150, 16777215);
            btnClose.setAutoDefault(true);
            btnClose.setText("Close");
            btnClose.addEventListener('clicked', (checked) => this.close());
            btnClose.setCursor(NodeGUI.CursorShape.PointingHandCursor);


            hlayCloseButton.addWidget(btnClose);
            verticalLayout.addLayout(hlayCloseButton);
            this.setCentralWidget(centralwidget);


            btnViewOnGit.setDefault(false);
            btnClose.setDefault(true);
        } catch (e) {
            console.log(e);
            this.close();
        }
	}
}

module.exports = aboutWindow;