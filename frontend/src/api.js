const BASE = '/api';

function token() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),

  // Invites
  getInvites: () => request('/invites'),
  createInvite: () => request('/invites', { method: 'POST' }),
  deleteInvite: (id) => request(`/invites/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request('/users'),
  getAdminUsers: () => request('/admin/users'),

  // Lists
  getLists: () => request('/lists'),
  createList: (data) => request('/lists', { method: 'POST', body: data }),
  getList: (id) => request(`/lists/${id}`),
  updateList: (id, data) => request(`/lists/${id}`, { method: 'PUT', body: data }),
  deleteList: (id) => request(`/lists/${id}`, { method: 'DELETE' }),
  shareList: (id, userId, canEdit) => request(`/lists/${id}/share`, { method: 'POST', body: { user_id: userId, can_edit: canEdit } }),
  unshareList: (id, userId) => request(`/lists/${id}/share/${userId}`, { method: 'DELETE' }),
  reorderLists: (order) => request('/lists/reorder', { method: 'PUT', body: { order } }),

  // Items
  addItem: (listId, data) => request(`/lists/${listId}/items`, { method: 'POST', body: data }),
  updateItem: (listId, itemId, data) => request(`/lists/${listId}/items/${itemId}`, { method: 'PUT', body: data }),
  deleteItem: (listId, itemId) => request(`/lists/${listId}/items/${itemId}`, { method: 'DELETE' }),

  // Metadata
  search: (q, type) => request(`/metadata/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`),

  // Letterboxd
  getLetterboxdFeed: (username) => request(`/letterboxd/${encodeURIComponent(username)}`),

  // MAL
  getMalFeed: (username) => request(`/mal/${encodeURIComponent(username)}`),
};
