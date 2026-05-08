import { useEffect, useMemo, useState } from 'react';
import { listAllUsers, setUserStatus } from '../lib/firebase';
import { useAuth } from '../lib/auth-context.jsx';

const tabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'denied', label: 'Denied' },
  { id: 'all', label: 'All' }
];

export default function AccessManager() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function reload() {
    setLoading(true);
    try {
      const list = await listAllUsers();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, denied: 0 };
    for (const u of users) {
      if (c[u.status] !== undefined) c[u.status]++;
    }
    return c;
  }, [users]);

  const visible = useMemo(() => {
    if (tab === 'all') return users;
    return users.filter((u) => u.status === tab);
  }, [users, tab]);

  async function changeStatus(uid, status) {
    setBusyId(uid);
    try {
      await setUserStatus(uid, status);
      await reload();
    } catch (e) {
      alert(e.message || 'Could not update status.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="screen">
      <header className="screen-header row-between">
        <div>
          <h2>Access Manager</h2>
          <p className="muted">Approve, deny, or revoke access for users who have signed in.</p>
        </div>
        <button className="link-btn" onClick={reload}>Refresh</button>
      </header>

      <div className="tabbar">
        {tabs.map((t) => {
          const count = t.id === 'all' ? users.length : counts[t.id];
          return (
            <button
              key={t.id}
              className={'tab' + (tab === t.id ? ' active' : '')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {count > 0 && (
                <span className={'tab-badge' + (t.id === 'pending' ? ' alert' : '')}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="card">
        {loading ? (
          <p className="muted center">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="muted center">No {tab === 'all' ? '' : tab} users.</p>
        ) : (
          <ul className="list">
            {visible.map((u) => (
              <li key={u.id} className="list-row user-row">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="avatar" />
                ) : (
                  <div className="avatar avatar-fallback">{(u.displayName || u.email || '?').charAt(0).toUpperCase()}</div>
                )}
                <div className="grow">
                  <div className="row-title">
                    {u.displayName || u.email}
                    {u.role === 'admin' && <span className="chip chip-admin">admin</span>}
                    {u.id === me.uid && <span className="chip">you</span>}
                  </div>
                  <div className="muted small">{u.email}</div>
                </div>
                <span className={'chip status status-' + (u.status || 'pending')}>{u.status || 'pending'}</span>

                <div className="user-actions">
                  {u.id === me.uid ? (
                    <span className="muted small">—</span>
                  ) : u.status === 'pending' ? (
                    <>
                      <button
                        className="btn-primary sm"
                        disabled={busyId === u.id}
                        onClick={() => changeStatus(u.id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="link-btn danger"
                        disabled={busyId === u.id}
                        onClick={() => changeStatus(u.id, 'denied')}
                      >
                        Deny
                      </button>
                    </>
                  ) : u.status === 'approved' ? (
                    <button
                      className="link-btn danger"
                      disabled={busyId === u.id}
                      onClick={() => changeStatus(u.id, 'denied')}
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      className="btn-primary sm"
                      disabled={busyId === u.id}
                      onClick={() => changeStatus(u.id, 'approved')}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
