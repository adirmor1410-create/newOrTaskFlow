@echo off
cd /d "%~dp0"
echo Starting TaskBoard. Keep this window open while using the app.
echo Open http://127.0.0.1:5173/ in your browser.
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
echo.
echo TaskBoard stopped. Check any error above.
pause
