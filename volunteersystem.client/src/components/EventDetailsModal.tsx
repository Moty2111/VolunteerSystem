import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import EventMap from './EventMap';
import { Badge, Skeleton } from './ui';
import { eventsApi } from '../api/events';
import type { EventItem } from '../types';
import { formatHours } from '../utils/format';
import posterSocial from '../assets/events/social.svg';
import posterEco from '../assets/events/eco.svg';
import posterCulture from '../assets/events/culture.svg';
import posterCharity from '../assets/events/charity.svg';
import posterSport from '../assets/events/sport.svg';
import posterEducation from '../assets/events/education.svg';
import {
    MapPin, Calendar, Clock, Users, Info, ArrowRight, AlertCircle
} from 'lucide-react';

const TYPE_LABELS: Record<number, string> = {
    1: 'Социальное', 2: 'Экологическое', 3: 'Культурное',
    4: 'Благотворительное', 5: 'Спортивное', 6: 'Образовательное'
};

const TYPE_POSTERS: Record<number, string> = {
    1: posterSocial, 2: posterEco, 3: posterCulture,
    4: posterCharity, 5: posterSport, 6: posterEducation
};

const posterFor = (typeId: number) => TYPE_POSTERS[typeId] || posterSocial;

const statusBadge: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
    'Запланировано': 'info', 'Идёт': 'warning', 'Завершено': 'success', 'Отменено': 'danger'
};

function daysUntil(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'завершено';
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    if (diff < 7) return `через ${diff} дн.`;
    return `через ${Math.ceil(diff / 7)} нед.`;
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div style={{
            padding: 12, background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)', display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
            <div style={{ color: 'var(--primary)', marginTop: 2 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', fontWeight: 700
                }}>
                    {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{value}</div>
            </div>
        </div>
    );
}

interface ParticipantRow {
    volunteer_id: number;
    volunteer_name: string;
    phone?: string;
    email?: string;
    city?: string;
    role_name?: string;
    hours_actual?: number;
    confirmed?: boolean;
}

/** Подробная информация о мероприятии — переиспользуется из ленты уведомлений и др. */
export default function EventDetailsModal({ eventId, onClose }: {
    eventId: number;
    onClose: () => void;
}) {
    const navigate = useNavigate();
    const [event, setEvent] = useState<EventItem | null>(null);
    const [participants, setParticipants] = useState<ParticipantRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        Promise.all([
            eventsApi.getById(eventId),
            eventsApi.participants(eventId).catch(() => [])
        ])
            .then(([e, p]) => {
                if (cancelled) return;
                setEvent(e);
                setParticipants(p as ParticipantRow[]);
            })
            .catch(() => {
                if (!cancelled) setError('Не удалось загрузить информацию о мероприятии');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [eventId]);

    const openEventsPage = () => {
        onClose();
        navigate(`/events?focus=${eventId}`);
    };

    const confirmedCount = participants.filter(p => p.confirmed).length;

    return (
        <Modal
            open
            title={event?.eventName || 'Мероприятие'}
            onClose={onClose}
            wide
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose}>Закрыть</button>
                    {event && (
                        <button className="btn btn-primary" onClick={openEventsPage}>
                            Открыть мероприятие <ArrowRight size={14} />
                        </button>
                    )}
                </>
            }
        >
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Skeleton height={160} radius={14} />
                    <Skeleton height={240} radius={14} />
                </div>
            ) : error ? (
                <div className="empty-state" style={{ padding: '28px 12px' }}>
                    <AlertCircle size={36} style={{ color: 'var(--text-3)' }} />
                    <div className="empty-title">{error}</div>
                </div>
            ) : event ? (
                <>
                    <div className={`event-modal-banner poster-${event.eventTypeId}`}>
                        <img
                            className="event-modal-banner-img"
                            src={posterFor(event.eventTypeId)}
                            alt={event.eventTypeName || TYPE_LABELS[event.eventTypeId]}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                        <Badge variant="primary">{event.eventTypeName || TYPE_LABELS[event.eventTypeId]}</Badge>
                        <Badge variant={statusBadge[event.status] || 'muted'}>{event.status}</Badge>
                        <Badge variant="accent">{daysUntil(event.dateStart)}</Badge>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            marginBottom: 9, fontSize: 12, fontWeight: 700,
                            color: 'var(--text-2)', textTransform: 'uppercase',
                            letterSpacing: '0.07em'
                        }}>
                            <MapPin size={14} style={{ color: 'var(--primary)' }} /> Место проведения
                        </div>
                        <EventMap address={event.location} height={220} />
                    </div>

                    <div className="modal-grid-2">
                        <DetailItem
                            icon={<Calendar size={16} />}
                            label="Начало"
                            value={new Date(event.dateStart).toLocaleString('ru-RU', {
                                day: '2-digit', month: 'long', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        />
                        <DetailItem
                            icon={<Calendar size={16} />}
                            label="Окончание"
                            value={new Date(event.dateEnd).toLocaleString('ru-RU', {
                                day: '2-digit', month: 'long', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        />
                        <DetailItem
                            icon={<Clock size={16} />}
                            label="Длительность"
                            value={`${Math.round((new Date(event.dateEnd).getTime() - new Date(event.dateStart).getTime()) / (1000 * 60 * 60))} ч`}
                        />
                        <DetailItem
                            icon={<Users size={16} />}
                            label="Участников"
                            value={`${event.assignmentsCount}`}
                        />
                    </div>

                    {event.description && (
                        <div style={{
                            padding: 16, background: 'var(--surface-2)',
                            borderRadius: 'var(--r-md)', marginBottom: 16,
                            fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)'
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                marginBottom: 8, fontWeight: 600, color: 'var(--text)'
                            }}>
                                <Info size={14} /> Описание
                            </div>
                            {event.description}
                        </div>
                    )}

                    {participants.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                marginBottom: 10, fontSize: 13, fontWeight: 700
                            }}>
                                <Users size={15} style={{ color: 'var(--primary)' }} />
                                Участники
                                <span className="event-comments-count">
                                    {confirmedCount}/{participants.length} подтверждено
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {participants.slice(0, 12).map(p => (
                                    <div key={p.volunteer_id} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '8px 12px', background: 'var(--surface-2)',
                                        borderRadius: 'var(--r-md)', fontSize: 13
                                    }}>
                                        <span style={{
                                            width: 26, height: 26, borderRadius: '50%',
                                            background: 'var(--primary-soft)', color: 'var(--primary)',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: 12, flexShrink: 0
                                        }}>
                                            {p.volunteer_name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        <span style={{ flex: 1, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.volunteer_name}
                                        </span>
                                        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                                            {p.role_name || ''}
                                        </span>
                                        {p.role_name && <span style={{ color: 'var(--text-3)' }}>·</span>}
                                        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                                            {p.hours_actual ? formatHours(Number(p.hours_actual)) : ''}
                                        </span>
                                        {p.confirmed ? (
                                            <Badge variant="success">✓</Badge>
                                        ) : (
                                            <Badge variant="muted">…</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {participants.length > 12 && (
                                <div style={{
                                    marginTop: 8, fontSize: 12, color: 'var(--text-3)',
                                    textAlign: 'center'
                                }}>
                                    и ещё {participants.length - 12} — полный список в разделе «Мероприятия»
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : null}
        </Modal>
    );
}
