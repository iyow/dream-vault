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

async function callAI(systemPrompt, userPrompt) {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8
  });
  const raw = response.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse AI response');
  }
}

export async function generateSuggestions(dreamId) {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(dreamId);
  if (!dream) throw new Error('Dream not found');

  return callAI(
    '你是梦境分析师。用户给你一段梦境描述，请给出 3 个"如果当时…"的假设性改写方向。每个方向简短描述（20字以内），并说明可能产生的变化。只返回 JSON: { "suggestions": ["如果...", "如果...", "如果..."] }',
    `标题：${dream.title}\n内容：${dream.content}`
  );
}

export async function rewriteDream(dreamId, whatIf) {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(dreamId);
  if (!dream) throw new Error('Dream not found');

  const result = await callAI(
    '你是梦境叙事作家。用户给你一段梦境和一个"如果当时…"的假设，请基于这个假设改写梦境，保持梦境的奇幻感和叙事张力（300-500字）。只返回 JSON: { "content": "改写后的梦境", "diff": "与原文的关键差异说明" }',
    `原始梦境：\n标题：${dream.title}\n内容：${dream.content}\n\n假设：${whatIf}`
  );

  const row = db.prepare(
    'INSERT INTO reverse_dreams (type, source_dream_ids, what_if, generated_content, editable_content, metadata) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
  ).get('rewrite', JSON.stringify([dreamId]), whatIf, result.content, result.content, JSON.stringify({ diff: result.diff }));

  return { id: row.id, ...result };
}

export async function switchPerspective(dreamId, perspective) {
  const dream = db.prepare('SELECT * FROM dreams WHERE id = ?').get(dreamId);
  if (!dream) throw new Error('Dream not found');

  const result = await callAI(
    '你是梦境叙事作家。用户给你一段梦境和一个新的视角，请从该视角重新叙述这个梦境（第一人称，300-500字），并给出新视角下的情绪和主题分析。只返回 JSON: { "content": "新视角叙事", "analysis": { "emotion": {}, "themes": [] } }',
    `原始梦境：\n标题：${dream.title}\n内容：${dream.content}\n\n新视角：${perspective}`
  );

  const row = db.prepare(
    'INSERT INTO reverse_dreams (type, source_dream_ids, perspective, generated_content, editable_content, metadata) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
  ).get('perspective', JSON.stringify([dreamId]), perspective, result.content, result.content, JSON.stringify({ analysis: result.analysis }));

  return { id: row.id, ...result };
}

export async function chainDreams(dreamIds) {
  const dreams = dreamIds.map((id) => {
    const d = db.prepare('SELECT id, title, content FROM dreams WHERE id = ?').get(id);
    if (!d) throw new Error(`Dream ${id} not found`);
    return d;
  });

  const dreamTexts = dreams.map((d) => `梦境${d.id}【${d.title}】：${d.content}`).join('\n\n');

  const result = await callAI(
    '你是梦境叙事作家。用户给你多条独立梦境，请将它们编织成一个连贯的连续故事（500-800字）。保持每条梦境的核心元素，添加自然的过渡。只返回 JSON: { "content": "完整故事", "segments": [{"dream_id": 1, "portion": "对应段落"}] }',
    dreamTexts
  );

  const row = db.prepare(
    'INSERT INTO reverse_dreams (type, source_dream_ids, generated_content, editable_content, metadata) VALUES (?, ?, ?, ?, ?) RETURNING id'
  ).get('chain', JSON.stringify(dreamIds), result.content, result.content, JSON.stringify({ segments: result.segments }));

  return { id: row.id, ...result };
}

export async function discoverConnections() {
  const dreams = db.prepare('SELECT id, title, content, tags FROM dreams WHERE is_analyzed = 1').all();
  if (dreams.length < 2) return { groups: [] };

  const dreamSummaries = dreams.map((d) => `ID:${d.id} 标题:${d.title} 标签:${d.tags} 内容摘要:${d.content.slice(0, 100)}`).join('\n');

  const result = await callAI(
    '你是梦境关联分析师。用户给你多条梦境的摘要，请找出其中主题、符号、人物有关联的梦境组（至少2条一组）。只返回 JSON: { "groups": [{"dream_ids": [1,3], "reason": "关联原因"}] }。如果没有关联，返回空数组。',
    dreamSummaries
  );

  return result;
}
