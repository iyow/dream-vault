import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={`w-5 h-5 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
          />
        </button>
      ))}
    </div>
  );
}
