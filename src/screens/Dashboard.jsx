import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.jsx';
import { listEntries, deleteEntry } from '../lib/firebase';

function monthRange(year, month /* 1-12 */) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!user) return;
    setLoading(true);
    const { start, end } = monthRange(year, month);
    try {
      const list = await listEntries(user.uid, { startDate: start, endDate: end });
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month]);

  // Distinct list of companies actually present in this month's entries (for the filter).
  const companyOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.companyName).filter(Boolean));
    return Array.from(set).sort();
  }, [entries]);

  // Reset company filter if the currently selected one isn't in the new month's data.
  useEffect(() => {
    if (companyFilter !== 'all' && !companyOptions.includes(companyFilter)) {
      setCompanyFilter('all');
    }
  }, [companyOptions, companyFilter]);

  const filteredEntries = useMemo(() => {
    if (companyFilter === 'all') return entries;
    return entries.filter((e) => e.companyName === companyFilter);
  }, [entries, companyFilter]);

  const totals = useMemo(() => {
    const byCompany = {};
    let totalHours = 0;
    let totalPay = 0;
    for (const e of filteredEntries) {
      totalHours += Number(e.hours || 0);
      totalPay += Number(e.pay || 0);
      const key = e.companyName || 'Unknown';
      if (!byCompany[key]) byCompany[key] = { hours: 0, pay: 0 };
      byCompany[key].hours += Number(e.hours || 0);
      byCompany[key].pay += Number(e.pay || 0);
    }
    return { totalHours, totalPay, byCompany };
  }, [filteredEntries]);

  async function remove(id) {
    if (!confirm('Delete this entry?')) return;
    await deleteEntry(user.uid, id);
    await reload();
  }

  const years = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) years.push(y);

  return (
    <section className="screen">
      <header className="screen-header row-between">
        <div>
          <h2>Monthly Pay Tracker</h2>
          <p className="muted">Hours and earnings, broken down by company.</p>
        </div>
        <Link to="/entry" className="btn-primary">+ Log Time</Link>
      </header>

      <div className="card filter-row-3">
        <div className="field">
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {monthNames.map((n, i) => (
              <option key={n} value={i + 1}>{n}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Company</label>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="all">All companies</option>
            {companyOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="muted small">Total hours</span>
          <div className="kpi-value">{totals.totalHours.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <span className="muted small">Total pay</span>
          <div className="kpi-value">kr {totals.totalPay.toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <span className="muted small">Entries</span>
          <div className="kpi-value">{filteredEntries.length}</div>
        </div>
      </div>

      {Object.keys(totals.byCompany).length > 0 && companyFilter === 'all' && (
        <div className="card">
          <h3 className="card-title">By company</h3>
          <ul className="list">
            {Object.entries(totals.byCompany).map(([name, t]) => (
              <li key={name} className="list-row">
                <div className="grow">
                  <div className="row-title">{name}</div>
                  <div className="muted small">{t.hours.toFixed(2)} hours</div>
                </div>
                <div className="row-amount">kr {t.pay.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">
          Entries
          {companyFilter !== 'all' && <span className="muted small"> — {companyFilter}</span>}
        </h3>
        {loading ? (
          <p className="muted center">Loading…</p>
        ) : filteredEntries.length === 0 ? (
          <p className="muted center">
            No entries for {monthNames[month - 1]} {year}
            {companyFilter !== 'all' ? ` at ${companyFilter}` : ''}.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th className="num">Hours</th>
                  <th className="num">Pay</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.companyName}</td>
                    <td>{e.date}</td>
                    <td>{e.entryTime}</td>
                    <td>{e.exitTime}</td>
                    <td className="num">{Number(e.hours).toFixed(2)}</td>
                    <td className="num">kr {Number(e.pay).toFixed(2)}</td>
                    <td className="num">
                      <button className="link-btn danger" onClick={() => remove(e.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="muted">Total</td>
                  <td className="num"><strong>{totals.totalHours.toFixed(2)}</strong></td>
                  <td className="num"><strong>kr {totals.totalPay.toFixed(2)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
