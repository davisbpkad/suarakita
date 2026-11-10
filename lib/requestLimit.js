/** Local-process guard only; serverless global quotas require platform controls. */
function createRequestLimit({ maxRequests = 30, maxActive = 2, windowMs = 60000, now = Date.now } = {}) {
  let start = now();
  let requests = 0;
  let active = 0;
  return function acquire() {
    const time = now();
    if (time - start >= windowMs) { start = time; requests = 0; }
    if (requests >= maxRequests || active >= maxActive) return null;
    requests++;
    active++;
    let released = false;
    return () => { if (!released) { active--; released = true; } };
  };
}
module.exports = { createRequestLimit };
