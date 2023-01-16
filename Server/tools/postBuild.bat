
mkdir deploy\win32\build\NeptuneServer\node_modules\node-notifier\vendor
robocopy node_modules\node-notifier\vendor deploy\win32\build\NeptuneServer\vendor /E /NFL /NDL /NJH /NJS /nc /ns /np

rem Copies the icons
mkdir deploy\win32\build\NeptuneServer\Resources
copy Resources\* deploy\win32\build\NeptuneServer\Resources\*

rem Open the build directory
explorer "%cd%\deploy\win32\build\NeptuneServer"

editbin /subsystem:console deploy\win32\build\NeptuneServer\qode.exe