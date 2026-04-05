import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Repeat, Tag } from 'lucide-react';
import { api } from '../api';

export default function Analysis() {
  const [overview, setOverview] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analysis.overview().catch(() => ({ data: null })),
      api.analysis.recurring().catch(() => ({ data: null }))
    ]).then(([o, r]) => {
      setOverview(o.data);
      setRecurring(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500">解读中...</div>;
  if (!overview) return <div className="text-center py-12 text-slate-500">梦境尚未解读，请先记录并解读一些梦境</div>;

  const emotionData = Object.entries(overview.emotionTotals || {})
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const themeData = Object.entries(overview.themeCounts || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const trendData = (overview.emotionTimeline || []).map((t) => {
    const topEmotion = Object.entries(t.emotion).sort((a, b) => b[1] - a[1])[0];
    return { date: t.date, intensity: topEmotion ? Math.round(topEmotion[1] * 100) : 0, emotion: topEmotion?.[0] || '' };
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">梦境星图</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-sm text-slate-400 mb-1">梦境总数</div>
          <div className="text-2xl font-bold">{overview.totalDreams}</div>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-sm text-slate-400 mb-1">已解读</div>
          <div className="text-2xl font-bold">{overview.analyzedDreams}</div>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-sm text-slate-400 mb-1">解读率</div>
          <div className="text-2xl font-bold">
            {overview.totalDreams > 0 ? Math.round(overview.analyzedDreams / overview.totalDreams * 100) : 0}%
          </div>
        </div>
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-medium mb-4">
          <TrendingUp className="w-5 h-5 text-purple-400" /> 情绪波动
        </h2>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="intensity" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm">情绪尚未浮现</p>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-medium mb-4">
          <Tag className="w-5 h-5 text-purple-400" /> 情绪光谱
        </h2>
        {emotionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emotionData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm">情绪光谱尚在沉睡</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">反复主题</h2>
        {themeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={themeData} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm">主题尚未显现</p>
        )}
      </section>

      {recurring && (recurring.recurringThemes?.length > 0 || recurring.recurringSymbols?.length > 0) && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-medium mb-4">
            <Repeat className="w-5 h-5 text-purple-400" /> 梦中回响
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recurring.recurringThemes?.length > 0 && (
              <div>
                <h3 className="text-sm text-slate-400 mb-2">回响主题</h3>
                <div className="space-y-2">
                  {recurring.recurringThemes.map((t) => (
                    <div key={t.theme} className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
                      <span className="text-sm">{t.theme}</span>
                      <span className="text-xs text-purple-400">出现 {t.count} 次</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recurring.recurringSymbols?.length > 0 && (
              <div>
                <h3 className="text-sm text-slate-400 mb-2">回响意象</h3>
                <div className="space-y-2">
                  {recurring.recurringSymbols.map((s) => (
                    <div key={s.symbol} className="p-2 bg-slate-800/50 rounded border border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.symbol}</span>
                        <span className="text-xs text-purple-400">出现 {s.count} 次</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.meaning}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}