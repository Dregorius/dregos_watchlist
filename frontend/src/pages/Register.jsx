import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', invite_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.register(form);
      login(token, user);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">🎬 Watchlist</div>
        <h1 className="auth-title">Account erstellen</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Einladungscode</label>
            <input
              type="text" value={form.invite_code} onChange={set('invite_code')}
              placeholder="XXXXXXXX" required autoFocus
              style={{ fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}
            />
            <div className="form-hint">Du brauchst einen Code von einem Mitglied.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Benutzername</label>
            <input type="text" value={form.username} onChange={set('username')} placeholder="Dein Name" required minLength={2} maxLength={30} />
          </div>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="deine@email.de" required />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Mindestens 8 Zeichen" required minLength={8} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button
            type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20, padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Wird erstellt...' : 'Account erstellen'}
          </button>
        </form>
        <div className="auth-footer">
          Bereits ein Account? <Link to="/login">Anmelden</Link>
        </div>
      </div>
    </div>
  );
}
