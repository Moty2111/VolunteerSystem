import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { volunteersApi } from '../api/volunteers';
import { skillsApi, type VolunteerSkill } from '../api/skills';
import type { Volunteer } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Avatar, Badge, EmptyState, Skeleton } from '../components/ui';
import { IllSprout } from '../components/illustrations';
import VolunteerProfileModal from './VolunteerProfileModal';
import { getLevel } from '../utils/level';
import { plural } from '../utils/format';
import {
    Plus, Search, Trash2, Users, Eye, MapPin, Phone, Mail,
    Award, Shield, ShieldCheck, Activity
} from 'lucide-react';

const PAGE_SIZE = 12;

export default function VolunteersPage() {
    const { user } = useAuth();
    const toast = useToast();

    const [items, setItems] = useState<Volunteer[]>([]);
    const [skillsMap, setSkillsMap] = useState<Record<number, VolunteerSkill[]>>({});
    const [loading, setLoading] = useState(true);
    const [cityFilter, setCityFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [profileVolunteer, setProfileVolunteer] = useState<Volunteer | null>(null);
    const [page, setPage] = useState(1);

    const [form, setForm] = useState({
        fullName: '', birthDate: '', phone: '', email: '',
        city: '', medBookValidUntil: '', personalDataConsent: true
    });

    const canCreate = user?.role === 'Администратор' || user?.role === 'Менеджер';

    const load = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {};
            if (cityFilter) params.city = cityFilter;
            if (activeFilter) params.active = activeFilter === 'true';
            const list = await volunteersApi.getAll(params);
            setItems(list);

            // Загружаем навыки для первых 30 волонтёров (оптимизация)
            const map: Record<number, VolunteerSkill[]> = {};
            await Promise.all(list.slice(0, 30).map(async v => {
                try {
                    map[v.volunteerId] = await skillsApi.getVolunteerSkills(v.volunteerId);
                } catch { /* ignore */ }
            }));
            setSkillsMap(map);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка загрузки');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(v =>
            v.fullName.toLowerCase().includes(q) ||
            v.city.toLowerCase().includes(q) ||
            v.email.toLowerCase().includes(q) ||
            v.phone.includes(q)
        );
    }, [items, search]);

    const paged = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page]
    );

    useEffect(() => { setPage(1); }, [search, cityFilter, activeFilter]);

    const handleCreate = async () => {
        if (!form.fullName || !form.email) { toast.error('Заполните обязательные поля'); return; }
        try {
            await volunteersApi.create({ ...form, medBookValidUntil: form.medBookValidUntil || null });
            toast.success('Волонтёр добавлен');
            setForm({ fullName: '', birthDate: '', phone: '', email: '', city: '', medBookValidUntil: '', personalDataConsent: true });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка создания');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm(`Анонимизировать волонтёра #${id}?`)) return;
        try {
            await volunteersApi.remove(id);
            toast.success('Волонтёр анонимизирован');
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    return (
        <div>
        <div className= "page-header" >
        <div>
        <h1 className="page-title" > Волонтёры </h1>
            < p className = "page-subtitle" >
            { loading? 'Загрузка...': `${items.length} ${plural(items.length, ['человек', 'человека', 'человек'])} в команде` }
                </p>
                </div>
    {
        canCreate && (
            <button className="btn btn-primary" onClick = {() => setShowForm(true)
    }>
        <Plus size={ 16 } /> Добавить
            </button>
        )
}
</div>

    < div className = "filter-bar" >
        <input className="input" placeholder = "Поиск по имени, городу, email…"
value = { search } onChange = { e => setSearch(e.target.value) } style = {{ minWidth: 280 }} />
    < input className = "input" placeholder = "Город"
value = { cityFilter } onChange = { e => setCityFilter(e.target.value) } />
    <select className="select" value = { activeFilter } onChange = { e => setActiveFilter(e.target.value) } >
        <option value="" > Все статусы </option>
            < option value = "true" > Активные </option>
                < option value = "false" > Неактивные </option>
                    </select>
                    < button className = "btn btn-secondary" onClick = { load } >
                        <Search size={ 16 } /> Применить
                            </button>
                            </div>

{
    loading ? (
        <div style= {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }
}>
{ [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={ i } height = { 230} radius = { 16} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllSprout size={ 110 } /> }
title = "Волонтёров не найдено"
text = { items.length === 0 ? 'Добавьте первого волонтёра и пригласите команду' : 'Измените фильтры' }
action = { canCreate && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Добавить
            </button>
            ) : undefined}
          />
    </div>
      ) : (
    <>
    <motion.div
            initial= {{ opacity: 0 }} animate = {{ opacity: 1 }}
style = {{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginBottom: 20 }}
          >
    <AnimatePresence>
    {
        paged.map((v, i) => {
            const skills = skillsMap[v.volunteerId] || [];
            const level = getLevel(0);
            const hasMedBook = !!v.medBookValidUntil;
            return (
                <motion.div
                    key= { v.volunteerId }
            initial = {{ opacity: 0, y: 12 }
        }
                    animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.95 }}
transition = {{ delay: i * 0.03 }}
onClick = {() => setProfileVolunteer(v)}
style = {{
    background: 'var(--surface)',
        border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
                padding: 18,
                    cursor: 'pointer',
                        transition: 'all .15s',
                            position: 'relative',
                                overflow: 'hidden'
}}
onMouseEnter = { e => {
    e.currentTarget.style.borderColor = 'var(--primary)';
    e.currentTarget.style.transform = 'translateY(-3px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
}}
onMouseLeave = { e => {
    e.currentTarget.style.borderColor = 'var(--border)';
    e.currentTarget.style.transform = 'none';
    e.currentTarget.style.boxShadow = 'none';
}}
                  >
{/* Медкнижка индикатор */ }
    < div style = {{
    position: 'absolute', top: 14, right: 14,
        width: 26, height: 26, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hasMedBook ? 'var(--success-soft)' : 'var(--danger-soft)',
                    color: hasMedBook ? 'var(--success)' : 'var(--danger)'
}} title = { hasMedBook? `Медкнижка до ${v.medBookValidUntil}` : 'Нет медкнижки'}>
    { hasMedBook?<ShieldCheck size = { 14 } /> : <Shield size={ 14 } />}
</div>

    < div style = {{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <Avatar name={ v.fullName } size = "lg" />
            <div style={ { flex: 1, minWidth: 0, paddingRight: 30 } }>
                <div style={
                    {
                        fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }
} title = { v.fullName } >
{ v.fullName }
    </div>
    < div style = {{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>
        <MapPin size={ 12 } /> {v.city}
            </div>
            < div style = {{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={ `level-pill level-${level.key}` }>
                    <span className="level-dot" />
                    { level.label }
                        </span>
{ !v.isActive && <Badge variant="muted" > неактивен </Badge> }
</div>
    </div>
    </div>

    < div style = {{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginBottom: 12 }}>
        <div style={ { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' } }>
            <Phone size={ 13 } /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.phone}</span >
                </div>
                < div style = {{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}>
                    <Mail size={ 13 } /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.email}</span >
                        </div>
                        </div>

{/* Навыки */ }
{
    skills.length > 0 && (
        <div style={
            {
                display: 'flex', gap: 6, flexWrap: 'wrap',
                    paddingTop: 12, marginBottom: 4,
                        borderTop: '1px solid var(--border)'
            }
    }>
    {
        skills.slice(0, 3).map(s => (
            <span key= { s.skillId } className = "skill-chip" style = {{ fontSize: 11, padding: '2px 8px' }} >
        <Award size={ 10 } />
    { s.skillName }
    </span>
                        ))
}
{
    skills.length > 3 && (
        <span className="skill-chip" style = {{ fontSize: 11, padding: '2px 8px', color: 'var(--text-3)' }
}>
    +{ skills.length - 3 }
    </span>
                        )}
</div>
                    )}

<div style={
    {
        display: 'flex', gap: 6, marginTop: 12, paddingTop: 12,
            borderTop: '1px solid var(--border)', alignItems: 'center'
    }
}>
    <div style={ { display: 'flex', gap: 4, fontSize: 11, color: 'var(--text-3)' } }>
        <Activity size={ 12 } />
            < span > ID #{ v.volunteerId } </span>
                </div>
                < div style = {{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-secondary"
onClick = {(e) => { e.stopPropagation(); setProfileVolunteer(v); }}
title = "Профиль" >
    <Eye size={ 14 } />
        </button>
{
    user?.role === 'Администратор' && (
        <button className="btn btn-icon btn-danger"
    onClick = {(e) => handleDelete(e, v.volunteerId)
}
title = "Удалить" >
    <Trash2 size={ 14 } />
        </button>
                        )}
</div>
    </div>
    </motion.div>
                );
              })}
</AnimatePresence>
    </motion.div>

{
    totalPages > 1 && (
        <div style={ { display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' } }>
            <button className="btn btn-secondary btn-sm" disabled = { page === 1
}
onClick = {() => setPage(p => p - 1)}>←</button>
    < span style = {{ fontSize: 13, color: 'var(--text-2)', minWidth: 80, textAlign: 'center' }}>
        { page } / { totalPages }
        </span>
        < button className = "btn btn-secondary btn-sm" disabled = { page === totalPages}
onClick = {() => setPage(p => p + 1)}>→</button>
    </div>
          )}
</>
      )}

<Modal
        open={ showForm }
title = "Новый волонтёр"
onClose = {() => setShowForm(false)}
footer = {
          <>
    <button className="btn btn-ghost" onClick = {() => setShowForm(false)}> Отмена </button>
        < button className = "btn btn-primary" onClick = { handleCreate } > Создать </button>
            </>
        }
      >
    <div className="form-row" >
        <div className="field" >
            <label className="field-label" > ФИО * </label>
                < input className = "input" value = { form.fullName } onChange = { e => setForm({ ...form, fullName: e.target.value })} />
                    </div>
                    < div className = "field" >
                        <label className="field-label" > Дата рождения * </label>
                            < input type = "date" className = "input" value = { form.birthDate } onChange = { e => setForm({ ...form, birthDate: e.target.value })} />
                                </div>
                                </div>
                                < div className = "form-row" >
                                    <div className="field" >
                                        <label className="field-label" > Телефон * </label>
                                            < input className = "input" value = { form.phone } onChange = { e => setForm({ ...form, phone: e.target.value })} />
                                                </div>
                                                < div className = "field" >
                                                    <label className="field-label" > Email * </label>
                                                        < input className = "input" value = { form.email } onChange = { e => setForm({ ...form, email: e.target.value })} />
                                                            </div>
                                                            </div>
                                                            < div className = "form-row" >
                                                                <div className="field" >
                                                                    <label className="field-label" > Город * </label>
                                                                        < input className = "input" value = { form.city } onChange = { e => setForm({ ...form, city: e.target.value })} />
                                                                            </div>
                                                                            < div className = "field" >
                                                                                <label className="field-label" > Медкнижка(до) </label>
                                                                                    < input type = "date" className = "input" value = { form.medBookValidUntil } onChange = { e => setForm({ ...form, medBookValidUntil: e.target.value })} />
                                                                                        </div>
                                                                                        </div>
                                                                                        </Modal>

                                                                                        < VolunteerProfileModal volunteer = { profileVolunteer } onClose = {() => setProfileVolunteer(null)} />
                                                                                            </div>
  );
}