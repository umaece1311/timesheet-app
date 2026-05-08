import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.jsx';
import { signOut, listAllUsers } from '../lib/firebase';

const baseNav = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/entry', label: 'Log Time', icon: 'plus' },
  { to: '/companies', label: 'Companies', icon: 'building' }
];

function Icon({ name }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'home')
    return <svg {...common}><path d="M3 9.5L12 3l9 6.5V21H3z" /><path d="M9 21V12h6v9" /></svg>;
  if (name === 'plus')
    return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>;
  if (name === 'building')
    return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" /></svg>;
  if (name === 'shield')
    return <svg {...common}><path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z" /></svg>;
  return null;
}

/** For admin: poll the count of pending requests so the nav shows a live badge. */
function usePendingCount(isAdmin) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function refresh() {
      try {
        const list = await listAllUsers();
        if (!cancelled) setCount(list.filter((u) => u.status === 'pending').length);
      } catch {
        /* swallow — rules might not be deployed yet */
      }
    }
    refresh();
    const id = setInterval(refresh, 15000); // every 15s
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAdmin]);

  return count;
}

export default function Layout() {
  const { user, isAdmin } = useAuth();
  const pendingCount = usePendingCount(isAdmin);

  const navItems = isAdmin
    ? [...baseNav, { to: '/access', label: 'Access', icon: 'shield', badge: pendingCount }]
    : baseNav;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-row">
            <div className="brand-icon-sm" aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1>Daily Time Sheet</h1>
          </div>
          <div className="user-chip">
            {user?.photoURL && <img src={user.photoURL} alt="" />}
            <span className="muted hide-sm">{user?.displayName || user?.email}</span>
            <button className="link-btn" onClick={() => signOut()}>Sign out</button>
          </div>
        </div>
      </header>

      {isAdmin && pendingCount > 0 && (
        <div className="banner">
          <strong>{pendingCount}</strong> new access {pendingCount === 1 ? 'request' : 'requests'} waiting —
          <NavLink to="/access" className="banner-link">review now</NavLink>
        </div>
      )}

      <div className="main-row">
        <aside className="sidebar">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}
            >
              <Icon name={it.icon} />
              <span className="grow">{it.label}</span>
              {it.badge > 0 && <span className="nav-badge">{it.badge}</span>}
            </NavLink>
          ))}
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) => 'bn-link' + (isActive ? ' active' : '')}
          >
            <span className="bn-icon-wrap">
              <Icon name={it.icon} />
              {it.badge > 0 && <span className="nav-badge floating">{it.badge}</span>}
            </span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
