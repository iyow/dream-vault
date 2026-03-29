const STORAGE_PREFIX = 'dreamvault_';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStorageItem(key) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    return false;
  }
}

export const dreamsStorage = {
  getAll() {
    return getStorageItem('dreams') || [];
  },

  getById(id) {
    const dreams = this.getAll();
    return dreams.find(d => d.id === id) || null;
  },

  create(data) {
    const dreams = this.getAll();
    const newDream = {
      id: generateId(),
      ...data,
      tags: data.tags || [],
      is_analyzed: 0,
      is_video_generated: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dreams.unshift(newDream);
    setStorageItem('dreams', dreams);
    return { id: newDream.id };
  },

  update(id, data) {
    const dreams = this.getAll();
    const index = dreams.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    dreams[index] = {
      ...dreams[index],
      ...data,
      tags: data.tags || dreams[index].tags,
      updated_at: new Date().toISOString()
    };
    setStorageItem('dreams', dreams);
    return dreams[index];
  },

  delete(id) {
    const dreams = this.getAll();
    const filtered = dreams.filter(d => d.id !== id);
    setStorageItem('dreams', filtered);
    return true;
  },

  list({ page = 1, limit = 20, q, from, to, tag } = {}) {
    let dreams = this.getAll();

    if (q) {
      const query = q.toLowerCase();
      dreams = dreams.filter(d => 
        d.title.toLowerCase().includes(query) || 
        d.content.toLowerCase().includes(query)
      );
    }
    if (from) {
      dreams = dreams.filter(d => d.dream_date >= from);
    }
    if (to) {
      dreams = dreams.filter(d => d.dream_date <= to);
    }
    if (tag) {
      dreams = dreams.filter(d => d.tags && d.tags.includes(tag));
    }

    dreams.sort((a, b) => {
      const dateCompare = (b.dream_date || '').localeCompare(a.dream_date || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    const total = dreams.length;
    const offset = (page - 1) * limit;
    const items = dreams.slice(offset, offset + limit);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  }
};

export const analysisStorage = {
  getByDreamId(dreamId) {
    const analyses = getStorageItem('analyses') || [];
    return analyses.find(a => a.dream_id === dreamId) || null;
  },

  create(dreamId, data) {
    const analyses = getStorageItem('analyses') || [];
    const newAnalysis = {
      id: generateId(),
      dream_id: dreamId,
      ...data,
      created_at: new Date().toISOString()
    };
    analyses.push(newAnalysis);
    setStorageItem('analyses', analyses);
    return newAnalysis;
  },

  getOverview() {
    const dreams = dreamsStorage.getAll();
    const analyses = getStorageItem('analyses') || [];
    
    const totalDreams = dreams.length;
    const analyzedDreams = analyses.length;
    
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      const count = dreams.filter(d => d.dream_date && d.dream_date.startsWith(monthStr)).length;
      monthlyTrend.push({ month: monthStr, count });
    }

    return {
      totalDreams,
      analyzedDreams,
      monthlyTrend,
      emotionDistribution: {},
      topThemes: []
    };
  },

  getRecurring() {
    return { patterns: [] };
  }
};

export const reverseDreamsStorage = {
  getAll() {
    return getStorageItem('reverse_dreams') || [];
  },

  getById(id) {
    const dreams = this.getAll();
    return dreams.find(d => d.id === id) || null;
  },

  create(data) {
    const dreams = this.getAll();
    const newDream = {
      id: generateId(),
      ...data,
      created_at: new Date().toISOString()
    };
    dreams.unshift(newDream);
    setStorageItem('reverse_dreams', dreams);
    return newDream;
  },

  update(id, data) {
    const dreams = this.getAll();
    const index = dreams.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    dreams[index] = { ...dreams[index], ...data };
    setStorageItem('reverse_dreams', dreams);
    return dreams[index];
  },

  delete(id) {
    const dreams = this.getAll();
    const filtered = dreams.filter(d => d.id !== id);
    setStorageItem('reverse_dreams', filtered);
    return true;
  },

  list({ page = 1, limit = 20 } = {}) {
    const dreams = this.getAll();
    const total = dreams.length;
    const offset = (page - 1) * limit;
    const items = dreams.slice(offset, offset + limit);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit)
    };
  },

  getSuggestions(dreamId) {
    const dreams = dreamsStorage.getAll();
    const dream = dreams.find(d => d.id === dreamId);
    if (!dream) return { suggestions: [] };

    return {
      suggestions: [
        { type: 'what_if', text: `如果${dream.title}的结局完全不同？` },
        { type: 'perspective', text: `从另一个人的角度看这个梦` }
      ]
    };
  },

  rewrite(dreamId, whatIf) {
    const dream = dreamsStorage.getById(dreamId);
    if (!dream) return null;

    return this.create({
      type: 'rewrite',
      source_dream_ids: JSON.stringify([dreamId]),
      what_if: whatIf,
      generated_content: `[离线模式] 基于"${dream.title}"的改写：${whatIf}`,
      editable_content: dream.content
    });
  },

  perspective(dreamId, perspective) {
    const dream = dreamsStorage.getById(dreamId);
    if (!dream) return null;

    return this.create({
      type: 'perspective',
      source_dream_ids: JSON.stringify([dreamId]),
      perspective,
      generated_content: `[离线模式] 从"${perspective}"的角度看"${dream.title}"`,
      editable_content: dream.content
    });
  },

  chain(dreamIds) {
    const dreams = dreamIds.map(id => dreamsStorage.getById(id)).filter(Boolean);
    if (dreams.length === 0) return null;

    return this.create({
      type: 'chain',
      source_dream_ids: JSON.stringify(dreamIds),
      generated_content: `[离线模式] 梦境串联：${dreams.map(d => d.title).join(' → ')}`,
      editable_content: dreams.map(d => d.content).join('\n\n')
    });
  },

  discover() {
    return { discoveries: [] };
  }
};

export const settingsStorage = {
  get() {
    return getStorageItem('settings') || {
      theme: 'dark',
      language: 'zh',
      notifications: true
    };
  },

  update(data) {
    const settings = this.get();
    const updated = { ...settings, ...data };
    setStorageItem('settings', updated);
    return updated;
  },

  test(type) {
    return { success: true, message: `${type} 测试成功（离线模式）` };
  }
};

export const videoStorage = {
  generate(dreamId) {
    return { 
      success: false, 
      error: '视频生成需要在线服务',
      offline: true
    };
  },

  status(videoId) {
    return { 
      success: false, 
      error: '视频状态查询需要在线服务',
      offline: true
    };
  }
};

export function isOfflineMode() {
  return !navigator.onLine;
}

export const localStorageService = {
  dreams: dreamsStorage,
  analysis: analysisStorage,
  reverse: reverseDreamsStorage,
  settings: settingsStorage,
  video: videoStorage,
  isOffline: isOfflineMode
};
