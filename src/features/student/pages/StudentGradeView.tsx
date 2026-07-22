import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { API_BASE, Button, PageHeader } from '../../../shared';

export function StudentGradeView({ token }: { token: string }) {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const statusLabel = (status?: string) => status === 'submitted' ? 'Đã nộp' : status === 'draft' ? 'Nháp' : 'Chưa có điểm';
  const scoreText = (value: any) => value === null || value === undefined || value === '' ? '-' : value;
  const splitCsv = (value?: string) => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  const renderAdvisorEmails = (emails?: string) => {
    const items = splitCsv(emails);
    if (items.length === 0) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map(email => (
          <a key={email} href={`mailto:${email}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 hover:underline">
            {email}
          </a>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const fetchGrade = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/grades/my`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setGrade(data && !data.error ? data : null);
      } catch (e) {
        alert('Không tải được điểm thực tập.');
      } finally {
        setLoading(false);
      }
    };
    fetchGrade();
  }, [token]);

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải điểm thực tập...</div>;

  const scoreCards = [
    { label: 'Điểm định kỳ', value: grade?.progress_score, note: '20%' },
    { label: 'Điểm báo cáo final', value: grade?.report_score, note: '20%' },
    { label: 'Điểm công ty/GVHD', value: grade?.company_score, note: '60%' },
    { label: 'Điểm tổng kết', value: grade?.final_score, note: 'Tạm tính', highlight: true },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/')}
          className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer mb-2"
        >
          &larr; Quay lại trang chủ
        </button>
        <PageHeader
          title="Điểm thực tập"
          description="Theo dõi kết quả đánh giá và trạng thái nộp điểm của học phần."
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-5">
            <div className="text-xs uppercase font-semibold text-slate-500">Nơi thực tập</div>
            <div className="mt-2 text-base font-semibold text-slate-900">{grade?.internship_place || 'Chưa xác nhận'}</div>
            {grade?.confirmed_at && <div className="mt-1 text-xs text-slate-500">Xác nhận: {new Date(grade.confirmed_at).toLocaleString('vi-VN')}</div>}
          </div>
          <div className="p-5">
            <div className="text-xs uppercase font-semibold text-slate-500">Giảng viên hướng dẫn</div>
            <div className="mt-2 text-base font-semibold text-slate-900">{grade?.primary_advisors || 'Chưa phân công'}</div>
            {renderAdvisorEmails(grade?.primary_advisor_emails)}
            {grade?.co_advisors && (
              <div className="mt-2">
                <div className="text-xs text-slate-500">Đồng hướng dẫn: {grade.co_advisors}</div>
                {renderAdvisorEmails(grade?.co_advisor_emails)}
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="text-xs uppercase font-semibold text-slate-500">Trạng thái điểm</div>
            <div className={`mt-2 text-base font-bold ${grade?.grade_status === 'submitted' ? 'text-emerald-700' : grade?.grade_status === 'draft' ? 'text-orange-700' : 'text-slate-500'}`}>
              {statusLabel(grade?.grade_status)}
            </div>
            {grade?.grade_submitted_at && <div className="mt-1 text-xs text-slate-500">Nộp lúc: {new Date(grade.grade_submitted_at).toLocaleString('vi-VN')}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreCards.map(card => (
          <div key={card.label} className={`rounded-2xl border p-5 shadow-sm ${card.highlight ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-700">{card.label}</div>
              <div className="text-xs rounded-full bg-slate-100 text-slate-600 px-2 py-1">{card.note}</div>
            </div>
            <div className={`mt-4 text-4xl font-bold ${card.highlight ? 'text-green-700' : 'text-slate-900'}`}>{scoreText(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">Thông tin bổ sung</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase font-semibold text-slate-500">Người nhập điểm</div>
            <div className="mt-1 font-medium text-slate-800">{grade?.grading_lecturer_name || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase font-semibold text-slate-500">Ghi chú</div>
            <div className="mt-1 whitespace-pre-wrap text-slate-700">{grade?.comment || '-'}</div>
          </div>
        </div>
        {grade?.locked_at && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">Điểm đã được Khoa khóa.</div>}
      </div>
    </div>
  );
}
