/**
 * Netlify Serverless Function: Status & Health Check
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsonResponse, corsHeaders, sessionOf } = require('./_auth.js');

export default async (request) => {
  const headers = corsHeaders(request, 'GET, OPTIONS');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const session = sessionOf(request);

  return jsonResponse({
    status: 'ok',
    platform: 'Netlify Serverless Functions',
    serverAi: { groq: Boolean(process.env.GROQ_API_KEY) },
    authRequired: true,
    accounts: true,
    session: session ? { username: session.username, role: session.role } : null,
    app: 'SuaraKita - Voice to Text, Transcript Correction & Meeting Minutes',
    time: new Date().toISOString(),
  }, 200, headers);
};
