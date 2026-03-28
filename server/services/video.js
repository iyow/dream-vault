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
