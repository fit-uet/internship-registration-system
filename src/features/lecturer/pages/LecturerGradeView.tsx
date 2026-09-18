import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2, RefreshCw, FileText, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { API_BASE, Button, PageDescriptionTooltip, PageHeader } from '../../../shared';
import { ReportReviewPanel, type ReviewTarget } from './ReportReviewPanel';

const SCORE_FIELDS = ['progress_score', 'report_score', 'company_score'] as const;
type ScoreField = typeof SCORE_FIELDS[number];

export function LecturerGradeView({ token, user }: { token: string, user: any }) {
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
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setGrades(list);
        setGradeEdits(Object.fromEntries(list.map((row: any) => [String(row.user_id), {
          progress_score: row.progress_score ?? '',
          report_score: row.report_score ?? '',
          company_score: row.company_score ?? '',
          comment: row.comment || ''
        }])));
        setScoreErrors({});
      })
      .catch(() => setGrades([]))
      .finally(() => setLoadingGrades(false));
  };

  useEffect(() => { fetchGrades(); }, [token]);

  const statusLabel = (status?: string) => status === 'accepted' ? 'Đã chấp nhận' : status === 'needs_revision' ? 'Cần nộp lại' : status === 'submitted' ? 'Đã nộp' : 'Chưa nộp';
  const gradeStatusLabel = (status?: string) => status === 'submitted' ? 'Đã nộp' : status === 'draft' ? 'Nháp' : 'Chưa có';
  const previewFinalScore = (edit: any) => {
    const p = edit?.progress_score === '' ? null : Number(edit?.progress_score);
    const r = edit?.report_score === '' ? null : Number(edit?.report_score);
    const c = edit?.company_score === '' ? null : Number(edit?.company_score);
    if (![p, r, c].every(v => v !== null && Number.isFinite(v) && v >= 0 && v <= 10)) return '-';
    return ((p as number) * 0.2 + (r as number) * 0.2 + (c as number) * 0.6).toFixed(2);
  };

  const updateGradeEdit = (userId: number, key: string, value: string) => {
    setGradeEdits(prev => ({ ...prev, [userId]: { ...(prev[String(userId)] || {}), [key]: value } }));
  };

  const scoreErrorKey = (userId: number, field: ScoreField) => `${userId}:${field}`;
  const clearScoreError = (userId: number, field: ScoreField) => {
    const errorKey = scoreErrorKey(userId, field);
    setScoreErrors(prev => { if (!prev[errorKey]) return prev; const next = { ...prev }; delete next[errorKey]; return next; });
  };
  const updateScoreEdit = (userId: number, field: ScoreField, value: string) => {
    if (value === '') { clearScoreError(userId, field); updateGradeEdit(userId, field, value); return; }
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      setScoreErrors(prev => ({ ...prev, [scoreErrorKey(userId, field)]: 'Điểm chỉ được từ 0 đến 10.' }));
      return;
    }
    clearScoreError(userId, field);
    updateGradeEdit(userId, field, value);
  };

  const saveGrade = async (row: any, submit = false) => {
    const edit = gradeEdits[String(row.user_id)] || {};
    const validationErrors: Record<string, string> = {};
    SCORE_FIELDS.forEach(field => {
      const value = edit[field];
      const score = value === '' || value === null || value === undefined ? null : Number(value);
      if (submit && score === null) validationErrors[scoreErrorKey(row.user_id, field)] = 'Vui lòng nhập điểm.';
      else if (score !== null && (!Number.isFinite(score) || score < 0 || score > 10)) {
        validationErrors[scoreErrorKey(row.user_id, field)] = 'Điểm chỉ được từ 0 đến 10.';
      }
    });
    const hasExistingInputError = SCORE_FIELDS.some(field => scoreErrors[scoreErrorKey(row.user_id, field)]);
    if (Object.keys(validationErrors).length > 0 || hasExistingInputError) {
      if (Object.keys(validationErrors).length > 0) setScoreErrors(prev => ({ ...prev, ...validationErrors }));
      return;
    }
    const key = `${row.user_id}:${submit ? 'submit' : 'draft'}`;
    setSavingKey(key);
    try {
      const endpoint = `${API_BASE}/api/lecturer/grades/${row.user_id}${submit ? '/submit' : ''}`;
      const res = await fetch(endpoint, {
        method: submit ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(edit)
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu điểm thất bại.');
      fetchGrades();
    } finally { setSavingKey(null); }
  };

  const downloadReport = async (row: any) => {
    const res = await fetch(`${API_BASE}/api/reports/final/${row.user_id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return alert('Không tải được báo cáo.');
    saveAs(await res.blob(), `${row.student_id || 'final'}-final-report.pdf`);
  };

  // Mở review panel cho một sinh viên
  const openReview = (row: any) => {
    const edit = gradeEdits[String(row.user_id)] || {};
    setReviewTarget({
      user_id: row.user_id,
      student_name: row.student_name,
      student_id: row.student_id,
      class_name: row.class_name,
      course_code: row.course_code,
      internship_place: row.internship_place,
      report_status: row.report_status,
      report_filename: row.report_filename,
      report_file_size: row.report_file_size,
      report_submitted_at: row.report_submitted_at,
      lecturer_comment: row.lecturer_comment,
      progress_score: edit.progress_score,
      report_score: edit.report_score,
      company_score: edit.company_score,
      comment: edit.comment,
      grade_status: row.grade_status,
      locked_at: row.locked_at,
      is_primary: true, // trang này chỉ hiện với GVHD chính
    });
  };

  const stats = {
    total: grades.length,
    missing: grades.filter(row => !row.grade_status || row.grade_status === 'missing').length,
    draft: grades.filter(row => row.grade_status === 'draft').length,
    submitted: grades.filter(row => row.grade_status === 'submitted').length,
    locked: grades.filter(row => row.locked_at).length,
  };

  return (
    <>
      {/* ── Review Panel overlay ── */}
      {reviewTarget && (
        <ReportReviewPanel
          target={reviewTarget}
          token={token}
          onClose={() => setReviewTarget(null)}
          onReportStatusChange={fetchGrades}
          onGradeChange={fetchGrades}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={<>Chấm điểm thực tập <PageDescriptionTooltip description={
            <>
              <p>Chỉ giảng viên hướng dẫn chính được nhập và nộp điểm. Đồng hướng dẫn vẫn có thể xem sinh viên phụ trách và báo cáo ở trang chủ, nhưng không chấm điểm trên hệ thống.</p>
              <p className="mt-1 font-semibold">Công thức: 20% định kỳ, 20% báo cáo, 60% đánh giá công ty/GVHD.</p>
            </>
          } /></>}
          description="Nhấn «Xem & Chấm» để xem báo cáo PDF và nhập điểm cùng một màn hình."
          icon={<CheckCircle2 size={20} />}
          actions={
            <>
              <Button onClick={() => navigate(user.role === 'admin' ? '/admin' : '/')} size="sm">
                &larr; {user.role === 'admin' ? 'Quay lại Quản trị' : 'Quay lại trang chủ'}
              </Button>
              <Button onClick={fetchGrades} disabled={loadingGrades} size="sm" leadingIcon={<RefreshCw size={14} className={loadingGrades ? 'animate-spin' : ''} />}>
                Tải lại
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Tổng sinh viên', stats.total, 'text-slate-900'],
            ['Chưa có điểm', stats.missing, 'text-slate-600'],
            ['Nháp', stats.draft, 'text-orange-700'],
            ['Đã nộp', stats.submitted, 'text-emerald-700'],
            ['Đã khóa', stats.locked, 'text-red-700'],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
              <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50/75 text-slate-700 font-semibold border-b border-slate-100 text-[10px] tracking-wider uppercase select-none">
                  <th className="p-4">Sinh viên</th>
                  <th className="p-4">Nơi thực tập</th>
                  <th className="p-4">Báo cáo</th>
                  <th className="p-4">20% định kỳ</th>
                  <th className="p-4">20% final</th>
                  <th className="p-4">60% đánh giá</th>
                  <th className="p-4">Tổng</th>
                  <th className="p-4">Ghi chú / Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingGrades ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Đang tải bảng điểm...</td></tr>
                ) : grades.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Chưa có sinh viên mà Thầy/Cô là giảng viên hướng dẫn chính. Nếu chỉ là đồng hướng dẫn, Thầy/Cô không nhập điểm trên hệ thống.</td></tr>
                ) : grades.map((row: any) => {
                  const edit = gradeEdits[String(row.user_id)] || {};
                  const disabled = !!row.locked_at;
                  const hasReport = !!row.report_status;
                  return (
                    <tr key={row.user_id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{row.student_name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{row.student_id || '-'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{row.class_name || '-'}</div>
                      </td>
                      <td className="p-4 text-xs text-slate-600 max-w-[200px]">{row.internship_place || '-'}</td>
                      <td className="p-4 text-xs">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            row.report_status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            row.report_status === 'needs_revision' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            row.report_status ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {statusLabel(row.report_status)}
                          </span>
                          <span className={`text-[11px] font-medium ${
                            row.grade_status === 'submitted' ? 'text-emerald-600' :
                            row.grade_status === 'draft' ? 'text-orange-600' :
                            'text-slate-400'
                          }`}>
                            {gradeStatusLabel(row.grade_status)}
                          </span>
                          {row.locked_at && (
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                              Đã khóa
                            </span>
                          )}
                          {hasReport && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <button
                                onClick={() => openReview(row)}
                                className="inline-flex items-center gap-1 text-[#0071e3] hover:bg-[#ebf4ff] px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-[#dbeafe] bg-[#ebf4ff]/70 shadow-xs active:scale-[0.98]"
                              >
                                <FileText size={12} /> Xem & Chấm
                              </button>
                              <button
                                onClick={() => downloadReport(row)}
                                title="Tải file PDF"
                                className="p-1 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 bg-white shadow-xs active:scale-[0.98]"
                              >
                                <Download size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      {SCORE_FIELDS.map(field => {
                        const errorKey = scoreErrorKey(row.user_id, field);
                        const error = scoreErrors[errorKey];
                        return <td key={field} className="p-4">
                          <input
                            type="number" min="0" max="10" step="0.1" inputMode="decimal"
                            disabled={disabled}
                            value={edit[field] ?? ''}
                            onChange={e => updateScoreEdit(row.user_id, field, e.target.value)}
                            aria-invalid={Boolean(error)}
                            className={`w-20 rounded-xl px-2 py-1.5 text-xs font-semibold text-center outline-none transition-all disabled:bg-slate-100/60 disabled:text-slate-400 bg-white shadow-xs ${error ? 'border border-[#ff3b30] focus:ring-2 focus:ring-[#ff3b30]/20' : 'border border-[#d1d1d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20'}`}
                          />
                          {error && <div className="mt-1 max-w-24 text-[10px] leading-tight text-red-600">{error}</div>}
                        </td>;
                      })}
                      <td className="p-4 font-bold text-[#1b7f37] text-sm">{previewFinalScore(edit)}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2 min-w-[180px]">
                          <input
                            disabled={disabled}
                            value={edit.comment ?? ''}
                            onChange={e => updateGradeEdit(row.user_id, 'comment', e.target.value)}
                            placeholder="Nhận xét / ghi chú"
                            className="border border-[#d1d1d6] rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all disabled:bg-slate-100/60 disabled:text-slate-400 bg-white shadow-xs"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button disabled={disabled || savingKey === `${row.user_id}:draft`} onClick={() => saveGrade(row, false)} className="rounded-xl border border-[#e5e5ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-[0.98]">
                              {savingKey === `${row.user_id}:draft` ? 'Đang lưu...' : 'Lưu nháp'}
                            </button>
                            <button disabled={disabled || savingKey === `${row.user_id}:submit`} onClick={() => saveGrade(row, true)} className="rounded-xl bg-[#0071e3] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0077ed] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-[0.98]">
                              {savingKey === `${row.user_id}:submit` ? 'Đang nộp...' : 'Nộp điểm'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
