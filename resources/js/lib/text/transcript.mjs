/**
 * Fungsi transkrip murni (tanpa state) untuk menggabungkan hasil Web Speech API.
 * Dipisah dari komponen supaya bisa dites mandiri.
 */

/** Pangkas kata yang berulang 3x+ berturut-turut (akibat echo/stutter mic) jadi maksimal 2x. */
export function collapseExcessiveRepetitions(text) {
  if (!text) return '';
  return text.replace(/\b([a-zA-ZÀ-ÿ0-9]{2,})(?:\s+\1){2,}\b/gi, '$1 $1');
}

/**
 * Gabungkan transkrip baru ke teks lama tanpa menduplikasi kata di batas sambungan.
 *
 * @param {string} currentText  teks transkrip yang sudah ada
 * @param {string} newAddition  potongan final baru dari engine STT
 * @param {number} sinceLastFinalMs  jeda sejak frasa final sebelumnya (ms)
 */
export function appendTranscriptCleanly(currentText, newAddition, sinceLastFinalMs = 0) {
  let addition = collapseExcessiveRepetitions((newAddition || '').trim());
  if (!addition) return currentText || '';
  if (!currentText || !currentText.trim()) return addition;

  const current = currentText.trim();
  const currentWords = current.split(/\s+/);
  const newWords = addition.split(/\s+/);

  // Cari tumpang tindih maksimal (maks 6 kata) antara ujung teks lama dan awal teks baru.
  let overlap = 0;
  const maxCheck = Math.min(currentWords.length, newWords.length, 6);
  for (let len = maxCheck; len >= 1; len--) {
    const tail = currentWords.slice(-len).join(' ').toLowerCase();
    const head = newWords.slice(0, len).join(' ').toLowerCase();
    if (tail === head) {
      overlap = len;
      break;
    }
  }

  const remaining = newWords.slice(overlap);
  if (remaining.length === 0) {
    // Overlap multi-kata atau jeda sangat singkat = buffer ulang, buang.
    // Satu kata setelah jeda normal = pembicara memang sengaja mengulang.
    if (overlap >= 2 || sinceLastFinalMs < 400) return current;
    return `${current} ${addition}`;
  }

  return `${current} ${remaining.join(' ')}`;
}
