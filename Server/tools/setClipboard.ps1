$jsonData = '{}'
$data = ConvertFrom-Json $jsonData
$data = (Get-Content 'data.json' | Out-String | ConvertFrom-Json)

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