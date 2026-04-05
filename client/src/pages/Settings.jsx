import { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    api.settings.get().then((res) => {
      setSettings(res.data);
      setLoading(false);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.update(settings);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(type) {
    setTestResults((prev) => ({ ...prev, [type]: { loading: true } }));
    try {
      const res = await api.settings.test(type);
      setTestResults((prev) => ({ ...prev, [type]: { success: res.success, error: res.error } }));
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [type]: { success: false, error: e.message } }));
    }
  }

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <div className="text-center py-12 text-slate-500">开启星门中...</div>;

  return (
    <form onSubmit={handleSave} className="max-w-xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">星门设置</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">解读之力</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API 地址</label>
          <input
            type="text"
            value={settings.ai_api_url || ''}
            onChange={(e) => update('ai_api_url', e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API Key</label>
          <input
            type="password"
            value={settings.ai_api_key || ''}
            onChange={(e) => update('ai_api_key', e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">模型名称</label>
          <input
            type="text"
            value={settings.ai_model || ''}
            onChange={(e) => update('ai_model', e.target.value)}
            placeholder="gpt-4o"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="button"
          onClick={() => handleTest('ai')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg"
        >
          {testResults.ai?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
           testResults.ai?.success ? <CheckCircle className="w-4 h-4 text-green-400" /> :
           testResults.ai?.success === false ? <XCircle className="w-4 h-4 text-red-400" /> : null}
           测试连接
        </button>
        {testResults.ai?.error && <p className="text-xs text-red-400">{testResults.ai.error}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">影像之力</h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API 地址</label>
          <input
            type="text"
            value={settings.video_api_url || ''}
            onChange={(e) => update('video_api_url', e.target.value)}
            placeholder="https://your-video-api.com/generate"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">API Key</label>
          <input
            type="password"
            value={settings.video_api_key || ''}
            onChange={(e) => update('video_api_key', e.target.value)}
            placeholder="..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="button"
          onClick={() => handleTest('video')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg"
        >
          {testResults.video?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
           testResults.video?.success ? <CheckCircle className="w-4 h-4 text-green-400" /> :
           testResults.video?.success === false ? <XCircle className="w-4 h-4 text-red-400" /> : null}
           测试连接
        </button>
        {testResults.video?.error && <p className="text-xs text-red-400">{testResults.video.error}</p>}
      </section>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? '施展中...' : '施展变更'}
      </button>
    </form>
  );
}
