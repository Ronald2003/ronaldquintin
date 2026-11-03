import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const art = readFileSync(new URL('./vector-art.svg', import.meta.url), 'utf8');
const ids = source => [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids(html)).size, ids(html).length, 'HTML IDs must be unique');
assert.equal(new Set(ids(art)).size, ids(art).length, 'SVG IDs must be unique');

for (const [, target] of html.matchAll(/(?:href|src)="([^"\s]+)"/g)) {
  if (/^(https?:|mailto:|tel:|data:)/.test(target)) continue;
  const [file, fragment] = target.split('#');
  if (file) assert.ok(existsSync(new URL(file, import.meta.url)), `Missing asset: ${file}`);
  if (fragment) {
    const source = file ? readFileSync(new URL(file, import.meta.url), 'utf8') : html;
    assert.ok(ids(source).includes(fragment), `Missing target: ${target}`);
  }
}

const projects = [...html.matchAll(/<article\b[^>]*data-category="(\w+)"/g)];
assert.equal(projects.length, 6);
assert.equal(projects.filter(match => match[1] === 'web').length, 4);
assert.equal(projects.filter(match => match[1] === 'mobile').length, 1);
assert.equal(projects.filter(match => match[1] === 'hardware').length, 1);
assert.equal((html.match(/>Solo project<\/span>/g) || []).length, 5);
assert.equal((html.match(/>Team project<\/span>/g) || []).length, 1);
assert.ok(html.includes('href="https://ucnmarkethub.shop/"'));
assert.ok(!html.includes('ucnmarkethub.netlify.app'));
for (const technology of ['React', 'Tailwind CSS', 'Node.js', 'Express', 'Neon PostgreSQL', 'JWT', 'PayMongo API']) {
  assert.ok(html.includes(`<li>${technology}</li>`), `Missing Market Hub technology: ${technology}`);
}
for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(script);
new Function(readFileSync(new URL('./script.js', import.meta.url), 'utf8'));
console.log('Verified local assets, SVG references, anchors, six project categories, roles, Market Hub link/stack, and script syntax.');
