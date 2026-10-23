import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, copyFile, chmod, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPortBusy, readService } from '../scripts/dev-utils.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitUntil(check, description) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (await check()) return;
        await delay(50);
    }
    throw new Error(`Timed out: ${description}`);
}

async function occupy(t) {
    const server = http.createServer((_req, res) => res.end('foreign application'));
    server.listen(0, 'localhost');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    return server.address().port;
}

function launch(t, env) {
    const child = spawn(process.execPath, ['scripts/dev.mjs'], {
        cwd: root, env: { ...process.env, ...env, DEV_HTTPS: '0' }, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    const done = once(child, 'close');
    t.after(async () => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
    });
    return { child, done, output: () => output };
}

test('launcher skips foreign ports, proxies to the selected API, reuses the stack, and stops Vite descendants', {
    skip: process.platform === 'win32' ? 'POSIX process-group regression; Windows uses taskkill' : false,
    timeout: 25000
}, async t => {
    const bin = await mkdtemp(path.join(os.tmpdir(), 'volunteersystem-dev-'));
    t.after(() => rm(bin, { recursive: true, force: true }));
    const dotnet = path.join(bin, 'dotnet');
    await copyFile(path.join(root, 'tests/fixtures/dev-api.mjs'), dotnet);
    await chmod(dotnet, 0o755);
    const apiPort = await occupy(t);
    const webPort = await occupy(t);
    const env = {
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        DEV_API_PORT: String(apiPort), DEV_SERVER_PORT: String(webPort)
    };
    const first = launch(t, env);
    await waitUntil(() => {
        if (first.child.exitCode !== null) throw new Error(first.output());
        return first.output().includes('Проект запущен');
    }, 'stack startup');
    const actualApi = first.output().match(/^API: (http:\/\/localhost:(\d+))/m);
    const actualWeb = first.output().match(/^Приложение: (http:\/\/localhost:(\d+))/m);
    assert.ok(actualApi, first.output());
    assert.ok(actualWeb, first.output());
    assert.notEqual(Number(actualApi[2]), apiPort);
    assert.notEqual(Number(actualWeb[2]), webPort);
    assert.equal(await isPortBusy(apiPort), true, 'foreign API-port owner was left running');
    assert.equal(await isPortBusy(webPort), true, 'foreign web-port owner was left running');
    assert.equal((await readService(`${actualWeb[1]}/__volunteersystem/dev`, 'VolunteerSystem.Web')).apiTarget, actualApi[1]);
    assert.ok(await readService(`${actualWeb[1]}/api/dev/status`, 'VolunteerSystem.Api'), 'Vite proxies to the new API port');

    const second = launch(t, env);
    await waitUntil(() => second.child.exitCode !== null, 'repeated launcher exits');
    const [code] = await second.done;
    assert.equal(code, 0, second.output());
    assert.ok(second.output().includes('[API] Уже запущен'));
    assert.ok(second.output().includes('[WEB] Уже запущен'));
    assert.equal(await isPortBusy(Number(actualWeb[2])), true, 'repeated launcher does not stop the original stack');

    first.child.kill('SIGTERM');
    await first.done;
    await waitUntil(async () => !await isPortBusy(Number(actualApi[2])) && !await isPortBusy(Number(actualWeb[2])), 'all owned ports released');
    assert.equal(first.child.exitCode, 0, first.output());
});
