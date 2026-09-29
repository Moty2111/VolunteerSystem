import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PageLoader from './components/PageLoader';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

/* Страницы грузим отдельными чанками: начальный бандл сразу тонкий,
   тяжёлые библиотеки (recharts, карты) попадают в бандл только своей страницы. */
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const VolunteersPage = lazy(() => import('./pages/VolunteersPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const AssignmentsPage = lazy(() => import('./pages/AssignmentsPage'));
const MyAssignmentsPage = lazy(() => import('./pages/MyAssignmentsPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const MySkillsPage = lazy(() => import('./pages/MySkillsPage'));
const MyProgressPage = lazy(() => import('./pages/MyProgressPage'));

const STAFF = ['Администратор', 'Менеджер'];

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/events" element={<EventsPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/calendar" element={<CalendarPage />} />

                            <Route path="/volunteers" element={
                                <ProtectedRoute allowedRoles={STAFF}><VolunteersPage /></ProtectedRoute>
                            } />
                            <Route path="/assignments" element={
                                <ProtectedRoute allowedRoles={STAFF}><AssignmentsPage /></ProtectedRoute>
                            } />
                            <Route path="/skills" element={
                                <ProtectedRoute allowedRoles={STAFF}><SkillsPage /></ProtectedRoute>
                            } />
                            <Route path="/reports" element={
                                <ProtectedRoute allowedRoles={STAFF}><ReportsPage /></ProtectedRoute>
                            } />

                            <Route path="/partners" element={
                                <ProtectedRoute allowedRoles={['Администратор']}><PartnersPage /></ProtectedRoute>
                            } />
                            <Route path="/users" element={
                                <ProtectedRoute allowedRoles={['Администратор']}><UsersPage /></ProtectedRoute>
                            } />
                            <Route path="/audit" element={
                                <ProtectedRoute allowedRoles={['Администратор']}><AuditPage /></ProtectedRoute>
                            } />

                            <Route path="/my-assignments" element={
                                <ProtectedRoute allowedRoles={['Волонтёр']}><MyAssignmentsPage /></ProtectedRoute>
                            } />
                            <Route path="/my-skills" element={
                                <ProtectedRoute allowedRoles={['Волонтёр']}><MySkillsPage /></ProtectedRoute>
                            } />
                            <Route path="/my-progress" element={
                                <ProtectedRoute allowedRoles={['Волонтёр']}><MyProgressPage /></ProtectedRoute>
                            } />

                            {/* 404 — внутри оболочки, чтобы сохранить меню и топбар */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>

                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}
