const https = require('https');

/**
 * POST yang membaca balasan Server-Sent Events baris per baris.
 * `onEvent` dipanggil dengan objek hasil parse tiap baris `data: ...`.
 * Baris `data: [DONE]` dan potongan yang belum lengkap diabaikan.
 */
function postSse(url, { body = '', timeout = 20000, headers = {} } = {}, onEvent) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body, 'utf8');

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
      if (res.statusCode !== 200) {
        let err = '';
        res.on('data', (c) => { err += c; });
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${err.slice(0, 300)}`)));
        return;
      }

      let buffer = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
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

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { postSse };
