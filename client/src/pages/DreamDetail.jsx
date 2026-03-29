import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit, Trash2, Brain, Video, FileText, Loader2, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import EmotionChart from '../components/EmotionChart';
import StoryboardCard from '../components/StoryboardCard';
import VideoPlayer from '../components/VideoPlayer';
import ReversePanel from '../components/ReversePanel';

export default function DreamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [dream, setDream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [videoApiNotConfigured, setVideoApiNotConfigured] = useState(false);

  useEffect(() => { loadDream(); }, [id]);

  async function loadDream() {
    setLoading(true);
    try {
      const res = await api.dreams.get(id);
      setDream(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await api.analysis.trigger(id);
      await loadDream();
    } catch (e) {
      toast.error('分析失败: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerateVideo() {
    setGenerating(true);
    setVideoApiNotConfigured(false);
    try {
      const res = await api.video.generate(id);
      if (res.data.configured === false) {
        setVideoApiNotConfigured(true);
      } else {
        await loadDream();
      }
    } catch (e) {
      toast.error('生成失败: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleCopyPrompt() {
    if (analysis?.video_prompt) {
      navigator.clipboard.writeText(analysis.video_prompt);
      toast.success('Prompt 已复制到剪贴板');
    }
  }

  async function handleDelete() {
    if (!confirm('确定删除这个梦境？')) return;
    await api.dreams.delete(id);
    navigate('/');
  }

  if (loading) return <div className="text-center py-12 text-slate-500">加载中...</div>;
  if (!dream) return <div className="text-center py-12 text-slate-500">梦境不存在</div>;

  const analysis = dream.analysis;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{dream.title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{dream.dream_date}</span>
            {dream.mood_before && <span>入睡前: {dream.mood_before}</span>}
            {dream.sleep_quality > 0 && <span>睡眠: {'★'.repeat(dream.sleep_quality)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/dream/${id}/edit`} className="p-2 text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></Link>
          <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {dream.tags?.length > 0 && (
        <div className="flex gap-1">
          {dream.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">{t}</span>
          ))}
        </div>
      )}

      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
        <p className="text-slate-300 whitespace-pre-wrap">{dream.content}</p>
      </div>

      {analysis ? (
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Brain className="w-5 h-5 text-purple-400" /> AI 分析
          </h2>

          {analysis.summary && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-sm text-purple-200">{analysis.summary}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">情绪分析</h3>
            <EmotionChart emotion={analysis.emotion} />
          </div>

          {analysis.themes?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">主题</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((t) => (
                  <span key={t} className="px-3 py-1 text-sm bg-indigo-500/20 text-indigo-300 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          {analysis.symbols?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">象征解读</h3>
              <div className="grid gap-2">
                {analysis.symbols.map((s, i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <span className="font-medium text-white">{s.symbol}</span>
                    <span className="text-slate-400"> — {s.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.storyboard?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">分镜</h3>
              <StoryboardCard storyboard={analysis.storyboard} />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          {analyzing ? '分析中...' : 'AI 分析'}
        </button>
      )}

      {analysis && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Video className="w-5 h-5 text-purple-400" /> 视频
          </h2>

          {dream.video?.status === 'completed' ? (
            <VideoPlayer src={`/api/videos/file/${dream.video.original_path}`} />
          ) : videoApiNotConfigured ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-200 font-medium">视频 API 未配置</p>
                  <p className="text-sm text-amber-200/70 mt-1">请在设置中配置视频生成服务，或使用下方提示前往即梦平台生成视频</p>
                </div>
              </div>

              {analysis.video_prompt && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h4 className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <FileText className="w-3 h-3" /> 视频 Prompt（可复制到其他平台使用）
                  </h4>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{analysis.video_prompt}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCopyPrompt}
                  disabled={!analysis.video_prompt}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" /> 复制 Prompt
                </button>
                <a
                  href="https://jimeng.jianying.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" /> 前往即梦
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleGenerateVideo}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {generating ? '生成中...' : '生成视频'}
              </button>

              {analysis.video_prompt && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h4 className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <FileText className="w-3 h-3" /> 视频 Prompt（可复制到其他平台使用）
                  </h4>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{analysis.video_prompt}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {analysis && <ReversePanel dreamId={id} />}
    </div>
  );
}