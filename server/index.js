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
