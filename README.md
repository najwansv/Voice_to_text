# Voice to Text AI - Vercel Deployment

## Environment Setup

Before deploying to Vercel, you need to set up environment variables:

### Required Environment Variables:
- `GROQ_API_KEY`: Your Groq API key for Whisper transcription

### Vercel Deployment Steps:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Set environment variables in Vercel:
```bash
vercel env add GROQ_API_KEY
```
Enter your Groq API key when prompted.

4. Deploy to Vercel:
```bash
vercel --prod
```

### Key Changes for Vercel:
- Uses serverless functions in `/api` directory
- File uploads are handled in memory (no persistent storage)
- Media files are converted to data URLs for playback
- Automatic CORS handling for API routes

### Limitations on Vercel:
- File size limit: 5MB (Vercel function payload limit)
- Processing time limit: 60 seconds per function
- No persistent file storage (files are processed in memory)

### Local Development:
```bash
npm run dev
```

### Features:
- Audio/Video transcription using Groq Whisper
- Indonesian language support
- Two modes: Paragraph and Q&A formatting
- Real-time media playback with timestamp navigation
- Copy and download transcription results