require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { transcribeAudio } = require('./services/transcriptionService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve uploaded files for media playback
app.use('/media', express.static('uploads'));

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Store for temporary file tracking (file ID -> file info)
const fileStore = new Map();

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.mpeg', '.mpga'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan MP3, MP4, M4A, WAV, atau WEBM.'));
    }
  }
});

// API endpoint for transcription
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const mode = req.body.mode || 'paragraph';
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const isVideo = ['.mp4', '.webm'].includes(ext);

    console.log(`Processing file: ${originalName}, Mode: ${mode}`);

    // Transcribe the audio
    const result = await transcribeAudio(filePath, mode);

    // Generate a unique file ID for media access
    const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Store file info for later cleanup
    fileStore.set(fileId, {
      path: filePath,
      fileName: fileName,
      createdAt: Date.now()
    });

    // Schedule file cleanup after 30 minutes
    setTimeout(() => {
      cleanupFile(fileId);
    }, 30 * 60 * 1000);

    res.json({
      success: true,
      mode: mode,
      transcription: result.formattedText,
      blocks: result.blocks,
      mediaUrl: `/media/${fileName}`,
      fileId: fileId,
      isVideo: isVideo,
      originalName: originalName
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up file on error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat memproses audio'
    });
  }
});

// Cleanup file endpoint
app.delete('/api/media/:fileId', (req, res) => {
  const { fileId } = req.params;
  cleanupFile(fileId);
  res.json({ success: true });
});

function cleanupFile(fileId) {
  const fileInfo = fileStore.get(fileId);
  if (fileInfo) {
    fs.unlink(fileInfo.path, (err) => {
      if (err) console.error('Error deleting file:', err);
      else console.log('Cleaned up file:', fileInfo.fileName);
    });
    fileStore.delete(fileId);
  }
}

// Cleanup old files periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [fileId, fileInfo] of fileStore.entries()) {
    if (now - fileInfo.createdAt > maxAge) {
      cleanupFile(fileId);
    }
  }
}, 60 * 60 * 1000);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
