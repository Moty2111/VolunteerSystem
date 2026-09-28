import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { usersApi, type SystemUserItem } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar, Badge, EmptyState, Skeleton } from '../components/ui';
import { IllSprout } from '../components/illustrations';
import { plural } from '../utils/format';
import { Search, UserCog, ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';

const ROLES = ['Администратор', 'Менеджер', 'Волонтёр'] as const;

const roleVariant = (role: string): 'primary' | 'info' | 'success' => {
    if (role === 'Администратор') return 'primary';
    if (role === 'Менеджер') return 'info';
    return 'success';
};

export default function UsersPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState<SystemUserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            setItems(await usersApi.getAll());
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Не удалось загрузить учётные записи');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(u =>
            u.loginName.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q) ||
            (u.volunteerName || '').toLowerCase().includes(q)
        );
    }, [items, search]);

    const handleChangeRole = async (u: SystemUserItem, role: string) => {
        if (role === u.role) return;
        try {
            await usersApi.updateRole(u.userId, role);
            setItems(prev => prev.map(x => x.userId === u.userId ? { ...x, role } : x));
            toast.success(`Роль «${u.loginName}» изменена на «${role}»`);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Не удалось изменить роль');
        }
    };

    const handleToggleActive = async (u: SystemUserItem) => {
        try {
            await usersApi.updateActive(u.userId, !u.isActive);
            setItems(prev => prev.map(x => x.userId === u.userId ? { ...x, isActive: !u.isActive } : x));
            toast.success(u.isActive
                ? `Учётная запись «${u.loginName}» отключена`
                : `Учётная запись «${u.loginName}» включена`);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Не удалось изменить статус');
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Учётные записи</h1>
                    <p className="page-subtitle">
                        {loading
                            ? 'Загрузка...'
                            : `${filtered.length} ${plural(filtered.length, ['пользователь', 'пользователя', 'пользователей'])} · вход в систему и роли`}
                    </p>
                </div>
            </div>

            <div className="filter-bar">
                <div className="input-icon-wrap" style={{ minWidth: 300 }}>
                    <span className="input-icon"><Search size={15} /></span>
                    <input
                        className="input"
                        placeholder="Поиск по логину, роли, волонтёру…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                    <KeyRound size={14} />
                    Пароли в системе хранятся открытым текстом — требование курсового проекта
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} height={62} radius={14} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <EmptyState
                        illustration={<IllSprout size={110} />}
                        title="Учётных записей не найдено"
                        text="Измените поисковый запрос"
                    />
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="sticky-first">
                        <thead>
                            <tr>
                                <th>Пользователь</th>
                                <th>Роль</th>
                                <th>Профиль волонтёра</th>
                                <th>Статус</th>
                                <th>Создан</th>
                                <th aria-label="Действия" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u, i) => {
                                const isMe = u.loginName === user?.loginName;
                                return (
                                    <motion.tr
                                        key={u.userId}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(i * 0.02, 0.2) }}
                                    >
                                        <td>
                                            <div className="cell-person">
                                                <Avatar name={u.loginName} size="sm" />
                                                <div>
                                                    <div className="cell-name">
                                                        {u.loginName}
                                                        {isMe && (
                                                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>
                                                                это вы
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="cell-sub">ID #{u.userId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {isMe ? (
                                                <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                                            ) : (
                                                <select
                                                    className="select"
                                                    value={u.role}
                                                    onChange={e => handleChangeRole(u, e.target.value)}
                                                    aria-label={`Роль ${u.loginName}`}
                                                    style={{ minWidth: 150 }}
                                                >
                                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td>
                                            {u.volunteerName
                                                ? <span>{u.volunteerName}</span>
                                                : <span style={{ color: 'var(--text-3)' }}>—</span>}
                                        </td>
                                        <td>
                                            {u.isActive
                                                ? <Badge variant="success">активен</Badge>
                                                : <Badge variant="muted">отключён</Badge>}
                                        </td>
                                        <td>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button
                                                    className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-primary'}`}
                                                    onClick={() => handleToggleActive(u)}
                                                    disabled={isMe && u.isActive}
                                                    title={
                                                        isMe && u.isActive
                                                            ? 'Нельзя отключить собственную запись'
                                                            : u.isActive ? 'Отключить' : 'Включить'
                                                    }
                                                >
                                                    {u.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                                                    {u.isActive ? 'Отключить' : 'Включить'}
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, color: 'var(--text-3)' }}>
                <UserCog size={14} />
                Смена роли и отключение доступны только администратору и действуют со следующего входа.
            </div>
        </div>
    );
}
