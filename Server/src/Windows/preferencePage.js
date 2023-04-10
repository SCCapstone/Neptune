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
const NeptuneWindow = require("./NeptuneWindow");

const { Logger } = require("./../Classes/LogMan");

const NepConfig = require('../Classes/NeptuneConfig.js');

/** @type {NepConfig} */
var NeptuneConfig = global.Neptune.config;


class preferencePage extends NeptuneWindow {
    /**
     * @type {Logger}
     */
    log;


    /**
     * @type {NodeGUI.QPushButton}
     */
    btnReset;

    /**
     * @type {NodeGUI.QPushButton}
     */
    btnSave;

    /**
     * @type {NodeGUI.QPlainTextEdit}
     */
    txtDeviceName;

    /**
     * @type {NodeGUI.QFrame}
     */
    nameCheckboxesDivider;

    /**
     * @type {NodeGUI.QCheckBox}
     */
    chkBroadcastServer;

    /**
     * @type {NodeGUI.QCheckBox}
     */
    chkMainWindowSaveSettingsOnChange;

    /**
     * @type {NodeGUI.QCheckBox}
     */
    chkStartMinimized;

    /**
     * @type {NodeGUI.QCheckBox}
     */
    chkEnableEncryption;

    /**
     * @type {NodeGUI.QPushButton}
     */
    btnRekey;

    closeWindowEvent() {
        if (this.compareSettings()) {
            let yesButton = new NodeGUI.QPushButton();
            yesButton.setText("Yes");

            let noButton = new NodeGUI.QPushButton();
            noButton.setText("No");

            let result = this.displayMessageBox("Discard changes?",
                "You have unsaved changes, are you sure you want to discard them?",
                [
                    { button: yesButton, buttonRole: NodeGUI.ButtonRole.AcceptRole },
                    { button: noButton, buttonRole: NodeGUI.ButtonRole.RejectRole },
                ]);

            if (result != NodeGUI.DialogCode.Accepted) { // ? ???
                this.close();
            } else {
                this.pushSettings();
            }
        } else {
            this.close();
        }
    }

    constructor(arg) {
        super(arg);

        try {
            this.log = global.Neptune.logMan.getLogger("PreferencePage");
            
            this.setWindowTitle('Neptune | Preference Page');
            // NodeGUI.WindowType.WindowStaysOnTopHint <-- not amazing, covers the dialog messages!
            this.setWindowFlag(NodeGUI.WindowType.Dialog | NodeGUI.WindowType.MSWindowsFixedSizeDialogHint, true);

            let centralWidget = new NodeGUI.QWidget(this);
            centralWidget.setObjectName("centralWidget");

            this.setWindowFlag(NodeGUI.WindowType.WindowCloseButtonHint, false);

            this.setObjectName("PreferenceWindow");
            this.resize(400, 300);
            this.setMinimumSize(350, 200);
            this.setMaximumSize(500, 350);
            let verticalLayout = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom, centralWidget);
            verticalLayout.setObjectName("verticalLayout");
            verticalLayout.setContentsMargins(0, 0, 0, 0);
            let gridLayout = new NodeGUI.QGridLayout();
            gridLayout.setObjectName("gridLayout");
            gridLayout.setContentsMargins(10, 10, 10, 10);
            let bottomButtonsLayout = new NodeGUI.QGridLayout();
            bottomButtonsLayout.setSpacing(0);
            bottomButtonsLayout.setObjectName("bottomButtonsLayout");
            bottomButtonsLayout.setContentsMargins(0, 10, 0, 0);

            let horizontalLayout = new NodeGUI.QBoxLayout(NodeGUI.Direction.LeftToRight);
            horizontalLayout.setSpacing(10);
            horizontalLayout.setObjectName("horizontalLayout");
            this.btnReset = new NodeGUI.QPushButton();
            this.btnReset.setObjectName("btnReset");
            this.btnReset.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.btnReset.setText("Reset");
            this.btnReset.addEventListener('clicked', () => {
                if (this.compareSettings()) {
                    let yesButton = new NodeGUI.QPushButton();
                    yesButton.setText("Yes");

                    let noButton = new NodeGUI.QPushButton();
                    noButton.setText("No");

                    let result = this.displayMessageBox("Reset to current settings?",
                        "Are you sure you want to discard your changes and load from the configuration?",
                        [
                            { button: yesButton, buttonRole: NodeGUI.ButtonRole.AcceptRole },
                            { button: noButton, buttonRole: NodeGUI.ButtonRole.RejectRole },
                        ]);

                    if (result != NodeGUI.DialogCode.Accepted) { // ? ???
                        this.pullSettings()
                    }
                } else {
                    this.pullSettings();
                }
            });
            horizontalLayout.addWidget(this.btnReset);

            this.btnSave = new NodeGUI.QPushButton();
            this.btnSave.setObjectName("btnSave");
            this.btnSave.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.btnSave.setText("Save");
            this.btnSave.setEnabled(false);
            this.btnSave.setAutoDefault(true);
            this.btnSave.addEventListener('clicked', () => {
                this.pushSettings();
            });
            horizontalLayout.addWidget(this.btnSave);

            this.btnClose = new NodeGUI.QPushButton();
            this.btnClose.setObjectName("btnClose");
            this.btnClose.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.btnClose.setText("Close");
            this.btnClose.addEventListener('clicked', () => {
                this.closeWindowEvent();
            });
            horizontalLayout.addWidget(this.btnClose);
            bottomButtonsLayout.addLayout(horizontalLayout, 0, 0, 1, 1);
            gridLayout.addLayout(bottomButtonsLayout, 1, 0, 1, 1);


            // Server settings
            let scrollArea = new NodeGUI.QScrollArea(centralWidget);
            scrollArea.setObjectName("scrollArea");
            scrollArea.setEnabled(true);
            scrollArea.setMinimumSize(125, 0);
            scrollArea.setHorizontalScrollBarPolicy(NodeGUI.ScrollBarPolicy.ScrollBarAsNeeded);
            scrollArea.setWidgetResizable(true);
            let scrollAreaWidgetContents = new NodeGUI.QWidget();
            scrollAreaWidgetContents.setObjectName("scrollAreaWidgetContents");
            scrollAreaWidgetContents.setGeometry(0, 0, 440, 498);
            scrollAreaWidgetContents.setMinimumSize(175, 0);
            let gridLayout_3 = new NodeGUI.QGridLayout(scrollAreaWidgetContents);
            gridLayout_3.setSpacing(0);
            gridLayout_3.setObjectName("gridLayout_3");
            gridLayout_3.setSizeConstraint(NodeGUI.SizeConstraint.SetDefaultConstraint);
            gridLayout_3.setContentsMargins(0, 0, 0, 0);
            let scrollAreaContents = new NodeGUI.QBoxLayout(NodeGUI.Direction.TopToBottom);
            scrollAreaContents.setSpacing(10);
            scrollAreaContents.setObjectName("scrollAreaContents");
            scrollAreaContents.setSizeConstraint(NodeGUI.SizeConstraint.SetMinimumSize);


            let nameLayout = new NodeGUI.QBoxLayout(NodeGUI.Direction.RightToLeft, this.MainWindow);
            nameLayout.setObjectName("nameLayout");
            this.lblDeviceName = new NodeGUI.QLabel(scrollAreaWidgetContents);
            this.lblDeviceName.setObjectName("lblDeviceName");
            this.lblDeviceName.setMinimumSize(0, 25);
            this.lblDeviceName.setMaximumSize(16777215, 25);
            this.lblDeviceName.setText("Server's name: ");

            this.txtDeviceName = new NodeGUI.QPlainTextEdit(scrollAreaWidgetContents);
            this.txtDeviceName.setObjectName("txtDeviceName");
            this.txtDeviceName.setMinimumSize(0, 25);
            this.txtDeviceName.setMaximumSize(16777215, 25);
            this.txtDeviceName.setLineWrapMode(NodeGUI.WrapMode.NoWrap);
            this.txtDeviceName.setPlainText("");
            this.txtDeviceName.setPlaceholderText("");
            this.txtDeviceName.addEventListener('textChanged', () => {
                this.compareSettings();
            });
            nameLayout.addWidget(this.txtDeviceName);
            nameLayout.addWidget(this.lblDeviceName);

            scrollAreaContents.addLayout(nameLayout);


            this.nameCheckboxesDivider = new NodeGUI.QFrame(scrollAreaWidgetContents);
            this.nameCheckboxesDivider.setObjectName("nameCheckboxesDivider");
            this.nameCheckboxesDivider.setEnabled(true);
            this.nameCheckboxesDivider.setFrameShape(NodeGUI.Shape.HLine);
            this.nameCheckboxesDivider.setFrameShadow(NodeGUI.Shadow.Sunken);
            scrollAreaContents.addWidget(this.nameCheckboxesDivider);


            this.chkBroadcastServer = new NodeGUI.QCheckBox(scrollAreaWidgetContents);
            this.chkBroadcastServer.setObjectName("chkBroadcastServer");
            this.chkBroadcastServer.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.chkBroadcastServer.setText("Broadcast Neptune on network\n(allow server to appear in the add a device page)");
            this.chkBroadcastServer.addEventListener('clicked', () => {
                this.compareSettings();
            });
            scrollAreaContents.addWidget(this.chkBroadcastServer);

            this.chkMainWindowSaveSettingsOnChange = new NodeGUI.QCheckBox(scrollAreaWidgetContents);
            this.chkMainWindowSaveSettingsOnChange.setObjectName("chkMainWindowSaveSettingsOnChange");
            this.chkMainWindowSaveSettingsOnChange.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.chkMainWindowSaveSettingsOnChange.setText("Save settings on change in main window\n(toggles save button on client settings page)");
            this.chkMainWindowSaveSettingsOnChange.addEventListener('clicked', () => {
                this.compareSettings();
            });
            scrollAreaContents.addWidget(this.chkMainWindowSaveSettingsOnChange);

            this.chkStartMinimized = new NodeGUI.QCheckBox(scrollAreaWidgetContents);
            this.chkStartMinimized.setObjectName("chkStartMinimized");
            this.chkStartMinimized.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.chkStartMinimized.setText("Start Neptune minimized");
            this.chkStartMinimized.addEventListener('clicked', () => {
                this.compareSettings();
            });
            scrollAreaContents.addWidget(this.chkStartMinimized);

            let encryptionDivider = new NodeGUI.QFrame(scrollAreaWidgetContents);
            encryptionDivider.setObjectName("encryptionDivider");
            encryptionDivider.setFrameShape(NodeGUI.Shape.HLine);
            encryptionDivider.setFrameShadow(NodeGUI.Shadow.Sunken);
            scrollAreaContents.addWidget(encryptionDivider);

            this.chkEnableEncryption = new NodeGUI.QCheckBox(scrollAreaWidgetContents);
            this.chkEnableEncryption.setObjectName("chkEnableEncryption");
            this.chkEnableEncryption.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.chkEnableEncryption.setText("Encrypt configuration files")
            this.chkEnableEncryption.addEventListener('clicked', () => {
                this.compareSettings();
            });
            scrollAreaContents.addWidget(this.chkEnableEncryption);

            this.btnRekey = new NodeGUI.QPushButton(scrollAreaWidgetContents);
            this.btnRekey.setObjectName("btnRekey");
            this.btnRekey.setEnabled(false);
            this.btnRekey.setCursor(NodeGUI.CursorShape.PointingHandCursor);
            this.btnRekey.setText("Regenerate encryption key");
            this.btnRekey.setToolTip("If encryption is enabled, changes the encryption key.");
            this.btnRekey.addEventListener('clicked', () => {
                let maybeThis = this;
                let okayButton = new NodeGUI.QPushButton();
                okayButton.setText("Okay");

                global.Neptune.configManager.rekey(true).then((didIt) => {
                    maybeThis.log.info("Successfully changed encryption key.");

                }).catch(err => {
                    maybeThis.log.error("Failed to change encryption key. Error: " + err);
                    maybeThis.chkEnableEncryption.setChecked(false);

                    maybeThis.displayMessageBox("Failed to change encryption key", "Neptune was unable to change the configuration encryption key!\nError: " + err,
                    [
                        {button: okayButton, buttonRole: NodeGUI.ButtonRole.AcceptRole}
                    ]);
                });
            });
            scrollAreaContents.addWidget(this.btnRekey);


            gridLayout_3.addLayout(scrollAreaContents, 0, 0, 1, 1);
            scrollArea.setWidget(scrollAreaWidgetContents);
            gridLayout.addWidget(scrollArea, 0, 0, 1, 1);
            verticalLayout.addLayout(gridLayout);
            this.setCentralWidget(centralWidget);

            this.btnSave.setDefault(true);
            this.pullSettings();
        }
        catch (e) {
            console.log(e);
        }
    }

    /**
     * Enables/disables the save button whether or not settings are different than the saved configuration .
     * 
     * @return {boolean} Unsaved settings
     */
    compareSettings() {
        let settingsDiffer = (this.txtDeviceName.toPlainText().toLowerCase() !== NeptuneConfig.friendlyName.toLowerCase()
                || this.chkBroadcastServer.isChecked() !== NeptuneConfig.applicationSettings.advertiseNeptune
                || this.chkMainWindowSaveSettingsOnChange.isChecked() !== !NeptuneConfig.applicationSettings.requireSaveButton
                || this.chkStartMinimized.isChecked() !== NeptuneConfig.applicationSettings.startMinimized
                || this.chkEnableEncryption.isChecked() !== NeptuneConfig.encryption.enabled
            );

        this.btnSave.setEnabled(settingsDiffer);

        return settingsDiffer;
    }

    /**
     * Sets the window's checkboxes and other settings from the configuration data currently saved
     */
    pullSettings() {
        this.log.info("Loading settings from config.");

        // Grab configuration settings from current config
        this.txtDeviceName.setPlainText(NeptuneConfig.friendlyName);
        this.txtDeviceName.setPlaceholderText(NeptuneConfig.friendlyName);

        this.chkBroadcastServer.setChecked(NeptuneConfig.applicationSettings.advertiseNeptune === true);
        this.chkMainWindowSaveSettingsOnChange.setChecked(NeptuneConfig.applicationSettings.requireSaveButton === false);
        this.chkStartMinimized.setChecked(NeptuneConfig.applicationSettings.startMinimized === true);

        this.chkEnableEncryption.setChecked(NeptuneConfig.encryption.enabled === true);
        this.btnRekey.setEnabled(NeptuneConfig.encryption.enabled === true);

        this.compareSettings();
    }

    /**
     * Sets the configuration data using this window's state and saves
     */
    pushSettings() {
        // this.log.info("Saving settings to config.");

        // Save configuration settings
        NeptuneConfig.friendlyName = this.txtDeviceName.toPlainText();
        NeptuneConfig.applicationSettings.advertiseNeptune = this.chkBroadcastServer.isChecked();
        NeptuneConfig.applicationSettings.requireSaveButton = !this.chkMainWindowSaveSettingsOnChange.isChecked();
        NeptuneConfig.applicationSettings.startMinimized = this.chkStartMinimized.isChecked();

        let maybeThis = this;
        let okayButton = new NodeGUI.QPushButton();
        okayButton.setText("Okay");
        
        if (this.chkEnableEncryption.isChecked() != NeptuneConfig.encryption.enabled) {
            if (!this.chkEnableEncryption.isChecked()) {
                global.Neptune.configManager.rekey(false).then((didIt) => {
                    maybeThis.log.info("Successfully disabled encryption.");
                    maybeThis.btnRekey.setEnabled(false);

                }).catch(err => {
                    maybeThis.log.error("Failed to disable encryption: " + err);
                    maybeThis.chkEnableEncryption.setChecked(true);
                    maybeThis.btnRekey.setEnabled(true);

                    maybeThis.displayMessageBox("Failed to disable encryption", "Neptune was unable to disable configuration encryption! Type \"rekey\" into the console to try again.\nError: " + err,
                    [
                        {button: okayButton, buttonRole: NodeGUI.ButtonRole.AcceptRole}
                    ]);
                });

            } else if (this.chkEnableEncryption.isChecked() && !NeptuneConfig.encryption.enabled) {
                global.Neptune.configManager.rekey(true).then((didIt) => {
                    maybeThis.log.info("Successfully enabled encryption.");
                    maybeThis.btnRekey.setEnabled(true);

                }).catch(err => {
                    maybeThis.log.error("Failed to enable encryption!!: " + err);
                    maybeThis.chkEnableEncryption.setChecked(false);
                    maybeThis.btnRekey.setEnabled(false);


                    maybeThis.displayMessageBox("Failed to enable encryption", "Neptune was unable to enable configuration encryption!\nError: " + err,
                    [
                        {button: okayButton, buttonRole: NodeGUI.ButtonRole.AcceptRole}
                    ]);
                });
            }
        }

        NeptuneConfig.saveSync();

        this.compareSettings();
    }

    /**
     * @typedef {object} messageboxButtons
     * @property {NodeGUI.QPushButton} button
     * @property {NodeGUI.ButtonRole} buttonRole
     */

    /**
     * Displays a message box with custom buttons.
     *
     * @param {string} title - The title of the message box.
     * @param {string} message - The message text of the message box.
     * @param {messageboxButtons[]} buttons - An array of objects representing each custom button to add to the message box. Each object should contain a `button` property representing the `QPushButton` object, and an optional `buttonRole` property representing the button role (defaults to `ButtonRole.AcceptRole` if not specified).
     *
     * @returns {NodeGUI.DialogCode} - Whether the dialog was accepted `NodeGUI.DialogCode.Accepted` or rejected `NodeGUI.DialogCode.Rejected`.
     */
    displayMessageBox(title, message, buttons) {
        if (!this.isVisible())
            return;

        const messageBox = new NodeGUI.QMessageBox();
        messageBox.setWindowTitle(title);
        messageBox.setText(message);
        if (!global.RunningTest) // I hate this
            messageBox.setWindowIcon(process.ResourceManager.ApplicationIcon);
        if (process.platform == 'win32') {
            try {
                // This allows NeptuneRunner to fix the window's taskbar data
                messageBox.addEventListener(NodeGUI.WidgetEventTypes.Show, () => {
                    global.NeptuneRunnerIPC.pipe.write("fixwinhwnd" + this.winId() + "");
                });
            } catch (_) {}
        }

        // Add custom buttons to the message box
        buttons.forEach(({ button, buttonRole }) => {
            messageBox.addButton(button, buttonRole || NodeGUI.ButtonRole.AcceptRole);

            button.addEventListener('clicked', () => {
                messageBox.done(buttonRole || NodeGUI.ButtonRole.AcceptRole);
            });
        });

        // Show the message box and return the result
        const result = messageBox.exec();
        return result;
    }
}

module.exports = preferencePage;