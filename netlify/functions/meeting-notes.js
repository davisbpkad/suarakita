/**
 * Netlify Serverless Function: Notulen Rapat (Minutes of Meeting)
 */
const { generateMeetingNotesWithAI } = require('../../meetingNotes.js');
const { buildCorsHeaders, headerValue, isAllowedOrigin } = require('./_cors.js');
const { validateRequest } = require('../../lib/requestValidation.js');
const { runAiAction } = require('../../lib/aiActions.js');


exports.handler = async (event) => {
  const headers = buildCorsHeaders(event, 'POST, OPTIONS');
  if (!isAllowedOrigin(event)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin tidak diizinkan.' }) };

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

    // Key hanya dari pemanggil, TIDAK dari environment server. Tanpa key,
    // generateMeetingNotesWithAI otomatis memakai mesin NLP lokal.
    const notesResult = data.ai !== undefined ? await runAiAction('notes', text, data.ai) : await generateMeetingNotesWithAI(text, apiKey, model, provider);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(notesResult)
    };
  } catch (err) {
    console.error('Netlify meeting-notes gagal.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Gagal membuat notulen rapat.' })
    };
  }
};
