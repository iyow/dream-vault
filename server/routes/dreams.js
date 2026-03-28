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
