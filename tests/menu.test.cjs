'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../htdocs/luci-static/resources/menu-mono.js'), 'utf8');

test('an upgrade replaces both the persisted menu and an already loaded in-memory tree', async () => {
 const stale = { children: { aeris: {} } };
 const fresh = { children: { mono: {} } };
 const values = new Map([['menu', stale], ['mono-menu-version', 'old']]);
 const session = { getLocalData: key => values.get(key), setLocalData: (key, value) => values.set(key, value) };
 let requests = 0;
 const ui = { menu: {
  menu: stale,
  flushCache() { values.delete('menu'); },
  load() {
   this.menu ??= session.getLocalData('menu');
   if (!this.menu) { requests++; this.menu = fresh; values.set('menu', fresh); }
   return Promise.resolve(this.menu);
  }
 }};
 const menu = new Function('baseclass', 'ui', 'session', 'L', source)({ extend: value => value }, ui, session, { env: { resource_version: 'new' } });
 let rendered;
 menu.render = tree => { rendered = tree; };
 await menu.__init__();
 assert.equal(rendered, fresh);
 assert.equal(values.get('mono-menu-version'), 'new');
 assert.equal(requests, 1);
 await menu.__init__();
 assert.equal(requests, 1, 'unchanged package versions should keep the cache');
});
