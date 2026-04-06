@echo off
echo Stopping all Electron processes...
taskkill /f /im electron.exe 2>nul
taskkill /f /im "DentalClinic - agorracode.exe" 2>nul

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Removing dist-electron directory...
rd /s /q "dist-electron" 2>nul

echo Removing dist directory...
rd /s /q "dist" 2>nul

echo Cleanup completed!
pause