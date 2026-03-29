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
