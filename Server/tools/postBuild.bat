@echo off
robocopy node_modules\node-notifier\vendor deploy\win32\build\NeptuneServer\vendor /E /NFL /NDL /NJH /NJS /nc /ns /np

rem Copies the icons
mkdir deploy\win32\build\NeptuneServer\Resources
copy Resources\* deploy\win32\build\NeptuneServer\Resources\*

call tools\editbin.exe /subsystem:console deploy\win32\build\NeptuneServer\qode.exe

Rem Create launch script
echo start qode.exe ./dist/index.js>"deploy\win32\build\NeptuneServer\Start Neptune.bat"


timeout /t 3 /NOBREAK
mkdir "deploy\win32\build\Neptune\data"
robocopy /move /e "deploy\win32\build\NeptuneServer" "deploy\win32\build\Neptune\data">nul
robocopy /move /e "deploy\win32\build\Neptune\data" "deploy\win32\build\NeptuneServer\Neptune">nul
del "deploy\win32\build\Neptune\" /Q
copy "NeptuneRunner\build\*" "deploy\win32\build\NeptuneServer\"

rem Open the build directory
explorer "%cd%\deploy\win32\build\NeptuneServer"