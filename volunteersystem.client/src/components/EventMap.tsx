import { useEffect, useState } from 'react';
import { MapPin, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { geocode, type Geo } from '../utils/geocode';

interface Props {
    address: string;
    height?: number;
}

/**
 * Настоящая карта (OpenStreetMap) с меткой места мероприятия.
 * Координаты ищутся через Nominatim по адресу/месту,
 * кэшируются в sessionStorage, чтобы не дёргать сервис повторно.
 */
export default function EventMap({ address, height = 260 }: Props) {
    const [result, setResult] = useState<{ address: string; geo: Geo | null } | null>(null);
    const loading = Boolean(address.trim()) && result?.address !== address;
    const geo = result?.address === address ? result.geo : null;

    useEffect(() => {
        let cancelled = false;
        geocode(address).then(geo => {
            if (!cancelled) setResult({ address, geo });
        });

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

    if (!geo) {
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
