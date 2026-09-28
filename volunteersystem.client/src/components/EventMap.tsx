import { useEffect, useState } from 'react';
import { MapPin, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';

interface Props {
    address: string;
    height?: number;
}

interface Geo {
    lat: number;
    lon: number;
    display_name?: string;
}

/**
 * Настоящая карта (OpenStreetMap) с меткой места мероприятия.
 * Координаты ищутся через Nominatim по адресу/месту,
 * кэшируются в sessionStorage, чтобы не дёргать сервис повторно.
 */
export default function EventMap({ address, height = 260 }: Props) {
    const [geo, setGeo] = useState<Geo | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!address) {
            setLoading(false);
            setFailed(true);
            return;
        }

        let cancelled = false;
        const key = `geo:${address.toLowerCase().trim()}`;
        const cached = sessionStorage.getItem(key);

        const apply = (g: Geo | null) => {
            if (cancelled) return;
            if (g) {
                setGeo(g);
                setFailed(false);
            } else {
                setFailed(true);
            }
            setLoading(false);
        };

        if (cached) {
            try {
                apply(JSON.parse(cached) as Geo);
                return () => { cancelled = true; };
            } catch { sessionStorage.removeItem(key); }
        }

        setLoading(true);
        const queries = [address, `${address}, Россия`];
        (async () => {
            for (const q of queries) {
                try {
                    const url =
                        `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&q=${encodeURIComponent(q)}`;
                    const res = await fetch(url);
                    if (!res.ok) continue;
                    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
                    if (data.length > 0) {
                        const g: Geo = {
                            lat: Number(data[0].lat),
                            lon: Number(data[0].lon),
                            display_name: data[0].display_name
                        };
                        sessionStorage.setItem(key, JSON.stringify(g));
                        apply(g);
                        return;
                    }
                } catch { /* пробуем следующий вариант */ }
            }
            apply(null);
        })();

        return () => { cancelled = true; };
    }, [address]);

    const yandexLink = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;

    if (loading) {
        return (
            <div className="event-map loading" style={{ height }}>
                <Loader2 size={22} className="spin" />
                <span>Ищем место на карте…</span>
            </div>
        );
    }

    if (failed || !geo) {
        return (
            <div className="event-map fallback" style={{ height }}>
                <AlertTriangle size={22} />
                <span>Не удалось определить координаты места</span>
                <a className="btn btn-secondary btn-sm" href={yandexLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> Открыть в Яндекс.Картах
                </a>
            </div>
        );
    }

    const dLat = 0.006;
    const dLon = 0.01;
    const bbox = [geo.lon - dLon, geo.lat - dLat, geo.lon + dLon, geo.lat + dLat].join(',');
    const osmUrl =
        `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${geo.lat},${geo.lon}`;
    const osmLink = `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=16/${geo.lat}/${geo.lon}`;

    return (
        <div className="event-map" style={{ height }}>
            <iframe title="Карта мероприятия" src={osmUrl} loading="lazy" />
            <div className="event-map-bar">
                <span className="event-map-pin"><MapPin size={13} /> {geo.display_name || address}</span>
                <a href={osmLink} target="_blank" rel="noopener noreferrer">
                    OpenStreetMap <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );
}
