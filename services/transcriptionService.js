const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Transcribe audio file using Groq Whisper (FREE)
 * @param {string} filePath - Path to the audio file
 * @param {string} mode - 'paragraph' or 'qna' (question and answer)
 * @returns {Promise<object>} - Transcribed text with timestamps
 */
async function transcribeAudio(filePath, mode) {
  try {
    // Step 1: Transcribe with Whisper via Groq with word-level timestamps
    console.log('Starting transcription with Groq Whisper...');
    
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3',
      language: 'id', // Indonesian
      response_format: 'verbose_json',
      timestamp_granularities: ['segment', 'word']
    });

    const segments = transcription.segments || [];
    const rawText = transcription.text;
    console.log('Raw transcription completed with timestamps');

    // Step 2: Format based on mode using Groq LLM
    const formattedResult = await formatTranscriptionWithTimestamps(rawText, segments, mode);
    
    return formattedResult;

  } catch (error) {
    console.error('Transcription service error:', error);
    throw new Error(`Gagal melakukan transkripsi: ${error.message}`);
  }
}

/**
 * Format transcription based on mode using LLM while preserving timestamps
 * @param {string} rawText - Raw transcribed text
 * @param {Array} segments - Segments with timestamps from Whisper
 * @param {string} mode - 'paragraph' or 'qna'
 * @returns {Promise<object>} - Formatted text with timestamps
 */
async function formatTranscriptionWithTimestamps(rawText, segments, mode) {
  let systemPrompt;
  
  if (mode === 'qna') {
    systemPrompt = `Kamu adalah asisten yang ahli dalam memformat transkrip wawancara.
    
Tugas kamu adalah mengubah transkrip mentah menjadi format Tanya Jawab (Q&A) yang rapi.

PENTING: Kamu akan menerima transkrip dengan timestamp dalam format [MM:SS]. 
Pertahankan timestamp di awal setiap Q: dan A: berdasarkan waktu ketika kalimat tersebut dimulai.

Aturan:
1. Identifikasi pertanyaan dari pewawancara dan jawaban dari narasumber
2. Format setiap pertanyaan dengan timestamp dan "Q:" contoh: [00:15] Q: pertanyaan
3. Format setiap jawaban dengan timestamp dan "A:" contoh: [00:30] A: jawaban
4. Gunakan timestamp dari segment yang paling dekat dengan awal kalimat tersebut
5. Perbaiki tanda baca dan kapitalisasi
6. Jaga isi tetap sama, hanya format yang diubah
7. Pisahkan setiap pasangan Q&A dengan baris kosong

Contoh output:
[00:05] Q: Apa motivasi Anda memulai bisnis ini?

[00:12] A: Motivasi saya berawal dari pengalaman pribadi ketika saya kesulitan menemukan produk berkualitas.

[01:30] Q: Bagaimana strategi Anda?

[01:45] A: Kami fokus pada kualitas produk.`;

  } else {
    systemPrompt = `Kamu adalah asisten yang ahli dalam memformat transkrip audio menjadi paragraf yang rapi.

PENTING: Kamu akan menerima transkrip dengan timestamp dalam format [MM:SS].
Setiap kalimat harus memiliki timestamp di awalnya.

Tugas kamu adalah mengubah transkrip mentah menjadi kalimat-kalimat terpisah yang terstruktur.

Aturan:
1. Pisahkan setiap kalimat menjadi baris terpisah
2. Setiap kalimat HARUS dimulai dengan timestamp [MM:SS] dari segment aslinya
3. Perbaiki tanda baca dan kapitalisasi
4. Hilangkan kata-kata pengisi yang berlebihan (um, eh, anu) tapi jaga makna asli
5. Satu baris = satu kalimat lengkap dengan timestamp
6. Jangan gabungkan beberapa kalimat dalam satu baris

Contoh output:
[00:00] Selamat pagi semuanya.
[00:03] Hari ini kita akan membahas tentang teknologi.
[00:08] Pertama-tama mari kita lihat perkembangannya.
[00:15] Teknologi telah berkembang sangat pesat dalam dekade terakhir.`;
  }

  // Create text with timestamps for LLM
  const textWithTimestamps = segments.map(seg => {
    const minutes = Math.floor(seg.start / 60);
    const seconds = Math.floor(seg.start % 60);
    const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
    return `${timestamp} ${seg.text}`;
  }).join('\n');

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Berikut adalah transkrip dengan timestamp yang perlu diformat:\n\n${textWithTimestamps}` }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const formattedText = completion.choices[0].message.content;
    
    // Parse the formatted text to extract timestamps and text
    const blocks = parseFormattedText(formattedText, mode);

    return {
      rawText: rawText,
      formattedText: formattedText,
      blocks: blocks,
      segments: segments
    };

  } catch (error) {
    console.error('Formatting error:', error);
    // Return raw segments if formatting fails
    const blocks = segments.map(seg => ({
      timestamp: seg.start,
      text: seg.text,
      type: 'sentence'
    }));
    
    return {
      rawText: rawText,
      formattedText: rawText,
      blocks: blocks,
      segments: segments
    };
  }
}

/**
 * Parse formatted text to extract timestamp blocks
 * @param {string} formattedText - Text with [MM:SS] timestamps
 * @param {string} mode - 'paragraph' or 'qna'
 * @returns {Array} - Array of blocks with timestamp and text
 */
function parseFormattedText(formattedText, mode) {
  const blocks = [];
  const lines = formattedText.split('\n').filter(line => line.trim());
  
  const timestampRegex = /^\[(\d{2}):(\d{2})\]\s*(.+)$/;
  
  for (const line of lines) {
    const match = line.match(timestampRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const timestamp = minutes * 60 + seconds;
      const text = match[3].trim();
      
      let type = 'sentence';
      if (mode === 'qna') {
        if (text.startsWith('Q:')) {
          type = 'question';
        } else if (text.startsWith('A:')) {
          type = 'answer';
        }
      }
      
      blocks.push({
        timestamp: timestamp,
        text: text,
        type: type
      });
    }
  }
  
  return blocks;
}

module.exports = { transcribeAudio };
