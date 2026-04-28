const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ─── Security: Fail hard on missing JWT_SECRET ────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET fehlt oder zu kurz (min. 32 Zeichen). In .env setzen!');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/watchlist.db';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const RAWG_API_KEY = process.env.RAWG_API_KEY;

// ─── Database ─────────────────────────────────────────────────────────────────

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    avatar_color TEXT DEFAULT '#E50914',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    used_by INTEGER REFERENCES users(id),
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    owner_id INTEGER NOT NULL REFERENCES users(id),
    is_private INTEGER DEFAULT 1,
    type TEXT DEFAULT 'mixed',
    cover_image TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS list_shares (
    list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    can_edit INTEGER DEFAULT 0,
    PRIMARY KEY (list_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    media_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    title TEXT NOT NULL,
    year TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    rating TEXT,
    genres TEXT,
    overview TEXT,
    status TEXT DEFAULT 'want',
    user_rating INTEGER,
    notes TEXT,
    added_by INTEGER REFERENCES users(id),
    added_at TEXT DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO invites (code, created_by) VALUES ('SETUP-ADMIN', NULL);
`);

// ─── Timing-Attack Prevention: Dummy bcrypt hash ──────────────────────────────
// Without this, an attacker can tell whether an email exists by measuring
// response time: "no user found" returns immediately, "wrong password"
// takes ~300ms for bcrypt. We always run bcrypt regardless.
let DUMMY_HASH = '$2b$12$placeholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.';
bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12).then(h => { DUMMY_HASH = h; });

// ─── Helmet (Security Headers) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://image.tmdb.org", "https://media.rawg.io",
               "https://images.rawg.io", "https://cdn.rawg.io"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── Body Size Limits (DoS prevention) ───────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Zu viele Anmeldeversuche. Bitte 15 Minuten warten.' },
  standardHeaders: true, legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { error: 'Zu viele Registrierungsversuche. Bitte 1 Stunde warten.' },
  standardHeaders: true, legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200,
  message: { error: 'Zu viele Anfragen. Bitte kurz warten.' },
  standardHeaders: true, legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { error: 'Zu viele Suchanfragen.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true }));

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Nicht angemeldet' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin erforderlich' });
  next();
};

// ─── Input Helpers ────────────────────────────────────────────────────────────

const VALID_TYPES    = new Set(['mixed', 'movie', 'series', 'game']);
const VALID_STATUSES = new Set(['want', 'watching', 'completed', 'dropped']);
const VALID_MEDIA    = new Set(['movie', 'series', 'game']);
const ALLOWED_IMG    = ['image.tmdb.org', 'media.rawg.io', 'images.rawg.io', 'cdn.rawg.io'];

const trim = (v, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const safeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    if (!ALLOWED_IMG.some(d => u.hostname === d || u.hostname.endsWith('.' + d))) return '';
    return url.slice(0, 500);
  } catch { return ''; }
};

const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  const { username, email, password, invite_code } = req.body;

  if (!username || !email || !password || !invite_code) {
    return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
  }
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_\-. ]{2,30}$/.test(username.trim())) {
    return res.status(400).json({ error: 'Benutzername: 2–30 Zeichen, Buchstaben/Zahlen/_.–' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Passwort muss 8–128 Zeichen haben' });
  }
  if (typeof invite_code !== 'string' || invite_code.length > 50) {
    return res.status(400).json({ error: 'Ungültiger Einladungscode' });
  }

  const invite = db.prepare('SELECT * FROM invites WHERE code = ? AND used_by IS NULL')
    .get(invite_code.trim().toUpperCase());
  if (!invite) return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Einladungscode' });

  const hash = await bcrypt.hash(password, 12);
  const isFirstUser = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt === 0;
  const colors = ['#E50914','#0078d4','#2ecc71','#f39c12','#9b59b6','#1abc9c'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  try {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, is_admin, avatar_color) VALUES (?, ?, ?, ?, ?)'
    ).run(username.trim(), email.trim().toLowerCase(), hash, isFirstUser ? 1 : 0, avatarColor);

    db.prepare("UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE id = ?")
      .run(result.lastInsertRowid, invite.id);

    const user = db.prepare('SELECT id, username, email, is_admin, avatar_color FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({ token, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
    }
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Ungültige Eingabe' });
  }

  // Always run bcrypt — prevents email-enumeration via timing
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const valid = await bcrypt.compare(password.slice(0, 128), hashToCompare);

  if (!user || !valid) {
    return res.status(400).json({ error: 'Ungültige Anmeldedaten' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    JWT_SECRET, { expiresIn: '30d' }
  );
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin, avatar_color: user.avatar_color } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, is_admin, avatar_color FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json(user);
});

// ─── Invite Routes ────────────────────────────────────────────────────────────

app.post('/api/invites', auth, adminOnly, (req, res) => {
  const code = crypto.randomBytes(5).toString('hex').toUpperCase();
  db.prepare('INSERT INTO invites (code, created_by) VALUES (?, ?)').run(code, req.user.id);
  res.json({ code });
});

app.get('/api/invites', auth, adminOnly, (req, res) => {
  const invites = db.prepare(`
    SELECT i.id, i.code, i.used_by, i.used_at, i.created_at,
      u1.username as created_by_name, u2.username as used_by_name
    FROM invites i
    LEFT JOIN users u1 ON i.created_by = u1.id
    LEFT JOIN users u2 ON i.used_by = u2.id
    ORDER BY i.created_at DESC
  `).all();
  res.json(invites);
});

app.delete('/api/invites/:id', auth, adminOnly, (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Ungültige ID' });
  db.prepare('DELETE FROM invites WHERE id = ? AND used_by IS NULL').run(id);
  res.json({ success: true });
});

// ─── User Routes ──────────────────────────────────────────────────────────────

app.get('/api/users', auth, (req, res) => {
  res.json(db.prepare('SELECT id, username, avatar_color FROM users ORDER BY username').all());
});

// Admin: full user details with stats
app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const users = db.prepare(`
    SELECT
      u.id, u.username, u.email, u.is_admin, u.avatar_color, u.created_at,
      (SELECT username FROM users WHERE id = (
        SELECT created_by FROM invites WHERE used_by = u.id LIMIT 1
      )) as invited_by,
      (SELECT COUNT(*) FROM lists WHERE owner_id = u.id) as list_count,
      (SELECT COUNT(*) FROM list_items WHERE added_by = u.id) as item_count
    FROM users u
    ORDER BY u.created_at ASC
  `).all();
  res.json(users);
});

// ─── List Routes ──────────────────────────────────────────────────────────────

app.get('/api/lists', auth, (req, res) => {
  const lists = db.prepare(`
    SELECT l.*, u.username as owner_name, u.avatar_color as owner_color,
      (SELECT COUNT(*) FROM list_items WHERE list_id = l.id) as item_count,
      (SELECT poster_url FROM list_items WHERE list_id = l.id ORDER BY added_at DESC LIMIT 1) as latest_poster
    FROM lists l JOIN users u ON l.owner_id = u.id
    WHERE l.owner_id = ? OR l.id IN (SELECT list_id FROM list_shares WHERE user_id = ?)
    ORDER BY l.updated_at DESC
  `).all(req.user.id, req.user.id);
  res.json(lists);
});

app.post('/api/lists', auth, (req, res) => {
  const name = trim(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const description = trim(req.body.description, 500);
  const type = VALID_TYPES.has(req.body.type) ? req.body.type : 'mixed';
  const is_private = req.body.is_private !== false ? 1 : 0;

  const result = db.prepare(
    'INSERT INTO lists (name, description, owner_id, is_private, type) VALUES (?, ?, ?, ?, ?)'
  ).run(name, description, req.user.id, is_private, type);

  res.json(db.prepare(`
    SELECT l.*, u.username as owner_name, 0 as item_count
    FROM lists l JOIN users u ON l.owner_id = u.id WHERE l.id = ?
  `).get(result.lastInsertRowid));
});

app.get('/api/lists/:id', auth, (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Ungültige ID' });

  const list = db.prepare(`
    SELECT l.*, u.username as owner_name, u.avatar_color as owner_color
    FROM lists l JOIN users u ON l.owner_id = u.id WHERE l.id = ?
  `).get(id);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

  const isOwner = list.owner_id === req.user.id;
  const shareEntry = db.prepare('SELECT * FROM list_shares WHERE list_id = ? AND user_id = ?').get(id, req.user.id);
  if (!isOwner && !shareEntry) return res.status(403).json({ error: 'Kein Zugriff' });

  const items = db.prepare(`
    SELECT li.id, li.media_id, li.media_type, li.title, li.year, li.poster_url,
           li.backdrop_url, li.rating, li.genres, li.overview, li.status,
           li.user_rating, li.notes, li.added_at, u.username as added_by_name
    FROM list_items li LEFT JOIN users u ON li.added_by = u.id
    WHERE li.list_id = ? ORDER BY li.added_at DESC
  `).all(id);

  const shares = db.prepare(`
    SELECT ls.user_id, ls.can_edit, u.username, u.avatar_color
    FROM list_shares ls JOIN users u ON ls.user_id = u.id WHERE ls.list_id = ?
  `).all(id);

  res.json({ ...list, items, shares, is_owner: isOwner, can_edit: isOwner || !!shareEntry?.can_edit });
});

app.put('/api/lists/:id', auth, (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Ungültige ID' });

  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.owner_id !== req.user.id) return res.status(403).json({ error: 'Nur der Eigentümer kann bearbeiten' });

  const name = req.body.name ? trim(req.body.name, 100) || list.name : list.name;
  const description = req.body.description !== undefined ? trim(req.body.description, 500) : list.description;
  const type = VALID_TYPES.has(req.body.type) ? req.body.type : list.type;
  const is_private = req.body.is_private !== undefined ? (req.body.is_private ? 1 : 0) : list.is_private;

  db.prepare(`UPDATE lists SET name=?, description=?, is_private=?, type=?, updated_at=datetime('now') WHERE id=?`)
    .run(name, description, is_private, type, id);
  res.json(db.prepare('SELECT * FROM lists WHERE id = ?').get(id));
});

app.delete('/api/lists/:id', auth, (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Ungültige ID' });

  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });
  if (list.owner_id !== req.user.id) return res.status(403).json({ error: 'Nur der Eigentümer kann löschen' });

  db.prepare('DELETE FROM lists WHERE id = ?').run(id);
  res.json({ success: true });
});

app.post('/api/lists/:id/share', auth, (req, res) => {
  const listId = toInt(req.params.id);
  const userId = toInt(req.body.user_id);
  if (!listId || !userId) return res.status(400).json({ error: 'Ungültige ID' });

  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(listId);
  if (!list || list.owner_id !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff' });
  if (userId === req.user.id) return res.status(400).json({ error: 'Du bist bereits Eigentümer' });

  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId)) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  }

  db.prepare('INSERT OR REPLACE INTO list_shares (list_id, user_id, can_edit) VALUES (?, ?, ?)')
    .run(listId, userId, req.body.can_edit ? 1 : 0);
  res.json({ success: true });
});

app.delete('/api/lists/:id/share/:userId', auth, (req, res) => {
  const listId = toInt(req.params.id);
  const userId = toInt(req.params.userId);
  if (!listId || !userId) return res.status(400).json({ error: 'Ungültige ID' });

  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(listId);
  if (!list || list.owner_id !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff' });

  db.prepare('DELETE FROM list_shares WHERE list_id = ? AND user_id = ?').run(listId, userId);
  res.json({ success: true });
});

// ─── Item Routes ──────────────────────────────────────────────────────────────

app.post('/api/lists/:id/items', auth, (req, res) => {
  const listId = toInt(req.params.id);
  if (!listId) return res.status(400).json({ error: 'Ungültige ID' });

  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(listId);
  if (!list) return res.status(404).json({ error: 'Liste nicht gefunden' });

  const canEdit = list.owner_id === req.user.id ||
    db.prepare('SELECT 1 FROM list_shares WHERE list_id=? AND user_id=? AND can_edit=1').get(listId, req.user.id);
  if (!canEdit) return res.status(403).json({ error: 'Keine Bearbeitungsrechte' });

  const { media_id, media_type } = req.body;
  if (!media_id || !VALID_MEDIA.has(media_type)) {
    return res.status(400).json({ error: 'media_id und gültiger media_type erforderlich' });
  }
  const title = trim(req.body.title, 200);
  if (!title) return res.status(400).json({ error: 'Titel erforderlich' });

  const mediaIdStr = String(media_id).slice(0, 50);
  const status = VALID_STATUSES.has(req.body.status) ? req.body.status : 'want';

  if (db.prepare('SELECT id FROM list_items WHERE list_id=? AND media_id=? AND media_type=?').get(listId, mediaIdStr, media_type)) {
    return res.status(400).json({ error: 'Bereits in dieser Liste' });
  }

  const result = db.prepare(`
    INSERT INTO list_items (list_id, media_id, media_type, title, year, poster_url, backdrop_url, rating, genres, overview, status, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    listId, mediaIdStr, media_type, title,
    trim(req.body.year, 10),
    safeUrl(req.body.poster_url),
    safeUrl(req.body.backdrop_url),
    trim(req.body.rating, 10),
    trim(req.body.genres, 200),
    trim(req.body.overview, 1000),
    status, req.user.id
  );

  db.prepare("UPDATE lists SET updated_at=datetime('now') WHERE id=?").run(listId);
  res.json(db.prepare('SELECT * FROM list_items WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/lists/:listId/items/:itemId', auth, (req, res) => {
  const listId = toInt(req.params.listId);
  const itemId = toInt(req.params.itemId);
  if (!listId || !itemId) return res.status(400).json({ error: 'Ungültige ID' });

  const item = db.prepare(`
    SELECT li.*, l.owner_id FROM list_items li JOIN lists l ON li.list_id=l.id WHERE li.id=? AND li.list_id=?
  `).get(itemId, listId);
  if (!item) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

  const canEdit = item.owner_id === req.user.id ||
    db.prepare('SELECT 1 FROM list_shares WHERE list_id=? AND user_id=? AND can_edit=1').get(listId, req.user.id);
  if (!canEdit) return res.status(403).json({ error: 'Keine Bearbeitungsrechte' });

  const status = VALID_STATUSES.has(req.body.status) ? req.body.status : item.status;
  const notes = req.body.notes !== undefined ? trim(req.body.notes, 500) : item.notes;
  const ur = req.body.user_rating;
  const user_rating = ur !== undefined
    ? (Number.isInteger(ur) && ur >= 1 && ur <= 5 ? ur : null)
    : item.user_rating;

  db.prepare('UPDATE list_items SET status=?, user_rating=?, notes=? WHERE id=?').run(status, user_rating, notes, itemId);
  res.json(db.prepare('SELECT * FROM list_items WHERE id = ?').get(itemId));
});

app.delete('/api/lists/:listId/items/:itemId', auth, (req, res) => {
  const listId = toInt(req.params.listId);
  const itemId = toInt(req.params.itemId);
  if (!listId || !itemId) return res.status(400).json({ error: 'Ungültige ID' });

  const item = db.prepare(`
    SELECT li.*, l.owner_id FROM list_items li JOIN lists l ON li.list_id=l.id WHERE li.id=? AND li.list_id=?
  `).get(itemId, listId);
  if (!item) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

  const canEdit = item.owner_id === req.user.id ||
    db.prepare('SELECT 1 FROM list_shares WHERE list_id=? AND user_id=? AND can_edit=1').get(listId, req.user.id);
  if (!canEdit) return res.status(403).json({ error: 'Keine Bearbeitungsrechte' });

  db.prepare('DELETE FROM list_items WHERE id = ?').run(itemId);
  res.json({ success: true });
});

// ─── Metadata Search ──────────────────────────────────────────────────────────

app.get('/api/metadata/search', auth, searchLimiter, async (req, res) => {
  const q = trim(req.query.q, 100);
  if (!q) return res.status(400).json({ error: 'Suchbegriff erforderlich' });
  const type = ['movie', 'series', 'game', ''].includes(req.query.type) ? req.query.type : '';

  try {
    const results = [];

    if (type !== 'game' && TMDB_API_KEY) {
      const tmdbType = type === 'series' ? 'tv' : type === 'movie' ? 'movie' : 'multi';
      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=de-DE&include_adult=false`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (tmdbRes.ok) {
        const { results: rs = [] } = await tmdbRes.json();
        for (const r of rs.slice(0, 10)) {
          if (r.media_type === 'person') continue;
          const isTV = r.media_type === 'tv' || tmdbType === 'tv';
          results.push({
            id: `tmdb-${r.id}`,
            media_type: isTV ? 'series' : 'movie',
            title: trim(r.title || r.name, 200),
            year: ((r.release_date || r.first_air_date || '').substring(0, 4)),
            poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w300${r.poster_path}` : null,
            backdrop_url: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
            rating: r.vote_average ? String(r.vote_average.toFixed(1)) : null,
            overview: trim(r.overview || '', 300),
          });
        }
      }
    }

    if (type !== 'movie' && type !== 'series' && RAWG_API_KEY) {
      const rawgRes = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(q)}&page_size=6`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (rawgRes.ok) {
        const { results: rs = [] } = await rawgRes.json();
        for (const g of rs) {
          results.push({
            id: `rawg-${g.id}`,
            media_type: 'game',
            title: trim(g.name, 200),
            year: (g.released || '').substring(0, 4),
            poster_url: g.background_image || null,
            backdrop_url: g.background_image || null,
            rating: g.rating ? String(g.rating.toFixed(1)) : null,
            overview: trim(g.genres?.map(x => x.name).join(', ') || '', 200),
          });
        }
      }
    }

    res.json(results);
  } catch (e) {
    console.error('Metadata error:', e.message);
    res.status(500).json({ error: 'Metadaten konnten nicht geladen werden' });
  }
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Watchlist läuft auf Port ${PORT}`);
  if (!TMDB_API_KEY) console.warn('⚠️  TMDB_API_KEY fehlt — Filmsuche deaktiviert');
  if (!RAWG_API_KEY) console.warn('⚠️  RAWG_API_KEY fehlt — Spielsuche deaktiviert');
});
