import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
    LabelList
} from 'recharts';
import { reportsApi } from '../api/reports';
import { useToast } from '../components/Toast';
import { EmptyState, Skeleton } from '../components/ui';
import { IllBarChart } from '../components/illustrations';
import { exportCSV, exportExcel, exportWord, exportPDF } from '../utils/export';
import {
    BarChart3, Users, Clock, Award, Download, FileText, FileSpreadsheet, File, Search
} from 'lucide-react';

type Tab = 'summary' | 'rating' | 'partners' | 'hours' | 'audit';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Сводка волонтёров', icon: <Users size={ 14} /> },
{ key: 'rating', label: 'Рейтинг', icon: <Award size={ 14 } /> },
{ key: 'hours', label: 'Часы за период', icon: <Clock size={ 14 } /> },
{ key: 'partners', label: 'Партнёры', icon: <BarChart3 size={ 14 } /> },
{ key: 'audit', label: 'Аудит', icon: <FileText size={ 14 } /> }
];

const CHART_COLORS = ['#14a37f', '#4f7cff', '#ff7a59', '#a78bfa', '#f59e0b', '#06b6d4'];

/* Русские названия колонок из БД/вьюх */
const COLUMN_LABELS: Record<string, string> = {
    volunteer_id: 'ID волонтёра',
    full_name: 'ФИО',
    city: 'Город',
    events_count: 'Мероприятий',
    total_hours: 'Часы',
    rating: 'Место',
    partner_name: 'Партнёр',
    contact_person: 'Контактное лицо',
    phone: 'Телефон',
    email: 'Email',
    inn: 'ИНН',
    allocated_amount: 'Получено, ₽',
    total_support: 'Сумма поддержки, ₽',
    log_id: 'ID записи',
    user_id: 'Пользователь',
    action: 'Действие',
    table_name: 'Таблица',
    record_id: 'ID записи',
    action_date: 'Дата и время'
};

const localizeRow = (row: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(row).map(([k, v]) => [COLUMN_LABELS[k] || k, v])
    );

export default function ReportsPage() {
    const toast = useToast();
    const [tab, setTab] = useState<Tab>('summary');
    const [data, setData] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 6);
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
        } finally { setLoading(false); }
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
        const ratingKey = Object.keys(filtered[0]).find(k => k.toLowerCase() === 'rating');
        const totalHours = hoursKey ? filtered.reduce((s, r) => s + Number(r[hoursKey] || 0), 0) : 0;
        const totalEvents = eventsKey ? filtered.reduce((s, r) => s + Number(r[eventsKey] || 0), 0) : 0;
        const avgRating = ratingKey ? filtered.reduce((s, r) => s + Number(r[ratingKey] || 0), 0) / filtered.length : 0;
        return {
            rows: filtered.length,
            totalHours,
            totalEvents,
            avgHours: filtered.length ? totalHours / filtered.length : 0,
            avgRating
        };
    }, [filtered]);

    // Специфичные данные для графиков — разные для каждой вкладки
    const chartData = useMemo<Array<{ name: string; hours?: number; amount?: number; events?: number }>>(() => {
        if (tab === 'summary') {
            // Сводка: столбцы по часам топ-8
            return filtered
                .map(r => ({
                    name: String(r.full_name || ''),
                    hours: Number(r.total_hours || 0)
                }))
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 8);
        }
        if (tab === 'rating') {
            // Рейтинг: линия с местами (топ-10 по rating, отображаем часы)
            return filtered
                .map(r => ({
                    name: `#${r.rating} ${r.full_name}`,
                    hours: Number(r.total_hours || 0),
                    events: Number(r.events_count || 0)
                }))
                .slice(0, 10);
        }
        if (tab === 'partners') {
            return filtered.slice(0, 8).map(r => ({
                name: String(r.partner_name || ''),
                amount: Number(r.allocated_amount || r.total_support || 0)
            }));
        }
        return [];
    }, [filtered, tab]);

    const displayRows = useMemo(() => filtered.map(localizeRow), [filtered]);

    const handleExport = async (format: 'csv' | 'excel' | 'word' | 'pdf') => {
        if (displayRows.length === 0) { toast.info('Нет данных для экспорта'); return; }
        const filename = `volunteer-${tab}-${new Date().toISOString().slice(0, 10)}`;
        const title = TABS.find(t => t.key === tab)?.label || 'Отчёт';
        if (format === 'csv') exportCSV(filename, displayRows);
        else if (format === 'excel') exportExcel(filename, displayRows);
        else if (format === 'word') exportWord(filename, displayRows, title);
        else {
            try {
                await exportPDF(filename, displayRows, title);
            } catch (e) {
                console.error('Экспорт PDF:', e);
                toast.error('Не удалось сформировать PDF — попробуйте ещё раз');
                return;
            }
        }
        toast.success(`Экспорт ${format.toUpperCase()} готов`);
    };

    const headers = displayRows.length > 0 ? Object.keys(displayRows[0]) : [];

    return (
        <div>
        <div className= "page-header" >
        <div>
        <h1 className="page-title" > Отчёты </h1>
            < p className = "page-subtitle" > Аналитика и выгрузки по данным организации </p>
                </div>
                < div style = {{ display: 'flex', gap: 8, flexWrap: 'wrap' }
}>
    <button className="btn btn-secondary btn-sm" onClick = {() => handleExport('csv')} disabled = {!filtered.length}>
        <FileText size={ 14 } /> CSV
            </button>
            < button className = "btn btn-secondary btn-sm" onClick = {() => handleExport('excel')} disabled = {!filtered.length}>
                <FileSpreadsheet size={ 14 } /> Excel
                    </button>
                    < button className = "btn btn-secondary btn-sm" onClick = {() => handleExport('word')} disabled = {!filtered.length}>
                        <File size={ 14 } /> Word
                            </button>
                            < button className = "btn btn-secondary btn-sm" onClick = {() => handleExport('pdf')} disabled = {!filtered.length}>
                                <Download size={ 14 } /> PDF
                                    </button>
                                    </div>
                                    </div>

                                    < div className = "tabs" >
                                    {
                                        TABS.map(t => (
                                            <button key= { t.key } className = {`tab ${tab === t.key ? 'active' : ''}`}
onClick = {() => setTab(t.key)}
style = {{ display: 'flex', alignItems: 'center', gap: 6 }}>
{ t.icon } { t.label }
</button>
        ))}
</div>

    < div className = "filter-bar" >
        <div className="input-icon-wrap" style = {{ minWidth: 280 }}>
            <span className="input-icon" > <Search size={ 15 } /></span >
                <input className="input" placeholder = "Поиск…" value = { search }
onChange = { e => setSearch(e.target.value) } />
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

{
    !loading && chartData.length > 0 && (
        <div className="card" style = {{ marginBottom: 20 }
}>
    <div className="card-header" >
        <h3 className="card-title" >
            <BarChart3 size={ 16 } />
{ tab === 'summary' && 'Топ-8 волонтёров по часам' }
{ tab === 'rating' && 'Рейтинг волонтёров (места)' }
{ tab === 'partners' && 'Суммы поддержки по партнёрам' }
</h3>
    </div>
    < ResponsiveContainer width = "100%" height = { 280} >
    { tab === 'partners' ? (
        <BarChart data= { chartData } margin = {{ top: 20, right: 10, bottom: 0, left: -10 }}>
            <defs>
                <linearGradient id="barGradPartner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff4d8d" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#ffa14a" stopOpacity={0.75} />
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke = "var(--border)" vertical = { false} />
                <XAxis dataKey="name" tick = {{ fill: 'var(--text-3)', fontSize: 11 }}
axisLine = { false} tickLine = { false} interval = { 0}
angle = {- 15} textAnchor = "end" height = { 60} />
    <YAxis tick={ { fill: 'var(--text-3)', fontSize: 11 } } axisLine = { false} tickLine = { false} />
        <Tooltip contentStyle={
            {
                background: 'var(--surface)', border: '1px solid var(--border-2)',
                    borderRadius: 10, fontSize: 12, color: 'var(--text)'
            }
}
formatter = {(v) => [`${Number(v ?? 0).toLocaleString('ru-RU')} ₽`, 'Сумма']}
                />
    < Bar dataKey = "amount" fill = "url(#barGradPartner)" radius = { [6, 6, 0, 0]} >
        <LabelList
            dataKey="amount"
            position="top"
            formatter={(v) => `${Number(v ?? 0).toLocaleString('ru-RU')} ₽`}
            style={{ fontSize: 10.5, fontWeight: 700, fill: 'var(--text-2)' }}
        />
    </Bar>
        </BarChart>
            ) : tab === 'rating' ? (
    <LineChart data= { chartData } margin = {{ top: 20, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke = "var(--border)" vertical = { false} />
            <XAxis dataKey="name" tick = {{ fill: 'var(--text-3)', fontSize: 10 }}
axisLine = { false} tickLine = { false} interval = { 0}
angle = {- 20} textAnchor = "end" height = { 70} />
    <YAxis tick={ { fill: 'var(--text-3)', fontSize: 11 } } axisLine = { false} tickLine = { false} />
        <Tooltip contentStyle={
            {
                background: 'var(--surface)', border: '1px solid var(--border-2)',
                    borderRadius: 10, fontSize: 12, color: 'var(--text)'
            }
} />
    < Line type = "monotone" dataKey = "hours" stroke = "#ff7a59" strokeWidth = { 2.5}
dot = {{ r: 5, fill: '#ff7a59' }} activeDot = {{ r: 7 }} />
    </LineChart>
            ) : (
    <BarChart data= { chartData } margin = {{ top: 20, right: 10, bottom: 0, left: -10 }}>
        <defs>
            <linearGradient id="barGradHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff4d8d" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#ffa14a" stopOpacity={0.75} />
            </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke = "var(--border)" vertical = { false} />
            <XAxis dataKey="name" tick = {{ fill: 'var(--text-3)', fontSize: 11 }}
axisLine = { false} tickLine = { false} interval = { 0}
angle = {- 15} textAnchor = "end" height = { 60} />
    <YAxis tick={ { fill: 'var(--text-3)', fontSize: 11 } } axisLine = { false} tickLine = { false} />
        <Tooltip contentStyle={
            {
                background: 'var(--surface)', border: '1px solid var(--border-2)',
                    borderRadius: 10, fontSize: 12, color: 'var(--text)'
            }
}
formatter = {(v) => [`${Number(v ?? 0).toFixed(1)} ч`, 'Часы']} />
    < Bar dataKey = "hours" fill = "url(#barGradHours)" radius = { [6, 6, 0, 0]} >
        <LabelList
            dataKey="hours"
            position="top"
            formatter={(v) => `${Number(v ?? 0).toFixed(1)} ч`}
            style={{ fontSize: 10.5, fontWeight: 700, fill: 'var(--text-2)' }}
        />
    </Bar>
        </BarChart>
            )}
</ResponsiveContainer>
    </div>
      )}

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
text = "Измените фильтры или период"
    />
    </div>
      ) : (
    <div className= "table-wrap" >
    <table className="sticky-first" >
    <thead>
    <tr>
    <th style={ { width: 50 } }># </th>
{
    headers.map(h => (
        <th key= { h } style = {{
        textTransform: 'none', letterSpacing: 0,
        fontSize: 12, color: 'var(--text-2)'
    }}> { h } </th>
                ))}
</tr>
    </thead>
    <tbody>
{
    displayRows.map((row, i) => (
        <motion.tr key= { i } initial = {{ opacity: 0 }} animate = {{ opacity: 1 }}
transition = {{ delay: Math.min(i * 0.015, 0.3) }}>
    <td style={ { color: 'var(--text-3)', fontSize: 12 } }> { i + 1}</td>
{
    headers.map(h => {
        const v = row[h];
        const isNum = typeof v === 'number';
        return (
            <td key= { h } className = { isNum? 'num': '' } >
            { isNum?(v as number).toLocaleString('ru-RU') : String(v ?? '—')
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