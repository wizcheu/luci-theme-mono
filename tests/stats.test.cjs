'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function load(name) {
  const source = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/mono', name + '.js'), 'utf8');
  return new Function('baseclass', source)({ extend: object => object });
}
const stats = load('stats');
const dashboard = load('dashboard');
const previous = { device: 'eth1', rx: 1000, tx: 2000, time: 1000 };
const current = { device: 'eth1', rx: 6251000, tx: 627000, wan: { up: true } };

test('traffic uses byte deltas and elapsed milliseconds to report decimal Mbps', () => {
  assert.deepEqual(stats.sample(previous, current, 6000), { time: 6000, down: 10, up: 1 });
});
test('initial sample, counter reset, device change and disconnected WAN leave a gap', () => {
  for (const [before, next, time] of [
    [null, current, 6000],
    [previous, { ...current, rx: 100 }, 6000],
    [previous, { ...current, device: 'eth2' }, 6000],
    [previous, { ...current, wan: { up: false } }, 6000],
    [previous, { ...current, tx: undefined }, 6000],
    [previous, current, 1000],
    [previous, current, 500]
  ]) assert.deepEqual(stats.sample(before, next, time), { time, down: null, up: null });
});
test('dashboard uses the active default-route interface and its actual counters', () => {
  const raw = {
    interfaces: { interface: [
      { interface: 'loopback' },
      { interface: 'wan', up: false, device: 'eth1' },
      { interface: 'wwan', up: true, l3_device: 'wlan0', route: [{ target: '0.0.0.0', mask: 0 }] }
    ] },
    devices: { wlan0: { stats: { rx_bytes: 321, tx_bytes: 123 } } },
    info: { memory: { total: 100, available: 40 } },
    leases: { dhcp_leases: [{ expires: 0 }, { expires: false }, { expires: 10 }, { expires: -1 }] }
  };
  const result = dashboard.normalize(raw);
  assert.equal(result.device, 'wlan0');
  assert.equal(result.rx, 321);
  assert.equal(result.tx, 123);
  assert.equal(result.memoryUsed, 60);
  assert.equal(result.leases.length, 3);
  assert.equal(result.interfaces.length, 2);
});
test('unavailable leases are distinguishable from an empty lease list', () => {
  assert.equal(dashboard.normalize({}).leasesError, true);
  assert.equal(dashboard.normalize({ leases: { dhcp_leases: [] } }).leasesError, false);
});
