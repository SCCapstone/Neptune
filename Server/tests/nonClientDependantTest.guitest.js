/*
 * Example Jest unit test file (for NodeGUI windows)
 *
 *
 * A smart thing would to load the window as a constant or variable under NeptuneWindow, this way you're not constantly opening the window over and over.
 *
*/

global.Neptune.setupConfigurations();

test('Open About Close About Window Test', async () => {
	// Brings up the about window, clicks the "close" button and confirms it is closed
	let aboutPage = new (require('../src/Windows/aboutWindow.js'))();
	aboutPage.show();
	expect(aboutPage.isVisible()).toBe(true);

	aboutPage.getWidget("btnClose").click();
	expect(aboutPage.isVisible()).toBe(false);
});

test('Open Connect Close Connect Window test', async () => {
	// Brings up the about window, clicks the "close" button and confirms it is closed
	let connectWindow = new (require('../src/Windows/tempConnectWindow.js'))();
	connectWindow.show();
	expect(connectWindow.isVisible()).toBe(true);

	connectWindow.getWidget("closeButton").click();
	expect(connectWindow.isVisible()).toBe(false);
});


test('Open Preference Close Preference Window test', async () => {
	// Brings up the about window, clicks the "close" button and confirms it is closed
	let preferenceWindow = new (require('../src/Windows/preferencePage.js'))();
	preferenceWindow.show();
	expect(preferenceWindow.isVisible()).toBe(true);

	preferenceWindow.getWidget("btnClose").click();
	expect(preferenceWindow.isVisible()).toBe(false);
});

async function Shutdown(shutdownTimeout) {
    if (typeof shutdownTimeout !== "number") {
        shutdownTimeout = 1500;
    }

    global.shuttingDown = true; // For when we kill the logger
    Neptune.events.application.emit('shutdown', shutdownTimeout)
}
process.Shutdown = Shutdown;

/*test('Test Shutdown', async () => {
	const eventSpy = jest.fn();
	Neptune.events.application.on('shutdown', eventSpy)

	expect(eventSpy).toHaveBeenCalledTimes(1);
});*/

global.Neptune.tearDownConfigurations();
