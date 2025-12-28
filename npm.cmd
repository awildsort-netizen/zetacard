@echo off
REM Wrapper for npm commands that bypasses PowerShell execution policy issues
REM This allows npm to work from any shell without policy restrictions

setlocal enabledelayedexpansion

REM Pass all arguments to npm
npm %*

REM Preserve the exit code
exit /b %ERRORLEVEL%
