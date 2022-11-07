/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *     Capstone Project 2022
 * 
 *     Base Window
 */

const NodeGUI = require("@nodegui/nodegui");


/**
 * Base windows for all Neptune windows.
 * Extend this class if you are to make a window. Provides consistency
 * QMainWindow + a few helper classes
 */
class NeptuneWindow extends NodeGUI.QMainWindow {

	/**
	 * @type {object} A container of widgets added to this window (think labels, buttons). (widget name: the widget)
	 */
	#widgets = {}


	constructor(arg) {
		super(arg);
		this.setWindowIcon(process.ResourceManager.ApplicationIcon);

		let centralWidget = new NodeGUI.QWidget();
		let rootLayout = new NodeGUI.FlexLayout();

		this.#widgets["rootLayout"] = rootLayout
		centralWidget.setObjectName("rootLayout");
		centralWidget.setLayout(this.#widgets["rootLayout"]);
		this.#widgets["centralWidget"] = centralWidget;
		this.setCentralWidget(this.#widgets["centralWidget"]);

		this.setWindowTitle('Neptune');
		this.resize(400, 200);
	}


	/**
	 * Initializes a window and sets this window as the parent of the new window (use this to open new windows)
	 * @param {string} windowName The class name (filename) of the window you wish to initialize
	 * @param {(NodeGUI.QWidget<NodeGUI.QWidgetSignals>|NativeElement)} [args = undefined] Arguments passed to the window constructor
	 * @return {NeptuneWindow} NeptuneWindow type is misleading, returns the window you wanted. Of that window's type..
	 */
	newChildWindow(windowName, args) {
		windowName.replace(/[^0-9a-zA-Z]/g, ""); // Remove anything not a digit or a character! This will be thrown at the filesystem!
		let newWindow = new (require("./" + windowName + ".js"))(args);

		// newWindow.setParent(this); // puts the new window inside us...not what I was thinking?
		return newWindow;
	}

	// Add functions for creating widgets (buttons, labels, etc) below

	/**
	 * Creates and adds a label to the window
	 * @param {string} name Widget name of the label (used internally)
	 * @param {string} [text = ""] Text the label is displaying
	 * @returns {NodeGUI.QLabel}
	 */
	createLabel(name, text) {
		if (typeof name !== "string")
			throw new TypeError("name expected string got " + (typeof name).toString());

		if (text !== undefined)
			if (typeof text !== "string")
				throw new TypeError("text expected string got " + (typeof text).toString());

		let label = new NodeGUI.QLabel();
		label.setText(text);

		this.#widgets[name] = label;
		this.#widgets["rootLayout"].addWidget(this.#widgets[name]);

		return this.#widgets[name];
	}



	// Getters
	/**
	 * 
	 * @return {}
	 */
	getWidget(name) {
		if (typeof name !== "string")
			throw new TypeError("name expected string got " + (typeof name).toString());

		return this.#widgets[name];
	}

}

module.exports = NeptuneWindow;