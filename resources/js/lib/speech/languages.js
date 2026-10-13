/** Bahasa yang didukung mesin STT. Tambah entri di sini untuk menambah pilihan. */
export const LANGUAGES = [
  { code: 'id-ID', flag: '🇮🇩', shortCode: 'ID', name: 'Bahasa Indonesia' },
  { code: 'en-US', flag: '🇺🇸', shortCode: 'EN', name: 'English (US)' },
  { code: 'ja-JP', flag: '🇯🇵', shortCode: 'JA', name: '日本語' },
  { code: 'ar-SA', flag: '🇸🇦', shortCode: 'AR', name: 'العربية' },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0].code;

export function findLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
