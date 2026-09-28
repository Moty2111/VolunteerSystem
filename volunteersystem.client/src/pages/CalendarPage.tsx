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
    ChevronLeft, ChevronRight, CalendarDays, MapPin, Users, Circle
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

const DOW = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

    /* события по дням (попадает в период от начала до конца) */
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
        const offset = (first.getDay() + 6) % 7; // неделя с понедельника
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

    const selectedEvents = useMemo(() => byDay.get(selected) || [], [byDay, selected]);

    const monthTitle = cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

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

            <div className="cal-wrap">
                <div className="card cal-main">
                    <div className="card-header cal-toolbar">
                        <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
                            <ChevronLeft size={16} />
                        </button>
                        <h3 className="card-title" style={{ textTransform: 'capitalize' }}>
                            {monthTitle}
                        </h3>
                        <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="cal-grid cal-dow">
                        {DOW.map(d => <div key={d} className="cal-dow-cell">{d}</div>)}
                    </div>

                    {loading ? (
                        <Skeleton height={340} radius={14} />
                    ) : (
                        <div className="cal-grid">
                            {cells.map(({ date, inMonth }) => {
                                const key = ymd(date);
                                const list = byDay.get(key) || [];
                                const isToday = key === ymd(today);
                                const isSelected = key === selected;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className={`cal-day${inMonth ? '' : ' is-out'}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                                        onClick={() => setSelected(key)}
                                    >
                                        <span className="cal-daynum">{date.getDate()}</span>
                                        <span className="cal-chips">
                                            {list.slice(0, 2).map(e => (
                                                <span
                                                    key={e.eventId}
                                                    className="cal-chip"
                                                    style={{ background: STATUS_COLORS[e.status] || '#94a3b8' }}
                                                    title={`${e.eventName} · ${e.location}`}
                                                >
                                                    {e.eventName}
                                                </span>
                                            ))}
                                            {list.length > 2 && (
                                                <span className="cal-more">+{list.length - 2}</span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="cal-legend">
                        {Object.entries(STATUS_COLORS).map(([status, color]) => (
                            <span key={status} className="cal-legend-item">
                                <span className="cal-legend-dot" style={{ background: color }} />
                                {status}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="card cal-side">
                    <div className="card-header">
                        <h3 className="card-title">
                            <CalendarDays size={16} />{' '}
                            {new Date(selected).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </h3>
                        <Badge variant={selectedEvents.length ? 'primary' : 'muted'}>
                            {selectedEvents.length} {plural(selectedEvents.length, ['событие', 'события', 'событий'])}
                        </Badge>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2].map(i => <Skeleton key={i} height={70} radius={12} />)}
                        </div>
                    ) : selectedEvents.length === 0 ? (
                        <EmptyState
                            illustration={<IllCalendar size={90} />}
                            title="Событий нет"
                            text="Выберите другой день или загляните в «Мероприятия»"
                            action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/events')}>Все мероприятия</button>}
                        />
                    ) : (
                        <div className="upcoming-list">
                            {selectedEvents.map(e => {
                                const d = new Date(e.dateStart);
                                const day = d.getDate().toString().padStart(2, '0');
                                const mon = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
                                return (
                                <motion.div
                                    key={e.eventId}
                                    className="upcoming-item"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => navigate('/events')}
                                >
                                    <div className="upcoming-thumb">
                                        <img src={posterFor(e.eventTypeId)} alt="" />
                                        <span className="thumb-date">{day} {mon}</span>
                                    </div>
                                    <div className="upcoming-info">
                                        <div className="upcoming-title" title={e.eventName}>{e.eventName}</div>
                                        <div className="upcoming-meta">
                                            <span><MapPin size={12} /> {e.location}</span>
                                            <span className="dot-sep">·</span>
                                            <span><Users size={12} /> {e.assignmentsCount}</span>
                                        </div>
                                        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span
                                                style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: STATUS_COLORS[e.status] || '#94a3b8'
                                                }}
                                            />
                                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.status}</span>
                                        </div>
                                    </div>
                                </motion.div>
                                );
                            })}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                                <Circle size={8} fill="currentColor" strokeWidth={0} />
                                Нажмите на событие, чтобы открыть список мероприятий
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
