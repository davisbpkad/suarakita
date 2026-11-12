import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../resources/js/' + name, import.meta.url), 'utf8');
for (const name of ['CorrectionModal', 'MeetingNotesModal']) {
  const source = read('components/' + name + '.vue');
  assert.ok(!/\p{Extended_Pictographic}/u.test(source), `${name} must use line SVG, not emoji`);
  assert.ok(source.includes('aria-label="Tutup'), `${name} close button needs an accessible name`);
}
assert.ok(read('App.vue').includes('hero-highlight'), 'Hero needs a non-fragmenting highlight');
console.log('PASS modal line-icon and hero layout source guards');
