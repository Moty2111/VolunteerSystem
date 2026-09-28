import { useAuth } from '../context/AuthContext';
import AdminDashboard from './dashboard/AdminDashboard';
import ManagerDashboard from './dashboard/ManagerDashboard';
import VolunteerDashboard from './dashboard/VolunteerDashboard';

/* Дашборд отличается по ролям: у каждого свой набор блоков и свои данные */
export default function DashboardPage() {
    const { user } = useAuth();

    if (user?.role === 'Волонтёр') return <VolunteerDashboard />;
    if (user?.role === 'Менеджер') return <ManagerDashboard />;
    return <AdminDashboard />;
}
