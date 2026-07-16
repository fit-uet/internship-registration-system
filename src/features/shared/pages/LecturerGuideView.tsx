import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { API_BASE, DEFAULT_LECTURER_GUIDE, CACHE_TTL, cachedJsonFetch } from '../../../shared';

export function LecturerGuideView({ token, user }: { token: string; user: any }) {
  const [guide, setGuide] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    cachedJsonFetch<any>(`${API_BASE}/api/lecturer-guide`, {
      cacheKey: 'markdown:lecturer-guide',
      ttlMs: CACHE_TTL.markdown,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(data => setGuide(data?.guide || DEFAULT_LECTURER_GUIDE))
      .catch(() => setGuide(DEFAULT_LECTURER_GUIDE))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={() => navigate('/')} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại trang chủ</button>
        {user?.role === 'admin' && (
          <button onClick={() => navigate('/admin/lecturer-guide')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
            <Edit2 size={14} /> Cài đặt hướng dẫn
          </button>
        )}
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-none prose prose-blue prose-sm sm:prose-base">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/2 mb-6"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 rounded w-4/6"></div>
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-slate-800 mb-4" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-800 mt-6 mb-3" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2" {...props} />,
              p: ({ node, ...props }) => <p className="mb-4 text-slate-600 leading-relaxed" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
              a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
              table: ({ node, ...props }) => <div className="overflow-x-auto mb-6"><table className="min-w-full divide-y divide-slate-200 border border-slate-200" {...props} /></div>,
              thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
              tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-200 bg-white" {...props} />,
              tr: ({ node, ...props }) => <tr className="hover:bg-slate-50/50" {...props} />,
              th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-x border-slate-200" {...props} />,
              td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-slate-600 border-x border-slate-200" {...props} />,
            }}
          >
            {guide}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
