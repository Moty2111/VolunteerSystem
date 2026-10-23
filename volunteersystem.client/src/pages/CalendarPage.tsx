import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { eventsApi } from '../api/events';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, Skeleton } from '../components/ui';
import { IllCalendar } from '../components/illustrations';
import type { EventItem } from '../types';
import { plural } from '../utils/format';
import {
    ChevronLeft, ChevronRight, CalendarDays, MapPin, Users,
    Clock, Sparkles, ArrowRight
} from 'lucide-react';

import posterSocial from '../assets/events/social.svg';
import posterEco from '../assets/events/eco.svg';
import posterCulture from '../assets/events/culture.svg';
import posterCharity from '../assets/events/charity.svg';
import posterSport from '../assets/events/sport.svg';
import posterEducation from '../assets/events/education.svg';

const TYPE_POSTERS: Record<number, string> = {
    1: posterSocial, 2: posterEco, 3: posterCulture,
    4: posterCharity, 5: posterSport, 6: posterEducation
};
const posterFor = (typeId: number) => TYPE_POSTERS[typeId] || posterSocial;

const STATUS_COLORS: Record<string, string> = {
    'Запланировано': '#7c5cff',
    'Идёт': '#ffa14a',
    'Завершено': '#2fd08a',
    'Отменено': '#ff5c7a'
};

const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const timeOf = (value: string) =>
    new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function CalendarPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const today = useMemo(() => new Date(), []);
    const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [selected, setSelected] = useState(() => ymd(today));

    useEffect(() => {
        (async () => {
            try {
                setEvents(await eventsApi.getAll());
            } catch (e: unknown) {
                const err = e as { response?: { data?: { message?: string } } };
                toast.error(err.response?.data?.message || 'Не удалось загрузить мероприятия');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const byDay = useMemo(() => {
        const map = new Map<string, EventItem[]>();
        events.forEach(e => {
            const start = new Date(e.dateStart);
            const end = new Date(e.dateEnd);
            const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
            while (d <= last) {
                const key = ymd(d);
                const arr = map.get(key) || [];
                arr.push(e);
                map.set(key, arr);
                d.setDate(d.getDate() + 1);
            }
        });
        return map;
    }, [events]);

    const cells = useMemo(() => {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const first = new Date(year, month, 1);
        const offset = (first.getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const list: Array<{ date: Date; inMonth: boolean }> = [];
        for (let i = 0; i < offset; i++) {
            const d = new Date(year, month, -(offset - 1) + i);
            list.push({ date: d, inMonth: false });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            list.push({ date: new Date(year, month, day), inMonth: true });
        }
        while (list.length % 7 !== 0) {
            const lastDay = list[list.length - 1]?.date ?? first;
            const d = new Date(lastDay);
            d.setDate(d.getDate() + 1);
            list.push({ date: d, inMonth: false });
        }
        return list;
    }, [cursor]);

    const selectedEvents = useMemo(() => {
        const list = byDay.get(selected) || [];
        return [...list].sort((a, b) =>
            new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime()
        );
    }, [byDay, selected]);

    const monthEvents = useMemo(() => {
        const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        return events.filter(e => {
            const eventStart = new Date(e.dateStart);
            const eventEnd = new Date(e.dateEnd);
            return eventStart < end && eventEnd >= start;
        });
    }, [events, cursor]);

    const busyDays = useMemo(
        () => cells.filter(c => c.inMonth && (byDay.get(ymd(c.date))?.length || 0) > 0).length,
        [cells, byDay]
    );

    const nextEvent = useMemo(() => {
        const now = new Date();
        return [...events]
            .filter(e => new Date(e.dateEnd) >= now)
            .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())[0];
    }, [events]);

    const monthTitle = capitalize(cursor.toLocaleDateString('ru-RU', { month: 'long' }));
    const monthYear = cursor.getFullYear();
    const selectedDate = new Date(selected);
    const selectedLabel = selectedDate.toLocaleDateString('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    const shiftMonth = (delta: number) => {
        setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    };

    const goToday = () => {
        const t = new Date();
        setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
        setSelected(ymd(t));
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Календарь</h1>
                    <p className="page-subtitle">
                        {loading
                            ? 'Загрузка...'
                            : `${events.length} ${plural(events.length, ['мероприятие', 'мероприятия', 'мероприятий'])} в расписании`}
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={goToday}>
                    <CalendarDays size={16} /> Сегодня
                </button>
            </div>

            <div className="cal-summary">
                <div className="cal-summary-card">
                    <span className="cal-summary-icon"><CalendarDays size={18} /></span>
                    <div>
                        <div className="cal-summary-value">{monthEvents.length}</div>
                        <div className="cal-summary-label">
                            {plural(monthEvents.length, ['событие', 'события', 'событий'])} в этом месяце
                        </div>
                    </div>
                </div>
                <div className="cal-summary-card">
                    <span className="cal-summary-icon"><Sparkles size={18} /></span>
                    <div>
                        <div className="cal-summary-value">{busyDays}</div>
                        <div className="cal-summary-label">
                            {plural(busyDays, ['занятый день', 'занятых дня', 'занятых дней'])}
                        </div>
                    </div>
                </div>
                <div className="cal-summary-card cal-summary-next">
                    <span className="cal-summary-icon"><Clock size={18} /></span>
                    <div>
                        <div className="cal-summary-value cal-summary-event">
                            {nextEvent ? nextEvent.eventName : 'Нет событий'}
                        </div>
                        <div className="cal-summary-label">
                            {nextEvent
                                ? `Ближайшее · ${new Date(nextEvent.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
                                : 'Расписание свободно'}
                        </div>
                    </div>
                    {nextEvent && (
                        <button
                            className="cal-summary-arrow"
                            onClick={() => navigate('/events')}
                            aria-label="Перейти к мероприятиям"
                        >
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="cal-wrap">
                <div className="card cal-main">
                    <div className="cal-toolbar">
                        <div className="cal-month">
                            <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
                                <ChevronLeft size={18} />
                            </button>
                            <div className="cal-month-copy">
                                <span className="cal-month-name">{monthTitle}</span>
                                <span className="cal-month-year">{monthYear}</span>
                            </div>
                            <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <div className="cal-toolbar-actions">
                            <button className="btn btn-ghost btn-sm" onClick={goToday}>Сегодня</button>
                        </div>
                    </div>

                    <div className="cal-grid cal-dow">
                        {DOW.map(d => <div key={d} className="cal-dow-cell">{d}</div>)}
                    </div>

                    {loading ? (
                        <Skeleton height={360} radius={14} />
                    ) : (
                        <div className="cal-grid cal-month-grid">
                            {cells.map(({ date, inMonth }) => {
                                const key = ymd(date);
                                const list = byDay.get(key) || [];
                                const isToday = key === ymd(today);
                                const isSelected = key === selected;
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className={[
                                            'cal-day',
                                            inMonth ? '' : 'is-out',
                                            isToday ? 'is-today' : '',
                                            isSelected ? 'is-selected' : '',
                                            isWeekend ? 'is-weekend' : ''
                                        ].filter(Boolean).join(' ')}
                                        onClick={() => setSelected(key)}
                                    >
                                        <span className="cal-day-head">
                                            <span className="cal-daynum">{date.getDate()}</span>
                                            {isToday && <span className="cal-today-label">Сегодня</span>}
                                        </span>
                                        <span className="cal-chips">
                                            {list.slice(0, 2).map(e => (
                                                <span
                                                    key={e.eventId}
                                                    className="cal-chip"
                                                    style={{
                                                        color: STATUS_COLORS[e.status] || '#94a3b8',
                                                        borderColor: `${STATUS_COLORS[e.status] || '#94a3b8'}55`,
                                                        background: `${STATUS_COLORS[e.status] || '#94a3b8'}18`
                                                    }}
                                                    title={`${e.eventName} · ${e.location}`}
                                                >
                                                    <span className="cal-chip-dot" />
                                                    <span className="cal-chip-label">{e.eventName}</span>
                                                </span>
                                            ))}
                                            {list.length > 2 && (
                                                <span className="cal-more">+{list.length - 2} ещё</span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="cal-legend">
                        <span className="cal-legend-title">Статусы</span>
                        {Object.entries(STATUS_COLORS).map(([status, color]) => (
                            <span key={status} className="cal-legend-item">
                                <span className="cal-legend-dot" style={{ background: color }} />
                                {status}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="card cal-side">
                    <div className="cal-side-head">
                        <div className="cal-side-date">
                            <span className="cal-side-day">{selectedDate.getDate()}</span>
                            <div>
                                <span className="cal-side-month">
                                    {selectedDate.toLocaleDateString('ru-RU', { month: 'long' })}
                                </span>
                                <span className="cal-side-weekday">
                                    {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}
                                </span>
                            </div>
                        </div>
                        <Badge variant={selectedEvents.length ? 'primary' : 'muted'}>
                            {selectedEvents.length} {plural(selectedEvents.length, ['событие', 'события', 'событий'])}
                        </Badge>
                    </div>

                    <div className="cal-side-subtitle">{capitalize(selectedLabel)}</div>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2].map(i => <Skeleton key={i} height={92} radius={12} />)}
                        </div>
                    ) : selectedEvents.length === 0 ? (
                        <EmptyState
                            illustration={<IllCalendar size={90} />}
                            title="Событий нет"
                            text="Выберите другой день или посмотрите все мероприятия"
                            action={
                                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/events')}>
                                    Все мероприятия
                                </button>
                            }
                        />
                    ) : (
                        <div className="cal-agenda">
                            {selectedEvents.map(e => {
                                const color = STATUS_COLORS[e.status] || '#94a3b8';
                                return (
                                    <motion.button
                                        type="button"
                                        key={e.eventId}
                                        className="cal-agenda-item"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => navigate('/events')}
                                    >
                                        <div className="cal-agenda-time">
                                            <span>{timeOf(e.dateStart)}</span>
                                            <span className="cal-agenda-time-end">{timeOf(e.dateEnd)}</span>
                                        </div>
                                        <div className="cal-agenda-body">
                                            <div className="cal-agenda-title" title={e.eventName}>
                                                {e.eventName}
                                            </div>
                                            <div className="cal-agenda-meta">
                                                <MapPin size={12} /> {e.location}
                                            </div>
                                            <div className="cal-agenda-foot">
                                                <span className="cal-agenda-status" style={{ color }}>
                                                    <span style={{ background: color }} />
                                                    {e.status}
                                                </span>
                                                <span className="cal-agenda-sep">·</span>
                                                <span><Users size={12} /> {e.assignmentsCount}</span>
                                            </div>
                                        </div>
                                        <img
                                            className="cal-agenda-thumb"
                                            src={posterFor(e.eventTypeId)}
                                            alt=""
                                        />
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
