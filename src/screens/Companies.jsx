import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context.jsx';
import {
  listCompanies,
  addCompany,
  updateCompany,
  deleteCompany
} from '../lib/firebase';

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState('');
  const [wage, setWage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editWage, setEditWage] = useState('');

  async function reload() {
    const list = await listCompanies(user.uid);
    setCompanies(list);
  }

  useEffect(() => {
    if (user) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim() || !wage) return;
    setBusy(true);
    try {
      await addCompany(user.uid, { name, hourlyWage: wage });
      setName('');
      setWage('');
      await reload();
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditWage(c.hourlyWage);
  }

  async function saveEdit() {
    await updateCompany(user.uid, editingId, {
      name: editName.trim(),
      hourlyWage: Number(editWage)
    });
    setEditingId(null);
    await reload();
  }

  async function remove(id) {
    if (!confirm('Delete this company? Existing logged entries are kept.')) return;
    await deleteCompany(user.uid, id);
    await reload();
  }

  return (
    <section className="screen">
      <header className="screen-header">
        <h2>Companies</h2>
        <p className="muted">Add the companies you work for and their hourly wage.</p>
      </header>

      <form className="card form-row" onSubmit={handleAdd}>
        <div className="field">
          <label>Company name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp"
            required
          />
        </div>
        <div className="field">
          <label>Hourly wage</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            placeholder="e.g. 25"
            required
          />
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Add company'}
        </button>
      </form>

      <div className="card">
        {companies.length === 0 ? (
          <p className="muted center">No companies yet — add your first one above.</p>
        ) : (
          <ul className="list">
            {companies.map((c) => (
              <li key={c.id} className="list-row">
                {editingId === c.id ? (
                  <>
                    <input
                      className="grow"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="wage-input"
                      value={editWage}
                      onChange={(e) => setEditWage(e.target.value)}
                    />
                    <button className="btn-primary sm" onClick={saveEdit}>Save</button>
                    <button className="link-btn" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div className="grow">
                      <div className="row-title">{c.name}</div>
                      <div className="muted small">kr {Number(c.hourlyWage).toFixed(2)} / hour</div>
                    </div>
                    <button className="link-btn" onClick={() => beginEdit(c)}>Edit</button>
                    <button className="link-btn danger" onClick={() => remove(c.id)}>Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
