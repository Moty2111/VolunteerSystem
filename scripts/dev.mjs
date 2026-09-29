#!/usr/bin/env node
/**
 * Единый запуск проекта: backend (ASP.NET Core) + frontend (Vite).
 *
 *   npm run dev          — поднять оба процесса
 *   Ctrl+C              — остановить оба
 *
 * Каждому процессу — свой префикс в выводе, плюс проверка готовности:
 * скрипт дожидается, пока API и фронтенд реально начнут слушать порты,
 * и только потом печатает адрес приложения.
 */

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverDir = path.join(root, 'VolunteerSystem.Server');
const clientDir = path.join(root, 'volunteersystem.client');

const API_PORT = 5084;
const WEB_PORT = parseInt(process.env.DEV_SERVER_PORT || '61000', 10);

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const ESC = '\u001b';
const paint = (code, text) => (useColor ? `${ESC}[${code}m${text}${ESC}[0m` : text);
const label = (tag, color) => paint(color, `[${tag}]`);

const BOLD = '1';
const CYAN = '36';
const MAGENTA = '35';
const YELLOW = '33';
const RED = '31';
const GREEN = '32';
const DIM = '2';

/* ---------- проксирование вывода с префиксом ---------- */
function pipeWithPrefix(stream, tag, color) {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            process.stdout.write(`${label(tag, color)} ${line}\n`);
        }
    });
    stream.on('end', () => {
        if (buffer.trim()) process.stdout.write(`${label(tag, color)} ${buffer}\n`);
    });
}

function pipeError(stream, tag, color) {
    pipeWithPrefix(stream, tag, color);
}

/* ---------- проверка, что порт слушается ---------- */
function canConnect(port, host = '127.0.0.1', timeout = 600) {
    return new Promise(resolve => {
        const socket = net.connect({ port, host });
        const finish = value => { socket.destroy(); resolve(value); };
        socket.setTimeout(timeout);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

async function waitForPort(port, name, timeoutMs = 120_000) {
    const started = Date.now();
    const hosts = ['127.0.0.1', '::1'];

    while (Date.now() - started < timeoutMs) {
        for (const host of hosts) {
            if (await canConnect(port, host)) {
                process.stdout.write(`${label('•', GREEN)} ${name} готов (порт ${port})\n`);
                return true;
            }
        }
        if (children.some(c => c.exited)) return false;
        await new Promise(r => setTimeout(r, 400));
    }
    return false;
}

/* ---------- запуск дочерних процессов ---------- */
const children = [];
let shuttingDown = false;

function start(name, color, command, args, cwd) {
    process.stdout.write(`${label(name, color)} запускается: ${command} ${args.join(' ')}\n`);

    /* На Windows npm — это npm.cmd, а Node не запускает .cmd без оболочки
       (spawn EINVAL). Для .cmd используем shell, для .exe — напрямую. */
    const needsShell = isWin && /\.(cmd|bat)$/i.test(command);

    let child;
    try {
        child = spawn(command, args, {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: needsShell,
            // Vite и dotnet любят собственный вывод в терминал
            env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? '1' }
        });
    } catch (err) {
        process.stdout.write(`${label(name, RED)} не удалось запустить: ${err.message}\n`);
        shutdown(1);
        return null;
    }

    pipeWithPrefix(child.stdout, name, color);
    pipeError(child.stderr, name, color);

    child.exited = false;
    child.on('exit', code => {
        child.exited = true;
        if (!shuttingDown) {
            process.stdout.write(
                `${label(name, RED)} завершился с кодом ${code ?? '—'}\n`
            );
            shutdown(code ?? 1);
        }
    });

    child.on('error', err => {
        process.stdout.write(`${label(name, RED)} не запустился: ${err.message}\n`);
        if (err.code === 'ENOENT') {
            process.stdout.write(
                `${label('!', YELLOW)} Проверьте, что в системе есть ` +
                `${isWin ? 'node.js и .NET SDK' : 'node.js и .NET SDK'} (PATH).\n`
            );
        }
        shutdown(1);
    });

    children.push(child);
    return child;
}

function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const child of children) {
        if (!child.exited) {
            try { child.kill(); } catch { /* уже мёртв */ }
        }
    }
    process.exit(code);
}

process.on('SIGINT', () => {
    process.stdout.write('\n');
    shutdown(0);
});
process.on('SIGTERM', () => shutdown(0));

/* ---------- старт ---------- */
process.stdout.write(
    `${paint(BOLD, 'VolunteerSystem')} — запуск проекта\n` +
    `${label('•', DIM)} сервер: ${serverDir}\n` +
    `${label('•', DIM)} клиент: ${clientDir}\n\n`
);

/* Повторный запуск не должен падать: если порт уже занят, просто сообщаем
   об этом и не плодим вторые экземпляры процессов. */
const apiBusy = await canConnect(API_PORT, '127.0.0.1') || await canConnect(API_PORT, '::1');

if (apiBusy) {
    process.stdout.write(
        `${label('•', YELLOW)} Порт ${API_PORT} уже занят — считаем, что сервер уже запущен.\n` +
        `${label('•', DIM)} Если это не так, закройте лишний процесс и запустите снова.\n\n`
    );
} else {
    start('API', CYAN, 'dotnet', ['run', '--project', serverDir, '--launch-profile', 'http'], root);
}

start('WEB', MAGENTA, npmCmd, ['run', 'dev:web'], clientDir);

const apiReady = await waitForPort(API_PORT, 'API');
const webReady = await waitForPort(WEB_PORT, 'Фронтенд');

if (apiReady && webReady) {
    process.stdout.write(
        `\n${paint(GREEN, '  Проект запущен')}\n` +
        `  ${paint(DIM, 'Приложение:')} https://localhost:${WEB_PORT}\n` +
        `  ${paint(DIM, 'API:')}          http://localhost:${API_PORT}\n` +
        `  ${paint(DIM, 'Swagger:')}      http://localhost:${API_PORT}/swagger\n` +
        `  ${paint(DIM, 'Health:')}       http://localhost:${API_PORT}/api/health\n\n` +
        `${paint(DIM, '  Остановить — Ctrl+C')}\n\n`
    );
} else if (!webReady) {
    process.stdout.write(
        `${label('!', YELLOW)} Фронтенд не поднялся на порту ${WEB_PORT}. ` +
        `Проверьте вывод команды [WEB] выше.\n`
    );
} else {
    process.stdout.write(
        `${label('!', YELLOW)} API не поднялся на порту ${API_PORT}. ` +
        `Проверьте вывод команды [API] выше.\n`
    );
}
