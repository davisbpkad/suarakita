/**
 * Netlify Serverless Function: Koreksi Transkrip Cerdas
 */
const { correctTranscriptWithAI } = require('../../corrector.js');
const { buildCorsHeaders, headerValue } = require('./_cors.js');
const { validateRequest } = require('../../lib/requestValidation.js');
const { runAiAction } = require('../../lib/aiActions.js');


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
    let data;
    try { data = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON tidak valid.' }) }; }
    const invalid = validateRequest(data);
    if (invalid) return { statusCode: invalid.status, headers, body: JSON.stringify({ error: invalid.error }) };
    const { text, model, provider } = data;
    const apiKey = headerValue(event.headers, 'X-Api-Key');

    // Key hanya dari pemanggil. Tanpa key, correctTranscriptWithAI otomatis
    // memakai mesin NLP lokal (gratis, offline) — perilaku yang diinginkan.
    const result = data.ai !== undefined ? await runAiAction('correction', text, data.ai) : await correctTranscriptWithAI(text, apiKey, model, provider);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error('Netlify correct-transcript gagal.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Gagal melakukan koreksi transkrip.' })
    };
  }
};
