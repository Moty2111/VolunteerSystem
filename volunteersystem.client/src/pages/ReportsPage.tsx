import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { reportsApi } from '../api/reports';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, Skeleton, Button } from '../components/ui';
import { IllBarChart } from '../components/illustrations';
import {
    BarChart3, Download, Search, Users, Clock, Briefcase, Award
} from 'lucide-react';

type Tab = 'summary' | 'rating' | 'partners' | 'hours' | 'audit';

interface SummaryRow {
    volunteer_id: number;
    full_name: string;
    city: string;
    events_count: number;
    total_hours: number;
}

interface RatingRow extends SummaryRow {
    rating: number;
}

interface HoursRow {
    full_name: string;
    city: string;
    events_count: number;
    total_hours: number;
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Сводка', icon: <Users size={ 14} /> },
{ key: 'rating', label: 'Рейтинг', icon: <Award size={ 14 } /> },
{ key: 'hours', label: 'Часы', icon: <Clock size={ 14 } /> },
{ key: 'partners', label: 'Партнёры', icon: <Briefcase size={ 14 } /> },
{ key: 'audit', label: 'Аудит', icon: <BarChart3 size={ 14 } /> }
];

function toCSV(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const lines = [
        headers.join(','),
        ...rows.map(r => headers.map(h => escape(r[h])).join(','))
    ];
    return '\uFEFF' + lines.join('\n');
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const CHART_COLORS = ['#14a37f', '#4f7cff', '#ff7a59', '#a78bfa', '#f59e0b', '#06b6d4'];

export default function ReportsPage() {
    const toast = useToast();
    const [tab, setTab] = useState<Tab>('summary');
    const [data, setData] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return d.toISOString().slice(0, 10);
    });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            let result: Record<string, unknown>[];
            switch (tab) {
                case 'summary': result = (await reportsApi.volunteerSummary()) as Record<string, unknown>[]; break;
                case 'rating': result = (await reportsApi.volunteerRating()) as Record<string, unknown>[]; break;
                case 'partners': result = (await reportsApi.partnerReport()) as Record<string, unknown>[]; break;
                case 'hours': result = (await reportsApi.hours(from, to)) as Record<string, unknown>[]; break;
                case 'audit': result = (await reportsApi.auditLog(200)) as Record<string, unknown>[]; break;
            }
            setData(result);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [tab]);

    const filtered = useMemo(() => {
        if (!search) return data;
        const q = search.toLowerCase();
        return data.filter(row =>
            Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
        );
    }, [data, search]);

    const kpi = useMemo(() => {
        if (filtered.length === 0) return null;
        const hoursKey = Object.keys(filtered[0]).find(k => k.toLowerCase().includes('hours'));
        const eventsKey = Object.keys(filtered[0]).find(k => k.toLowerCase().includes('events'));
        const totalHours = hoursKey
            ? filtered.reduce((s, r) => s + Number(r[hoursKey] || 0), 0)
            : 0;
        const totalEvents = eventsKey
            ? filtered.reduce((s, r) => s + Number(r[eventsKey] || 0), 0)
            : 0;
        return {
            rows: filtered.length,
            totalHours,
            totalEvents,
            avgHours: filtered.length ? totalHours / filtered.length : 0
        };
    }, [filtered]);

    const chartData = useMemo(() => {
        if (tab === 'summary' || tab === 'rating') {
            return filtered
                .map(r => ({
                    name: String(r.full_name || ''),
                    hours: Number(r.total_hours || 0),
                    events: Number(r.events_count || 0)
                }))
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 8);
        }
        if (tab === 'partners') {
            return filtered.slice(0, 8).map(r => ({
                name: String(r.partner_name || ''),
                amount: Number(r.allocated_amount || r.total_support || 0)
            }));
        }
        return [];
    }, [filtered, tab]);

    const handleExport = () => {
        if (filtered.length === 0) {
            toast.info('Нет данных для экспорта');
            return;
        }
        const filename = `volunteer-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
        downloadCSV(filename, filtered);
        toast.success('CSV скачан');
    };

    const headers = filtered.length > 0 ? Object.keys(filtered[0]) : [];

    return (
        <div>
        <div className= "page-header" >
        <div>
        <h1 className="page-title" > Отчёты </h1>
            < p className = "page-subtitle" >
                Аналитика по волонтёрам, мероприятиям и партнёрам
                    </p>
                    </div>
                    < button className = "btn btn-secondary" onClick = { handleExport } disabled = { filtered.length === 0 } >
                        <Download size={ 16 } /> Экспорт CSV
                            </button>
                            </div>

    {/* TABS */ }
    <div className="tabs" >
    {
        TABS.map(t => (
            <button
            key= { t.key }
            className = {`tab ${tab === t.key ? 'active' : ''}`}
    onClick = {() => setTab(t.key)
}
style = {{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
{ t.icon } { t.label }
</button>
        ))}
</div>

{/* FILTERS */ }
<div className="filter-bar" >
    <div className="input-icon-wrap" style = {{ minWidth: 280 }}>
        <span className="input-icon" > <Search size={ 15 } /></span >
            <input
            className="input"
placeholder = "Поиск по отчёту…"
value = { search }
onChange = { e => setSearch(e.target.value) }
    />
    </div>
{
    tab === 'hours' && (
        <>
        <label style={ { color: 'var(--text-2)', alignSelf: 'center', fontSize: 13 } }> С: </label>
            < input type = "date" className = "input" value = { from } onChange = { e => setFrom(e.target.value) } />
                <label style={ { color: 'var(--text-2)', alignSelf: 'center', fontSize: 13 } }> По: </label>
                    < input type = "date" className = "input" value = { to } onChange = { e => setTo(e.target.value) } />
                        <button className="btn btn-primary" onClick = { load } >
                            <Search size={ 14 } /> Обновить
                                </button>
                                </>
        )
}
</div>

{/* KPI */ }
{
    !loading && kpi && (
        <div className="stat-grid" style = {{ marginBottom: 20 }
}>
    <div className="stat-card" style = {{ ['--accent-color' as string]: 'var(--primary)' }}>
        <span className="accent-bar" />
            <div className="stat-card-head" >
                <div className="stat-card-label" > Записей </div>
                    < div className = "stat-card-icon" > <BarChart3 size={ 20 } /></div >
                        </div>
                        < div className = "stat-card-value num" > { kpi.rows } </div>
                            </div>
{
    kpi.totalHours > 0 && (
        <div className="stat-card" style = {{ ['--accent-color' as string]: 'var(--success)' }
}>
    <span className="accent-bar" />
        <div className="stat-card-head" >
            <div className="stat-card-label" > Часов всего </div>
                < div className = "stat-card-icon" > <Clock size={ 20 } /></div >
                    </div>
                    < div className = "stat-card-value num" > { kpi.totalHours.toFixed(1) } </div>
                        </div>
          )}
{
    kpi.totalEvents > 0 && (
        <div className="stat-card" style = {{ ['--accent-color' as string]: 'var(--purple)' }
}>
    <span className="accent-bar" />
        <div className="stat-card-head" >
            <div className="stat-card-label" > Участий </div>
                < div className = "stat-card-icon" > <Users size={ 20 } /></div >
                    </div>
                    < div className = "stat-card-value num" > { kpi.totalEvents } </div>
                        </div>
          )}
{
    kpi.avgHours > 0 && (
        <div className="stat-card" style = {{ ['--accent-color' as string]: 'var(--warning)' }
}>
    <span className="accent-bar" />
        <div className="stat-card-head" >
            <div className="stat-card-label" > Среднее </div>
                < div className = "stat-card-icon" > <Award size={ 20 } /></div >
                    </div>
                    < div className = "stat-card-value num" > { kpi.avgHours.toFixed(1) } ч </div>
                        </div>
          )}
</div>
      )}

{/* CHARTS */ }
{
    !loading && chartData.length > 0 && (
        <div className="card" style = {{ marginBottom: 20 }
}>
    <div className="card-header" >
        <h3 className="card-title" >
            <BarChart3 size={ 16 } />
{ tab === 'partners' ? 'Суммы поддержки по партнёрам' : 'Топ-8 по показателю' }
</h3>
    </div>
    < ResponsiveContainer width = "100%" height = { 260} >
    { tab === 'partners' ? (
        <BarChart data= { chartData } margin = {{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke = "var(--border)" vertical = { false} />
                <XAxis
                  dataKey="name"
tick = {{ fill: 'var(--text-3)', fontSize: 11 }}
axisLine = { false}
tickLine = { false}
interval = { 0}
angle = {- 15}
textAnchor = "end"
height = { 60}
    />
    <YAxis tick={ { fill: 'var(--text-3)', fontSize: 11 } } axisLine = { false} tickLine = { false} />
        <Tooltip
                  contentStyle={
    {
        background: 'var(--surface)',
            border: '1px solid var(--border-2)',
                borderRadius: 10,
                    fontSize: 12,
                        color: 'var(--text)'
    }
}
formatter = {(v: number) => [`${v.toLocaleString('ru-RU')} ₽`, 'Сумма']}
                />
    < Bar dataKey = "amount" fill = "#14a37f" radius = { [6, 6, 0, 0]} />
        </BarChart>
            ) : (
    <LineChart data= { chartData } margin = {{ top: 10, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke = "var(--border)" vertical = { false} />
            <XAxis
                  dataKey="name"
tick = {{ fill: 'var(--text-3)', fontSize: 11 }}
axisLine = { false}
tickLine = { false}
interval = { 0}
angle = {- 15}
textAnchor = "end"
height = { 60}
    />
    <YAxis tick={ { fill: 'var(--text-3)', fontSize: 11 } } axisLine = { false} tickLine = { false} />
        <Tooltip
                  contentStyle={
    {
        background: 'var(--surface)',
            border: '1px solid var(--border-2)',
                borderRadius: 10,
                    fontSize: 12,
                        color: 'var(--text)'
    }
}
                />
    < Line
type = "monotone"
dataKey = "hours"
stroke = "#14a37f"
strokeWidth = { 2.5}
dot = {{ r: 4, fill: '#14a37f' }}
activeDot = {{ r: 6 }}
                />
    </LineChart>
            )}
</ResponsiveContainer>
    </div>
      )}

{/* TABLE */ }
{
    loading ? (
        <div style= {{ display: 'flex', flexDirection: 'column', gap: 8 }
}>
{ [1, 2, 3, 4, 5].map(i => <Skeleton key={ i } height = { 44} radius = { 10} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllBarChart size={ 110 } /> }
title = "Нет данных"
text = "Измените фильтры или период, либо добавьте записи"
    />
    </div>
      ) : (
    <div className= "table-wrap" >
    <table>
    <thead>
    <tr>
    <th style={ { width: 50 } }># </th>
{
    headers.map(h => (
        <th key= { h } style = {{
        textTransform: 'none',
        letterSpacing: 0,
        fontSize: 12,
        color: 'var(--text-2)'
    }}> { h } </th>
                ))}
</tr>
    </thead>
    <tbody>
{
    filtered.map((row, i) => (
        <motion.tr
                  key= { i }
                  initial = {{ opacity: 0 }}
animate = {{ opacity: 1 }}
transition = {{ delay: Math.min(i * 0.015, 0.3) }}
                >
    <td style={ { color: 'var(--text-3)', fontSize: 12 } }> { i + 1}</td>
{
    headers.map(h => {
        const v = row[h];
        const isNum = typeof v === 'number';
        return (
            <td key= { h } className = { isNum? 'num': '' } >
            {
                isNum
                    ?(v as number).toLocaleString('ru-RU')
                          : String(v ?? '—')
}
</td>
                    );
                  })}
</motion.tr>
              ))}
</tbody>
    </table>
    </div>
      )}
</div>
  );
}