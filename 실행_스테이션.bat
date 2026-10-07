@echo off
chcp 65001 >nul
cd /d "%~dp0app"
if not exist "실행.bat" (
  echo app\실행.bat 을 찾을 수 없습니다.
  pause
  exit /b 1
)
call "실행.bat"
