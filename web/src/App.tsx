import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { CalendarPage } from './pages/CalendarPage';
import { ClientsPage } from './pages/ClientsPage';
import { ContactDetailPage } from './pages/ContactDetailPage';
import { ContactsPage } from './pages/ContactsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { LoginPage } from './pages/LoginPage';
import { PipelinePage } from './pages/PipelinePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { QuotesPage } from './pages/QuotesPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Comprobando sesión…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/registro"
        element={
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contactos" element={<ContactsPage />} />
        <Route path="/contactos/:id" element={<ContactDetailPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/agenda" element={<CalendarPage />} />
        <Route path="/tareas" element={<TasksPage />} />
        <Route path="/interacciones" element={<ActivitiesPage />} />
        <Route path="/proyectos" element={<ProjectsPage />} />
        <Route path="/presupuestos" element={<QuotesPage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        <Route path="/reportes" element={<ReportsPage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
