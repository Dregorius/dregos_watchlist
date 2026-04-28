import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="navbar-logo">🎬 Watchlist</Link>
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
              <button onClick={handleLogout}>Abmelden</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
