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
