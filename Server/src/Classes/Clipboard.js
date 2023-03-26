const os = require('os');
const { exec, spawn } = require('child_process');
const { basename } = require('path');

ReduceErrors = false; // Silent drops/fixes

class Clipboard {
	/**
	 * Get the contents of the clipboard in Windows (using `PowerShell` and .NET), macOS (`pbpaste`) and FreeBSD/Linus (using `xclip` or `xsel`).
	 * 
	 * The promise returns the clipboard data as an object.
	 * 
	 * Keys are the formats and the values will follow this format: `data:<mimeType>;<encoding>, <data>`
	 * <p>`mimeType`: Mime type of the data</p>
	 * <p>`<encoding>`: How the data is encoded (base64, hex)</p>
	 * <p>`<data>`: Actual format data</p>
	 * 
	 * Here's an example of data that could be returned (the contents is the word `Node.JS` copied from a Google search in Chrome):
	 * Windows:
	 * ```json
	 * {
	 *    "HTML Format": "data:text/html;base64, VgBlAHIAcwBpAG8AbgA6ADAALgA5AA0ACgBTAHQAYQByAHQASABUAE0ATAA6ADAAMAAwADAAMAAwADAAMgA0ADkADQAKAEUAbgBkAEgAVABNAEwAOgAwADAAMAAwADAAMAAwADgAOAA0AA0ACgBTAHQAYQByAHQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAAyADgANQANAAoARQBuAGQARgByAGEAZwBtAGUAbgB0ADoAMAAwADAAMAAwADAAMAA4ADQAOAANAAoAUwBvAHUAcgBjAGUAVQBSAEwAOgBoAHQAdABwAHMAOgAvAC8AdwB3AHcALgBnAG8AbwBnAGwAZQAuAGMAbwBtAC8AcwBlAGEAcgBjAGgAPwBxAD0AbgBvAGQAZQBqAHMAJgByAGwAegA9ADEAQwAxAEcAQwBFAFUAXwBlAG4AJgBvAHEAPQBuAG8AZABlAGoAcwAmAGEAcQBzAD0AYwBoAHIAbwBtAGUALgAuADYAOQBpADUANwBqADYAOQBpADYAMABqADYAOQBpADYANQBqADYAOQBpADYAMAAuADUAMAA4AGoAMABqADEAJgBzAG8AdQByAGMAZQBpAGQAPQBjAGgAcgBvAG0AZQAmAGkAZQA9AFUAVABGAC0AOAANAAoAPABoAHQAbQBsAD4ADQAKADwAYgBvAGQAeQA+AA0ACgA8ACEALQAtAFMAdABhAHIAdABGAHIAYQBnAG0AZQBuAHQALQAtAD4APABzAHAAYQBuACAAcwB0AHkAbABlAD0AIgBjAG8AbABvAHIAOgAgAHIAZwBiACgANwA3ACwAIAA4ADEALAAgADgANgApADsAIABmAG8AbgB0AC0AZgBhAG0AaQBsAHkAOgAgAFIAbwBiAG8AdABvACwAIABhAHIAaQBhAGwALAAgAHMAYQBuAHMALQBzAGUAcgBpAGYAOwAgAGYAbwBuAHQALQBzAGkAegBlADoAIAAxADQAcAB4ADsAIABmAG8AbgB0AC0AcwB0AHkAbABlADoAIABuAG8AcgBtAGEAbAA7ACAAZgBvAG4AdAAtAHYAYQByAGkAYQBuAHQALQBsAGkAZwBhAHQAdQByAGUAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB2AGEAcgBpAGEAbgB0AC0AYwBhAHAAcwA6ACAAbgBvAHIAbQBhAGwAOwAgAGYAbwBuAHQALQB3AGUAaQBnAGgAdAA6ACAANAAwADAAOwAgAGwAZQB0AHQAZQByAC0AcwBwAGEAYwBpAG4AZwA6ACAAbgBvAHIAbQBhAGwAOwAgAG8AcgBwAGgAYQBuAHMAOgAgADIAOwAgAHQAZQB4AHQALQBhAGwAaQBnAG4AOgAgAHMAdABhAHIAdAA7ACAAdABlAHgAdAAtAGkAbgBkAGUAbgB0ADoAIAAwAHAAeAA7ACAAdABlAHgAdAAtAHQAcgBhAG4AcwBmAG8AcgBtADoAIABuAG8AbgBlADsAIAB3AGgAaQB0AGUALQBzAHAAYQBjAGUAOgAgAG4AbwByAG0AYQBsADsAIAB3AGkAZABvAHcAcwA6ACAAMgA7ACAAdwBvAHIAZAAtAHMAcABhAGMAaQBuAGcAOgAgADAAcAB4ADsAIAAtAHcAZQBiAGsAaQB0AC0AdABlAHgAdAAtAHMAdAByAG8AawBlAC0AdwBpAGQAdABoADoAIAAwAHAAeAA7ACAAYgBhAGMAawBnAHIAbwB1AG4AZAAtAGMAbwBsAG8AcgA6ACAAcgBnAGIAKAAyADUANQAsACAAMgA1ADUALAAgADIANQA1ACkAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AdABoAGkAYwBrAG4AZQBzAHMAOgAgAGkAbgBpAHQAaQBhAGwAOwAgAHQAZQB4AHQALQBkAGUAYwBvAHIAYQB0AGkAbwBuAC0AcwB0AHkAbABlADoAIABpAG4AaQB0AGkAYQBsADsAIAB0AGUAeAB0AC0AZABlAGMAbwByAGEAdABpAG8AbgAtAGMAbwBsAG8AcgA6ACAAaQBuAGkAdABpAGEAbAA7ACAAZABpAHMAcABsAGEAeQA6ACAAaQBuAGwAaQBuAGUAIAAhAGkAbQBwAG8AcgB0AGEAbgB0ADsAIABmAGwAbwBhAHQAOgAgAG4AbwBuAGUAOwAiAD4ATgBvAGQAZQAuAGoAcwA8AC8AcwBwAGEAbgA+ADwAIQAtAC0ARQBuAGQARgByAGEAZwBtAGUAbgB0AC0ALQA+AA0ACgA8AC8AYgBvAGQAeQA+AA0ACgA8AC8AaAB0AG0AbAA+AA==",
	 *    "UnicodeText": "data:text/plain;base64, TgBvAGQAZQAuAGoAcwA=",
	 *    "Text": "data:text/plain;base64, TgBvAGQAZQAuAGoAcwA=",
	 *    "Locale": "data:application/octet-stream;hex, 09040000",
	 *    "OEMText": "data:text/cp437;base64, Tm9kZS5qcw==" // Code page 437!
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
	 * @param {boolean} [correctWindowsLineEndings=false] - Change line endings to LF only (from CR-LF) on Windows.
	 * @return {Promise<Object>} The contents of the clipboard.
	 */
	static getClipboardData(correctWindowsLineEndings) {
		switch (os.type()) {
			case 'Windows_NT':
				return this.getWindowsClipboardData(correctWindowsLineEndings);
			case 'Linux':
			case 'FreeBSD':
				return this.getUnixClipboardData();
			case 'Darwin':
				return this.getMacOSClipboardData();
			default:
				throw new Error('Unsupported platform');
		}
	}

	/**
	 * All values are expressed as string value like: `data:<mimeType>;<encoding>, <data>`
	 * <p>`mimeType`: Mime type of the data</p>
	 * <p>`<encoding>`: How the data is encoded (base64, hex)</p>
	 * <p>`<data>`: Actual format data</p>
	 * 
	 * @typedef {object} StandardizedClipboardData 
	 * @property {string} [Image] - Image data, can be PNG, DIB, Bitmap, etc .. Depends on mime type, which is `image/<image type>` (you want `<image type>`).
	 * @property {string} [Text] - Plain text data, either Unicode (UTF8) or ASCII.
	 * @property {string} [RichText] - Rich text data
	 * @property {string} [HTML] - HTML format data
	 */

	/**
	 * Gets the device's clipboard data and fits the data into one of 4 formats. This is to help making the data exchangeable across devices.
	 * 
	 * @param {boolean} [correctWindowsLineEndings=false] - Change line endings to LF only (from CR-LF) on Windows.
	 * @return {Promise<StandardizedClipboardData>}
	 */
	static getStandardizedClipboardData(correctWindowsLineEndings) {
		return new Promise(async (resolve, reject) => {
			try {
				let clipboardData = await this.getClipboardData(correctWindowsLineEndings);
				/** @type {StandardizedClipboardData} */
				let returnData = {}

				let formats = Object.keys(clipboardData);

				let breakUpParts = function(data) {
					let parts = data.split(',');
					if (parts.length != 2)
						return undefined;
					data = parts[1].trimStart();
					if (typeof data !== "string")
						return undefined;


					let pattern = /^data:(.*)\/(.*);(.*)$/;
					let matches = parts[0].match(pattern);
					if (!matches)
						return undefined;

					return {
						mimeType: matches[1].toLowerCase(),
						fileExtension: matches[2].toLowerCase(),
						encoding: matches[3].toLowerCase(),
						data: data
					};
				}

				if (os.type() == "Windows_NT") {
					// Copy image data over
					if (typeof clipboardData.PNG === "string") {
						// Image data
						returnData.Image = clipboardData.PNG;
					} else if (typeof clipboardData.DeviceIndependentBitmap === "string") {
						// CF_DIB
						returnData.Image = clipboardData.DeviceIndependentBitMap;
					} else if (typeof clipboardData.Bitmap === "string") {
						returnData.Image = clipboardData.Bitmap;
					}

					// Copy text over
					if (typeof clipboardData.Unicode === "string") {
						returnData.Text = clipboardData.Unicode;
					} else if (typeof clipboardData.Text === "string") {
						returnData.Text = clipboardData.Text;
					} else if (typeof clipboardData.FileNameW === "string") {
						returnData.Text = clipboardData.FileNameW;
					}

					// Copy RichText over
					if (typeof clipboardData["Rich Text Format"] === "string") {
						returnData.RichText = clipboardData["Rich Text Format"];
					} else if (typeof clipboardData["RTF As Text"] === "string") {
						returnData.RichText = clipboardData["RTF As Text"];
					}

					// Copy HTML data over
					if (typeof clipboardData["HTML Format"] === "string") {
						returnData.HTML = clipboardData["HTML Format"];
					} else if (typeof clipboardData.HTML === "string") {
						returnData.HTML = clipboardData.HTML;
					}


				} else if (os.type() == "Linux" || os.type() == "FreeBSD") {
					// Copy image data over
					if (typeof clipboardData["image/png"] === "string")
						returnData.Image = clipboardData["image/png"];
					else if (typeof clipboardData["image/bmp"] === "string")
						returnData.Image = clipboardData["image/bmp"];
					else if (typeof clipboardData["image/jpeg"] === "string")
						returnData.Image = clipboardData["image/jpeg"];

					// Copy text over
					if (typeof clipboardData.UTF8_STRING === "string")
						returnData.Text = clipboardData.UTF8_STRING;
					else if (typeof clipboardData.TEXT === "string")
						returnData.Text = clipboardData.TEXT;
					else if (typeof clipboardData.STRING === "string")
						returnData.Text = clipboardData.STRING;

					// Copy RichText over
					// ???

					// Copy HTML data over
					if (typeof clipboardData["text/html"] === "string") {
						returnData.HTML = clipboardData["text/html"];
					}
				}

				formats.forEach((format) => {
					try {
						let parts = clipboardData[format].split(',');
						if (parts.length != 2)
							return;
						let data = parts[1].trimStart();
						if (typeof data !== "string")
							return;


						let pattern = /^data:(.*)\/(.*);(.*)$/;
						let matches = parts[0].match(pattern);
						if (!matches)
							return;

						let mimeType = matches[1].toLowerCase();
						let fileExtension = matches[2].toLowerCase();
						let encoding = matches[3].toLowerCase();

						if (os.type() == "Windows_NT" || os.type() == "Linux" || os.type() == "FreeBSD") {
							switch (mimeType) {
								case "image":
									if (fileExtension == "png") {
										returnData.Image = clipboardData[format]; // Go with a PNG over whatever else
									} else if (returnData.Image === undefined) {
										returnData.Image = clipboardData[format]; // Only add image if not already there
									}
									break;

								case "text": {
									if ((fileExtension == "rtf" || fileExtension == "richtext") && returnData.RichText === undefined) {
										returnData.RichText = clipboardData[format];
									} else if (fileExtension == "html" && returnData.HTML === undefined) {
										returnData.HTML = clipboardData[format];
									} else if (returnData.Text !== undefined) {
										returnData.Text = clipboardData[format];
									}
								}
							}


						}
					} catch (e) {}
				});

				// convert to standard HTML
				if (os.type() == "Windows_NT" && typeof returnData.HTML === "string") {
					let data = breakUpParts(returnData.HTML);
					if (data !== undefined) {
						let cfHTML = Buffer.from(data.data, data.encoding).toString('ascii');
						
						let lines = cfHTML.split(/(?:\r\n|\r|\n)/g);
						let htmlData = "";
						let inHTML = false;
						lines.forEach((line) => {
							if (inHTML)
								htmlData += line;
							else if (line.split(':').length < 2) {
								inHTML = true;
								htmlData += line;
							}
						})


						if (htmlData) {
							if (correctWindowsLineEndings)
								htmlData = htmlData.replace(/\r\n/,'\n');

							htmlData = Buffer.from(htmlData, 'ascii').toString("utf8"); // ASCII -> UTF8
							htmlData = Buffer.from(htmlData, "utf8").toString('base64'); // UTF8 -> BASE64

							returnData.HTML = "data:text/html;" + "base64" + ", " + htmlData;
						}
					}
				}

				resolve(returnData);
			} catch (err) {
				reject(err);
			}
		});
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
				if (error || stderr) {
					reject(error);
					return;
				}

				let formats = stdout.trim().split('\n');
				let data = {};
				let count = 0;
				formats.forEach((format) => {
					exec(`pbpaste -pboard general -Prefer ${format} | base64`, (err, stdout, stderr) => {
						if (!err) {
							if (stdout)
								data[format] = stdout.trim();
						}

						count++;
						if (count === formats.length) {
							resolve(data);
						}
					});
				});
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
	 * @param {boolean} [correctLineEndings = false] - Swap CR-LF line endings to LF endings.
	 * @return {Promise<Object>} The contents of the clipboard.
	 */
	static getWindowsClipboardData(correctLineEndings) {
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
	if ($format.StartsWith("System") -or $format -eq "Embed Source") {
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
					$mime = "png"
					if ($format -eq "BitMap" -or $format -eq "DeviceIndependentBitmap") {
						$mime = "bmp"
						$pictureFormat = [System.Drawing.Imaging.ImageFormat]::Bmp
					} elseif ($format -eq "JPG" -or $format -eq "JPEG") {
						$mime = "jpeg"
						$pictureFormat = [System.Drawing.Imaging.ImageFormat]::Jpeg
					}

					$image.Save($stream, $pictureFormat)
					$data = [System.Convert]::ToBase64String($stream.ToArray())
					# $data = [BitConverter]::ToString($stream.ToArray()).Replace('-', '')
					$data = "data:image/" + $mime.ToLower() + ";base64, " + $data
				}
			}
		} elseif ($data -ne $null -and $data -ne "") {
			if ($data -is [System.IO.MemoryStream]) {
				$bytes = [System.Byte[]]::CreateInstance([System.Byte],$data.Length)
				$count = $data.Read($bytes, 0, $data.Length)
				# $data = [System.Convert]::ToBase64String($bytes)
				$data = "data:application/octet-stream;hex, " + [BitConverter]::ToString($bytes).Replace('-', '')
			
			} else {
				$encoder = [System.Text.Encoding]::UTF8
				$type = "plain"
				if ($format -eq "RichText" -or $format.StartsWith("Rich Text")) {
					$type = "rtf"
				} elseif ($format -eq "HTML Format") {
					$type = "html"
					$encoder = [System.Text.Encoding]::ASCII
				} elseif ($format -eq "OEMTEXT") {
					$type = "ibm437"
					$encoder = [System.Text.Encoding]::GetEncoding(437)
				}
				# Encode non-null and non-empty data in base64
				$data = "data:text/$type;base64, " + [System.Convert]::ToBase64String($encoder.GetBytes($data))
			}
		}

		if ($data -ne $null) {
			$output[$format] = $data
		}
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
			powershell.stderr.on("data", (data) => {
				reject(data.toString());
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
	 * Get the contents of the clipboard in FreeBSD/Linux using xclip or xsel. If neither exist, throw error.
	 * 
	 * xsel only supports standard text.
	 * 
	 * The promise returns the clipboard data as an object, with the keys referring to the data type and the value being the data value in base64.
	 * 
	 * Here's an example of data that could be returned (the contents is the word `Node.JS` copied from a Google search in FireFox):
	 * Linux:
	 * ```json
	 * {
	 *    "text/plain;charset=utf-8": "data:text/plain;base64, Node.js",
	 *    "STRING": "data:text/plain;base64, Tm9kZS5qcw==",
	 *    "TEXT": "data:text/plain;base64, Tm9kZS5qcw==",
	 *    "COMPOUND_TEXT": "data:text/plain;base64, Tm9kZS5qcw==",
	 *    "UTF8_STRING": "data:text/plain;base64, Tm9kZS5qcw==",
	 *    "text/_moz_htmlinfo": "data:text/_moz_htmlinfo;base64, MAAsADAA",
	 *    "text/_moz_htmlcontext":
	 *    "data:text/_moz_htmlcontext;base64, PABoAHQAbQBsACAAaQB0AGUAbQBzAGMAbwBwAGUAPQAiACIAIABpAHQAZQBtAHQAeQBwAGUAPQAiAGgAdAB0AHAAOgAvAC8AcwBjAGgAZQBtAGEALgBvAHIAZwAvAFMAZQBhAHIAYwBoAFIAZQBzAHUAbAB0AHMAUABhAGcAZQAiACAAbABhAG4AZwA9ACIAZQBuACIAPgA8AGIAbwBkAHkAIABqAHMAbQBvAGQAZQBsAD0AIgBoAHMAcABEAEQAZgAiACAAYwBsAGEAcwBzAD0AIgBzAHIAcAAiACAAagBzAGMAbwBuAHQAcgBvAGwAbABlAHIAPQAiAEUAbwB4ADMAOQBkACIAIABqAHMAYQBjAHQAaQBvAG4APQAiAHIAYwB1AFEANgBiADoAbgBwAFQAMgBtAGQAOwB4AGoAaABUAEkAZgA6AC4AQwBMAEkARQBOAFQAOwBPADIAdgB5AHMAZQA6AC4AQwBMAEkARQBOAFQAOwBJAFYASwBUAGYAZQA6AC4AQwBMAEkARQBOAFQAOwBFAHoANwBWAE0AYwA6AC4AQwBMAEkARQBOAFQAOwBZAFUAQwA3AEgAZQA6AC4AQwBMAEkARQBOAFQAOwBoAFcAVAA5AEoAYgA6AC4AQwBMAEkARQBOAFQAOwBXAEMAdQBsAFcAZQA6AC4AQwBMAEkARQBOAFQAOwBWAE0AOABiAGcAOgAuAEMATABJAEUATgBUADsAcQBxAGYAMABuADoALgBDAEwASQBFAE4AVAA7AHMAegBqAE8AUgA6AC4AQwBMAEkARQBOAFQAOwBZAGMAZgBKADoALgBDAEwASQBFAE4AVAA7AGsAVwBsAHgAaABjADoALgBDAEwASQBFAE4AVAA7AEoATAA5AFEARABjADoALgBDAEwASQBFAE4AVAA7AGEAZQBCAHIAbgA6AC4AQwBMAEkARQBOAFQAIgAgAGkAZAA9ACIAZwBzAHIAIgAgAHQAbwBwAG0AYQByAGcAaQBuAD0AIgAzACIAIABtAGEAcgBnAGkAbgBoAGUAaQBnAGgAdAA9ACIAMwAiAD4APABkAGkAdgAgAGMAbABhAHMAcwA9ACIAbQBhAGkAbgAiACAAaQBkAD0AIgBtAGEAaQBuACIAPgA8AGQAaQB2ACAAagBzAG0AbwBkAGUAbAA9ACIAIABSAE8AYQBLAHgAZQAiACAAYwBsAGEAcwBzAD0AIgBlADkARQBmAEgAZgAiACAAaQBkAD0AIgBjAG4AdAAiAD4APABkAGkAdgAgAGMAbABhAHMAcwA9ACIARwB5AEEAZQBXAGIAIgAgAGkAZAA9ACIAcgBjAG4AdAAiAD4APABkAGkAdgAgAGMAbABhAHMAcwA9ACIAVABRAGMAMQBpAGQAIAByAGgAcwB0AGMANAAiACAAagBzAGMAbwBuAHQAcgBvAGwAbABlAHIAPQAiAGMAUwBYADkAWABlACIAIABkAGEAdABhAC0AcAB3AHMAPQAiADEAMwAwADAAIgAgAGQAYQB0AGEALQBzAHAAZQA9ACIAdAByAHUAZQAiACAAagBzAGEAYwB0AGkAbwBuAD0AIgByAGMAdQBRADYAYgA6AG4AcABUADIAbQBkACIAIABpAGQAPQAiAHIAaABzACIAIABqAHMAZABhAHQAYQA9ACIATQBkAGUAVgBLAGIAOwBfADsAQQBQAEkANQBsAE0AIgAgAHIAbwBsAGUAPQAiAGMAbwBtAHAAbABlAG0AZQBuAHQAYQByAHkAIgAgAGQAYQB0AGEALQBoAHYAZQBpAGQAPQAiAEMAQgBFAFEAQQBBACIAPgA8AGQAaQB2ACAAagBzAG4AYQBtAGUAPQAiAFQAbABFAEIAcQBkACIAIABqAHMAbQBvAGQAZQBsAD0AIgBIAFgAMgB0AEwAZAAiACAAYwBsAGEAcwBzAD0AIgBrAHAALQB3AGgAbwBsAGUAcABhAGcAZQAgAHMAcwA2AHEAcQBiACAAdQA3AHkAdwA5ACAAegBMAHMAaQBZAGUAIABtAG4AcgAtAGMAIABVAEIAbwB4AEMAYgAgAGsAcAAtAHcAaABvAGwAZQBwAGEAZwBlAC0AbwBzAHIAcAAgAEoAYgAwAFoAaQBmACAARQB5AEIAUgB1AGIAIgAgAGQAYQB0AGEALQBoAHYAZQBpAGQAPQAiAEMARQA4AFEAQQBBACIAIABkAGEAdABhAC0AdgBlAGQAPQAiADIAYQBoAFUASwBFAHcAagBmAHgAXwBfAGQAdABlAG4AOQBBAGgAVgBqAG4ARwBvAEYASABlAG0AMwBEAEkAZwBRADgAZQBzAEMASwBBAEIANgBCAEEAaABQAEUAQQBBACIAPgA8AGQAaQB2AD4APABkAGkAdgAgAGoAcwBjAG8AbgB0AHIAbwBsAGwAZQByAD0AIgBKADQAZwBhADEAYgAiACAAagBzAGQAYQB0AGEAPQAiAHIAagA2AFAAagBmADsAXwA7AEEAUABJADUAbQAwACIAIABqAHMAYQBjAHQAaQBvAG4APQAiAHIAYwB1AFEANgBiADoAbgBwAFQAMgBtAGQAOwBEADIAdwBJAHYAYgA6AFIAOQB6AEkAdABiADsARAB1AEcAYwB6ADoAZgAyADAAegB1AGUAOwB3AGoAZQBFAEYAZQA6AGYAMgAwAHoAdQBlADsATQBwAEgAMwBsAGMAOgBRAFMANwBqAE0AYwA7AG0ATQBmADYAMQBlADoAbwB4AFgAWgAzAGQAOwBpADIAVABqAGMAZAA6AGYAMgAwAHoAdQBlACIAIABjAGwAYQBzAHMAPQAiAG8AcwByAHAALQBiAGwAawAiACAAaQBkAD0AIgBfAFgAYgA4AFgAWgBKAC0AbABIAE8ATwA0AHEAdABzAFAANgBlAC0AeQB3AEEAZwBfADUANQAiAD4APABkAGkAdgA+ADwAZABpAHYAIABjAGwAYQBzAHMAPQAiAEsAbwB0ADcAeAAiAD4APABkAGkAdgAgAGkAZAA9ACIAawBwAC0AdwBwAC0AdABhAGIALQBjAG8AbgB0AC0AbwB2AGUAcgB2AGkAZQB3ACIAIABqAHMAYwBvAG4AdAByAG8AbABsAGUAcgA9ACIAZQB0AEcAUAA0AGMAIgAgAGQAYQB0AGEALQBsAG8AcAByAGkAPQAiADEAIgAgAGQAYQB0AGEALQByAGMAbwB2AD0AIgAxACIAIABqAHMAZABhAHQAYQA9ACIAZwBzAFIATQBHAGIAOwBfADsAQQBQAEkANQBtADQAIgAgAGoAcwBhAGMAdABpAG8AbgA9ACIAcgBjAHUAUQA2AGIAOgBuAHAAVAAyAG0AZAA7AHUAMQA2AGQAWgBlADoAaAAxAGEAcABCAGUAOwBsAGcAcgBBADQAYwA6AEwAWgBSAEgATgBjADsAcwBRAEYAWQBzAGMAOgBKADAAdgBmAFUAZQA7AFYAaQB0AHUAawA6AGkAQgBEADgAZgBjADsAVgBXAEUAdQBIAGYAOgBIAGgANwBXAFEAYgAiACAAZABhAHQAYQAtAGgAdgBlAGkAZAA9ACIAQwBFADgAUQBCAGcAIgAgAGQAYQB0AGEALQB2AGUAZAA9ACIAMgBhAGgAVQBLAEUAdwBqAGYAeABfAF8AZAB0AGUAbgA5AEEAaABWAGoAbgBHAG8ARgBIAGUAbQAzAEQASQBnAFEAeQBkAG8AQgBLAEEAQgA2AEIAQQBoAFAARQBBAFkAIgA+ADwAZABpAHYAIABjAGwAYQBzAHMAPQAiAGEAbwBQAGYATwBjACIAPgA8AGQAaQB2ACAAaQBkAD0AIgBrAHAALQB3AHAALQB0AGEAYgAtAG8AdgBlAHIAdgBpAGUAdwAiACAAZABhAHQAYQAtAGgAdgBlAGkAZAA9ACIAQwBGAFkAUQBBAEEAIgAgAGQAYQB0AGEALQB2AGUAZAA9ACIAMgBhAGgAVQBLAEUAdwBqAGYAeABfAF8AZAB0AGUAbgA5AEEAaABWAGoAbgBHAG8ARgBIAGUAbQAzAEQASQBnAFEAawB0ADQAQgBLAEEAQgA2AEIAQQBoAFcARQBBAEEAIgA+ADwAZABpAHYAIABjAGwAYQBzAHMAPQAiAFQAegBIAEIANgBiACAAYwBMAGoAQQBpAGMAIgAgAGoAcwBjAG8AbgB0AHIAbwBsAGwAZQByAD0AIgBuAFAAYQBRAHUAIgAgAGoAcwBhAGMAdABpAG8AbgA9ACIAcgBjAHUAUQA2AGIAOgBuAHAAVAAyAG0AZAA7AGoAUQBMAEMASwBlADoAVgBpAG0ATwBSAGUAOwAiACAAagBzAGQAYQB0AGEAPQAiAFAAaABvAEgAZAA7AF8AOwBBAFAASQA1AG4AbwAiACAAZABhAHQAYQAtAGgAdgBlAGkAZAA9ACIAQwBJAGMAQgBFAEEAQQAiACAAZABhAHQAYQAtAHYAZQBkAD0AIgAyAGEAaABVAEsARQB3AGoAZgB4AF8AXwBkAHQAZQBuADkAQQBoAFYAagBuAEcAbwBGAEgAZQBtADMARABJAGcAUQAwADQAZwBDAEsAQQBCADYAQgBRAGkASABBAFIAQQBBACIAPgA8AGQAaQB2ACAAagBzAG4AYQBtAGUAPQAiAHgAUQBqAFIATQAiAD4APABkAGkAdgAgAGMAbABhAHMAcwA9ACIAcwBBAFQAUwBIAGUAIgA+ADwAZABpAHYAPgA8AGQAaQB2ACAAYwBsAGEAcwBzAD0AIgBCADAAMwBoADMAZAAgAFYAMQA0AG4ASwBjACAAaQA4AHEAcQA4AGIAIABwAHQAYwBMAEkATwBzAHoAUQBKAHUAXwBfAHcAaABvAGwAZQBwAGEAZwBlAC0AYwBhAHIAZAAgAHcAcAAtAG0AcwAiACAAZABhAHQAYQAtAGgAdgBlAGkAZAA9ACIAQwBJAFEAQgBFAEEAQQAiAD4APABkAGkAdgAgAGMAbABhAHMAcwA9ACIAVQBEAFoAZQBZACAAZgBBAGcAYQBqAGMAIABPAFQARgBhAEEAZgAiAD4APABkAGkAdgAgAGMAbABhAHMAcwA9ACIAeQB4AGoAWgB1AGYAIgA+ADwAZABpAHYAIABjAGwAYQBzAHMAPQAiAHcARABZAHgAaABjACIAIABkAGEAdABhAC0AbQBkAD0AIgA1ADAAIgAgAHMAdAB5AGwAZQA9ACIAYwBsAGUAYQByADoAbgBvAG4AZQAiACAAZABhAHQAYQAtAGgAdgBlAGkAZAA9ACIAQwBGAHcAUQBBAEEAIgAgAGQAYQB0AGEALQB2AGUAZAA9ACIAMgBhAGgAVQBLAEUAdwBqAGYAeABfAF8AZAB0AGUAbgA5AEEAaABWAGoAbgBHAG8ARgBIAGUAbQAzAEQASQBnAFEAawBDAGwANgBCAEEAaABjAEUAQQBBACIAIABsAGEAbgBnAD0AIgBlAG4ALQBVAFMAIgA+ADwAZABpAHYAIABjAGwAYQBzAHMAPQAiAFAAWgBQAFoAbABmACAAaABiADgAUwBBAGMAIgAgAGQAYQB0AGEALQBhAHQAdAByAGkAZAA9ACIAZABlAHMAYwByAGkAcAB0AGkAbwBuACIAIABkAGEAdABhAC0AaAB2AGUAaQBkAD0AIgBDAEYAdwBRAEEAUQAiACAAZABhAHQAYQAtAHYAZQBkAD0AIgAyAGEAaABVAEsARQB3AGoAZgB4AF8AXwBkAHQAZQBuADkAQQBoAFYAagBuAEcAbwBGAEgAZQBtADMARABJAGcAUQB6AGkAQQBvAEEASABvAEUAQwBGAHcAUQBBAFEAIgA+ADwAZABpAHYAIABqAHMAYwBvAG4AdAByAG8AbABsAGUAcgA9ACIARwBDAFMAYgBoAGQAIgAgAGoAcwBhAGMAdABpAG8AbgA9ACIAUwBLAEEAYQBNAGUAOgBjADAAWABVAGIAZQA7AHIAYwB1AFEANgBiADoAbgBwAFQAMgBtAGQAIgA+ADwAZABpAHYAIABqAHMAYwBvAG4AdAByAG8AbABsAGUAcgA9ACIAUQBoAG8AeQBMAGQAIgAgAGoAcwBhAGMAdABpAG8AbgA9ACIAcgBjAHUAUQA2AGIAOgBuAHAAVAAyAG0AZAAiAD4APABkAGkAdgAgAGoAcwBuAGEAbQBlAD0AIgBnADcAVwA3AEUAZAAiACAAagBzAGMAbwBuAHQAcgBvAGwAbABlAHIAPQAiAEcAQwBTAGIAaABkACIAIABjAGwAYQBzAHMAPQAiAGsAbgBvAC0AcgBkAGUAcwBjACIAIABqAHMAYQBjAHQAaQBvAG4APQAiAHMAZQBNADcAUQBlADoAYwAwAFgAVQBiAGUAOwBJAGkAZwBvAGUAZQA6AGMAMABYAFUAYgBlADsAcgBjAHUAUQA2AGIAOgBuAHAAVAAyAG0AZAAiAD4APABzAHAAYQBuAD4APAAvAHMAcABhAG4APgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AZABpAHYAPgA8AC8AYgBvAGQAeQA+ADwALwBoAHQAbQBsAD4A",
	 *    "text/html":
	 *    "data:text/html;base64, PG1ldGEgaHR0cC1lcXVpdj0iY29udGVudC10eXBlIiBjb250ZW50PSJ0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLTgiPjxzcGFuPk5vZGUuanM8L3NwYW4+",
	 *    "TARGETS":
	 *    "data:text/plain;base64, VElNRVNUQU1QClRBUkdFVFMKTVVMVElQTEUKU0FWRV9UQVJHRVRTCnRleHQvaHRtbAp0ZXh0L19tb3pfaHRtbGNvbnRleHQKdGV4dC9fbW96X2h0bWxpbmZvClVURjhfU1RSSU5HCkNPTVBPVU5EX1RFWFQKVEVYVApTVFJJTkcKdGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04CnRleHQvcGxhaW4KdGV4dC94LW1vei11cmwtcHJpdgo=",
	 *    "TIMESTAMP": "data:text/x-timestamp;base64, Mzg0NzI3OAo=",
	 *    "text/plain": "data:text/plain;base64, Tm9kZS5qcw==",
	 *    "text/x-moz-url-priv":
	 *    "data:text/x-moz-url-priv;base64, aAB0AHQAcABzADoALwAvAHcAdwB3AC4AZwBvAG8AZwBsAGUALgBjAG8AbQAvAHMAZQBhAHIAYwBoAD8AYwBoAGEAbgBuAGUAbAA9AGYAcwAmAGMAbABpAGUAbgB0AD0AdQBiAHUAbgB0AHUAJgBxAD0ATgBvAGQAZQBqAHMA"
	 * }
	 * ```
	 * 
	 * `TARGETS` can be seen as redundant as it's the same as the keys.
	 * 
	 * @return {Promise<Object>} The contents of the clipboard.
	 */
	static getUnixClipboardData() {
		// this is nasty, I know
		return new Promise(async (resolve, reject) => {
			exec('command -v xclip', (err, stdout, stderr) => {
				if (!err && stdout && !stderr) {
					exec('xclip -selection clipboard -o -t TARGETS', (err, stdout, stderr) => {
						if (err) {
							reject(err);
						} else if (stderr) {
							reject(stderr);
						} else {
							let formats = stdout.split('\n').filter(Boolean);
							let data = {};
							let count = 0;

							formats.forEach((format) => {
								if (format !== undefined) {
									exec(`xclip -selection clipboard -o -t ${format} | base64`, (err, stdout, stderr) => {
										if (!err && stdout && !stderr) {
											let mimeType = format.split(';')[0];

											// Fix mime type for things like "TARGETS", "TIMESTAMP", "SAVE_TARGETS" etc
											switch (mimeType) {
												case "STRING":
												case "TEXT":
												case "UTF8_STRING":
												case "COMPOUND_TEXT":
												case "TARGETS":
													mimeType = "text/plain";
													break;

												case "TIMESTAMP":
													mimeType = "text/x-timestamp";
													break;
											}

											if (mimeType.split('/').length != 2) {
												mimeType = "text/" + mimeType.toLowerCase();
											}


											// let base64Data = Buffer.from(stdout).toString('base64');
											let base64Data = stdout.toString().replace(/\n/g,'');
											data[format] = "data:" + mimeType + ";base64, " + base64Data;
										}

										count++;
										if (count === formats.length) {
											resolve(data);
										}
									});
								}
							});
						}
					});
				} else {
					exec('command -v xsel', (err, stdout, stderr) => {
						if (!err && stdout && !stderr) {
							exec('xsel --clipboard -o', (err, stdout, stderr) => {
								if (err)
									reject(err);
								else
									resolve({ TEXT: stdout }); // xsel only does text
							});
						} else {
							reject('Unable to find xclip or xsel.');			
						} // if err
					}); // xsel available?
				} // if err (xclip)
			}); // xclip check
		}); // promise
	}


	//*********************************************
	//  ---------------------------------------
	//  Setting
	//  ---------------------------------------
	//*********************************************

	/**
	 * Sets the contents of the clipboard in Windows (using `PowerShell` and .NET), macOS (`pbpaste`) and FreeBSD/Linus (using `xclip` or `xsel`).
	 * 
	 * The promise returns a boolean whether or not the data was set successfully.
	 * 
	 * Here's an example of data that could be set (the contents is the word `Node.JS` copied from a Google search in Chrome):
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
	 * @param {boolean} [correctWindowsLineEndings=false] - Change line endings to LF only (from CR-LF) on Windows.
	 * @return {Promise<boolean>} - Set successfully
	 */
	static setClipboardData(clipboardData, correctWindowsLineEndings) {
		switch (os.type()) {
			case 'Windows_NT':
				return this.setWindowsClipboardData(clipboardData, correctWindowsLineEndings);
			case 'Linux':
			case 'FreeBSD':
				return this.setUnixClipboardData(clipboardData);
			case 'Darwin':
				return this.setMacOSClipboardData(clipboardData);
			default:
				throw new Error('Unsupported platform');
		}
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
	 * @param {object|string} clipboardData - Clipboard data either in JSON string format or object format.
	 * @param {boolean} [correctLineEndings = false] - Swap LF line endings to CR-LF endings.
	 * @return {Promise<boolean>} No data, true if PowerShell exited. 
	 */
	static setWindowsClipboardData(clipboardData, correctLineEndings) {
		if (typeof clipboardData === "object") {
			try {
				clipboardData = JSON.stringify(clipboardData);
			} catch(e) {
				throw new TypeError("clipboardData expected json string or object, got " + (typeof clipboardData).toString());
			}
		}
		if (typeof clipboardData !== "string")
			throw new TypeError("clipboardData expected object or json string, got " + (typeof clipboardData).toString());



		return new Promise((resolve, reject) => {
			// Define the PowerShell script as a string
			let script = `
$jsonData = Read-Host
$data = ConvertFrom-Json $jsonData

# Add references
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Clear the clipboard
[System.Windows.Forms.Clipboard]::Clear()
$dataObject = New-Object System.Windows.Forms.DataObject

foreach ($type in $data.PSObject.Properties) {
	if ($null -eq $type.Value) {
		continue
	}

	$parts = $type.Value -split ",", 2

	# define the regular expression pattern
	$pattern = "^data:(.*)\/(.*);(.*)$"

	# check if $type.Value matches the pattern
	if ($parts[0] -match $pattern) {
	    # extract the MIME type and file extension from the first part
	    $mime_type = $matches[1].ToLower()
	    $file_extension = $matches[2].ToLower()
	    $encoding = $matches[3].ToLower()
	    $data = $parts[1].trim()

	    if ($encoding -eq "base64") {
	    	$bytes = [System.Convert]::FromBase64String($data)
	    } elseif ($encoding -eq "hex") {
			[byte[]] $bytes = [byte[]] -split ($data -replace '..', '0x$& ')
	    }
	} else {
	    continue
	}

	if ($file_extension -eq "octet-stream") {
		$dataObject.SetData($type.Name, [System.IO.MemoryStream]::new($bytes))

	} elseif ($mime_type -eq "image") {
		# Convert base64-encoded image data to image
		$imageStream = New-Object System.IO.MemoryStream( , $bytes)
		$image = [System.Drawing.Image]::FromStream($imageStream)
		$dataObject.SetImage($image)

	} elseif ($mime_type -eq "text") {
		$encoder = [System.Text.Encoding]::UTF8
		if ($file_extension -eq "ibm437") {
			$encoder = [System.Text.Encoding]::GetEncoding(437)
		}

		$dataObject.SetData($type.Name, $encoder.GetString($bytes))
	}
}
[System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
Exit
			`;

			// Execute the PowerShell script as a child process
			let powershell = spawn("powershell.exe", ["-NoLogo", "-noprofile", "-command", script]);

			// powershell.stdout.on("data", (data) => {
			// 	console.log(data.toString());
			// });
			// powershell.stderr.on("data", (data) => {
			// 	console.error(data.toString());
			// });

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

			powershell.stdin.write(clipboardData + "\n", (err) => {
				if (err !== undefined) {
					powershell.kill();
					reject(err);
				}
			});
		});
	}


	static setUnixClipboardData(data) {
		// this is nasty, I know
		return new Promise(async (resolve, reject) => {
			exec('command -v xclip', (err, stdout, stderr) => {
				if (!err && stdout && !stderr) {
					let formats = Object.keys(data);
					let count = 0;

					formats.forEach((format) => {
						if (format !== undefined) {
							exec(`echo "${data[format]}" | base64 -d | xclip -selection clipboard -t ${format}`, (err, stdout, stderr) => {
								if (err) {
									reject(err);
								} else if (stderr) {
									reject(stderr);
								}

								count++;
								if (count === formats.length) {
									resolve();
								}
							});
						}
					});
				} else {
					if (data.TEXT !== undefined && data.UTF8_STRING !== undefined)
					exec('command -v xsel', (err, stdout, stderr) => {
						if (!err && stdout && !stderr) {
							let text = data.TEXT !== undefined? data.TEXT : data.UTF8_STRING;
							exec(`echo "${data.TEXT}" | xsel --clipboard`, (err, stdout, stderr) => {
								if (err) {
									reject(err);
								} else if (stderr) {
									reject(stderr);
								}

								resolve();
							});
						} else {
							reject('Unable to find xclip or xsel.');
						}
					});
				}
			});
		});
	}

	/**
	 * Gets the device's clipboard data and fits the data into one of 4 formats. This is to help making the data exchangeable across devices.
	 * 
	 * Replaces LF line endings to CR-LF on Windows.
	 * @param {StandardizedClipboardData} clipboardData - Clipboard data to set. _This can be in JSON form, follow StandardizedClipboardData scheme._
	 */
	static setStandardizedClipboardData(clipboardData) {
		if (typeof clipboardData === "string") {
			try {
				clipboardData = JSON.parse(clipboardData);
			} catch(e) {
				throw new TypeError("clipboardData expected object got " + (typeof clipboardData).toString());
			}
		}
		if (typeof clipboardData !== "object")
			throw new TypeError("clipboardData expected object got " + (typeof clipboardData).toString());


		/** @type {StandardizedClipboardData} */
		let knownGoodData = {};

		if (typeof clipboardData.Text === "string")
			knownGoodData.Text = clipboardData.Text;
		if (typeof clipboardData.Image === "string")
			knownGoodData.Image = clipboardData.Image;
		if (typeof clipboardData.HTML === "string")
			knownGoodData.HTML = clipboardData.HTML;
		if (typeof clipboardData.RichText === "string")
			knownGoodData.RichText = clipboardData.RichText;

		let breakUpParts = function(data) {
			let parts = data.split(',');
			if (parts.length != 2)
				return undefined;
			data = parts[1].trimStart();
			if (typeof data !== "string")
				return undefined;


			let pattern = /^data:(.*)\/(.*);(.*)$/;
			let matches = parts[0].match(pattern);
			if (!matches)
				return undefined;

			return {
				mimeType: matches[1].toLowerCase(),
				fileExtension: matches[2].toLowerCase(),
				encoding: matches[3].toLowerCase(),
				data: data
			};
		}

		if (knownGoodData.Text != undefined) {
			let data = breakUpParts(knownGoodData.Text);
			if (data !== undefined) {
				if (data.fileExtension != "plain") { // Enforce only plain text
					if (ReduceErrors) {
						delete knownGoodData.Text;
					} else {
						throw new Error("Text data not plain text mime type.");
					}
				}
			} else
				if (ReduceErrors) {
					delete knownGoodData.Text;
				} else {
					throw new Error("Text data invalid structure.");
				}
		}

		if (knownGoodData.HTML != undefined) {
			let data = breakUpParts(knownGoodData.HTML);
			if (data !== undefined) {
				if (data.fileExtension != "html") { // Enforce only plain text
					if (ReduceErrors) {
						delete knownGoodData.HTML;
					} else {
						throw new Error("HTML data invalid mime type.");
					}
				}
			} else {
				if (ReduceErrors) {
					delete knownGoodData.HTML;
				} else {
					throw new Error("HTML data invalid structure.")
				}
			}
		}

		if (knownGoodData.RichText != undefined) {
			let data = breakUpParts(knownGoodData.RichText);
			if (data !== undefined) {
				if (data.fileExtension != "rtf") { // Enforce only plain text
					if (data.fileExtension == "richtext" || data.fileExtension == "richtextformat") { // Try to correct mimeType
						data.fileExtension = "rtf";
						knownGoodData.RichText = `data:${data.mimeType}/${data.fileExtension};${data.encoding}, ${data.data}`
					} else {
						// Invalid mime type!
						if (ReduceErrors) {
							delete knownGoodData.RichText;
						} else {
							throw new Error("RichText data invalid mime type.");
						}
					}
				}
			} else {
				if (ReduceErrors) {
					delete knownGoodData.RichText;
				} else {
					throw new Error("RichText data invalid structure.")
				}
			}
		}

		if (knownGoodData.Image != undefined) {
			let data = breakUpParts(knownGoodData.Image);
			if (data === undefined) {
				if (ReduceErrors) {
					delete knownGoodData.Image;
				} else {
					throw new Error("Image data invalid structure.")
				}
			}
		}

		// Data ready
		let platform = os.type();
		if (platform == 'Windows_NT') {
			return this.setWindowsClipboardData(knownGoodData);
		} else if (platform == "Linux" || platform == "FreeBSD") {
			if (knownGoodData.Image !== undefined) { // Image
				let imageData = breakUpParts(knownGoodData.Image);
				if (imageData.mimeType === "image") {
					knownGoodData[imageData.mimeType + "/" + imageData.fileExtension] = knownGoodData.Image;
					delete knownGoodData.Image;
				}

			} else if (knownGoodData.Text !== undefined) { // Text
				let texdData = breakUpParts(knownGoodData.Text);
				if (textData.mimeType == "text" && textData.fileExtension == "plain") {
					knownGoodData["UTF8_STRING"] = knownGoodData.Text;

					// UTF8 -> ASCII
					let ASCIIText = Buffer.from(textData.data, textData.encoding).toString('ASCII');
					let ASCIIBase64 = Buffer.from(ASCIIText, "ASCII").toString("base64");
					knownGoodData["TEXT"] = "data:" + textData.mimeType + "/" + textData.fileExtension + ";base64, " + ASCIIBase64;
				}

			} else if (knownGoodData.HTML !== undefined) { // HTML
				knownGoodData["text/html"] = knownGoodData.HTML;

			} else if (knownGoodData.RichText !== undefined) { // RichText
				knownGoodData["text/rtf"] = knownGoodData.RichText;
			}

			return this.setUnixClipboardData(knownGoodData);
		}
	}
}

module.exports = Clipboard;