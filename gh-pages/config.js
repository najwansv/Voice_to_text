// Frontend Configuration
const CONFIG = {
  // Development - Local backend
  development: {
    API_BASE_URL: 'http://localhost:3000/api',
    MEDIA_BASE_URL: 'http://localhost:3000/media'
  },
  
  // Production - Ngrok backend
  production: {
    API_BASE_URL: 'https://your-ngrok-url.ngrok-free.app/api', // Ganti dengan ngrok URL Anda
    MEDIA_BASE_URL: 'https://your-ngrok-url.ngrok-free.app/media'
  }
};

// Auto-detect environment
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

const ENVIRONMENT = isLocalhost ? 'development' : 'production';

// Export current config
const API_CONFIG = CONFIG[ENVIRONMENT];

console.log(`Running in ${ENVIRONMENT} mode`);
console.log('API Config:', API_CONFIG);