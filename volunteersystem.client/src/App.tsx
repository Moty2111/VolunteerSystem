import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VolunteersPage from './pages/VolunteersPage';
import EventsPage from './pages/EventsPage';
import AssignmentsPage from './pages/AssignmentsPage';
import MyAssignmentsPage from './pages/MyAssignmentsPage';
import PartnersPage from './pages/PartnersPage';
import ReportsPage from './pages/ReportsPage';
import SkillsPage from './pages/SkillsPage';

export default function App() {
    return (
        <AuthProvider>
        <BrowserRouter>
        <Routes>
        <Route path= "/login" element = {< LoginPage />} />
            < Route path = "/register" element = {< RegisterPage />} />

                < Route element = {< ProtectedRoute > <Layout /></ProtectedRoute >}>
                    <Route path="/dashboard" element = {< DashboardPage />} />
                        < Route path = "/events" element = {< EventsPage />} />

                            < Route path = "/volunteers" element = {
              < ProtectedRoute allowedRoles = { ['Администратор', 'Менеджер']} >
    <VolunteersPage />
    </ProtectedRoute>
            } />

    < Route path = "/assignments" element = {
              < ProtectedRoute allowedRoles = { ['Администратор', 'Менеджер']} >
    <AssignmentsPage />
    </ProtectedRoute>
            } />

    < Route path = "/skills" element = {
              < ProtectedRoute allowedRoles = { ['Администратор', 'Менеджер']} >
    <SkillsPage />
    </ProtectedRoute>
            } />

    < Route path = "/partners" element = {
              < ProtectedRoute allowedRoles = { ['Администратор']} >
    <PartnersPage />
    </ProtectedRoute>
            } />

    < Route path = "/reports" element = {
              < ProtectedRoute allowedRoles = { ['Администратор', 'Менеджер']} >
    <ReportsPage />
    </ProtectedRoute>
            } />

    < Route path = "/my-assignments" element = {
              < ProtectedRoute allowedRoles = { ['Волонтёр']} >
    <MyAssignmentsPage />
    </ProtectedRoute>
            } />
    </Route>

    < Route path = "/" element = {< Navigate to = "/dashboard" replace />} />
        < Route path = "*" element = {< Navigate to = "/dashboard" replace />} />
            </Routes>
            </BrowserRouter>
            </AuthProvider>
  );
}