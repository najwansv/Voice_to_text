require('dotenv').config();
const multer = require('multer');
const { transcribeAudio } = require('../services/transcriptionService');

// Configure multer for memory storage (Vercel serverless)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for Vercel
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.mpeg', '.mpga'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan MP3, MP4, M4A, WAV, atau WEBM.'));
    }
  }
});

// Helper function to handle multer
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        // Handle specific multer errors
        if (result.code === 'LIMIT_FILE_SIZE') {
          return reject(new Error('File terlalu besar! Maksimal 5MB untuk Vercel.'));
        }
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API transcribe called');
  console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);

  try {
    // Run multer middleware
    await runMiddleware(req, res, upload.single('audio'));

    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const mode = req.body.mode || 'paragraph';
    const originalName = req.file.originalname;
    const ext = '.' + originalName.split('.').pop().toLowerCase();
    const isVideo = ['.mp4', '.webm'].includes(ext);

    console.log(`Processing file: ${originalName}, Size: ${req.file.size}, Mode: ${mode}`);

    // Create a temporary file path for processing
    const tmpPath = `/tmp/${Date.now()}-${originalName}`;
    const fs = require('fs');
    
    // Write buffer to temporary file
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      // Transcribe the audio
      console.log('Starting transcription...');
      const result = await transcribeAudio(tmpPath, mode);
      console.log('Transcription completed');

      // Convert file buffer to base64 for inline audio data (for small files)
      const audioData = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const dataURL = `data:${mimeType};base64,${audioData}`;

      // Clean up temp file
      fs.unlinkSync(tmpPath);

      res.json({
        success: true,
        mode: mode,
        transcription: result.formattedText,
        blocks: result.blocks,
        mediaUrl: dataURL, // Use data URL instead of file path
        fileId: Date.now().toString(), // Still provide an ID but not used for cleanup
        isVideo: isVideo,
        originalName: originalName
      });

    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);
      // Clean up temp file on error
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
      throw transcriptionError;
    }

  } catch (error) {
    console.error('API error:', error);
    
    res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat memproses audio'
    });
  }
}

// Configure for larger payloads
export const config = {
  api: {
    bodyParser: false,
  },
};