import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    Promise.all([api.getInvites(), api.getAdminUsers()])
      .then(([inv, usr]) => { setInvites(inv); setUsers(usr); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { code } = await api.createInvite();
      const inv = await api.getInvites();
      setInvites(inv);
      await navigator.clipboard.writeText(code).catch(() => {});
      setCopied(code);
      setTimeout(() => setCopied(null), 3000);
    } catch (e) { alert(e.message); }
    finally { setCreating(false); }
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Einladung löschen?')) return;
    try {
      await api.deleteInvite(id);
      setInvites(is => is.filter(i => i.id !== id));
    } catch (e) { alert(e.message); }
  };

  const unused = invites.filter(i => !i.used_by);
  const used   = invites.filter(i =>  i.used_by);

  if (loading) return (
    <div className="page">
      <div className="loading" style={{ height: '60vh' }}><div className="spinner" /></div>
    </div>
  );

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>⚙️ Admin Panel</h1>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Einladungen und Mitglieder verwalten</p>
          </div>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleCreate} disabled={creating}>
            {creating ? 'Erstelle...' : '+ Einladung erstellen'}
          </button>
        </div>

        {/* ── User Overview ── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">
            👥 Mitglieder
            <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text2)', fontWeight: 400 }}>
              ({users.length})
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Benutzer', 'E-Mail', 'Eingeladen von', 'Listen', 'Einträge', 'Dabei seit', 'Rolle'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    {/* Avatar + Name */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 4, flexShrink: 0,
                          background: u.avatar_color || '#E50914',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, color: '#fff',
                        }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.username}</span>
                        {u.id === user.id && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,.1)', color: 'var(--text2)' }}>Du</span>
                        )}
                      </div>
                    </td>
                    {/* Email */}
                    <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{u.email}</td>
                    {/* Invited by */}
                    <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                      {u.invited_by || <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    {/* Lists */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{u.list_count}</span>
                    </td>
                    {/* Items */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{u.item_count}</span>
                    </td>
                    {/* Joined */}
                    <td style={{ padding: '10px 12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('de-DE')}
                    </td>
                    {/* Role */}
                    <td style={{ padding: '10px 12px' }}>
                      {u.is_admin
                        ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(229,9,20,.2)', color: '#f87171', fontWeight: 700 }}>Admin</span>
                        : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,.07)', color: 'var(--text2)' }}>Mitglied</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Invites Grid ── */}
        <div className="admin-grid">
          {/* Unused invites */}
          <div className="card">
            <div className="card-title">
              🟢 Offene Einladungen
              <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text2)', fontWeight: 400 }}>({unused.length})</span>
            </div>
            {unused.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>Keine offenen Einladungen</div>
            ) : (
              <div className="invite-list">
                {unused.map(invite => (
                  <div key={invite.id} className="invite-item">
                    <div>
                      <div className="invite-code">{invite.code}</div>
                      <div className="invite-meta">
                        Erstellt {new Date(invite.created_at).toLocaleDateString('de-DE')}
                        {invite.created_by_name && ` von ${invite.created_by_name}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(invite.code)} title="Code kopieren">
                        {copied === invite.code ? '✅' : '📋'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(invite.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Used invites */}
          <div className="card">
            <div className="card-title">
              ✅ Verwendete Einladungen
              <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text2)', fontWeight: 400 }}>({used.length})</span>
            </div>
            {used.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>Noch keine verwendet</div>
            ) : (
              <div className="invite-list">
                {used.map(invite => (
                  <div key={invite.id} className="invite-item invite-used">
                    <div>
                      <div className="invite-code" style={{ color: '#555' }}>{invite.code}</div>
                      <div className="invite-meta">
                        Verwendet von <strong style={{ color: 'var(--text2)' }}>{invite.used_by_name}</strong>
                        {invite.used_at && ` am ${new Date(invite.used_at).toLocaleDateString('de-DE')}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Setup hint */}
        <div className="card" style={{ marginTop: 24, borderColor: 'rgba(229,9,20,.2)', background: 'rgba(229,9,20,.05)' }}>
          <div className="card-title" style={{ fontSize: 14 }}>📋 Erster Setup</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
            Der initiale Einladungscode lautet: <code style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: 4, color: 'var(--red)', fontFamily: 'monospace', fontSize: 13 }}>SETUP-ADMIN</code>
            <br />
            Dieser Code wird bei der ersten Registrierung verbraucht. Der erste Benutzer erhält automatisch Admin-Rechte.
          </div>
        </div>

      </div>

      {copied && (
        <div className="toast-container">
          <div className="toast success">📋 Code kopiert: <strong>{copied}</strong></div>
        </div>
      )}
    </div>
  );
}
