import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { reportsApi } from '../api/reports';
import { usersApi, type SystemUserItem } from '../api/users';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, Skeleton } from '../components/ui';
import { IllActivity } from '../components/illustrations';
import { exportCSV, exportExcel, exportPDF } from '../utils/export';
import { plural } from '../utils/format';
import {
    Search, FileText, FileSpreadsheet, Download, ShieldCheck,
    Pencil, Trash2, PlusCircle, History, Filter
} from 'lucide-react';

interface AuditRow {
    log_id: number;
    user_id: number | null;
    action: string;
    table_name: string;
    record_id: number | null;
    action_date: string;
}

const TABLE_LABELS: Record<string, string> = {
    Assignment: 'Назначения',
    Volunteer: 'Волонтёры',
    Event: 'Мероприятия',
    Partner: 'Партнёры',
    Skill: 'Навыки',
    SystemUser: 'Учётные записи'
};

const actionMeta = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('INSERT') || a.includes('ВСТАВ')) return { label: 'Создание', variant: 'success' as const, icon: <PlusCircle size={13} /> };
    if (a.includes('DELETE') || a.includes('УДАЛ')) return { label: 'Удаление', variant: 'danger' as const, icon: <Trash2 size={13} /> };
    if (a.includes('UPDATE') || a.includes('ИЗМЕН')) return { label: 'Изменение', variant: 'info' as const, icon: <Pencil size={13} /> };
    return { label: action, variant: 'muted' as const, icon: <History size={13} /> };
};

export default function AuditPage() {
    const toast = useToast();
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [users, setUsers] = useState<SystemUserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [tableFilter, setTableFilter] = useState('');
    const [limit, setLimit] = useState(100);

    useEffect(() => {
        (async () => {
            try {
                const [log, userList] = await Promise.all([
                    reportsApi.auditLog(limit) as Promise<AuditRow[]>,
                    usersApi.getAll().catch(() => [] as SystemUserItem[])
                ]);
                setRows(log);
                setUsers(userList);
            } catch (e: unknown) {
                const err = e as { response?: { data?: { message?: string } } };
                toast.error(err.response?.data?.message || 'Не удалось загрузить журнал');
            } finally {
                setLoading(false);
            }
        })();
    }, [limit]);

    const userById = useMemo(
        () => new Map(users.map(u => [u.userId, u.loginName])),
        [users]
    );

    const actions = useMemo(
        () => Array.from(new Set(rows.map(r => r.action))),
        [rows]
    );
    const tables = useMemo(
        () => Array.from(new Set(rows.map(r => r.table_name))),
        [rows]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(r => {
            if (actionFilter && r.action !== actionFilter) return false;
            if (tableFilter && r.table_name !== tableFilter) return false;
            if (!q) return true;
            const login = (r.user_id != null ? userById.get(r.user_id) : '') || '';
            return (
                login.toLowerCase().includes(q) ||
                r.action.toLowerCase().includes(q) ||
                r.table_name.toLowerCase().includes(q) ||
                String(r.record_id ?? '').includes(q)
            );
        });
    }, [rows, search, actionFilter, tableFilter, userById]);

    const displayRows = useMemo(
        () => filtered.map(r => ({
            ID: r.log_id,
            'Дата и время': new Date(r.action_date).toLocaleString('ru-RU'),
            Пользователь: (r.user_id != null ? userById.get(r.user_id) : null) || 'система',
            Действие: r.action,
            Таблица: TABLE_LABELS[r.table_name] || r.table_name,
            'Запись #': r.record_id ?? '—'
        })),
        [filtered, userById]
    );

    const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
        if (!displayRows.length) { toast.info('Нет данных для экспорта'); return; }
        const filename = 'audit-log';
        if (format === 'csv') exportCSV(filename, displayRows);
        else if (format === 'excel') exportExcel(filename, displayRows);
        else {
            try {
                await exportPDF(filename, displayRows, 'Журнал аудита');
            } catch {
                toast.error('Не удалось сформировать PDF');
                return;
            }
        }
        toast.success(`Экспорт ${format.toUpperCase()} готов`);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Журнал аудита</h1>
                    <p className="page-subtitle">
                        {loading
                            ? 'Загрузка...'
                            : `${filtered.length} ${plural(filtered.length, ['запись', 'записи', 'записей'])} · последние изменения данных`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')} disabled={!filtered.length}>
                        <FileText size={14} /> CSV
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleExport('excel')} disabled={!filtered.length}>
                        <FileSpreadsheet size={14} /> Excel
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleExport('pdf')} disabled={!filtered.length}>
                        <Download size={14} /> PDF
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <div className="input-icon-wrap" style={{ minWidth: 260 }}>
                    <span className="input-icon"><Search size={15} /></span>
                    <input
                        className="input"
                        placeholder="Поиск: пользователь, таблица, запись…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="sort-group">
                    <Filter size={14} />
                    <select className="select" value={actionFilter} onChange={e => setActionFilter(e.target.value)} aria-label="Действие">
                        <option value="">Все действия</option>
                        {actions.map(a => <option key={a} value={a}>{actionMeta(a).label}</option>)}
                    </select>
                </div>
                <select className="select" value={tableFilter} onChange={e => setTableFilter(e.target.value)} aria-label="Таблица">
                    <option value="">Все таблицы</option>
                    {tables.map(t => <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>)}
                </select>
                <select className="select" value={limit} onChange={e => setLimit(Number(e.target.value))} aria-label="Лимит">
                    <option value={50}>50 записей</option>
                    <option value={100}>100 записей</option>
                    <option value={200}>200 записей</option>
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={48} radius={12} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <EmptyState
                        illustration={<IllActivity size={110} />}
                        title="Записей нет"
                        text={rows.length === 0
                            ? 'Журнал пуст — здесь появятся изменения назначений волонтёров'
                            : 'Измените фильтры или поисковый запрос'}
                    />
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="sticky-first">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Дата и время</th>
                                <th>Пользователь</th>
                                <th>Действие</th>
                                <th>Таблица</th>
                                <th>Запись</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r, i) => {
                                const meta = actionMeta(r.action);
                                const login = r.user_id != null ? userById.get(r.user_id) : null;
                                return (
                                    <motion.tr
                                        key={r.log_id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: Math.min(i * 0.01, 0.2) }}
                                    >
                                        <td className="num">#{r.log_id}</td>
                                        <td>{new Date(r.action_date).toLocaleString('ru-RU')}</td>
                                        <td>
                                            {login ? (
                                                <div className="cell-person">
                                                    <span className="activity-kind" style={{ '--act-color': 'var(--primary)' } as React.CSSProperties}>
                                                        <ShieldCheck size={13} />
                                                    </span>
                                                    <div className="cell-name">{login}</div>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-3)' }}>система (триггер)</span>
                                            )}
                                        </td>
                                        <td>
                                            <Badge variant={meta.variant}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    {meta.icon} {meta.label}
                                                </span>
                                            </Badge>
                                        </td>
                                        <td>{TABLE_LABELS[r.table_name] || r.table_name}</td>
                                        <td className="num">{r.record_id != null ? `#${r.record_id}` : '—'}</td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
