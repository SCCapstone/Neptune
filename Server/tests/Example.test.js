/*
 *
 * Example Jest unit test file
 *
*/
test('Example unit test', () => {
	// This anonymous function is where the test takes place.
	// Do your stuff here
	let actualValue = true;


	let expectedValue = true;
	// Then
	expect(actualValue).toBe(expectedValue);
});