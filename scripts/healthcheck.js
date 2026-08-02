#!/usr/bin/env node
/**
 * FoxOnAShelf™ - healthcheck.js
 * Verifica /api/health, /api/books y /api/auth/login (con admin de prueba).
 * Salida: exit 0 si todo OK, exit 1 si algo falla.
 *
 * Uso:
 *   node scripts/healthcheck.js
 *   PORT=4000 node scripts/healthcheck.js
 */
const http = require('http');

const HOST = process.env.HEALTH_HOST || 'localhost';
const PORT = parseInt(process.env.PORT || '4000', 10);

function request(method, path, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      host: HOST, port: PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(chunks); } catch {}
        resolve({ status: res.statusCode, body: json, raw: chunks });
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const checks = [];
  checks.push(['health',
    await request('GET', '/api/health')]);
  checks.push(['books listing',
    await request('GET', '/api/books')]);
  checks.push(['login admin@foxonashelf.app',
    await request('POST', '/api/auth/login',
      { email: 'admin@foxonashelf.app', password: 'admin123' })]);

  let ok = true;
  for (const [name, r] of checks) {
    if (r.status >= 200 && r.status < 300) {
      console.log('OK  ', name, '-> HTTP', r.status);
    } else {
      console.log('FAIL', name, '-> HTTP', r.status, r.error || (r.body && r.body.error) || '');
      ok = false;
    }
  }
  process.exit(ok ? 0 : 1);
})();
