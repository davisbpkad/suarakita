/**
 * Matematika level audio murni (tanpa DOM) supaya bisa dites mandiri.
 */

/** RMS di bawah ini dianggap sinyal terlalu lemah untuk engine STT. */
export const QUIET_RMS = 0.02;

/**
 * Byte time-domain dari AnalyserNode (0-255, tengah 128) -> RMS ternormalisasi 0..1.
 * @param {Uint8Array} byteData
 */
export function rmsLevel(byteData) {
  if (!byteData || byteData.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < byteData.length; i++) {
    const v = (byteData[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / byteData.length);
}

export function isQuiet(rms) {
  return rms < QUIET_RMS;
}
