#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseServicePort, getPort, readService } from './dev-utils.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isWin = process.platform === 'win32';
const children = [];
let stopping = false;
let stopPromise;

function pipe(stream, name) {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => {
        const lines = (buffer + chunk).split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) process.stdout.write(`[${name}] ${line}\n`);
    });
    stream.on('end', () => {
        if (buffer) process.stdout.write(`[${name}] ${buffer}\n`);
    });
}

function start(name, command, args, cwd, env) {
    console.log(`[${name}] запускается: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
        cwd, env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWin && /\.(cmd|bat)$/i.test(command),
        // On Unix each process tree gets a group, so npm's Vite child is stopped too.
        detached: !isWin
    });
    children.push(child);
    pipe(child.stdout, name);
    pipe(child.stderr, name);
    child.on('error', error => {
        console.error(`[${name}] не удалось запустить: ${error.message}. Проверьте Node.js и .NET SDK в PATH.`);
        void shutdown(1);
    });
    child.on('exit', (code, signal) => {
        if (!stopping) {
            console.error(`[${name}] завершился: ${signal || code}`);
            void shutdown(code || 1);
        }
    });
    return child;
}

function killTree(child, signal) {
    if (!child.pid) return;
    if (isWin) {
        return new Promise(resolve => {
            const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
            killer.once('error', resolve);
            killer.once('exit', resolve);
        });
    }
    try { process.kill(-child.pid, signal); } catch { /* Already stopped. */ }
}

function shutdown(code = 0) {
    if (stopPromise) return stopPromise;
    stopping = true;
    process.exitCode = code;
    stopPromise = (async () => {
        const closed = children.map(child => new Promise(resolve => {
            if (child.exitCode !== null || child.signalCode !== null) resolve();
            else child.once('close', resolve);
        }));
        await Promise.all(children.map(child => killTree(child, 'SIGTERM')));
        let timeout;
        await Promise.race([
            Promise.all(closed),
            new Promise(resolve => { timeout = setTimeout(resolve, 5000); })
        ]);
        clearTimeout(timeout);
        await Promise.all(children.map(child => killTree(child, 'SIGKILL')));
    })();
    return stopPromise;
}

process.on('SIGINT', () => { void shutdown(0); });
process.on('SIGTERM', () => { void shutdown(0); });

async function waitFor(check, name) {
    const deadline = Date.now() + 120_000;
    while (!stopping && Date.now() < deadline) {
        if (await check()) return true;
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    if (!stopping) console.error(`[!] ${name} не готов за 120 с. Проверьте вывод выше и подключение к SQL Server.`);
    return false;
}

async function main() {
    const preferredApi = getPort(process.env.DEV_API_PORT, 5084);
    const preferredWeb = getPort(process.env.DEV_SERVER_PORT, 61000);
    const { port: apiPort, existing: existingApi } = await chooseServicePort(preferredApi, {
        service: 'VolunteerSystem.Api', pathname: '/api/dev/status'
    });
    const apiTarget = `http://localhost:${apiPort}`;
    const useHttps = process.env.DEV_HTTPS === '1';
    const scheme = useHttps ? 'https' : 'http';
    const { port: webPort, existing: reuseWeb } = await chooseServicePort(preferredWeb, {
        service: 'VolunteerSystem.Web', pathname: '/__volunteersystem/dev', scheme,
        excluded: [apiPort], accept: info => info.apiTarget === apiTarget
    });
    const webUrl = `${scheme}://localhost:${webPort}`;
    if (apiPort !== preferredApi) console.log(`[API] Порт ${preferredApi} занят; выбран ${apiPort}.`);
    if (webPort !== preferredWeb) console.log(`[WEB] Порт ${preferredWeb} занят; выбран ${webPort}.`);
    if (stopping) return;

    if (existingApi) console.log(`[API] Уже запущен на ${apiTarget}.`);
    else start('API', 'dotnet', ['run', '--project', path.join(root, 'VolunteerSystem.Server'),
        '--no-launch-profile', '--urls', apiTarget], root, { ASPNETCORE_ENVIRONMENT: 'Development' });

    if (reuseWeb) console.log(`[WEB] Уже запущен на ${webUrl}.`);
    else start('WEB', isWin ? 'npm.cmd' : 'npm', ['run', 'dev:web'], path.join(root, 'volunteersystem.client'), {
        DEV_API_TARGET: apiTarget, DEV_SERVER_PORT: String(webPort)
    });

    const ready = await Promise.all([
        waitFor(() => readService(`${apiTarget}/api/dev/status`, 'VolunteerSystem.Api'), 'API'),
        waitFor(async () => {
            const info = await readService(`${webUrl}/__volunteersystem/dev`, 'VolunteerSystem.Web');
            return info?.apiTarget === apiTarget;
        }, 'Фронтенд')
    ]);
    if (stopping) return;
    if (ready.every(Boolean)) {
        console.log(`\nПроект запущен\nПриложение: ${webUrl}\nAPI: ${apiTarget}\nSwagger: ${apiTarget}/swagger\nОстановить — Ctrl+C\n`);
    } else await shutdown(1);
}

main().catch(async error => {
    console.error(`[!] ${error.message}`);
    await shutdown(1);
});
