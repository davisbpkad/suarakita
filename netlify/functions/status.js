/**
 * Netlify Serverless Function: Status & Health Check
 */
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

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
