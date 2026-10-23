import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { chooseServicePort, getPort, isPortBusy, readService } from '../scripts/dev-utils.mjs';

async function listen(t, handler) {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    return server.address().port;
}

test('invalid port configuration is rejected before spawning processes', () => {
    assert.equal(getPort(undefined, 61000), 61000);
    assert.equal(getPort('62000', 61000), 62000);
    for (const port of ['abc', '61000oops', '0', '-1', '65536', '12.5']) {
        assert.throws(() => getPort(port, 61000));
    }
});

test('occupied and excluded ports are skipped without stopping their owner', async t => {
    const port = await listen(t, (_req, res) => res.end('another application'));
    assert.equal(await isPortBusy(port), true);
    const selected = await chooseServicePort(port, {
        service: 'VolunteerSystem.Api', pathname: '/api/dev/status', excluded: [port + 1]
    });
    assert.ok(selected.port > port + 1);
    assert.equal(selected.existing, false);
    assert.equal(await isPortBusy(port), true);
});

test('an arbitrary healthy HTTP server is not identified as VolunteerSystem', async t => {
    const port = await listen(t, (_req, res) => res.end('Healthy'));
    assert.equal(await readService(`http://127.0.0.1:${port}`, 'VolunteerSystem.Api'), null);
});

test('service identity is checked, not just the open port', async t => {
    const port = await listen(t, (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ service: 'VolunteerSystem.Web', apiTarget: 'http://localhost:5084' }));
    });
    const url = `http://127.0.0.1:${port}`;
    assert.equal(await readService(url, 'VolunteerSystem.Api'), null);
    assert.equal((await readService(url, 'VolunteerSystem.Web')).apiTarget, 'http://localhost:5084');
});
