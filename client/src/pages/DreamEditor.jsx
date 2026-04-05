import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { api } from '../api';
import StarRating from '../components/StarRating';
import TagInput from '../components/TagInput';

const MOODS = ['平静', '开心', '焦虑', '疲惫', '兴奋', '紧张', '放松', '烦躁'];

export default function DreamEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '',
    content: '',
    dream_date: new Date().toISOString().split('T')[0],
    mood_before: '',
    sleep_quality: 0,
    tags: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.dreams.get(id).then((res) => {
        const d = res.data;
        setForm({
          title: d.title,
          content: d.content,
          dream_date: d.dream_date,
          mood_before: d.mood_before || '',
          sleep_quality: d.sleep_quality || 0,
          tags: d.tags || []
        });
      });
    }
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.dreams.update(id, form);
        navigate(`/dream/${id}`);
      } else {
        const res = await api.dreams.create(form);
        navigate(`/dream/${res.data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">{isEdit ? '修订梦境' : '记录新梦'}</h1>

      <div>
        <label className="block text-sm text-slate-400 mb-1">标题</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          required
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">梦境日期</label>
        <input
          type="date"
          value={form.dream_date}
          onChange={(e) => update('dream_date', e.target.value)}
          required
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">梦境内容</label>
        <textarea
          value={form.content}
          onChange={(e) => update('content', e.target.value)}
          required
          rows={8}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 resize-y"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">入梦前心情</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update('mood_before', m)}
              className={`px-3 py-1 text-sm rounded-full border ${
                form.mood_before === m
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">安眠程度</label>
        <StarRating value={form.sleep_quality} onChange={(v) => update('sleep_quality', v)} />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">标签</label>
        <TagInput tags={form.tags} onChange={(tags) => update('tags', tags)} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? '封存中...' : '封存梦境'}
      </button>
    </form>
  );
}
