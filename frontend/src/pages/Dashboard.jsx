import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const TYPE_ICONS  = { media: '🎬', game: '🎮', anime: '🍥' };
const TYPE_LABELS = { media: 'Filme & Serien', game: 'Games', anime: 'Anime', movie: 'Filme & Serien', series: 'Filme & Serien', mixed: 'Filme & Serien' };

// ── Letterboxd Widget ──────────────────────────────────────────────────────────

function LetterboxdWidget({ username }) {
  const [feed, setFeed]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!username) return;
    setLoading(true); setError('');
    api.getLetterboxdFeed(username)
      .then(setFeed)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (!username) return null;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <img src="https://a.ltrbxd.com/logos/letterboxd-decal-dots-neg-mono-crop.svg"
          alt="" style={{ height: 16, opacity: .8 }} onError={e => e.target.style.display='none'} />
        <span style={{ fontWeight: 700, fontSize: 13 }}>Letterboxd</span>
        <a href={`https://letterboxd.com/${username}/`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>@{username} →</a>
      </div>
      {loading && <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}
      {error && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Feed nicht verfügbar.</div>}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {feed.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', flexShrink: 0, width: 70 }}>
              <div style={{ width: 70, height: 105, borderRadius: 5, overflow: 'hidden', background: 'var(--bg3)', marginBottom: 4, transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                {item.poster
                  ? <img src={item.poster} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎬</div>}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</div>
              {item.rating && <div style={{ fontSize: 11, color: '#f59e0b' }}>{item.rating}</div>}
            </a>
          ))}
          {feed.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Noch keine Aktivität.</div>}
        </div>
      )}
    </div>
  );
}

// ── MAL Widget ────────────────────────────────────────────────────────────────

function MalWidget({ username }) {
  const [feed, setFeed]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!username) return;
    setLoading(true); setError('');
    api.getMalFeed(username)
      .then(setFeed)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (!username) return null;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>MyAnimeList</span>
        <a href={`https://myanimelist.net/animelist/${username}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>@{username} →</a>
      </div>
      {loading && <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}
      {error && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Feed nicht verfügbar.</div>}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {feed.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', flexShrink: 0, width: 70 }}>
              <div style={{ width: 70, height: 105, borderRadius: 5, overflow: 'hidden', background: 'var(--bg3)', marginBottom: 4, transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                {item.poster
                  ? <img src={item.poster} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🍥</div>}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</div>
              {item.score && <div style={{ fontSize: 11, color: '#f59e0b' }}>★ {item.score}</div>}
            </a>
          ))}
          {feed.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Noch keine Aktivität.</div>}
        </div>
      )}
    </div>
  );
}

// ── IMDB Widget ───────────────────────────────────────────────────────────────

function ImdbWidget({ username }) {
  if (!username) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>IMDb</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <a href={`https://www.imdb.com/user/${username}/`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: '#f5c518', textDecoration: 'none', fontWeight: 600 }}>Profil →</a>
          <a href={`https://www.imdb.com/user/${username}/watchlist`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--text3)', textDecoration: 'none' }}>Watchlist →</a>
        </div>
      </div>
    </div>
  );
}

// ── Create List Modal ─────────────────────────────────────────────────────────

function CreateListModal({ onClose, onCreated, defaultCategory }) {
  const [form, setForm] = useState({ name: '', description: '', category: defaultCategory || '', is_private: true, type: 'media' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { onCreated(await api.createList(form)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
              <label className="form-label">Kategorie (optional)</label>
              <input value={form.category} onChange={set('category')} placeholder="z.B. Mit Freunden, 2024, Horror..." />
              <div className="form-hint">Gruppiert deine Listen auf der Startseite</div>
            </div>
            <div className="form-group">
              <label className="form-label">Beschreibung (optional)</label>
              <textarea value={form.description} onChange={set('description')} placeholder="Kurze Beschreibung..." style={{ minHeight: 60 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Inhalt</label>
              <select value={form.type} onChange={set('type')}>
                <option value="media">🎬 Filme &amp; Serien</option>
                <option value="anime">🍥 Anime</option>
                <option value="game">🎮 Games</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sichtbarkeit</label>
              <select value={form.is_private ? 'private' : 'shared'} onChange={e => setForm(f => ({ ...f, is_private: e.target.value === 'private' }))}>
                <option value="private">🔒 Privat</option>
                <option value="shared">Geteilt</option>
              </select>
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Liste erstellen</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── New Category Modal ────────────────────────────────────────────────────────

function NewCategoryModal({ onClose, onCreated }) {
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      // Create a placeholder list with this category so it appears
      const list = await api.createList({ name: 'Neue Liste', category: name.trim(), is_private: true, type: 'media' });
      onCreated(list, name.trim());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">Neue Kategorie</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Kategoriename</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Horror, Mit Freunden, 2024..." required autoFocus />
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Erstellen</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── List Card ─────────────────────────────────────────────────────────────────

function ListCard({ list, onClick, dragState, onDragStart, onDragEnter, onDragEnd }) {
  const isShared   = list.is_private === 0;
  const isDragging = dragState.draggingId === list.id;
  const isOver     = dragState.overId === list.id;
  return (
    <div
      className="list-card"
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(list.id, list.category || ''); }}
      onDragEnter={e => { e.preventDefault(); onDragEnter(list.id, list.category || ''); }}
      onDragOver={e => e.preventDefault()}
      onDragEnd={onDragEnd}
      onClick={() => !isDragging && onClick(list)}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: 'grab', outline: isOver && !isDragging ? '2px solid var(--red)' : 'none', transition: 'opacity .15s, outline .1s' }}
    >
      {list.latest_poster
        ? <div className="list-card-cover"><img src={list.latest_poster} alt="" /></div>
        : <div className="list-card-cover-empty">{TYPE_ICONS[list.type] || '🎬'}</div>}
      <div className="list-card-body">
        <div className="list-card-name" title={list.name}>{list.name}</div>
        <div className="list-card-meta">
          <span>{list.item_count} Einträge</span>
          <span className={`list-card-badge ${isShared ? 'shared' : 'private'}`}>
            {isShared ? 'Geteilt' : '🔒 Privat'}
          </span>
        </div>
        {list.owner_name && <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>von {list.owner_name}</div>}
      </div>
    </div>
  );
}

// ── Category Group ────────────────────────────────────────────────────────────

function CategoryGroup({ title, lists, navigate, onRename, dragState, onDragStart, onDragEnter, onDragEnd, onNewList }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(title);
  const inputRef              = useRef(null);

  const startEdit = e => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.select(), 50); };
  const commit    = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== title) onRename(title, value.trim());
    else setValue(title);
  };
  const handleKey = e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setValue(title); } };

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-title">
        {editing ? (
          <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
            onBlur={commit} onKeyDown={handleKey}
            style={{ background: 'var(--bg3)', border: '1px solid #555', borderRadius: 4, padding: '2px 8px', fontSize: 20, fontWeight: 700, color: 'var(--text)', width: Math.max(value.length * 13, 100) + 'px' }}
          />
        ) : (
          <span title="Klicken zum Umbenennen" onClick={startEdit}
            style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border)' }}>
            {title}
          </span>
        )}
        <span className="section-badge">{lists.length}</span>
      </div>
      <div className="list-grid">
        {lists.map(list => (
          <ListCard key={list.id} list={list}
            onClick={l => navigate(`/lists/${l.id}`)}
            dragState={dragState} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [lists, setLists]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [createCategory, setCreateCategory] = useState('');
  const [showNewCat, setShowNewCat]     = useState(false);
  const [dragState, setDragState]       = useState({ draggingId: null, overId: null, fromCategory: '' });

  useEffect(() => {
    api.getLists().then(setLists).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreated = (list) => {
    setLists(ls => [list, ...ls]);
    setShowCreate(false);
    navigate(`/lists/${list.id}`);
  };

  const handleNewCatCreated = (list, catName) => {
    setLists(ls => [list, ...ls]);
    setShowNewCat(false);
    navigate(`/lists/${list.id}`);
  };

  const handleOpenCreateInCat = (cat) => {
    setCreateCategory(cat);
    setShowCreate(true);
  };

  // Drag & drop
  const handleDragStart = useCallback((id, fromCat) => setDragState({ draggingId: id, overId: null, fromCategory: fromCat }), []);
  const handleDragEnter = useCallback((overId, overCat) => setDragState(s => ({ ...s, overId, overCat })), []);
  const handleDragEnd   = useCallback(() => {
    setDragState(s => {
      const { draggingId, overId, fromCategory, overCat } = s;
      if (draggingId && overId && draggingId !== overId) {
        setTimeout(() => {
          setLists(prev => {
            const next = [...prev];
            const fromIdx = next.findIndex(l => l.id === draggingId);
            const toIdx   = next.findIndex(l => l.id === overId);
            if (fromIdx < 0 || toIdx < 0) return prev;
            const [moved] = next.splice(fromIdx, 1);
            if (overCat !== undefined && overCat !== fromCategory) {
              moved.category = overCat;
              api.updateList(moved.id, { ...moved, category: overCat }).catch(console.error);
            }
            next.splice(toIdx, 0, moved);
            const myLists = next.filter(l => l.owner_id === user.id);
            api.reorderLists(myLists.map((l, i) => ({ id: l.id, sort_order: i }))).catch(console.error);
            return next;
          });
        }, 0);
      }
      return { draggingId: null, overId: null, fromCategory: '' };
    });
  }, [user.id]);

  const handleRename = useCallback(async (oldCat, newCat) => {
    const toUpdate = lists.filter(l => l.owner_id === user.id && (l.category || '').trim() === oldCat);
    try {
      await Promise.all(toUpdate.map(l => api.updateList(l.id, { ...l, category: newCat })));
      setLists(prev => prev.map(l => toUpdate.find(u => u.id === l.id) ? { ...l, category: newCat } : l));
    } catch (e) { console.error(e); }
  }, [lists, user.id]);

  if (loading) return (
    <div className="page"><div className="loading" style={{ height: '60vh' }}><div className="spinner" /></div></div>
  );

  const myLists     = lists.filter(l => l.owner_id === user.id);
  const sharedLists = lists.filter(l => l.owner_id !== user.id);
  const grouped     = {};
  const uncategorized = [];
  for (const list of myLists) {
    const cat = list.category?.trim();
    if (cat) { if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(list); }
    else uncategorized.push(list);
  }
  const categories = Object.keys(grouped).sort();
  const hasWidgets = user.letterboxd_username || user.mal_username || user.imdb_username;

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div className="dashboard-hero">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Hey {user.username}</h1>
              <p style={{ color: 'var(--text2)', fontSize: 15 }}>Deine Watchlisten auf einen Blick</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowNewCat(true)}>+ Kategorie</button>
              <button className="btn btn-primary" onClick={() => { setCreateCategory(''); setShowCreate(true); }}>+ Neue Liste</button>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="dashboard-columns">

          {/* Left: Lists */}
          <div className="dashboard-lists">
            {lists.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <div className="empty-state-title">Noch keine Listen</div>
                <div className="empty-state-desc">Erstelle deine erste Watchlist!</div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Liste erstellen</button>
              </div>
            ) : (
              <>
                {categories.map(cat => (
                  <CategoryGroup
                    key={cat} title={cat} lists={grouped[cat]}
                    navigate={navigate} onRename={handleRename}
                    dragState={dragState} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd}
                    onNewList={handleOpenCreateInCat}
                  />
                ))}

                {uncategorized.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">
                      {categories.length > 0 ? 'Weitere Listen' : 'Meine Listen'}
                      <span className="section-badge">{uncategorized.length}</span>
                    </div>
                    <div className="list-grid">
                      {uncategorized.map(list => (
                        <ListCard key={list.id} list={list}
                          onClick={l => navigate(`/lists/${l.id}`)}
                          dragState={dragState} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sharedLists.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div className="section-title">
                      Mit mir geteilt
                      <span className="section-badge">{sharedLists.length}</span>
                    </div>
                    <div className="list-grid">
                      {sharedLists.map(list => (
                        <ListCard key={list.id} list={list}
                          onClick={l => navigate(`/lists/${l.id}`)}
                          dragState={{ draggingId: null, overId: null }}
                          onDragStart={() => {}} onDragEnter={() => {}} onDragEnd={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Widgets */}
          {hasWidgets && (
            <div className="dashboard-widgets">
              <LetterboxdWidget username={user.letterboxd_username} />
              <MalWidget username={user.mal_username} />
              <ImdbWidget username={user.imdb_username} />
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateListModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          defaultCategory={createCategory}
        />
      )}
      {showNewCat && (
        <NewCategoryModal onClose={() => setShowNewCat(false)} onCreated={handleNewCatCreated} />
      )}
    </div>
  );
}
