const express = require('express');
const path = require('path');
const { correctTranscriptWithNLP, correctTranscriptWithAI } = require('./corrector.js');
const { generateMeetingNotesWithNLP, generateMeetingNotesWithAI } = require('./meetingNotes.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check / API status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SuaraKita - Voice to Text, Transcript Correction & Meeting Minutes',
    time: new Date().toISOString()
  });
});

// Endpoint Koreksi Transkrip (Transcript Correction)
app.post('/api/correct-transcript', async (req, res) => {
  try {
    const { text, apiKey, model } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Teks transkrip tidak boleh kosong.' });
    }

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const result = await correctTranscriptWithAI(text, effectiveApiKey, model);
    res.json(result);
  } catch (err) {
    console.error('Error correcting transcript:', err);
    res.status(500).json({ error: 'Gagal melakukan koreksi transkrip.' });
  }
});

// Endpoint Notulen Rapat (Minutes of Meeting / MoM)
app.post(['/api/meeting-notes', '/api/generate-meeting-notes'], async (req, res) => {
  try {
    const { text, apiKey, model } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Teks transkrip rapat tidak boleh kosong.' });
    }

    // Bersihkan transkrip terlebih dahulu sebelum diekstraksi notulennya
    const cleanObj = correctTranscriptWithNLP(text);
    const cleanedText = cleanObj.correctedText || text;

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const notesResult = await generateMeetingNotesWithAI(cleanedText, effectiveApiKey, model);
    res.json(notesResult);
  } catch (err) {
    console.error('Error generating meeting notes:', err);
    res.status(500).json({ error: 'Gagal membuat notulen rapat.' });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Server SuaraKita aktif di http://localhost:${PORT}`);
});
