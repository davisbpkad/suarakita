/**
 * Netlify Serverless Function: Status & Health Check
 */
const { buildCorsHeaders } = require('./_cors.js');

exports.handler = async (event) => {
  const headers = buildCorsHeaders(event, 'GET, OPTIONS');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'ok',
      platform: 'Netlify Serverless Functions',
      app: 'SuaraKita - Voice to Text, Transcript Correction & Meeting Minutes',
      time: new Date().toISOString()
    })
  };
};
