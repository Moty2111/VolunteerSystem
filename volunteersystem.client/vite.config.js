import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getPort } from '../scripts/dev-utils.mjs';

function httpsOptions() {
    if (process.env.DEV_HTTPS !== '1') return undefined;
    const folder = process.env.APPDATA
        ? path.join(process.env.APPDATA, 'ASP.NET', 'https')
        : path.join(process.env.HOME, '.aspnet', 'https');
    const cert = path.join(folder, 'volunteersystem.client.pem');
    const key = path.join(folder, 'volunteersystem.client.key');
    fs.mkdirSync(folder, { recursive: true });
    const result = spawnSync('dotnet', ['dev-certs', 'https', '--export-path', cert,
        '--format', 'Pem', '--no-password'], { stdio: 'ignore', timeout: 15000 });
    if (result.status !== 0 || !fs.existsSync(cert) || !fs.existsSync(key)) {
        throw new Error('Не удалось экспортировать HTTPS-сертификат. Проверьте .NET SDK или запустите без DEV_HTTPS=1.');
    }
    return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

export default defineConfig(({ command }) => {
    const apiTarget = process.env.DEV_API_TARGET || `http://localhost:${getPort(process.env.DEV_API_PORT, 5084)}`;
    return {
        plugins: [react(), {
            name: 'volunteersystem-dev-status',
            configureServer(server) {
                server.middlewares.use('/__volunteersystem/dev', (_req, res) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ service: 'VolunteerSystem.Web', apiTarget }));
                });
            }
        }],
        build: { chunkSizeWarningLimit: 1000 },
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        server: {
            host: 'localhost',
            port: getPort(process.env.DEV_SERVER_PORT, 61000),
            strictPort: true,
            https: command === 'serve' ? httpsOptions() : undefined,
            proxy: { '/api': { target: apiTarget, changeOrigin: true } }
        }
    };
});
