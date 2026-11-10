import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);
const https = require('node:https');
const original = https.request;
const { GeminiClient } = require('../lib/geminiClient.js');
const { OpenAiCompatibleClient } = require('../lib/openAiCompatibleClient.js');
const { protectRequest, MAX_RESPONSE_BYTES } = require('../lib/transportSafety.js');
let checks = 0;
try {
  for (const Client of [GeminiClient, OpenAiCompatibleClient]) {
    const controller = new AbortController();
    let destroyed = false;
    https.request = () => {
      const req = new EventEmitter();
      req.write = () => {};
      req.end = () => queueMicrotask(() => controller.abort());
      req.destroy = error => { destroyed = true; queueMicrotask(() => req.emit('error', error)); };
      return req;
    };
    const client = new Client('synthetic', { baseUrl: 'https://example.invalid', signal: controller.signal });
    await assert.rejects(client.generateContent('model', 'data'), { name: 'AbortError' });
    assert.equal(destroyed, true);
    checks++;
  }
} finally { https.request = original; }
let rejected;
let oversizedDestroyed = false;
const response = new EventEmitter();
protectRequest({ destroy() { oversizedDestroyed = true; } }, response, undefined, error => { rejected = error; });
response.emit('data', Buffer.alloc(MAX_RESPONSE_BYTES + 1));
assert.equal(oversizedDestroyed, true);
assert.match(rejected.message, /terlalu besar/);
checks++;
console.log(`Transport abort: ${checks} provider tiruan dibatalkan dan socket dihancurkan`);
