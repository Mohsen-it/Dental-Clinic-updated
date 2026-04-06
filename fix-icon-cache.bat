@echo off
REM ==============================================
REM Fix Windows Icon Cache for DentalClinic
REM ==============================================

echo Closing explorer...
taskkill /f /im explorer.exe

echo.
echo Deleting icon cache files...
del /q /s "%localappdata%\Microsoft\Windows\Explorer\*.db"
del /q /s "%localappdata%\IconCache.db"
del /q /s "%localappdata%\Microsoft\Windows\Explorer\iconcache_*.db"

echo.
echo Restarting explorer...
start explorer.exe

echo.
echo ===========================================
echo Icon cache cleared!
echo Please delete the old DentalClinic shortcut
echo and the new one should show the correct icon.
echo ===========================================
pause
