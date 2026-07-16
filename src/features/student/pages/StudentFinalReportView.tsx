import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Download, RefreshCw, FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import { API_BASE, CACHE_TTL, cachedJsonFetch, PageDescriptionTooltip } from '../../../shared';

export function StudentFinalReportView({ token, user }: { token: string, user: any }) {
  const [campaign, setCampaign] = useState<any>({});
  const [finalInternship, setFinalInternship] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const formatGMT7Local = (isoLocal: string) => {
    if (!isoLocal) return '—';
    const [date, time] = isoLocal.split('T');
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y} ${time}`;
  };
  const formatBytesLocal = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const reportStatusLabelLocal = (status?: string) => {
    if (status === 'accepted') return 'Đã chấp nhận';
    if (status === 'needs_revision') return 'Cần nộp lại';
    if (status === 'submitted') return 'Đã nộp';
    return 'Chưa nộp';
  };
  const finalReportWindowStatus = useMemo(() => {
    const openStr = String(campaign?.final_report_open_at || '').trim();
    const closeStr = String(campaign?.final_report_close_at || '').trim();
    if (!openStr && !closeStr) return 'unconfigured';
    const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
    const now = new Date();
    const openUTC = openStr ? toUTC(openStr) : null;
    const closeUTC = closeStr ? toUTC(closeStr) : null;
    if (openUTC && now < openUTC) return 'not_open_yet';
    if (closeUTC && now > closeUTC) return 'closed';
    return 'open';
  }, [campaign]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campRes, finalRes, reportRes] = await Promise.all([
        cachedJsonFetch<any>(`${API_BASE}/api/settings/campaign`, {
          cacheKey: 'settings:campaign',
          ttlMs: CACHE_TTL.campaign,
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/internships/final/my`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/reports/final/my`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const campData = campRes;
      const finalData = await finalRes.json().catch(() => null);
      const reportData = await reportRes.json().catch(() => null);
      if (campData && !campData.error) setCampaign(campData);
      setFinalInternship(finalData && !finalData.error ? finalData : null);
      setFinalReport(reportData && !reportData.error ? reportData : null);
    } catch (e) {
      alert('Không tải được dữ liệu báo cáo final.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uploadFinalReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      alert('Vui lòng chọn file PDF.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File PDF vượt quá 10 MB. Vui lòng nén PDF xuống tối đa 10 MB rồi nộp lại.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/final`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/pdf',
          'X-Filename': encodeURIComponent(file.name)
        },
        body: file
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Nộp báo cáo thất bại.');
      setFinalReport(data);
      alert('Đã nộp báo cáo final.');
    } catch (e) {
      alert('Lỗi kết nối khi nộp báo cáo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const downloadMyFinalReport = async () => {
    if (!finalReport) return;
    const res = await fetch(`${API_BASE}/api/reports/final/${user.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return alert('Không tải được báo cáo đã nộp.');
    saveAs(await res.blob(), finalReport.original_filename || 'final-report.pdf');
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải trang nộp báo cáo...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/')} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2">&larr; Quay lại trang chủ</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-indigo-600" /> Báo cáo final PDF
            <PageDescriptionTooltip description="Nộp bản báo cáo thực tập final để giảng viên hướng dẫn đánh giá và chấm điểm." />
          </h2>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${finalReportWindowStatus === 'open' ? 'bg-green-50 border-green-150 text-green-800' : finalReportWindowStatus === 'not_open_yet' ? 'bg-orange-50 border-orange-150 text-orange-800' : finalReportWindowStatus === 'unconfigured' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-red-50 border-red-150 text-red-800'}`}>
          <div className="font-bold text-xs uppercase tracking-wider">{finalReportWindowStatus === 'open' ? 'Đang mở nộp' : finalReportWindowStatus === 'not_open_yet' ? 'Chưa mở nộp' : finalReportWindowStatus === 'unconfigured' ? 'Chưa cấu hình' : 'Đã hết hạn'}</div>
          {finalReportWindowStatus === 'unconfigured'
            ? <div className="text-xs mt-1 font-normal text-slate-500">Khoa chưa cấu hình thời gian nộp báo cáo final.</div>
            : <div className="text-xs mt-1 font-normal">Từ {formatGMT7Local(campaign.final_report_open_at)} đến {formatGMT7Local(campaign.final_report_close_at)} GMT+7</div>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Nơi thực tập chính thức</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {finalInternship
                ? finalInternship.internship_type === 'school'
                  ? 'Thực tập tại trường'
                  : finalInternship.company_name === 'Công ty khác'
                    ? finalInternship.other_company_name || 'Công ty khác'
                    : finalInternship.company_name
                : 'Chưa xác nhận'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái báo cáo</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{reportStatusLabelLocal(finalReport?.status)}</div>
            {finalReport?.submitted_at && <div className="mt-1 text-xs text-slate-500">{new Date(finalReport.submitted_at).toLocaleString('vi-VN')}</div>}
          </div>
        </div>

        {!finalInternship ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Bạn cần xác nhận nơi thực tập chính thức trước khi nộp báo cáo final.
          </div>
        ) : (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            {finalReport ? (
              <div className="text-sm text-indigo-950 space-y-1">
                <div>File đã nộp: <strong>{finalReport.original_filename}</strong> ({formatBytesLocal(Number(finalReport.file_size || 0))})</div>
                {finalReport.lecturer_comment && <div className="text-orange-700">Ghi chú GVHD: {finalReport.lecturer_comment}</div>}
              </div>
            ) : (
              <div className="text-sm text-indigo-950">Chưa có file báo cáo final.</div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          {finalReport && (
            <button onClick={downloadMyFinalReport} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:shadow">
              <Download size={14} /> Tải PDF đã nộp
            </button>
          )}
          <label className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${finalInternship && finalReportWindowStatus === 'open' && !uploading ? 'bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-250'}`}>
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {finalReport ? 'Nộp lại PDF' : 'Nộp PDF'}
            <input type="file" accept="application/pdf,.pdf" disabled={!finalInternship || finalReportWindowStatus !== 'open' || uploading} className="hidden" onChange={uploadFinalReport} />
          </label>
        </div>
        <p className="text-xs text-slate-400 font-medium">Chỉ nhận file PDF tối đa 10 MB. Nếu file lớn hơn, vui lòng nén lại trước khi nộp.</p>
      </div>
    </div>
  );
}
