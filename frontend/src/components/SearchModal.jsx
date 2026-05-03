import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

const TYPES_MEDIA = [
  { value: '', label: 'Alle' },
  { value: 'movie', label: '🎬 Filme' },
  { value: 'series', label: '📺 Serien' },
];
const TYPES_GAME = [
  { value: 'game', label: '🎮 Games' },
];

export default function SearchModal({ listId, listType, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const isGameList = listType === 'game';
  const TYPES = isGameList ? TYPES_GAME : TYPES_MEDIA;
  const [type, setType] = useState(isGameList ? 'game' : '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q, t) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true); setError('');
    try {
      const data = await api.search(q, t);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(query, type), 500);
    return () => clearTimeout(debounceRef.current);
  }, [query, type, doSearch]);

  const handleAdd = async (item) => {
    if (adding) return;
    setAdding(item.id);
    try {
      const added = await api.addItem(listId, {
        media_id: item.id,
        media_type: item.media_type,
        title: item.title,
        original_title: item.original_title || item.title,
        year: item.year,
        poster_url: item.poster_url,
        backdrop_url: item.backdrop_url,
        rating: item.rating,
        overview: item.overview,
      });
      onAdd(added);
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(null);
    }
  };

  const handleKey = (e) => { if (e.key === 'Escape') onClose(); };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" onKeyDown={handleKey}>
        <div className="modal-header">
          <span className="modal-title">Medien suchen & hinzufügen</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Film, Serie oder Spiel suchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="type-filters">
            {TYPES.map(t => (
              <button
                key={t.value}
                className={`filter-chip ${type === t.value ? 'active' : ''}`}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

          {loading && (
            <div className="loading"><div className="spinner" /></div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="search-empty">
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              Keine Ergebnisse für „{query}"
            </div>
          )}

          {!loading && !query && (
            <div className="search-empty">
              Gib einen Suchbegriff ein...
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="search-results">
              {results.map(item => (
                <div
                  key={item.id}
                  className="search-result-item"
                  onClick={() => handleAdd(item)}
                  style={{ opacity: adding === item.id ? 0.6 : 1 }}
                >
                  {item.poster_url ? (
                    <img className="search-result-poster" src={item.poster_url} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="search-result-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      {item.media_type === 'game' ? '🎮' : item.media_type === 'series' ? '📺' : '🎬'}
                    </div>
                  )}
                  <div className="search-result-info">
                    <div className="search-result-title">{item.title}</div>
                    <div className="search-result-meta">
                      <span style={{ color: item.media_type === 'movie' ? '#a78bfa' : item.media_type === 'series' ? '#38bdf8' : '#fb923c' }}>
                        {item.media_type === 'movie' ? '🎬 Film' : item.media_type === 'series' ? '📺 Serie' : '🎮 Game'}
                      </span>
                      {item.year && <> · {item.year}</>}
                      {item.rating && <> · ⭐ {item.rating}</>}
                    </div>
                    {item.overview && (
                      <div style={{ fontSize: 11, color: '#666', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.overview}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 18, color: '#E50914', flexShrink: 0, alignSelf: 'center' }}>
                    {adding === item.id ? '⏳' : '+'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
