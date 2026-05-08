import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context.jsx';
import Login from './screens/Login.jsx';
import Pending from './screens/Pending.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Companies from './screens/Companies.jsx';
import TimeEntry from './screens/TimeEntry.jsx';
import AccessManager from './screens/AccessManager.jsx';
import Layout from './components/Layout.jsx';

function ProtectedAndApproved({ children }) {
  const { user, isApproved, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved) return <Navigate to="/pending" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, isApproved, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (isApproved ? <Navigate to="/" replace /> : <Navigate to="/pending" replace />) : <Login />
        }
      />
      <Route
        path="/pending"
        element={
          !user ? <Navigate to="/login" replace /> : isApproved ? <Navigate to="/" replace /> : <Pending />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedAndApproved>
            <Layout />
          </ProtectedAndApproved>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="entry" element={<TimeEntry />} />
        <Route path="companies" element={<Companies />} />
        <Route
          path="access"
          element={
            <AdminOnly>
              <AccessManager />
            </AdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
