import net from 'node:net';
import https from 'node:https';

export function getPort(value, fallback) {
    const port = value === undefined || value === '' ? fallback : Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Некорректный порт: ${value}. Ожидается целое число от 1 до 65535.`);
    }
    return port;
}

function canConnect(port, host) {
    return new Promise(resolve => {
        const socket = net.connect({ port, host });
        const finish = result => { socket.destroy(); resolve(result); };
        socket.setTimeout(500);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

export async function isPortBusy(port) {
    const results = await Promise.all(['127.0.0.1', '::1'].map(host => canConnect(port, host)));
    return results.some(Boolean);
}

export async function chooseServicePort(preferred, {
    service, pathname, scheme = 'http', excluded = [], accept = () => true
}) {
    for (let port = preferred; port <= Math.min(preferred + 100, 65535); port++) {
        if (excluded.includes(port)) continue;
        if (!await isPortBusy(port)) return { port, existing: false };
        const info = await readService(`${scheme}://localhost:${port}${pathname}`, service);
        if (info && accept(info)) return { port, existing: true };
    }
    throw new Error(`Нет свободного порта рядом с ${preferred}. Задайте DEV_API_PORT или DEV_SERVER_PORT.`);
}

export async function readService(url, service) {
    try {
        let data;
        if (url.startsWith('https://localhost:')) {
            // Only the local dev certificate may be self-signed.
            data = await new Promise((resolve, reject) => {
                const request = https.get(url, { rejectUnauthorized: false }, response => {
                    let body = '';
                    response.setEncoding('utf8');
                    response.on('data', chunk => { body += chunk; });
                    response.on('error', reject);
                    response.on('end', () => {
                        try { resolve(response.statusCode === 200 ? JSON.parse(body) : null); }
                        catch (error) { reject(error); }
                    });
                });
                const timer = setTimeout(() => request.destroy(new Error('Timeout')), 1500);
                request.once('close', () => clearTimeout(timer));
                request.once('error', reject);
            });
        } else {
            const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
            if (!response.ok) return null;
            data = await response.json();
        }
        return data?.service === service ? data : null;
    } catch {
        return null;
    }
}
