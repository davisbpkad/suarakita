import assert from 'node:assert/strict';
import corrector from '../corrector.js';
import notes from '../meetingNotes.js';

const sentences = [
  'Selamat pagi rekan-rekan semua, mari kita mulai meeting hari ini.',
  'Bagaimana progresnya Andi?',
  'Andi melaporkan integrasi API payment gateway sudah mencapai 80%.',
  'Lalu ada kendala apa di tim developer?',
  'Andi menyampaikan ada kendala latensi server staging yang sempat time out.',
  'Bagaimana dengan Rina dari tim Desain?',
  'Rina menyampaikan desain mockup versi mobile sudah selesai 100% dan sudah diserahkan ke developer.',
  'Dian dari Pemasaran melaporkan draf kampanye media sosial sudah disiapkan dengan anggaran Rp 2.500.000.',
  'Untuk keputusan akhir, Andi tolong pastikan perbaikan bug latensi server selesai besok sore.',
  'Lalu Dian siapkan draf konten promosi paling lambat H-7 sebelum peluncuran.',
  'Sekian dari saya, terima kasih atas kerjasamanya.',
];
const edited = sentences.join(' ');
assert.doesNotMatch(corrector.correctTranscriptWithNLP(edited).correctedText, /,,/, 'Salam bertanda koma tidak boleh mendapat koma ganda');
const raw = edited.replace(/(?<!\d)[.,?]|[.,?](?!\d)/g, '').replace('H-7', 'H minus 7');

for (const input of [raw, raw.toLowerCase(), edited]) {
  const corrected = corrector.correctTranscriptWithNLP(input).correctedText;
  assert.match(corrected, /hari ini\. Bagaimana progresnya andi\?/i);
  assert.match(corrected, /80%\. Lalu ada kendala apa di tim developer\? Andi/i);
  assert.match(corrected, /developer\. Dian/i);
  assert.match(corrected, /Rp 2\.500\.000/i);
  const result = notes.generateMeetingNotesWithNLP(input);
  assert.doesNotMatch(result.topic, /selamat pagi|tidak dapat ditentukan/i);
  assert.match(result.topic, /integrasi API/i);
  assert.equal(result.summaryItems.length, 3);
  for (const [name, fact] of [['Andi', '80%'], ['Rina', '100%'], ['Dian', '2.500.000']]) {
    assert.ok(result.summaryItems.some(item => item.includes(`[${name}]`) && item.includes(fact)), name);
  }
  assert.equal(result.decisions.length, 2);
  assert.match(result.decisions[0], /\[Andi\].*latensi.*besok sore/);
  assert.match(result.decisions[1], /\[Dian\].*konten promosi.*H(?:-| minus )7/i);
  assert.doesNotMatch(result.decisions.join(' '), /Rina|Sekian|100%/i);
}

assert.equal(corrector.correctTranscriptWithNLP('Anggaran Rp 2.500.000 dan rasio 2.5 sudah disetujui.').correctedText,
  'Anggaran Rp 2.500.000 dan rasio 2.5 sudah disetujui.');
assert.equal(corrector.correctTranscriptWithNLP('Rina menyampaikan bahwa Andi melaporkan progres kemarin.').correctedText,
  'Rina menyampaikan bahwa Andi melaporkan progres kemarin.');
console.log('Transkrip mentah dan bertanda baca: semua assertion lolos');
