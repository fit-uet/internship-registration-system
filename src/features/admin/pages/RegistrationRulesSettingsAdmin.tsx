import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { RefreshCw, Save, Shield } from 'lucide-react';
import { API_BASE, DEFAULT_REGISTRATION_RULES, RegistrationRulesMarkdown, PageDescriptionTooltip } from '../../../shared';

export function RegistrationRulesSettingsAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rules, setRules] = useState(DEFAULT_REGISTRATION_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/registration-rules`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setRules(data?.registration_rules_md || DEFAULT_REGISTRATION_RULES))
      .finally(() => setLoading(false));
  }, [token]);

  const saveRules = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/registration-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ registration_rules_md: rules }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu quy định đăng ký thất bại.');
      alert('Đã lưu Quy định đăng ký.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 font-medium">Đang tải quy định đăng ký...</div>;

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
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-700 flex items-center justify-center">
              <Shield size={18} />
            </div>
            Cài đặt Quy định đăng ký
            <PageDescriptionTooltip description="Chỉnh nội dung quy định hiển thị cho sinh viên bằng Markdown." />
          </h2>
        </div>
        <button
          onClick={saveRules}
          disabled={saving}
          className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Lưu quy định
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-3">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nội dung Quy định đăng ký</label>
              <button
                onClick={() => setRules(DEFAULT_REGISTRATION_RULES)}
                className="text-xs font-semibold text-slate-700 bg-white border border-black/[0.08] px-3 py-1.5 rounded-xl hover:bg-[#f5f5f7] shadow-xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                Khôi phục mặc định
              </button>
            </div>
            <textarea
              value={rules}
              onChange={e => setRules(e.target.value)}
              className="w-full min-h-[480px] border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all font-mono bg-[#f5f5f7]/50 focus:bg-white shadow-inner resize-y leading-relaxed text-slate-800"
              placeholder="Nhập nội dung quy định bằng Markdown..."
            />
          </div>
          <div className="p-5 bg-[#fbfbfd]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Xem trước</div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Quy định Đăng ký</h2>
              {String(rules || '').trim()
                ? <RegistrationRulesMarkdown content={rules} />
                : <p className="text-xs text-slate-400 italic">Chưa có quy định nào.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
