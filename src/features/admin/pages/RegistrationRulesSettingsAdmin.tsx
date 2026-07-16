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

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải quy định đăng ký...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-slate-700" size={26} /> Cài đặt Quy định đăng ký
            <PageDescriptionTooltip description="Chỉnh nội dung quy định hiển thị cho sinh viên bằng Markdown." />
          </h2>
        </div>
        <button onClick={saveRules} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Lưu quy định
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung Quy định đăng ký</label>
              <button
                onClick={() => setRules(DEFAULT_REGISTRATION_RULES)}
                className="text-xs font-semibold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Khôi phục mặc định
              </button>
            </div>
            <textarea
              value={rules}
              onChange={e => setRules(e.target.value)}
              className="w-full min-h-[480px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-slate-100 focus:border-slate-500 outline-none transition-all font-mono bg-slate-50/50 shadow-inner resize-y"
              placeholder="Nhập nội dung quy định bằng Markdown..."
            />
          </div>
          <div className="p-5 bg-slate-50/25">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Xem trước</div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
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
