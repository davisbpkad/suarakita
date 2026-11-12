import assert from 'node:assert/strict';
import { MicMonitor } from '../resources/js/lib/audio/MicMonitor.js';
import { SpeechRecognizer } from '../resources/js/lib/speech/SpeechRecognizer.js';

let captures = 0;
for (const userAgent of ['Android', 'iPhone', 'iPad', 'Macintosh', 'Windows NT 10.0 Chrome']) {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    userAgent, maxTouchPoints: userAgent === 'Macintosh' ? 5 : 1,
    mediaDevices: { getUserMedia: async () => { captures++; throw new Error('unexpected capture'); } },
  } });
  await new MicMonitor().start();
}
assert.equal(captures, 0, 'Meters must not open a second microphone stream');

const engines = [];
globalThis.window = { SpeechRecognition: class {
  constructor() { engines.push(this); }
  start() {}
  stop() {}
} };
const finals = [];
const events = [];
const recognizer = new SpeechRecognizer({ isMobile: false, language: 'id-ID',
  onFinal: (...args) => finals.push(args), onEvent: event => events.push(event),
});
const originalNow = Date.now;
try {
  Date.now = () => 1000;
  await recognizer.start();
  const result = text => ({ resultIndex: 0, results: [{ 0: { transcript: text }, isFinal: true }] });
  engines[0].onresult(result('satu'));
  Date.now = () => 3500;
  engines[0].onresult(result('dua'));
  assert.equal(finals[1][1], 2500, 'Final gap must use previous final timestamp');
  assert.ok(events.some(event => event.type === 'result'), 'Diagnostics must report results without transcript text');
  recognizer.stop();
  await recognizer.start();
  engines[0].onresult(result('stale'));
  assert.equal(finals.length, 2, 'Old sessions must not change the transcript');
  recognizer.stop();
} finally {
  Date.now = originalNow;
}
console.log('PASS mobile capture, final gap, diagnostics, stale session guards (mock engines only)');
