export function quotaPercent(remaining, limit) {
  if (!Number.isSafeInteger(remaining) || remaining < 0 || !Number.isSafeInteger(limit) || limit <= 0) return null;
  return Math.min(100, Math.floor(remaining / limit * 100));
}
