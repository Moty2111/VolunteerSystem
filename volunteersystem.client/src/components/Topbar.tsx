import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Plus, ChevronDown, Menu, Check, Handshake, Users, Calendar as CalIcon, UserCircle, Sun, Moon, LogOut, Award } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notifStore } from '../utils/notifStore';
import { notificationsApi, type Notification } from '../api/notifications';


interface Props {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const TITLES: Record<string, string> = {
  '/dashboard': 'Дашборд',
  '/calendar': 'Календарь',
  '/volunteers': 'Волонтёры',
  '/events': 'Мероприятия',
  '/assignments': 'Назначения',
  '/skills': 'Навыки',
  '/partners': 'Партнёры',
  '/reports': 'Отчёты',
  '/users': 'Учётные записи',
  '/audit': 'Журнал аудита',
  '/my-assignments': 'Мои назначения',
  '/my-skills': 'Мои навыки',
  '/my-progress': 'Мой прогресс',
  '/profile': 'Мой профиль',
  '/notifications': 'Уведомления'
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
    case 'confirm': return 'Подтверждение';
    case 'partner': return 'Новый партнёр';
    case 'event': return 'Скоро мероприятие';
    default: return 'Назначение';
  }
};

export default function Topbar({ onOpenSearch, onToggleSidebar, sidebarCollapsed }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const currentTitle = TITLES[location.pathname] || 'Страница';
  const isHome = location.pathname === '/dashboard';

  useEffect(() => {
    (async () => {
      try {
        const list = await notificationsApi.getAll();
        setNotifications(list);
        notifStore.set(list.length);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);


  const canCreate = user?.role === 'Администратор' || user?.role === 'Менеджер';

  const toggleLabel = sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню';

  return (
    <header className="topbar">
      <button
        className="icon-btn mobile-only cool-tip tip-below"
        onClick={onToggleSidebar}
        aria-label={toggleLabel}
        data-tip={toggleLabel}
      >
        <Menu size={18} />
      </button>

      <nav className="breadcrumbs" aria-label="Хлебные крошки">
        <Link to="/dashboard">Главная</Link>
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
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(o => !o)}>
            <Plus size={15} /> <span className="btn-label">Создать</span> <ChevronDown size={13} style={{ marginLeft: -2 }} />
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
                  { label: 'Мероприятие', path: '/events', Icon: CalIcon, color: 'var(--primary)' },
                  { label: 'Волонтёр', path: '/volunteers', Icon: Users, color: 'var(--accent)' },
                  { label: 'Навык', path: '/skills', Icon: Award, color: 'var(--warning)' },
                  { label: 'Партнёр', path: '/partners', Icon: Handshake, color: 'var(--info)', adminOnly: true }
                ]
                  .filter(o => !o.adminOnly || user?.role === 'Администратор')
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
                      <span style={{
                        display: 'inline-flex',
                        width: 26, height: 26, borderRadius: 8,
                        alignItems: 'center', justifyContent: 'center',
                        color: o.color,
                        background: `color-mix(in srgb, ${o.color} 15%, transparent)`
                      }}>
                        <o.Icon size={14} />
                      </span> {o.label}

                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div style={{ position: 'relative' }} ref={notifRef}>
        <button
          className="icon-btn notif-btn cool-tip tip-below tip-edge-right"
          onClick={() => setNotifOpen(o => !o)}
          aria-label="Уведомления"
          data-tip="Уведомления"
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
                <strong style={{ fontSize: 14 }}>Уведомления</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {notifications.length} новых
                </span>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {notifications.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    Уведомлений нет
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
                  onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                >
                  Все уведомления и настройки
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ position: 'relative' }} ref={avatarRef}>
        <button
          className={`topbar-avatar cool-tip tip-below tip-edge-right ${avatarOpen ? 'open' : ''}`}
          onClick={() => setAvatarOpen(o => !o)}
          aria-label="Меню аккаунта"
          data-tip="Аккаунт"
        >
          {(user?.loginName || 'U').slice(0, 2).toUpperCase()}
        </button>
        <AnimatePresence>
          {avatarOpen && (
            <motion.div
              className="avatar-menu"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <div className="avatar-menu-head">
                <strong>{user?.loginName}</strong>
                <span>{user?.role}</span>
              </div>
              <button
                className="avatar-menu-item"
                onClick={() => { setAvatarOpen(false); navigate('/profile'); }}
              >
                <UserCircle size={15} /> Мой профиль
              </button>
              <button className="avatar-menu-item" onClick={() => { setAvatarOpen(false); toggleTheme(); }}>
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              </button>
              <button
                className="avatar-menu-item danger"
                onClick={() => { setAvatarOpen(false); logout(); navigate('/login'); }}
              >
                <LogOut size={15} /> Выйти
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

