import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Download, ArrowUpDown, Search, RefreshCw } from 'lucide-react';
import { API_BASE, saveXlsx, paginationBounds, PaginationControls, PageDescriptionTooltip } from '../../../shared';

export function FinalInternshipListAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'confirmed_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/final-internships`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert('Không tải được danh sách xác nhận thực tập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [token]);

  const internshipPlace = (item: any) =>
    item.company_name === 'Công ty khác'
      ? `Công ty khác: ${item.other_company_name || ''}`
      : (item.company_name || '-');

  const typeLabel = (type?: string) =>
    type === 'school' ? 'Tại trường' : type === 'partner' ? 'Đối tác' : 'Công ty';

  const requestSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="inline-block ml-1 text-slate-400">
      {sortConfig?.key === col ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={12} />}
    </span>
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const includesTerm = (value: any) => String(value || '').toLowerCase().includes(term);
    let result = rows.filter(item => {
      const matchType = typeFilter ? item.internship_type === typeFilter : true;
      const matchTerm = !term ||
        includesTerm(item.student_id) ||
        includesTerm(item.student_name) ||
        includesTerm(item.email) ||
        includesTerm(item.class_name) ||
        includesTerm(item.course_code) ||
        includesTerm(internshipPlace(item)) ||
        includesTerm(item.school_lecturer) ||
        includesTerm(item.note);
      return matchType && matchTerm;
    });
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aVal = sortConfig.key === 'internship_place' ? internshipPlace(a) : (a[sortConfig.key] || '');
        const bVal = sortConfig.key === 'internship_place' ? internshipPlace(b) : (b[sortConfig.key] || '');
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal, 'vi') : bVal.localeCompare(aVal, 'vi');
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [rows, searchTerm, typeFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, sortConfig, rows.length]);

  const pagination = paginationBounds(filteredRows.length, currentPage, pageSize);
  const paginatedRows = filteredRows.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);
  const uniqueStudents = new Set(rows.map(item => item.user_id || item.student_id || item.email).filter(Boolean)).size;
  const uniquePlaces = new Set(rows.map(internshipPlace).filter(Boolean)).size;
  const companyCount = rows.filter(item => item.internship_type === 'company').length;
  const schoolCount = rows.filter(item => item.internship_type === 'school').length;

  const exportXlsx = () => {
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Email VNU', 'SĐT', 'Email cá nhân', 'Lớp KH', 'Mã môn học', 'Loại', 'Nơi thực tập', 'GVHD tại trường', 'Yêu cầu phân công', 'Thời gian xác nhận', 'Ghi chú'];
    const data = filteredRows.map((item, idx) => [
      idx + 1,
      item.student_id || '',
      item.student_name || '',
      item.email || '',
      item.phone || '',
      item.personal_email || '',
      item.class_name || '',
      item.course_code || '',
      typeLabel(item.internship_type),
      internshipPlace(item),
      item.school_lecturer || '',
      item.school_assignment_request ? 'Khoa sẽ phân công' : '',
      item.confirmed_at ? new Date(item.confirmed_at).toLocaleString('vi-VN') : '',
      item.note || '',
    ]);
    saveXlsx('danh_sach_xac_nhan_thuc_tap.xlsx', headers, data, 'Xác nhận TT');
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải danh sách xác nhận thực tập...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" /> Danh sách xác nhận thực tập
            <PageDescriptionTooltip description="Sinh viên đã xác nhận nơi thực tập chính thức để lấy điểm học phần." />
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={fetchRows} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer">
            <RefreshCw size={14} /> Tải lại
          </button>
          <button onClick={exportXlsx} disabled={filteredRows.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Download size={14} /> Xuất XLSX
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Tổng xác nhận</span>
          <span className="text-3xl font-bold text-slate-800">{rows.length}</span>
        </div>
        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col">
          <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">Số sinh viên</span>
          <span className="text-3xl font-bold text-blue-700">{uniqueStudents}</span>
        </div>
        <div className="bg-cyan-50/50 p-5 rounded-2xl border border-cyan-100 shadow-sm flex flex-col">
          <span className="text-cyan-700 text-xs font-semibold uppercase tracking-wider mb-1">Số nơi thực tập</span>
          <span className="text-3xl font-bold text-cyan-800">{uniquePlaces}</span>
        </div>
        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col">
          <span className="text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-1">Thực tập công ty</span>
          <span className="text-3xl font-bold text-emerald-700">{companyCount}</span>
        </div>
        <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
          <span className="text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">TT ở trường</span>
          <span className="text-3xl font-bold text-indigo-700">{schoolCount}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm mã SV, tên, nơi thực tập, GVHD..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none">
          <option value="">Tất cả loại</option>
          <option value="company">Công ty</option>
          <option value="school">Tại trường</option>
          <option value="partner">Đối tác</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-slate-700 font-semibold border-b border-slate-100 text-[10px] tracking-wider uppercase select-none">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('student_id')}>Mã SV<SortIcon col="student_id" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('student_name')}>Họ và tên<SortIcon col="student_name" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('internship_type')}>Loại<SortIcon col="internship_type" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('internship_place')}>Nơi thực tập<SortIcon col="internship_place" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('school_lecturer')}>GVHD tại trường<SortIcon col="school_lecturer" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('course_code')}>Môn học<SortIcon col="course_code" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('confirmed_at')}>Thời gian xác nhận<SortIcon col="confirmed_at" /></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Chưa có sinh viên xác nhận nơi thực tập chính thức.</td>
                </tr>
              ) : (
                paginatedRows.map(item => (
                  <tr key={item.id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">{item.student_id || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{item.student_name}</div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">{item.class_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.internship_type === 'school' ? 'bg-blue-50 text-blue-700 border border-blue-100' : item.internship_type === 'partner' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {typeLabel(item.internship_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 min-w-[220px] font-medium text-slate-700">{internshipPlace(item)}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.school_assignment_request ? <span className="text-orange-600 font-semibold">Khoa sẽ phân công</span> : (item.school_lecturer || '-')}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{item.course_code?.split(' ').pop() || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{item.confirmed_at ? new Date(item.confirmed_at).toLocaleString('vi-VN') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={filteredRows.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          label="xác nhận"
        />
      </div>
    </div>
  );
}
