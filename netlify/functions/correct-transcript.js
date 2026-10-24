/**
 * Netlify Serverless Function: Koreksi Transkrip Cerdas
 */
const { correctTranscriptWithAI } = require('../../corrector.js');
const { buildCorsHeaders, headerValue } = require('./_cors.js');

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
    const { text, model, provider } = data;
    const apiKey = headerValue(event.headers, 'X-Api-Key');
    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Teks transkrip tidak boleh kosong.' })
      };
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: `Teks terlalu panjang (maks ${MAX_TEXT_LENGTH} karakter).` })
      };
    }

    // Key hanya dari pemanggil. Tanpa key, correctTranscriptWithAI otomatis
    // memakai mesin NLP lokal (gratis, offline) — perilaku yang diinginkan.
    const result = await correctTranscriptWithAI(text, apiKey, model, provider);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('Error in Netlify Function correct-transcript:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Gagal melakukan koreksi transkrip.' })
    };
  }
};
