const https = require('https');
const { providerError } = require('./providerError.js');
const { protectRequest } = require('./transportSafety.js');

/**
 * POST yang membaca balasan Server-Sent Events baris per baris.
 * `onEvent` dipanggil dengan objek hasil parse tiap baris `data: ...`.
 * Baris `data: [DONE]` dan potongan yang belum lengkap diabaikan.
 */
function postSse(url, { body = '', timeout = 20000, headers = {}, signal } = {}, onEvent) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body, 'utf8');
    // Data yang sudah ada di buffer socket tidak boleh diteruskan setelah abort.
    let stopped = false;
    if (signal) signal.addEventListener('abort', () => { stopped = true; }, { once: true });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        Accept: 'text/event-stream',
        ...headers,
      },
      timeout,
    }, (res) => {
      protectRequest(req, res, undefined, reject);
      if (res.statusCode !== 200) {
        res.on('data', () => {});
        res.on('error', () => reject(new Error('Koneksi provider gagal.')));
        res.on('end', () => reject(providerError(res.statusCode, res.headers)));
        return;
      }

      let buffer = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        if (stopped) return;
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            onEvent(JSON.parse(data));
          } catch (e) {
            // potongan JSON belum lengkap; baris berikutnya menyusul
          }
        }
      });
      res.on('end', resolve);
      res.on('error', reject);
    });

    req.on('error', error => reject(error.name === 'AbortError' ? error : new Error('Koneksi provider gagal.')));
    protectRequest(req, null, signal, reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { postSse };
