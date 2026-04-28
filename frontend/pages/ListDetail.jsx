import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import MediaCard from '../components/MediaCard';
import SearchModal from '../components/SearchModal';

const STATUS_FILTERS = [
  { value: '', label: 'Alle' },
  { value: 'want', label: '📌 Merkliste' },
  { value: 'watching', label: '▶️ Schaue ich' },
  { value: 'completed', label: '✅ Gesehen' },
  { value: 'dropped', label: '❌ Abgebrochen' },
];
const TYPE_FILTERS = [
  { value: '', label: 'Alle Typen' },
  { value: 'movie', label: '🎬 Filme' },
  { value: 'series', label: '📺 Serien' },
  { value: 'game', label: '🎮 Games' },
];
const TYPE_LABELS = { movie: 'Filme', series: 'Serien', game: 'Games', mixed: 'Gemischt' };
const STATUS_LABELS = { want: 'Merkliste', watching: 'Schaue ich', completed: 'Gesehen', dropped: 'Abgebrochen' };
const DB_LABEL = { movie: 'TMDB', series: 'TMDB', game: 'RAWG' };

function getExternalUrl(mediaId, mediaType) {
  if (!mediaId) return null;
  const rawId = String(mediaId).replace(/^tmdb-/, '').replace(/^rawg-/, '');
  if (mediaType === 'movie')  return `https://www.themoviedb.org/movie/${rawId}`;
  if (mediaType === 'series') return `https://www.themoviedb.org/tv/${rawId}`;
  if (mediaType === 'game')   return `https://rawg.io/games/${rawId}`;
  return null;
}

// ── Random Picker Modal ────────────────────────────────────────────────────────

function RandomPickerModal({ items, onClose }) {
  const [picked, setPicked] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const pick = useCallback(() => {
    if (items.length === 0) return;
    setSpinning(true);
    // Cycle through a few random items before landing for effect
    let count = 0;
    const total = 12 + Math.floor(Math.random() * 8);
    const interval = setInterval(() => {
      setPicked(items[Math.floor(Math.random() * items.length)]);
      count++;
      if (count >= total) {
        clearInterval(interval);
        setPicked(items[Math.floor(Math.random() * items.length)]);
        setSpinning(false);
      }
    }, 80 + count * 8);
  }, [items]);

  useEffect(() => { pick(); }, []);

  const externalUrl = picked ? getExternalUrl(picked.media_id, picked.media_type) : null;
  const dbLabel = picked ? (DB_LABEL[picked.media_type] || 'TMDB') : '';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
        <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
          <span className="modal-title">🎲 Zufallspicker</span>
          <button className="close-btn" onClick={onClose} style={{ position: 'absolute', right: 20 }}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '28px 24px' }}>
          {items.length === 0 ? (
            <div style={{ color: 'var(--text2)', padding: '20px 0' }}>
              Keine Einträge mit den aktuellen Filtern.
            </div>
          ) : (
            <>
              {/* Poster */}
              <div style={{
                width: 140, height: 210, margin: '0 auto 20px',
                borderRadius: 8, overflow: 'hidden',
                background: 'var(--bg3)',
                boxShadow: spinning ? '0 0 30px rgba(229,9,20,.4)' : '0 8px 32px rgba(0,0,0,.6)',
                transition: 'box-shadow .3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48,
              }}>
                {picked?.poster_url ? (
                  <img src={picked.poster_url} alt={picked.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover',
                      filter: spinning ? 'blur(3px)' : 'none', transition: 'filter .2s' }} />
                ) : (
                  picked?.media_type === 'game' ? '🎮' : picked?.media_type === 'series' ? '📺' : '🎬'
                )}
              </div>

              {/* Title */}
              <div style={{
                fontSize: 18, fontWeight: 800, marginBottom: 6, lineHeight: 1.2,
                filter: spinning ? 'blur(4px)' : 'none', transition: 'filter .15s',
                minHeight: 44,
              }}>
                {picked?.title || '...'}
              </div>

              {/* Meta */}
              {!spinning && picked && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {picked.year && (
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{picked.year}</span>
                  )}
                  {picked.rating && (
                    <span style={{ fontSize: 13, color: '#f59e0b' }}>★ {picked.rating}</span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: picked.media_type === 'movie' ? 'rgba(147,51,234,.2)' :
                                picked.media_type === 'series' ? 'rgba(14,165,233,.2)' : 'rgba(249,115,22,.2)',
                    color: picked.media_type === 'movie' ? '#c084fc' :
                           picked.media_type === 'series' ? '#38bdf8' : '#fb923c',
                  }}>
                    {picked.media_type === 'movie' ? 'Film' : picked.media_type === 'series' ? 'Serie' : 'Game'}
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(255,255,255,.08)', color: 'var(--text2)',
                  }}>
                    {STATUS_LABELS[picked.status]}
                  </span>
                  {picked.added_by_name && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      von {picked.added_by_name}
                    </span>
                  )}
                </div>
              )}

              {/* Overview */}
              {!spinning && picked?.overview && (
                <div style={{
                  fontSize: 12, color: 'var(--text2)', lineHeight: 1.6,
                  maxHeight: 80, overflow: 'hidden', marginBottom: 20,
                  display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                }}>
                  {picked.overview}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={pick}
                  disabled={spinning}
                  style={{ minWidth: 120 }}
                >
                  {spinning ? '🎲 ...' : '🎲 Nochmal'}
                </button>
                {!spinning && externalUrl && (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                  >
                    Auf {dbLabel} →
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Share Modal ────────────────────────────────────────────────────────────────

function ShareModal({ list, onClose, onUpdated }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const sharedIds = new Set(list.shares?.map(s => s.user_id) || []);

  useEffect(() => {
    api.getUsers().then(all => setUsers(all.filter(u => !sharedIds.has(u.id) && u.id !== list.owner_id)));
  }, []);

  const handleShare = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await api.shareList(list.id, Number(selectedUser), canEdit);
      const updated = await api.getList(list.id);
      onUpdated(updated);
      setSelectedUser('');
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleUnshare = async (userId) => {
    try {
      await api.unshareList(list.id, userId);
      const updated = await api.getList(list.id);
      onUpdated(updated);
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">Liste teilen</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Person hinzufügen</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ marginBottom: 10 }}>
              <option value="">Benutzer wählen...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={canEdit} onChange={e => setCanEdit(e.target.checked)} style={{ width: 'auto' }} />
              Darf bearbeiten
            </label>
            <button
              className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
              onClick={handleShare} disabled={!selectedUser || loading}
            >
              Hinzufügen
            </button>
          </div>
          {list.shares?.length > 0 && (
            <>
              <div className="form-label" style={{ marginBottom: 10 }}>Geteilt mit</div>
              <div className="share-list">
                {list.shares.map(s => (
                  <div key={s.user_id} className="share-item">
                    <div className="avatar" style={{ background: s.avatar_color || '#E50914', width: 30, height: 30, fontSize: 12 }}>
                      {s.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="share-item-name">{s.username}</span>
                    <span className="share-item-role">{s.can_edit ? '✏️ Bearbeiter' : '👁 Leser'}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleUnshare(s.user_id)}>Entfernen</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditListModal({ list, onClose, onSaved }) {
  const [form, setForm] = useState({ name: list.name, description: list.description, is_private: !!list.is_private, type: list.type });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const updated = await api.updateList(list.id, form);
      onSaved(updated);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Liste wirklich löschen? Alle Einträge werden entfernt.')) return;
    try {
      await api.deleteList(list.id);
      onClose('deleted');
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">Liste bearbeiten</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <textarea value={form.description} onChange={set('description')} />
            </div>
            <div className="form-group">
              <label className="form-label">Kategorie</label>
              <select value={form.type} onChange={set('type')}>
                <option value="mixed">🎭 Gemischt</option>
                <option value="movie">🎬 Filme</option>
                <option value="series">📺 Serien</option>
                <option value="game">🎮 Games</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sichtbarkeit</label>
              <select value={form.is_private ? 'private' : 'shared'} onChange={e => setForm(f => ({ ...f, is_private: e.target.value === 'private' }))}>
                <option value="private">🔒 Privat</option>
                <option value="shared">👥 Geteilt</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} style={{ marginRight: 'auto' }}>
              Liste löschen
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    api.getList(id)
      .then(setList)
      .catch(e => { alert(e.message); navigate('/'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd    = item    => setList(l => ({ ...l, items: [item, ...l.items] }));
  const handleUpdate = updated => setList(l => ({ ...l, items: l.items.map(i => i.id === updated.id ? updated : i) }));
  const handleDelete = itemId  => setList(l => ({ ...l, items: l.items.filter(i => i.id !== itemId) }));

  if (loading) return (
    <div className="page">
      <div className="loading" style={{ height: '60vh' }}><div className="spinner" /></div>
    </div>
  );
  if (!list) return null;

  const items = list.items || [];
  const filtered = items.filter(i =>
    (!statusFilter || i.status === statusFilter) &&
    (!typeFilter   || i.media_type === typeFilter)
  );

  const backdropUrl = items.find(i => i.backdrop_url)?.backdrop_url;
  const isOwner = list.owner_id === user.id;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div className="list-hero">
        {backdropUrl && (
          <div className="list-hero-backdrop" style={{ backgroundImage: `url(${backdropUrl})` }} />
        )}
        <div className="list-hero-content">
          <div className="list-hero-type">
            {TYPE_LABELS[list.type] || 'Liste'} · {list.is_private ? '🔒 Privat' : '👥 Geteilt'}
          </div>
          <h1 className="list-hero-title">{list.name}</h1>
          {list.description && <p className="list-hero-desc">{list.description}</p>}
          <div className="list-hero-meta">
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>
              {items.length} Einträge · von {list.owner_name}
            </span>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {list.can_edit && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowSearch(true)}>
                  + Hinzufügen
                </button>
              )}
              {items.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPicker(true)} title="Zufälliges Element auswählen">
                  🎲 Zufall
                </button>
              )}
              {isOwner && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowShare(true)}>
                    👥 Teilen
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>
                    ✏️
                  </button>
                </>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Zurück</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Filters */}
        <div className="filter-bar">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-chip ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >{f.label}</button>
          ))}
          <div style={{ width: 1, background: 'var(--border)', height: 24, margin: '0 4px' }} />
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-chip ${typeFilter === f.value ? 'active' : ''}`}
              onClick={() => setTypeFilter(f.value)}
            >{f.label}</button>
          ))}
          {/* Picker shortcut in filterbar when filters are active */}
          {filtered.length > 1 && (statusFilter || typeFilter) && (
            <>
              <div style={{ width: 1, background: 'var(--border)', height: 24, margin: '0 4px' }} />
              <button
                className="filter-chip"
                onClick={() => setShowPicker(true)}
                title={`Zufällig aus ${filtered.length} gefilterten Einträgen`}
              >
                🎲 aus {filtered.length}
              </button>
            </>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{items.length === 0 ? '🎬' : '🔍'}</div>
            <div className="empty-state-title">
              {items.length === 0 ? 'Liste ist leer' : 'Keine Einträge gefunden'}
            </div>
            <div className="empty-state-desc">
              {items.length === 0 && list.can_edit ? 'Füge Filme, Serien oder Games hinzu!' : 'Ändere die Filter'}
            </div>
            {items.length === 0 && list.can_edit && (
              <button className="btn btn-primary" onClick={() => setShowSearch(true)}>+ Hinzufügen</button>
            )}
          </div>
        ) : (
          <div className="media-grid">
            {filtered.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                listId={list.id}
                canEdit={list.can_edit}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <RandomPickerModal
          items={filtered.length > 0 ? filtered : items}
          onClose={() => setShowPicker(false)}
        />
      )}
      {showSearch && (
        <SearchModal listId={list.id} onAdd={handleAdd} onClose={() => setShowSearch(false)} />
      )}
      {showShare && (
        <ShareModal list={list} onClose={() => setShowShare(false)} onUpdated={setList} />
      )}
      {showEdit && (
        <EditListModal
          list={list}
          onClose={result => { setShowEdit(false); if (result === 'deleted') navigate('/'); }}
          onSaved={updated => { setList(l => ({ ...l, ...updated })); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
