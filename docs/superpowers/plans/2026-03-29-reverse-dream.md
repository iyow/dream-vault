# 逆梦 (Reverse Dream) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 逆梦 (Reverse Dream) feature — rewrite, perspective switch, and dream chain — inspired by 山海旅人's memory-reversal mechanic.

**Architecture:** New `reverse_dreams` table + API routes + AI service for 5 prompt types. Frontend adds ReversePanel component on DreamDetail, plus ReverseGallery and ReverseDetail pages.

**Tech Stack:** Express, better-sqlite3, React, openai SDK, Recharts, lucide-react

---

## File Structure

```
New files:
  server/routes/reverse.js         # 逆梦 API 路由
  server/services/reverse.js       # 逆梦 AI 服务（5 种 prompt）
  client/src/pages/ReverseGallery.jsx  # 逆梦画廊
  client/src/pages/ReverseDetail.jsx   # 逆梦详情
  client/src/components/ReversePanel.jsx # 逆梦操作面板

Modified files:
  server/db.js                     # 添加 reverse_dreams 表
  server/index.js                  # 挂载 reverse 路由
  client/src/api.js                # 添加 reverse API 方法
  client/src/App.jsx               # 添加路由 + 导航
  client/src/pages/DreamDetail.jsx # 添加逆梦按钮组
```

---

## Task 1: Database + API Routes + Service

### Step 1: Add reverse_dreams table to db.js

Modify `server/db.js` — add after the existing `settings` table (line 59):

```js
  CREATE TABLE IF NOT EXISTS reverse_dreams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    source_dream_ids TEXT NOT NULL,
    what_if TEXT,
    perspective TEXT,
    generated_content TEXT NOT NULL,
    editable_content TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
```

- [ ] **Step 1: Modify server/db.js**

Read the file, then add the new CREATE TABLE block inside the existing `db.exec()` template literal, right before the closing backtick on line 60.

- [ ] **Step 2: Commit**

```bash
cd /Users/iyow/workspace/github-workspace/dream-vault && git add server/db.js && git commit -m "feat: add reverse_dreams table to database"
```

### Step 2: Create AI service

Create `server/services/reverse.js`:

```js
import OpenAI from 'openai';
import db from '../db.js';

function getClient() {
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_api_key')?.value;
  const baseURL = db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_api_url')?.value;
  if (!apiKey) throw new Error('AI API key not configured');
  return new OpenAI({ apiKey, baseURL: baseURL || undefined });
}

function getModel() {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_model')?.value || 'gpt-4o';
}

async function callAI(systemPrompt, userPrompt) {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8
  });
  const raw = response.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse AI response');
  }
}

export async function generateSuggestions(dreamId) {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(dreamId);
  if (!dream) throw new Error('Dream not found');

  return callAI(
    '你是梦境分析师。用户给你一段梦境描述，请给出 3 个"如果当时…"的假设性改写方向。每个方向简短描述（20字以内），并说明可能产生的变化。只返回 JSON: { "suggestions": ["如果...", "如果...", "如果..."] }',
    `标题：${dream.title}\n内容：${dream.content}`
  );
}

export async function rewriteDream(dreamId, whatIf) {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(dreamId);
  if (!dream) throw new Error('Dream not found');

  const result = await callAI(
    '你是梦境叙事作家。用户给你一段梦境和一个"如果当时…"的假设，请基于这个假设改写梦境，保持梦境的奇幻感和叙事张力（300-500字）。只返回 JSON: { "content": "改写后的梦境", "diff": "与原文的关键差异说明" }',
    `原始梦境：\n标题：${dream.title}\n内容：${dream.content}\n\n假设：${whatIf}`
  );

  const row = db.prepare(
    'INSERT INTO reverse_dreams (type, source_dream_ids, what_if, generated_content, editable_content, metadata) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
  ).get('rewrite', JSON.stringify([dreamId]), whatIf, result.content, result.content, JSON.stringify({ diff: result.diff }));

  return { id: row.id, ...result };
}

export async function switchPerspective(dreamId, perspective) {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(dreamId);
  if (!dream) throw new Error('Dream not found');

  const result = await callAI(
    '你是梦境叙事作家。用户给你一段梦境和一个新的视角，请从该视角重新叙述这个梦境（第一人称，300-500字），并给出新视角下的情绪和主题分析。只返回 JSON: { "content": "新视角叙事", "analysis": { "emotion": {}, "themes": [] } }',
    `原始梦境：\n标题：${dream.title}\n内容：${dream.content}\n\n新视角：${perspective}`
  );

  const row = db.prepare(
    'INSERT INTO reverse_dreams (type, source_dream_ids, perspective, generated_content, editable_content, metadata) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
  ).get('perspective', JSON.stringify([dreamId]), perspective, result.content, result.content, JSON.stringify({ analysis: result.analysis }));

  return { id: row.id, ...result };
}

export async function chainDreams(dreamIds) {
  const dreams = dreamIds.map((id) => {
    const d = db.prepare('SELECT id, title, content FROM dreams WHERE id = ?').get(id);
    if (!d) throw new Error(`Dream ${id} not found`);
    return d;
  });

  const dreamTexts = dreams.map((d) => `梦境${d.id}【${d.title}】：${d.content}`).join('\n\n');

  const result = await callAI(
    '你是梦境叙事作家。用户给你多条独立梦境，请将它们编织成一个连贯的连续故事（500-800字）。保持每条梦境的核心元素，添加自然的过渡。只返回 JSON: { "content": "完整故事", "segments": [{"dream_id": 1, "portion": "对应段落"}] }',
    dreamTexts
  );

  const row = db.prepare(
    'INSERT INTO reverse_dreams (type, source_dream_ids, generated_content, editable_content, metadata) VALUES (?, ?, ?, ?, ?) RETURNING id'
  ).get('chain', JSON.stringify(dreamIds), result.content, result.content, JSON.stringify({ segments: result.segments }));

  return { id: row.id, ...result };
}

export async function discoverConnections() {
  const dreams = db.prepare('SELECT id, title, content, tags FROM dreams WHERE is_analyzed = 1').all();
  if (dreams.length < 2) return { groups: [] };

  const dreamSummaries = dreams.map((d) => `ID:${d.id} 标题:${d.title} 标签:${d.tags} 内容摘要:${d.content.slice(0, 100)}`).join('\n');

  const result = await callAI(
    '你是梦境关联分析师。用户给你多条梦境的摘要，请找出其中主题、符号、人物有关联的梦境组（至少2条一组）。只返回 JSON: { "groups": [{"dream_ids": [1,3], "reason": "关联原因"}] }。如果没有关联，返回空数组。',
    dreamSummaries
  );

  return result;
}
```

- [ ] **Step 3: Create server/services/reverse.js**
- [ ] **Step 4: Commit**

```bash
git add server/services/reverse.js && git commit -m "feat: add reverse dream AI service with 5 prompt types"
```

### Step 3: Create API routes

Create `server/routes/reverse.js`:

```js
import { Router } from 'express';
import db from '../db.js';
import { generateSuggestions, rewriteDream, switchPerspective, chainDreams, discoverConnections } from '../services/reverse.js';

const router = Router();

router.post('/reverse-dreams/suggestions', async (req, res) => {
  try {
    const result = await generateSuggestions(req.body.dream_id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/reverse-dreams/rewrite', async (req, res) => {
  try {
    const result = await rewriteDream(req.body.dream_id, req.body.what_if);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/reverse-dreams/perspective', async (req, res) => {
  try {
    const result = await switchPerspective(req.body.dream_id, req.body.perspective);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/reverse-dreams/chain', async (req, res) => {
  try {
    const result = await chainDreams(req.body.dream_ids);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/reverse-dreams/discover', async (req, res) => {
  try {
    const result = await discoverConnections();
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/reverse-dreams', (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM reverse_dreams ${where}`).get(...params).count;
  const rows = db.prepare(`SELECT * FROM reverse_dreams ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), Number(offset));

  const items = rows.map((r) => {
    const sourceIds = JSON.parse(r.source_dream_ids);
    const sourceDreams = sourceIds.map((sid) => db.prepare('SELECT id, title FROM dreams WHERE id = ?').get(sid)).filter(Boolean);
    return { ...r, source_dream_ids: sourceIds, source_dreams: sourceDreams, metadata: JSON.parse(r.metadata || '{}') };
  });

  res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
});

router.get('/reverse-dreams/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM reverse_dreams WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Not found' });

  const sourceIds = JSON.parse(row.source_dream_ids);
  const sourceDreams = sourceIds.map((sid) => db.prepare('SELECT * FROM dreams WHERE id = ?').get(sid)).filter(Boolean);

  res.json({
    success: true,
    data: { ...row, source_dream_ids: sourceIds, source_dreams: sourceDreams, metadata: JSON.parse(row.metadata || '{}') }
  });
});

router.put('/reverse-dreams/:id', (req, res) => {
  const { editable_content } = req.body;
  db.prepare('UPDATE reverse_dreams SET editable_content = ? WHERE id = ?').run(editable_content, req.params.id);
  res.json({ success: true });
});

router.delete('/reverse-dreams/:id', (req, res) => {
  db.prepare('DELETE FROM reverse_dreams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 5: Create server/routes/reverse.js**
- [ ] **Step 6: Commit**

```bash
git add server/routes/reverse.js && git commit -m "feat: add reverse dream API routes"
```

### Step 4: Mount routes in server/index.js

Modify `server/index.js` — add after line 10 (settingsRouter import):

```js
import reverseRouter from './routes/reverse.js';
```

And after line 22 (`app.use('/api/settings', settingsRouter)`):

```js
app.use('/api', reverseRouter);
```

- [ ] **Step 7: Modify server/index.js**
- [ ] **Step 8: Commit**

```bash
git add server/index.js && git commit -m "feat: mount reverse dream routes"
```

---

## Task 2: Frontend API Client + Navigation

### Step 1: Add reverse API methods to api.js

Modify `client/src/api.js` — add before the closing `};`:

```js
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
```

- [ ] **Step 1: Modify client/src/api.js**
- [ ] **Step 2: Commit**

```bash
git add client/src/api.js && git commit -m "feat: add reverse dream API client methods"
```

### Step 2: Add routes and navigation to App.jsx

Modify `client/src/App.jsx`:

1. Add import: `import { Scroll } from 'lucide-react';`
2. Add imports: `import ReverseGallery from './pages/ReverseGallery';` and `import ReverseDetail from './pages/ReverseDetail';`
3. Add nav link after "记录梦境" link:

```jsx
            <Link to="/reverse" className={`flex items-center gap-1 text-sm ${location.pathname.startsWith('/reverse') ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
              <Scroll className="w-4 h-4" /> 逆梦
            </Link>
```

4. Add routes before `</Routes>`:

```jsx
          <Route path="/reverse" element={<ReverseGallery />} />
          <Route path="/reverse/:id" element={<ReverseDetail />} />
```

- [ ] **Step 3: Modify client/src/App.jsx**
- [ ] **Step 4: Commit**

```bash
git add client/src/App.jsx && git commit -m "feat: add reverse dream routes and navigation"
```

---

## Task 3: ReversePanel Component (DreamDetail integration)

Create `client/src/components/ReversePanel.jsx`:

```jsx
import { useState } from 'react';
import { Wand2, Eye, Link2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';

const MODES = [
  { key: 'rewrite', label: '改写梦境', icon: Wand2, color: 'bg-purple-600 hover:bg-purple-500' },
  { key: 'perspective', label: '视角切换', icon: Eye, color: 'bg-indigo-600 hover:bg-indigo-500' },
  { key: 'chain', label: '梦境串联', icon: Link2, color: 'bg-cyan-600 hover:bg-cyan-500' }
];

export default function ReversePanel({ dreamId, onSaved }) {
  const [mode, setMode] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [editableContent, setEditableContent] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function handleModeSelect(m) {
    setMode(m);
    setResult(null);
    setEditableContent('');
    setCustomInput('');
    setSuggestions([]);

    if (m === 'rewrite' || m === 'perspective') {
      setLoadingSug(true);
      try {
        const res = await api.reverse.suggestions(dreamId);
        setSuggestions(res.data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }
  }

  async function handleGenerate(whatIfOrPerspective) {
    setGenerating(true);
    try {
      let res;
      if (mode === 'rewrite') {
        res = await api.reverse.rewrite(dreamId, whatIfOrPerspective);
      } else if (mode === 'perspective') {
        res = await api.reverse.perspective(dreamId, whatIfOrPerspective);
      }
      setResult(res.data);
      setEditableContent(res.data.content);
    } catch (e) {
      alert('生成失败: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    try {
      await api.reverse.update(result.id, { editable_content: editableContent });
      alert('保存成功');
      onSaved?.();
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  }

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition"
      >
        <span className="flex items-center gap-2 text-lg font-semibold text-purple-400">
          <Wand2 className="w-5 h-5" /> 逆梦
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {!mode && (
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleModeSelect(m.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${m.color}`}
                >
                  <m.icon className="w-4 h-4" /> {m.label}
                </button>
              ))}
            </div>
          )}

          {mode && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {mode === 'rewrite' ? '选择或输入"如果…"假设' : mode === 'perspective' ? '选择或输入视角' : '选择串联的梦境'}
                </span>
                <button onClick={() => setMode(null)} className="text-xs text-slate-500 hover:text-white">返回</button>
              </div>

              {loadingSug ? (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> 生成建议中...
                </div>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleGenerate(s)}
                          disabled={generating}
                          className="w-full text-left p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm hover:border-purple-500/50 transition disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={mode === 'rewrite' ? '自定义"如果…"假设' : mode === 'perspective' ? '自定义视角' : ''}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => handleGenerate(customInput)}
                      disabled={!customInput.trim() || generating}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : '生成'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {result.diff && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">
                  {result.diff}
                </div>
              )}
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-y"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium"
                >
                  保存逆梦
                </button>
                <button
                  onClick={() => { setMode(null); setResult(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                >
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 1: Create client/src/components/ReversePanel.jsx**
- [ ] **Step 2: Commit**

```bash
git add client/src/components/ReversePanel.jsx && git commit -m "feat: add ReversePanel component for dream detail"
```

### Step 3: Add ReversePanel to DreamDetail

Modify `client/src/pages/DreamDetail.jsx`:

1. Add import: `import ReversePanel from '../components/ReversePanel';`
2. Add after the video section (after line 186, before the closing `</div>`):

```jsx
      {analysis && (
        <ReversePanel dreamId={id} />
      )}
```

- [ ] **Step 4: Modify client/src/pages/DreamDetail.jsx**
- [ ] **Step 5: Commit**

```bash
git add client/src/pages/DreamDetail.jsx && git commit -m "feat: integrate ReversePanel into DreamDetail page"
```

---

## Task 4: ReverseGallery Page

Create `client/src/pages/ReverseGallery.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, Eye, Link2, Scroll } from 'lucide-react';
import { api } from '../api';

const TYPE_MAP = {
  rewrite: { label: '改写', icon: Wand2, color: 'text-purple-400' },
  perspective: { label: '视角', icon: Eye, color: 'text-indigo-400' },
  chain: { label: '串联', icon: Link2, color: 'text-cyan-400' }
};

export default function ReverseGallery() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadItems();
  }, [typeFilter, page]);

  async function loadItems() {
    const params = { page, limit: 20 };
    if (typeFilter) params.type = typeFilter;
    const res = await api.reverse.list(params);
    setItems(res.data.items);
    setTotal(res.data.total);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Scroll className="w-5 h-5 text-purple-400" /> 逆梦画廊
        </h1>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: '', label: '全部' },
          { key: 'rewrite', label: '改写' },
          { key: 'perspective', label: '视角' },
          { key: 'chain', label: '串联' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTypeFilter(t.key); setPage(1); }}
            className={`px-3 py-1 text-sm rounded-full border ${
              typeFilter === t.key
                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const typeInfo = TYPE_MAP[item.type] || {};
          const Icon = typeInfo.icon || Scroll;
          return (
            <Link
              key={item.id}
              to={`/reverse/${item.id}`}
              className="block p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-purple-500/50 transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`flex items-center gap-1 text-xs font-medium ${typeInfo.color}`}>
                  <Icon className="w-3 h-3" /> {typeInfo.label}
                </span>
                <span className="text-xs text-slate-600">{item.created_at}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                {item.source_dreams?.map((d) => (
                  <span key={d.id} className="text-sm text-slate-400">{d.title}</span>
                ))}
                {item.what_if && <span className="text-xs text-amber-400">— {item.what_if}</span>}
                {item.perspective && <span className="text-xs text-indigo-400">— {item.perspective}</span>}
              </div>
              <p className="text-sm text-slate-400 line-clamp-2">{item.editable_content}</p>
            </Link>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Scroll className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>还没有逆梦记录</p>
            <p className="text-sm">在梦境详情页点击"逆梦"开始</p>
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 text-sm rounded ${page === i + 1 ? 'bg-purple-600' : 'bg-slate-800 text-slate-400'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 1: Create client/src/pages/ReverseGallery.jsx**
- [ ] **Step 2: Commit**

```bash
git add client/src/pages/ReverseGallery.jsx && git commit -m "feat: add ReverseGallery page with type filtering"
```

---

## Task 5: ReverseDetail Page

Create `client/src/pages/ReverseDetail.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Wand2, Eye, Link2 } from 'lucide-react';
import { api } from '../api';

const TYPE_MAP = {
  rewrite: { label: '改写梦境', icon: Wand2, color: 'text-purple-400' },
  perspective: { label: '视角切换', icon: Eye, color: 'text-indigo-400' },
  chain: { label: '梦境串联', icon: Link2, color: 'text-cyan-400' }
};

export default function ReverseDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reverse.get(id).then((res) => {
      setItem(res.data);
      setContent(res.data.editable_content || res.data.generated_content);
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.reverse.update(id, { editable_content: content });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-slate-500">加载中...</div>;
  if (!item) return <div className="text-center py-12 text-slate-500">不存在</div>;

  const typeInfo = TYPE_MAP[item.type] || {};
  const Icon = typeInfo.icon || Wand2;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/reverse" className="flex items-center gap-1 text-sm text-slate-500 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回画廊
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <span className={`flex items-center gap-1 text-sm font-medium ${typeInfo.color}`}>
          <Icon className="w-4 h-4" /> {typeInfo.label}
        </span>
        <span className="text-xs text-slate-600">{item.created_at}</span>
        {item.what_if && <span className="text-xs text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded">{item.what_if}</span>}
        {item.perspective && <span className="text-xs text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded">{item.perspective}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">源梦境</h3>
          <div className="space-y-4">
            {item.source_dreams?.map((d) => (
              <div key={d.id} className="p-4 bg-slate-900/30 border border-slate-800 rounded-lg">
                <Link to={`/dream/${d.id}`} className="font-medium text-white hover:text-purple-400">{d.title}</Link>
                <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{d.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">逆梦内容</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-y"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 1: Create client/src/pages/ReverseDetail.jsx**
- [ ] **Step 2: Commit**

```bash
git add client/src/pages/ReverseDetail.jsx && git commit -m "feat: add ReverseDetail page with source comparison and editing"
```

---

## Task 6: Build & Verify

- [ ] **Step 1: Build frontend**

```bash
cd /Users/iyow/workspace/github-workspace/dream-vault && npm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Verify server starts**

```bash
cd /Users/iyow/workspace/github-workspace/dream-vault && timeout 5 node server/index.js || true
```

Expected: "DreamVault server running on http://localhost:3001"

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "feat: complete reverse dream feature"
```

---

## Self-Review

### Spec Coverage

| Spec Requirement | Task |
|---|---|
| reverse_dreams table | Task 1 Step 1 |
| Suggestions API | Task 1 Step 3 |
| Rewrite API | Task 1 Step 3 |
| Perspective API | Task 1 Step 3 |
| Chain API | Task 1 Step 3 |
| Discover API | Task 1 Step 3 |
| CRUD (list/get/update/delete) | Task 1 Step 3 |
| AI service (5 prompt types) | Task 1 Step 2 |
| Frontend API client | Task 2 Step 1 |
| Navigation + routes | Task 2 Step 2 |
| ReversePanel on DreamDetail | Task 3 |
| ReverseGallery page | Task 4 |
| ReverseDetail page | Task 5 |

All requirements covered.

### Type Consistency

- `reverse_dreams` type values: 'rewrite' | 'perspective' | 'chain' — consistent across DB, service, routes, frontend
- `source_dream_ids`: JSON array of integers — consistent across all layers
- API response format: `{ success, data }` — consistent with existing endpoints

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-29-reverse-dream.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
