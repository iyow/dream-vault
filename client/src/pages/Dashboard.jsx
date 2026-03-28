import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, Moon, TrendingUp } from 'lucide-react';
import { api } from '../api';

export default function Dashboard() {
  const [dreams, setDreams] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadDreams();
    loadStats();
  }, [page, search]);

  async function loadDreams() {
    const params = { page, limit: 20 };
    if (search) params.q = search;
    const res = await api.dreams.list(params);
    setDreams(res.data.items);
    setTotal(res.data.total);
  }

  async function loadStats() {
    try {
      const res = await api.analysis.overview();
      setStats(res.data);
    } catch { /* no analysis yet */ }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Moon className="w-5 h-5" />} label="总梦境数" value={stats?.totalDreams ?? total} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="已分析" value={stats?.analyzedDreams ?? 0} />
        <StatCard icon={<Calendar className="w-5 h-5" />} label="本月新增" value={
          stats?.monthlyTrend?.[0]?.count ?? '-'
        } />
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索梦境..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {dreams.map((d) => (
          <Link
            key={d.id}
            to={`/dream/${d.id}`}
            className="block p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-purple-500/50 transition"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-white">{d.title}</h3>
              <span className="text-xs text-slate-500">{d.dream_date}</span>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{d.content}</p>
            {d.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {d.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
        {dreams.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Moon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>还没有梦境记录</p>
            <Link to="/dream/new" className="text-purple-400 hover:underline text-sm">开始记录第一个梦</Link>
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

function StatCard({ icon, label, value }) {
  return (
    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
