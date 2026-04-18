@echo off
echo Starting College Event Hub Servers...

start cmd /k "cd backend && venv\Scripts\activate && python app.py"
start cmd /k "cd frontend && npm run dev"

echo Servers are starting in new windows.

            