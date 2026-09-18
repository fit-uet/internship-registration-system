import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Download, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, FileText, Check
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { API_BASE } from '../../../shared';

/**
 * Dữ liệu cần truyền vào panel xem báo cáo và chấm điểm
 */
export interface ReviewTarget {
  user_id: number;
  student_name: string;
  student_id?: string;
  class_name?: string;
  course_code?: string;
  internship_place?: string;
  report_status?: string;       // 'submitted' | 'accepted' | 'needs_revision'
  report_filename?: string;
  report_file_size?: number;
  report_submitted_at?: string;
  lecturer_comment?: string;
  // Điểm
  progress_score?: number | string | null;
  report_score?: number | string | null;
  company_score?: number | string | null;
  final_score?: number | string | null;
  comment?: string | null;
  grade_status?: string;         // 'draft' | 'submitted'
  locked_at?: string | null;
  // Quyền
  is_primary?: boolean;          // chỉ GVHD chính mới nhập điểm
}

interface Props {
  target: ReviewTarget;
  token: string;
  onClose: () => void;
  onReportStatusChange?: () => void;   // callback reload danh sách sau khi duyệt báo cáo
  onGradeChange?: () => void;          // callback reload danh sách sau khi lưu/nộp điểm
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reportStatusLabel = (s?: string) =>
  s === 'accepted' ? 'Đã chấp nhận'
  : s === 'needs_revision' ? 'Cần nộp lại'
  : s === 'submitted' ? 'Đã nộp báo cáo'
  : 'Chưa nộp';

const reportStatusBadgeClass = (s?: string) =>
  s === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
  : s === 'needs_revision' ? 'bg-orange-50 border-orange-200 text-orange-700'
  : s === 'submitted' ? 'bg-blue-50 border-blue-200 text-blue-700'
  : 'bg-slate-50 border-slate-200 text-slate-600';

const formatBytes = (b?: number) => {
  if (!b) return '';
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const calcFinal = (p: string, r: string, c: string) => {
  const pv = p === '' ? null : Number(p);
  const rv = r === '' ? null : Number(r);
  const cv = c === '' ? null : Number(c);
  if ([pv, rv, cv].some(v => v === null || !Number.isFinite(v) || (v as number) < 0 || (v as number) > 10)) return null;
  return ((pv as number) * 0.2 + (rv as number) * 0.2 + (cv as number) * 0.6).toFixed(2);
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportReviewPanel({ target, token, onClose, onReportStatusChange, onGradeChange }: Props) {
  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Tab (mobile only)
  const [activeTab, setActiveTab] = useState<'report' | 'grade'>('report');

  // Report status
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);

  // Grade form
  const isPrimary = target.is_primary !== false;
  const locked = !!target.locked_at;
  const [progress, setProgress] = useState(String(target.progress_score ?? ''));
  const [report, setReport] = useState(String(target.report_score ?? ''));
  const [company, setCompany] = useState(String(target.company_score ?? ''));
  const [noteText, setNoteText] = useState(target.comment ?? '');
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [gradeSaving, setGradeSaving] = useState<null | 'draft' | 'submit'>(null);
  const [gradeSuccess, setGradeSuccess] = useState<string | null>(null);

  const finalScore = calcFinal(progress, report, company);

  // ── Load PDF via fetch + blob URL ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(null);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports/final/${target.user_id}/view`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setPdfUrl(url);
      } catch (e: any) {
        if (!cancelled) setPdfError(e.message || 'Không tải được file báo cáo.');
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [target.user_id, token]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Prevent body scroll ───────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/reports/final/${target.user_id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('Không tải được báo cáo.');
    saveAs(await res.blob(), target.report_filename || 'final-report.pdf');
  }, [target.user_id, target.report_filename, token]);

  // ── Report status actions ─────────────────────────────────────────────────
  const updateReportStatus = async (status: 'accepted' | 'needs_revision') => {
    setReportSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/final/${target.user_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, lecturer_comment: status === 'needs_revision' ? revisionNote : '' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Cập nhật thất bại.');
        return;
      }
      setShowRevisionInput(false);
      setRevisionNote('');
      onReportStatusChange?.();
    } finally {
      setReportSaving(false);
    }
  };

  // ── Grade actions ─────────────────────────────────────────────────────────
  const validateScore = (val: string, field: string) => {
    if (val === '') return true;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      setScoreErrors(prev => ({ ...prev, [field]: 'Điểm từ 0 đến 10.' }));
      return false;
    }
    setScoreErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    return true;
  };

  const saveGrade = async (submit: boolean) => {
    const allValid = [
      validateScore(progress, 'progress'),
      validateScore(report, 'report'),
      validateScore(company, 'company'),
    ].every(Boolean);
    if (!allValid) return;
    if (submit && [progress, report, company].some(v => v === '')) {
      alert('Vui lòng nhập đủ 3 đầu điểm trước khi nộp.');
      return;
    }

    setGradeSaving(submit ? 'submit' : 'draft');
    setGradeSuccess(null);
    try {
      const endpoint = `${API_BASE}/api/lecturer/grades/${target.user_id}${submit ? '/submit' : ''}`;
      const res = await fetch(endpoint, {
        method: submit ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          progress_score: progress === '' ? null : Number(progress),
          report_score: report === '' ? null : Number(report),
          company_score: company === '' ? null : Number(company),
          comment: noteText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || 'Lưu điểm thất bại.'); return; }
      setGradeSuccess(submit ? 'Đã nộp điểm cho Khoa thành công!' : 'Đã lưu nháp điểm.');
      onGradeChange?.();
      setTimeout(() => setGradeSuccess(null), 3000);
    } finally {
      setGradeSaving(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    /* Modal Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full h-[95vh] max-w-7xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 truncate">{target.student_name}</h2>
                {target.student_id && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {target.student_id}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${reportStatusBadgeClass(target.report_status)}`}>
                  {reportStatusLabel(target.report_status)}
                </span>
                {locked && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-50 border-red-200 text-red-700">
                    Điểm đã khóa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                {target.class_name && <span>{target.class_name}</span>}
                {target.course_code && <span>· {target.course_code}</span>}
                {target.internship_place && <span>· {target.internship_place}</span>}
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {target.report_status && (
              <button
                onClick={handleDownload}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} /> Tải PDF
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Mobile Tab Switcher ── */}
        <div className="flex md:hidden border-b border-slate-200 bg-slate-50/80 flex-shrink-0 px-2 pt-1 gap-1">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              activeTab === 'report'
                ? 'bg-white text-blue-700 border-t border-x border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Báo cáo PDF
          </button>
          <button
            onClick={() => setActiveTab('grade')}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              activeTab === 'grade'
                ? 'bg-white text-blue-700 border-t border-x border-slate-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chấm điểm & Duyệt
          </button>
        </div>

        {/* ── Modal Body: Split-pane ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── LEFT PANE: PDF Viewer ── */}
          <div
            className={`
              flex-col bg-slate-100 border-r border-slate-200
              ${activeTab === 'report' ? 'flex' : 'hidden'} md:flex
              w-full md:w-[58%] lg:w-[62%] relative
            `}
          >
            {pdfLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <span className="text-xs font-medium">Đang tải tài liệu PDF...</span>
              </div>
            )}

            {pdfError && !pdfLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div className="text-sm font-semibold text-slate-800">Không thể mở xem trực tiếp PDF</div>
                <div className="text-xs text-slate-500 max-w-sm">{pdfError}</div>
                {target.report_status && (
                  <button
                    onClick={handleDownload}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Download size={14} /> Tải file PDF về máy
                  </button>
                )}
              </div>
            )}

            {pdfUrl && !pdfLoading && (
              <div className="flex flex-col flex-1 min-h-0 relative">
                {/* Minimal PDF sub-header */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-xs border-b border-slate-200 text-xs text-slate-600 flex-shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="font-semibold text-slate-800 truncate">{target.report_filename || 'Báo cáo thực tập'}</span>
                    {target.report_file_size ? (
                      <span className="text-slate-400 flex-shrink-0">({formatBytes(target.report_file_size)})</span>
                    ) : null}
                    {target.report_submitted_at && (
                      <span className="text-slate-400 hidden lg:inline flex-shrink-0 ml-1">
                        · Nộp: {new Date(target.report_submitted_at).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold flex-shrink-0 transition-colors"
                    title="Mở PDF trong tab mới của trình duyệt"
                  >
                    <ExternalLink size={13} /> Mở tab mới
                  </a>
                </div>

                {/* PDF iframe */}
                <iframe
                  src={pdfUrl}
                  title={`Báo cáo - ${target.student_name}`}
                  className="flex-1 w-full border-0 bg-white"
                  style={{ minHeight: 0 }}
                />
              </div>
            )}

            {!pdfLoading && !pdfUrl && !pdfError && (
              <div className="flex flex-1 items-center justify-center text-slate-400 text-xs font-medium">
                Sinh viên chưa nộp báo cáo.
              </div>
            )}
          </div>

          {/* ── RIGHT PANE: Review & Grading ── */}
          <div
            className={`
              flex-col bg-white overflow-y-auto
              ${activeTab === 'grade' ? 'flex' : 'hidden'} md:flex
              w-full md:w-[42%] lg:w-[38%]
            `}
          >
            <div className="p-5 space-y-5">

              {/* 1. DUYỆT BÁO CÁO */}
              {target.report_status && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Trạng thái báo cáo</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${reportStatusBadgeClass(target.report_status)}`}>
                      {reportStatusLabel(target.report_status)}
                    </span>
                  </div>

                  {target.report_status === 'accepted' ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                        <span>Báo cáo đã được duyệt chấp nhận</span>
                      </div>
                      {isPrimary && (
                        <button
                          onClick={() => setShowRevisionInput(true)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                        >
                          Yêu cầu sửa lại
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {target.lecturer_comment && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                          <span className="font-semibold">Lý do yêu cầu nộp lại:</span> {target.lecturer_comment}
                        </div>
                      )}

                      {isPrimary && !showRevisionInput && (
                        <div className="flex gap-2">
                          <button
                            disabled={reportSaving}
                            onClick={() => updateReportStatus('accepted')}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {reportSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                            Chấp nhận báo cáo
                          </button>
                          <button
                            disabled={reportSaving}
                            onClick={() => setShowRevisionInput(true)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <AlertCircle size={13} />
                            Yêu cầu nộp lại
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Form yêu cầu nộp lại */}
                  {showRevisionInput && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        autoFocus
                        value={revisionNote}
                        onChange={e => setRevisionNote(e.target.value)}
                        rows={2}
                        placeholder="Nhập lý do hoặc nội dung sinh viên cần chỉnh sửa..."
                        className="w-full rounded-lg border border-orange-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-orange-100 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setShowRevisionInput(false); setRevisionNote(''); }}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          disabled={reportSaving || !revisionNote.trim()}
                          onClick={() => updateReportStatus('needs_revision')}
                          className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {reportSaving && <Loader2 size={12} className="animate-spin inline mr-1" />}
                          Gửi yêu cầu
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. CHẤM ĐIỂM THỰC TẬP */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Điểm đánh giá thực tập</h3>
                  {!isPrimary && (
                    <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Chỉ GVHD chính nhập điểm
                    </span>
                  )}
                </div>

                {locked && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <AlertCircle size={15} /> Điểm đã bị Khoa khóa — chỉ được xem, không thể sửa.
                  </div>
                )}

                {gradeSuccess && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={15} /> {gradeSuccess}
                  </div>
                )}

                {/* 3 Điểm thành phần */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Định kỳ', weight: '20%', value: progress, set: setProgress, field: 'progress' },
                    { label: 'Báo cáo', weight: '20%', value: report, set: setReport, field: 'report' },
                    { label: 'Đơn vị / GV', weight: '60%', value: company, set: setCompany, field: 'company' },
                  ].map(({ label, weight, value, set, field }) => (
                    <div key={field} className="space-y-1">
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="text-slate-400 text-[10px]">{weight}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        inputMode="decimal"
                        disabled={locked || !isPrimary}
                        value={value}
                        onChange={e => {
                          set(e.target.value);
                          if (scoreErrors[field]) {
                            setScoreErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
                          }
                        }}
                        onBlur={e => validateScore(e.target.value, field)}
                        placeholder="0 – 10"
                        className={`w-full rounded-xl px-2 py-2 text-center text-sm font-semibold outline-none transition-all border ${
                          scoreErrors[field]
                            ? 'border-red-400 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        } disabled:bg-slate-100 disabled:text-slate-400`}
                      />
                      {scoreErrors[field] && (
                        <p className="text-[10px] text-red-600 text-center">{scoreErrors[field]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Điểm tổng kết */}
                <div className="rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-100 p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Điểm tổng kết</div>
                    <div className="text-[11px] text-slate-500">20% Định kỳ + 20% Báo cáo + 60% Đơn vị</div>
                  </div>
                  <div className={`text-2xl font-extrabold ${finalScore ? 'text-blue-700' : 'text-slate-300'}`}>
                    {finalScore ?? '—'}
                  </div>
                </div>

                {/* Ghi chú / Nhận xét */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nhận xét của GVHD</label>
                  <textarea
                    disabled={locked || !isPrimary}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={3}
                    placeholder="Nhận xét về thái độ, kỹ năng, kết quả thực tập..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {/* Buttons Lưu / Nộp */}
                {isPrimary && !locked && (
                  <div className="flex gap-2.5 pt-1">
                    <button
                      disabled={gradeSaving !== null}
                      onClick={() => saveGrade(false)}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {gradeSaving === 'draft' && <Loader2 size={13} className="animate-spin inline mr-1" />}
                      Lưu nháp
                    </button>
                    <button
                      disabled={gradeSaving !== null}
                      onClick={() => saveGrade(true)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#075fc7] hover:bg-[#084c9e] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {gradeSaving === 'submit' && <Loader2 size={13} className="animate-spin inline mr-1" />}
                      Nộp điểm cho Khoa
                    </button>
                  </div>
                )}

                {/* Thông báo cho đồng hướng dẫn */}
                {!isPrimary && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-200 leading-relaxed">
                    Thầy/Cô là đồng hướng dẫn — chỉ có GVHD chính mới nhập điểm và duyệt báo cáo trên hệ thống.
                  </p>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
