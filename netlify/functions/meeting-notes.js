/**
 * Netlify Serverless Function: Notulen Rapat (Minutes of Meeting)
 */
const { correctTranscriptWithNLP } = require('../../corrector.js');
const { generateMeetingNotesWithAI } = require('../../meetingNotes.js');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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
    const { text, apiKey, model } = data;
    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Teks transkrip rapat tidak boleh kosong.' })
      };
    }

    // Bersihkan transkrip terlebih dahulu sebelum diekstraksi notulennya
    const cleanObj = correctTranscriptWithNLP(text);
    const cleanedText = cleanObj.correctedText || text;

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const notesResult = await generateMeetingNotesWithAI(cleanedText, effectiveApiKey, model);

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
