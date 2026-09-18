import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Download, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { API_BASE } from '../../../shared';

/**
 * Dữ liệu tối thiểu cần truyền vào panel
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

// ─── Helper ──────────────────────────────────────────────────────────────────

const reportStatusLabel = (s?: string) =>
  s === 'accepted' ? 'Đã chấp nhận'
  : s === 'needs_revision' ? 'Cần nộp lại'
  : s === 'submitted' ? 'Đã nộp'
  : 'Chưa nộp';

const reportStatusColor = (s?: string) =>
  s === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
  : s === 'needs_revision' ? 'bg-orange-50 border-orange-200 text-orange-700'
  : s === 'submitted' ? 'bg-blue-50 border-blue-200 text-blue-700'
  : 'bg-slate-50 border-slate-200 text-slate-500';

const formatBytes = (b?: number) => {
  if (!b) return '';
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const calcFinal = (p: string, r: string, c: string) => {
  const pv = p === '' ? null : Number(p);
  const rv = r === '' ? null : Number(r);
  const cv = c === '' ? null : Number(c);
  if ([pv, rv, cv].some(v => v === null || !Number.isFinite(v) || v < 0 || v > 10)) return null;
  return ((pv as number) * 0.2 + (rv as number) * 0.2 + (cv as number) * 0.6).toFixed(2);
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportReviewPanel({ target, token, onClose, onReportStatusChange, onGradeChange }: Props) {
  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Tab (mobile)
  const [activeTab, setActiveTab] = useState<'report' | 'grade'>('report');

  // Report status
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);

  // Grade form
  const isPrimary = target.is_primary !== false; // default true nếu không truyền
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
    const { saveAs } = await import('file-saver');
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
    // Validate
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
      setGradeSuccess(submit ? 'Đã nộp điểm cho Khoa!' : 'Đã lưu nháp.');
      onGradeChange?.();
      setTimeout(() => setGradeSuccess(null), 3000);
    } finally {
      setGradeSaving(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Panel container ── */}
      <div className="flex flex-col flex-1 min-h-0 m-2 md:m-4 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-[#0f172a]">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700/60 flex-shrink-0">
          <FileText size={18} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm truncate">{target.student_name}</span>
              {target.student_id && (
                <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">{target.student_id}</span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${reportStatusColor(target.report_status)}`}>
                {reportStatusLabel(target.report_status)}
              </span>
              {locked && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-950/50 border-red-800 text-red-400">
                  Điểm đã khoá
                </span>
              )}
            </div>
            {target.internship_place && (
              <div className="text-xs text-slate-400 mt-0.5 truncate">{target.internship_place}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {target.report_status && (
              <button
                onClick={handleDownload}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
              >
                <Download size={13} /> Tải PDF
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Đóng panel"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Mobile tab bar ── */}
        <div className="flex md:hidden border-b border-slate-700/60 bg-slate-900 flex-shrink-0">
          {(['report', 'grade'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'report' ? '📄 Báo cáo' : '✏️ Chấm điểm'}
            </button>
          ))}
        </div>

        {/* ── Body: split-pane ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── LEFT: PDF Viewer ── */}
          <div
            className={`
              flex-col bg-[#1e1e1e] border-r border-slate-700/60
              ${activeTab === 'report' ? 'flex' : 'hidden'} md:flex
              w-full md:w-[62%]
            `}
          >
            {pdfLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-blue-400" />
                <span className="text-sm">Đang tải báo cáo PDF...</span>
              </div>
            )}
            {pdfError && !pdfLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <AlertCircle size={40} className="text-red-400" />
                <div className="text-sm text-slate-300">
                  Không thể hiển thị PDF inline.
                  <div className="text-xs text-slate-500 mt-1">{pdfError}</div>
                </div>
                {target.report_status && (
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); handleDownload(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Download size={14} /> Tải PDF về máy
                  </a>
                )}
              </div>
            )}
            {pdfUrl && !pdfLoading && (
              <div className="flex flex-col flex-1 min-h-0 relative">
                {/* toolbar nhỏ */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] border-b border-slate-700/40 text-xs text-slate-400 flex-shrink-0">
                  <span className="truncate max-w-xs">{target.report_filename}</span>
                  {target.report_file_size && (
                    <span className="flex-shrink-0 text-slate-500">· {formatBytes(target.report_file_size)}</span>
                  )}
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-blue-400 hover:text-blue-300 flex-shrink-0"
                    title="Mở trong tab mới"
                  >
                    <ExternalLink size={12} /> Mở tab mới
                  </a>
                </div>
                <iframe
                  src={pdfUrl}
                  title={`Báo cáo - ${target.student_name}`}
                  className="flex-1 w-full border-0"
                  style={{ minHeight: 0 }}
                />
              </div>
            )}
            {/* Nếu chưa có báo cáo */}
            {!pdfLoading && !pdfUrl && !pdfError && (
              <div className="flex flex-1 items-center justify-center text-slate-500 text-sm">
                Sinh viên chưa nộp báo cáo.
              </div>
            )}
          </div>

          {/* ── RIGHT: Grading Panel ── */}
          <div
            className={`
              flex-col bg-white overflow-y-auto
              ${activeTab === 'grade' ? 'flex' : 'hidden'} md:flex
              w-full md:w-[38%]
            `}
          >
            <div className="p-5 space-y-5">

              {/* Thông tin sinh viên */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Thông tin sinh viên</h3>
                <dl className="space-y-1.5 text-xs">
                  {[
                    ['Lớp khoá học', target.class_name],
                    ['Môn học', target.course_code],
                    ['Nơi thực tập', target.internship_place],
                    ['Tên file', target.report_filename],
                    ['Dung lượng', formatBytes(target.report_file_size) || undefined],
                    ['Ngày nộp', target.report_submitted_at
                      ? new Date(target.report_submitted_at).toLocaleString('vi-VN')
                      : undefined],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={String(label)} className="flex gap-2">
                      <dt className="text-slate-400 flex-shrink-0 w-24">{label}</dt>
                      <dd className="text-slate-700 font-medium break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <hr className="border-slate-100" />

              {/* Form điểm */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Điểm thực tập
                  {!isPrimary && (
                    <span className="ml-2 normal-case font-medium text-orange-500">(Chỉ GVHD chính nhập điểm)</span>
                  )}
                </h3>

                {locked && (
                  <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <AlertCircle size={13} /> Điểm đã bị Khoa khoá — chỉ được xem.
                  </div>
                )}

                {gradeSuccess && (
                  <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={13} /> {gradeSuccess}
                  </div>
                )}

                <div className="space-y-3">
                  {[
                    { label: '20% Định kỳ', value: progress, set: setProgress, field: 'progress' },
                    { label: '20% Báo cáo', value: report, set: setReport, field: 'report' },
                    { label: '60% Công ty / GVHD', value: company, set: setCompany, field: 'company' },
                  ].map(({ label, value, set, field }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
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
                        className={`w-full rounded-xl px-3 py-2 text-sm outline-none transition-all border ${
                          scoreErrors[field]
                            ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-200 bg-slate-50/60 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
                        } disabled:bg-slate-50 disabled:text-slate-400`}
                      />
                      {scoreErrors[field] && (
                        <p className="mt-1 text-[10px] text-red-600">{scoreErrors[field]}</p>
                      )}
                    </div>
                  ))}

                  {/* Điểm tổng */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Tổng kết</span>
                    <span className={`text-xl font-bold ${finalScore ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {finalScore ?? '—'}
                    </span>
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nhận xét / Ghi chú</label>
                    <textarea
                      disabled={locked || !isPrimary}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      rows={3}
                      placeholder="Nhận xét về quá trình thực tập..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  {/* Action buttons */}
                  {isPrimary && !locked && (
                    <div className="flex gap-2">
                      <button
                        disabled={gradeSaving !== null}
                        onClick={() => saveGrade(false)}
                        className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {gradeSaving === 'draft' ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                        Lưu nháp
                      </button>
                      <button
                        disabled={gradeSaving !== null}
                        onClick={() => saveGrade(true)}
                        className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {gradeSaving === 'submit' ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                        Nộp điểm cho Khoa
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Duyệt báo cáo */}
              {target.report_status && target.report_status !== 'accepted' && (
                <>
                  <hr className="border-slate-100" />
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Duyệt báo cáo</h3>

                    {target.lecturer_comment && (
                      <div className="mb-3 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700">
                        <span className="font-semibold">Ghi chú cũ:</span> {target.lecturer_comment}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <button
                        disabled={reportSaving}
                        onClick={() => updateReportStatus('accepted')}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {reportSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Chấp nhận (OK)
                      </button>

                      {!showRevisionInput ? (
                        <button
                          disabled={reportSaving}
                          onClick={() => setShowRevisionInput(true)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
                        >
                          <AlertCircle size={13} /> Yêu cầu nộp lại
                        </button>
                      ) : (
                        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 space-y-2">
                          <textarea
                            autoFocus
                            value={revisionNote}
                            onChange={e => setRevisionNote(e.target.value)}
                            rows={3}
                            placeholder="Lý do yêu cầu nộp lại..."
                            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-100 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={reportSaving || !revisionNote.trim()}
                              onClick={() => updateReportStatus('needs_revision')}
                              className="flex-1 rounded-lg border border-orange-300 bg-orange-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                              {reportSaving ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                              Gửi yêu cầu
                            </button>
                            <button
                              onClick={() => { setShowRevisionInput(false); setRevisionNote(''); }}
                              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* Đã chấp nhận */}
              {target.report_status === 'accepted' && (
                <>
                  <hr className="border-slate-100" />
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={14} /> Báo cáo đã được chấp nhận
                  </div>
                </>
              )}

              {/* Mô tả cho đồng hướng dẫn */}
              {!isPrimary && (
                <>
                  <hr className="border-slate-100" />
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    Bạn là đồng hướng dẫn — chỉ có GVHD chính mới có thể nhập điểm và duyệt báo cáo trên hệ thống.
                  </p>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
