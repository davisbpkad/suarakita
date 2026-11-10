const MAX_RESPONSE_BYTES = 1000000;

function protectRequest(req, res, signal, reject) {
  const abort = () => {
    const error = new Error('Permintaan dibatalkan.');
    error.name = 'AbortError';
    req.destroy(error);
    reject(error);
  };
  if (signal) {
    signal.addEventListener('abort', abort, { once: true });
    req.once('close', () => signal.removeEventListener('abort', abort));
    if (signal.aborted) abort();
  }
  if (res) {
    let bytes = 0;
    res.on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_RESPONSE_BYTES) {
        const error = new Error('Respons provider terlalu besar.');
        req.destroy(error);
        reject(error);
      }
    });
    res.on('error', () => reject(new Error('Koneksi provider gagal.')));
    res.on('aborted', () => reject(new Error('Respons provider terputus.')));
  }
}

module.exports = { protectRequest, MAX_RESPONSE_BYTES };
