import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, Calendar, CalendarDays, Award, Briefcase, BarChart3,
  LayoutDashboard, CheckSquare, UserCog, History, Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
  icon: ReactNode;
  action: () => void;
  group: string;
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const role = user?.role;
  const isAdmin = role === 'Администратор';
  const isStaff = isAdmin || role === 'Менеджер';
  const isVolunteer = role === 'Волонтёр';

  const [query, setQuery] = useState('');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIdx(0);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    (async () => {
      try {
        const [v, e] = await Promise.all([
          /* список волонтёров — только для тех, у кого есть доступ */
          isStaff ? volunteersApi.getAll({ active: true }) : Promise.resolve([] as Volunteer[]),
          eventsApi.getAll()
        ]);
        setVolunteers(v);
        setEvents(e);
      } catch {
        /* ignore */
      }
    })();
    return () => clearTimeout(t);
  }, [open, isStaff]);

  /* пока палитра открыта — фон не скроллится */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const pages: Item[] = useMemo(() => {
    const list: Item[] = [
      { id: 'p-dash', group: 'Страницы', label: 'Дашборд', icon: <LayoutDashboard size={16} />, action: () => navigate('/dashboard') },
      { id: 'p-cal', group: 'Страницы', label: 'Календарь', icon: <CalendarDays size={16} />, action: () => navigate('/calendar') },
      { id: 'p-ev', group: 'Страницы', label: 'Мероприятия', icon: <Calendar size={16} />, action: () => navigate('/events') }
    ];

    if (isStaff) {
      list.push(
        { id: 'p-vol', group: 'Страницы', label: 'Волонтёры', icon: <Users size={16} />, action: () => navigate('/volunteers') },
        { id: 'p-asg', group: 'Страницы', label: 'Назначения', icon: <CheckSquare size={16} />, action: () => navigate('/assignments') },
        { id: 'p-sk', group: 'Страницы', label: 'Навыки', icon: <Award size={16} />, action: () => navigate('/skills') },
        { id: 'p-rep', group: 'Страницы', label: 'Отчёты', icon: <BarChart3 size={16} />, action: () => navigate('/reports') }
      );
    }

    if (isAdmin) {
      list.push(
        { id: 'p-part', group: 'Страницы', label: 'Партнёры', icon: <Briefcase size={16} />, action: () => navigate('/partners') },
        { id: 'p-users', group: 'Страницы', label: 'Учётные записи', icon: <UserCog size={16} />, action: () => navigate('/users') },
        { id: 'p-audit', group: 'Страницы', label: 'Журнал аудита', icon: <History size={16} />, action: () => navigate('/audit') }
      );
    }

    if (isVolunteer) {
      list.push(
        { id: 'p-myasg', group: 'Страницы', label: 'Мои назначения', icon: <CheckSquare size={16} />, action: () => navigate('/my-assignments') },
        { id: 'p-mysk', group: 'Страницы', label: 'Мои навыки', icon: <Award size={16} />, action: () => navigate('/my-skills') },
        { id: 'p-mypr', group: 'Страницы', label: 'Мой прогресс', icon: <Target size={16} />, action: () => navigate('/my-progress') }
      );
    }

    return list;
  }, [navigate, isStaff, isAdmin, isVolunteer]);

  const volItems: Item[] = useMemo(() => volunteers.map(v => ({
    id: `v-${v.volunteerId}`,
    group: 'Волонтёры',
    label: v.fullName,
    sub: `${v.city} · ${v.email}`,
    icon: <Users size={16} />,
    action: () => navigate('/volunteers')
  })), [volunteers, navigate]);

  const evItems: Item[] = useMemo(() => events.map(e => ({
    id: `e-${e.eventId}`,
    group: 'Мероприятия',
    label: e.eventName,
    sub: `${new Date(e.dateStart).toLocaleDateString('ru-RU')} · ${e.location}`,
    icon: <Calendar size={16} />,
    action: () => navigate('/events')
  })), [events, navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...pages, ...volItems, ...evItems];
    if (!q) return all.slice(0, 20);
    return all.filter(i =>
      i.label.toLowerCase().includes(q) || (i.sub?.toLowerCase().includes(q) ?? false)
    ).slice(0, 20);
  }, [query, pages, volItems, evItems]);

  /* группировка с сохранением сквозного индекса для клавиатуры */
  const groups = useMemo(() => {
    const out: { name: string; items: { item: Item; idx: number }[] }[] = [];
    filtered.forEach((item, idx) => {
      const last = out[out.length - 1];
      if (last && last.name === item.group) last.items.push({ item, idx });
      else out.push({ name: item.group, items: [{ item, idx }] });
    });
    return out;
  }, [filtered]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>('[data-idx="' + selectedIdx + '"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIdx];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      /* фокус остаётся в поле поиска: список управляется стрелками */
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop cp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="cp"
            role="dialog"
            aria-modal="true"
            aria-label="Поиск по системе"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="cp-head">
              <Search size={18} className="cp-head-icon" />
              <input
                ref={inputRef}
                className="cp-input"
                role="combobox"
                aria-expanded="true"
                aria-controls="cp-list"
                aria-autocomplete="list"
                aria-activedescendant={filtered[selectedIdx] ? `cp-opt-${selectedIdx}` : undefined}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Поиск волонтёров, мероприятий, разделов…"
              />
              <kbd className="cp-kbd">ESC</kbd>
            </div>

            <div className="cp-list" id="cp-list" role="listbox" ref={listRef}>
              {filtered.length === 0 ? (
                <div className="cp-empty">
                  <Search size={26} className="cp-empty-icon" />
                  <div className="cp-empty-title">Ничего не найдено</div>
                  <div className="cp-empty-text">Попробуйте другой запрос — например, «навыки» или «отчёты»</div>
                </div>
              ) : (
                groups.map(g => (
                  <div key={g.name} role="group" aria-label={g.name}>
                    <div className="cp-group">{g.name}</div>
                    {g.items.map(({ item, idx }) => {
                      const active = idx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          id={`cp-opt-${idx}`}
                          data-idx={idx}
                          role="option"
                          aria-selected={active}
                          tabIndex={-1}
                          className={`cp-item${active ? ' is-active' : ''}`}
                          onClick={() => { item.action(); onClose(); }}
                          onMouseEnter={() => setSelectedIdx(idx)}
                        >
                          <span className={`cp-item-icon${active ? ' is-active' : ''}`}>
                            {item.icon}
                          </span>
                          <span className="cp-item-text">
                            <span className="cp-item-label">{item.label}</span>
                            {item.sub && <span className="cp-item-sub">{item.sub}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="cp-foot">
              <span><kbd>↑↓</kbd> навигация</span>
              <span><kbd>↵</kbd> открыть</span>
              <span><kbd>ESC</kbd> закрыть</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
