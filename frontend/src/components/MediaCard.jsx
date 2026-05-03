import { useState } from 'react';
import { api } from '../api';

const TYPE_LABELS   = { movie: 'Film', series: 'Serie', game: 'Game' };
const STATUS_LABELS = {
  movie:  { want: 'Merkliste', watching: 'Schaue ich', completed: 'Gesehen',       dropped: 'Abgebrochen' },
  series: { want: 'Merkliste', watching: 'Schaue ich', completed: 'Gesehen',       dropped: 'Abgebrochen' },
  game:   { want: 'Merkliste', watching: 'Spiele ich', completed: 'Durchgespielt', dropped: 'Abgebrochen' },
};
const getStatusLabel = (type, status) => (STATUS_LABELS[type] || STATUS_LABELS.movie)[status] || status;

function toLetterboxdSlug(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getExternalUrl(item, listType) {
  if (!item) return null;
  const rawId = String(item.media_id).replace(/^tmdb-/, '').replace(/^rawg-/, '');
  if (item.media_type === 'game') return `https://rawg.io/games/${rawId}`;
  if (listType === 'anime') return `https://myanimelist.net/search/all?q=${encodeURIComponent(item.title)}`;
  if (item.media_type === 'series') return `https://www.themoviedb.org/tv/${rawId}`;
  const query = [item.original_title || item.title, item.year].filter(Boolean).join(' ');
  return `https://letterboxd.com/search/${encodeURIComponent(query)}/`;
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

function ExtLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title={`Auf ${label} öffnen`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, color: '#aaa', textDecoration: 'none',
        background: 'rgba(255,255,255,.08)', borderRadius: 4,
        padding: '2px 6px', transition: 'color .15s, background .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.16)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
    >
      <ExternalLinkIcon /> {label}
    </a>
  );
}

export default function MediaCard({ item, listId, listType, canEdit, onUpdate, onDelete }) {
  const [loading, setLoading] = useState(false);
  const externalUrl = getExternalUrl(item, listType);
  const dbLabel = item.media_type === 'game' ? 'RAWG' : listType === 'anime' ? 'MAL' : item.media_type === 'series' ? 'TMDB' : 'Letterboxd';
  const malUrl = item.media_type === 'series' ? `https://myanimelist.net/search/all?q=${encodeURIComponent(item.title)}` : null;
  const rawId = String(item.media_id).replace(/^tmdb-/, '').replace(/^rawg-/, '');
  const tmdbUrl = item.media_type === 'movie' ? `https://www.themoviedb.org/movie/${rawId}` : null;
  const letterboxdUrl = item.media_type === 'movie' ? externalUrl : null;

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
        {getStatusLabel(item.media_type, item.status)}
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
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Movie: TMDB + Letterboxd */}
            {tmdbUrl && <ExtLink href={tmdbUrl} label="TMDB" />}
            {letterboxdUrl && <ExtLink href={letterboxdUrl} label="Letterboxd" />}
            {/* Series: TMDB (+ MAL for mixed lists) */}
            {!tmdbUrl && !letterboxdUrl && externalUrl && <ExtLink href={externalUrl} label={dbLabel} />}
            {malUrl && listType !== 'anime' && <ExtLink href={malUrl} label="MAL" />}
          </div>
        </div>

        {/* Star Rating */}
        <div className="user-rating" style={{ marginBottom: 8, justifyContent: 'center', width: 90, margin: '0 auto 8px' }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
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
              <option value="watching">{getStatusLabel(item.media_type, 'watching')}</option>
              <option value="completed">{getStatusLabel(item.media_type, 'completed')}</option>
              <option value="dropped">Abgebrochen</option>
            </select>
            <button className="btn btn-danger btn-sm" onClick={handleDelete} style={{ marginTop: 6 }}>
              Entfernen
            </button>
          </>
        )}

        {item.rating && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
            <span className="rating-star">★</span> {item.rating} {item.media_type === 'game' ? 'RAWG' : 'TMDB'}
          </div>
        )}
      </div>

      <div className="media-card-info">
        <div className="media-card-title">{item.title}</div>
        <div className="media-card-meta">
          {item.year && <span>{item.year}</span>}
          {item.user_rating && <span style={{ color: '#f59e0b' }}>{'★'.repeat(item.user_rating)} <span style={{fontSize:10,opacity:.7}}>{item.user_rating}/10</span></span>}
        </div>
      </div>
    </div>
  );
}
