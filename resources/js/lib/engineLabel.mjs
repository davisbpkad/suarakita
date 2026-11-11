export function engineLabel(data) {
  if (data.engine === 'local') return 'Mesin lokal';
  const provider = { gemini: 'Gemini', groq: 'Groq' }[data.engine];
  if (provider) return provider + (data.modelUsed ? ` · ${data.modelUsed}` : '');
  return 'Menunggu hasil';
}
