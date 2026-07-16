import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, Save, CircleHelp } from 'lucide-react';
import { API_BASE, DEFAULT_LECTURER_GUIDE, convertDocxFileToMarkdown, clearJsonCache, PageDescriptionTooltip } from '../../../shared';

export function LecturerGuideSettingsAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [guideContent, setGuideContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingDocx, setImportingDocx] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/lecturer-guide`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setGuideContent(data?.guide || DEFAULT_LECTURER_GUIDE))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSaveGuide = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/lecturer-guide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ guide: guideContent }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu hướng dẫn sử dụng thất bại.');
      clearJsonCache('markdown:lecturer-guide');
      alert('Đã lưu Hướng dẫn sử dụng cho giảng viên.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Vui lòng chọn file .docx');
      return;
    }
    setImportingDocx(true);
    try {
      setGuideContent(await convertDocxFileToMarkdown(file));
    } catch (err: any) {
      alert('Không đọc được file Word: ' + (err?.message || err));
    } finally {
      setImportingDocx(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải nội dung hướng dẫn...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CircleHelp className="text-indigo-600" /> Cài đặt Hướng dẫn sử dụng cho giảng viên
            <PageDescriptionTooltip description="Chỉnh nội dung hướng dẫn hiển thị cho giảng viên bằng Markdown." />
          </h2>
        </div>
        <button onClick={handleSaveGuide} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Lưu hướng dẫn
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm border w-fit ${importingDocx
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              }`}>
              <Upload size={14} />
              {importingDocx ? 'Đang đọc file...' : 'Import từ Word (.docx)'}
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={importingDocx}
                onChange={handleImportDocx}
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              />
            </label>
            <button
              onClick={() => setGuideContent(DEFAULT_LECTURER_GUIDE)}
              className="text-xs font-semibold text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Khôi phục mặc định
            </button>
          </div>
          <span className="text-xs text-slate-500">Nội dung file Word sẽ được chuyển sang Markdown và thay thế nội dung đang soạn.</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nội dung Hướng dẫn sử dụng</label>
            <textarea
              className="w-full min-h-[560px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-mono bg-slate-50/50 shadow-inner resize-y"
              value={guideContent}
              onChange={(e) => setGuideContent(e.target.value)}
              placeholder="Nhập nội dung hướng dẫn sử dụng bằng Markdown..."
            />
          </div>
          <div className="p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Xem trước</div>
            <div className="prose prose-blue prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {guideContent || ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
