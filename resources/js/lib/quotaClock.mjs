export function retryDeadline(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (/^\d+$/.test(value)) {
    const result = now + Number(value) * 1000;
    return Number.isSafeInteger(result) ? result : null;
  }
  if (!/^[A-Za-z]{3},/.test(value)) return null;
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : null;
}

export function countdown(deadline, now = Date.now()) {
  if (deadline === null || deadline === undefined) return null;
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function countAttempts(previous, attempts = []) {
  const counts = { ...previous };
  for (const attempt of attempts) {
    if (['gemini', 'groq'].includes(attempt.provider)) counts[attempt.provider] = (counts[attempt.provider] || 0) + 1;
  }
  return counts;
}
