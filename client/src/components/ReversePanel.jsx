import { useState } from 'react';
import { Wand2, Eye, Link2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';

const MODES = [
  { key: 'rewrite', label: '改写梦境', icon: Wand2, color: 'bg-purple-600 hover:bg-purple-500' },
  { key: 'perspective', label: '视角切换', icon: Eye, color: 'bg-indigo-600 hover:bg-indigo-500' },
  { key: 'chain', label: '梦境串联', icon: Link2, color: 'bg-cyan-600 hover:bg-cyan-600' }
];

export default function ReversePanel({ dreamId, onSaved }) {
  const [mode, setMode] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [editableContent, setEditableContent] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function handleModeSelect(m) {
    setMode(m);
    setResult(null);
    setEditableContent('');
    setCustomInput('');
    setSuggestions([]);

    if (m === 'rewrite' || m === 'perspective') {
      setLoadingSug(true);
      try {
        const res = await api.reverse.suggestions(dreamId);
        setSuggestions(res.data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }
  }

  async function handleGenerate(whatIfOrPerspective) {
    setGenerating(true);
    try {
      let res;
      if (mode === 'rewrite') {
        res = await api.reverse.rewrite(dreamId, whatIfOrPerspective);
      } else if (mode === 'perspective') {
        res = await api.reverse.perspective(dreamId, whatIfOrPerspective);
      }
      setResult(res.data);
      setEditableContent(res.data.content);
    } catch (e) {
      alert('生成失败: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    try {
      await api.reverse.update(result.id, { editable_content: editableContent });
      alert('保存成功');
      onSaved?.();
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  }

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-900/30 hover:bg-slate-900/50 transition"
      >
        <span className="flex items-center gap-2 text-lg font-semibold text-purple-400">
          <Wand2 className="w-5 h-5" /> 逆梦
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {!mode && (
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleModeSelect(m.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${m.color}`}
                >
                  <m.icon className="w-4 h-4" /> {m.label}
                </button>
              ))}
            </div>
          )}

          {mode && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {mode === 'rewrite' ? '选择或输入"如果…"假设' : '选择或输入视角'}
                </span>
                <button onClick={() => setMode(null)} className="text-xs text-slate-500 hover:text-white">返回</button>
              </div>

              {loadingSug ? (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> 生成建议中...
                </div>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleGenerate(s)}
                          disabled={generating}
                          className="w-full text-left p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm hover:border-purple-500/50 transition disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={mode === 'rewrite' ? '自定义"如果…"假设' : '自定义视角'}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => handleGenerate(customInput)}
                      disabled={!customInput.trim() || generating}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : '生成'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {result.diff && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">
                  {result.diff}
                </div>
              )}
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-y"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium"
                >
                  保存逆梦
                </button>
                <button
                  onClick={() => { setMode(null); setResult(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                >
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
