import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { geocode } from '../volunteersystem.client/src/utils/geocode.ts';

const geo = { lat: 55.75, lon: 37.61, display_name: 'Москва' };
const response = () => Response.json([{ lat: '55.75', lon: '37.61', display_name: 'Москва' }]);
function storage(getItem = () => null, setItem = () => {}) {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem, setItem } });
}
afterEach(() => { mock.restoreAll(); delete globalThis.sessionStorage; });

test('blank address does not make an external request', async () => {
    const fetch = mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected request'); });
    assert.equal(await geocode('  '), null);
    assert.equal(fetch.mock.callCount(), 0);
});

test('valid cache avoids external lookup', async () => {
    storage(() => JSON.stringify(geo));
    const fetch = mock.method(globalThis, 'fetch');
    assert.deepEqual(await geocode('Москва'), geo);
    assert.equal(fetch.mock.callCount(), 0);
});

test('disabled storage and cache write failures do not hide a valid map', async () => {
    storage(() => { throw new Error('SecurityError'); }, () => { throw new Error('QuotaExceededError'); });
    mock.method(globalThis, 'fetch', async () => response());
    assert.deepEqual(await geocode('Москва'), geo);
});

test('broken or out-of-range cache is replaced by fresh coordinates', async () => {
    mock.method(globalThis, 'fetch', async () => response());
    for (const cached of ['{invalid', '{"lat":999,"lon":37}', 'null', '{"lat":"55","lon":37}']) {
        storage(() => cached);
        assert.deepEqual(await geocode('Москва'), geo);
    }
});

test('concurrent lookups share one request (including StrictMode)', async () => {
    storage();
    let resolve;
    const fetch = mock.method(globalThis, 'fetch', () => new Promise(done => { resolve = done; }));
    const a = geocode('Москва');
    const b = geocode('  Москва  ');
    resolve(response());
    assert.deepEqual(await a, geo);
    assert.deepEqual(await b, geo);
    assert.equal(fetch.mock.callCount(), 1);
});

test('network failure, no results and invalid coordinates produce fallback', async () => {
    storage();
    const fetch = mock.method(globalThis, 'fetch');
    for (const payload of [[], [{ lat: 'NaN', lon: '37' }], [{ lat: '55', lon: '181' }], [{ lat: '', lon: '37' }]]) {
        fetch.mock.mockImplementation(async () => Response.json(payload));
        assert.equal(await geocode('Москва'), null);
    }
    fetch.mock.mockImplementation(async () => { throw new Error('Offline'); });
    assert.equal(await geocode('Москва'), null);
});

test('slow requests have an eight-second timeout and allow retry', async () => {
    storage();
    const timeout = mock.method(AbortSignal, 'timeout', () => AbortSignal.abort());
    const fetch = mock.method(globalThis, 'fetch', async (_url, options) => {
        options.signal.throwIfAborted();
        return response();
    });
    assert.equal(await geocode('Москва'), null);
    assert.equal(timeout.mock.calls[0].arguments[0], 8000);
    fetch.mock.mockImplementation(async () => response());
    assert.deepEqual(await geocode('Москва'), geo);
});
