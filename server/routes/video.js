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
