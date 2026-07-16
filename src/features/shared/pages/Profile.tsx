import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Save } from 'lucide-react';
import { API_BASE, CACHE_TTL, cachedJsonFetch, PageDescriptionTooltip } from '../../../shared';

export function Profile({ user, setUser, token }: { user: any, setUser: any, token: string }) {
  const isAdmin = user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';
  const isStaff = isAdmin || isLecturer;
  const [formData, setFormData] = useState({
    name: user?.name || '',
    student_id: user?.student_id || user?.email?.split('@')[0] || '',
    dob: user?.dob || '',
    class_name: user?.class_name || '',
    course_code: user?.course_code || '',
    phone: user?.phone || '',
    personal_email: user?.personal_email || ''
  });
  const [saving, setSaving] = useState(false);
  const [classesList, setClassesList] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isStaff) {
      cachedJsonFetch<any>(`${API_BASE}/api/settings/campaign`, {
        cacheKey: 'settings:campaign',
        ttlMs: CACHE_TTL.campaign,
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(data => {
          if (data.classes_list) {
            setClassesList(data.classes_list.split(',').map((c: string) => c.trim()));
          }
        })
        .catch(() => { });

    }
  }, [token, isStaff]);

  // Sync formData when user prop changes (e.g. after registration updates phone/personal_email)
  useEffect(() => {
    setFormData({
      name: user?.name || '',
      student_id: user?.student_id || user?.email?.split('@')[0] || '',
      dob: user?.dob || '',
      class_name: user?.class_name || '',
      course_code: user?.course_code || '',
      phone: user?.phone || '',
      personal_email: user?.personal_email || ''
    });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = isStaff
        ? { name: formData.name }
        : formData;
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Cập nhật hồ sơ thành công!');
        navigate('/');
      } else {
        const err = await res.json();
        alert(err.error || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
      }
    } catch (e) {
      alert('Lỗi kết nối.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại</button>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <UserIcon className="text-blue-600" /> Cập nhật Hồ sơ cá nhân
          {isStaff && (
            <PageDescriptionTooltip
              description={
                <>
                  Với tư cách <strong>{isLecturer ? 'Giảng viên' : `Quản trị viên${user.is_lecturer ? ' / Giảng viên' : ''}`}</strong>, hồ sơ của bạn chỉ cần cập nhật họ tên hiển thị.
                  {!!(isLecturer || user.is_lecturer) && <span> Tên này sẽ được <strong>đồng bộ tự động</strong> vào danh sách Giảng viên hướng dẫn.</span>}
                </>
              }
            />
          )}
        </h2>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar + info banner */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
            {user.picture ? (
              <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[#004a99] font-bold shadow-sm"><UserIcon size={24} /></div>
            )}
            <div>
              <p className="font-semibold text-slate-800 text-base">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500 bg-slate-200 inline-block px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">{user.role}</p>
                {user.is_lecturer ? (
                  <p className="text-[10px] text-teal-700 bg-teal-50 border border-teal-100 inline-block px-2 py-0.5 rounded-full font-semibold">Giảng viên</p>
                ) : null}
              </div>
            </div>
          </div>

          {isStaff ? (
            /* ── ADMIN / LECTURER VIEW ── */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-100 text-slate-400 cursor-not-allowed font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                />
              </div>
            </div>
          ) : (
            /* ── STUDENT VIEW ── */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mã sinh viên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-mono font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ngày sinh <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Số điện thoại</label>
                  <input
                    type="tel"
                    pattern="^(0|\+84)[35789][0-9]{8}$"
                    title="Vui lòng nhập số điện thoại hợp lệ (10 số, VD: 0912345678)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                    placeholder="VD: 0912345678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email cá nhân (khác VNU)</label>
                  <input
                    type="email"
                    value={formData.personal_email}
                    onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                    placeholder="VD: abc@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Lớp khóa học <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                  >
                    <option value="">-- Chọn lớp khóa học --</option>
                    {classesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Học phần thực tập <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                  >
                    <option value="">-- Chọn học phần --</option>
                    <option value="Thực tập Doanh nghiệp INT4002">Thực tập Doanh nghiệp INT4002</option>
                    <option value="Thực tập Chuyên ngành INT3508">Thực tập Chuyên ngành INT3508</option>
                    <option value="Thực tập Doanh nghiệp Nhật Bản INT4003">Thực tập Doanh nghiệp Nhật Bản INT4003</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu Hồ sơ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
