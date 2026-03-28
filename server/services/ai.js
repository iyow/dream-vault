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
