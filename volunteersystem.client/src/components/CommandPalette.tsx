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
    setTimeout(() => inputRef.current?.focus(), 30);
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
  }, [open, isStaff]);

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
    }
  };

  const groups: Record<string, Item[]> = {};
  filtered.forEach(i => {
    (groups[i.group] ||= []).push(i);
  });
  let runningIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ alignItems: 'flex-start', paddingTop: '12vh' }}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{
              width: '100%',
              maxWidth: 620,
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)'
            }}>
              <Search size={18} style={{ color: 'var(--text-3)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Поиск волонтёров, мероприятий, разделов…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 15,
                  fontFamily: 'inherit'
                }}
              />
              <kbd style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '3px 6px',
                borderRadius: 4,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)'
              }}>
                ESC
              </kbd>
            </div>

            <div ref={listRef} style={{ maxHeight: 400, overflowY: 'auto', padding: 6 }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: 32,
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13
                }}>
                  Ничего не найдено
                </div>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <div style={{
                      padding: '8px 12px 4px',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-3)',
                      fontWeight: 700
                    }}>
                      {group}
                    </div>
                    {items.map(item => {
                      runningIdx++;
                      const active = runningIdx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          data-idx={runningIdx}
                          onClick={() => { item.action(); onClose(); }}
                          onMouseEnter={() => setSelectedIdx(runningIdx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            width: '100%',
                            padding: '10px 12px',
                            background: active ? 'var(--surface-2)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 8,
                            textAlign: 'left',
                            color: 'var(--text)',
                            fontFamily: 'inherit'
                          }}
                        >
                          <span style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: active ? 'var(--primary)' : 'var(--surface-2)',
                            color: active ? '#fff' : 'var(--text-2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {item.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.label}
                            </div>
                            {item.sub && (
                              <div style={{
                                fontSize: 11,
                                color: 'var(--text-3)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.sub}
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

            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'flex',
              gap: 16,
              fontSize: 11,
              color: 'var(--text-3)'
            }}>
              <span><kbd style={{ fontFamily: 'var(--font-mono)' }}>↑↓</kbd> навигация</span>
              <span><kbd style={{ fontFamily: 'var(--font-mono)' }}>↵</kbd> открыть</span>
              <span><kbd style={{ fontFamily: 'var(--font-mono)' }}>ESC</kbd> закрыть</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
