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
