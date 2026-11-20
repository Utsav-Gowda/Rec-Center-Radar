const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');

// No database connection or writes: verify the browser's preflight contract.
const originalOrigin = process.env.CLIENT_ORIGIN;
process.env.CLIENT_ORIGIN = 'http://localhost:5173, https://utsav-gowda.github.io';
const app = require('../server');
if (originalOrigin === undefined) delete process.env.CLIENT_ORIGIN;
else process.env.CLIENT_ORIGIN = originalOrigin;

let server;
let origin;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('allows configured Pages and local origins to preflight demo registration', async () => {
  for (const clientOrigin of ['https://utsav-gowda.github.io', 'http://localhost:5173']) {
    const response = await fetch(`${origin}/api/equipment`, {
      method: 'OPTIONS',
      headers: {
        Origin: clientOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-demo-role',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), clientOrigin);
    assert.match(response.headers.get('access-control-allow-methods'), /POST/);
    assert.equal(response.headers.get('access-control-allow-headers'), 'content-type,x-demo-role');
  }
});

test('does not grant browser access to an unconfigured origin', async () => {
  const response = await fetch(`${origin}/api/health`, { headers: { Origin: 'https://other.example.com' } });
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
