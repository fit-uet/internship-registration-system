import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, Download, Search } from 'lucide-react';
import { API_BASE, saveXlsx, paginationBounds, PaginationControls, PageDescriptionTooltip } from '../../../shared';

export function GradeAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const statusLabel = (status?: string) => status === 'submitted' ? 'Đã nộp' : status === 'draft' ? 'Nháp' : 'Chưa có';

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/grades`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert('Không tải được bảng điểm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [token]);

  const toggleLock = async (row: any) => {
    const locked = !row.locked_at;
    const res = await fetch(`${API_BASE}/api/admin/grades/${row.user_id}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locked })
    });
    if (res.ok) fetchRows();
    else alert('Cập nhật khóa điểm thất bại.');
  };

  const filtered = rows.filter(row => {
    const term = searchTerm.trim().toLowerCase();
    const status = row.grade_status || 'missing';
    const matchStatus = statusFilter ? status === statusFilter : true;
    const matchTerm = !term || row.student_id?.toLowerCase().includes(term) || row.student_name?.toLowerCase().includes(term) || row.internship_place?.toLowerCase().includes(term) || row.primary_advisors?.toLowerCase().includes(term) || row.co_advisors?.toLowerCase().includes(term);
    return matchStatus && matchTerm;
  });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rows.length]);
  const pagination = paginationBounds(filtered.length, currentPage, pageSize);
  const paginatedRows = filtered.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);

  const exportXlsx = () => {
    const headers = ['STT', 'Mã SV', 'Họ tên', 'Lớp', 'Mã học phần', 'Nơi thực tập', 'GVHD chính', 'Đồng hướng dẫn', 'Điểm định kỳ', 'Điểm final', 'Điểm công ty/GVHD', 'Điểm tổng kết', 'Trạng thái', 'Người nhập', 'Nộp điểm lúc', 'Ghi chú'];
    const data = filtered.map((row, idx) => [
      idx + 1,
      row.student_id || '',
      row.student_name || '',
      row.class_name || '',
      row.course_code || '',
      row.internship_place || '',
      row.primary_advisors || '',
      row.co_advisors || '',
      row.progress_score ?? '',
      row.report_score ?? '',
      row.company_score ?? '',
      row.final_score ?? '',
      statusLabel(row.grade_status),
      row.grading_lecturer_name || '',
      row.grade_submitted_at || '',
      row.comment || ''
    ]);
    saveXlsx('bang_diem_thuc_tap.xlsx', headers, data, 'Bảng điểm');
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải bảng điểm...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="bg-white text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer mb-2 active:scale-[0.98]">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="text-[#1b7f37]" /> Bảng điểm thực tập
            <PageDescriptionTooltip description="Tổng hợp điểm 20% định kỳ, 20% báo cáo, 60% đánh giá công ty/GVHD." />
          </h2>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm sinh viên, nơi TT, GVHD..."
            className="w-full pl-9 pr-4 py-2 border border-[#e5e5ea] rounded-xl text-xs bg-[#f5f5f7] focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all shadow-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-semibold bg-white text-[#1d1d1f] shadow-xs outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="missing">Chưa có</option>
          <option value="draft">Nháp</option>
          <option value="submitted">Đã nộp</option>
        </select>
        <button
          onClick={exportXlsx}
          className="bg-white text-[#1d1d1f] border border-[#e5e5ea] hover:bg-[#f5f5f7] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <Download size={14} /> Xuất XLSX
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#f9f9fb] text-[10px] uppercase font-semibold text-slate-700 tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Sinh viên</th>
                <th className="px-4 py-3">Nơi thực tập</th>
                <th className="px-4 py-3">GVHD</th>
                <th className="px-4 py-3">Điểm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Khóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Không có dữ liệu phù hợp.</td></tr>
              ) : paginatedRows.map(row => (
                <tr key={row.user_id} className="hover:bg-[#f5f5f7] transition-colors align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{row.student_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{row.student_id || '-'}</div>
                    <div className="text-xs text-slate-400">{row.class_name || '-'} · {row.course_code || '-'}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{row.internship_place || '-'}</td>
                  <td className="px-4 py-4">
                    <div className="text-slate-800">{row.primary_advisors || '-'}</div>
                    {row.co_advisors && <div className="text-xs text-slate-500 mt-1">Đồng HD: {row.co_advisors}</div>}
                  </td>
                  <td className="px-4 py-4 text-xs leading-relaxed">
                    <div>Định kỳ: <strong>{row.progress_score ?? '-'}</strong></div>
                    <div>Final: <strong>{row.report_score ?? '-'}</strong></div>
                    <div>Đánh giá: <strong>{row.company_score ?? '-'}</strong></div>
                    <div className="text-sm text-[#1b7f37] font-bold mt-1">{row.final_score ?? '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`font-semibold ${row.grade_status === 'submitted' ? 'text-emerald-700' : row.grade_status === 'draft' ? 'text-orange-700' : 'text-slate-400'}`}>{statusLabel(row.grade_status)}</div>
                    {row.grading_lecturer_name && <div className="text-[11px] text-slate-500 mt-0.5">Người nhập: {row.grading_lecturer_name}</div>}
                    {row.grade_submitted_at && <div className="text-[10px] text-slate-400 mt-0.5">{new Date(row.grade_submitted_at).toLocaleString('vi-VN')}</div>}
                    {row.comment && <div className="text-[11px] text-slate-500 mt-1">{row.comment}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleLock(row)}
                      disabled={row.grade_status === 'missing'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer active:scale-[0.98] ${row.locked_at ? 'bg-[#fff2f1] text-[#d70015] border border-[#ffd8d6] hover:bg-[#ffd8d6]' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {row.locked_at ? 'Mở khóa' : 'Khóa điểm'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={filtered.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          label="dòng điểm"
        />
      </div>
    </div>
  );
}
