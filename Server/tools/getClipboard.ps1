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