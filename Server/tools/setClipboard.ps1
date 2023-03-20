$jsonData = ''
$data = ConvertFrom-Json $jsonData
$data = (Get-Content 'data.json' | Out-String | ConvertFrom-Json)

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
		$encoder = [System.Text.Encoding]::Default
		if ($file_extension -eq "ibm437") {
			$encoder = [System.Text.Encoding]::GetEncoding(437)
		}

		$dataObject.SetData($type.Name, $encoder.GetString($bytes))
	}
}
[System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)