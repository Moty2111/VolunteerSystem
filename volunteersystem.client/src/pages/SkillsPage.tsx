import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { skillsApi, type Skill } from '../api/skills';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Badge, EmptyState, Skeleton } from '../components/ui';
import { IllAward } from '../components/illustrations';
import { Plus, Trash2, Award, Search, Users } from 'lucide-react';

const LEVELS = ['Начальный', 'Средний', 'Профессиональный', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const levelVariant = (level: string): 'muted' | 'info' | 'primary' | 'success' | 'warning' | 'accent' => {
    if (level === 'Профессиональный') return 'primary';
    if (level === 'Средний') return 'info';
    if (['B2', 'C1', 'C2'].includes(level)) return 'success';
    if (['B1', 'A2'].includes(level)) return 'warning';
    return 'muted';
};

const groupByLevel = (skills: Skill[]) => {
    const map = new Map<string, Skill[]>();
    skills.forEach(s => {
        const arr = map.get(s.level) || [];
        arr.push(s);
        map.set(s.level, arr);
    });
    return map;
};

export default function SkillsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ skillName: '', level: 'Начальный' });

    const canEdit = user?.role === 'Администратор' || user?.role === 'Менеджер';
    const isAdmin = user?.role === 'Администратор';

    const load = async () => {
        setLoading(true);
        try {
            setItems(await skillsApi.getAll());
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(s => s.skillName.toLowerCase().includes(q));
    }, [items, search]);

    const grouped = useMemo(() => groupByLevel(filtered), [filtered]);

    const totalAssigned = useMemo(
        () => items.reduce((s, x) => s + (x.assignedCount || 0), 0),
        [items]
    );

    const handleCreate = async () => {
        if (!form.skillName.trim()) {
            toast.error('Введите название');
            return;
        }
        try {
            await skillsApi.create(form);
            toast.success('Навык добавлен');
            setForm({ skillName: '', level: 'Начальный' });
            setShowForm(false);
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить навык? Он исчезнет у всех волонтёров.')) return;
        try {
            await skillsApi.remove(id);
            toast.success('Удалено');
            await load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Ошибка');
        }
    };

    return (
        <div>
        <div className= "page-header" >
        <div>
        <h1 className="page-title" > Навыки </h1>
            < p className = "page-subtitle" >
            {
                loading
                ? 'Загрузка...'
                    : `${items.length} компетенций · назначено ${totalAssigned} раз`
            }
                </p>
                </div>
    {
        canEdit && (
            <button className="btn btn-primary" onClick = {() => setShowForm(true)
    }>
        <Plus size={ 16 } /> Добавить навык
            </button>
        )
}
</div>

    < div className = "filter-bar" >
        <div className="input-icon-wrap" style = {{ minWidth: 300 }}>
            <span className="input-icon" > <Search size={ 15 } /></span >
                <input
            className="input"
placeholder = "Поиск навыка…"
value = { search }
onChange = { e => setSearch(e.target.value) }
    />
    </div>
    </div>

{
    loading ? (
        <div style= {{
        display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12
    }
}>
{ [1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={ i } height = { 90} radius = { 14} />) }
    </div>
      ) : filtered.length === 0 ? (
    <div className= "card" >
    <EmptyState
            illustration={ <IllAward size={ 110 } /> }
title = { items.length === 0 ? 'Навыков пока нет' : 'Ничего не найдено' }
text = {
    items.length === 0
        ? 'Добавьте первую компетенцию — например «Первая помощь» или «Вождение автомобиля»'
        : 'Попробуйте другой запрос'
}
action = { canEdit && items.length === 0 ? (
    <button className= "btn btn-primary btn-sm" onClick = {() => setShowForm(true)}>
        <Plus size={ 14 } /> Добавить
            </button>
            ) : undefined}
          />
    </div>
      ) : (
    <div style= {{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {
        Array.from(grouped.entries()).map(([level, list]) => (
            <div key= { level } >
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12
        }} >
        <Badge variant={ levelVariant(level) }> { level } </Badge>
            < span style = {{ fontSize: 12, color: 'var(--text-3)' }}>
            { list.length } { list.length === 1 ? 'навык' : list.length < 5 ? 'навыка' : 'навыков' }
</span>
    < div style = {{
    flex: 1,
        height: 1,
            background: 'var(--border)',
                marginLeft: 4
}} />
    </div>

    < div style = {{
    display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12
}}>
    <AnimatePresence>
    {
        list.map((s, i) => (
            <motion.div
                      key= { s.skillId }
                      initial = {{ opacity: 0, y: 8 }}
animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.95 }}
transition = {{ delay: i * 0.02 }}
style = {{
    background: 'var(--surface)',
        border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
                padding: 16,
                    display: 'flex',
                        flexDirection: 'column',
                            gap: 10,
                                transition: 'all .15s'
}}
onMouseEnter = { el => {
    el.currentTarget.style.borderColor = 'var(--primary)';
    el.currentTarget.style.transform = 'translateY(-2px)';
}}
onMouseLeave = { el => {
    el.currentTarget.style.borderColor = 'var(--border)';
    el.currentTarget.style.transform = 'none';
}}
                    >
    <div style={ { display: 'flex', alignItems: 'flex-start', gap: 10 } }>
        <div style={
            {
                width: 36, height: 36,
                    borderRadius: 'var(--r-md)',
                        background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                            color: 'var(--primary)',
                                display: 'flex',
                                    alignItems: 'center',
                                        justifyContent: 'center',
                                            flexShrink: 0
            }
}>
    <Award size={ 18 } />
        </div>
        < div style = {{ flex: 1, minWidth: 0 }}>
            <div style={
                {
                    fontFamily: 'var(--font-head)',
                        fontWeight: 700,
                            fontSize: 14,
                                lineHeight: 1.3,
                                    overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                }
} title = { s.skillName } >
{ s.skillName }
    </div>
    </div>
{
    isAdmin && (
        <button
                            className="btn btn-icon btn-danger"
    onClick = {() => handleDelete(s.skillId)
}
title = "Удалить"
    >
    <Trash2 size={ 13 } />
        </button>
                        )}
</div>

    < div style = {{
    display: 'flex',
        alignItems: 'center',
            gap: 6,
                fontSize: 12,
                    color: 'var(--text-2)',
                        paddingTop: 10,
                            borderTop: '1px solid var(--border)'
}}>
    <Users size={ 13 } style = {{ color: 'var(--text-3)' }} />
        <span>
{
    s.assignedCount > 0
    ? `${s.assignedCount} ${s.assignedCount === 1 ? 'волонтёр' : s.assignedCount < 5 ? 'волонтёра' : 'волонтёров'}`
    : 'никому не назначен'
}
</span>
    </div>
    </motion.div>
                  ))}
</AnimatePresence>
    </div>
    </div>
          ))}
</div>
      )}

<Modal
        open={ showForm }
title = "Новый навык"
onClose = {() => setShowForm(false)}
footer = {
          <>
    <button className="btn btn-ghost" onClick = {() => setShowForm(false)}> Отмена </button>
        < button className = "btn btn-primary" onClick = { handleCreate } > Создать </button>
            </>
        }
      >
    <div className="field" >
        <label className="field-label" > Название * </label>
            < input
className = "input"
value = { form.skillName }
onChange = { e => setForm({ ...form, skillName: e.target.value })}
placeholder = "Например: Вождение автомобиля"
autoFocus
    />
    </div>
    < div className = "field" >
        <label className="field-label" > Уровень * </label>
            < select
className = "select"
value = { form.level }
onChange = { e => setForm({ ...form, level: e.target.value })}
          >
{ LEVELS.map(l => <option key={ l } value = { l } > { l } </option>) }
    </select>
    < div className = "field-hint" >
        Для языков используйте CEFR: A1–C2.Для умений — «Начальный / Средний / Профессиональный».
</div>
    </div>
    </Modal>
    </div>
  );
}