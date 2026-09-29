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
        plugins: [plugin()],
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
            proxy: {
                // Проксируем все запросы, начинающиеся с /api, на backend
                '/api': {
                    target,
                    changeOrigin: true,
                    secure: false,
                    /* Без этого в консоли сыпалось ECONNREFUSED на каждый запрос,
                       когда сервер не запущен. Теперь клиент получает внятный ответ. */
                    configure: proxy => {
                        proxy.on('error', (err, _req, res) => {
                            if (!res || res.headersSent || res.writableEnded) return;
                            const body = JSON.stringify({
                                status: 503,
                                title: 'Сервер недоступен',
                                message: `API не отвечает на ${target}. Запустите проект командой «npm run dev» в корне репозитория.`,
                                detail: err?.message
                            });
                            res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(body);
                        });
                    }
                }
            },
            port: devPort,
            // Порт свободен (проверили выше) — молчаливый переезд исключён:
            // при неожиданной коллизии Vite упадёт с понятной ошибкой.
            strictPort: true,
            https: {
                key: fs.readFileSync(keyFilePath),
                cert: fs.readFileSync(certFilePath),
            }
        }
    };
});
