import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, RefreshCw, FileText, Download, ChevronLeft, Award, Clock, AlertCircle, Sparkles, Lock } from 'lucide-react';
import { saveAs } from 'file-saver';
import { API_BASE, PageDescriptionTooltip } from '../../../shared';
import { ReportReviewPanel, type ReviewTarget } from './ReportReviewPanel';

const SCORE_FIELDS = ['progress_score', 'report_score', 'company_score'] as const;
type ScoreField = typeof SCORE_FIELDS[number];

export function LecturerGradeView({ token, user }: { token: string; user: any }) {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<any[]>([]);
  const [gradeEdits, setGradeEdits] = useState<Record<string, any>>({});
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  const fetchGrades = () => {
    setLoadingGrades(true);
    fetch(`${API_BASE}/api/lecturer/grades`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setGrades(list);
        setGradeEdits(
          Object.fromEntries(
            list.map((row: any) => [
              String(row.user_id),
              {
                progress_score: row.progress_score ?? '',
                report_score: row.report_score ?? '',
                company_score: row.company_score ?? '',
                comment: row.comment || '',
              },
            ])
          )
        );
        setScoreErrors({});
      })
      .catch(() => setGrades([]))
      .finally(() => setLoadingGrades(false));
  };

  useEffect(() => {
    fetchGrades();
  }, [token]);

  const statusLabel = (status?: string) =>
    status === 'accepted'
      ? 'Đã chấp nhận'
      : status === 'needs_revision'
      ? 'Cần nộp lại'
      : status === 'submitted'
      ? 'Đã nộp'
      : 'Chưa nộp';

  const gradeStatusLabel = (status?: string) =>
    status === 'submitted' ? 'Đã công bố' : status === 'draft' ? 'Bản nháp' : 'Chưa nhập';

  const previewFinalScore = (edit: any) => {
    const p = edit?.progress_score === '' ? null : Number(edit?.progress_score);
    const r = edit?.report_score === '' ? null : Number(edit?.report_score);
    const c = edit?.company_score === '' ? null : Number(edit?.company_score);
    if (![p, r, c].every((v) => v !== null && Number.isFinite(v) && v >= 0 && v <= 10)) return '-';
    return ((p as number) * 0.2 + (r as number) * 0.2 + (c as number) * 0.6).toFixed(2);
  };

  const updateGradeEdit = (userId: number, key: string, value: string) => {
    setGradeEdits((prev) => ({ ...prev, [userId]: { ...(prev[String(userId)] || {}), [key]: value } }));
  };

  const scoreErrorKey = (userId: number, field: ScoreField) => `${userId}:${field}`;
  const clearScoreError = (userId: number, field: ScoreField) => {
    const errorKey = scoreErrorKey(userId, field);
    setScoreErrors((prev) => {
      if (!prev[errorKey]) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };

  const updateScoreEdit = (userId: number, field: ScoreField, value: string) => {
    if (value === '') {
      clearScoreError(userId, field);
      updateGradeEdit(userId, field, value);
      return;
    }
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      setScoreErrors((prev) => ({ ...prev, [scoreErrorKey(userId, field)]: 'Từ 0 đến 10' }));
      return;
    }
    clearScoreError(userId, field);
    updateGradeEdit(userId, field, value);
  };

  const saveGrade = async (row: any, submit = false) => {
    const edit = gradeEdits[String(row.user_id)] || {};
    const validationErrors: Record<string, string> = {};
    SCORE_FIELDS.forEach((field) => {
      const value = edit[field];
      const score = value === '' || value === null || value === undefined ? null : Number(value);
      if (submit && score === null) validationErrors[scoreErrorKey(row.user_id, field)] = 'Bắt buộc';
      else if (score !== null && (!Number.isFinite(score) || score < 0 || score > 10)) {
        validationErrors[scoreErrorKey(row.user_id, field)] = 'Từ 0 đến 10';
      }
    });
    const hasExistingInputError = SCORE_FIELDS.some((field) => scoreErrors[scoreErrorKey(row.user_id, field)]);
    if (Object.keys(validationErrors).length > 0 || hasExistingInputError) {
      if (Object.keys(validationErrors).length > 0) setScoreErrors((prev) => ({ ...prev, ...validationErrors }));
      return;
    }
    const key = `${row.user_id}:${submit ? 'submit' : 'draft'}`;
    setSavingKey(key);
    try {
      const endpoint = `${API_BASE}/api/lecturer/grades/${row.user_id}${submit ? '/submit' : ''}`;
      const res = await fetch(endpoint, {
        method: submit ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(edit),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu điểm thất bại.');
      fetchGrades();
    } finally {
      setSavingKey(null);
    }
  };

  const downloadReport = async (row: any) => {
    const res = await fetch(`${API_BASE}/api/reports/final/${row.user_id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('Không tải được báo cáo.');
    saveAs(await res.blob(), row.original_filename || `bao-cao-${row.student_id || row.user_id}.pdf`);
  };

  const openReview = (row: any) => {
    setReviewTarget({
      userId: row.user_id,
      studentName: row.student_name,
      studentId: row.student_id,
      reportStatus: row.report_status,
      originalFilename: row.original_filename,
      fileSize: row.file_size,
      reportSubmittedAt: row.report_submitted_at,
      lecturerComment: row.lecturer_comment,
      internshipPlace: row.internship_place,
      lockedAt: row.locked_at,
      initialGrade: {
        progress_score: row.progress_score,
        report_score: row.report_score,
        company_score: row.company_score,
        comment: row.comment,
        grade_status: row.grade_status,
      },
    });
  };

  const stats = {
    total: grades.length,
    missing: grades.filter((row) => !row.grade_status || row.grade_status === 'missing').length,
    draft: grades.filter((row) => row.grade_status === 'draft').length,
    submitted: grades.filter((row) => row.grade_status === 'submitted').length,
    locked: grades.filter((row) => row.locked_at).length,
  };

  return (
    <>
      {/* Review Panel overlay */}
      {reviewTarget && (
        <ReportReviewPanel
          target={reviewTarget}
          token={token}
          onClose={() => setReviewTarget(null)}
          onReportStatusChange={fetchGrades}
          onGradeChange={fetchGrades}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Apple Large Title & Navigation Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/')}
              className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#86868b] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] active:scale-[0.98] transition-all cursor-pointer mb-3"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              {user?.role === 'admin' ? 'Quản trị hệ thống' : 'Trang chủ'}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shadow-inner shrink-0">
                <Award size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                  Chấm điểm thực tập
                  <PageDescriptionTooltip
                    description={
                      <div>
                        <p>Chỉ giảng viên hướng dẫn chính được nhập và nộp điểm trên hệ thống.</p>
                        <p className="mt-1 font-semibold">Công thức: 20% định kỳ + 20% báo cáo + 60% doanh nghiệp/GVHD.</p>
                      </div>
                    }
                  />
                </h1>
                <p className="text-xs text-[#86868b] mt-0.5 font-medium">
                  Bấm «Xem & Chấm» để mở khung xem PDF và nhập điểm đồng thời trên màn hình
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchGrades}
            disabled={loadingGrades}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#1d1d1f] bg-white border border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f5f5f7] active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw size={13} className={loadingGrades ? 'animate-spin text-[#0071e3]' : 'text-[#86868b]'} />
            Tải lại
          </button>
        </div>

        {/* Apple KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Tổng sinh viên</span>
            <div className="mt-2 text-3xl font-black text-[#1d1d1f] tracking-tight">{stats.total}</div>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Chưa có điểm</span>
            <div className="mt-2 text-3xl font-black text-[#86868b] tracking-tight">{stats.missing}</div>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Bản nháp</span>
            <div className="mt-2 text-3xl font-black text-[#ff9500] tracking-tight">{stats.draft}</div>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Đã nộp điểm</span>
            <div className="mt-2 text-3xl font-black text-[#34c759] tracking-tight">{stats.submitted}</div>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Khoa đã khóa</span>
            <div className="mt-2 text-3xl font-black text-[#ff3b30] tracking-tight">{stats.locked}</div>
          </div>
        </div>

        {/* Apple Inset Grouped Table */}
        <div className="bg-white border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#6e6e73]">
              <thead className="bg-[#fbfbfd] text-[11px] uppercase font-bold text-[#86868b] tracking-wider border-b border-black/[0.05] select-none">
                <tr>
                  <th className="px-5 py-3.5">Sinh viên</th>
                  <th className="px-5 py-3.5">Nơi thực tập</th>
                  <th className="px-5 py-3.5">Báo cáo & Trạng thái</th>
                  <th className="px-5 py-3.5 text-center">20% Định kỳ</th>
                  <th className="px-5 py-3.5 text-center">20% Báo cáo</th>
                  <th className="px-5 py-3.5 text-center">60% Doanh nghiệp</th>
                  <th className="px-5 py-3.5 text-center">Tổng</th>
                  <th className="px-5 py-3.5 text-right">Nhận xét & Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {loadingGrades ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-[#86868b]">
                      Đang tải bảng điểm học phần...
                    </td>
                  </tr>
                ) : grades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-[#86868b]">
                      Chưa có sinh viên mà Thầy/Cô là giảng viên hướng dẫn chính.
                    </td>
                  </tr>
                ) : (
                  grades.map((row: any) => {
                    const edit = gradeEdits[String(row.user_id)] || {};
                    const disabled = !!row.locked_at;
                    const hasReport = !!row.report_status;

                    return (
                      <tr key={row.user_id} className="hover:bg-[#f5f5f7]/60 transition-colors align-top">
                        <td className="px-5 py-4">
                          <div className="font-bold text-[#1d1d1f] text-xs">{row.student_name}</div>
                          <div className="text-xs text-[#86868b] font-mono mt-0.5">{row.student_id || '-'}</div>
                          <div className="text-[11px] text-[#86868b] mt-0.5">{row.class_name || '-'}</div>
                        </td>
                        <td className="px-5 py-4 text-[#1d1d1f] font-medium max-w-[180px] truncate">
                          {row.internship_place || '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                row.report_status === 'accepted'
                                  ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60'
                                  : row.report_status === 'needs_revision'
                                  ? 'bg-[#fff8eb] text-[#b25e00] border-amber-200/60'
                                  : row.report_status
                                  ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20'
                                  : 'bg-[#f5f5f7] text-[#86868b] border-black/[0.04]'
                              }`}
                            >
                              {statusLabel(row.report_status)}
                            </span>

                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`text-[10px] font-semibold ${
                                  row.grade_status === 'submitted'
                                    ? 'text-[#1d833f]'
                                    : row.grade_status === 'draft'
                                    ? 'text-[#b25e00]'
                                    : 'text-[#86868b]'
                                }`}
                              >
                                {gradeStatusLabel(row.grade_status)}
                              </span>
                              {row.locked_at && (
                                <span className="text-[9px] font-bold text-[#ff3b30] bg-[#fff2f1] border border-[#ffd8d6] px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                                  <Lock size={8} /> Đã khóa
                                </span>
                              )}
                            </div>

                            {hasReport && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <button
                                  onClick={() => openReview(row)}
                                  className="inline-flex items-center gap-1 text-[#0071e3] hover:bg-[#0071e3]/15 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer bg-[#0071e3]/10 shadow-xs"
                                >
                                  <FileText size={11} /> Xem & Chấm
                                </button>
                                <button
                                  onClick={() => downloadReport(row)}
                                  title="Tải file PDF"
                                  className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-colors cursor-pointer border border-black/[0.08]"
                                >
                                  <Download size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {SCORE_FIELDS.map((field) => {
                          const errorKey = scoreErrorKey(row.user_id, field);
                          const error = scoreErrors[errorKey];
                          return (
                            <td key={field} className="px-3 py-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                inputMode="decimal"
                                disabled={disabled}
                                value={edit[field] ?? ''}
                                onChange={(e) => updateScoreEdit(row.user_id, field, e.target.value)}
                                className={`w-18 rounded-xl px-2 py-1.5 text-xs font-bold text-center outline-none transition-all disabled:bg-[#f5f5f7] disabled:text-[#86868b] bg-[#fbfbfd] focus:bg-white ${
                                  error
                                    ? 'border border-[#ff3b30] focus:ring-2 focus:ring-[#ff3b30]/20'
                                    : 'border border-black/[0.08] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20'
                                }`}
                              />
                              {error && <div className="mt-1 text-[9px] text-[#ff3b30] font-semibold">{error}</div>}
                            </td>
                          );
                        })}

                        <td className="px-5 py-4 text-center">
                          <span className="font-mono font-black text-sm text-[#1d833f]">
                            {previewFinalScore(edit)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col gap-2 items-end min-w-[180px]">
                            <input
                              disabled={disabled}
                              value={edit.comment ?? ''}
                              onChange={(e) => updateGradeEdit(row.user_id, 'comment', e.target.value)}
                              placeholder="Nhận xét của giảng viên..."
                              className="w-full border border-black/[0.08] rounded-xl px-3 py-1.5 text-xs bg-[#fbfbfd] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all disabled:bg-[#f5f5f7] disabled:text-[#86868b]"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                disabled={disabled || savingKey === `${row.user_id}:draft`}
                                onClick={() => saveGrade(row, false)}
                                className="rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-[0.98]"
                              >
                                {savingKey === `${row.user_id}:draft` ? 'Đang lưu...' : 'Lưu nháp'}
                              </button>
                              <button
                                disabled={disabled || savingKey === `${row.user_id}:submit`}
                                onClick={() => saveGrade(row, true)}
                                className="rounded-full bg-[#0071e3] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#0077ed] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-[0.98]"
                              >
                                {savingKey === `${row.user_id}:submit` ? 'Đang nộp...' : 'Nộp điểm'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
