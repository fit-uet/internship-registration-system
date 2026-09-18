import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, Download, Search, RefreshCw, Trash2, Clock, Send } from 'lucide-react';
import { API_BASE, saveXlsx, paginationBounds, PaginationControls, PageDescriptionTooltip } from '../../../shared';

export function NotificationAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [creatingReminders, setCreatingReminders] = useState(false);
  const [sendingQueue, setSendingQueue] = useState(false);
  const [creatingManual, setCreatingManual] = useState(false);
  const [deletingNotifications, setDeletingNotifications] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<number[]>([]);
  const [manualNotice, setManualNotice] = useState({
    target: 'students_with_registration',
    recipient: '',
    delivery_mode: 'website_and_email',
    subject: '',
    body: '',
  });
  const [stats, setStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/notifications/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setSelectedNotificationIds([]);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      alert('Không tải được lịch sử thông báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [token]);

  const markStatus = async (id: number, status: string) => {
    const error = status === 'failed' ? prompt('Ghi chú lỗi:', '') || '' : '';
    const res = await fetch(`${API_BASE}/api/admin/notifications/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, error })
    });
    if (res.ok) fetchRows();
    else alert('Cập nhật trạng thái thông báo thất bại.');
  };

  const createFinalReportReminders = async () => {
    if (!confirm('Tạo thông báo nhắc nộp báo cáo cho sinh viên chưa nộp hoặc cần nộp lại?')) return;
    setCreatingReminders(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/final-report-reminders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Tạo nhắc hạn thất bại.');
      alert(`Đã tạo ${data.count || 0} thông báo nhắc hạn.`);
      fetchRows();
    } catch (e) {
      alert('Lỗi kết nối khi tạo nhắc hạn.');
    } finally {
      setCreatingReminders(false);
    }
  };

  const createFinalConfirmationOpen = async () => {
    if (!confirm('Tạo thông báo mở xác nhận nơi thực tập cho sinh viên đã đăng ký nhưng chưa xác nhận nơi thực tập chính thức?')) return;
    setCreatingReminders(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/final-confirmation-open`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Tạo thông báo thất bại.');
      alert(`Đã tạo ${data.count || 0} thông báo mở xác nhận.`);
      fetchRows();
    } catch (e) {
      alert('Lỗi kết nối khi tạo thông báo.');
    } finally {
      setCreatingReminders(false);
    }
  };

  const sendQueued = async (scope: 'all' | 'filtered' = 'all', mode: 'batch' | 'quota' = 'batch') => {
    const filteredQueuedIds = filtered.filter(row => row.status === 'queued').map(row => Number(row.id)).filter(Boolean);
    if (scope === 'filtered' && filteredQueuedIds.length === 0) return alert('Danh sách đang lọc không có thông báo queued nào.');
    const scopeText = scope === 'filtered' ? `danh sách đang lọc (${filteredQueuedIds.length} queued)` : 'toàn bộ hàng đợi';
    const modeText = mode === 'quota' ? `tối đa quota còn lại hôm nay (${stats?.remaining_today ?? '-'})` : `một batch (${stats?.batch_size || 25})`;
    if (!confirm(`Gửi ${modeText} trong ${scopeText}?`)) return;
    setSendingQueue(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/send-queued`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode,
          notification_ids: scope === 'filtered' ? filteredQueuedIds : undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Gửi email đang chờ thất bại.');
      await fetchRows();
      alert(`Đã gửi ${data.sent || 0}, lỗi ${data.failed || 0}, bỏ qua ${data.skipped || 0}. Còn quota hôm nay: ${data.remaining_today ?? '-'} email.`);
    } catch (e) {
      alert('Lỗi kết nối khi gửi hàng đợi.');
    } finally {
      setSendingQueue(false);
    }
  };

  const deleteNotifications = async (scope: 'selected' | 'filtered' | 'queued') => {
    const filteredIds = filtered.map(row => Number(row.id)).filter(Boolean);
    const selectedIds = selectedNotificationIds.filter(id => rows.some(row => Number(row.id) === id));
    const notificationIds = scope === 'selected' ? selectedIds : scope === 'filtered' ? filteredIds : undefined;
    if (scope !== 'queued' && (!notificationIds || notificationIds.length === 0)) return alert('Không có thông báo nào để xoá.');
    const countText = scope === 'queued' ? `${stats?.statuses?.queued || 0} thông báo queued` : `${notificationIds?.length || 0} thông báo`;
    if (!confirm(`Xoá ${countText}? Thao tác này không thể hoàn tác.`)) return;
    setDeletingNotifications(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          notification_ids: notificationIds,
          status: scope === 'queued' ? 'queued' : undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Xoá thông báo thất bại.');
      await fetchRows();
      alert(`Đã xoá ${data.deleted || 0} thông báo.`);
    } catch (e) {
      alert('Lỗi kết nối khi xoá thông báo.');
    } finally {
      setDeletingNotifications(false);
    }
  };

  const createManualNotice = async () => {
    if (!manualNotice.subject.trim() || !manualNotice.body.trim()) return alert('Vui lòng nhập tiêu đề và nội dung thông báo.');
    if (manualNotice.target === 'single_account' && !manualNotice.recipient.trim()) return alert('Vui lòng nhập email hoặc mã sinh viên/giảng viên cần gửi.');
    const targetText = manualNotice.target === 'system_all'
      ? 'cả hệ thống'
      : manualNotice.target === 'single_account'
        ? `tài khoản ${manualNotice.recipient.trim()}`
        : 'nhóm người nhận đã chọn';
    const deliveryText = manualNotice.target === 'system_all'
      ? (manualNotice.delivery_mode === 'website_only'
        ? 'chỉ hiển thị trên website bằng 1 bản ghi'
        : 'hiển thị trên website bằng 1 bản ghi và đưa email vào hàng đợi')
      : manualNotice.delivery_mode === 'website_only'
        ? 'chỉ hiển thị trên website'
        : 'hiển thị trên website và đưa vào hàng đợi email';
    if (!confirm(`Tạo thông báo ${deliveryText} cho ${targetText}?`)) return;
    setCreatingManual(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(manualNotice)
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Tạo thông báo thất bại.');
      alert(`Đã tạo ${data.count || 0} thông báo.`);
      setManualNotice(prev => ({ ...prev, recipient: '', subject: '', body: '' }));
      fetchRows();
    } catch (e) {
      alert('Lỗi kết nối khi tạo thông báo.');
    } finally {
      setCreatingManual(false);
    }
  };

  const notificationTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      advisor_request_approved_comment: 'Nhận xét đăng ký GVHD',
      advisor_assigned: 'Phân công giảng viên hướng dẫn',
      company_applicants_sent: 'Đã gửi danh sách cho doanh nghiệp',
      faq_answered: 'Trả lời FAQ',
      faq_question_created: 'Câu hỏi FAQ mới',
      final_confirmation_open: 'Mở xác nhận nơi thực tập',
      final_internship_confirmed: 'Xác nhận nơi thực tập',
      final_report_due_reminder: 'Nhắc nộp báo cáo',
      final_report_status_changed: 'Trạng thái báo cáo',
      grade_locked: 'Bảng điểm đã khóa',
      lecturer_students_mail_merge: 'Mail merge giảng viên',
      manual_direct_notice: 'Thông báo tới một tài khoản',
      manual_lecturer_notice: 'Thông báo cho giảng viên',
      manual_student_notice: 'Thông báo cho sinh viên',
      registration_review_comment: 'Nhận xét đăng ký',
      registration_status_changed: 'Trạng thái đăng ký',
      system_announcement: 'Thông báo hệ thống',
    };
    return labels[String(type || '')] || String(type || 'Thông báo');
  };

  const types = Array.from(new Set<string>(rows.map(row => String(row.type || '')).filter(Boolean))).sort();
  const sortNotifications = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const sortValue = (row: any, key: string) => {
    if (key === 'recipient') return `${row.recipient_email || ''} ${row.user_name || ''} ${row.student_id || ''}`.toLowerCase();
    if (key === 'content') return `${row.subject || ''} ${row.body || ''}`.toLowerCase();
    if (key === 'created_at' || key === 'sent_at') return row[key] ? new Date(row[key]).getTime() : 0;
    return String(row[key] || '').toLowerCase();
  };
  const sortLabel = (key: string) => sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';
  const filtered = rows.filter(row => {
    const term = searchTerm.trim().toLowerCase();
    const matchStatus = statusFilter ? row.status === statusFilter : true;
    const matchType = typeFilter ? row.type === typeFilter : true;
    const matchTerm = !term || row.recipient_email?.toLowerCase().includes(term) || row.subject?.toLowerCase().includes(term) || row.body?.toLowerCase().includes(term) || row.user_name?.toLowerCase().includes(term) || row.student_id?.toLowerCase().includes(term);
    return matchStatus && matchType && matchTerm;
  });
  const sortedFiltered = [...filtered].sort((a, b) => {
    const left = sortValue(a, sortConfig.key);
    const right = sortValue(b, sortConfig.key);
    if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
    if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, sortConfig.key, sortConfig.direction, rows.length]);
  const pagination = paginationBounds(sortedFiltered.length, currentPage, pageSize);
  const paginatedRows = sortedFiltered.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);
  const selectedCount = selectedNotificationIds.filter(id => rows.some(row => Number(row.id) === id)).length;
  const paginatedIds = paginatedRows.map(row => Number(row.id)).filter(Boolean);
  const pageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedNotificationIds.includes(id));
  const toggleNotificationSelection = (id: number, checked: boolean) => {
    setSelectedNotificationIds(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(item => item !== id));
  };
  const toggleCurrentPageSelection = (checked: boolean) => {
    setSelectedNotificationIds(prev => {
      if (!checked) return prev.filter(id => !paginatedIds.includes(id));
      return Array.from(new Set([...prev, ...paginatedIds]));
    });
  };

  const exportXlsx = () => {
    const headers = ['STT', 'Người nhận', 'Loại', 'Tiêu đề', 'Nội dung', 'Trạng thái', 'Lỗi', 'Tạo lúc', 'Gửi lúc'];
    const data = sortedFiltered.map((row, idx) => [idx + 1, row.recipient_email, row.type, row.subject, row.body, row.status, row.error || '', row.created_at || '', row.sent_at || '']);
    saveXlsx('lich_su_thong_bao.xlsx', headers, data, 'Thông báo');
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải lịch sử thông báo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 bg-white border border-black/[0.08] shadow-xs hover:bg-[#f5f5f7] active:scale-[0.98] transition-all cursor-pointer mb-3"
          >
            &larr; Quay lại Quản trị
          </button>
          <h2 className="text-2xl font-bold text-[#1d1d1f] flex items-center gap-2">
            <Clock className="text-[#0071e3]" size={24} /> Lịch sử thông báo
          </h2>
          {stats && (
            <p className="text-xs font-medium text-slate-500 mt-1.5">
              Provider: <span className="text-slate-800 font-semibold">{stats.provider}</span> · Đã gửi hôm nay: <span className="text-slate-800 font-semibold">{stats.sent_today}/{stats.daily_cap}</span> · Đang chờ: <span className="text-[#b45309] font-semibold">{stats.statuses?.queued || 0}</span> · Batch: <span className="text-slate-800 font-semibold">{stats.batch_size}</span>
            </p>
          )}
        </div>
        <button
          onClick={exportXlsx}
          className="w-full sm:w-auto justify-center bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.08] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
        >
          <Download size={14} /> Xuất XLSX
        </button>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-2xl shadow-xs p-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2.5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Gửi email</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              <button
                onClick={() => sendQueued('all', 'quota')}
                disabled={sendingQueue || !stats?.statuses?.queued || !stats?.remaining_today}
                className="justify-center bg-[#0071e3] hover:bg-[#0077ed] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <Send size={14} /> Gửi theo quota
              </button>
              <button
                onClick={() => sendQueued('filtered', 'quota')}
                disabled={sendingQueue || filtered.filter(row => row.status === 'queued').length === 0}
                className="justify-center bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.08] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <Send size={14} /> Gửi lọc
              </button>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Xoá thông báo</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2">
              <button
                onClick={() => deleteNotifications('selected')}
                disabled={deletingNotifications || selectedCount === 0}
                className="justify-center bg-[#fff2f1] hover:bg-[#ffe5e3] text-[#ff3b30] border border-[#ffd8d6] px-3 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {deletingNotifications ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />} Đã chọn
              </button>
              <button
                onClick={() => deleteNotifications('filtered')}
                disabled={deletingNotifications || sortedFiltered.length === 0}
                className="justify-center bg-[#fff2f1] hover:bg-[#ffe5e3] text-[#ff3b30] border border-[#ffd8d6] px-3 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <Trash2 size={14} /> Đang lọc
              </button>
              <button
                onClick={() => deleteNotifications('queued')}
                disabled={deletingNotifications || !stats?.statuses?.queued}
                className="justify-center bg-white hover:bg-[#f5f5f7] text-[#ff3b30] border border-black/[0.08] px-3 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <Trash2 size={14} /> Hàng đợi
              </button>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tạo thông báo hệ thống</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              <button
                onClick={createFinalConfirmationOpen}
                disabled={creatingReminders}
                className="justify-center bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.08] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <CheckCircle2 size={14} /> Mở xác nhận
              </button>
              <button
                onClick={createFinalReportReminders}
                disabled={creatingReminders}
                className="justify-center bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.08] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {creatingReminders ? <RefreshCw size={14} className="animate-spin" /> : <Clock size={14} />} Nhắc báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-2xl shadow-xs p-3.5 flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm email, sinh viên, tiêu đề..."
            className="w-full pl-9 pr-4 py-2 border border-[#e5e5ea] rounded-xl text-xs bg-[#f5f5f7] focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all shadow-xs text-[#1d1d1f]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-semibold bg-white text-[#1d1d1f] shadow-xs outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] cursor-pointer"
        >
          <option value="">Tất cả loại</option>
          {types.map(type => <option key={type} value={type}>{notificationTypeLabel(type)}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-semibold bg-white text-[#1d1d1f] shadow-xs outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="website_only">Chỉ website</option>
        </select>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-2xl shadow-xs p-5 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#1d1d1f] text-sm flex items-center gap-1.5 flex-wrap">
              <span>Soạn thông báo thủ công</span>
              <PageDescriptionTooltip description="Thông báo được tạo vào hàng đợi; dùng nút “Gửi theo quota” để gửi email thật." />
            </h3>
          </div>
          <select
            value={manualNotice.target}
            onChange={e => {
              const target = e.target.value;
              setManualNotice(prev => ({
                ...prev,
                target,
              }));
            }}
            className="border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-medium bg-white text-[#1d1d1f] shadow-xs outline-none focus:border-[#0071e3]"
          >
            <option value="system_all">Cả hệ thống (1 bản ghi website)</option>
            <option value="students_with_registration">Sinh viên đã đăng ký</option>
            <option value="students_approved">Sinh viên có đăng ký đã duyệt</option>
            <option value="students_rejected">Sinh viên có đăng ký bị từ chối</option>
            <option value="students_pending">Sinh viên có đăng ký chờ duyệt</option>
            <option value="all_students">Tất cả sinh viên (tạo từng thông báo)</option>
            <option value="lecturers">Giảng viên có email</option>
            <option value="single_account">Một tài khoản cụ thể</option>
          </select>
        </div>
        <select
          value={manualNotice.delivery_mode}
          onChange={e => setManualNotice(prev => ({ ...prev, delivery_mode: e.target.value }))}
          className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-medium bg-white text-[#1d1d1f] shadow-xs outline-none focus:border-[#0071e3]"
        >
          <option value="website_and_email">Hiển thị trên website và đưa vào hàng đợi email</option>
          <option value="website_only">Chỉ hiển thị trên website, không gửi email</option>
        </select>
        {manualNotice.target === 'system_all' && (
          <p className="text-[11px] text-slate-400 -mt-1 font-medium">
            Phần hiển thị trên website của thông báo cả hệ thống luôn được lưu bằng 1 bản ghi nội dung. Nếu chọn gửi email, hệ thống sẽ tạo thêm hàng đợi email theo từng tài khoản.
          </p>
        )}
        {manualNotice.target === 'single_account' && (
          <input
            value={manualNotice.recipient}
            onChange={e => setManualNotice(prev => ({ ...prev, recipient: e.target.value }))}
            placeholder="Email VNU/email cá nhân hoặc mã sinh viên"
            className="w-full px-3.5 py-2 border border-[#e5e5ea] rounded-xl text-xs bg-[#f5f5f7] focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all shadow-xs"
          />
        )}
        <input
          value={manualNotice.subject}
          onChange={e => setManualNotice(prev => ({ ...prev, subject: e.target.value }))}
          placeholder="Tiêu đề email/thông báo"
          className="w-full px-3.5 py-2 border border-[#e5e5ea] rounded-xl text-xs bg-[#f5f5f7] focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all shadow-xs"
        />
        <textarea
          value={manualNotice.body}
          onChange={e => setManualNotice(prev => ({ ...prev, body: e.target.value }))}
          placeholder="Nội dung thông báo..."
          rows={4}
          className="w-full px-3.5 py-2 border border-[#e5e5ea] rounded-xl text-xs bg-[#f5f5f7] focus:bg-white focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 outline-none transition-all shadow-xs resize-y"
        />
        <div className="flex justify-end">
          <button
            onClick={createManualNotice}
            disabled={creatingManual}
            className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {creatingManual ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Tạo thông báo
          </button>
        </div>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#f9f9fb] text-[10px] uppercase font-semibold text-slate-700 tracking-wider border-b border-slate-100 select-none">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={pageSelected}
                    disabled={paginatedIds.length === 0}
                    onChange={e => toggleCurrentPageSelection(e.target.checked)}
                    className="rounded border-slate-300 text-[#0071e3] focus:ring-[#0071e3] disabled:opacity-40 cursor-pointer"
                    title="Chọn thông báo trong trang hiện tại"
                  />
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('recipient')} className="font-semibold hover:text-slate-900 flex items-center gap-1 cursor-pointer">
                    Người nhận{sortLabel('recipient')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('type')} className="font-semibold hover:text-slate-900 flex items-center gap-1 cursor-pointer">
                    Loại{sortLabel('type')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('created_at')} className="font-semibold hover:text-slate-900 flex items-center gap-1 cursor-pointer">
                    Nội dung / Tạo lúc{sortLabel('created_at')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('status')} className="font-semibold hover:text-slate-900 flex items-center gap-1 cursor-pointer">
                    Trạng thái{sortLabel('status')}
                  </button>
                </th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFiltered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Không có thông báo phù hợp.</td></tr>
              ) : paginatedRows.map(row => (
                <tr key={row.id} className="hover:bg-[#f5f5f7] transition-colors align-top">
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedNotificationIds.includes(Number(row.id))}
                      onChange={e => toggleNotificationSelection(Number(row.id), e.target.checked)}
                      className="rounded border-slate-300 text-[#ff3b30] focus:ring-[#ff3b30] cursor-pointer"
                      title="Chọn để xoá"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900">{row.recipient_email}</div>
                    <div className="text-[11px] text-slate-400">{row.user_name || '-'} {row.student_id ? `· ${row.student_id}` : ''}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] font-semibold bg-[#f5f5f7] text-slate-700 px-2 py-0.5 rounded-md border border-black/[0.06]">
                      {notificationTypeLabel(row.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-xl">
                    <div className="font-semibold text-slate-900">{row.subject}</div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap mt-1 leading-relaxed">{row.body}</div>
                    <div className="text-[11px] text-slate-400 mt-1.5">{row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '-'}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className={`font-semibold text-xs ${row.status === 'sent' ? 'text-[#1b7f37]' : row.status === 'failed' ? 'text-[#ff3b30]' : row.status === 'website_only' ? 'text-[#0071e3]' : 'text-[#b45309]'}`}>
                      {row.status}
                    </div>
                    {row.error && <div className="text-[11px] text-[#ff3b30] mt-1">{row.error}</div>}
                    {row.sent_at && <div className="text-[11px] text-slate-400 mt-0.5">{new Date(row.sent_at).toLocaleString('vi-VN')}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => markStatus(row.id, 'sent')} className="text-[#1b7f37] hover:bg-[#ebf9ee] px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Đã gửi</button>
                      <button onClick={() => markStatus(row.id, 'failed')} className="text-[#ff3b30] hover:bg-[#fff2f1] px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Lỗi</button>
                      <button onClick={() => markStatus(row.id, 'queued')} className="text-[#b45309] hover:bg-[#fff8eb] px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Queue</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={sortedFiltered.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          label="thông báo"
        />
      </div>
    </div>
  );
}
