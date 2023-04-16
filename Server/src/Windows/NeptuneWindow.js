/**
 *	  _  _ 
 *	 | \| |
 *	 | .` |
 *	 |_|\_|eptune
 *
 *	 Capstone Project 2022
 * 
 *	 Base Window
 */

const NodeGUI = require("@nodegui/nodegui");
const fs = require("node:fs")

// https://docs.nodegui.org/docs/api/generated/classes/qmainwindow

/**
 * Base windows for all Neptune windows.
 * Extend this class if you are to make a window. Provides consistency
 * QMainWindow + a few helper classes
 */
class NeptuneWindow extends NodeGUI.QMainWindow {

	/**
	 * A container of widgets added to this window (think labels, buttons). (widget name: the widget)
	 * @deprecated
	 * @type {Map<string, QWidget>}
	 */
	widgets = {}

	/**
	 * A container of child windows: windows opened by this window.
	 * @type {Map<string, NeptuneWindow>}
	 */
	childWindows = {}

	constructor(arg) {
		super(arg);
		if (!global.RunningTest) // I hate this
			this.setWindowIcon(process.ResourceManager.ApplicationIcon);

		let centralWidget = new NodeGUI.QWidget();
		let rootLayout = new NodeGUI.FlexLayout();
		/** @type {NodeGUI.FlexLayout} */
		this.rootLayout = rootLayout;
		this.setStyleSheet("#rootLayout { background-color: #EEEEEE; }");

		this.widgets["rootLayout"] = rootLayout
		centralWidget.setObjectName("rootLayout");
		centralWidget.setLayout(this.widgets["rootLayout"]);
		this.widgets["centralWidget"] = centralWidget;
		this.setCentralWidget(this.widgets["centralWidget"]);

		this.setWindowTitle('Neptune');
		this.resize(400, 250);

		if (process.platform == 'win32') {
			// This allows NeptuneRunner to fix the window's taskbar data
			this.addEventListener(NodeGUI.WidgetEventTypes.Show, () => {
				try {
					if (global.NeptuneRunnerIPC !== undefined)
						global.NeptuneRunnerIPC.pipe.write("fixwinhwnd" + this.winId() + "");
				} catch {}
			});
		}
	}


	/**
	 * Initializes a window and sets this window as the parent of the new window (use this to open new windows)
	 * @param {string} windowName The class name (filename) of the window you wish to initialize
	 * @param {(NodeGUI.QWidget<NodeGUI.QWidgetSignals>|NativeElement)} [args = undefined] Arguments passed to the window constructor
	 * @return {NeptuneWindow} NeptuneWindow type is misleading, returns the window you wanted. Of that window's type..
	 */
	newChildWindow(windowName, args) {
		windowName.replace(/[^0-9a-zA-Z]/g, ""); // Remove anything not a digit or a character! This will be thrown at the filesystem!
		if (this.childWindows[windowName] !== undefined)
			return this.childWindows[windowName];

		let newWindow = new (require("./" + windowName + ".js"))(args);

		this.childWindows[windowName] = newWindow;

		// newWindow.setParent(this); // puts the new window inside us...not what I was thinking?
		// and no not like a window inside a window, the window's contents in OUR window (...)
		return newWindow;
	}


	/**
	 * Searches a widget with the given name.
	 * @param {string} widgetName - The name of the widget to find.
	 * @returns {QWidget|undefined} - The first widget found with the given name, or undefined if not found.
	 */
	getWidget(widgetName) {
		// Check if the current widget matches the given name
		let queue = this.children();

		while (queue.length > 0) {
			let widget = queue.shift();

			// Check if the current widget matches the given name
			if (widget && typeof widget.objectName === "function" && widget.objectName() === widgetName) {
				return widget;
			}

			// Add any child widgets to the queue for processing
			if (widget && widget.children) {
				for (let i = 0; i < widget.children().length; i++) {
					let childWidget = widget.children()[i];
					if (!childWidget.objectName || typeof childWidget.objectName !== "function")
						continue;

					queue.push(childWidget);
				}
			}
		}

		return undefined;
	}
}

module.exports = NeptuneWindow;