import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
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
        <h1 className="auth-title">Anmelden</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="deine@email.de" required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button
            type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20, padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
        <div className="auth-footer">
          Noch kein Account? <Link to="/register">Registrieren</Link>
        </div>
      </div>
    </div>
  );
}
