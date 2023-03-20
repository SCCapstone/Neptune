# Clipboard data
Each OS has their own way of handling and storing clipboard data, but they do share a few similarities.\
We have functions to pull data from each OS.

All clipboard formats are  encoded as either base64 or hex, with the encoding specified in the data.\
All clipboard formats are expressed as string value like: `data:<mimeType>;<encoding>, <data>`
`mimeType`: Mime type of the data\
`<encoding>`: How the data is encoded (base64, hex)\
`<data>`: Actual format data


This gives us data that's all over the place, so there's also a function `getStandardizedClipboardData()` that returns data that is universal and shared between each OS (Server and Client).
Here's what data we deemed "standard":
```json5
{
	"Image": "data:image/bmp;base64, Qk2aAAAAAAAAADYAAAAoAAAABQAAAAUAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==", // Image data
	"HTML": "data:text/html;base64, ~~snipped~~", // HTML formatting data
	"Text": "data:text/plain;base64, TgBlAHAAdAB1AG4AZQA=", // Plain text
	"RichText": "data:text/rtf;base64, ~~snipped~~" // Rich text data
}
```
`Image` contains an image, with the mime type revealing which type of image. We prioritize PNGs, however, bitmaps, jpegs, CF_DIB, and any format with image/* will be used.\
`HTML` contains HTML formatting, you get this when copying data from Chrome or Word.\
`Text` bog-standard text. We prioritize UTF8/Unicode.\
`RichText`: rich text formatting data. Copying things from `write.exe`, for example.


---

# Server:
NodeGUI (Qt) has methods for grabbing clipboard data, but only for text and images.\
We use platform specific methods first for retrieving clipboard data. If those fail, we fall back to Qt.



## Windows Behavior
On Windows, we utilize PowerShell running in a new process to extract and set the clipboard data. The PowerShell script returns JSON and expects JSON for getting/setting.\
Using PowerShell allows the use of .NET, which is able to interact with clipboard data.

### Standard text
Standardized will always return the text data.\
Windows function returns all data.
<img src="https://user-images.githubusercontent.com/55852895/226264759-5bb2b257-ebb2-4502-b413-b44c77aa09d6.png" width="850"/>


### Rich text
Standardized will retain the RTF and plain text data.\
Windows function returns most data (drops CF_METAFILEPICT, CF_ENHMETAFILE, and Embed Source).
<img src="https://user-images.githubusercontent.com/55852895/226267091-24e8ebf6-a550-4da5-871a-d4200439e947.png" width="850"/>


### Images (with RTF):
Standardized will retain RTF and HTML data if present as well as the image data.
Windows retains most data, but again drops the same data as rich text (CF_METAFILEPICT, CF_ENHMETAFILE, and Embed Source).
<img src="https://user-images.githubusercontent.com/55852895/226266874-272cdf46-b518-4797-92f4-08ea7bdaf109.png" width="850"/>



### Files (Explorer)
Standardized will always return the file name.\
Windows function returns most data.
<img src="https://user-images.githubusercontent.com/55852895/226262385-baa74906-eca2-4a1d-813f-c627f3e0c154.png" width="850"/>


## Linux Behavior



---

# Client: