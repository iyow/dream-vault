import { localStorageService } from './localStorageService';

const API_BASE = '/api';

let isOffline = false;
const listeners = new Set();

export function getOfflineStatus() {
  return isOffline;
}

export function subscribeToOfflineStatus(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setOfflineStatus(status) {
  if (isOffline !== status) {
    isOffline = status;
    listeners.forEach(cb => cb(isOffline));
  }
}

async function request(path, options = {}) {
  if (isOffline) {
    throw new Error('API unavailable');
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    if (!res.ok) {
      throw new Error(`API unavailable`);
    }
    const data = await res.json();
    if (!data.success && !options.ignoreError) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (error) {
    setOfflineStatus(true);
    throw new Error('API unavailable');
  }
}

function wrapWithFallback(apiFn, fallbackFn) {
  return async (...args) => {
    try {
      const result = await apiFn(...args);
      setOfflineStatus(false);
      return result;
    } catch (error) {
      if (error.message === 'API unavailable') {
        const fallbackResult = fallbackFn(...args);
        return { success: true, data: fallbackResult, offline: true };
      }
      throw error;
    }
  };
}

export const api = {
  dreams: {
    list: wrapWithFallback(
      (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/dreams${qs ? '?' + qs : ''}`);
      },
      (params = {}) => localStorageService.dreams.list(params)
    ),
    get: wrapWithFallback(
      (id) => request(`/dreams/${id}`),
      (id) => localStorageService.dreams.getById(id)
    ),
    create: wrapWithFallback(
      (data) => request('/dreams', { method: 'POST', body: JSON.stringify(data) }),
      (data) => localStorageService.dreams.create(data)
    ),
    update: wrapWithFallback(
      (id, data) => request(`/dreams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      (id, data) => localStorageService.dreams.update(id, data)
    ),
    delete: wrapWithFallback(
      (id) => request(`/dreams/${id}`, { method: 'DELETE' }),
      (id) => localStorageService.dreams.delete(id)
    )
  },
  analysis: {
    trigger: wrapWithFallback(
      (dreamId) => request(`/dreams/${dreamId}/analyze`, { method: 'POST' }),
      (dreamId) => ({ success: false, error: '分析功能需要在线服务', offline: true })
    ),
    overview: wrapWithFallback(
      () => request('/analysis/overview'),
      () => localStorageService.analysis.getOverview()
    ),
    recurring: wrapWithFallback(
      () => request('/analysis/recurring'),
      () => localStorageService.analysis.getRecurring()
    )
  },
  video: {
    generate: wrapWithFallback(
      (dreamId) => request(`/dreams/${dreamId}/video`, { method: 'POST' }),
      (dreamId) => localStorageService.video.generate(dreamId)
    ),
    status: wrapWithFallback(
      (videoId) => request(`/videos/${videoId}/status`),
      (videoId) => localStorageService.video.status(videoId)
    )
  },
  settings: {
    get: wrapWithFallback(
      () => request('/settings'),
      () => localStorageService.settings.get()
    ),
    update: wrapWithFallback(
      (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
      (data) => localStorageService.settings.update(data)
    ),
    test: wrapWithFallback(
      (type) => request('/settings/test', { method: 'POST', body: JSON.stringify({ type }) }),
      (type) => localStorageService.settings.test(type)
    )
  },
  reverse: {
    suggestions: wrapWithFallback(
      (dreamId) => request('/reverse-dreams/suggestions', { method: 'POST', body: JSON.stringify({ dream_id: dreamId }) }),
      (dreamId) => localStorageService.reverse.getSuggestions(dreamId)
    ),
    rewrite: wrapWithFallback(
      (dreamId, whatIf) => request('/reverse-dreams/rewrite', { method: 'POST', body: JSON.stringify({ dream_id: dreamId, what_if: whatIf }) }),
      (dreamId, whatIf) => localStorageService.reverse.rewrite(dreamId, whatIf)
    ),
    perspective: wrapWithFallback(
      (dreamId, perspective) => request('/reverse-dreams/perspective', { method: 'POST', body: JSON.stringify({ dream_id: dreamId, perspective }) }),
      (dreamId, perspective) => localStorageService.reverse.perspective(dreamId, perspective)
    ),
    chain: wrapWithFallback(
      (dreamIds) => request('/reverse-dreams/chain', { method: 'POST', body: JSON.stringify({ dream_ids: dreamIds }) }),
      (dreamIds) => localStorageService.reverse.chain(dreamIds)
    ),
    discover: wrapWithFallback(
      () => request('/reverse-dreams/discover'),
      () => localStorageService.reverse.discover()
    ),
    list: wrapWithFallback(
      (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/reverse-dreams${qs ? '?' + qs : ''}`);
      },
      (params = {}) => localStorageService.reverse.list(params)
    ),
    get: wrapWithFallback(
      (id) => request(`/reverse-dreams/${id}`),
      (id) => localStorageService.reverse.getById(id)
    ),
    update: wrapWithFallback(
      (id, data) => request(`/reverse-dreams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      (id, data) => localStorageService.reverse.update(id, data)
    ),
    delete: wrapWithFallback(
      (id) => request(`/reverse-dreams/${id}`, { method: 'DELETE' }),
      (id) => localStorageService.reverse.delete(id)
    )
  }
};
