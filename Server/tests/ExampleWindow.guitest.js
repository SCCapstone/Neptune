/*
 * Example Jest unit test file (for NodeGUI windows)
 *
 *
 * A smart thing would to load the window as a constant or variable under NeptuneWindow, this way you're not constantly opening the window over and over.
 *
*/

test('Example Window test', async () => {
	// Brings up the about window, clicks the "close" button and confirms it is closed
	let aboutWindow = new (require('../src/Windows/aboutWindow.js'))();
	aboutWindow.show();

	let closeButton = aboutWindow.getWidget("closeWindowButton");
	closeButton.click();
	// Then
	expect(aboutWindow.isVisible()).toBe(false);
});