export interface GeoPoint {
    lat: number;
    lon: number;
    zoom: number;
}

const CACHE_PREFIX = 'geo2:';
const memoryCache = new Map<string, GeoPoint>();

const normalize = (value: string) =>
    value
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9]+/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');

const PLACES: Record<string, GeoPoint> = {
    'детский дом 5': { lat: 55.7907467, lon: 37.598583, zoom: 16 },
    'детский дом 5 москва': { lat: 55.7907467, lon: 37.598583, zoom: 16 },
    'дк заря': { lat: 55.7602, lon: 37.6204, zoom: 15 },
    'дк заря санкт петербург': { lat: 59.9343, lon: 30.3351, zoom: 14 },
    'набережная озера кабан казань': { lat: 55.7703, lon: 49.128, zoom: 15 },
    'набережная озера пестово': { lat: 56.0875, lon: 37.6516, zoom: 13 },
    'парк измайлово москва': { lat: 55.791518, lon: 37.7629637, zoom: 15 },
    'парк кузьминки москва': { lat: 55.6905009, lon: 37.7860405, zoom: 15 },
    'парк сокольники москва': { lat: 55.7995292, lon: 37.6716294, zoom: 15 },
    'приют верный друг санкт петербург': { lat: 59.85, lon: 30.25, zoom: 13 },
    'стадион динамо': { lat: 55.7912927, lon: 37.5586382, zoom: 15 },
    'стадион динамо москва': { lat: 55.7912927, lon: 37.5586382, zoom: 15 },
    'центр крови им о к гаврилова москва': { lat: 55.778491, lon: 37.5499922, zoom: 16 },
    'центр современной культуры смена казань': { lat: 55.7883, lon: 49.1036, zoom: 16 },
    'центральная библиотека': { lat: 55.7671416, lon: 37.6786369, zoom: 16 },
    'центральная библиотека санкт петербург': { lat: 59.927, lon: 30.337, zoom: 14 }
};

const CITY_FALLBACKS: { pattern: RegExp; point: GeoPoint }[] = [
    { pattern: /москв/, point: { lat: 55.7558, lon: 37.6173, zoom: 11 } },
    { pattern: /санкт петербург|петербург|спб|ленинград/, point: { lat: 59.9343, lon: 30.3351, zoom: 11 } },
    { pattern: /казан/, point: { lat: 55.7963, lon: 49.1088, zoom: 12 } },
    { pattern: /новосибирск/, point: { lat: 55.0084, lon: 82.9357, zoom: 11 } },
    { pattern: /екатеринбург/, point: { lat: 56.8389, lon: 60.6057, zoom: 11 } },
    { pattern: /нижний новгород/, point: { lat: 56.3269, lon: 44.0059, zoom: 11 } },
    { pattern: /самар/, point: { lat: 53.1959, lon: 50.1002, zoom: 11 } },
    { pattern: /омск/, point: { lat: 54.9885, lon: 73.3242, zoom: 11 } },
    { pattern: /ростов/, point: { lat: 47.2357, lon: 39.7015, zoom: 11 } },
    { pattern: /уф/, point: { lat: 54.7388, lon: 55.9721, zoom: 11 } },
    { pattern: /красноярск/, point: { lat: 56.0153, lon: 92.8932, zoom: 11 } },
    { pattern: /воронеж/, point: { lat: 51.672, lon: 39.1843, zoom: 11 } },
    { pattern: /перм/, point: { lat: 58.0105, lon: 56.2502, zoom: 11 } },
    { pattern: /волгоград/, point: { lat: 48.708, lon: 44.5133, zoom: 11 } },
    { pattern: /краснодар/, point: { lat: 45.0355, lon: 38.9753, zoom: 11 } },
    { pattern: /сочи/, point: { lat: 43.5855, lon: 39.7231, zoom: 11 } },
    { pattern: /тюмен/, point: { lat: 57.1522, lon: 65.5272, zoom: 11 } },
    { pattern: /иркутск/, point: { lat: 52.287, lon: 104.305, zoom: 11 } },
    { pattern: /владивосток/, point: { lat: 43.1155, lon: 131.8855, zoom: 11 } },
    { pattern: /калининград/, point: { lat: 54.7104, lon: 20.4522, zoom: 11 } },
    { pattern: /тул/, point: { lat: 54.1961, lon: 37.6182, zoom: 11 } },
    { pattern: /ярославл/, point: { lat: 57.6261, lon: 39.8845, zoom: 11 } },
    { pattern: /челябинск/, point: { lat: 55.1644, lon: 61.4368, zoom: 11 } }
];

const readCache = (key: string): GeoPoint | null => {
    const inMemory = memoryCache.get(key);
    if (inMemory) return inMemory;
    try {
        const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as GeoPoint;
        if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon)) return null;
        memoryCache.set(key, parsed);
        return parsed;
    } catch {
        return null;
    }
};

const writeCache = (key: string, point: GeoPoint) => {
    memoryCache.set(key, point);
    try {
        sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(point));
    } catch {
        return;
    }
};

const validPoint = (lat: unknown, lon: unknown): GeoPoint | null => {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { lat: latitude, lon: longitude, zoom: 16 };
};

async function fromPhoton(query: string, signal: AbortSignal): Promise<GeoPoint | null> {
    const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=ru`,
        { signal }
    );
    if (!response.ok) throw new Error('photon failed');
    const data = (await response.json()) as {
        features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!coords) throw new Error('photon empty');
    const point = validPoint(coords[1], coords[0]);
    if (!point) throw new Error('photon invalid');
    return point;
}

async function fromNominatim(query: string, signal: AbortSignal): Promise<GeoPoint | null> {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ru&q=${encodeURIComponent(query)}`,
        { signal }
    );
    if (!response.ok) throw new Error('nominatim failed');
    const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const point = data[0] ? validPoint(data[0].lat, data[0].lon) : null;
    if (!point) throw new Error('nominatim empty');
    return point;
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
    const clean = address.trim();
    if (!clean) return null;

    const normalized = normalize(clean);
    const cached = readCache(normalized);
    if (cached) return cached;

    const known = PLACES[normalized];
    if (known) {
        writeCache(normalized, known);
        return known;
    }

    const city = CITY_FALLBACKS.find(item => item.pattern.test(normalized))?.point;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);

    const result = await Promise.any([
        fromPhoton(clean, controller.signal),
        fromNominatim(clean, controller.signal)
    ]).catch(() => null);

    window.clearTimeout(timer);
    controller.abort();

    if (result) {
        writeCache(normalized, result);
        return result;
    }

    if (city) {
        writeCache(normalized, city);
        return city;
    }

    return null;
}
