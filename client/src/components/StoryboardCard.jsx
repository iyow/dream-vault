import { Film } from 'lucide-react';

export default function StoryboardCard({ storyboard = [] }) {
  if (storyboard.length === 0) return null;

  return (
    <div className="space-y-3">
      {storyboard.map((scene, i) => (
        <div key={i} className="flex gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex-shrink-0 w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-mono">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-300 mb-1">{scene.scene || '场景描述'}</div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Film className="w-3 h-3" /> 镜头: {scene.camera}</span>
              <span>时长: {scene.duration}秒</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}