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

/** Only parse explicit ordered duration units; unknown provider formats stay unknown. */
export function resetDeadline(value, now = Date.now()) {
  if (typeof value !== 'string' || !/^(?=\d)(?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m(?!s))?(?:\d+(?:\.\d+)?s)?(?:\d+(?:\.\d+)?ms)?$/.test(value)) return null;
  const units = { h: 3600000, m: 60000, s: 1000, ms: 1 };
  const duration = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)].reduce((sum, match) => sum + Number(match[1]) * units[match[2]], 0);
  const result = now + Math.ceil(duration);
  return Number.isSafeInteger(result) ? result : null;
}

export function countAttempts(previous, attempts = []) {
  const counts = { ...previous };
  for (const attempt of attempts) {
    if (['gemini', 'groq'].includes(attempt.provider)) counts[attempt.provider] = (counts[attempt.provider] || 0) + 1;
  }
  return counts;
}
