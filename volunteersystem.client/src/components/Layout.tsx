import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../api/events';
import { notifStore } from '../utils/notifStore';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import CommandPalette from './CommandPalette';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import {
    LayoutDashboard, Users, Calendar, CheckSquare, Award, Briefcase,
    BarChart3, LogOut, ChevronsLeft, ChevronsRight, UserCircle, Bell,
    CalendarDays, History, UserCog, Target
} from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [eventCount, setEventCount] = useState<number | null>(null);
    const [unread, setUnread] = useState(notifStore.get());

    const isAdmin = user?.role === 'Администратор';
    const isManager = user?.role === 'Менеджер';
    const isVolunteer = user?.role === 'Волонтёр';
    const initials = user?.loginName?.slice(0, 2).toUpperCase() || 'U';

    useEffect(() => {
        (async () => {
            try {
                const list = await eventsApi.getAll({ status: 'Запланировано' });
                setEventCount(list.length);
            } catch { /* ignore */ }
        })();
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    useEffect(() => notifStore.sub(setUnread), []);

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className= "app-shell" >
        <aside className={ `sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}` }>
            <div className="sidebar-logo" >
                <Logo size={ collapsed ? 36 : 42 } markOnly = { collapsed } />

                    {!collapsed && (
                        <button
              className="icon-btn cool-tip tip-below"
    style = {{ marginLeft: 'auto' }
}
onClick = {() => setCollapsed(true)}
data-tip = "Свернуть меню"
aria-label = "Свернуть меню"
    >
    <ChevronsLeft size={ 16 } />
        </button>
          )}

{
    collapsed && (
        <div className="sidebar-collapse-row" >
            <button
                  className="icon-btn"
    onClick = {() => setCollapsed(false)}
data-tip = "Развернуть меню"
    aria-label = "Развернуть меню"
    >
    <ChevronsRight size={ 16 } />
        </button>
            </div>
          )}
</div>

    < nav className = "sidebar-nav" >
        <div className="sidebar-section" > { collapsed? '•': 'Главное' } </div>
            < NavLink to = "/dashboard" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard />
                < span className = "hide-collapsed" > Дашборд </span>
                    </NavLink>

            < NavLink to = "/calendar" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <CalendarDays />
                < span className = "hide-collapsed" > Календарь </span>
                    </NavLink>

{
    (isAdmin || isManager) && (
        <>
        <div className="sidebar-section" > { collapsed? '•': 'Управление' } </div>

            < NavLink to = "/volunteers" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`
}>
    <Users />
    < span className = "hide-collapsed" > Волонтёры </span>
        </NavLink>

        < NavLink to = "/events" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Calendar />
            < span className = "hide-collapsed" > Мероприятия </span>
{
    !collapsed && eventCount !== null && eventCount > 0 && (
        <span className="link-count" > { eventCount } </span>
                )
}
</NavLink>

    < NavLink to = "/assignments" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <CheckSquare />
        < span className = "hide-collapsed" > Назначения </span>
            </NavLink>

            < NavLink to = "/skills" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Award />
                < span className = "hide-collapsed" > Навыки </span>
                    </NavLink>

{
    isAdmin && (
        <NavLink to="/partners" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`
}>
    <Briefcase />
    < span className = "hide-collapsed" > Партнёры </span>
        </NavLink>
              )}

<NavLink to="/reports" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
    <BarChart3 />
    < span className = "hide-collapsed" > Отчёты </span>
        </NavLink>

{
    isAdmin && (
        <>
        <div className="sidebar-section" > { collapsed? '•': 'Администрирование' } </div>

            < NavLink to = "/users" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <UserCog />
                < span className = "hide-collapsed" > Учётные записи </span>
                    </NavLink>

        <NavLink to="/audit" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <History />
            < span className = "hide-collapsed" > Журнал аудита </span>
                </NavLink>
        </>
              )}
          </>
          )}

{
    isVolunteer && (
        <>
        <div className="sidebar-section" > { collapsed? '•': 'Мой кабинет' } </div>

            < NavLink to = "/events" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`
}>
    <Calendar />
    < span className = "hide-collapsed" > Мероприятия </span>
{
    !collapsed && eventCount !== null && eventCount > 0 && (
        <span className="link-count" > { eventCount } </span>
                )
}
</NavLink>

    < NavLink to = "/my-assignments" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <CheckSquare />
        < span className = "hide-collapsed" > Мои назначения </span>
            </NavLink>

    < NavLink to = "/my-skills" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <Award />
        < span className = "hide-collapsed" > Мои навыки </span>
            </NavLink>

        < NavLink to = "/my-progress" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Target />
            < span className = "hide-collapsed" > Мой прогресс </span>
                </NavLink>
            </>
          )}

<div className="sidebar-section" > { collapsed? '•': 'Аккаунт' } </div>
    < NavLink to = "/notifications" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <Bell />
        < span className = "hide-collapsed" > Уведомления </span>
{
    !collapsed && unread > 0 && (
        <span className="link-count link-count-hot"> { unread > 99 ? '99+' : unread } </span>
    )
}
            </NavLink>
            < NavLink to = "/profile" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <UserCircle />
                < span className = "hide-collapsed" > Мой профиль </span>
                    </NavLink>
                    </nav>

            < div className = "sidebar-user" >
                <div className="sidebar-user-info" >
                    <div className="sidebar-user-avatar" > { initials } </div>

{
    !collapsed && (
        <>
        <div style={ { flex: 1, minWidth: 0 } }>
            <div className="sidebar-user-name" > { user?.loginName } </div>
                < div className = "sidebar-user-role" > { user?.role } </div>
                    </div>
                    < ThemeToggle />
                    </>
            )
}
</div>

    < button
className = "btn btn-ghost btn-sm"
style = {{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
onClick = { handleLogout }
    >
    <LogOut size={ 15 } />
{ !collapsed && <span>Выйти </span> }
</button>
    </div>
    </aside>

{
    mobileOpen && (
        <div className="mobile-backdrop" onClick = {() => setMobileOpen(false)
} />
      )}

<main className="main" >
    <Topbar
          onOpenSearch={ () => setSearchOpen(true) }
onToggleSidebar = {() => setMobileOpen(o => !o)}
sidebarCollapsed = { collapsed }
    />
    <div className="main-content" >
        <AnimatePresence mode = "wait" >
        <motion.div
            key = { location.pathname }
    initial = {{ opacity: 0, y: 10 }
}
    animate = {{ opacity: 1, y: 0 }}
exit = {{ opacity: 0, y: -8 }}
transition = {{ duration: 0.18, ease: 'easeOut' }}
        >
    <Outlet />
        </motion.div>
            </AnimatePresence>
        </div>
        </main>

        < BottomNav />

        < CommandPalette open = { searchOpen } onClose = {() => setSearchOpen(false)} />
            </div>
  );
}
