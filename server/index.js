import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, createReadStream } from 'fs';
import './db.js';
import dreamsRouter from './routes/dreams.js';
import analysisRouter from './routes/analysis.js';
import videoRouter from './routes/video.js';
import settingsRouter from './routes/settings.js';
import reverseRouter from './routes/reverse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/dreams', dreamsRouter);
app.use('/api', analysisRouter);
app.use('/api', videoRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', reverseRouter);

// Video file serving
app.get('/api/videos/file/*', (req, res) => {
  const filepath = req.params[0];
  if (!filepath) return res.status(400).json({ success: false, error: 'No file path' });
  res.setHeader('Content-Type', 'video/mp4');
  createReadStream(filepath).pipe(res);
});

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
