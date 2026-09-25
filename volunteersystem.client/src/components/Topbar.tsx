import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Plus, ChevronDown, Menu, Check, Handshake, Calendar as CalIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { notificationsApi, type Notification } from '../api/notifications';

interface Props {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const TITLES: Record<string, string> = {
  '/dashboard': 'ашборд',
  '/volunteers': 'олонтёры',
  '/events': 'ероприятия',
  '/assignments': 'азначения',
  '/skills': 'авыки',
  '/partners': 'артнёры',
  '/reports': 'тчёты',
  '/my-assignments': 'ои назначения',
  '/profile': 'ой профиль'
};

const kindIcon = (kind: Notification['kind']) => {
  switch (kind) {
    case 'confirm': return <Check size={14} />;
    case 'partner': return <Handshake size={14} />;
    case 'event': return <CalIcon size={14} />;
    default: return <Check size={14} />;
  }
};

const kindColor = (kind: Notification['kind']) => {
  switch (kind) {
    case 'confirm': return 'var(--success)';
    case 'partner': return 'var(--info)';
    case 'event': return 'var(--warning)';
    default: return 'var(--primary)';
  }
};

const kindText = (kind: Notification['kind']) => {
  switch (kind) {
    case 'confirm': return 'одтверждение';
    case 'partner': return 'овый партнёр';
    case 'event': return 'Скоро мероприятие';
    default: return 'азначение';
  }
};

export default function Topbar({ onOpenSearch, onToggleSidebar, sidebarCollapsed }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  const currentTitle = TITLES[location.pathname] || 'Страница';
  const isHome = location.pathname === '/dashboard';

  useEffect(() => {
    (async () => {
      try {
        const list = await notificationsApi.getAll();
        setNotifications(list);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const canCreate = user?.role === 'дминистратор' || user?.role === 'енеджер';

  const toggleLabel = sidebarCollapsed ? 'азвернуть меню' : 'Свернуть меню';

  return (
    <header className="topbar">
      <button
        className="icon-btn mobile-only"
        onClick={onToggleSidebar}
        aria-label={toggleLabel}
        title="еню"
      >
        <Menu size={18} />
      </button>

      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <Link to="/dashboard">лавная</Link>
        {!isHome && (
          <>
            <span className="sep">/</span>
            <span className="current">{currentTitle}</span>
          </>
        )}
      </nav>

      <button className="search-trigger" onClick={onOpenSearch}>
        <Search size={15} />
        <span>оиск по системе…</span>
        <kbd>Ctrl K</kbd>
      </button>

      {canCreate && (
        <div style={{ position: 'relative' }} ref={createRef}>
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(o => !o)}>
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
                  { label: 'ероприятие', path: '/events', emoji: '📅' },
                  { label: 'олонтёр', path: '/volunteers', emoji: '👤' },
                  { label: 'артнёр', path: '/partners', emoji: '🤝', adminOnly: true }
                ]
                  .filter(o => !o.adminOnly || user?.role === 'дминистратор')
                  .map(o => (
                    <button
                      key={o.path}
                      onClick={() => { setCreateOpen(false); navigate(o.path); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '9px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        borderRadius: 8,
                        textAlign: 'left',
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
          title="ведомления"
        >
          <Bell size={16} />
          {notifications.length > 0 && <span className="dot" />}
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
                width: 360,
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <strong style={{ fontSize: 14 }}>ведомления</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {notifications.length} новых
                </span>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {notifications.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    ведомлений нет
                  </div>
                )}
                {notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'color-mix(in srgb, ' + kindColor(n.kind) + ' 15%, transparent)',
                      color: kindColor(n.kind),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {kindIcon(n.kind)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>
                        {kindText(n.kind)}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                        {new Date(n.at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 10, textAlign: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => { setNotifOpen(false); navigate('/events'); }}
                >
                  оказать все
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
