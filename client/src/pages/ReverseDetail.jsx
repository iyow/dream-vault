import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Wand2, Eye, Link2 } from 'lucide-react';
import { api } from '../api';

const TYPE_MAP = {
  rewrite: { label: '改写梦境', icon: Wand2, color: 'text-purple-400' },
  perspective: { label: '视角切换', icon: Eye, color: 'text-indigo-400' },
  chain: { label: '梦境串联', icon: Link2, color: 'text-cyan-400' }
};

export default function ReverseDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reverse.get(id).then((res) => {
      setItem(res.data);
      setContent(res.data.editable_content || res.data.generated_content);
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.reverse.update(id, { editable_content: content });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-slate-500">加载中...</div>;
  if (!item) return <div className="text-center py-12 text-slate-500">不存在</div>;

  const typeInfo = TYPE_MAP[item.type] || {};
  const Icon = typeInfo.icon || Wand2;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/reverse" className="flex items-center gap-1 text-sm text-slate-500 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回画廊
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <span className={`flex items-center gap-1 text-sm font-medium ${typeInfo.color}`}>
          <Icon className="w-4 h-4" /> {typeInfo.label}
        </span>
        <span className="text-xs text-slate-600">{item.created_at}</span>
        {item.what_if && <span className="text-xs text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded">{item.what_if}</span>}
        {item.perspective && <span className="text-xs text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded">{item.perspective}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">源梦境</h3>
          <div className="space-y-4">
            {item.source_dreams?.map((d) => (
              <div key={d.id} className="p-4 bg-slate-900/30 border border-slate-800 rounded-lg">
                <Link to={`/dream/${d.id}`} className="font-medium text-white hover:text-purple-400">{d.title}</Link>
                <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{d.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">逆梦内容</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-y"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}