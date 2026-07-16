import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User as UserIcon, Users, CheckCircle2, Download, FileText, Bell, CircleHelp, MessageCircle } from 'lucide-react';
import { saveAs } from 'file-saver';
import { API_BASE, saveXlsx, CACHE_TTL, readJsonCache, clearJsonCache, cachedJsonFetch, PageDescriptionTooltip } from '../../../shared';

export function LecturerHome({ user, token }: { user: any, token: string }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [updatingContactIds, setUpdatingContactIds] = useState<Record<string, boolean>>({});

  const fetchStudents = () => {
    const cacheKey = `lecturer:students:${user?.id || user?.email || 'me'}`;
    const cached = readJsonCache<any[]>(cacheKey);
    if (Array.isArray(cached)) {
      setStudents(cached);
      setLoadingStudents(false);
    } else {
      setLoadingStudents(true);
    }
    cachedJsonFetch<any[]>(`${API_BASE}/api/lecturer/students`, {
      cacheKey,
      ttlMs: CACHE_TTL.lecturerStudents,
      headers: { Authorization: `Bearer ${token}` },
      forceRefresh: true,
    })
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(() => {
        if (!Array.isArray(cached)) setStudents([]);
      })
      .finally(() => setLoadingStudents(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [token]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const statusLabel = (status?: string) => status === 'accepted' ? 'Đã chấp nhận' : status === 'needs_revision' ? 'Cần nộp lại' : status === 'submitted' ? 'Đã nộp' : 'Chưa nộp';
  const advisedStudentCount = new Set(students.map((student: any) => student.user_id).filter(Boolean)).size;
  const uncontactedCount = students.filter((student: any) => !student.contacted_at).length;
  const groupLecturerId = students.find((student: any) => student.lecturer_id)?.lecturer_id;

  const downloadReport = async (student: any) => {
    const res = await fetch(`${API_BASE}/api/reports/final/${student.user_id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return alert('Không tải được báo cáo.');
    saveAs(await res.blob(), student.report_filename || 'final-report.pdf');
  };

  const updateReportStatus = async (student: any, status: string) => {
    const lecturer_comment = status === 'needs_revision' ? prompt('Ghi chú yêu cầu sinh viên nộp lại:', '') || '' : '';
    const res = await fetch(`${API_BASE}/api/reports/final/${student.user_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, lecturer_comment })
    });
    if (res.ok) fetchStudents();
    else alert('Cập nhật trạng thái báo cáo thất bại.');
  };

  const updateStudentContact = async (student: any, contacted: boolean, note = student.contact_note || '') => {
    const key = String(student.assignment_id);
    setUpdatingContactIds(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/lecturer/students/${student.assignment_id}/contact`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contacted, contact_note: note })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Cập nhật tình trạng liên hệ thất bại.');
      clearJsonCache(`lecturer:students:${user?.id || user?.email || 'me'}`);
      setStudents(prev => prev.map(item => Number(item.assignment_id) === Number(student.assignment_id)
        ? { ...item, contacted_at: data.contacted_at, contact_note: data.contact_note }
        : item
      ));
    } catch (e) {
      alert('Lỗi kết nối khi cập nhật tình trạng liên hệ.');
    } finally {
      setUpdatingContactIds(prev => ({ ...prev, [key]: false }));
    }
  };

  const editContactNote = (student: any) => {
    const note = prompt(`Ghi chú liên hệ với ${student.student_name || 'sinh viên'}:`, student.contact_note || '');
    if (note === null) return;
    updateStudentContact(student, !!student.contacted_at, note);
  };

  const exportLecturerStudentsXlsx = () => {
    if (students.length === 0) return alert('Chưa có sinh viên để xuất.');
    const headers = [
      'STT',
      'Mã SV',
      'Họ và tên',
      'Lớp khóa học',
      'Môn học',
      'Vai trò hướng dẫn',
      'Nơi thực tập',
      'SĐT',
      'Email VNU',
      'Email khác',
      'Tình trạng liên hệ',
      'Thời gian đánh dấu liên hệ',
      'Ghi chú liên hệ',
      'Báo cáo final',
      'Tên file báo cáo',
      'Dung lượng báo cáo',
      'Ngày nộp báo cáo',
    ];
    const rows = students.map((student: any, index: number) => [
      index + 1,
      student.student_id || '',
      student.student_name || '',
      student.class_name || '',
      student.course_code || '',
      student.advisor_role === 'primary' ? 'Hướng dẫn chính' : 'Đồng hướng dẫn',
      student.internship_place || '',
      student.phone || '',
      student.email || '',
      student.personal_email || '',
      student.contacted_at ? 'Đã liên hệ' : 'Chưa liên hệ',
      student.contacted_at ? new Date(student.contacted_at).toLocaleString('vi-VN') : '',
      student.contact_note || '',
      statusLabel(student.report_status),
      student.report_filename || '',
      student.report_file_size ? formatBytes(Number(student.report_file_size || 0)) : '',
      student.report_submitted_at ? new Date(student.report_submitted_at).toLocaleString('vi-VN') : '',
    ]);
    const safeName = String(user?.name || 'giang_vien').replace(/[^a-zA-Z0-9À-ỹ_-]+/g, '_').slice(0, 60) || 'giang_vien';
    saveXlsx(`sinh_vien_phu_trach_${safeName}.xlsx`, headers, rows, 'Sinh viên phụ trách');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-start gap-4">
          {user.picture ? (
            <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <UserIcon size={26} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">Giảng viên</p>
            <h2 className="text-2xl font-bold text-slate-900 break-words">{user.name}</h2>
            <p className="text-sm text-slate-500 mt-1 break-all">{user.email}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/profile')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
          >
            <UserIcon size={14} /> Cập nhật hồ sơ
          </button>
          <button
            onClick={() => navigate('/plan')}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
          >
            <FileText size={14} /> Kế hoạch triển khai
          </button>
          <button
            onClick={() => navigate('/lecturer-guide')}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
          >
            <CircleHelp size={14} /> Hướng dẫn sử dụng
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
          >
            <Bell size={14} /> Thông báo
          </button>
          <button
            onClick={() => navigate('/lecturer/grades')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
          >
            <CheckCircle2 size={14} /> Chấm điểm thực tập
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-teal-50/60">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                <span>Sinh viên phụ trách</span>
                <span className="inline-flex items-center rounded-full bg-white border border-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                  Tổng số SV hướng dẫn: {advisedStudentCount}
                </span>
                <PageDescriptionTooltip description="Danh sách sinh viên đã được Khoa phân công cho giảng viên." />
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${uncontactedCount > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {uncontactedCount > 0 ? `Chưa liên hệ: ${uncontactedCount}` : 'Tất cả đã liên hệ'}
              </div>
              <button
                onClick={exportLecturerStudentsXlsx}
                disabled={loadingStudents || students.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} /> Xuất XLSX
              </button>
              <button
                onClick={() => groupLecturerId && navigate(`/chat/group/${groupLecturerId}`)}
                disabled={!groupLecturerId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Users size={14} /> Chat nhóm
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/75 text-slate-700 font-semibold border-b border-slate-100 text-[10px] tracking-wider uppercase select-none">
                <th className="p-4">Mã SV</th>
                <th className="p-4">Họ tên</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Nơi thực tập</th>
                <th className="p-4">Tình trạng liên hệ</th>
                <th className="p-4">Báo cáo final</th>
                <th className="p-4">Liên hệ</th>
                <th className="p-4">Môn học</th>
                <th className="p-4">Trao đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingStudents ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-500">Đang tải danh sách...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-500">Chưa có sinh viên được phân công.</td></tr>
              ) : students.map((student: any) => (
                <tr key={student.assignment_id} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="p-4 font-mono font-semibold text-slate-800">{student.student_id || '-'}</td>
                  <td className="p-4 font-semibold text-slate-800">{student.student_name}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${student.advisor_role === 'primary' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-blue-50 border border-blue-100 text-blue-700'}`}>
                      {student.advisor_role === 'primary' ? 'Hướng dẫn chính' : 'Đồng hướng dẫn'}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{student.internship_place || '-'}</td>
                  <td className="p-4 min-w-[190px]">
                    <div className={`rounded-xl border px-3 py-2 ${student.contacted_at ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!student.contacted_at}
                          disabled={!!updatingContactIds[String(student.assignment_id)]}
                          onChange={e => updateStudentContact(student, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        {student.contacted_at ? 'Đã liên hệ' : 'Chưa liên hệ'}
                      </label>
                      {student.contacted_at && (
                        <div className="mt-1 text-[10px] text-emerald-700">
                          {new Date(student.contacted_at).toLocaleString('vi-VN')}
                        </div>
                      )}
                      {student.contact_note && (
                        <div className="mt-2 rounded-lg bg-white/70 px-2 py-1 text-[11px] leading-relaxed text-slate-700 border border-white">
                          {student.contact_note}
                        </div>
                      )}
                      <button
                        onClick={() => editContactNote(student)}
                        disabled={!!updatingContactIds[String(student.assignment_id)]}
                        className="mt-2 text-[10px] font-semibold text-slate-700 hover:text-teal-700 disabled:opacity-60"
                      >
                        {student.contact_note ? 'Sửa ghi chú' : 'Thêm ghi chú'}
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`text-xs font-semibold ${student.report_status === 'accepted' ? 'text-emerald-700' : student.report_status === 'needs_revision' ? 'text-orange-700' : student.report_status ? 'text-blue-700' : 'text-slate-400'}`}>
                      {statusLabel(student.report_status)}
                    </div>
                    {student.report_filename && (
                      <div className="mt-1 space-y-1">
                        <div className="text-[10px] text-slate-500 line-clamp-1">{student.report_filename} · {formatBytes(Number(student.report_file_size || 0))}</div>
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => downloadReport(student)} className="text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border border-slate-200 bg-white">Tải</button>
                          <button onClick={() => updateReportStatus(student, 'accepted')} className="text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border border-slate-200 bg-white">OK</button>
                          <button onClick={() => updateReportStatus(student, 'needs_revision')} className="text-orange-700 hover:bg-orange-50 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border border-slate-200 bg-white">Nộp lại</button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-xs leading-relaxed text-slate-600">
                    <div>{student.phone || '-'}</div>
                    <div>{student.personal_email || student.email || '-'}</div>
                  </td>
                  <td className="p-4 text-xs font-semibold text-slate-700">{student.course_code || '-'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => navigate(`/chat/${student.user_id}/${student.lecturer_id}`)}
                      className="inline-flex items-center gap-1 rounded-xl bg-sky-50 border border-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100/70 transition-colors cursor-pointer shadow-sm"
                    >
                      <MessageCircle size={14} /> Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
