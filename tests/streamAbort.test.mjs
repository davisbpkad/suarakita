import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const https = require('node:https');
const original = https.request;
const { GeminiClient } = require('../lib/geminiClient.js');
const { OpenAiCompatibleClient } = require('../lib/openAiCompatibleClient.js');

const frame = {
  gemini: 'data: {"candidates":[{"content":{"parts":[{"text":"satu"}]}}]}\n\n',
  openai: 'data: {"choices":[{"delta":{"content":"satu"}}]}\n\n',
};

for (const [name, Client] of [['gemini', GeminiClient], ['openai', OpenAiCompatibleClient]]) {
  let destroyCalls = 0;
  https.request = (url, options, onResponse) => {
    const req = new EventEmitter();
    req.destroy = error => { destroyCalls++; queueMicrotask(() => req.emit('error', error)); };
    req.write = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {};
      res.setEncoding = () => {};
      onResponse(res);
      // Potongan pertama tiba, klien membatalkan, lalu provider mencoba mengirim lagi.
      queueMicrotask(() => res.emit('data', frame[name]));
      setTimeout(() => res.emit('data', frame[name]), 300);
    };
    return req;
  };
  try {
    const controller = new AbortController();
    const client = new Client('synthetic', { baseUrl: 'https://example.invalid', signal: controller.signal });
    const deltas = [];
    await assert.rejects(
      client.streamContent('model', 'data', delta => { deltas.push(delta); controller.abort(); }),
      { name: 'AbortError' },
      `${name}: abort harus melempar AbortError`,
    );
    assert.equal(destroyCalls, 1, `${name}: socket harus dihancurkan sekali`);
    const seen = deltas.length;
    await new Promise(r => setTimeout(r, 500));
    assert.equal(deltas.length, seen, `${name}: tidak boleh ada delta setelah abort`);
  } finally {
    https.request = original;
  }
}

// AbortError tidak boleh memicu percobaan model berikutnya pada jalur legacy.
let calls = 0;
const client = new GeminiClient('synthetic', { baseUrl: 'https://example.invalid' });
client.streamContent = async () => { calls++; throw Object.assign(new Error('x'), { name: 'AbortError' }); };
await assert.rejects(client.streamWithFallback(['a', 'b'], 'data', () => {}), { name: 'AbortError' });
assert.equal(calls, 1);
console.log('Stream abort: midstream cancel destroys socket, stops deltas, no retry');
