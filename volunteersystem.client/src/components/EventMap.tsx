import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { geocodeAddress, type GeoPoint } from '../utils/geocode';

interface Props {
    address: string;
    height?: number;
}

const markerIcon = L.divIcon({
    className: 'event-map-marker',
    html:
        '<span class="event-map-marker-ring"></span>' +
        '<span class="event-map-marker-pin">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' +
        '</svg></span>',
    iconSize: [44, 50],
    iconAnchor: [22, 48]
});

const TILE_LAYERS: Array<{ url: string; opts: Record<string, unknown> }> = [
    {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        opts: { subdomains: 'abc', maxZoom: 19 }
    },
    {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        opts: { subdomains: 'abcd', maxZoom: 20 }
    }
];

export default function EventMap({ address, height = 260 }: Props) {
    const [geo, setGeo] = useState<GeoPoint | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        setGeo(null);
        setFailed(false);
        setLoading(true);

        // address может быть не задан (модалка ещё не открылась) — не роняем страницу
        if (!address || !address.trim()) {
            setLoading(false);
            setFailed(true);
            return;
        }

        geocodeAddress(address)
            .then(point => {
                if (cancelled) return;
                if (point) setGeo(point);
                else setFailed(true);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [address]);

    useEffect(() => {
        const container = containerRef.current;
        if (loading || !geo || !container) return;

        let map: L.Map | null = null;
        let tileLayer: L.TileLayer | null = null;
        let attempts = 0;
        let timer = 0;
        let frame = 0;
        let stopped = false;

        const initMap = () => {
            if (stopped || !container || !geo) return;

            // Модалка анимируется: на первых кадрах высота контейнера 0.
            // Ждём, пока появится реальная высота, и лишь потом создаём карту.
            const heightPx = container.clientHeight || container.getBoundingClientRect().height;
            if (heightPx < 10) {
                if (attempts++ < 30) {
                    frame = requestAnimationFrame(initMap);
                    return;
                }
                setFailed(true);
                return;
            }

            try {
                map = L.map(container, {
                    center: [geo.lat, geo.lon],
                    zoom: geo.zoom,
                    zoomControl: true,
                    scrollWheelZoom: false,
                    attributionControl: false
                });

                L.control.attribution({ position: 'topright', prefix: false }).addTo(map);

                const addTiles = (index: number) => {
                    if (stopped || !map) return;
                    const src = TILE_LAYERS[index];
                    tileLayer = L.tileLayer(src.url, {
                        ...src.opts,
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
                    });
                    tileLayer.on('tileerror', () => {
                        // Подложка не загрузилась — пробуем следующего провайдера
                        if (TILE_LAYERS[index + 1] && !stopped) {
                            tileLayer?.remove();
                            addTiles(index + 1);
                        }
                    });
                    tileLayer.addTo(map);
                };
                addTiles(0);

                L.marker([geo.lat, geo.lon], {
                    icon: markerIcon,
                    title: address,
                    alt: address,
                    keyboard: false
                }).addTo(map);

                const resizeObserver = new ResizeObserver(() => map?.invalidateSize());
                resizeObserver.observe(container);
                frame = requestAnimationFrame(() => map?.invalidateSize());
                timer = window.setTimeout(() => map?.invalidateSize(), 260);

                cleanup = () => {
                    cancelAnimationFrame(frame);
                    window.clearTimeout(timer);
                    resizeObserver.disconnect();
                    map?.remove();
                    map = null;
                };
            } catch {
                setFailed(true);
            }
        };

        let cleanup: () => void = () => {};
        initMap();

        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            window.clearTimeout(timer);
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geo, address, loading]);

    const yandexLink = `https://yandex.ru/maps/?text=${encodeURIComponent(address || '')}`;

    if (loading) {
        return (
            <div className="event-map loading" style={{ height }}>
                <Loader2 size={22} className="spin" />
                <span>Загружаем карту…</span>
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

    return (
        <div className="event-map" style={{ height }}>
            <div ref={containerRef} className="event-map-canvas" />
            <div className="event-map-bar">
                <span className="event-map-pin"><MapPin size={13} /> {address}</span>
                <a href={yandexLink} target="_blank" rel="noopener noreferrer">
                    Яндекс.Карты <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );
}
