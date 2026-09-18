import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Download, Search, FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import { API_BASE, saveXlsx, paginationBounds, PaginationControls, PageDescriptionTooltip } from '../../../shared';

export function FinalReportAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const formatBytes = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const statusLabel = (status?: string) => status === 'accepted' ? 'Đã chấp nhận' : status === 'needs_revision' ? 'Cần nộp lại' : status === 'submitted' ? 'Đã nộp' : 'Chưa nộp';

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/reports/final`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert('Không tải được danh sách báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [token]);

  const downloadReport = async (userId: number, filename: string) => {
    const res = await fetch(`${API_BASE}/api/reports/final/${userId}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return alert('Không tải được báo cáo.');
    saveAs(await res.blob(), filename || 'final-report.pdf');
  };

  const updateStatus = async (userId: number, status: string) => {
    const lecturer_comment = status === 'needs_revision' ? prompt('Ghi chú yêu cầu sinh viên nộp lại:', '') || '' : '';
    const res = await fetch(`${API_BASE}/api/reports/final/${userId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, lecturer_comment })
    });
    if (res.ok) fetchRows();
    else alert('Cập nhật trạng thái thất bại.');
  };

  const filtered = rows.filter(row => {
    const term = searchTerm.trim().toLowerCase();
    const status = row.report_status || 'missing';
    const matchStatus = statusFilter ? status === statusFilter : true;
    const matchTerm = !term || row.student_id?.toLowerCase().includes(term) || row.student_name?.toLowerCase().includes(term) || row.internship_place?.toLowerCase().includes(term) || row.primary_advisors?.toLowerCase().includes(term) || row.co_advisors?.toLowerCase().includes(term);
    return matchStatus && matchTerm;
  });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rows.length]);
  const pagination = paginationBounds(filtered.length, currentPage, pageSize);
  const paginatedRows = filtered.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);
  const gradeStats = {
    missing: rows.filter(row => (row.grade_status || 'missing') === 'missing').length,
    draft: rows.filter(row => row.grade_status === 'draft').length,
    submitted: rows.filter(row => row.grade_status === 'submitted').length,
    locked: rows.filter(row => row.locked_at).length,
  };

  const exportXlsx = () => {
    const headers = ['STT', 'Mã SV', 'Họ tên', 'Lớp', 'Mã môn', 'Nơi thực tập', 'GVHD chính', 'Đồng hướng dẫn', 'Trạng thái', 'Tên file', 'Dung lượng', 'Nộp lúc', 'Ghi chú'];
    const data = filtered.map((row, idx) => [
      idx + 1,
      row.student_id || '',
      row.student_name || '',
      row.class_name || '',
      row.course_code || '',
      row.internship_place || '',
      row.primary_advisors || '',
      row.co_advisors || '',
      statusLabel(row.report_status),
      row.original_filename || '',
      row.file_size || '',
      row.report_submitted_at || '',
      row.lecturer_comment || ''
    ]);
    saveXlsx('bao_cao.xlsx', headers, data, 'Báo cáo');
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải báo cáo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 bg-white border border-black/[0.08] shadow-xs hover:bg-[#f5f5f7] active:scale-[0.98] transition-all cursor-pointer mb-3"
          >
            &larr; Quay lại Quản trị
          </button>
          <h2 className="text-2xl font-bold text-[#1d1d1f] flex items-center gap-2">
            <FileText className="text-[#0071e3]" size={24} /> Báo cáo
            <PageDescriptionTooltip description="Theo dõi báo cáo PDF của sinh viên đã xác nhận nơi thực tập." />
          </h2>
        </div>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-2xl shadow-xs p-3.5 flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm sinh viên, nơi TT, GVHD..."
            className="w-full pl-9 pr-4 py-2 border border-[#e5e5ea] rounded-xl text-xs bg-[#f5f5f7] focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all shadow-xs text-[#1d1d1f]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-semibold bg-white text-[#1d1d1f] shadow-xs outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="missing">Chưa nộp</option>
          <option value="submitted">Đã nộp</option>
          <option value="needs_revision">Cần nộp lại</option>
          <option value="accepted">Đã chấp nhận</option>
        </select>
        <button
          onClick={exportXlsx}
          className="bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.08] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
        >
          <Download size={14} /> Xuất XLSX
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          ['Chưa có', gradeStats.missing, 'text-slate-600 bg-[#f5f5f7] border-black/[0.06]'],
          ['Nháp', gradeStats.draft, 'text-[#b45309] bg-[#fff8eb] border-[#ffe7ba]'],
          ['Đã nộp', gradeStats.submitted, 'text-[#0071e3] bg-[#ebf4ff] border-[#cce4ff]'],
          ['Đã khóa', gradeStats.locked, 'text-[#c53030] bg-[#fff2f1] border-[#ffd8d6]'],
        ].map(([label, value, colors]) => (
          <div key={label as string} className={`border rounded-2xl p-4.5 shadow-xs flex flex-col ${colors}`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider mb-1 opacity-80">{label}</span>
            <span className="text-3xl font-bold tracking-tight">{value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-black/[0.08] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#f9f9fb] text-[10px] uppercase font-semibold text-slate-700 tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Sinh viên</th>
                <th className="px-4 py-3">Nơi thực tập</th>
                <th className="px-4 py-3">GVHD</th>
                <th className="px-4 py-3">Báo cáo</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Không có dữ liệu phù hợp.</td></tr>
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
                  <td className="px-4 py-4">
                    <div className={`font-semibold ${row.report_status === 'accepted' ? 'text-[#1b7f37]' : row.report_status === 'needs_revision' ? 'text-[#b45309]' : row.report_status ? 'text-[#0071e3]' : 'text-slate-400'}`}>
                      {statusLabel(row.report_status)}
                    </div>
                    {row.original_filename && <div className="text-xs text-slate-500 mt-1">{row.original_filename} · {formatBytes(Number(row.file_size || 0))}</div>}
                    {row.report_submitted_at && <div className="text-xs text-slate-400">{new Date(row.report_submitted_at).toLocaleString('vi-VN')}</div>}
                    {row.lecturer_comment && <div className="text-xs text-[#b45309] mt-1 font-medium">{row.lecturer_comment}</div>}
                  </td>
                  <td className="px-4 py-4">
                    {row.report_id ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => downloadReport(row.user_id, row.original_filename)}
                          className="text-[#0071e3] hover:bg-[#ebf4ff] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-[0.98]"
                        >
                          Tải PDF
                        </button>
                        <button
                          onClick={() => updateStatus(row.user_id, 'accepted')}
                          className="text-[#1b7f37] hover:bg-[#ebf9ee] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-[0.98]"
                        >
                          Chấp nhận
                        </button>
                        <button
                          onClick={() => updateStatus(row.user_id, 'needs_revision')}
                          className="text-[#b45309] hover:bg-[#fff8eb] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-[0.98]"
                        >
                          Nộp lại
                        </button>
                      </div>
                    ) : <span className="text-xs text-slate-400">Chưa có file</span>}
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
          label="báo cáo"
        />
      </div>
    </div>
  );
}
