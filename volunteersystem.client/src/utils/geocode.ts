export interface Geo {
    lat: number;
    lon: number;
    display_name?: string;
}

function isGeo(value: unknown): value is Geo {
    if (!value || typeof value !== 'object') return false;
    const geo = value as Geo;
    return Number.isFinite(geo.lat) && Math.abs(geo.lat) <= 90 &&
        Number.isFinite(geo.lon) && Math.abs(geo.lon) <= 180 &&
        (geo.display_name === undefined || typeof geo.display_name === 'string');
}

// Share pending lookups, including React StrictMode's repeated effect setup.
const pending = new Map<string, Promise<Geo | null>>();

export function geocode(address: string): Promise<Geo | null> {
    const query = address.trim().replace(/\s+/g, ' ');
    if (!query) return Promise.resolve(null);
    const key = `geo:${query.toLocaleLowerCase('ru')}`;
    try {
        const cached: unknown = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (isGeo(cached)) return Promise.resolve(cached);
    } catch { /* Storage may be disabled or contain invalid JSON. */ }

    const existing = pending.get(key);
    if (existing) return existing;

    const lookup = (async () => {
        try {
            const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
                format: 'json', limit: '1', 'accept-language': 'ru', q: query
            });
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) return null;
            const data: unknown = await response.json();
            if (!Array.isArray(data) || !data[0]) return null;
            const first = data[0];
            if (typeof first.lat !== 'string' || typeof first.lon !== 'string' ||
                !first.lat.trim() || !first.lon.trim()) return null;
            const result = { lat: Number(first.lat), lon: Number(first.lon), display_name: first.display_name };
            if (!isGeo(result)) return null;
            try { sessionStorage.setItem(key, JSON.stringify(result)); }
            catch { /* A cache write must not discard a successful lookup. */ }
            return result;
        } catch {
            return null;
        }
    })();
    pending.set(key, lookup);
    void lookup.finally(() => pending.delete(key));
    return lookup;
}
