import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, Save, CircleHelp } from 'lucide-react';
import { API_BASE, DEFAULT_STUDENT_FAQ, DEFAULT_LECTURER_FAQ, convertDocxFileToMarkdown, CACHE_TTL, clearJsonCache, cachedJsonFetch, PageDescriptionTooltip } from '../../../shared';

export function FAQSettingsAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [faq, setFaq] = useState<any>({ faq_student_md: DEFAULT_STUDENT_FAQ, faq_lecturer_md: DEFAULT_LECTURER_FAQ });
  const [activeTab, setActiveTab] = useState<'student' | 'lecturer'>('student');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingDocx, setImportingDocx] = useState(false);

  useEffect(() => {
    cachedJsonFetch<any>(`${API_BASE}/api/settings/faq`, {
      cacheKey: 'markdown:faq',
      ttlMs: CACHE_TTL.markdown,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(data => {
        if (data && !data.error) {
          setFaq({
            faq_student_md: data.faq_student_md || DEFAULT_STUDENT_FAQ,
            faq_lecturer_md: data.faq_lecturer_md || DEFAULT_LECTURER_FAQ,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const saveFaq = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/faq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(faq),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu FAQ thất bại.');
      clearJsonCache('markdown:faq');
      alert('Đã lưu FAQ.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const activeKey = activeTab === 'student' ? 'faq_student_md' : 'faq_lecturer_md';
  const activeDefault = activeTab === 'student' ? DEFAULT_STUDENT_FAQ : DEFAULT_LECTURER_FAQ;

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Vui lòng chọn file .docx');
      return;
    }
    setImportingDocx(true);
    try {
      const markdown = await convertDocxFileToMarkdown(file);
      setFaq((prev: any) => ({ ...prev, [activeKey]: markdown }));
    } catch (err: any) {
      alert('Không đọc được file Word: ' + (err?.message || err));
    } finally {
      setImportingDocx(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải cấu hình FAQ...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CircleHelp className="text-amber-600" size={26} /> Cài đặt FAQ
            <PageDescriptionTooltip description="Chọn nhóm người dùng và chỉnh nội dung FAQ hiển thị cho sinh viên hoặc giảng viên." />
          </h2>
        </div>
        <button onClick={saveFaq} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Lưu FAQ
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 w-fit shadow-inner">
            <button
              onClick={() => setActiveTab('student')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'student' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              FAQ sinh viên
            </button>
            <button
              onClick={() => setActiveTab('lecturer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'lecturer' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              FAQ giảng viên
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors border ${importingDocx
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              }`}>
              <Upload size={14} />
              {importingDocx ? 'Đang đọc file...' : 'Import Word'}
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
              onClick={() => setFaq((prev: any) => ({ ...prev, [activeKey]: activeDefault }))}
              className="text-xs font-semibold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Khôi phục nội dung mặc định
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{activeTab === 'student' ? 'Nội dung FAQ sinh viên' : 'Nội dung FAQ giảng viên'}</label>
            <textarea
              value={faq[activeKey] || ''}
              onChange={e => setFaq((prev: any) => ({ ...prev, [activeKey]: e.target.value }))}
              className="w-full min-h-[520px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none transition-all font-mono bg-slate-50/50 shadow-inner resize-y"
            />
          </div>
          <div className="p-5 bg-slate-50/25">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Xem trước</div>
            <div className="prose prose-blue prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {faq[activeKey] || ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
