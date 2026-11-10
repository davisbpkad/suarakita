/**
 * Netlify Serverless Function: Status & Health Check
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsonResponse, corsHeaders } = require('./_auth.js');

export default async (request) => {
  const headers = corsHeaders(request, 'GET, OPTIONS');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  return jsonResponse({
    status: 'ok',
    platform: 'Netlify Serverless Functions',
    serverAi: { groq: Boolean(process.env.GROQ_API_KEY) },
    authRequired: true,
    accounts: true,
    app: 'SuaraKita - Voice to Text, Transcript Correction & Meeting Minutes',
    time: new Date().toISOString(),
  }, 200, headers);
};
