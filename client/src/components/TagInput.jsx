import { useState } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('');

  function handleKeyDown(e) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()]);
      }
      setInput('');
    }
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 text-sm bg-purple-500/20 text-purple-300 rounded">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-purple-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入标签后按回车"
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}
