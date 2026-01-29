# Voice to Text AI - Frontend

Frontend untuk aplikasi Voice to Text AI yang akan dideploy ke GitHub Pages.

## Setup Deployment

### 1. Backend (Server Linux + Ngrok)

1. Upload semua file backend ke server Linux Anda
2. Install dependencies:
   ```bash
   npm install
   ```

3. Buat file `.env`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3000
   NODE_ENV=production
   ```

4. Install ngrok:
   ```bash
   # Download ngrok
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   
   # Auth dengan token Anda
   ngrok config add-authtoken YOUR_NGROK_TOKEN
   ```

5. Jalankan backend:
   ```bash
   # Terminal 1 - Backend
   npm start
   
   # Terminal 2 - Ngrok
   ngrok http 3000
   ```

6. Copy URL ngrok yang muncul (contoh: `https://abc123.ngrok-free.app`)

### 2. Frontend (GitHub Pages)

1. Fork atau copy folder `public/` ke repository GitHub baru
2. Update file `config.js`:
   ```javascript
   // Ganti URL ngrok di bagian production
   production: {
     API_BASE_URL: 'https://your-ngrok-url.ngrok-free.app/api',
     MEDIA_BASE_URL: 'https://your-ngrok-url.ngrok-free.app/media'
   }
   ```

3. Update `server.js` CORS origin dengan GitHub Pages URL Anda:
   ```javascript
   origin: [
     'http://localhost:3000',
     'https://yourusername.github.io', // Ganti dengan URL GitHub Pages Anda
     // ...
   ]
   ```

4. Aktifkan GitHub Pages di repository settings
5. Pilih source: Deploy from a branch → main → / (root)

## Struktur File untuk GitHub Pages

```
/
├── index.html
├── style.css
├── script.js
├── config.js
└── README.md
```

## Testing

1. Test backend: `https://your-ngrok-url.ngrok-free.app/api/health`
2. Test frontend: `https://yourusername.github.io/repository-name`

## Notes

- Ngrok URL berubah setiap restart (gratis), jadi perlu update config.js
- Untuk production serius, gunakan domain tetap atau ngrok paid plan
- Backend harus selalu running agar frontend bisa akses API