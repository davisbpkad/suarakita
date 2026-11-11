/**
 * Balasan Server-Sent Events untuk tugas AI panjang di Netlify Functions.
 * Heartbeat tiap 10 detik mencegah koneksi ditutup sebelum model selesai;
 * klien sudah memahami frame `delta`/`result`/`error` (lihat lib/api/client.js).
 */
function sseResponse(headers, work, errorMessage) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = payload => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      const heartbeat = setInterval(() => {
        try { send({ ping: true }); } catch { /* koneksi sudah ditutup klien */ }
      }, 10000);
      try {
        send({ result: await work() });
      } catch {
        send({ error: errorMessage });
      } finally {
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* sudah tertutup */ }
      }
    },
  });
  return new Response(body, {
    status: 200,
    headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}

module.exports = { sseResponse };
