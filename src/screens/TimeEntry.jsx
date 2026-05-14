import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.jsx';
import {
  listCompanies,
  addEntry,
  hoursBetween,
  computePay
} from '../lib/firebase';

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function TimeEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [entryTime, setEntryTime] = useState('09:00');
  const [exitTime, setExitTime] = useState('17:00');
  const [lunchMinutes, setLunchMinutes] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!user) return;
    listCompanies(user.uid).then((cs) => {
      setCompanies(cs);
      if (cs.length && !companyId) setCompanyId(cs[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selected = companies.find((c) => c.id === companyId);
  const grossHours = useMemo(() => hoursBetween(entryTime, exitTime), [entryTime, exitTime]);
  const hours = useMemo(() => {
    const lunch = Math.max(0, Math.min(30, Number(lunchMinutes) || 0)) / 60;
    return Math.max(0, Math.round((grossHours - lunch) * 100) / 100);
  }, [grossHours, lunchMinutes]);
  const pay = useMemo(() => computePay(hours, selected?.hourlyWage), [hours, selected]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected) {
      setMsg({ type: 'error', text: 'Please select a company first.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await addEntry(user.uid, {
        companyId: selected.id,
        companyName: selected.name,
        hourlyWage: Number(selected.hourlyWage),
        date,
        entryTime,
        exitTime,
        lunchMinutes: Number(lunchMinutes) || 0,
        hours,
        pay
      });
      setMsg({ type: 'ok', text: 'Saved! View it on the dashboard.' });
      // Reset times to defaults but keep the date for repeat logging.
      setEntryTime('09:00');
      setExitTime('17:00');
      setLunchMinutes(0);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Could not save entry.' });
    } finally {
      setBusy(false);
    }
  }

  if (companies.length === 0) {
    return (
      <section className="screen">
        <header className="screen-header">
          <h2>Log Time</h2>
        </header>
        <div className="card center">
          <p>You haven't added any companies yet.</p>
          <button className="btn-primary" onClick={() => navigate('/companies')}>
            Add a company
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <header className="screen-header">
        <h2>Log Time</h2>
        <p className="muted">Pick a company and enter your start and end times.</p>
      </header>

      <form className="card form-stack" onSubmit={handleSubmit}>
        <div className="field">
          <label>Company</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — kr {Number(c.hourlyWage).toFixed(2)}/hr
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Entry time</label>
            <input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Exit time</label>
            <input
              type="time"
              value={exitTime}
              onChange={(e) => setExitTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label>Lunch break (minutes, max 30)</label>
          <input
            type="number"
            min="0"
            max="30"
            step="5"
            value={lunchMinutes}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { setLunchMinutes(0); return; }
              const n = Number(raw);
              if (Number.isNaN(n)) return;
              setLunchMinutes(Math.max(0, Math.min(30, n)));
            }}
          />
        </div>

        <div className="summary-pill">
          <div>
            <span className="muted small">Hours worked</span>
            <div className="pill-value">{hours.toFixed(2)}</div>
          </div>
          <div>
            <span className="muted small">Pay</span>
            <div className="pill-value">kr {pay.toFixed(2)}</div>
          </div>
        </div>

        <button className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save entry'}
        </button>

        {msg && (
          <p className={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</p>
        )}
      </form>
    </section>
  );
}
