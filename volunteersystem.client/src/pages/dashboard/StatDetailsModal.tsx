import { useMemo, useState } from 'react';
import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import Modal from '../../components/Modal';
import { Badge } from '../../components/ui';
import type { Assignment, EventItem } from '../../types';
import type { VolunteerSkill } from '../../api/skills';
import { getBadges, type VolunteerLevel } from '../../utils/level';
import { formatHours, plural } from '../../utils/format';
import { calcMonthly, HoursChart } from './common';
import { sortRows, SortChips, type SortState } from './sortChips';
import { isLanguageLevel, skillLevelVariant } from '../../utils/skillLevels';
import {
    Clock, CalendarCheck, Award, Trophy, BadgeCheck, Target,
    Languages, Wrench, TrendingUp, CalendarClock, CheckCircle2
} from 'lucide-react';

export type StatDetailKind = 'hours' | 'assignments' | 'skills' | 'level';

interface Props {
    kind: StatDetailKind;
    onClose: () => void;
    assignments: Assignment[];
    events: EventItem[];
    skills: VolunteerSkill[];
    totalHours: number;
    level: VolunteerLevel;
    /** Переопределение заголовка модалки (например, для админки). */
    title?: string;
}

const TITLES: Record<StatDetailKind, string> = {
    hours: 'Мои часы — подробная статистика',
    assignments: 'Мои назначения — подробная статистика',
    skills: 'Мои навыки — подробная статистика',
    level: 'Уровень — подробная статистика'
};

const LEVEL_ORDER = [
    { key: 'novice', label: 'Новичок', min: 0 },
    { key: 'activist', label: 'Активист', min: 10 },
    { key: 'mentor', label: 'Наставник', min: 50 },
    { key: 'hero', label: 'Герой', min: 100 }
];

const cardStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderRadius: 12,
    background: 'var(--surface-2)',
    border: '1px solid var(--border)'
};

const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 10,
    marginBottom: 18
};

const sectionTitle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    margin: '0 0 10px',
    fontSize: 14,
    fontWeight: 700
};

const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
};

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

export function SummaryBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
        <div style={cardStyle}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                {label}
            </div>
            <div className="num" style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{value}</div>
            {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{hint}</div>}
        </div>
    );
}

export function AssignmentRow({ a }: { a: Assignment }) {
    const future = new Date(a.eventDateStart) >= new Date();
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)'
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center',
                background: future ? 'var(--primary-soft)' : 'var(--surface-3)',
                color: future ? 'var(--primary)' : 'var(--text-3)', flex: '0 0 auto'
            }}>
                {future ? <CalendarClock size={15} /> : <CheckCircle2 size={15} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.eventName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {fmtDate(a.eventDateStart)} · {a.roleName || 'волонтёр'}
                </div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>
                    {a.hoursActual != null ? formatHours(a.hoursActual) : '—'}
                </div>
                <Badge variant={a.confirmed ? 'success' : 'warning'}>
                    {a.confirmed ? 'Подтверждено' : 'Ожидает'}
                </Badge>
            </div>
        </div>
    );
}

export default function StatDetailsModal({
    kind, onClose, assignments, events, skills, totalHours, level, title
}: Props) {
    const [typeSort, setTypeSort] = useState<SortState>({ key: 'hours', dir: -1 });
    const [recentSort, setRecentSort] = useState<SortState>({ key: 'date', dir: -1 });
    const [upSort, setUpSort] = useState<SortState>({ key: 'date', dir: 1 });
    const [pastSort, setPastSort] = useState<SortState>({ key: 'date', dir: -1 });

    const monthly = useMemo(() => calcMonthly(assignments), [assignments]);
    const confirmedHours = useMemo(
        () => assignments.filter(a => a.confirmed).reduce((s, a) => s + Number(a.hoursActual || 0), 0),
        [assignments]
    );
    const confirmedCount = useMemo(() => assignments.filter(a => a.confirmed).length, [assignments]);
    const upcoming = useMemo(
        () => sortRows(
            assignments.filter(a => new Date(a.eventDateStart) >= new Date()),
            upSort,
            {
                date: a => new Date(a.eventDateStart).getTime(),
                hours: a => Number(a.hoursActual || 0),
                name: a => a.eventName,
            }
        ),
        [assignments, upSort]
    );
    const past = useMemo(
        () => sortRows(
            assignments.filter(a => new Date(a.eventDateStart) < new Date()),
            pastSort,
            {
                date: a => new Date(a.eventDateStart).getTime(),
                hours: a => Number(a.hoursActual || 0),
                name: a => a.eventName,
            }
        ),
        [assignments, pastSort]
    );
    const recent = useMemo(
        () => sortRows(assignments, recentSort, {
            date: a => new Date(a.eventDateStart).getTime(),
            hours: a => Number(a.hoursActual || 0),
            name: a => a.eventName,
        }).slice(0, 6),
        [assignments, recentSort]
    );

    const byType = useMemo(() => {
        const eventType = new Map(events.map(e => [e.eventId, e.eventTypeName || 'Другое']));
        const map = new Map<string, { hours: number; count: number }>();
        assignments.forEach(a => {
            const name = eventType.get(a.eventId) || 'Другое';
            const row = map.get(name) || { hours: 0, count: 0 };
            row.hours += Number(a.hoursActual || 0);
            row.count += 1;
            map.set(name, row);
        });
        return [...map.entries()].map(([name, v]) => ({ name, ...v }));
    }, [assignments, events]);

    const sortedByType = useMemo(
        () => sortRows(byType, typeSort, {
            hours: t => t.hours,
            count: t => t.count,
        }),
        [byType, typeSort]
    );
    const maxTypeHours = useMemo(
        () => byType.reduce((m, t) => Math.max(m, t.hours), 0),
        [byType]
    );

    const monthlyCounts = useMemo(() => {
        const now = new Date();
        const buckets = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
            return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''), count: 0 };
        });
        const index = new Map(buckets.map((b, i) => [b.key, i]));
        assignments.forEach(a => {
            const d = new Date(a.eventDateStart);
            const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
            if (i !== undefined) buckets[i].count += 1;
        });
        return buckets;
    }, [assignments]);

    const languages = useMemo(() => skills.filter(s => isLanguageLevel(s.level)), [skills]);
    const skillsOnly = useMemo(() => skills.filter(s => !isLanguageLevel(s.level)), [skills]);
    const confirmedSkills = useMemo(() => skills.filter(s => s.yearConfirmed != null).length, [skills]);
    const badges = getBadges(totalHours);

    return (
        <Modal open title={title || TITLES[kind]} onClose={onClose} wide>
            {kind === 'hours' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Всего часов" value={formatHours(totalHours)} hint="по всем назначениям" />
                        <SummaryBox label="Подтверждено" value={formatHours(confirmedHours)} hint={`${confirmedCount} ${plural(confirmedCount, ['назначение', 'назначения', 'назначений'])}`} />
                        <SummaryBox label="Мероприятий" value={new Set(assignments.map(a => a.eventId)).size} hint="уникальных событий" />
                        <SummaryBox label="В среднем" value={formatHours(assignments.length ? totalHours / assignments.length : 0)} hint="за мероприятие" />
                    </div>

                    <h4 style={sectionTitle}><TrendingUp size={15} /> Часы по месяцам</h4>
                    <HoursChart data={monthly.buckets} />

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><Clock size={15} /> По типам мероприятий</h4>
                    <SortChips
                        options={[
                            { key: 'hours', label: 'По часам' },
                            { key: 'count', label: 'По числу' },
                        ]}
                        value={typeSort}
                        onChange={setTypeSort}
                    />
                    {sortedByType.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Пока нет данных.</div>
                    ) : (
                        <div style={listStyle}>
                            {sortedByType.map(t => {
                                const max = maxTypeHours || 1;
                                return (
                                    <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ width: 120, fontSize: 12, color: 'var(--text-2)' }}>{t.name}</span>
                                        <div className="progress" style={{ flex: 1 }}>
                                            <div className="progress-fill" style={{ width: `${max > 0 ? (t.hours / max) * 100 : 0}%` }} />
                                        </div>
                                        <span className="num" style={{ fontSize: 12, width: 70, textAlign: 'right' }}>
                                            {formatHours(t.hours)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><CalendarCheck size={15} /> Последние назначения</h4>
                    <SortChips
                        options={[
                            { key: 'date', label: 'По дате' },
                            { key: 'hours', label: 'По часам' },
                            { key: 'name', label: 'По названию' },
                        ]}
                        value={recentSort}
                        onChange={setRecentSort}
                    />
                    <div style={listStyle}>
                        {recent.map(a => <AssignmentRow key={a.assignmentId} a={a} />)}
                    </div>
                </>
            )}

            {kind === 'assignments' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Всего" value={assignments.length} hint="назначений" />
                        <SummaryBox label="Предстоящих" value={upcoming.length} hint="ещё впереди" />
                        <SummaryBox label="Завершённых" value={past.length} hint="уже прошли" />
                        <SummaryBox label="Подтверждено" value={confirmedCount} hint="назначений подтверждено" />
                    </div>

                    <h4 style={sectionTitle}><CalendarCheck size={15} /> Назначения по месяцам</h4>
                    <ResponsiveContainer width="100%" height={190}>
                        <BarChart data={monthlyCounts} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border-2)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    color: 'var(--text)'
                                }}
                                labelStyle={{ color: 'var(--text-2)' }}
                                formatter={(value) => [value, 'Назначений']}
                            />
                            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><CalendarClock size={15} /> Предстоящие</h4>
                    <SortChips
                        options={[
                            { key: 'date', label: 'По дате' },
                            { key: 'hours', label: 'По часам' },
                            { key: 'name', label: 'По названию' },
                        ]}
                        value={upSort}
                        onChange={setUpSort}
                    />
                    {upcoming.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Предстоящих назначений нет.</div>
                    ) : (
                        <div style={listStyle}>{upcoming.map(a => <AssignmentRow key={a.assignmentId} a={a} />)}</div>
                    )}

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><CheckCircle2 size={15} /> История</h4>
                    <SortChips
                        options={[
                            { key: 'date', label: 'По дате' },
                            { key: 'hours', label: 'По часам' },
                            { key: 'name', label: 'По названию' },
                        ]}
                        value={pastSort}
                        onChange={setPastSort}
                    />
                    {past.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Завершённых назначений пока нет.</div>
                    ) : (
                        <div style={listStyle}>{past.map(a => <AssignmentRow key={a.assignmentId} a={a} />)}</div>
                    )}
                </>
            )}

            {kind === 'skills' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Всего навыков" value={skills.length} hint="в профиле" />
                        <SummaryBox label="Языков" value={languages.length} hint="языковых уровней" />
                        <SummaryBox label="Умений" value={skillsOnly.length} hint="профессиональных" />
                        <SummaryBox label="Подтверждено" value={confirmedSkills} hint="с указанием года" />
                    </div>

                    <h4 style={sectionTitle}><Award size={15} /> Профиль навыков</h4>
                    {skills.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                            Навыки пока не добавлены — попросите менеджера внести их в профиль.
                        </div>
                    ) : (
                        <div style={listStyle}>
                            {skills.map(s => {
                                const lang = isLanguageLevel(s.level);
                                return (
                                    <div key={s.skillId} style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                        borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)'
                                    }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center',
                                            background: 'var(--primary-soft)', color: 'var(--primary)', flex: '0 0 auto'
                                        }}>
                                            {lang ? <Languages size={15} /> : <Wrench size={15} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.skillName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                                {lang ? 'Языковой уровень' : 'Умение'}
                                                {s.yearConfirmed ? ` · подтверждён в ${s.yearConfirmed}` : ''}
                                            </div>
                                        </div>
                                        <Badge variant={skillLevelVariant(s.level)}>{s.level}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {kind === 'level' && (
                <>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                        borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 18
                    }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center',
                            background: 'var(--warning-soft)', color: 'var(--warning)', flex: '0 0 auto'
                        }}>
                            <Trophy size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Текущий уровень</div>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{level.label}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{formatHours(totalHours)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>отработано</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                        <span>
                            {level.nextAt
                                ? `До «${LEVEL_ORDER.find(l => l.min === level.nextAt)?.label || 'следующего уровня'}»`
                                : 'Максимальный уровень достигнут'}
                        </span>
                        <span className="num">
                            {formatHours(totalHours)}{level.nextAt ? ` / ${level.nextAt} ч` : ''}
                        </span>
                    </div>
                    <div className="progress">
                        <div className="progress-fill" style={{ width: `${level.progress * 100}%` }} />
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><Target size={15} /> Лестница уровней</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {LEVEL_ORDER.map(l => {
                            const done = totalHours >= l.min;
                            return (
                                <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                    <span style={{
                                        width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center',
                                        background: done ? 'var(--success-soft)' : 'var(--surface-2)',
                                        color: done ? 'var(--success)' : 'var(--text-3)', flex: '0 0 auto'
                                    }}>
                                        {done ? <BadgeCheck size={14} /> : <Target size={13} />}
                                    </span>
                                    <span style={{ color: done ? 'var(--text)' : 'var(--text-3)', flex: 1 }}>{l.label}</span>
                                    <span className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>{l.min}+ ч</span>
                                </div>
                            );
                        })}
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><Award size={15} /> Значки</h4>
                    {badges.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
                            Первый значок — за 10 отработанных часов. У вас пока {formatHours(totalHours)}.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {badges.map(b => (
                                <Badge key={b} variant="warning">
                                    <Trophy size={11} style={{ marginRight: 4 }} />{b}
                                </Badge>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
}
