/**
 * Netlify Serverless Function: Koreksi Transkrip Cerdas
 */
const { correctTranscriptWithAI } = require('../../corrector.js');

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
    const { text, apiKey } = data;
    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Teks transkrip tidak boleh kosong.' })
      };
    }

    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const result = await correctTranscriptWithAI(text, effectiveApiKey);

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
