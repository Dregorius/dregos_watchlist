import { useState } from 'react';
import { api } from '../api';

const TYPE_LABELS   = { movie: 'Film', series: 'Serie', game: 'Game' };
const STATUS_LABELS = { want: 'Merkliste', watching: 'Schaue ich', completed: 'Gesehen', dropped: 'Abgebrochen' };

function getExternalUrl(mediaId, mediaType) {
  if (!mediaId) return null;
  const rawId = String(mediaId).replace(/^tmdb-/, '').replace(/^rawg-/, '');
  if (mediaType === 'movie')  return `https://www.themoviedb.org/movie/${rawId}`;
  if (mediaType === 'series') return `https://www.themoviedb.org/tv/${rawId}`;
  if (mediaType === 'game')   return `https://rawg.io/games/${rawId}`;
  return null;
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

export default function MediaCard({ item, listId, canEdit, onUpdate, onDelete }) {
  const [loading, setLoading] = useState(false);
  const externalUrl = getExternalUrl(item.media_id, item.media_type);
  const dbLabel = item.media_type === 'game' ? 'RAWG' : 'TMDB';

  const handleStatus = async (status) => {
    if (!canEdit || loading) return;
    setLoading(true);
    try {
      const updated = await api.updateItem(listId, item.id, { status });
      onUpdate(updated);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (!confirm(`"${item.title}" aus der Liste entfernen?`)) return;
    try {
      await api.deleteItem(listId, item.id);
      onDelete(item.id);
    } catch (e) { console.error(e); }
  };

  const handleRating = async (rating) => {
    if (!canEdit) return;
    try {
      const updated = await api.updateItem(listId, item.id, { user_rating: rating });
      onUpdate(updated);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="media-card">
      <span className={`status-badge status-${item.status}`}>
        {STATUS_LABELS[item.status] || item.status}
      </span>
      <span className={`type-badge type-${item.media_type}`}>
        {TYPE_LABELS[item.media_type]}
      </span>

      {item.poster_url ? (
        <img className="media-card-poster" src={item.poster_url} alt={item.title} loading="lazy" />
      ) : (
        <div className="media-card-poster-empty">
          {item.media_type === 'game' ? '🎮' : item.media_type === 'series' ? '📺' : '🎬'}
          <span>{item.title.substring(0, 20)}</span>
        </div>
      )}

      <div className="media-card-overlay">
        {/* Title */}
        <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 4, lineHeight: 1.3 }}>
          {item.title}
        </div>

        {/* Added by + external link row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          {item.added_by_name && (
            <span style={{ fontSize: 10, color: '#888' }}>
              von {item.added_by_name}
            </span>
          )}
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={`Auf ${dbLabel} öffnen`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, color: '#aaa', textDecoration: 'none',
                background: 'rgba(255,255,255,.08)', borderRadius: 4,
                padding: '2px 6px', transition: 'color .15s, background .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
            >
              <ExternalLinkIcon /> {dbLabel}
            </a>
          )}
        </div>

        {/* Star Rating */}
        <div className="user-rating" style={{ marginBottom: 8 }}>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              className={`star-btn ${(item.user_rating || 0) >= n ? 'active' : ''}`}
              onClick={() => handleRating(item.user_rating === n ? null : n)}
              title={`${n} Stern${n > 1 ? 'e' : ''}`}
              disabled={!canEdit}
            >⭐</button>
          ))}
        </div>

        {canEdit && (
          <>
            <select
              className="status-select-overlay"
              value={item.status}
              onChange={e => handleStatus(e.target.value)}
              onClick={e => e.stopPropagation()}
              disabled={loading}
            >
              <option value="want">Merkliste</option>
              <option value="watching">Schaue ich</option>
              <option value="completed">Gesehen/Gespielt</option>
              <option value="dropped">Abgebrochen</option>
            </select>
            <button className="btn btn-danger btn-sm" onClick={handleDelete} style={{ marginTop: 6 }}>
              Entfernen
            </button>
          </>
        )}

        {item.rating && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
            <span className="rating-star">★</span> {item.rating} {dbLabel}
          </div>
        )}
      </div>

      <div className="media-card-info">
        <div className="media-card-title">{item.title}</div>
        <div className="media-card-meta">
          {item.year && <span>{item.year}</span>}
          {item.user_rating && <span style={{ color: '#f59e0b' }}>{'⭐'.repeat(item.user_rating)}</span>}
        </div>
      </div>
    </div>
  );
}
