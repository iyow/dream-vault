import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, Eye, Link2, Scroll } from 'lucide-react';
import { api } from '../api';

const TYPE_MAP = {
  rewrite: { label: '改写', icon: Wand2, color: 'text-purple-400' },
  perspective: { label: '换位', icon: Eye, color: 'text-indigo-400' },
  chain: { label: '编织', icon: Link2, color: 'text-cyan-400' }
};

export default function ReverseGallery() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadItems();
  }, [typeFilter, page]);

  async function loadItems() {
    const params = { page, limit: 20 };
    if (typeFilter) params.type = typeFilter;
    const res = await api.reverse.list(params);
    setItems(res.data.items);
    setTotal(res.data.total);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Scroll className="w-5 h-5 text-purple-400" /> 逆梦画廊
        </h1>
      </div>

      <div className="flex gap-2 mb-6">
          {[
            { key: '', label: '全部' },
            { key: 'rewrite', label: '改写' },
            { key: 'perspective', label: '换位' },
            { key: 'chain', label: '编织' }
          ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTypeFilter(t.key); setPage(1); }}
            className={`px-3 py-1 text-sm rounded-full border ${
              typeFilter === t.key
                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const typeInfo = TYPE_MAP[item.type] || {};
          const Icon = typeInfo.icon || Scroll;
          return (
            <Link
              key={item.id}
              to={`/reverse/${item.id}`}
              className="block p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-purple-500/50 transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`flex items-center gap-1 text-xs font-medium ${typeInfo.color}`}>
                  <Icon className="w-3 h-3" /> {typeInfo.label}
                </span>
                <span className="text-xs text-slate-600">{item.created_at}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                {item.source_dreams?.map((d) => (
                  <span key={d.id} className="text-sm text-slate-400">{d.title}</span>
                ))}
                {item.what_if && <span className="text-xs text-amber-400">— {item.what_if}</span>}
                {item.perspective && <span className="text-xs text-indigo-400">— {item.perspective}</span>}
              </div>
              <p className="text-sm text-slate-400 line-clamp-2">{item.editable_content}</p>
            </Link>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Scroll className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>逆梦尚未开始</p>
            <p className="text-sm">在梦境详情页点击"逆梦"施展</p>
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 text-sm rounded ${page === i + 1 ? 'bg-purple-600' : 'bg-slate-800 text-slate-400'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
