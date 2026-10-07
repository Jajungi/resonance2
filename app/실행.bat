@echo off
chcp 65001 >nul
cd /d "%~dp0"

title 공명 스테이션
echo.
echo  공명(共鳴) 스테이션 — 실행
echo  --------------------------------
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [오류] Node.js 가 없습니다. https://nodejs.org 에서 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  패키지 설치 중...
  call npm install
  if errorlevel 1 (
    echo  [오류] npm install 실패
    pause
    exit /b 1
  )
  echo.
)

if not exist "logs\" mkdir logs

set FORCE_COLOR=1
REM API 토큰 절약: 기본은 demo/템플릿만. AI 쓰려면 set AI_DISABLED=0
if not defined AI_DISABLED set AI_DISABLED=1

echo  서버 로그는 별도 창에서 봅니다. (제목: 공명 서버 로그)
echo  파일 로그: %cd%\logs\resonance.log
echo  브라우저: Vite가 준비되면 자동으로 열립니다 (http://localhost:5173)
echo  종료: 서버 로그 창 + 이 창에서 각각 Ctrl+C
echo.

start "공명 서버 로그" cmd /k "cd /d "%~dp0" && set FORCE_COLOR=1 && set AI_DISABLED=%AI_DISABLED% && title 공명 서버 로그 && echo. && echo  === 서버 로그 (이 창을 보세요) === && echo  AI_DISABLED=%AI_DISABLED% && echo  파일: logs\resonance.log && echo. && npm run dev:server"

REM Vite first — do NOT open the browser before 5173 is listening
REM (premature open causes: WebSocket connection to ws://localhost:5173/ failed)
call npm run dev:client

pause
