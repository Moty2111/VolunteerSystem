import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Calendar, Award, Briefcase, BarChart3, LayoutDashboard } from 'lucide-react';
import { volunteersApi } from '../api/volunteers';
import { eventsApi } from '../api/events';
import type { Volunteer, EventItem } from '../types';

interface Props {
    open: boolean;
    onClose: () => void;
}

interface Item {
    id: string;
    label: string;
    sub?: string;
    icon: React.ReactNode;
    action: () => void;
    group: string;
}

export default function CommandPalette({ open, onClose }: Props) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);

    useEffect(() => {
        if (!open) { setQuery(''); return; }
        setTimeout(() => inputRef.current?.focus(), 30);
        (async () => {
            try {
                const [v, e] = await Promise.all([
                    volunteersApi.getAll({ active: true }),
                    eventsApi.getAll()
                ]);
                setVolunteers(v);
                setEvents(e);
            } catch { /* ignore */ }
        })();
    }, [open]);

    const pages: Item[] = [
        { id: 'p-dash', group: 'Страницы', label: 'Дашборд', icon: <LayoutDashboard size={ 16} />, action: () => navigate('/dashboard') },
{
    id: 'p-vol', group: 'Страницы', label: 'Волонтёры', icon: <Users size={ 16 } />, action: () => navigate('/volunteers') },
    {
        id: 'p-ev', group: 'Страницы', label: 'Мероприятия', icon: <Calendar size={ 16 } />, action: () => navigate('/events') },
        {
            id: 'p-sk', group: 'Страницы', label: 'Навыки', icon: <Award size={ 16 } />, action: () => navigate('/skills') },
            {
                id: 'p-part', group: 'Страницы', label: 'Партнёры', icon: <Briefcase size={ 16 } />, action: () => navigate('/partners') },
                {
                    id: 'p-rep', group: 'Страницы', label: 'Отчёты', icon: <BarChart3 size={ 16 } />, action: () => navigate('/reports') }
  ];

                    const volItems: Item[] = volunteers.map(v => ({
                        id: `v-${v.volunteerId}`,
                        group: 'Волонтёры',
                        label: v.fullName,
                        sub: `${v.city} · ${v.email}`,
                        icon: <Users size={ 16} />,
                        action: () => navigate('/volunteers')
  }));

                const evItems: Item[] = events.map(e => ({
                    id: `e-${e.eventId}`,
                    group: 'Мероприятия',
                    label: e.eventName,
                    sub: `${new Date(e.dateStart).toLocaleDateString('ru-RU')} · ${e.location}`,
                    icon: <Calendar size={ 16} />,
                    action: () => navigate('/events')
  }));

            const q = query.trim().toLowerCase();
            const filtered = [...pages, ...volItems, ...evItems].filter(i => {
                if (!q) return true;
                return i.label.toLowerCase().includes(q) || i.sub?.toLowerCase().includes(q);
            }).slice(0, 20);

            useEffect(() => { setSelectedIdx(0); }, [query]);

            useEffect(() => {
                if (!open) return;
                const onKey = (e: KeyboardEvent) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
                    else if (e.key === 'Enter') {
                        e.preventDefault();
                        const item = filtered[selectedIdx];
                        if (item) { item.action(); onClose(); }
                    } else if (e.key === 'Escape') onClose();
                };
                window.addEventListener('keydown', onKey);
                return () => window.removeEventListener('keydown', onKey);
            }, [open, filtered, selectedIdx, onClose]);

            const groups: Record<string, Item[]> = {};
            filtered.forEach(i => { (groups[i.group] ||= []).push(i); });
            let runningIdx = -1;

            return (
                <AnimatePresence>
                { open && (
                    <motion.div
          className= "modal-backdrop"
            initial = {{ opacity: 0 }
        } animate = {{ opacity: 1 }
    } exit = {{ opacity: 0 }
}
onClick = { onClose }
style = {{ alignItems: 'flex-start', paddingTop: '12vh' }}
        >
    <motion.div
            onClick={ e => e.stopPropagation() }
initial = {{ opacity: 0, y: -8, scale: 0.98 }}
animate = {{ opacity: 1, y: 0, scale: 1 }}
exit = {{ opacity: 0, y: -8, scale: 0.98 }}
transition = {{ duration: 0.18 }}
style = {{
    width: '100%', maxWidth: 620,
        background: 'var(--surface)',
            border: '1px solid var(--border-2)',
                borderRadius: 'var(--r-lg)',
                    boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden'
}}
          >
    <div style={
        {
            display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px', borderBottom: '1px solid var(--border)'
        }
}>
    <Search size={ 18 } style = {{ color: 'var(--text-3)' }} />
        < input
ref = { inputRef }
value = { query }
onChange = { e => setQuery(e.target.value) }
placeholder = "Поиск волонтёров, мероприятий, разделов…"
style = {{
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
        color: 'var(--text)', fontSize: 15, fontFamily: 'inherit'
}}
              />
    < kbd style = {{
    fontFamily: 'var(--font-mono)', fontSize: 10,
        padding: '3px 6px', borderRadius: 4,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-3)'
}}> ESC </kbd>
    </div>

    < div style = {{ maxHeight: 400, overflowY: 'auto', padding: 6 }}>
    {
        filtered.length === 0 ? (
            <div style= {{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Ничего не найдено
                    </div>
              ) : (
    Object.entries(groups).map(([group, items]) => (
        <div key= { group } >
        <div style={{
        padding: '8px 12px 4px',
        fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 700
    }}> { group } </div>
                    {
            items.map(item => {
                runningIdx++;
                const active = runningIdx === selectedIdx;
                return (
                    <button
                          key= { item.id }
                onClick = {() => { item.action(); onClose(); }
            }
                          onMouseEnter = {() => setSelectedIdx(runningIdx)}
                          style = {{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 12px',
        background: active ? 'var(--surface-2)' : 'transparent',
        border: 'none', cursor: 'pointer',
        borderRadius: 8, textAlign: 'left',
        color: 'var(--text)', fontFamily: 'inherit'
    }}
                        >
        <span style={{
        width: 30, height: 30, borderRadius: 8,
        background: active ? 'var(--primary)' : 'var(--surface-2)',
        color: active ? '#fff' : 'var(--text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
    }}> { item.icon } </span>
    < div style = {{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    { item.label }
    </div>
                            {
            item.sub && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                { item.sub }
    </div>
    )}
</div>
    </button>
                      );
                    })}
</div>
                ))
              )}
</div>

    < div style = {{
    padding: '8px 14px',
        borderTop: '1px solid var(--border)',
            background: 'var(--surface-2)',
                display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-3)'
}}>
    <span><kbd style={ { fontFamily: 'var(--font-mono)' } }>↑↓</kbd> навигация</span >
        <span><kbd style={ { fontFamily: 'var(--font-mono)' } }>↵</kbd> открыть</span >
            <span><kbd style={ { fontFamily: 'var(--font-mono)' } }> ESC < /kbd> закрыть</span >
                </div>
                </motion.div>
                </motion.div>
      )}
</AnimatePresence>
  );
}