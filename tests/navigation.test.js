const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('navegación pública → administrador escucha hashchange en window', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(app, /window\.addEventListener\('hashchange'/);
  assert.match(app, /href="#admin\/inicio"/);
  assert.match(app, /function loginView\(\)/);
});
