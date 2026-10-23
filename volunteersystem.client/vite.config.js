import { fileURLToPath, URL } from 'node:url';
import net from 'node:net';

import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { env, exit } from 'process';

const baseFolder =
    env.APPDATA !== undefined && env.APPDATA !== ''
        ? `${env.APPDATA}/ASP.NET/https`
        : `${env.HOME}/.aspnet/https`;

const certificateName = "volunteersystem.client";
const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
}

/* dotnet dev-certs не должен Hang'ать процесс Vite.
   stdio: 'ignore' + timeout: если CLI вдруг запросит ввод (а в неинтерактивном
   запуске из SpaProxy/IDE ввода нет) — команда просто завершится по таймауту,
   а не заблокирует запуск до бесконечности (это давало ERR_TIMED_OUT в Chrome). */
const devCert = (...args) => child_process.spawnSync('dotnet', ['dev-certs', 'https', ...args], {
    stdio: 'ignore',
    timeout: 15000,
    killSignal: 'SIGKILL'
});

/* Порт уже занят? Проверяем обе петли: Vite по умолчанию слушает только ::1,
   поэтому проверка одного 127.0.0.1 даёт ложный «свободен». */
function canConnect(host, port) {
    return new Promise(resolve => {
        const socket = net.connect({ port, host });
        const finish = value => { socket.destroy(); resolve(value); };
        socket.setTimeout(800);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

async function isPortBusy(port) {
    const hosts = ['127.0.0.1', '::1', 'localhost'];
    for (const host of hosts) {
        if (await canConnect(host, port)) return true;
    }
    return false;
}

const devPort = parseInt(env.DEV_SERVER_PORT || '61000');

// ВАЖНО: target — адрес вашего API (HTTP, профиль http)
const target = 'http://localhost:5084';

/* Прокси для /api делаем плагином: configureServer — это хук плагина,
   а не опция server (в опциях server он молча игнорируется).
   Свой middleware, а не встроенный прокси Vite, потому что встроенный
   отвечал 502 мимо нашего обработчика, а нужен понятный 503 и ожидание
   подъёма сервера (инициализация БД занимает несколько секунд). */
function apiProxyPlugin(target) {
    /* Сервер поднимается ~20 с (схема и данные БД), поэтому окно ожидания
       большое: страница дожидается сервера вместо ошибки на экране. */
    const MAX_RETRIES = 30;
    const RETRY_DELAY = 900;

    return {
        name: 'vs-api-proxy',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (!req.url || !req.url.startsWith('/api')) return next();

                const targetUrl = target + req.url;

                /* Заголовки берём только строковые: HTTP/2 добавляет псевдозаголовки
                   (:method, :path), а часть значений приходит не-строкой —
                   undici (fetch в Node) такие значения не принимает. */
                const headers = {};
                for (const [key, value] of Object.entries(req.headers)) {
                    if (key.startsWith(':')) continue;
                    if (typeof value === 'string') headers[key] = value;
                    else if (Array.isArray(value)) headers[key] = value.join(', ');
                }
                delete headers.host;
                delete headers['accept-encoding'];
                delete headers.connection;
                /* undici (fetch в Node) не умеет expect: 100-continue —
                   его присылают некоторые клиенты (.NET), и запрос падает */
                delete headers.expect;

                let body;
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                    const chunks = [];
                    for await (const chunk of req) chunks.push(chunk);
                    body = Buffer.concat(chunks);
                    /* тело теперь известной длины — chunked-кодировку убираем,
                       иначе сервер ждёт продолжения и запрос зависает */
                    delete headers['transfer-encoding'];
                    headers['content-length'] = String(body.length);
                }

                /* если пользователь ушёл со страницы — запрос отменяем,
                   иначе Chrome показывает «ERR_CONNECTION_CLOSED» */
                const controller = new AbortController();
                req.on('aborted', () => controller.abort());
                res.on('close', () => { if (!res.writableEnded) controller.abort(); });

                for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        const upstream = await fetch(targetUrl, {
                            method: req.method,
                            headers,
                            body,
                            redirect: 'manual',
                            signal: controller.signal
                        });

                        const payload = Buffer.from(await upstream.arrayBuffer());
                        const skip = new Set(['content-encoding', 'transfer-encoding', 'connection', 'content-length']);
                        upstream.headers.forEach((value, key) => {
                            if (!skip.has(key.toLowerCase())) res.setHeader(key, value);
                        });
                        res.statusCode = upstream.status;
                        res.end(payload);
                        return;
                    } catch (err) {
                        /* клиент ушёл — дальше пересылать нечего */
                        if (err?.name === 'AbortError') return;

                        /* сервер ещё поднимается — пробуем ещё раз */
                        if (attempt < MAX_RETRIES) {
                            await new Promise(r => setTimeout(r, RETRY_DELAY));
                            continue;
                        }
                        console.error('[proxy] ошибка запроса:', err?.message, err?.cause?.message || '');
                        res.statusCode = 503;
                        res.setHeader('Content-Type', 'application/json; charset=utf-8');
                        res.end(JSON.stringify({
                            status: 503,
                            title: 'Сервер недоступен',
                            message: `API не отвечает на ${target}. Сервер не запущен или ещё поднимается (нужно около 20 с). Запустите проект командой «npm run dev» в корне репозитория.`,
                            detail: err?.message
                        }));
                        return;
                    }
                }
            });
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig(async ({ command }) => {
    /* === 1. Порт уже занят: ничего не запускаем ===
       Обычно это значит, что dev-сервер уже поднят (вручную или прошлой
       сессией). Раньше Vite молча уезжал на соседний порт, а прокси и
       адрес в браузере оставались старыми — страница «не открывалась».
       Теперь выходим с кодом 0: порт обслуживается, всё работает. */
    if (command === 'serve' && await isPortBusy(devPort)) {
        console.log(
            `\n[Vite] Порт ${devPort} уже занят — вероятно, dev-сервер уже запущен.` +
            `\n        Приложение доступно: https://localhost:${devPort}` +
            `\n        Если нужен перезапуск — закройте старый процесс и запустите снова.\n`
        );
        exit(0);
    }

    /* === 2. HTTPS-сертификат для локальной разработки ===
       Chrome не пускает на https страницу с недоверенным сертификатом, а
       старый конфиг экспортировал .pem ровно один раз и не обновлял его —
       из-за этого после перевыпуска сертификата страница переставала
       открываться. Теперь сертификат всегда актуальный и доверенный. */
    devCert('--export-path', certFilePath, '--format', 'Pem', '--no-password');
    const trust = devCert('--trust');

    if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
        console.error(
            '\n[Vite] ⚠ Не удалось получить HTTPS-сертификат для локальной разработки.\n' +
            '      Выполните вручную:  dotnet dev-certs https --export-path "' + certFilePath + '" --format Pem --no-password\n'
        );
        exit(1);
    }

    if (trust.status !== 0) {
        console.warn(
            '\n[Vite] ⚠ Не удалось автоматически доверить сертификат (нужны права администратора).\n' +
            '      Chrome может предупредить о небезопасном подключении.\n' +
            '      Выполните вручную:  dotnet dev-certs https --trust\n'
        );
    }

    return {
        plugins: [plugin(), apiProxyPlugin(target)],
        build: {
            // Крупные чанки (pdfmake со шрифтами, recharts) вынесены в ленивую
            // загрузку и не попадают в стартовый бандл, поэтому порог поднят.
            chunkSizeWarningLimit: 1000
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        server: {
            /* По умолчанию Vite слушает только IPv6 (::1) — тогда https://127.0.0.1:61000
               не открывается вообще. С host: true dev-сервер отвечает и по 127.0.0.1,
               и по localhost (сертификат содержит оба адреса). */
            host: true,
            port: devPort,
            // Порт свободен (проверили выше) — молчаливый переезд исключён:
            // при неожиданной коллизии Vite упадёт с понятной ошибкой.
            strictPort: true,
            https: {
                key: fs.readFileSync(keyFilePath),
                cert: fs.readFileSync(certFilePath),
            },
        }
    };
});