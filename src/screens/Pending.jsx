import { useAuth } from '../lib/auth-context.jsx';
import { signOut } from '../lib/firebase';

export default function Pending() {
  const { user, status } = useAuth();

  const denied = status === 'denied';

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="brand-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {denied ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </>
              )}
            </svg>
          </div>
          <h1>{denied ? 'Access denied' : 'Awaiting approval'}</h1>
          <p className="muted">
            {denied
              ? 'The admin has not granted you access to this app.'
              : 'Your sign-in request has been sent to the admin. You’ll get access automatically once it’s approved — just keep this tab open.'}
          </p>
        </div>

        <div className="info-row">
          {user?.photoURL && <img src={user.photoURL} alt="" className="avatar" />}
          <div>
            <div className="row-title">{user?.displayName}</div>
            <div className="muted small">{user?.email}</div>
          </div>
        </div>

        <p className="footnote muted">
          The admin has been notified. You'll get access automatically as soon as it's approved.
        </p>

        <button className="link-btn" onClick={() => signOut()}>Sign out</button>
      </div>
    </div>
  );
}
