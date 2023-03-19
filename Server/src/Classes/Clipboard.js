const os = require('os');
const { exec, spawn } = require('child_process');

class Clipboard {
	/**
	 * Get the contents of the clipboard in Windows (using `PowerShell` and .NET), macOS (`pbpaste`) and FreeBSD/Linus (using `xclip` or `xsel`).
	 * 
	 * The promise returns the clipboard data as an object, with the keys referring to the data type and the value being the data value in base64.
	 * 
	 * Here's an example of data that could be returned (the contents is the word `Node.JS` copied from a Google search in Chrome):
	 * Windows:
	 * ```json
	 * {
	 *    "HTML Format": "VgBlAHIAcwBpAG8AbgA6ADAALgA5AA0ACgBTAHQAYQByAHQASABUAE0ATAA6ADAAMAAwADAAMAAwADAAMgA0ADkADQAKAEUAbgBkAEgAVABNAEwAOgAwADAAMAAwADAAMAAwADgAOAA0AA0ACgBTAHQAYQByAHQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAAyADgANQANAAoARQBuAGQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAA4ADQAOAANAAoAUwBvAHUAcgBjAGUAVQBSAEwAOgBoAHQAdABwAHMAOgAvAC8AdwB3AHcALgBnAG8AbwBnAGwAZQAuAGMAbwBtAC8AcwBlAGEAcgBjAGgAPwBxAD0AbgBvAGQAZQBqAHMAJgByAGwAegA9ADEAQwAxAEcAQwBFAFUAXwBlAG4AJgBvAHEAPQBuAG8AZABlAGoAcwAmAGEAcQBzAD0AYwBoAHIAbwBtAGUALgAuADYAOQBpADUANwBqADYAOQBpADYAMABqADYAOQBpADYANQBqADYAOQBpADYAMAAuADUAMAA4AGoAMABqADEAJgBzAG8AdQByAGMAZQBpAGQAPQBjAGgAcgBvAG0AZQAmAGkAZQA9AFUAVABGAC0AOAANAAoAPABoAHQAbQBsAD4ADQAKADwAYgBvAGQAeQA+AA0ACgA8ACEALQAtAFMAdABhAHIAdABGAHIAYQBnAG0AZQBuAHQALQAtAD4APABzAHAAYQBuACAAcwB0AHkAbABlAD0AIgBjAG8AbABvAHIAOgAgAHIAZwBiACgANwA3ACwAIAA4ADEALAAgADgANgApADsAIABmAG8AbgB0AC0AZgBhAG0AaQBsAHkAOgAgAFIAbwBiAG8AdABvACwAIABhAHIAaQBhAGwALAAgAHMAYQBuAHMALQBzAGUAcgBpAGYAOwAgAGYAbwBuAHQALQBzAGkAegBlADoAIAAxADQAcAB4ADsAIABmAG8AbgB0AC0AcwB0AHkAbABlADoAIABuAG8AcgBtAGEAbAA7ACAAZgBvAG4AdAAtAHYAYQByAGkAYQBuAHQALQBsAGkAZwBhAHQAdQByAGUAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB2AGEAcgBpAGEAbgB0AC0AYwBhAHAAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB3AGUAaQBnAGgAdAA6ACAANAAwADAAOwAgAGwAZQB0AHQAZQByAC0AcwBwAGEAYwBpAG4AZwA6ACAAbgBvAHIAbQBhAGwAOwAgAG8AcgBwAGgAYQBuAHMAOgAgADIAOwAgAHQAZQB4AHQALQBhAGwAaQBnAG4AOgAgAHMAdABhAHIAdAA7ACAAdABlAHgAdAAtAGkAbgBkAGUAbgB0ADoAIAAwAHAAeAA7ACAAdABlAHgAdAAtAHQAcgBhAG4AcwBmAG8AcgBtADoAIABuAG8AbgBlADsAIAB3AGgAaQB0AGUALQBzAHAAYQBjAGUAOgAgAG4AbwByAG0AYQBsADsAIAB3AGkAZABvAHcAcwA6ACAAMgA7ACAAdwBvAHIAZAAtAHMAcABhAGMAaQBuAGcAOgAgADAAcAB4ADsAIAAtAHcAZQBiAGsAaQB0AC0AdABlAHgAdAAtAHMAdAByAG8AawBlAC0AdwBpAGQAdABoADoAIAAwAHAAeAA7ACAAYgBhAGMAawBnAHIAbwB1AG4AZAAtAGMAbwBsAG8AcgA6ACAAcgBnAGIAKAAyADUANQAsACAAMgA1ADUALAAgADIANQA1ACkAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AdABoAGkAYwBrAG4AZQBzAHMAOgAgAGkAbgBpAHQAaQBhAGwAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AcwB0AHkAbABlADoAIABpAG4AaQB0AGkAYQBsADsAIAB0AGUAeAB0AC0AZABlAGMAbwByAGEAdABpAG8AbgAtAGMAbwBsAG8AcgA6ACAAaQBuAGkAdABpAGEAbAA7ACAAZABpAHMAcABsAGEAeQA6ACAAaQBuAGwAaQBuAGUAIAAhAGkAbQBwAG8AcgB0AGEAbgB0ADsAIABmAGwAbwBhAHQAOgAgAG4AbwBuAGUAOwAiAD4ATgBvAGQAZQAuAGoAcwA8AC8AcwBwAGEAbgA+ADwAIQAtAC0ARQBuAGQARgByAGEAZwBtAGUAbgB0AC0ALQA+AA0ACgA8AC8AYgBvAGQAeQA+AA0ACgA8AC8AaAB0AG0AbAA+AA==",
	 *    "UnicodeText": "TgBvAGQAZQAuAGoAcwA=",
	 *    "Text": "TgBvAGQAZQAuAGoAcwA=",
	 *    "Locale": "UwB5AHMAdABlAG0ALgBJAE8ALgBNAGUAbQBvAHIAeQBTAHQAcgBlAGEAbQA=",
	 *    "OEMText": "TgBvAGQAZQAuAGoAcwA="
	 * }
	 * ```
	 * 
	 * Linux:
	 * ```json
	 * {
	 *     "TIMESTAMP": "OTIyMjgwNDYw",
	 *     "TARGETS":"VElNRVNUQU1QClRBUkdFVFMKVVRGOF9TVFJJTkcKVEVYVAo=",
	 *     "UTF8_STRING":"Tm9kZS5qcw==",
	 *     "TEXT":"Tm9kZS5qcw=="
	 * }
	 * ```
	 * 
	 * @return {Promise<Object>} The contents of the clipboard.
	 */
	static getClipboardData() {
		switch (os.type()) {
			case 'Darwin':
				return this.getMacOSClipboardData();
			case 'Windows_NT':
				return this.getWindowsClipboardData();
			case 'Linux':
			case 'FreeBSD':
				return this.getUnixClipboardData();
			default:
				throw new Error('Unsupported platform');
		}
	}

	/**
	 * Get the contents of the clipboard in macOS using pbpaste.
	 * 
	 * The promise returns the clipboard data as an object, with the keys referring to the data type and the value being the data value in base64.
	 * 
	 * @return {Promise<Object>} The contents of the clipboard.
	 */
	static getMacOSClipboardData() {
		// haven't _actually_ checked this!
		return new Promise((resolve, reject) => {
			exec('pbpaste -pboard general -Prefer txt', (error, stdout, stderr) => {
				if (error) {
					reject(error);
					return;
				}
				if (stderr) {
					reject(new Error(stderr));
					return;
				}

				let dataObject = {};
				let formats = stdout.trim().split('\n');
				for (let format of formats) {
					let command = `pbpaste -pboard general -Prefer ${format} | base64`;
					exec(command, (error, stdout, stderr) => {
						if (error) {
							//console.error(`Failed to retrieve ${format} data: ${error}`);
							return;
						}
						if (stderr) {
							//console.error(`Failed to retrieve ${format} data: ${stderr}`);
							return;
						}
						let data = stdout.trim();
						if (data) {
							dataObject[format] = data;
						}
						if (Object.keys(dataObject).length === formats.length) {
							let jsonOutput = JSON.stringify(dataObject);
							resolve(jsonOutput);
						}
					});
				}
				resolve(dataObject);
			});
		});
	}

	/**
	 * Get the contents of the clipboard in Windows using PowerShell.
	 * 
	 * The promise returns the clipboard data as an object, with the keys referring to the data type and the value being the data value in base64.
	 * 
	 * 	 * Here's an example of data that could be returned (the contents is the word `Node.JS` copied from a Google search in Chrome):
	 * Windows:
	 * ```json
	 * {
	 *    "HTML Format": "VgBlAHIAcwBpAG8AbgA6ADAALgA5AA0ACgBTAHQAYQByAHQASABUAE0ATAA6ADAAMAAwADAAMAAwADAAMgA0ADkADQAKAEUAbgBkAEgAVABNAEwAOgAwADAAMAAwADAAMAAwADgAOAA0AA0ACgBTAHQAYQByAHQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAAyADgANQANAAoARQBuAGQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAA4ADQAOAANAAoAUwBvAHUAcgBjAGUAVQBSAEwAOgBoAHQAdABwAHMAOgAvAC8AdwB3AHcALgBnAG8AbwBnAGwAZQAuAGMAbwBtAC8AcwBlAGEAcgBjAGgAPwBxAD0AbgBvAGQAZQBqAHMAJgByAGwAegA9ADEAQwAxAEcAQwBFAFUAXwBlAG4AJgBvAHEAPQBuAG8AZABlAGoAcwAmAGEAcQBzAD0AYwBoAHIAbwBtAGUALgAuADYAOQBpADUANwBqADYAOQBpADYAMABqADYAOQBpADYANQBqADYAOQBpADYAMAAuADUAMAA4AGoAMABqADEAJgBzAG8AdQByAGMAZQBpAGQAPQBjAGgAcgBvAG0AZQAmAGkAZQA9AFUAVABGAC0AOAANAAoAPABoAHQAbQBsAD4ADQAKADwAYgBvAGQAeQA+AA0ACgA8ACEALQAtAFMAdABhAHIAdABGAHIAYQBnAG0AZQBuAHQALQAtAD4APABzAHAAYQBuACAAcwB0AHkAbABlAD0AIgBjAG8AbABvAHIAOgAgAHIAZwBiACgANwA3ACwAIAA4ADEALAAgADgANgApADsAIABmAG8AbgB0AC0AZgBhAG0AaQBsAHkAOgAgAFIAbwBiAG8AdABvACwAIABhAHIAaQBhAGwALAAgAHMAYQBuAHMALQBzAGUAcgBpAGYAOwAgAGYAbwBuAHQALQBzAGkAegBlADoAIAAxADQAcAB4ADsAIABmAG8AbgB0AC0AcwB0AHkAbABlADoAIABuAG8AcgBtAGEAbAA7ACAAZgBvAG4AdAAtAHYAYQByAGkAYQBuAHQALQBsAGkAZwBhAHQAdQByAGUAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB2AGEAcgBpAGEAbgB0AC0AYwBhAHAAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB3AGUAaQBnAGgAdAA6ACAANAAwADAAOwAgAGwAZQB0AHQAZQByAC0AcwBwAGEAYwBpAG4AZwA6ACAAbgBvAHIAbQBhAGwAOwAgAG8AcgBwAGgAYQBuAHMAOgAgADIAOwAgAHQAZQB4AHQALQBhAGwAaQBnAG4AOgAgAHMAdABhAHIAdAA7ACAAdABlAHgAdAAtAGkAbgBkAGUAbgB0ADoAIAAwAHAAeAA7ACAAdABlAHgAdAAtAHQAcgBhAG4AcwBmAG8AcgBtADoAIABuAG8AbgBlADsAIAB3AGgAaQB0AGUALQBzAHAAYQBjAGUAOgAgAG4AbwByAG0AYQBsADsAIAB3AGkAZABvAHcAcwA6ACAAMgA7ACAAdwBvAHIAZAAtAHMAcABhAGMAaQBuAGcAOgAgADAAcAB4ADsAIAAtAHcAZQBiAGsAaQB0AC0AdABlAHgAdAAtAHMAdAByAG8AawBlAC0AdwBpAGQAdABoADoAIAAwAHAAeAA7ACAAYgBhAGMAawBnAHIAbwB1AG4AZAAtAGMAbwBsAG8AcgA6ACAAcgBnAGIAKAAyADUANQAsACAAMgA1ADUALAAgADIANQA1ACkAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AdABoAGkAYwBrAG4AZQBzAHMAOgAgAGkAbgBpAHQAaQBhAGwAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AcwB0AHkAbABlADoAIABpAG4AaQB0AGkAYQBsADsAIAB0AGUAeAB0AC0AZABlAGMAbwByAGEAdABpAG8AbgAtAGMAbwBsAG8AcgA6ACAAaQBuAGkAdABpAGEAbAA7ACAAZABpAHMAcABsAGEAeQA6ACAAaQBuAGwAaQBuAGUAIAAhAGkAbQBwAG8AcgB0AGEAbgB0ADsAIABmAGwAbwBhAHQAOgAgAG4AbwBuAGUAOwAiAD4ATgBvAGQAZQAuAGoAcwA8AC8AcwBwAGEAbgA+ADwAIQAtAC0ARQBuAGQARgByAGEAZwBtAGUAbgB0AC0ALQA+AA0ACgA8AC8AYgBvAGQAeQA+AA0ACgA8AC8AaAB0AG0AbAA+AA==",
	 *    "UnicodeText": "TgBvAGQAZQAuAGoAcwA=",
	 *    "Text": "TgBvAGQAZQAuAGoAcwA=",
	 *    "Locale": "UwB5AHMAdABlAG0ALgBJAE8ALgBNAGUAbQBvAHIAeQBTAHQAcgBlAGEAbQA=",
	 *    "OEMText": "TgBvAGQAZQAuAGoAcwA="
	 * }
	 * ```
	 * 
	 * @return {Promise<Object>} The contents of the clipboard.
	 */
	static getWindowsClipboardData() {
		return new Promise((resolve, reject) => {
			// Define the PowerShell script as a string
			let script = `
				Add-Type -AssemblyName System.Windows.Forms
				Add-Type -AssemblyName System.Drawing

				# Retrieve a System.Windows.DataObject containing all clipboard data
				$dataObject = [System.Windows.Forms.Clipboard]::GetDataObject()

				# Create a hashtable to store the base64-encoded data for each format
				$output = @{}

				# Iterate over each format and retrieve the corresponding clipboard data
				foreach ($format in $dataObject.GetFormats()) {
					if ($format.StartsWith("System") -or $format -eq "UniformResourceLocatorW" -or $format -eq "Format17") {
						continue
					} else {
						$data = $dataObject.GetData($format)

						if ($format -eq "PNG" -or $format -eq "BitMap" -or $format -eq "DeviceIndependentBitmap" -or $format -eq "JPG" -or $format -eq "JPEG") {
							if ($dataObject.ContainsImage()) {
								# Retrieve the image data
								$image = $dataObject.GetImage()
								if ($image -ne $null) {
									# Encode the image data in base64
									$stream = New-Object System.IO.MemoryStream

									$pictureFormat = [System.Drawing.Imaging.ImageFormat]::Png
									if ($format -eq "BitMap" -or $format -eq "DeviceIndependentBitmap") {
										$pictureFormat = [System.Drawing.Imaging.ImageFormat]::Bmp
									} elseif ($format -eq "JPG" -or $format -eq "JPEG") {
										$pictureFormat = [System.Drawing.Imaging.ImageFormat]::Jpeg
									}

									$image.Save($stream, $pictureFormat)
									$data = [System.Convert]::ToBase64String($stream.ToArray())
								}
							}
						} elseif ($data -ne $null -and $data -ne "") {
							if ($data -is [System.IO.MemoryStream]) {
								$bytes = [System.Byte[]]::CreateInstance([System.Byte],$data.Length)
								$count = $data.Read($bytes, 0, $data.Length)
								# $data = [System.Convert]::ToBase64String($bytes)
								$data = $bytes
							} else {
								# Encode non-null and non-empty data in base64
								$data = [System.Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($data))

							}
						}

						$output[$format] = $data
					}
				}

				# Convert the hashtable to JSON format
				$jsonOutput = ConvertTo-Json -InputObject $output

				# Output the JSON-formatted clipboard data
				Write-Output $jsonOutput
				Exit
			`;

			// Execute the PowerShell script as a child process
			let powershell = spawn("powershell.exe", ["-NoLogo", "-NoExit", "-noprofile", "-command", script]);

			// Collect the standard output from the PowerShell process
			let stdout = "";
			powershell.stdout.on("data", (data) => {
				stdout += data.toString();
			});

			// Handle errors and completion of the PowerShell process
			powershell.on("error", (error) => {
				reject(`PowerShell error: ${error}`);
			});
			powershell.on("exit", (code, signal) => {
				if (code !== 0) {
					reject(`PowerShell process exited with code ${code} and signal ${signal}`);
					return;
				}

				// Parse the JSON-formatted clipboard data
				let clipboardData = JSON.parse(stdout);

				// Resolve the Promise with the clipboard data
				resolve(clipboardData);
			});
		});
	}

	/**
	 * Get the contents of the clipboard in FreeBSD/Linux using xclip or xsel. If neither exist, returns {}.
	 * 
	 * The promise returns the clipboard data as an object, with the keys referring to the data type and the value being the data value in base64.
	 * 
	 * Here's an example of data that could be returned (the contents is the word `Node.JS` copied from a Google search in Chrome):
	 * Linux:
	 * ```json
	 * {
	 *     "TIMESTAMP": "OTIyMjgwNDYw",
	 *     "TARGETS":"VElNRVNUQU1QClRBUkdFVFMKVVRGOF9TVFJJTkcKVEVYVAo=",
	 *     "UTF8_STRING":"Tm9kZS5qcw==",
	 *     "TEXT":"Tm9kZS5qcw=="
	 * }
	 * ```
	 * 
	 * @return {Promise<Object>} The contents of the clipboard.
	 */
	static getUnixClipboardData() {
		let xclipInstalled = !exec('which xclip').stderr;
		let xselInstalled = !exec('which xsel').stderr;
		return new Promise((resolve, reject) => {
			exec('command -v xclip', (err, stdout, stderr) => {
				if (!err) {
					exec('xclip -selection clipboard -o -t TARGETS', (err, stdout, stderr) => {
						if (err) {
							reject(err);
						} else {
							let formats = stdout.split('\n').filter(Boolean);

							let data = {};
							let count = 0;

							formats.forEach((format) => {
								exec(`xclip -selection clipboard -o -t ${format}`, (err, stdout, stderr) => {
									if (!err) {
										let base64Data = Buffer.from(stdout).toString('base64');
										data[format] = base64Data;
									}

									count++;
									if (count === formats.length) {
										resolve(data);
									}
								});
							});
						}
					});
				} else {
					exec('command -v xsel', (err, stdout, stderr) => {
						if (!err) {
							exec('xsel --clipboard --list-targets', (err, stdout, stderr) => {
								if (err) {
									reject(err);
								} else {
									let formats = stdout.split('\n').filter(Boolean);

									let data = {};
									let count = 0;

									formats.forEach((format) => {
										exec(`xsel --clipboard --output --${format}`, (err, stdout, stderr) => {
											if (!err) {
												let base64Data = Buffer.from(stdout).toString('base64');
												data[format] = base64Data;
											}

											count++;
											if (count === formats.length) {
												resolve(data);
											}
										});
									});
								}
							});
						} else {
							reject('{}');
						}
					});
				}
			});
		});
	}



	/**
	 * Sets the contents of the clipboard in Windows using PowerShell.
	 * 
	 * The promise returns nothing, only rejects on failure.
	 * 
	 * Data is to be in JSON string format or as an object (key-pairs!) - all of which came from the getWindowsClipboardData() function.
	 * 
	 * Here's an example that sets the clipboard to "Node.JS" with HTML formatting.
	 * 
	 * ```js
	 * setWindowsClipboardData({
	 *    "HTML Format": "VgBlAHIAcwBpAG8AbgA6ADAALgA5AA0ACgBTAHQAYQByAHQASABUAE0ATAA6ADAAMAAwADAAMAAwADAAMgA0ADkADQAKAEUAbgBkAEgAVABNAEwAOgAwADAAMAAwADAAMAAwADgAOAA0AA0ACgBTAHQAYQByAHQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAAyADgANQANAAoARQBuAGQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAA4ADQAOAANAAoAUwBvAHUAcgBjAGUAVQBSAEwAOgBoAHQAdABwAHMAOgAvAC8AdwB3AHcALgBnAG8AbwBnAGwAZQAuAGMAbwBtAC8AcwBlAGEAcgBjAGgAPwBxAD0AbgBvAGQAZQBqAHMAJgByAGwAegA9ADEAQwAxAEcAQwBFAFUAXwBlAG4AJgBvAHEAPQBuAG8AZABlAGoAcwAmAGEAcQBzAD0AYwBoAHIAbwBtAGUALgAuADYAOQBpADUANwBqADYAOQBpADYAMABqADYAOQBpADYANQBqADYAOQBpADYAMAAuADUAMAA4AGoAMABqADEAJgBzAG8AdQByAGMAZQBpAGQAPQBjAGgAcgBvAG0AZQAmAGkAZQA9AFUAVABGAC0AOAANAAoAPABoAHQAbQBsAD4ADQAKADwAYgBvAGQAeQA+AA0ACgA8ACEALQAtAFMAdABhAHIAdABGAHIAYQBnAG0AZQBuAHQALQAtAD4APABzAHAAYQBuACAAcwB0AHkAbABlAD0AIgBjAG8AbABvAHIAOgAgAHIAZwBiACgANwA3ACwAIAA4ADEALAAgADgANgApADsAIABmAG8AbgB0AC0AZgBhAG0AaQBsAHkAOgAgAFIAbwBiAG8AdABvACwAIABhAHIAaQBhAGwALAAgAHMAYQBuAHMALQBzAGUAcgBpAGYAOwAgAGYAbwBuAHQALQBzAGkAegBlADoAIAAxADQAcAB4ADsAIABmAG8AbgB0AC0AcwB0AHkAbABlADoAIABuAG8AcgBtAGEAbAA7ACAAZgBvAG4AdAAtAHYAYQByAGkAYQBuAHQALQBsAGkAZwBhAHQAdQByAGUAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB2AGEAcgBpAGEAbgB0AC0AYwBhAHAAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB3AGUAaQBnAGgAdAA6ACAANAAwADAAOwAgAGwAZQB0AHQAZQByAC0AcwBwAGEAYwBpAG4AZwA6ACAAbgBvAHIAbQBhAGwAOwAgAG8AcgBwAGgAYQBuAHMAOgAgADIAOwAgAHQAZQB4AHQALQBhAGwAaQBnAG4AOgAgAHMAdABhAHIAdAA7ACAAdABlAHgAdAAtAGkAbgBkAGUAbgB0ADoAIAAwAHAAeAA7ACAAdABlAHgAdAAtAHQAcgBhAG4AcwBmAG8AcgBtADoAIABuAG8AbgBlADsAIAB3AGgAaQB0AGUALQBzAHAAYQBjAGUAOgAgAG4AbwByAG0AYQBsADsAIAB3AGkAZABvAHcAcwA6ACAAMgA7ACAAdwBvAHIAZAAtAHMAcABhAGMAaQBuAGcAOgAgADAAcAB4ADsAIAAtAHcAZQBiAGsAaQB0AC0AdABlAHgAdAAtAHMAdAByAG8AawBlAC0AdwBpAGQAdABoADoAIAAwAHAAeAA7ACAAYgBhAGMAawBnAHIAbwB1AG4AZAAtAGMAbwBsAG8AcgA6ACAAcgBnAGIAKAAyADUANQAsACAAMgA1ADUALAAgADIANQA1ACkAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AdABoAGkAYwBrAG4AZQBzAHMAOgAgAGkAbgBpAHQAaQBhAGwAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AcwB0AHkAbABlADoAIABpAG4AaQB0AGkAYQBsADsAIAB0AGUAeAB0AC0AZABlAGMAbwByAGEAdABpAG8AbgAtAGMAbwBsAG8AcgA6ACAAaQBuAGkAdABpAGEAbAA7ACAAZABpAHMAcABsAGEAeQA6ACAAaQBuAGwAaQBuAGUAIAAhAGkAbQBwAG8AcgB0AGEAbgB0ADsAIABmAGwAbwBhAHQAOgAgAG4AbwBuAGUAOwAiAD4ATgBvAGQAZQAuAGoAcwA8AC8AcwBwAGEAbgA+ADwAIQAtAC0ARQBuAGQARgByAGEAZwBtAGUAbgB0AC0ALQA+AA0ACgA8AC8AYgBvAGQAeQA+AA0ACgA8AC8AaAB0AG0AbAA+AA==",
	 *    "UnicodeText": "TgBvAGQAZQAuAGoAcwA=",
	 *    "Text": "TgBvAGQAZQAuAGoAcwA=",
	 *    "Locale": "UwB5AHMAdABlAG0ALgBJAE8ALgBNAGUAbQBvAHIAeQBTAHQAcgBlAGEAbQA=",
	 *    "OEMText": "TgBvAGQAZQAuAGoAcwA="
	 * });
	 * ```
	 * 
	 * @return {Promise<boolean>} No data, true if PowerShell exited. 
	 */
	static setWindowsClipboardData(clipboardJsonData) {
		if (typeof clipboardJsonData === "object")
			clipboardJsonData = JSON.stringify(clipboardJsonData);
		if (typeof clipboardJsonData !== "string")
			throw new TypeError("clipboardJsonData expected string got " + (typeof clipboardJsonData).toString());

		return new Promise((resolve, reject) => {
			// Define the PowerShell script as a string
			let script = `
$jsonData = Read-Host
$data = ConvertFrom-Json $jsonData

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Clear the clipboard
[System.Windows.Forms.Clipboard]::Clear()
# [System.Windows.Forms.Clipboard]::SetData("CF_NEP","123")
$dataObject = New-Object System.Windows.Forms.DataObject

foreach ($type in $data.PSObject.Properties) {
	if ($type.Name -eq "PNG" -or $type.Name -eq "Bitmap" -or $type.Name -eq "DeviceIndependentBitmap" -or $type.Name -eq "JPG" -or $type.Name -eq "JPEG") {
		# Convert base64-encoded image data to image
		[byte[]] $imageBytes = [System.Convert]::FromBase64String($type.Value)
		$imageStream = New-Object System.IO.MemoryStream( , $imageBytes)
		$image = [System.Drawing.Image]::FromStream($imageStream)
		$dataObject.SetImage($image)

	} elseif ($type.Name -eq "OEMText") {
		$dataObject.SetData($type.Name, [System.Text.Encoding]::GetEncoding(437).GetString([System.Convert]::FromBase64String($type.Value)))
	
	} elseif ($type.Value -is [array]) {
		$dataObject.SetData($type.Name, [System.IO.MemoryStream]::new($type.Value))

	} else {
		$dataObject.SetData($type.Name, [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String($type.Value)))
	}
}
[System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)

Exit
			`;

			// Execute the PowerShell script as a child process
			let powershell = spawn("powershell.exe", ["-NoLogo", "-NoExit", "-noprofile", "-command", script]);

			// Handle errors and completion of the PowerShell process
			powershell.on("error", (error) => {
				reject(`PowerShell error: ${error}`);
			});
			powershell.on("exit", (code, signal) => {
				if (code !== 0) {
					reject(`PowerShell process exited with code ${code} and signal ${signal}`);
					return;
				}
				resolve(true);
			});

			powershell.stdin.write(clipboardJsonData + "\n", (err) => {
				if (err !== undefined) {
					powershell.kill();
					reject(err);
				}
			});
		});
	}
}

module.exports = Clipboard;