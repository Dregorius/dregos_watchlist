import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

function ProfileModal({ user, onClose, onSaved }) {
  const [letterboxd, setLetterboxd] = useState(user.letterboxd_username || '');
  const [mal, setMal]               = useState(user.mal_username || '');
  const [imdb, setImdb]             = useState(user.imdb_username || '');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const updated = await api.updateProfile({
        letterboxd_username: letterboxd.trim(),
        mal_username: mal.trim(),
        imdb_username: imdb.trim(),
      });
      onSaved(updated);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Profil bearbeiten</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Letterboxd Benutzername</label>
              <input value={letterboxd} onChange={e => setLetterboxd(e.target.value)} placeholder="z.B. maxmustermann" autoFocus />
              <div className="form-hint">Dein Letterboxd-Profil wird auf der Startseite angezeigt.</div>
            </div>
            <div className="form-group">
              <label className="form-label">MyAnimeList Benutzername</label>
              <input value={mal} onChange={e => setMal(e.target.value)} placeholder="z.B. maxmustermann" />
              <div className="form-hint">Dein MAL-Verlauf wird auf der Startseite angezeigt.</div>
            </div>
            <div className="form-group">
              <label className="form-label">IMDb User-ID</label>
              <input value={imdb} onChange={e => setImdb(e.target.value)} placeholder="z.B. ur12345678" />
              <div className="form-hint">Zu finden in deiner IMDb Profil-URL: imdb.com/user/ur.../</div>
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, logout, login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [scrolled, setScrolled]       = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleProfileSaved = (updated) => {
    const token = localStorage.getItem('token');
    login(token, { ...user, ...updated });
    setShowProfile(false);
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="navbar-logo">🎬 Drego's Watchlist</Link>
        <div className="navbar-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Übersicht</Link>
          {user?.is_admin && (
            <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>Admin</Link>
          )}
        </div>
        <div className="navbar-right" ref={menuRef}>
          <div className="user-menu">
            <div
              className="avatar"
              style={{ background: user?.avatar_color || '#E50914' }}
              onClick={() => setMenuOpen(o => !o)}
              title={user?.username}
            >
              {user?.username?.[0]?.toUpperCase()}
            </div>
            {menuOpen && (
              <div className="user-dropdown">
                <div style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
                  {user?.username}
                  {user?.is_admin && <span style={{ color: '#E50914', marginLeft: 6, fontSize: 11 }}>Admin</span>}
                </div>
                <hr />
                <button onClick={() => { setMenuOpen(false); setShowProfile(true); }}>
                  Profil bearbeiten
                </button>
                <hr />
                <button onClick={handleLogout}>Abmelden</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showProfile && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSaved={handleProfileSaved}
        />
      )}
    </>
  );
}
