@echo off
cd /d "%~dp0"
echo Starting Guest English app...
echo.
"D:\Program Files\nodejs\node.exe" server.cjs
if errorlevel 1 (
  echo.
  echo Could not start with D:\Program Files\nodejs\node.exe
  echo Trying node from PATH...
  node server.cjs
)
pause
