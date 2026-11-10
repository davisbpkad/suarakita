import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { correctTranscriptStream } = require('../corrector.js');
const { generateMeetingNotesStream } = require('../meetingNotes.js');
for (const run of [correctTranscriptStream, generateMeetingNotesStream]) {
  await assert.rejects(run('Rapat selesai.', { signal: AbortSignal.abort() }, () => {}), { name: 'AbortError' });
}
for (const path of ['geminiClient', 'openAiCompatibleClient']) {
  const exports = require(`../lib/${path}.js`);
  const Client = Object.values(exports)[0];
  const client = new Client('synthetic', { baseUrl: 'https://example.invalid' });
  let calls = 0;
  client.streamContent = async () => { calls++; throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); };
  await assert.rejects(client.streamWithFallback(['one', 'two'], 'data', () => {}), { name: 'AbortError' });
  assert.equal(calls, 1);
}
console.log('Legacy abort: cancellation propagated without fallback/retry');
