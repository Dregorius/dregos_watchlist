import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const TYPE_ICONS = { movie: '🎬', series: '📺', game: '🎮', mixed: '🎭' };
const TYPE_LABELS = { movie: 'Filme', series: 'Serien', game: 'Games', mixed: 'Gemischt' };

function CreateListModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', is_private: true, type: 'mixed' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const list = await api.createList(form);
      onCreated(list);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">Neue Liste erstellen</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input value={form.name} onChange={set('name')} placeholder="Meine Filmsammlung" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Beschreibung (optional)</label>
              <textarea value={form.description} onChange={set('description')} placeholder="Kurze Beschreibung..." style={{ minHeight: 60 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Kategorie</label>
              <select value={form.type} onChange={set('type')}>
                <option value="mixed">🎭 Gemischt</option>
                <option value="movie">🎬 Nur Filme</option>
                <option value="series">📺 Nur Serien</option>
                <option value="game">🎮 Nur Games</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sichtbarkeit</label>
              <select value={form.is_private ? 'private' : 'shared'} onChange={e => setForm(f => ({ ...f, is_private: e.target.value === 'private' }))}>
                <option value="private">🔒 Privat</option>
                <option value="shared">👥 Geteilt</option>
              </select>
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Erstelle...' : 'Liste erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ListCard({ list, onClick }) {
  const isShared = list.is_private === 0;
  const posters = [list.latest_poster].filter(Boolean);

  return (
    <div className="list-card" onClick={() => onClick(list)}>
      {posters.length > 0 ? (
        <div className="list-card-cover">
          <img src={posters[0]} alt="" />
        </div>
      ) : (
        <div className="list-card-cover-empty">
          {TYPE_ICONS[list.type] || '🎭'}
        </div>
      )}
      <div className="list-card-body">
        <div className="list-card-name" title={list.name}>{list.name}</div>
        <div className="list-card-meta">
          <span>{list.item_count} Einträge</span>
          <span className={`list-card-badge ${isShared ? 'shared' : 'private'}`}>
            {isShared ? '👥 Geteilt' : '🔒 Privat'}
          </span>
        </div>
        {list.owner_id !== undefined && list.owner_name && (
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>von {list.owner_name}</div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.getLists()
      .then(setLists)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const myLists = lists.filter(l => l.owner_id === user.id);
  const sharedLists = lists.filter(l => l.owner_id !== user.id);

  const handleCreated = (list) => {
    setLists(ls => [list, ...ls]);
    setShowCreate(false);
    navigate(`/lists/${list.id}`);
  };

  if (loading) return (
    <div className="page">
      <div className="loading" style={{ height: '60vh' }}><div className="spinner" /></div>
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <div className="dashboard-hero">
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            Hey {user.username}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>
            Deine Watchlisten auf einen Blick
          </p>
        </div>

        {/* My Lists */}
        <div className="section-title">
          Meine Listen
          <span className="section-badge">{myLists.length}</span>
        </div>
        <div className="list-grid">
          {myLists.map(list => (
            <ListCard key={list.id} list={list} onClick={(l) => navigate(`/lists/${l.id}`)} />
          ))}
          <div className="create-list-card" onClick={() => setShowCreate(true)}>
            <span style={{ fontSize: 32 }}>+</span>
            Neue Liste
          </div>
        </div>

        {/* Shared with me */}
        {sharedLists.length > 0 && (
          <>
            <div className="section-title">
              Mit mir geteilt
              <span className="section-badge">{sharedLists.length}</span>
            </div>
            <div className="list-grid">
              {sharedLists.map(list => (
                <ListCard key={list.id} list={list} onClick={(l) => navigate(`/lists/${l.id}`)} />
              ))}
            </div>
          </>
        )}

        {lists.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎬</div>
            <div className="empty-state-title">Noch keine Listen</div>
            <div className="empty-state-desc">Erstelle deine erste Watchlist!</div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Liste erstellen</button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateListModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
