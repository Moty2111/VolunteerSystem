import { useMemo, useState, type CSSProperties } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import Modal from '../../components/Modal';
import { HoursChart, calcMonthly, STATUS_COLORS, type VolunteerSummaryRow } from './common';
import { AssignmentRow, SummaryBox } from './StatDetailsModal';
import { sortRows, SortChips, type SortState } from './sortChips';
import type { Assignment, EventItem } from '../../types';
import { formatHours, plural } from '../../utils/format';
import { Briefcase, CalendarCheck, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';

export type AdminStatDetailKind = 'volunteers' | 'participations' | 'hours' | 'partners' | 'events' | 'pending';

interface Props {
    kind: AdminStatDetailKind;
    onClose: () => void;
    volunteers?: VolunteerSummaryRow[];
    partners?: unknown[];
    assignments?: Assignment[];
    events?: EventItem[];
    totalHours: number;
}

const TITLES: Record<AdminStatDetailKind, string> = {
    volunteers: 'Волонтёры — подробная статистика',
    participations: 'Участия — подробная статистика',
    hours: 'Часы отработано — подробная статистика',
    partners: 'Партнёры — подробная статистика',
    events: 'Мероприятия — подробная статистика',
    pending: 'Назначения на подтверждении — подробная статистика'
};

const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 10,
    marginBottom: 18
};

const sectionTitle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    margin: '0 0 10px',
    fontSize: 14,
    fontWeight: 700
};

const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
};

interface PartnerRow {
    partner_name: string;
    inn: string | null;
    contract_number: string | null;
    total_support: number | null;
    events_supported: number;
    allocated_amount: number;
}

function toPartnerRows(list: unknown[] | undefined): PartnerRow[] {
    if (!list) return [];
    const rows: PartnerRow[] = [];
    for (const item of list) {
        const p = (item ?? {}) as Record<string, unknown>;
        rows.push({
            partner_name: String(p.partner_name ?? p.partnerName ?? ''),
            inn: p.inn != null ? String(p.inn) : null,
            contract_number: p.contract_number != null ? String(p.contract_number) : null,
            total_support: p.total_support != null ? Number(p.total_support) : null,
            events_supported: Number(p.events_supported ?? 0),
            allocated_amount: Number(p.allocated_amount ?? p.total_support ?? 0)
        });
    }
    return rows;
}

export default function AdminStatDetailsModal({
    kind, onClose, volunteers, partners, assignments, events, totalHours
}: Props) {
    const [volSort, setVolSort] = useState<SortState>({ key: 'hours', dir: -1 });
    const [partnerSort, setPartnerSort] = useState<SortState>({ key: 'allocated', dir: -1 });
    const [typeSort, setTypeSort] = useState<SortState>({ key: 'hours', dir: -1 });
    const [upSort, setUpSort] = useState<SortState>({ key: 'date', dir: 1 });
    const [pendSort, setPendSort] = useState<SortState>({ key: 'date', dir: 1 });

    const volunteerRows = useMemo(() => [...(volunteers || [])], [volunteers]);
    const sortedVolunteers = useMemo(
        () => sortRows(volunteerRows, volSort, {
            hours: r => Number(r.total_hours || 0),
            parts: r => Number(r.events_count || 0),
            name: r => r.full_name,
        }),
        [volunteerRows, volSort]
    );
    const maxVolHours = useMemo(
        () => volunteerRows.reduce((m, r) => Math.max(m, Number(r.total_hours || 0)), 0),
        [volunteerRows]
    );
    const partnerRows = useMemo(() => toPartnerRows(partners), [partners]);
    const sortedPartnerRows = useMemo(
        () => sortRows(partnerRows, partnerSort, {
            allocated: p => Number(p.allocated_amount || 0),
            events: p => p.events_supported,
            name: p => p.partner_name,
        }),
        [partnerRows, partnerSort]
    );
    const confirmedAssignments = useMemo(() => (assignments || []).filter(a => a.confirmed), [assignments]);
    const pendingAssignments = useMemo(() => (assignments || []).filter(a => !a.confirmed), [assignments]);
    const pendingSorted = useMemo(
        () => sortRows(pendingAssignments, pendSort, {
            date: a => new Date(a.eventDateStart).getTime(),
            hours: a => Number(a.hoursActual || 0),
        }),
        [pendingAssignments, pendSort]
    );
    const monthly = useMemo(() => calcMonthly(assignments || []), [assignments]);

    const totalVolunteerHours = volunteerRows.reduce((s, r) => s + Number(r.total_hours || 0), 0);
    const totalVolunteerParts = volunteerRows.reduce((s, r) => s + Number(r.events_count || 0), 0);
    const totalPartnerEvents = partnerRows.reduce((s, p) => s + p.events_supported, 0);
    const totalPartnerSupport = partnerRows.reduce((s, p) => s + Number(p.total_support || 0), 0);
    const totalPartnerAllocated = partnerRows.reduce((s, p) => s + Number(p.allocated_amount || 0), 0);

    const byType = useMemo(() => {
        const eventType = new Map(events.map(e => [e.eventId, e.eventTypeName || 'Другое']));
        const map = new Map<string, { hours: number; count: number }>();
        (assignments || []).forEach(a => {
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
            return {
                key: `${d.getFullYear()}-${d.getMonth()}`,
                month: d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''),
                count: 0
            };
        });
        const index = new Map(buckets.map((b, i) => [b.key, i]));
        (assignments || []).forEach(a => {
            const d = new Date(a.eventDateStart);
            const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
            if (i !== undefined) buckets[i].count += 1;
        });
        return buckets;
    }, [assignments]);

    const confirmedHours = confirmedAssignments.reduce((s, a) => s + Number(a.hoursActual || 0), 0);
    const upcoming = useMemo(
        () => sortRows(
            [...confirmedAssignments].filter(a => new Date(a.eventDateStart) >= new Date()),
            upSort,
            {
                date: a => new Date(a.eventDateStart).getTime(),
                hours: a => Number(a.hoursActual || 0),
                name: a => a.eventName,
            }
        ).slice(0, 8),
        [confirmedAssignments, upSort]
    );

    const topPartners = sortedPartnerRows.slice(0, 8);

    return (
        <Modal open title={TITLES[kind]} onClose={onClose} wide>
            {kind === 'volunteers' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Волонтёров" value={volunteerRows.length} hint="в команде" />
                        <SummaryBox label="Участий" value={totalVolunteerParts} hint="подтверждено" />
                        <SummaryBox label="Часов отработано" value={formatHours(totalVolunteerHours)} hint="по всем волонтёрам" />
                        <SummaryBox
                            label="Средний час"
                            value={volunteerRows.length ? formatHours(totalVolunteerHours / volunteerRows.length) : '—'}
                            hint="на одного волонтёра"
                        />
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 4 }}><TrendingUp size={15} /> Топ волонтёров</h4>
                    <SortChips
                        options={[
                            { key: 'hours', label: 'По часам' },
                            { key: 'parts', label: 'По участиям' },
                            { key: 'name', label: 'По имени' },
                        ]}
                        value={volSort}
                        onChange={setVolSort}
                    />
                    {sortedVolunteers.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Пока нет данных о волонтёрах.</div>
                    ) : (
                        <div style={listStyle}>
                            {sortedVolunteers.slice(0, 10).map((v, i) => {
                                const hours = Number(v.total_hours || 0);
                                const max = maxVolHours || 0;
                                const placeClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                                return (
                                    <div key={v.volunteer_id} style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                        borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)'
                                    }}>
                                        <div className={`leader-place ${placeClass}`}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {v.full_name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                                {v.city}
                                            </div>
                                            <div className="progress" style={{ marginTop: 6 }}>
                                                <div className="progress-fill" style={{ width: `${max > 0 ? (hours / max) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                        <div className={`leader-hours num ${hours === 0 ? 'zero' : ''}`}>
                                            {hours > 0 ? formatHours(hours) : '0 ч'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {kind === 'participations' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Участий" value={confirmedAssignments.length} hint="подтверждено" />
                        <SummaryBox label="Ожидают" value={pendingAssignments.length} hint="подтверждения" />
                        <SummaryBox label="Мероприятий" value={new Set(confirmedAssignments.map(a => a.eventId)).size} hint="уникальных" />
                        <SummaryBox label="В среднем" value={confirmedAssignments.length ? formatHours(confirmedHours / confirmedAssignments.length) : '—'} hint="за участие" />
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 4 }}><CalendarCheck size={15} /> Участия по месяцам</h4>
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
                                formatter={(value) => [value, 'Участий']}
                            />
                            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><CalendarCheck size={15} /> Предстоящие</h4>
                    <SortChips
                        options={[
                            { key: 'date', label: 'По дате' },
                            { key: 'hours', label: 'По часам' },
                        ]}
                        value={upSort}
                        onChange={setUpSort}
                    />
                    {upcoming.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Предстоящих участий пока нет.</div>
                    ) : (
                        <div style={listStyle}>{upcoming.map(a => <AssignmentRow key={a.assignmentId} a={a} />)}</div>
                    )}
                </>
            )}

            {kind === 'hours' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Всего часов" value={formatHours(totalHours)} hint="по всем волонтёрам" />
                        <SummaryBox label="Подтверждено" value={formatHours(confirmedHours)} hint={`${confirmedAssignments.length} ${plural(confirmedAssignments.length, ['участие', 'участия', 'участий'])}`} />
                        <SummaryBox label="Мероприятий" value={new Set((assignments || []).map(a => a.eventId)).size} hint="уникальных" />
                        <SummaryBox label="В среднем" value={confirmedAssignments.length ? formatHours(confirmedHours / confirmedAssignments.length) : '—'} hint="за мероприятие" />
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 4 }}><TrendingUp size={15} /> Часы по месяцам</h4>
                    <HoursChart data={monthly.buckets} />

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><TrendingUp size={15} /> По типам мероприятий</h4>
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
                </>
            )}

            {kind === 'partners' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Партнёров" value={partnerRows.length} hint="в базе" />
                        <SummaryBox label="Мероприятий" value={totalPartnerEvents} hint="поддержано" />
                        <SummaryBox label="Сумма поддержки" value={Math.round(totalPartnerSupport).toLocaleString('ru-RU')} hint="₽" />
                        <SummaryBox label="Распределено" value={Math.round(totalPartnerAllocated).toLocaleString('ru-RU')} hint="₽" />
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 4 }}><Briefcase size={15} /> Выделено по партнёрам</h4>
                    <SortChips
                        options={[
                            { key: 'allocated', label: 'По сумме' },
                            { key: 'events', label: 'По событиям' },
                            { key: 'name', label: 'По имени' },
                        ]}
                        value={partnerSort}
                        onChange={setPartnerSort}
                    />
                    {topPartners.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Партнёры пока не добавлены.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={topPartners} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="partner_name" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border-2)',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        color: 'var(--text)'
                                    }}
                                    labelStyle={{ color: 'var(--text-2)' }}
                                    formatter={(value) => [Number(value).toLocaleString('ru-RU'), 'Выделено, ₽']}
                                />
                                <Bar dataKey="allocated_amount" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}

                    <h4 style={{ ...sectionTitle, marginTop: 20 }}><Briefcase size={15} /> Список партнёров</h4>
                    {sortedPartnerRows.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Партнёры пока не добавлены.</div>
                    ) : (
                        <div style={listStyle}>
                            {sortedPartnerRows.map(p => (
                                <div key={p.partner_name} style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                    borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center',
                                        background: 'var(--primary-soft)', color: 'var(--primary)', flex: '0 0 auto'
                                    }}>
                                        <Briefcase size={15} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 160 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.partner_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                            {p.inn && `ИНН ${p.inn}`}
                                            {p.inn && p.contract_number ? ' · ' : ''}
                                            {p.contract_number && `договор ${p.contract_number}`}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                        {p.events_supported} {plural(p.events_supported, ['мероприятие', 'мероприятия', 'мероприятий'])}
                                    </div>
                                    <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>
                                        {Math.round(Number(p.allocated_amount) || 0).toLocaleString('ru-RU')} ₽
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            {kind === 'events' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Всего мероприятий" value={events?.length || 0} hint="в системе" />
                        {['Запланировано', 'Идёт', 'Завершено', 'Отменено'].map(s => (
                            <SummaryBox
                                key={s}
                                label={s}
                                value={(events || []).filter(e => e.status === s).length}
                            />
                        ))}
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 4 }}><Calendar size={15} /> Распределение по статусам</h4>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={Object.entries(
                                    (events || []).reduce<Record<string, number>>((acc, e) => {
                                        acc[e.status] = (acc[e.status] || 0) + 1;
                                        return acc;
                                    }, {})
                                ).map(([status, count]) => ({ status, count }))}
                                dataKey="count"
                                nameKey="status"
                                innerRadius={40}
                                outerRadius={75}
                                paddingAngle={3}
                                stroke="none"
                            >
                                {Object.entries(
                                    (events || []).reduce<Record<string, number>>((acc, e) => {
                                        acc[e.status] = (acc[e.status] || 0) + 1;
                                        return acc;
                                    }, {})
                                ).map(([status]) => (
                                    <Cell key={status} fill={STATUS_COLORS[status] || '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border-2)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    color: 'var(--text)'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {['Запланировано', 'Идёт', 'Завершено', 'Отменено'].map(s => {
                            const count = (events || []).filter(e => e.status === s).length;
                            return (
                                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                                    <span style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: STATUS_COLORS[s] || '#94a3b8'
                                    }} />
                                    <span style={{ color: 'var(--text-2)', flex: 1 }}>{s}</span>
                                    <strong className="num">{count}</strong>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {kind === 'pending' && (
                <>
                    <div style={gridStyle}>
                        <SummaryBox label="Ожидают" value={pendingAssignments.length} hint="подтверждения часов" />
                        <SummaryBox
                            label="Предстоящих"
                            value={pendingAssignments.filter(a => new Date(a.eventDateStart) >= new Date()).length}
                            hint="запланированы"
                        />
                        <SummaryBox label="Мероприятий" value={new Set(pendingAssignments.map(a => a.eventId)).size} hint="уникальных" />
                        <SummaryBox
                            label="Волонтёров"
                            value={new Set(pendingAssignments.map(a => a.volunteerId)).size}
                            hint="в списке"
                        />
                    </div>

                    <h4 style={{ ...sectionTitle, marginTop: 4 }}><AlertTriangle size={15} /> Назначения без подтверждения</h4>
                    <SortChips
                        options={[
                            { key: 'date', label: 'По дате' },
                            { key: 'hours', label: 'По часам' },
                        ]}
                        value={pendSort}
                        onChange={setPendSort}
                    />
                    {pendingSorted.length === 0 ? (
                        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Все назначения подтверждены.</div>
                    ) : (
                        <div style={listStyle}>
                            {pendingSorted.map(a => <AssignmentRow key={a.assignmentId} a={a} />)}
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
}
