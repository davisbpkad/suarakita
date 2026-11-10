/** Remove legacy credentials without restoring them into application state. */
export function removeLegacyKey(storage) {
  try {
    storage?.removeItem('gemini_api_key');
  } catch {
    // Storage may be disabled; credentials remain memory-only regardless.
  }
}
