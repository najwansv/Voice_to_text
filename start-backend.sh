#!/bin/bash

# Backend Start Script untuk Linux Server

echo "🚀 Starting Voice to Text Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ File .env tidak ditemukan!"
    echo "📝 Silakan buat file .env berdasarkan .env.example"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting backend server..."
npm start &
BACKEND_PID=$!

echo "🌐 Starting ngrok tunnel..."
echo "⚠️  Pastikan Anda sudah setup ngrok token dengan: ngrok config add-authtoken YOUR_TOKEN"

# Start ngrok
ngrok http 3000 &
NGROK_PID=$!

echo "✅ Backend started with PID: $BACKEND_PID"
echo "✅ Ngrok started with PID: $NGROK_PID"
echo ""
echo "🔗 Ngrok URL akan muncul di terminal ngrok"
echo "📋 Copy URL tersebut dan update config.js di frontend"
echo ""
echo "⏹️  Untuk stop services, gunakan:"
echo "   kill $BACKEND_PID $NGROK_PID"

# Keep script running
wait