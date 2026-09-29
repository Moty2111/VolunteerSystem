import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { partnersApi } from '../api/partners';
import type { Partner } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Badge, EmptyState, Skeleton, ViewToggle, useViewMode } from '../components/ui';
import { formatMoney } from '../utils/format';
import { IllHands } from '../components/illustrations';
import {
    Plus, Search, Trash2, Building2, Phone, Mail, FileText,
    TrendingUp, Award, Clock, CheckCircle2, AlertCircle, ArrowDownUp
} from 'lucide-react';

function avatarGradient(seed: string): string {
    const palette = [
        'linear-gradient(135deg, #14a37f, #0f8f9a)',
        'linear-gradient(135deg, #ff7a59, #ff9c6b)',
        'linear-gradient(135deg, #7c5cff, #4f7cff)',
        'linear-gradient(135deg, #d4a72c, #b8860b)',
        'linear-gradient(135deg, #06b6d4, #0891b2)'
    ];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return palette[Math.abs(h) % palette.length];
}

const initials = (name: string) =>
    name.replace(/[«»"]/g, '').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

type PartnerStatus = 'active' | 'pending' | 'expired';
type SortKey = 'name' | 'amount' | 'status';

function getStatus(p: Partner): PartnerStatus {
    if (!p.contractDate) return 'pending';
    const contractAge = (Date.now() - new Date(p.contractDate).getTime()) / (1000 * 60 * 60 * 24);
    if (contractAge > 365) return 'expired';
    return 'active';
}

const STATUS_LABELS: Record<PartnerStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    active: { label: 'Активный', variant: 'success' },
    pending: { label: 'Ожидает', variant: 'warning' },
    expired: { label: 'Просрочен', variant: 'danger' }
};

export default function PartnersPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<PartnerStatus | ''>('');
    const [showForm, setShowForm] = useState(false);
    const [view, setView] = useViewMode('partners');
    const [sort, setSort] = useState<SortKey>('name');

    const canEdit = user?.role === 'Администратор';

    const [form, setForm] = useState({
        partnerName: '', inn: '', contactPerson: '', phone: '', email: '',
        supportAmount: 0, contractNumber: '', contractDate: ''
    });

    const load = async () => {
        setLoading(true);
        try { setItems(await partnersApi.getAll()); }
        catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        let list = items;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.partnerName.toLowerCase().includes(q) ||
                (p.inn || '').toLowerCase().includes(q) ||
                (p.contactPerson || '').toLowerCase().includes(q)
            );
        }
        if (statusFilter) list = list.filter(p => getStatus(p) === statusFilter);

        if (view === 'cards') return list;

        return [...list].sort((a, b) => {
            switch (sort) {
                case 'amount':
                    return (b.supportAmount ?? 0) - (a.supportAmount ?? 0) ||
                        a.partnerName.localeCompare(b.partnerName, 'ru');
                case 'status':
                    return getStatus(a).localeCompare(getStatus(b)) ||
                        a.partnerName.localeCompare(b.partnerName, 'ru');
                case 'name':
                default:
                    return a.partnerName.localeCompare(b.partnerName, 'ru');
            }
        });
    }, [items, search, statusFilter, view, sort]);

    const total = useMemo(() => items.reduce((s, p) => s + (p.supportAmount ?? 0), 0), [items]);

    const handleCreate = async () => {
        if (!form.partnerName.trim()) { toast.error('Введите название'); return; }
        try {
            await partnersApi.create({
                ...form,
                supportAmount: Number(form.supportAmount) || 0,
                contractDate: form.contractDate || null
            });
            toast.success('Партнёр добавлен');
            setForm({ partnerName: '', inn: '', contactPerson: '', phone: '', email: '', supportAmount: 0, contractNumber: '', contractDate: '' });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить партнёра?')) return;
        try { await partnersApi.remove(id); toast.success('Удалено'); await load(); }
        catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const statusIcon = (s: PartnerStatus) => {
        if (s === 'active') return <CheckCircle2 size={ 12 } />;
        if (s === 'pending') return <Clock size={ 12 } />;
        return <AlertCircle size={ 12 } />;
    };

    return (
        <div>
        <div className= "page-header" >
        <div>
        <h1 className="page-title" > Партнёры </h1>
            < p className = "page-subtitle" >
            { loading? 'Загрузка...': `${items.length} ${items.length === 1 ? 'организация' : 'организаций'} · ${total.toLocaleString('ru-RU')} ₽ поддержки` }
                </p>
                </div>
    {
        canEdit && (
            <button className="btn btn-primary" onClick = {() => setShowForm(true)
    }>
        <Plus size={ 16 } /> Добавить партнёра
            </button>
        )
}
</div>

{/* KPI */ }
<div className="stat-grid" style = {{ marginBottom: 20 }}>
    <div className="stat-card" style = {{ ['--accent-color' as string]: 'var(--warning)' }}>
        <span className="accent-bar" />
            <div className="stat-card-head" >
                <div className="stat-card-label" > Всего партнёров </div>
                    < div className = "stat-card-icon" > <Building2 size={ 20 } /></div >
                        </div>
                        < div className = "stat-card-value num" > { items.length } </div>
                            </div>
                            < div className = "stat-card" style = {{ ['--accent-color' as string]: 'var(--success)' }}>
                                <span className="accent-bar" />
                                    <div className="stat-card-head" >
                                        <div className="stat-card-label" > Общая поддержка </div>
                                            < div className = "stat-card-icon" > <Award size={ 20 } /></div >
                                                </div>
                                                < div className = "stat-card-value num" > { total.toLocaleString('ru-RU') } ₽</div>
                                                    </div>
                                                    < div className = "stat-card" style = {{ ['--accent-color' as string]: 'var(--primary)' }}>
                                                        <span className="accent-bar" />
                                                            <div className="stat-card-head" >
                                                                <div className="stat-card-label" > Средний взнос </div>
                                                                    < div className = "stat-card-icon" > <TrendingUp size={ 20 } /></div >
                                                                        </div>
                                                                        < div className = "stat-card-value num" >
                                                                        { items.length > 0 ? Math.round(total / items.length).toLocaleString('ru-RU') : 0 } ₽
</div>
    </div>
    </div>

    < div className = "filter-bar" >
        <div className="input-icon-wrap" style = {{ minWidth: 280 }}>
            <span className="input-icon" > <Search size={ 15 } /></span >
                <input className="input" placeholder = "Поиск по названию, ИНН, контакту…"
value = { search } onChange = { e => setSearch(e.target.value) } />
    </div>
    < select className = "select" value = { statusFilter }
onChange = { e => setStatusFilter(e.target.value as PartnerStatus | '') } >
    <option value="" > Все статусы </option>
        < option value = "active" > Активные </option>
            < option value = "pending" > Ожидают </option>
                < option value = "expired" > Просрочены </option>
                    </select>
                    <div className="sort-group" >
                        <ArrowDownUp size = { 14 } />
                        <select
                            className = "select"
                            value = { sort }
                            onChange = { e => setSort(e.target.value as SortKey) }
                            aria-label = "Сортировка"
                        >
                            <option value = "name" > По названию </option>
                            <option value = "amount" > По сумме поддержки </option>
                            <option value = "status" > По статусу </option>
                        </select>
                    </div>
                    <ViewToggle view = { view } onChange = { setView } label = "Вид списка партнёров" />
                </div>

{
    loading ? (
        <div style= {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 14 }
}>
{ [1, 2, 3].map(i => <Skeleton key={ i } height = { 230} radius = { 16} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllHands size={ 110 } /> }
title = { items.length === 0 ? 'Партнёров пока нет' : 'Ничего не найдено' }
text = { items.length === 0 ? 'Добавьте первую организацию-партнёра' : 'Измените фильтры' }
action = { canEdit && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Добавить
            </button>
            ) : undefined}
          />
    </div>
      ) : view === 'table' ? (
    <div className="table-wrap">
        <table className="sticky-first">
            <thead>
                <tr>
                    <th>Организация</th>
                    <th>Контакт</th>
                    <th>Договор</th>
                    <th className="num">Поддержка</th>
                    <th>Статус</th>
                    {canEdit && <th aria-label="Действия" />}
                </tr>
            </thead>
            <tbody>
                { filtered.map(p => {
                    const st = STATUS_LABELS[getStatus(p)];
                    return (
                        <tr key= { p.partnerId } >
                            <td>
                                <div className="cell-name">{ p.partnerName }</div>
                                <div className="cell-sub num">{ p.inn ? `ИНН ${p.inn}` : `ID #${p.partnerId}` }</div>
                            </td>
                            <td>
                                <div className="cell-name">{ p.contactPerson || '—' }</div>
                                <div className="cell-sub">{ p.phone || p.email || '' }</div>
                            </td>
                            <td>
                                <div className="cell-name">{ p.contractNumber || '—' }</div>
                                <div className="cell-sub">
                                    { p.contractDate ? new Date(p.contractDate).toLocaleDateString('ru-RU') : '' }
                                </div>
                            </td>
                            <td className="num">{ formatMoney(p.supportAmount) }</td>
                            <td><Badge variant={ st.variant }> { st.label } </Badge></td>
                            {
                                canEdit && (
                                    <td className="row-actions">
                                        <button
                                            className="btn btn-icon btn-danger"
                                            onClick = {() => handleDelete(p.partnerId) }
                                            title = "Удалить"
                                            aria-label = "Удалить"
                                        >
                                            <Trash2 size={ 14 } />
                                        </button>
                                    </td>
                                )
                            }
                        </tr>
                    );
                }) }
            </tbody>
        </table>
    </div>
      ) : (
    <div style= {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))', gap: 14 }}>
        <AnimatePresence>
        {
            filtered.map((p, i) => {
                const status = getStatus(p);
                const st = STATUS_LABELS[status];
                return (
                    <motion.div
                  key= { p.partnerId }
                initial = {{ opacity: 0, y: 12 }
            }
                  animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.95 }}
transition = {{ delay: i * 0.04 }}
style = {{
    background: 'var(--surface)',
        border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
                padding: 20,
                    display: 'flex', flexDirection: 'column', gap: 14,
                        transition: 'all .15s',
                            position: 'relative'
}}
onMouseEnter = { el => {
    el.currentTarget.style.borderColor = 'var(--primary)';
    el.currentTarget.style.transform = 'translateY(-3px)';
    el.currentTarget.style.boxShadow = 'var(--shadow-md)';
}}
onMouseLeave = { el => {
    el.currentTarget.style.borderColor = 'var(--border)';
    el.currentTarget.style.transform = 'none';
    el.currentTarget.style.boxShadow = 'none';
}}
                >
{/* Статус в углу */ }
    < div style = {{ position: 'absolute', top: 14, right: 14 }}>
        <Badge variant={ st.variant } icon = { statusIcon(status) } >
        { st.label }
            </Badge>
            </div>

            < div style = {{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={
                    {
                        width: 52, height: 52, borderRadius: 'var(--r-md)',
                            background: avatarGradient(p.partnerName),
                                color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 17,
                                            flexShrink: 0, letterSpacing: '-0.02em'
                    }
}>
{ initials(p.partnerName) }
    </div>
    < div style = {{ flex: 1, minWidth: 0, paddingRight: 90 }}>
        <div style={
            {
                fontFamily: 'var(--font-head)', fontWeight: 700,
                    fontSize: 15, lineHeight: 1.3,
                        display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden'
            }
} title = { p.partnerName } >
{ p.partnerName }
    </div>
{
    p.inn && (
        <div style={ { fontSize: 12, color: 'var(--text-3)', marginTop: 4 } }>
            ИНН { p.inn }
    </div>
                      )
}
</div>
    </div>

    < div style = {{
    display: 'flex', flexDirection: 'column', gap: 8,
        fontSize: 13, color: 'var(--text-2)', flex: 1
}}>
{
    p.contactPerson && (
        <div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
            <Building2 size={ 13 } style = {{ color: 'var(--text-3)' }} />
                < span > { p.contactPerson } </span>
                </div>
                    )}
{
    p.phone && (
        <div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
            <Phone size={ 13 } style = {{ color: 'var(--text-3)' }
} />
    < span > { p.phone } </span>
    </div>
                    )}
{
    p.email && (
        <div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
            <Mail size={ 13 } style = {{ color: 'var(--text-3)' }
} />
    < span style = {{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    { p.email }
        </span>
        </div>
                    )}
{
    p.contractNumber && (
        <div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
            <FileText size={ 13 } style = {{ color: 'var(--text-3)' }
} />
    <span>
{ p.contractNumber }
{ p.contractDate && ` от ${new Date(p.contractDate).toLocaleDateString('ru-RU')}` }
</span>
    </div>
                    )}
</div>

    < div style = {{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 14, borderTop: '1px solid var(--border)'
}}>
    <span style={ { fontSize: 12, color: 'var(--text-3)' } }> Поддержка </span>
        < strong style = {{
    fontFamily: 'var(--font-head)', fontSize: 18,
        color: 'var(--success)', fontVariantNumeric: 'tabular-nums'
}}>
    {(p.supportAmount ?? 0).toLocaleString('ru-RU')} ₽
</strong>
    </div>

{
    canEdit && (
        <div style={ { display: 'flex', justifyContent: 'flex-end' } }>
            <button className="btn btn-icon btn-danger" onClick = {() => handleDelete(p.partnerId)
}>
    <Trash2 size={ 14 } />
        </button>
        </div>
                  )}
</motion.div>
              );
            })}
</AnimatePresence>
    </div>
      )}

<Modal
        open={ showForm }
title = "Новый партнёр"
onClose = {() => setShowForm(false)}
wide
footer = {
          <>
    <button className="btn btn-ghost" onClick = {() => setShowForm(false)}> Отмена </button>
        < button className = "btn btn-primary" onClick = { handleCreate } > Создать </button>
            </>
        }
      >
    <div className="field" >
        <label className="field-label" > Название * </label>
            < input className = "input" value = { form.partnerName }
onChange = { e => setForm({ ...form, partnerName: e.target.value })}
placeholder = 'ООО «Добро»' />
    </div>
    < div className = "form-row" >
        <div className="field" >
            <label className="field-label" > ИНН </label>
                < input className = "input" value = { form.inn }
onChange = { e => setForm({ ...form, inn: e.target.value })} />
    </div>
    < div className = "field" >
        <label className="field-label" > Контактное лицо </label>
            < input className = "input" value = { form.contactPerson }
onChange = { e => setForm({ ...form, contactPerson: e.target.value })} />
    </div>
    </div>
    < div className = "form-row" >
        <div className="field" >
            <label className="field-label" > Телефон </label>
                < input className = "input" value = { form.phone }
onChange = { e => setForm({ ...form, phone: e.target.value })} />
    </div>
    < div className = "field" >
        <label className="field-label" > Email </label>
            < input className = "input" value = { form.email }
onChange = { e => setForm({ ...form, email: e.target.value })} />
    </div>
    </div>
    < div className = "form-row-3" >
        <div className="field" >
            <label className="field-label" > Сумма, ₽</label>
                < input type = "number" className = "input" value = { form.supportAmount }
onChange = { e => setForm({ ...form, supportAmount: Number(e.target.value) })} />
    </div>
    < div className = "field" >
        <label className="field-label" >№ договора </label>
            < input className = "input" value = { form.contractNumber }
onChange = { e => setForm({ ...form, contractNumber: e.target.value })} />
    </div>
    < div className = "field" >
        <label className="field-label" > Дата договора </label>
            < input type = "date" className = "input" value = { form.contractDate }
onChange = { e => setForm({ ...form, contractDate: e.target.value })} />
    </div>
    </div>
    </Modal>
    </div>
  );
}