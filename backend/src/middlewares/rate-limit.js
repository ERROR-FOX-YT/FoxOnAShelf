const store = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const k = typeof key === 'string' ? key : key.ip || 'unknown';
  const timestamps = (store.get(k) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= max) return true;
  timestamps.push(now);
  store.set(k, timestamps);
  return false;
}
setInterval(() => {
  const now = Date.now();
  const max = 10000;
  if (store.size > max) {
    const toDelete = [...store.keys()].slice(0, Math.floor(max * 0.5));
    for (const k of toDelete) store.delete(k);
  }
  const keysToCheck = [...store.keys()];
  for (const k of keysToCheck) {
    const ts = store.get(k);
    if (!ts) continue;
    const fresh = ts.filter(t => now - t < 60000);
    if (fresh.length) store.set(k, fresh); else store.delete(k);
  }
}, 60000).unref();
module.exports = { rateLimit };
