@echo off
robocopy node_modules\node-notifier\vendor deploy\win32\build\NeptuneServer\vendor /E /NFL /NDL /NJH /NJS /nc /ns /np

rem Copies the icons
mkdir deploy\win32\build\NeptuneServer\Resources
copy Resources\* deploy\win32\build\NeptuneServer\Resources\*

rem Open the build directory
explorer "%cd%\deploy\win32\build\NeptuneServer"

call tools\editbin.exe /subsystem:console deploy\win32\build\NeptuneServer\qode.exe

Rem Create launch script
echo start qode.exe ./dist/index.js>"deploy\win32\build\NeptuneServer\Start Neptune.bat"