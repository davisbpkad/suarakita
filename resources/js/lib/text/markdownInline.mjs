/**
 * Render markup inline terbatas untuk butir notulen — aman terhadap HTML mentah.
 *
 * KENAPA INI PENTING: hasilnya dipasang lewat `v-html`. Sumber teksnya adalah
 * transkrip, yang bisa ditempel dari mana saja. Tanpa escape, tag HTML apa pun
 * di dalam transkrip akan ikut tereksekusi, dan skrip tersebut bisa membaca
 * API key di localStorage.
 *
 * Hanya dua penanda yang didukung: `[LABEL]` (badge) dan `**tebal**`.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Ubah karakter HTML jadi entitas supaya tidak bisa jadi tag. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const BADGE_CLASS = 'inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-yolk)]/30 font-bold text-[var(--color-ink)] text-xs mr-1.5';
const BOLD_CLASS = 'font-bold text-[var(--color-ink)]';

export function formatMarkdownInline(value) {
  if (!value) return '';
  // Escape DULU, baru tambahkan markup sendiri — urutan ini tidak boleh dibalik.
  let clean = escapeHtml(String(value).replace(/^\s*[\*\-]\s+/, ''));
  clean = clean.replace(/\[(.*?)\]/g, `<span class="${BADGE_CLASS}">[$1]</span>`);
  clean = clean.replace(/\*\*(.*?)\*\*/g, `<strong class="${BOLD_CLASS}">$1</strong>`);
  return clean;
}
