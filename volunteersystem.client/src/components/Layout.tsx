import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../api/events';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import {
    LayoutDashboard, Users, Calendar, CheckSquare, Award, Briefcase,
    BarChart3, LogOut, ChevronsLeft, ChevronsRight, UserCircle
} from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [eventCount, setEventCount] = useState<number | null>(null);

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

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className= "app-shell" >
        <aside className={ `sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}` }>
            <div className="sidebar-logo" >
                <Logo size={ collapsed ? 36 : 42 } markOnly = { collapsed } />

                    {!collapsed && (
                        <button
              className="icon-btn"
    style = {{ marginLeft: 'auto' }
}
onClick = {() => setCollapsed(true)}
title = "Свернуть меню"
    >
    <ChevronsLeft size={ 16 } />
        </button>
          )}

{
    collapsed && (
        <button
              className="icon-btn"
    style = {{ position: 'absolute', bottom: -18, right: 12, zIndex: 2 }
}
onClick = {() => setCollapsed(false)}
title = "Развернуть меню"
    >
    <ChevronsRight size={ 16 } />
        </button>
          )}
</div>

    < nav className = "sidebar-nav" >
        <div className="sidebar-section" > { collapsed? '•': 'Главное' } </div>
            < NavLink to = "/dashboard" className = {({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard />
                < span className = "hide-collapsed" > Дашборд </span>
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
            </>
          )}

<div className="sidebar-section" > { collapsed? '•': 'Аккаунт' } </div>
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
        <Outlet />
        </div>
        </main>

        < CommandPalette open = { searchOpen } onClose = {() => setSearchOpen(false)} />
            </div>
  );
}