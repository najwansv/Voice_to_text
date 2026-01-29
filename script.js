// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const startBtn = document.getElementById('startBtn');
const progressSection = document.getElementById('progressSection');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const transcriptionResult = document.getElementById('transcriptionResult');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toggleRawBtn = document.getElementById('toggleRawBtn');
const modeLabel = document.getElementById('modeLabel');
const charCount = document.getElementById('charCount');
const modeCards = document.querySelectorAll('.mode-card');
const toast = document.getElementById('toast');

// Media Player Elements
const mediaPlayerSection = document.getElementById('mediaPlayerSection');
const audioPlayer = document.getElementById('audioPlayer');
const videoPlayer = document.getElementById('videoPlayer');
const mediaFileName = document.getElementById('mediaFileName');
const currentTimestamp = document.getElementById('currentTimestamp');

let selectedFile = null;
let selectedMode = 'paragraph';
let currentMediaPlayer = null;
let transcriptionBlocks = [];
let currentFileId = null;
let isRawMode = false;

// Initialize
function init() {
  setupEventListeners();
}

function setupEventListeners() {
  // Upload area click
  uploadArea.addEventListener('click', (e) => {
    if (e.target !== removeFileBtn && !removeFileBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Remove file
  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  });

  // Mode selection
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedMode = card.dataset.mode;
    });
  });

  // Start button
  startBtn.addEventListener('click', startTranscription);

  // Copy button
  copyBtn.addEventListener('click', copyToClipboard);

  // Download button
  downloadBtn.addEventListener('click', downloadResult);

  // Toggle raw text button
  toggleRawBtn.addEventListener('click', toggleRawText);

  // Media player time update
  audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
  videoPlayer.addEventListener('timeupdate', handleTimeUpdate);

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file) {
  const allowedExtensions = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.mpeg', '.mpga'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    showToast('Format file tidak didukung!', 'error');
    return;
  }

  if (file.size > 100 * 1024 * 1024) {
    showToast('Ukuran file maksimal 100MB!', 'error');
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  document.querySelector('.upload-content').style.display = 'none';
  fileInfo.style.display = 'flex';
  startBtn.disabled = false;
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  document.querySelector('.upload-content').style.display = 'block';
  fileInfo.style.display = 'none';
  startBtn.disabled = true;
}

async function startTranscription() {
  if (!selectedFile) {
    showToast('Pilih file audio terlebih dahulu!', 'error');
    return;
  }

  // Show progress
  progressSection.style.display = 'block';
  resultSection.style.display = 'none';
  startBtn.disabled = true;

  // Update progress text
  progressText.textContent = 'Mengupload file...';

  try {
    const formData = new FormData();
    formData.append('audio', selectedFile);
    formData.append('mode', selectedMode);

    progressText.textContent = 'Memproses audio dengan AI...';

    const response = await fetch(`${API_CONFIG.API_BASE_URL}/transcribe`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Terjadi kesalahan');
    }

    // Store file ID for cleanup
    currentFileId = data.fileId;

    // Setup media player
    setupMediaPlayer(data);

    // Show result
    displayResult(data);
    showToast('Transkripsi berhasil!', 'success');

  } catch (error) {
    console.error('Error:', error);
    showToast(error.message || 'Terjadi kesalahan saat memproses', 'error');
  } finally {
    progressSection.style.display = 'none';
    startBtn.disabled = false;
  }
}

function setupMediaPlayer(data) {
  const { mediaUrl, isVideo, originalName } = data;

  // Reset players
  audioPlayer.style.display = 'none';
  videoPlayer.style.display = 'none';
  audioPlayer.src = '';
  videoPlayer.src = '';

  // Construct full media URL
  const fullMediaUrl = mediaUrl.startsWith('http') ? mediaUrl : `${API_CONFIG.MEDIA_BASE_URL}${mediaUrl.replace('/media', '')}`;

  if (isVideo) {
    videoPlayer.src = fullMediaUrl;
    videoPlayer.style.display = 'block';
    currentMediaPlayer = videoPlayer;
  } else {
    audioPlayer.src = fullMediaUrl;
    audioPlayer.style.display = 'block';
    currentMediaPlayer = audioPlayer;
  }

  mediaFileName.textContent = originalName;
  currentTimestamp.textContent = '00:00';
}

function handleTimeUpdate() {
  if (!currentMediaPlayer) return;

  const time = currentMediaPlayer.currentTime;
  currentTimestamp.textContent = formatTime(time);

  // Highlight current block
  highlightCurrentBlock(time);
}

function highlightCurrentBlock(time) {
  // Handle both text-block (QnA) and inline-block (paragraph)
  const blocks = document.querySelectorAll('.text-block, .inline-block');
  
  blocks.forEach((block, index) => {
    block.classList.remove('playing');
    
    const blockTime = parseFloat(block.dataset.timestamp);
    const nextBlock = transcriptionBlocks[index + 1];
    const nextTime = nextBlock ? nextBlock.timestamp : Infinity;

    if (time >= blockTime && time < nextTime) {
      block.classList.add('playing');
      
      // Auto scroll to playing block (only for QnA mode)
      if (block.classList.contains('text-block')) {
        block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });
}

function displayResult(data) {
  const { blocks, mode } = data;
  transcriptionBlocks = blocks || [];

  // Clear previous content and reset modes
  transcriptionResult.innerHTML = '';
  transcriptionResult.className = 'transcription-blocks';
  isRawMode = false;
  toggleRawBtn.classList.remove('active');
  toggleRawBtn.querySelector('span').textContent = 'Raw Text';

  if (blocks && blocks.length > 0) {
    if (mode === 'qna') {
      // QnA mode - render as list blocks
      renderQnABlocks(blocks);
    } else {
      // Paragraph mode - render as inline flowing text
      renderParagraphBlocks(blocks);
    }

    // Add raw text content (hidden by default)
    const rawTextDiv = document.createElement('div');
    rawTextDiv.className = 'raw-text-content';
    
    if (mode === 'qna') {
      // QnA mode: show with [Q]: and [A]: markers
      rawTextDiv.textContent = blocks.map(b => {
        let text = b.text;
        if (text.startsWith('Q: ')) {
          return '[Q]: ' + text.substring(3);
        } else if (text.startsWith('A: ')) {
          return '[A]: ' + text.substring(3);
        }
        return text;
      }).join('\n\n');
    } else {
      // Paragraph mode: flowing paragraph text (sentences joined with spaces)
      const rawText = blocks.map(b => b.text).join(' ');
      rawTextDiv.textContent = rawText;
    }
    
    transcriptionResult.appendChild(rawTextDiv);
  } else {
    // Fallback to plain text
    transcriptionResult.textContent = data.transcription;
  }
  
  // Set mode label
  const modeText = mode === 'qna' ? 'Tanya Jawab' : 'Paragraf';
  modeLabel.innerHTML = `<i class="fas fa-${mode === 'qna' ? 'comments' : 'paragraph'}"></i> ${modeText}`;
  
  // Set character count
  const fullText = blocks ? blocks.map(b => b.text).join(' ') : data.transcription;
  const chars = fullText.length;
  const words = fullText.split(/\s+/).filter(w => w.length > 0).length;
  charCount.textContent = `${words} kata • ${chars} karakter`;

  resultSection.style.display = 'block';
  
  // Scroll to result
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderQnABlocks(blocks) {
  blocks.forEach((block, index) => {
    const blockEl = document.createElement('div');
    blockEl.className = `text-block ${block.type}`;
    blockEl.dataset.timestamp = block.timestamp;
    blockEl.dataset.index = index;

    const timestampEl = document.createElement('span');
    timestampEl.className = 'timestamp';
    timestampEl.textContent = formatTime(block.timestamp);

    const textEl = document.createElement('span');
    textEl.className = 'text-content';
    textEl.textContent = block.text;

    blockEl.appendChild(timestampEl);
    blockEl.appendChild(textEl);

    // Click to seek
    blockEl.addEventListener('click', () => {
      seekToTimestamp(block.timestamp);
      document.querySelectorAll('.text-block').forEach(b => b.classList.remove('active'));
      blockEl.classList.add('active');
    });

    transcriptionResult.appendChild(blockEl);
  });
}

function renderParagraphBlocks(blocks) {
  transcriptionResult.classList.add('paragraph-mode');
  
  blocks.forEach((block, index) => {
    const blockEl = document.createElement('span');
    blockEl.className = 'inline-block';
    blockEl.dataset.timestamp = block.timestamp;
    blockEl.dataset.index = index;

    const timestampEl = document.createElement('span');
    timestampEl.className = 'timestamp';
    timestampEl.textContent = `[${formatTime(block.timestamp)}]`;

    const textEl = document.createElement('span');
    textEl.className = 'text-content';
    textEl.textContent = block.text;

    blockEl.appendChild(timestampEl);
    blockEl.appendChild(textEl);

    // Click to seek
    blockEl.addEventListener('click', () => {
      seekToTimestamp(block.timestamp);
      document.querySelectorAll('.inline-block').forEach(b => b.classList.remove('active'));
      blockEl.classList.add('active');
    });

    transcriptionResult.appendChild(blockEl);
    
    // Add space between inline blocks
    transcriptionResult.appendChild(document.createTextNode(' '));
  });
}

function toggleRawText() {
  isRawMode = !isRawMode;
  
  if (isRawMode) {
    transcriptionResult.classList.add('raw-mode');
    toggleRawBtn.classList.add('active');
    toggleRawBtn.querySelector('span').textContent = 'Timestamp';
  } else {
    transcriptionResult.classList.remove('raw-mode');
    toggleRawBtn.classList.remove('active');
    toggleRawBtn.querySelector('span').textContent = 'Raw Text';
  }
}

function seekToTimestamp(timestamp) {
  if (currentMediaPlayer) {
    currentMediaPlayer.currentTime = timestamp;
    currentMediaPlayer.play();
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function copyToClipboard() {
  let text;
  
  if (transcriptionBlocks.length > 0) {
    text = transcriptionBlocks.map(block => {
      return `[${formatTime(block.timestamp)}] ${block.text}`;
    }).join('\n');
  } else {
    text = transcriptionResult.textContent;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('Teks berhasil disalin!', 'success');
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Teks berhasil disalin!', 'success');
  });
}

function downloadResult() {
  let text;
  
  if (transcriptionBlocks.length > 0) {
    text = transcriptionBlocks.map(block => {
      return `[${formatTime(block.timestamp)}] ${block.text}`;
    }).join('\n\n');
  } else {
    text = transcriptionResult.textContent;
  }

  const mode = selectedMode === 'qna' ? 'tanya-jawab' : 'paragraf';
  const filename = `transkripsi-${mode}-${Date.now()}.txt`;
  
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('File berhasil didownload!', 'success');
}

function cleanup() {
  // Cleanup media file on server when leaving page
  if (currentFileId) {
    navigator.sendBeacon(`${API_CONFIG.API_BASE_URL.replace('/api', '')}/api/media/${currentFileId}`, '');
  }
}

function showToast(message, type = '') {
  toast.textContent = message;
  toast.className = 'toast';
  if (type) toast.classList.add(type);
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Initialize app
init();
