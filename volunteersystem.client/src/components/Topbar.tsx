import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Plus, ChevronDown, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface Props {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const TITLES: Record<string, string> = {
  '/dashboard': 'Дашборд',
  '/volunteers': 'Волонтёры',
  '/events': 'Мероприятия',
  '/assignments': 'Назначения',
  '/skills': 'Навыки',
  '/partners': 'Партнёры',
  '/reports': 'Отчёты',
  '/my-assignments': 'Мои назначения'
};

const NOTIFICATIONS = [
  { id: 1, text: 'Иванов И. записался на «Субботник в парке»', time: '5 мин назад', type: 'success' as const },
  { id: 2, text: 'Партнёр «Добро» подтвердил договор', time: '1 ч назад', type: 'info' as const },
  { id: 3, text: 'Мероприятие «Помощь детдому» начинается через 2 дня', time: '3 ч назад', type: 'warning' as const }
];

export default function Topbar({ onOpenSearch, onToggleSidebar, sidebarCollapsed }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  const currentTitle = TITLES[location.pathname] || 'Страница';
  const isHome = location.pathname === '/dashboard';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const canCreate = user?.role === 'Администратор' || user?.role === 'Менеджер';

  return (
    <header className="topbar">
      <button
        className="icon-btn mobile-only"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        title="Меню"
      >
        <Menu size={18} />
      </button>

      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <Link to="/dashboard" style={{ color: 'inherit' }}>Главная</Link>
        {!isHome && (
          <>
            <span className="sep">/</span>
            <span className="current">{currentTitle}</span>
          </>
        )}
      </nav>

      <button className="search-trigger" onClick={onOpenSearch}>
        <Search size={15} />
        <span>Поиск по системе…</span>
        <kbd>Ctrl K</kbd>
      </button>

      {canCreate && (
        <div style={{ position: 'relative' }} ref={createRef}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setCreateOpen(o => !o)}
          >
            <Plus size={15} /> Создать <ChevronDown size={13} style={{ marginLeft: -2 }} />
          </button>
          <AnimatePresence>
            {createOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--r-md)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: 220,
                  padding: 6,
                  zIndex: 50
                }}
              >
                {[
                  { label: 'Мероприятие', path: '/events', emoji: '📅' },
                  { label: 'Волонтёр', path: '/volunteers', emoji: '👤' },
                  { label: 'Партнёр', path: '/partners', emoji: '🤝', adminOnly: true }
                ]
                  .filter(o => !o.adminOnly || user?.role === 'Администратор')
                  .map(o => (
                    <button
                      key={o.path}
                      onClick={() => { setCreateOpen(false); navigate(o.path); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 12px',
                        background: 'transparent', border: 'none',
                        color: 'var(--text)', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', borderRadius: 8, textAlign: 'left',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: 16 }}>{o.emoji}</span> {o.label}
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div style={{ position: 'relative' }} ref={notifRef}>
        <button
          className="icon-btn notif-btn"
          onClick={() => setNotifOpen(o => !o)}
          title="Уведомления"
        >
          <Bell size={16} />
          <span className="dot" />
        </button>
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 340,
                background: 'var(--surface)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                zIndex: 50
              }}
            >
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <strong style={{ fontSize: 14 }}>Уведомления</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{NOTIFICATIONS.length} новых</span>
              </div>
              <div>
                {NOTIFICATIONS.map(n => (
                  <div key={n.id} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    cursor: 'pointer'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', marginTop: 6,
                      background: n.type === 'success' ? 'var(--success)'
                        : n.type === 'warning' ? 'var(--warning)' : 'var(--info)',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 10, textAlign: 'center' }}>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                  Показать все
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
