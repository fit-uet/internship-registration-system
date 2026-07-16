import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Building2, RefreshCw, Save, X, Edit2 } from 'lucide-react';
import { API_BASE, companyDescriptionText, companyDisplayDescription } from '../../../shared';

export function CompanyDetail({ user, token }: { user: any, token: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCompany = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/companies/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setCompany(data);
        setEditForm({
          name: data?.name || '',
          description: companyDescriptionText(data?.description) || '',
          slots: data?.slots || 5,
          contact_email: data?.contact_email || '',
          contact_name: data?.contact_name || '',
          phone: data?.phone || '',
          address: data?.address || '',
          recruitment_link: data?.recruitment_link || '',
          history: data?.history || '',
          qualifications: data?.qualifications || '',
        });
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCompany();
  }, [id, token]);

  const saveCompany = async () => {
    if (!editForm?.name?.trim()) return alert('Tên công ty không được để trống.');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...editForm,
          description: editForm.description?.trim() || 'Chưa rõ',
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Không lưu được thông tin công ty.');
      setEditing(false);
      await loadCompany();
      alert('Đã cập nhật thông tin công ty.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">Đang tải dữ liệu...</div>;
  if (!company || company.error) return <div className="text-center py-20 text-red-500">Không tìm thấy công ty!</div>;
  const description = companyDisplayDescription(company.description);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm block flex items-center gap-1">
          &larr; Quay lại
        </button>
        {user?.role === 'admin' && !editing && (
          <button onClick={() => setEditing(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm font-semibold shadow-sm flex items-center gap-2 w-fit">
            <Edit2 size={16} /> Chỉnh sửa công ty
          </button>
        )}
      </div>
      {user?.role === 'admin' && editing && editForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-bold text-slate-900">Chỉnh sửa thông tin công ty</h2>
            <button onClick={() => { setEditing(false); setEditForm({ ...company, description: companyDescriptionText(company.description) || '' }); }} className="text-slate-500 hover:text-slate-900">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên công ty *</label>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả công ty</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4} placeholder="Chưa rõ" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chỉ tiêu tiếp nhận</label>
              <input type="number" min={1} value={editForm.slots} onChange={e => setEditForm({ ...editForm, slots: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Người liên hệ</label>
              <input value={editForm.contact_name} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email liên hệ</label>
              <input value={editForm.contact_email} onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Điện thoại liên hệ</label>
              <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Địa chỉ</label>
              <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Link chi tiết tuyển dụng</label>
              <input value={editForm.recruitment_link} onChange={e => setEditForm({ ...editForm, recruitment_link: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lịch sử & Tổ chức</label>
              <textarea value={editForm.history} onChange={e => setEditForm({ ...editForm, history: e.target.value })} rows={3} placeholder="Chưa cập nhật" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Yêu cầu & Tiêu chí</label>
              <textarea value={editForm.qualifications} onChange={e => setEditForm({ ...editForm, qualifications: e.target.value })} rows={4} placeholder="Chưa cập nhật" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => { setEditing(false); setEditForm({ ...company, description: companyDescriptionText(company.description) || '' }); }} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Hủy</button>
            <button onClick={saveCompany} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-2 disabled:opacity-60">
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-slate-100 opacity-50 pointer-events-none">
          <Building2 size={120} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{company.name}</h1>
          <p className="text-lg text-slate-600 mb-4">{description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thông tin chung</h3>
              <ul className="space-y-4">
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Email liên hệ:</span>
                  <span className="font-medium text-slate-800">
                    {company.contact_name && <span className="font-bold">{company.contact_name} - </span>}
                    {company.contact_email || 'Chưa cập nhật'}
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Điện thoại liên hệ:</span>
                  <span className="font-medium text-slate-800">
                    {company.contact_name && <span className="font-bold">{company.contact_name} - </span>}
                    {company.phone || 'Chưa cập nhật'}
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Địa chỉ:</span>
                  <span className="font-medium text-slate-800">{company.address || 'Chưa cập nhật'}</span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Chi tiết tuyển dụng:</span>
                  <span className="font-medium text-blue-600">
                    {company.recruitment_link ? (
                      <a href={company.recruitment_link} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                        {company.recruitment_link}
                      </a>
                    ) : 'Chưa cập nhật'}
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Chỉ tiêu tiếp nhận:</span>
                  <span className="font-medium text-slate-800">{company.slots} sinh viên</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Lịch sử & Tổ chức</h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{company.history || 'Chưa cập nhật'}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Yêu cầu & Tiêu chí</h3>
            <p className="text-sm text-blue-900 leading-relaxed bg-blue-50/50 p-5 rounded-xl border border-blue-100">{company.qualifications || 'Chưa cập nhật'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
