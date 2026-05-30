@echo off
SETLOCAL EnableDelayedExpansion

:: 1. Request Admin Privileges Automatically
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :init
) else (
    goto :UACPrompt
)

:UACPrompt
    echo Requesting administrative privileges to install Node.js...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %*", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:init
cd /d "%~dp0"

:: 2. Download and Install Node.js
echo Checking if Node.js is already installed...
node -v >nul 2>&1
if %errorLevel% == 0 (
    echo Node.js is already installed. Checking for updates...
)

echo Downloading the latest Node.js LTS installer...
:: Uses PowerShell to download the official Windows x64 MSI installer
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile '%temp%\node_install.msi'"

echo Installing Node.js (this may take a minute)...
msiexec /i "%temp%\node_install.msi" /qn /norestart
del "%temp%\node_install.msi"

:: Refresh environment variables so 'npm' works immediately without a reboot
for /f "tokens=2*" %%A in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v Path') do set "syspath=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path') do set "usrpath=%%B"
set "PATH=%syspath%;%usrpath%"

echo.
echo ==========================================
echo Setup complete! You can now use start.bat
echo ==========================================
pause
