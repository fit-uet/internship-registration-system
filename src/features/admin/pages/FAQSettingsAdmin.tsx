import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, Save, CircleHelp } from 'lucide-react';
import { API_BASE, DEFAULT_STUDENT_FAQ, DEFAULT_LECTURER_FAQ, convertDocxFileToMarkdown, CACHE_TTL, clearJsonCache, cachedJsonFetch, PageDescriptionTooltip } from '../../../shared';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';

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

  if (loading) return <div className="text-center py-20 text-slate-500 font-medium">Đang tải cấu hình FAQ...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 bg-white border border-black/[0.08] shadow-xs hover:bg-[#f5f5f7] active:scale-[0.98] transition-all cursor-pointer mb-3"
          >
            &larr; Quay lại Quản trị
          </button>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <CircleHelp size={18} />
            </div>
            Cài đặt FAQ
            <PageDescriptionTooltip description="Chọn nhóm người dùng và chỉnh nội dung FAQ hiển thị cho sinh viên hoặc giảng viên." />
          </h2>
        </div>
        <button
          onClick={saveFaq}
          disabled={saving}
          className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Lưu FAQ
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-[#fbfbfd] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SegmentedControl
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'student' | 'lecturer')}
            options={[
              { key: 'student', label: 'FAQ sinh viên' },
              { key: 'lecturer', label: 'FAQ giảng viên' },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border shadow-xs active:scale-[0.98] ${
                importingDocx
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-black/[0.08] hover:bg-[#f5f5f7]'
              }`}
            >
              <Upload size={14} className="text-slate-500" />
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
              className="text-xs font-semibold text-slate-700 bg-white border border-black/[0.08] px-3.5 py-1.5 rounded-xl hover:bg-[#f5f5f7] shadow-xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              Khôi phục nội dung mặc định
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {activeTab === 'student' ? 'Nội dung FAQ sinh viên' : 'Nội dung FAQ giảng viên'}
            </label>
            <textarea
              value={faq[activeKey] || ''}
              onChange={e => setFaq((prev: any) => ({ ...prev, [activeKey]: e.target.value }))}
              className="w-full min-h-[520px] border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all font-mono bg-[#f5f5f7]/50 focus:bg-white shadow-inner resize-y leading-relaxed text-slate-800"
            />
          </div>
          <div className="p-5 bg-[#fbfbfd]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Xem trước</div>
            <div className="prose prose-slate prose-sm max-w-none">
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
