import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, CheckSquare, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* Нижняя панель навигации для мобильной версии (видна ≤900px) */
export default function BottomNav() {
    const { user } = useAuth();
    const isVolunteer = user?.role === 'Волонтёр';

    const items = [
        { to: '/dashboard', label: 'Главная', Icon: LayoutDashboard },
        { to: '/events', label: 'События', Icon: Calendar },
        {
            to: isVolunteer ? '/my-assignments' : '/assignments',
            label: 'Назначения',
            Icon: CheckSquare
        },
        { to: '/profile', label: 'Профиль', Icon: UserCircle }
    ];

    return (
        <nav className="bottom-nav" aria-label="Мобильная навигация">
            {items.map(({ to, label, Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                >
                    <Icon size={19} />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
