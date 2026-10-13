/**
 * Format keluaran bertanda untuk jawaban LLM.
 *
 * Alasan memakai tag, bukan JSON:
 *  1. Bisa di-stream dan dibaca bertahap tanpa parser stateful.
 *  2. Tidak rapuh terhadap model yang membungkus jawaban dengan ```json.
 *
 * Bentuk:
 *   <<<TEXT>>>
 *   teks koreksi
 *   <<<CHANGES>>>
 *   - perubahan pertama
 *
 * Modul ini murni (tanpa DOM/Node API) supaya dipakai server dan browser.
 */

const TAG_RE = /<<<\s*([A-Z_]+)\s*>>>/g;

/** Buang bungkus markdown ``` yang kadang ditambahkan model. */
function stripFences(text) {
  return text
    .replace(/^\s*```[a-zA-Z]*\s*\n/, '')
    .replace(/\n?```\s*$/, '');
}

/**
 * Pecah keluaran bertanda menjadi objek field.
 * @returns {Record<string, string>}
 */
export function parseTagged(raw) {
  const text = stripFences(String(raw || '').replace(/\r\n/g, '\n'));
  const marks = [];
  TAG_RE.lastIndex = 0;
  let match;
  while ((match = TAG_RE.exec(text)) !== null) {
    marks.push({ name: match[1], tagStart: match.index, contentStart: TAG_RE.lastIndex });
  }

  const fields = {};
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].tagStart : text.length;
    fields[marks[i].name] = text.slice(marks[i].contentStart, end).trim();
  }
  return fields;
}

/** Rakit kembali objek field menjadi format bertanda. */
export function toTagged(pairs) {
  return Object.entries(pairs)
    .map(([name, value]) => `<<<${name}>>>\n${Array.isArray(value) ? value.join('\n') : (value ?? '')}`)
    .join('\n');
}

/** Pecah blok teks menjadi daftar butir (buang penanda bullet). */
export function toBulletList(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.replace(/^\s*[*-]\s+/, '').trim())
    .filter(Boolean);
}
