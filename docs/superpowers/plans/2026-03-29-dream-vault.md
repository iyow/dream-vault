# DreamVault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local single-user Web app for dream collection, management, analysis, and optional video generation.

**Architecture:** Express + SQLite backend serving REST API, React + Vite + Tailwind frontend SPA. AI analysis via configurable LLM API, video generation via configurable external API with fallback to output production info.

**Tech Stack:** Express, better-sqlite3, React, Vite, Tailwind CSS, Recharts, openai SDK

---

## File Structure

```
dream-vault/
├── server/
│   ├── index.js              # Express entry, static file serving
│   ├── db.js                 # SQLite connection, schema init
│   ├── routes/
│   │   ├── dreams.js         # CRUD + cascade delete
│   │   ├── analysis.js       # analyze trigger, overview, recurring
│   │   ├── video.js          # video generation, status poll
│   │   └── settings.js       # GET/PUT settings, test connectivity
│   ├── services/
│   │   ├── ai.js             # LLM call wrapper, analysis prompt
│   │   └── video.js          # video API wrapper, sync/async handling
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx          # React entry
│   │   ├── App.jsx           # Router config
│   │   ├── api.js            # fetch wrapper
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DreamEditor.jsx
│   │   │   ├── DreamDetail.jsx
│   │   │   ├── Analysis.jsx
│   │   │   └── Settings.jsx
│   │   └── components/
│   │       ├── StarRating.jsx
│   │       ├── TagInput.jsx
│   │       ├── EmotionChart.jsx
│   │       ├── StoryboardCard.jsx
│   │       └── VideoPlayer.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── data/                     # gitignored, auto-created
├── package.json
└── .gitignore
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `server/package.json`
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "dream-vault",
  "private": true,
  "scripts": {
    "install:all": "npm install && cd server && npm install && cd ../client && npm install",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && node index.js",
    "dev:client": "cd client && npx vite",
    "build": "cd client && npx vite build",
    "start": "cd server && node index.js"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
data/
dist/
.env
*.db
```

- [ ] **Step 3: Create server/package.json**

```json
{
  "name": "dream-vault-server",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "openai": "^4.70.0",
    "node-fetch": "^3.3.2"
  }
}
```

- [ ] **Step 4: Create client/package.json**

```json
{
  "name": "dream-vault-client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.3",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 5: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DreamVault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create client/vite.config.js**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

- [ ] **Step 7: Create client/tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {}
  },
  plugins: []
};
```

- [ ] **Step 8: Create client/postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 9: Create client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-950 text-slate-100;
}
```

- [ ] **Step 10: Install dependencies**

```bash
cd dream-vault && npm run install:all
```

Expected: All packages install without errors.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "chore: scaffold dream-vault project"
```

---

## Task 2: Database Layer

**Files:**
- Create: `server/db.js`

- [ ] **Step 1: Create server/db.js with schema**

```js
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'dreamvault.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS dreams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    dream_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    mood_before TEXT,
    sleep_quality INTEGER,
    tags TEXT DEFAULT '[]',
    is_analyzed INTEGER DEFAULT 0,
    is_video_generated INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dream_id INTEGER NOT NULL,
    emotion TEXT,
    themes TEXT,
    symbols TEXT,
    summary TEXT,
    video_prompt TEXT,
    storyboard TEXT,
    raw_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dream_id INTEGER NOT NULL,
    api_provider TEXT,
    original_path TEXT,
    effect_path TEXT,
    status TEXT DEFAULT 'pending',
    task_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export default db;
```

- [ ] **Step 2: Test database initialization**

```bash
cd dream-vault/server && node -e "import('./db.js').then(() => console.log('DB OK'))"
```

Expected: prints "DB OK", `data/dreamvault.db` created with all 4 tables.

- [ ] **Step 3: Verify tables exist**

```bash
cd dream-vault && sqlite3 data/dreamvault.db ".tables"
```

Expected: `analyses  dreams  settings  videos`

- [ ] **Step 4: Commit**

```bash
git add server/db.js && git commit -m "feat: add database layer with schema"
```

---

## Task 3: Settings API

**Files:**
- Create: `server/routes/settings.js`

- [ ] **Step 1: Create settings routes**

```js
import { Router } from 'express';
import db from '../db.js';

const router = Router();

const DEFAULTS = {
  ai_api_url: 'https://api.openai.com/v1',
  ai_api_key: '',
  ai_model: 'gpt-4o',
  video_api_url: '',
  video_api_key: ''
};

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json({ success: true, data: settings });
});

router.put('/', (req, res) => {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const txn = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, value);
    }
  });
  txn(Object.entries(req.body));
  res.json({ success: true });
});

router.post('/test', async (req, res) => {
  const { type } = req.body;
  if (type === 'ai') {
    const url = db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_api_url')?.value;
    const key = db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_api_key')?.value;
    if (!url || !key) {
      return res.json({ success: false, error: 'AI API not configured' });
    }
    try {
      const resp = await fetch(`${url}/models`, {
        headers: { Authorization: `Bearer ${key}` }
      });
      res.json({ success: resp.ok, status: resp.status });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  } else if (type === 'video') {
    const url = db.prepare('SELECT value FROM settings WHERE key = ?').get('video_api_url')?.value;
    const key = db.prepare('SELECT value FROM settings WHERE key = ?').get('video_api_key')?.value;
    if (!url || !key) {
      return res.json({ success: false, error: 'Video API not configured' });
    }
    try {
      const resp = await fetch(url, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${key}` }
      });
      res.json({ success: resp.ok, status: resp.status });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  } else {
    res.status(400).json({ success: false, error: 'Invalid test type' });
  }
});

export default router;
```

- [ ] **Step 2: Test settings API manually**

Start server: `cd dream-vault/server && node index.js` (will fail until index.js exists, skip for now)

- [ ] **Step 3: Commit**

```bash
git add server/routes/settings.js && git commit -m "feat: add settings API routes"
```

---

## Task 4: Dreams CRUD API

**Files:**
- Create: `server/routes/dreams.js`

- [ ] **Step 1: Create dreams routes**

```js
import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { page = 1, limit = 20, q, from, to, tag } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (from) {
    conditions.push('dream_date >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('dream_date <= ?');
    params.push(to);
  }
  if (tag) {
    conditions.push('tags LIKE ?');
    params.push(`%"${tag}"%`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM dreams ${where}`).get(...params).count;
  const rows = db
    .prepare(`SELECT * FROM dreams ${where} ORDER BY dream_date DESC, created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(limit), Number(offset));

  res.json({
    success: true,
    data: {
      items: rows.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') })),
      total,
      page: Number(page),
      limit: Number(limit)
    }
  });
});

router.get('/:id', (req, res) => {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(req.params.id);
  if (!dream) return res.status(404).json({ success: false, error: 'Dream not found' });

  dream.tags = JSON.parse(dream.tags || '[]');
  const analysis = db.prepare('SELECT * FROM analyses WHERE dream_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  const video = db.prepare('SELECT * FROM videos WHERE dream_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);

  const result = { ...dream };
  if (analysis) {
    result.analysis = {
      ...analysis,
      emotion: JSON.parse(analysis.emotion || '{}'),
      themes: JSON.parse(analysis.themes || '[]'),
      symbols: JSON.parse(analysis.symbols || '[]'),
      storyboard: JSON.parse(analysis.storyboard || '[]')
    };
  }
  if (video) result.video = video;

  res.json({ success: true, data: result });
});

router.post('/', (req, res) => {
  const { title, content, dream_date, mood_before, sleep_quality, tags } = req.body;
  if (!title || !content || !dream_date) {
    return res.status(400).json({ success: false, error: 'title, content, dream_date are required' });
  }
  const result = db
    .prepare(
      'INSERT INTO dreams (title, content, dream_date, mood_before, sleep_quality, tags) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(title, content, dream_date, mood_before || null, sleep_quality || null, JSON.stringify(tags || []));
  res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/:id', (req, res) => {
  const { title, content, dream_date, mood_before, sleep_quality, tags } = req.body;
  const existing = db.prepare('SELECT id FROM dreams WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Dream not found' });

  db.prepare(
    'UPDATE dreams SET title=?, content=?, dream_date=?, mood_before=?, sleep_quality=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(title, content, dream_date, mood_before || null, sleep_quality || null, JSON.stringify(tags || []), req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM dreams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/dreams.js && git commit -m "feat: add dreams CRUD API with filtering and pagination"
```

---

## Task 5: AI Service

**Files:**
- Create: `server/services/ai.js`

- [ ] **Step 1: Create AI service with analysis prompt**

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

const ANALYSIS_SYSTEM_PROMPT = `你是一位专业的梦境分析师。用户会给你一段梦境描述，你需要从多个维度进行分析并以严格 JSON 格式返回。

返回格式（务必只返回 JSON，不要多余文字）：
{
  "emotion": {"情绪名": 权重0-1, ...},  // 至少包含3个情绪维度
  "themes": ["主题1", "主题2"],           // 2-5个核心主题
  "symbols": [{"symbol":"象征物","meaning":"心理学含义"}],  // 2-5个象征
  "summary": "200字以内的梦境解读",
  "video_prompt": "英文电影级视频描述，包含场景、运镜、光影、氛围。遵循：photorealistic风格，无文字叠加，无声叙事，30秒以内",
  "storyboard": [
    {"scene":"场景描述","camera":"镜头语言","duration":8}
  ]  // 3-5个分镜，总时长约30秒
}`;

export async function analyzeDream(dreamId) {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(dreamId);
  if (!dream) throw new Error('Dream not found');

  const client = getClient();
  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: `标题：${dream.title}\n\n内容：${dream.content}\n\n入睡前情绪：${dream.mood_before || '未记录'}\n睡眠质量：${dream.sleep_quality || '未记录'}/5` }
    ],
    temperature: 0.7
  });

  const raw = response.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  db.prepare(
    'INSERT INTO analyses (dream_id, emotion, themes, symbols, summary, video_prompt, storyboard, raw_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    dreamId,
    JSON.stringify(parsed.emotion || {}),
    JSON.stringify(parsed.themes || []),
    JSON.stringify(parsed.symbols || []),
    parsed.summary || '',
    parsed.video_prompt || '',
    JSON.stringify(parsed.storyboard || []),
    raw
  );

  db.prepare('UPDATE dreams SET is_analyzed = 1 WHERE id = ?').run(dreamId);

  return parsed;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/ai.js && git commit -m "feat: add AI analysis service with structured prompt"
```

---

## Task 6: Analysis API Routes

**Files:**
- Create: `server/routes/analysis.js`

- [ ] **Step 1: Create analysis routes**

```js
import { Router } from 'express';
import db from '../db.js';
import { analyzeDream } from '../services/ai.js';

const router = Router();

router.post('/dreams/:id/analyze', async (req, res) => {
  try {
    const result = await analyzeDream(req.params.id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/analysis/overview', (req, res) => {
  const totalDreams = db.prepare('SELECT COUNT(*) as count FROM dreams').get().count;
  const analyzedDreams = db.prepare('SELECT COUNT(*) as count FROM dreams WHERE is_analyzed = 1').get().count;

  const emotionAgg = db.prepare(
    "SELECT emotion FROM analyses WHERE emotion IS NOT NULL"
  ).all();

  const emotionTotals = {};
  for (const row of emotionAgg) {
    const emo = JSON.parse(row.emotion);
    for (const [k, v] of Object.entries(emo)) {
      emotionTotals[k] = (emotionTotals[k] || 0) + v;
    }
  }

  const themeRows = db.prepare("SELECT themes FROM analyses WHERE themes IS NOT NULL").all();
  const themeCounts = {};
  for (const row of themeRows) {
    for (const t of JSON.parse(row.themes)) {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    }
  }

  const monthlyTrend = db
    .prepare(
      "SELECT strftime('%Y-%m', dream_date) as month, COUNT(*) as count, AVG(sleep_quality) as avg_sleep FROM dreams GROUP BY month ORDER BY month DESC LIMIT 12"
    )
    .all();

  const emotionTimeline = db
    .prepare(
      `SELECT d.dream_date, a.emotion FROM dreams d JOIN analyses a ON a.dream_id = d.id ORDER BY d.dream_date ASC`
    )
    .all()
    .map((r) => ({ date: r.dream_date, emotion: JSON.parse(r.emotion || '{}') }));

  res.json({
    success: true,
    data: {
      totalDreams,
      analyzedDreams,
      emotionTotals,
      themeCounts,
      monthlyTrend,
      emotionTimeline
    }
  });
});

router.get('/analysis/recurring', (req, res) => {
  const themeRows = db.prepare("SELECT themes FROM analyses").all();
  const themeCounts = {};
  for (const row of themeRows) {
    for (const t of JSON.parse(row.themes || '[]')) {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    }
  }

  const symbolRows = db.prepare("SELECT symbols FROM analyses").all();
  const symbolCounts = {};
  for (const row of symbolRows) {
    for (const s of JSON.parse(row.symbols || '[]')) {
      const key = `${s.symbol}|${s.meaning}`;
      symbolCounts[key] = (symbolCounts[key] || { symbol: s.symbol, meaning: s.meaning, count: 0 });
      symbolCounts[key].count++;
    }
  }

  const recurringThemes = Object.entries(themeCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => ({ theme, count }));

  const recurringSymbols = Object.values(symbolCounts)
    .filter((s) => s.count > 1)
    .sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: { recurringThemes, recurringSymbols }
  });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/analysis.js && git commit -m "feat: add analysis API routes with overview and recurring patterns"
```

---

## Task 7: Video Service & Routes

**Files:**
- Create: `server/services/video.js`
- Create: `server/routes/video.js`

- [ ] **Step 1: Create video service**

```js
import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = join(__dirname, '..', '..', 'data', 'videos');

mkdirSync(VIDEO_DIR, { recursive: true });

export async function generateVideo(dreamId) {
  const analysis = db.prepare(
    'SELECT video_prompt, storyboard FROM analyses WHERE dream_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(dreamId);

  if (!analysis?.video_prompt) {
    return { configured: false, video_prompt: analysis?.video_prompt || '', storyboard: analysis?.storyboard || '[]' };
  }

  const apiUrl = db.prepare('SELECT value FROM settings WHERE key = ?').get('video_api_url')?.value;
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('video_api_key')?.value;

  if (!apiUrl || !apiKey) {
    return { configured: false, video_prompt: analysis.video_prompt, storyboard: analysis.storyboard };
  }

  const videoRow = db.prepare(
    'INSERT INTO videos (dream_id, api_provider, status) VALUES (?, ?, ?) RETURNING id'
  ).get(dreamId, 'configured_api', 'processing');

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ prompt: analysis.video_prompt })
    });

    const data = await resp.json();

    if (data.video_url) {
      const filename = `dream_${dreamId}_${Date.now()}.mp4`;
      const filepath = join(VIDEO_DIR, filename);
      await downloadFile(data.video_url, filepath);
      db.prepare('UPDATE videos SET status = ?, original_path = ? WHERE id = ?').run('completed', filepath, videoRow.id);
      db.prepare('UPDATE dreams SET is_video_generated = 1 WHERE id = ?').run(dreamId);
      return { configured: true, status: 'completed', path: filepath };
    } else if (data.task_id) {
      db.prepare('UPDATE videos SET task_id = ? WHERE id = ?').run(data.task_id, videoRow.id);
      return { configured: true, status: 'processing', task_id: data.task_id };
    } else {
      db.prepare('UPDATE videos SET status = ? WHERE id = ?').run('failed', videoRow.id);
      return { configured: true, status: 'failed', error: 'Unexpected API response' };
    }
  } catch (e) {
    db.prepare('UPDATE videos SET status = ? WHERE id = ?').run('failed', videoRow.id);
    return { configured: true, status: 'failed', error: e.message };
  }
}

export async function checkVideoStatus(videoId) {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
  if (!video) throw new Error('Video not found');
  if (video.status !== 'processing' || !video.task_id) return video;

  const apiUrl = db.prepare('SELECT value FROM settings WHERE key = ?').get('video_api_url')?.value;
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('video_api_key')?.value;

  try {
    const resp = await fetch(`${apiUrl}/status/${video.task_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await resp.json();

    if (data.status === 'completed' && data.video_url) {
      const filename = `dream_${video.dream_id}_${Date.now()}.mp4`;
      const filepath = join(VIDEO_DIR, filename);
      await downloadFile(data.video_url, filepath);
      db.prepare('UPDATE videos SET status = ?, original_path = ? WHERE id = ?').run('completed', filepath, videoId);
      db.prepare('UPDATE dreams SET is_video_generated = 1 WHERE id = ?').run(video.dream_id);
      return { ...video, status: 'completed', original_path: filepath };
    } else if (data.status === 'failed') {
      db.prepare('UPDATE videos SET status = ? WHERE id = ?').run('failed', videoId);
      return { ...video, status: 'failed' };
    }
    return video;
  } catch (e) {
    return video;
  }
}

async function downloadFile(url, filepath) {
  const resp = await fetch(url);
  const fileStream = createWriteStream(filepath);
  return new Promise((resolve, reject) => {
    resp.body.pipe(fileStream);
    resp.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}
```

- [ ] **Step 2: Create video routes**

```js
import { Router } from 'express';
import db from '../db.js';
import { generateVideo, checkVideoStatus } from '../services/video.js';

const router = Router();

router.post('/dreams/:id/video', async (req, res) => {
  try {
    const result = await generateVideo(req.params.id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/videos/:id/status', async (req, res) => {
  try {
    const result = await checkVideoStatus(req.params.id);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add server/services/video.js server/routes/video.js && git commit -m "feat: add video generation service and routes"
```

---

## Task 8: Server Entry Point

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Create Express server entry**

```js
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import './db.js';
import dreamsRouter from './routes/dreams.js';
import analysisRouter from './routes/analysis.js';
import videoRouter from './routes/video.js';
import settingsRouter from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/dreams', dreamsRouter);
app.use('/api', analysisRouter);
app.use('/api', videoRouter);
app.use('/api/settings', settingsRouter);

const clientDist = join(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`DreamVault server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Test server starts**

```bash
cd dream-vault && node server/index.js
```

Expected: "DreamVault server running on http://localhost:3001"

- [ ] **Step 3: Test API endpoints**

```bash
curl http://localhost:3001/api/dreams
curl http://localhost:3001/api/settings
```

Expected: JSON responses with `{ success: true, ... }`

- [ ] **Step 4: Commit**

```bash
git add server/index.js && git commit -m "feat: add Express server entry point"
```

---

## Task 9: Frontend Core (React entry, router, API client)

**Files:**
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/api.js`
- Create: `client/src/index.css` (already done in Task 1)

- [ ] **Step 1: Create client/src/main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

- [ ] **Step 2: Create client/src/api.js**

```js
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
  }
};
```

- [ ] **Step 3: Create client/src/App.jsx**

```jsx
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Moon, BarChart3, Settings, PlusCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import DreamEditor from './pages/DreamEditor';
import DreamDetail from './pages/DreamDetail';
import Analysis from './pages/Analysis';
import SettingsPage from './pages/Settings';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-purple-400">
            <Moon className="w-5 h-5" /> DreamVault
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dream/new" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
              <PlusCircle className="w-4 h-4" /> 记录梦境
            </Link>
            <Link to="/analysis" className={`text-sm ${location.pathname === '/analysis' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
              <BarChart3 className="w-4 h-4" />
            </Link>
            <Link to="/settings" className={`text-sm ${location.pathname === '/settings' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dream/new" element={<DreamEditor />} />
          <Route path="/dream/:id" element={<DreamDetail />} />
          <Route path="/dream/:id/edit" element={<DreamEditor />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/main.jsx client/src/App.jsx client/src/api.js && git commit -m "feat: add React entry, router, and API client"
```

---

## Task 10: Dashboard Page

**Files:**
- Create: `client/src/pages/Dashboard.jsx`

- [ ] **Step 1: Create Dashboard page**

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, Tag, Moon, TrendingUp } from 'lucide-react';
import { api } from '../api';

export default function Dashboard() {
  const [dreams, setDreams] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadDreams();
    loadStats();
  }, [page, search]);

  async function loadDreams() {
    const params = { page, limit: 20 };
    if (search) params.q = search;
    const res = await api.dreams.list(params);
    setDreams(res.data.items);
    setTotal(res.data.total);
  }

  async function loadStats() {
    try {
      const res = await api.analysis.overview();
      setStats(res.data);
    } catch { /* no analysis yet */ }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Moon className="w-5 h-5" />} label="总梦境数" value={stats?.totalDreams ?? total} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="已分析" value={stats?.analyzedDreams ?? 0} />
        <StatCard icon={<Calendar className="w-5 h-5" />} label="本月新增" value={
          stats?.monthlyTrend?.[0]?.count ?? '-'
        } />
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索梦境..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {dreams.map((d) => (
          <Link
            key={d.id}
            to={`/dream/${d.id}`}
            className="block p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-purple-500/50 transition"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-white">{d.title}</h3>
              <span className="text-xs text-slate-500">{d.dream_date}</span>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{d.content}</p>
            {d.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {d.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
        {dreams.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Moon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>还没有梦境记录</p>
            <Link to="/dream/new" className="text-purple-400 hover:underline text-sm">开始记录第一个梦</Link>
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

function StatCard({ icon, label, value }) {
  return (
    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Dashboard.jsx && git commit -m "feat: add Dashboard page with stats and dream list"
```

---

## Task 11: DreamEditor Page

**Files:**
- Create: `client/src/pages/DreamEditor.jsx`
- Create: `client/src/components/StarRating.jsx`
- Create: `client/src/components/TagInput.jsx`

- [ ] **Step 1: Create StarRating component**

```jsx
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={`w-5 h-5 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
          />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create TagInput component**

```jsx
import { useState } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('');

  function handleKeyDown(e) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()]);
      }
      setInput('');
    }
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 text-sm bg-purple-500/20 text-purple-300 rounded">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-purple-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入标签后按回车"
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}
```

- [ ] **Step 3: Create DreamEditor page**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { api } from '../api';
import StarRating from '../components/StarRating';
import TagInput from '../components/TagInput';

const MOODS = ['平静', '开心', '焦虑', '疲惫', '兴奋', '紧张', '放松', '烦躁'];

export default function DreamEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    content: '',
    dream_date: new Date().toISOString().split('T')[0],
    mood_before: '',
    sleep_quality: 0,
    tags: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.dreams.get(id).then((res) => {
        const d = res.data;
        setForm({
          title: d.title,
          content: d.content,
          dream_date: d.dream_date,
          mood_before: d.mood_before || '',
          sleep_quality: d.sleep_quality || 0,
          tags: d.tags || []
        });
      });
    }
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.dreams.update(id, form);
        navigate(`/dream/${id}`);
      } else {
        const res = await api.dreams.create(form);
        navigate(`/dream/${res.data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">{isEdit ? '编辑梦境' : '记录新梦境'}</h1>

      <div>
        <label className="block text-sm text-slate-400 mb-1">标题</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          required
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">梦境日期</label>
        <input
          type="date"
          value={form.dream_date}
          onChange={(e) => update('dream_date', e.target.value)}
          required
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">梦境内容</label>
        <textarea
          value={form.content}
          onChange={(e) => update('content', e.target.value)}
          required
          rows={8}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 resize-y"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">入睡前情绪</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update('mood_before', m)}
              className={`px-3 py-1 text-sm rounded-full border ${
                form.mood_before === m
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">睡眠质量</label>
        <StarRating value={form.sleep_quality} onChange={(v) => update('sleep_quality', v)} />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">标签</label>
        <TagInput tags={form.tags} onChange={(tags) => update('tags', tags)} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/DreamEditor.jsx client/src/components/StarRating.jsx client/src/components/TagInput.jsx && git commit -m "feat: add DreamEditor page with star rating and tag input"
```

---

## Task 12: DreamDetail Page

**Files:**
- Create: `client/src/pages/DreamDetail.jsx`
- Create: `client/src/components/EmotionChart.jsx`
- Create: `client/src/components/StoryboardCard.jsx`
- Create: `client/src/components/VideoPlayer.jsx`

- [ ] **Step 1: Create EmotionChart component**

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#a78bfa', '#818cf8', '#6366f1', '#8b5cf6', '#7c3aed', '#6d28d9'];

export default function EmotionChart({ emotion = {} }) {
  const data = Object.entries(emotion)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return <p className="text-slate-500 text-sm">无情绪数据</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={50} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create StoryboardCard component**

```jsx
import { Film } from 'lucide-react';

export default function StoryboardCard({ storyboard = [] }) {
  if (storyboard.length === 0) return null;

  return (
    <div className="space-y-3">
      {storyboard.map((scene, i) => (
        <div key={i} className="flex gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex-shrink-0 w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-mono">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-300 mb-1">{scene.scene}</div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Film className="w-3 h-3" /> {scene.camera}</span>
              <span>{scene.duration}s</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create VideoPlayer component**

```jsx
export default function VideoPlayer({ src }) {
  if (!src) return null;
  return (
    <video
      controls
      className="w-full rounded-lg border border-slate-700"
      src={src}
    >
      您的浏览器不支持视频播放
    </video>
  );
}
```

- [ ] **Step 4: Create DreamDetail page**

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit, Trash2, Brain, Video, FileText, Loader2 } from 'lucide-react';
import { api } from '../api';
import EmotionChart from '../components/EmotionChart';
import StoryboardCard from '../components/StoryboardCard';
import VideoPlayer from '../components/VideoPlayer';

export default function DreamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadDream(); }, [id]);

  async function loadDream() {
    setLoading(true);
    try {
      const res = await api.dreams.get(id);
      setDream(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await api.analysis.trigger(id);
      await loadDream();
    } catch (e) {
      alert('分析失败: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerateVideo() {
    setGenerating(true);
    try {
      const res = await api.video.generate(id);
      if (res.data.configured === false) {
        alert('视频 API 未配置，以下是制作信息:\n\n' + (res.data.video_prompt || '无'));
      }
      await loadDream();
    } catch (e) {
      alert('生成失败: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!confirm('确定删除这个梦境？')) return;
    await api.dreams.delete(id);
    navigate('/');
  }

  if (loading) return <div className="text-center py-12 text-slate-500">加载中...</div>;
  if (!dream) return <div className="text-center py-12 text-slate-500">梦境不存在</div>;

  const analysis = dream.analysis;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{dream.title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{dream.dream_date}</span>
            {dream.mood_before && <span>入睡前: {dream.mood_before}</span>}
            {dream.sleep_quality > 0 && <span>睡眠: {'★'.repeat(dream.sleep_quality)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/dream/${id}/edit`} className="p-2 text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></Link>
          <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {dream.tags?.length > 0 && (
        <div className="flex gap-1">
          {dream.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">{t}</span>
          ))}
        </div>
      )}

      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
        <p className="text-slate-300 whitespace-pre-wrap">{dream.content}</p>
      </div>

      {analysis ? (
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Brain className="w-5 h-5 text-purple-400" /> AI 分析
          </h2>

          {analysis.summary && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-sm text-purple-200">{analysis.summary}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">情绪分析</h3>
            <EmotionChart emotion={analysis.emotion} />
          </div>

          {analysis.themes?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">主题</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((t) => (
                  <span key={t} className="px-3 py-1 text-sm bg-indigo-500/20 text-indigo-300 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          {analysis.symbols?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">象征解读</h3>
              <div className="grid gap-2">
                {analysis.symbols.map((s, i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <span className="font-medium text-white">{s.symbol}</span>
                    <span className="text-slate-400"> — {s.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.storyboard?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">分镜</h3>
              <StoryboardCard storyboard={analysis.storyboard} />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          {analyzing ? '分析中...' : 'AI 分析'}
        </button>
      )}

      {analysis && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Video className="w-5 h-5 text-purple-400" /> 视频
          </h2>

          {dream.video?.status === 'completed' ? (
            <VideoPlayer src={`/api/videos/file/${dream.video.original_path}`} />
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleGenerateVideo}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {generating ? '生成中...' : '生成视频'}
              </button>

              {analysis.video_prompt && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h4 className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <FileText className="w-3 h-3" /> 视频 Prompt（可复制到其他平台使用）
                  </h4>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{analysis.video_prompt}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/DreamDetail.jsx client/src/components/EmotionChart.jsx client/src/components/StoryboardCard.jsx client/src/components/VideoPlayer.jsx && git commit -m "feat: add DreamDetail page with analysis display and video player"
```

---

## Task 13: Analysis Page

**Files:**
- Create: `client/src/pages/Analysis.jsx`

- [ ] **Step 1: Create Analysis page**

```jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Repeat, Tag } from 'lucide-react';
import { api } from '../api';

export default function Analysis() {
  const [overview, setOverview] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analysis.overview().catch(() => ({ data: null })),
      api.analysis.recurring().catch(() => ({ data: null }))
    ]).then(([o, r]) => {
      setOverview(o.data);
      setRecurring(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500">加载中...</div>;
  if (!overview) return <div className="text-center py-12 text-slate-500">暂无分析数据，请先记录并分析梦境</div>;

  const emotionData = Object.entries(overview.emotionTotals || {})
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const themeData = Object.entries(overview.themeCounts || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const trendData = (overview.emotionTimeline || []).map((t) => {
    const topEmotion = Object.entries(t.emotion).sort((a, b) => b[1] - a[1])[0];
    return { date: t.date, intensity: topEmotion ? Math.round(topEmotion[1] * 100) : 0, emotion: topEmotion?.[0] || '' };
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">分析面板</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-sm text-slate-400 mb-1">总梦境</div>
          <div className="text-2xl font-bold">{overview.totalDreams}</div>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-sm text-slate-400 mb-1">已分析</div>
          <div className="text-2xl font-bold">{overview.analyzedDreams}</div>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-sm text-slate-400 mb-1">分析率</div>
          <div className="text-2xl font-bold">
            {overview.totalDreams > 0 ? Math.round(overview.analyzedDreams / overview.totalDreams * 100) : 0}%
          </div>
        </div>
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-medium mb-4">
          <TrendingUp className="w-5 h-5 text-purple-400" /> 情绪趋势
        </h2>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="intensity" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm">暂无趋势数据</p>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-medium mb-4">
          <Tag className="w-5 h-5 text-purple-400" /> 情绪分布
        </h2>
        {emotionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emotionData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm">暂无情绪数据</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">高频主题</h2>
        {themeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={themeData} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm">暂无主题数据</p>
        )}
      </section>

      {recurring && (recurring.recurringThemes?.length > 0 || recurring.recurringSymbols?.length > 0) && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-medium mb-4">
            <Repeat className="w-5 h-5 text-purple-400" /> 反复出现的模式
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recurring.recurringThemes?.length > 0 && (
              <div>
                <h3 className="text-sm text-slate-400 mb-2">反复主题</h3>
                <div className="space-y-2">
                  {recurring.recurringThemes.map((t) => (
                    <div key={t.theme} className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
                      <span className="text-sm">{t.theme}</span>
                      <span className="text-xs text-purple-400">{t.count} 次</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recurring.recurringSymbols?.length > 0 && (
              <div>
                <h3 className="text-sm text-slate-400 mb-2">反复象征</h3>
                <div className="space-y-2">
                  {recurring.recurringSymbols.map((s) => (
                    <div key={s.symbol} className="p-2 bg-slate-800/50 rounded border border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.symbol}</span>
                        <span className="text-xs text-purple-400">{s.count} 次</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.meaning}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Analysis.jsx && git commit -m "feat: add Analysis page with emotion trends and recurring patterns"
```

---

## Task 14: Settings Page

**Files:**
- Create: `client/src/pages/Settings.jsx`

- [ ] **Step 1: Create Settings page**

```jsx
import { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    api.settings.get().then((res) => {
      setSettings(res.data);
      setLoading(false);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.update(settings);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(type) {
    setTestResults((prev) => ({ ...prev, [type]: { loading: true } }));
    try {
      const res = await api.settings.test(type);
      setTestResults((prev) => ({ ...prev, [type]: { success: res.success, error: res.error } }));
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [type]: { success: false, error: e.message } }));
    }
  }

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <div className="text-center py-12 text-slate-500">加载中...</div>;

  return (
    <form onSubmit={handleSave} className="max-w-xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">设置</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">AI 配置</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API 地址</label>
          <input
            type="text"
            value={settings.ai_api_url || ''}
            onChange={(e) => update('ai_api_url', e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API Key</label>
          <input
            type="password"
            value={settings.ai_api_key || ''}
            onChange={(e) => update('ai_api_key', e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">模型名称</label>
          <input
            type="text"
            value={settings.ai_model || ''}
            onChange={(e) => update('ai_model', e.target.value)}
            placeholder="gpt-4o"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="button"
          onClick={() => handleTest('ai')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg"
        >
          {testResults.ai?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
           testResults.ai?.success ? <CheckCircle className="w-4 h-4 text-green-400" /> :
           testResults.ai?.success === false ? <XCircle className="w-4 h-4 text-red-400" /> : null}
          测试 AI 连接
        </button>
        {testResults.ai?.error && <p className="text-xs text-red-400">{testResults.ai.error}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">视频 API 配置</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API 地址</label>
          <input
            type="text"
            value={settings.video_api_url || ''}
            onChange={(e) => update('video_api_url', e.target.value)}
            placeholder="https://your-video-api.com/generate"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API Key</label>
          <input
            type="password"
            value={settings.video_api_key || ''}
            onChange={(e) => update('video_api_key', e.target.value)}
            placeholder="..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="button"
          onClick={() => handleTest('video')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg"
        >
          {testResults.video?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
           testResults.video?.success ? <CheckCircle className="w-4 h-4 text-green-400" /> :
           testResults.video?.success === false ? <XCircle className="w-4 h-4 text-red-400" /> : null}
          测试视频连接
        </button>
        {testResults.video?.error && <p className="text-xs text-red-400">{testResults.video.error}</p>}
      </section>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? '保存中...' : '保存设置'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Settings.jsx && git commit -m "feat: add Settings page with API config and connectivity test"
```

---

## Task 15: Video File Serving & Final Integration

**Files:**
- Modify: `server/index.js` (add video file serving route)

- [ ] **Step 1: Add video file serving to server/index.js**

Add after the existing API routes and before the client static serving:

```js
import { createReadStream } from 'fs';

// Video file serving
app.get('/api/videos/file/*', (req, res) => {
  const filepath = req.params[0];
  if (!filepath) return res.status(400).json({ success: false, error: 'No file path' });
  res.setHeader('Content-Type', 'video/mp4');
  createReadStream(filepath).pipe(res);
});
```

- [ ] **Step 2: Build frontend and test full app**

```bash
cd dream-vault && npm run build && npm start
```

Open http://localhost:3001 in browser. Verify:
1. Dashboard loads (empty state)
2. Create a dream via "记录梦境"
3. Dream detail page shows the created dream
4. Click "AI 分析" (will fail without API key, but button works)
5. Settings page loads and saves

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "feat: complete DreamVault application"
```

---

## Task 16: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# DreamVault

梦境收集 + 管理 + 分析 + 视频生成系统

## 快速开始

```bash
# 安装依赖
npm run install:all

# 开发模式
npm run dev

# 生产构建
npm run build && npm start
```

访问 http://localhost:3001

## 功能

- **梦境记录**: 文本录入，支持情绪、睡眠质量、标签
- **AI 分析**: 情绪分析、主题提取、象征解读、视频 prompt 生成
- **视频生成**: 可配置 API，未配置时输出制作信息
- **数据分析**: 情绪趋势、高频主题、反复模式

## 配置

进入设置页面（右上角齿轮图标），配置：
- AI API 地址、Key、模型名称（支持 OpenAI 格式 API）
- 视频生成 API 地址、Key（可选）
```

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: add README"
```

---

## Self-Review

### 1. Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Project scaffolding (Express + React + Vite + Tailwind) | Task 1 |
| SQLite database with 4 tables | Task 2 |
| Settings CRUD + connectivity test | Task 3 |
| Dreams CRUD with pagination/search/filter | Task 4 |
| AI analysis service with structured prompt | Task 5 |
| Analysis API (trigger/overview/recurring) | Task 6 |
| Video generation service (sync/async/fallback) | Task 7 |
| Server entry point with static file serving | Task 8 |
| Frontend core (React entry/router/API client) | Task 9 |
| Dashboard page with stats | Task 10 |
| DreamEditor page with form | Task 11 |
| DreamDetail page with analysis/video display | Task 12 |
| Analysis page with charts | Task 13 |
| Settings page with API config | Task 14 |
| Video file serving | Task 15 |
| README | Task 16 |

**Result:** All spec requirements covered.

### 2. Placeholder Scan

- No "TBD", "TODO", or "implement later" found
- All code blocks contain complete implementations
- No vague instructions like "add error handling"

### 3. Type Consistency

- `dream_id` used consistently across analyses and videos tables
- API response format `{ success, data }` consistent across all routes
- Settings keys (`ai_api_url`, `ai_api_key`, `ai_model`, `video_api_url`, `video_api_key`) consistent between DB, routes, and frontend
- JSON field names (`emotion`, `themes`, `symbols`, `storyboard`) consistent between service layer and frontend parsing

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-29-dream-vault.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints
