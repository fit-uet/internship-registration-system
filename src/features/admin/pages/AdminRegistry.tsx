import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User as UserIcon, Plus, Trash2, Shield } from 'lucide-react';
import { API_BASE, PageDescriptionTooltip } from '../../../shared';

export function AdminRegistry({ token }: { token: string }) {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/admins`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAdmins(data);
    } catch (e) {
      alert('Lỗi lấy danh sách admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, [token]);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.endsWith('@vnu.edu.vn')) {
      alert('Vui lòng nhập email @vnu.edu.vn hợp lệ');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newAdminEmail.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setNewAdminEmail('');
        fetchAdmins();
        alert(data.message || 'Đã thêm admin thành công.');
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi thêm admin');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleRemoveAdmin = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa quyền admin của người dùng này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdmins();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xóa admin');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const toggleLecturer = async (admin: any) => {
    const newVal = !admin.is_lecturer;
    const action = newVal ? 'thêm' : 'xóa';
    if (!confirm(`Bạn có muốn ${action} "${admin.name}" khỏi danh sách Giảng viên?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${admin.id}/lecturer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_lecturer: newVal })
      });
      if (res.ok) {
        fetchAdmins();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch {
      alert('Lỗi cập nhật');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-purple-600" /> Quản lý Quản trị viên
            <PageDescriptionTooltip description="Danh sách các tài khoản có quyền Admin. Admin có thể đồng thời là Giảng viên." />
          </h2>
        </div>
      </div>

      {/* Add admin */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Plus size={16} className="text-purple-500" /> Thêm Quản trị viên mới</h3>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="VD: nguyenvanan@vnu.edu.vn"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-slate-50/50 shadow-inner"
          />
          <button
            onClick={handleAddAdmin}
            className="flex items-center gap-1.5 bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-purple-800 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} /> Thêm Admin
          </button>
        </div>
        <p className="text-xs text-slate-400">Chỉ chấp nhận email có đuôi @vnu.edu.vn. Người dùng phải đăng nhập lại để quyền Admin có hiệu lực.</p>
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-xs font-medium text-purple-800 leading-relaxed shadow-sm">
        <strong>Lưu ý:</strong> Tích vào ô <strong>"Là Giảng viên"</strong> sẽ tự động đồng bộ tên của Admin đó vào danh sách Giảng viên để sinh viên có thể chọn khi đăng ký thực tập tại Trường.
      </div>

      {/* Admin list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 text-slate-700 font-semibold border-b border-slate-100 text-[10px] tracking-wider uppercase select-none">
              <th className="p-4 w-12 text-center">STT</th>
              <th className="p-4">Họ và Tên</th>
              <th className="p-4">Email</th>
              <th className="p-4 text-center">Là Giảng viên</th>
              <th className="p-4 text-center w-24">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Đang tải...</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Chưa có admin nào</td></tr>
            ) : (
              admins.map((admin, idx) => (
                <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm text-slate-500 text-center">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {admin.picture ? (
                        <img src={admin.picture} alt={admin.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <UserIcon size={14} className="text-purple-600" />
                        </div>
                      )}
                      <span className="font-semibold text-slate-800 text-sm">{admin.name || <span className="text-slate-400 font-normal italic">Chưa đăng nhập</span>}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{admin.email}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleLecturer(admin)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${admin.is_lecturer ? 'bg-teal-500' : 'bg-slate-200'
                        }`}
                      title={admin.is_lecturer ? 'Click để bỏ khỏi danh sách GV' : 'Click để thêm vào danh sách GV'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${admin.is_lecturer ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                    {admin.is_lecturer ? (
                      <span className="ml-2 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">GV</span>
                    ) : null}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Xóa quyền admin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
