const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json();
  if (!data.success && !options.ignoreError) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  dreams: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/dreams${qs ? '?' + qs : ''}`);
    },
    get: (id) => request(`/dreams/${id}`),
    create: (data) => request('/dreams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/dreams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/dreams/${id}`, { method: 'DELETE' })
  },
  analysis: {
    trigger: (dreamId) => request(`/dreams/${dreamId}/analyze`, { method: 'POST' }),
    overview: () => request('/analysis/overview'),
    recurring: () => request('/analysis/recurring')
  },
  video: {
    generate: (dreamId) => request(`/dreams/${dreamId}/video`, { method: 'POST' }),
    status: (videoId) => request(`/videos/${videoId}/status`)
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    test: (type) => request('/settings/test', { method: 'POST', body: JSON.stringify({ type }) })
  },
  reverse: {
    suggestions: (dreamId) => request('/reverse-dreams/suggestions', { method: 'POST', body: JSON.stringify({ dream_id: dreamId }) }),
    rewrite: (dreamId, whatIf) => request('/reverse-dreams/rewrite', { method: 'POST', body: JSON.stringify({ dream_id: dreamId, what_if: whatIf }) }),
    perspective: (dreamId, perspective) => request('/reverse-dreams/perspective', { method: 'POST', body: JSON.stringify({ dream_id: dreamId, perspective }) }),
    chain: (dreamIds) => request('/reverse-dreams/chain', { method: 'POST', body: JSON.stringify({ dream_ids: dreamIds }) }),
    discover: () => request('/reverse-dreams/discover'),
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/reverse-dreams${qs ? '?' + qs : ''}`);
    },
    get: (id) => request(`/reverse-dreams/${id}`),
    update: (id, data) => request(`/reverse-dreams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/reverse-dreams/${id}`, { method: 'DELETE' })
  }
};