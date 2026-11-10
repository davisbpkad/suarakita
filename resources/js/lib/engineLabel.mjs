export function engineLabel(data) {
  if (data.engine === 'local') return 'Mesin lokal';
  const provider = { gemini: 'Gemini', groq: 'Groq' }[data.engine];
  if (provider) return provider + (data.modelUsed ? ` · ${data.modelUsed}` : '');
  return 'Menunggu hasil';
}

export function fallbackLabel(data) {
  const reasons = { rate_limited: 'batas penggunaan tercapai', access_denied: 'akses ditolak', unavailable: 'tidak tersedia atau respons tidak valid' };
  return (data.attempts || []).filter(item => reasons[item.outcome]).map(item => `${item.provider === 'gemini' ? 'Gemini' : 'Groq'}: ${reasons[item.outcome]}`).join('; ');
}
