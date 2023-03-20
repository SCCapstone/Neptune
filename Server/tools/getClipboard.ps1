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
				$encoder = [System.Text.Encoding]::Unicode
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