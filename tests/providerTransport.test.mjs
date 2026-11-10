import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);
const https = require('node:https');
const { GeminiClient } = require('../lib/geminiClient.js');
const { OpenAiCompatibleClient } = require('../lib/openAiCompatibleClient.js');
const original = https.request;
let count = 0;
try {
  for (const status of [200, 401, 403, 429, 500]) {
  for (const stream of [false, true]) {
    for (const provider of ['gemini', 'groq']) {
      const client = provider === 'gemini' ? new GeminiClient('synthetic-secret') : new OpenAiCompatibleClient('synthetic-secret', { baseUrl: 'https://api.groq.com/openai/v1' });
      https.request = (url, options, callback) => {
        assert.doesNotMatch(String(url), /synthetic-secret|[?&]key=/, 'SEC-05: key tidak masuk URL');
        assert.equal(options.headers[provider === 'gemini' ? 'x-goog-api-key' : 'Authorization'], provider === 'gemini' ? 'synthetic-secret' : 'Bearer synthetic-secret');
        const req = new EventEmitter();
        req.write = () => {};
        req.destroy = () => {};
        req.end = () => queueMicrotask(() => {
          const res = new EventEmitter();
          res.statusCode = status;
          res.headers = { 'retry-after': '12', 'x-ratelimit-remaining-requests': '940', 'x-ratelimit-remaining-tokens': '1200' };
          res.setEncoding = () => {};
          callback(res);
          const payload = provider === 'gemini'
            ? { candidates: [{ content: { parts: [{ text: 'Hasil sintetis.' }] } }] }
            : stream ? { choices: [{ delta: { content: 'Hasil sintetis.' } }] } : { choices: [{ message: { content: 'Hasil sintetis.' } }] };
          res.emit('data', status === 200 ? (stream ? `data: ${JSON.stringify(payload)}\n\n` : JSON.stringify(payload)) : 'sensitive transcript synthetic-secret');
          res.emit('end');
        });
        return req;
      };
      const request = stream ? client.streamContent('model', 'prompt', () => {}) : client.generateContent('model', 'prompt');
      if (status === 200) {
        assert.equal(await request, 'Hasil sintetis.');
        if (provider === 'groq' && !stream) assert.equal(client.quota.remainingRequests, 940);
      }
      else await assert.rejects(request, error => {
        assert.equal(error.status, status);
        assert.equal(error.retryAfter, '12');
        assert.equal(error.quota.remainingTokens, 1200);
        assert.doesNotMatch(error.message, /synthetic-secret|sensitive transcript/);
        return true;
      });
      count++;
    }
  }
  }
} finally { https.request = original; }
console.log(`SEC-04/SEC-05: ${count} skenario transport HTTP/SSE tiruan lolos`);
