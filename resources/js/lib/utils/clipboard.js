/** Salin teks ke clipboard. Kembalikan false kalau gagal/tidak didukung. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.warn('Copy failed:', e);
    return false;
  }
}
