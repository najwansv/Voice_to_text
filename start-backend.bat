@echo off
REM Backend Start Script untuk Windows

echo 🚀 Starting Voice to Text Backend...

REM Check if .env exists
if not exist .env (
    echo ❌ File .env tidak ditemukan!
    echo 📝 Silakan buat file .env berdasarkan .env.example
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

echo 🔧 Starting backend server...
start "Backend Server" cmd /c "npm start"

echo 🌐 Starting ngrok tunnel...
echo ⚠️  Pastikan Anda sudah setup ngrok token dengan: ngrok config add-authtoken YOUR_TOKEN

timeout /t 3 >nul

start "Ngrok Tunnel" cmd /c "ngrok http 3000"

echo ✅ Backend dan Ngrok telah dijalankan dalam window terpisah
echo 🔗 Check window ngrok untuk melihat public URL
echo 📋 Copy URL tersebut dan update config.js di frontend
echo.
pause