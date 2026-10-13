/**
 * Netlify Serverless Function: Notulen Rapat (Minutes of Meeting)
 */
const { correctTranscriptWithNLP } = require('../../corrector.js');
const { generateMeetingNotesWithAI } = require('../../meetingNotes.js');
const { buildCorsHeaders } = require('./_cors.js');

/** Batas panjang teks masuk, supaya satu request tidak memicu kerja tak terbatas. */
const MAX_TEXT_LENGTH = 50000;

exports.handler = async (event) => {
  const headers = buildCorsHeaders(event, 'POST, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { text, apiKey, model, provider } = data;
    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Teks transkrip rapat tidak boleh kosong.' })
      };
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: `Teks terlalu panjang (maks ${MAX_TEXT_LENGTH} karakter).` })
      };
    }

    // Bersihkan transkrip terlebih dahulu sebelum diekstraksi notulennya
    const cleanObj = correctTranscriptWithNLP(text);
    const cleanedText = cleanObj.correctedText || text;

    // Key hanya dari pemanggil, TIDAK dari environment server. Tanpa key,
    // generateMeetingNotesWithAI otomatis memakai mesin NLP lokal.
    const notesResult = await generateMeetingNotesWithAI(cleanedText, apiKey, model, provider);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(notesResult)
    };
  } catch (err) {
    console.error('Error in Netlify Function meeting-notes:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Gagal membuat notulen rapat.' })
    };
  }
};
