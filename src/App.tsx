import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HashRouter, Routes, Route, useNavigate, Navigate, useParams, Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, User as UserIcon, Users, Upload, CheckCircle2, Download, LogIn, LayoutDashboard, ArrowUpDown, Search, AlertTriangle, ChevronRight, Building2, RefreshCw, Save, Plus, Trash2, X, ChevronDown, FileText, Edit2, Shield, Clock, Send, Bell, CircleHelp, Settings } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import TurndownService from 'turndown';

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '109463395923-mock.apps.googleusercontent.com';
const GOOGLE_API_KEY = (import.meta as any).env.VITE_GOOGLE_API_KEY || '';
const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
const cohortOptionsForYear = (yearValue: string | number) => {
  const year = Number(String(yearValue || '').match(/\d{4}/)?.[0] || 2026);
  const first = Math.max(1, year - 1960);
  return Array.from({ length: 5 }, (_, idx) => {
    const cohortNumber = first + idx;
    return {
      key: `K${cohortNumber}`,
      prefix: `${cohortNumber - 45}02`,
    };
  });
};
const defaultAllowedCohortsForYear = (yearValue: string | number) =>
  cohortOptionsForYear(yearValue).slice(0, 3).map(item => item.key).join(',');
const DEFAULT_REGISTRATION_RULES = [
  'Chỉ dành cho sinh viên nhận được thông báo.',
  'Mỗi sinh viên chọn tối đa 05 nơi thực tập.',
  'Sinh viên có thể lựa chọn các công ty không có trong Danh sách (các công ty đăng ký tiếp nhận thực tập sinh chính thức với Khoa). Nếu công ty đó có trong danh sách các công ty đã được Khoa thẩm định chất lượng thì sẽ được phê duyệt tự động. Ngược lại, công ty đó sẽ được Khoa xem xét và phê duyệt sau.',
  'Sinh viên có nhu cầu Thực tập tại trường có thể đăng ký Nơi thực tập là Trường Đại học Công nghệ, lưu ý phải tìm và được sự đồng ý hướng dẫn của Giảng viên Khoa CNTT.',
  'Sinh viên có thể thay đổi đăng ký bằng cách chọn "Huỷ tất cả đăng ký" và đăng ký lại từ đầu trong thời gian Khoa mở đăng ký.',
].join('\n');

const normalizeRegistrationRulesMarkdown = (content: string) => {
  const text = String(content || '').trim();
  if (!text) return '';
  const hasMarkdownSyntax = /(^|\n)\s{0,3}(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+|```|\|.+\|)/.test(text)
    || /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/.test(text);
  if (hasMarkdownSyntax) return text.replace(/^(\s*)•\s+/gm, '$1- ');
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .map(line => `- ${line}`)
    .join('\n');
};

const RegistrationRulesMarkdown = ({ content }: { content: string }) => (
  <div className="registration-rules-markdown text-sm text-blue-50">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node, ...props }) => <h1 className="text-base font-bold text-white mb-3" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-white mt-4 mb-2" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-white mt-3 mb-2" {...props} />,
        p: ({ node, ...props }) => <p className="mb-3 leading-relaxed text-blue-50" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-2 marker:text-blue-300" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-2 marker:text-blue-300" {...props} />,
        li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
        em: ({ node, ...props }) => <em className="text-blue-100" {...props} />,
        a: ({ node, ...props }) => <a className="text-cyan-200 underline hover:text-white" target="_blank" rel="noreferrer" {...props} />,
        code: ({ node, ...props }) => <code className="bg-blue-950/40 text-cyan-100 px-1 py-0.5 rounded" {...props} />,
        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-300 pl-3 italic text-blue-100 my-3" {...props} />,
        table: ({ node, ...props }) => <div className="overflow-x-auto my-3"><table className="min-w-full border border-blue-300/40 text-xs" {...props} /></div>,
        th: ({ node, ...props }) => <th className="border border-blue-300/40 px-2 py-1 text-left text-white" {...props} />,
        td: ({ node, ...props }) => <td className="border border-blue-300/30 px-2 py-1 text-blue-50" {...props} />,
      }}
    >
      {normalizeRegistrationRulesMarkdown(content)}
    </ReactMarkdown>
  </div>
);
const DEFAULT_STUDENT_FAQ = `## FAQ cho sinh viên

### 1. Em được đăng ký tối đa bao nhiêu nơi thực tập?
Mỗi sinh viên được đăng ký tối đa 05 nơi thực tập trong thời gian Khoa mở đăng ký.

### 2. Em có thể đăng ký công ty tự liên hệ không?
Có. Nếu công ty đã nằm trong danh sách thẩm định nội bộ của Khoa, đăng ký sẽ được duyệt tự động. Nếu chưa có, Khoa sẽ xem xét và duyệt thủ công.

### 3. Sau khi có kết quả phỏng vấn, em cần làm gì?
Em cần đăng nhập hệ thống và xác nhận đúng một nơi thực tập chính thức đã trúng tuyển trong thời hạn Khoa cho phép.

### 4. Nếu không trúng tuyển công ty nào thì sao?
Em có thể đăng ký thực tập tại trường. Nếu đã được giảng viên đồng ý, em chọn giảng viên đó; nếu chưa, chọn phương án nhờ Khoa phân công.

### 5. Báo cáo final nộp ở đâu và định dạng gì?
Em nộp báo cáo final trên hệ thống trong thời gian mở nộp. File phải là PDF và không vượt quá 10 MB. Báo cáo định kỳ vẫn trao đổi trực tiếp với giảng viên qua email.

### 6. Em thấy đăng ký bị từ chối thì xem lý do ở đâu?
Lý do hoặc nhận xét của Khoa được hiển thị trong hồ sơ đăng ký và trong mục Thông báo.`;

const DEFAULT_LECTURER_FAQ = `## FAQ cho giảng viên

### 1. Giảng viên xem danh sách sinh viên được phân công ở đâu?
Giảng viên đăng nhập hệ thống bằng email VNU, trang chủ giảng viên sẽ hiển thị danh sách sinh viên được Khoa phân công hướng dẫn hoặc đồng hướng dẫn.

### 2. Giảng viên cần đánh giá những gì trên hệ thống?
Giảng viên nhập điểm quá trình, điểm báo cáo, điểm doanh nghiệp và nhận xét nếu có. Hệ thống tự tính điểm tổng kết theo cấu hình hiện tại.

### 3. Báo cáo final của sinh viên được xử lý thế nào?
Sinh viên nộp file PDF final trên hệ thống. Giảng viên có thể tải báo cáo, đánh dấu đã chấp nhận hoặc yêu cầu nộp lại kèm ghi chú.

### 4. Giảng viên có nhận thông báo trên website không?
Có. Các thông báo liên quan đến phân công hướng dẫn, báo cáo và thông báo chung từ Khoa được hiển thị ở biểu tượng chuông và trang Thông báo.

### 5. Giảng viên CN có được hướng dẫn chính không?
Theo nghiệp vụ hiện tại, giảng viên có tên chứa “CN” không được làm hướng dẫn chính, chỉ có thể là đồng hướng dẫn.

### 6. Khi cần điều chỉnh phân công hoặc điểm đã khóa thì làm gì?
Giảng viên liên hệ Khoa để được hỗ trợ mở khóa hoặc điều chỉnh theo quy trình quản lý của Khoa.`;

const saveXlsx = (filename: string, headers: string[], rows: any[][], sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Sheet1');
  XLSX.writeFile(workbook, filename);
};

const xlsxArrayBuffer = (headers: string[], rows: any[][], sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Sheet1');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
};

const xlsxBlob = (headers: string[], rows: any[][], sheetName = 'Sheet1') =>
  new Blob([xlsxArrayBuffer(headers, rows, sheetName)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

const companyDescriptionText = (value: any) => {
  const text = String(value || '').trim();
  return /^Tuyển\s+\d+\s+sinh viên thực tập\.?$/i.test(text) ? '' : text;
};
const companyDisplayDescription = (value: any) => companyDescriptionText(value) || 'Chưa rõ';

const convertDocxFileToMarkdown = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  td.addRule('strikethrough', {
    filter: ['del', 's'],
    replacement: (content: string) => `~~${content}~~`,
  });
  return td.turndown(result.value);
};

const loadScriptOnce = (src: string) => new Promise<void>((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error(`Không tải được script ${src}`));
  document.head.appendChild(script);
});

const googleOAuthMessage = (error: any) => {
  const raw = typeof error === 'string' ? error : (error?.message || error?.error || '');
  if (String(raw).includes('access_denied')) {
    return 'Google từ chối cấp quyền Drive. Nếu OAuth app đang ở trạng thái Testing, hãy thêm tài khoản Google đang đăng nhập vào danh sách Test users trong Google Cloud Console, hoặc chuyển app sang Production sau khi cấu hình/xác minh phù hợp.';
  }
  if (String(raw).includes('popup')) {
    return 'Không mở được cửa sổ xác thực Google. Vui lòng cho phép popup với trang này rồi thử lại.';
  }
  return raw || 'Không lấy được quyền Google Drive.';
};

const getDriveAccessToken = async () => {
  await loadScriptOnce('https://accounts.google.com/gsi/client');
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) throw new Error('Không tải được Google Identity Services.');
  return await new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response?.access_token) resolve(response.access_token);
        else reject(new Error(googleOAuthMessage(response)));
      },
      error_callback: (error: any) => reject(new Error(googleOAuthMessage(error))),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
};

const pickDriveFolder = async (accessToken: string) => {
  if (!GOOGLE_API_KEY) throw new Error('Chưa cấu hình VITE_GOOGLE_API_KEY để dùng Google Drive Picker.');
  await loadScriptOnce('https://apis.google.com/js/api.js');
  const gapi = (window as any).gapi;
  const google = (window as any).google;
  await new Promise<void>((resolve) => gapi.load('picker', { callback: resolve }));
  return await new Promise<{ id: string; name: string }>((resolve, reject) => {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setMimeTypes('application/vnd.google-apps.folder')
      .setSelectFolderEnabled(true);
    const picker = new google.picker.PickerBuilder()
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOAuthToken(accessToken)
      .setOrigin(window.location.origin)
      .setTitle('Chọn thư mục Google Drive để lưu danh sách')
      .addView(view)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          resolve({ id: doc.id, name: doc.name || 'Google Drive' });
        } else if (data.action === google.picker.Action.CANCEL) {
          reject(new Error('Bạn đã huỷ chọn thư mục Google Drive.'));
        }
      })
      .build();
    picker.setVisible(true);
  });
};

const uploadXlsxToDrive = async (accessToken: string, folderId: string, filename: string, blob: Blob) => {
  const boundary = `fit_uet_${Date.now()}`;
  const metadata = {
    name: filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    parents: [folderId],
  };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ], { type: `multipart/related; boundary=${boundary}` });
  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const uploaded = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploaded?.error?.message || 'Không upload được file lên Google Drive.');
  const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!permRes.ok) {
    const error = await permRes.json().catch(() => ({}));
    throw new Error(error?.error?.message || 'Không bật được quyền xem bằng link cho file Google Drive.');
  }
  return uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view?usp=sharing`;
};

const csvCells = (line: string) => {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') {
      value += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      cells.push(value.trim());
      value = '';
    } else {
      value += ch;
    }
  }
  cells.push(value.trim());
  return cells;
};

const readSpreadsheetRows = async (file: File) => {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' }).map(row => row.map(cell => String(cell ?? '').trim()));
  }
  const text = await file.text();
  return text.replace(/^\uFEFF/, '').split(/\r?\n/).map(csvCells).filter(row => row.some(Boolean));
};

const paginationBounds = (total: number, currentPage: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  return { totalPages, safePage, start, end };
};

const isAuthExpiredResponse = (res: Response, data?: any) =>
  res.status === 401 && /invalid token|unauthorized|user not found/i.test(String(data?.error || ''));

function PaginationControls({
  total,
  currentPage,
  pageSize,
  onPageChange,
  label = 'bản ghi',
}: {
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (total === 0) return null;
  const { totalPages, safePage, start, end } = paginationBounds(total, currentPage, pageSize);
  return (
    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-600">
      <div>
        Hiển thị <strong>{start}</strong>-<strong>{end}</strong> / <strong>{total}</strong> {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Trước
        </button>
        <span className="min-w-20 text-center">Trang {safePage}/{totalPages}</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function MyNotifications({ token, compact = false, onChanged }: { token: string; compact?: boolean; onChanged?: (unread: number) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return;
      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      const nextUnread = Number(data.unread || 0);
      setRows(nextRows);
      setUnread(nextUnread);
      onChanged?.(nextUnread);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [token]);

  const markRead = async (row: any) => {
    const path = row.source === 'system'
      ? `/api/notifications/my/system/${row.id}/read`
      : `/api/notifications/my/${row.id}/read`;
    await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchRows();
  };

  const markAllRead = async () => {
    await fetch(`${API_BASE}/api/notifications/my/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchRows();
  };

  const visibleRows = compact ? rows.slice(0, 5) : rows;
  const typeLabel = (type: string) => {
    if (type === 'registration_status_changed') return 'Đăng ký';
    if (type === 'advisor_assigned') return 'GVHD';
    if (type === 'final_report_status_changed') return 'Báo cáo';
    if (type === 'grade_locked') return 'Bảng điểm';
    if (type === 'faq_answered') return 'FAQ';
    if (type === 'faq_question_created') return 'Câu hỏi FAQ';
    if (type === 'system_announcement') return 'Hệ thống';
    if (type === 'manual_student_notice' || type === 'manual_lecturer_notice') return 'Thông báo';
    return type || 'Thông báo';
  };

  if (loading) return <div className="p-4 text-sm text-slate-500">Đang tải thông báo...</div>;

  return (
    <div className={compact ? '' : 'max-w-4xl mx-auto space-y-6'}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Bell className="text-amber-600" /> Thông báo của tôi</h2>
            <p className="text-sm text-slate-500 mt-1">{unread} thông báo chưa đọc.</p>
          </div>
          <button onClick={markAllRead} disabled={!unread} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 text-sm font-medium disabled:opacity-50">
            Đánh dấu đã đọc tất cả
          </button>
        </div>
      )}
      {compact && rows.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">{unread} chưa đọc</span>
          <button onClick={markAllRead} disabled={!unread} className="text-xs font-semibold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline">
            Đã đọc tất cả
          </button>
        </div>
      )}
      <div className={compact ? 'divide-y divide-slate-100' : 'bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden'}>
        {visibleRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">Chưa có thông báo.</div>
        ) : visibleRows.map(row => (
          <div key={`${row.source || 'personal'}-${row.id}`} className={`p-4 ${row.read_at ? 'bg-white' : 'bg-amber-50/70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{typeLabel(row.type)}</span>
                  {!row.read_at && <span className="w-2 h-2 rounded-full bg-blue-600" title="Chưa đọc"></span>}
                </div>
                <div className="font-semibold text-slate-900">{row.subject}</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap mt-1">{row.body}</div>
                <div className="text-xs text-slate-400 mt-2">{row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '-'}</div>
              </div>
              {!row.read_at && (
                <button onClick={() => markRead(row)} className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                  Đã đọc
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {compact && rows.length > visibleRows.length && (
        <Link to="/notifications" className="block px-4 py-3 text-sm text-center font-semibold text-blue-600 hover:bg-blue-50">
          Xem tất cả thông báo
        </Link>
      )}
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const handleLoginSuccess = async (credentialResponse: any) => {
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoginError(data.error || 'Đăng nhập thất bại. Vui lòng thử lại sau.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (e) {
      setLoginError('Đăng nhập thất bại. Vui lòng thử lại sau.');
    }
  };

  const clearAuthSession = (message?: string) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setUnreadNotifications(0);
    setIsNotificationOpen(false);
    setIsMenuOpen(false);
    if (message) setLoginError(message);
  };

  const logout = () => {
    clearAuthSession();
  };

  const handleAuthExpired = () => {
    clearAuthSession('Phiên đăng nhập đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.');
  };

  const refreshUnreadNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (isAuthExpiredResponse(res, data)) return handleAuthExpired();
      if (res.ok) setUnreadNotifications(Number(data.unread || 0));
    } catch (e) { }
  };

  useEffect(() => {
    if (!token || !user) return;
    refreshUnreadNotifications();
    const timer = window.setInterval(refreshUnreadNotifications, 60000);
    return () => window.clearInterval(timer);
  }, [token, user?.id]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HashRouter>
        <div className="w-full h-full min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden">
          {/* Header */}
          <header className="h-20 bg-[#004a99] text-white px-8 flex items-center justify-between shadow-lg z-10 sticky top-0 w-full">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
              <Link to="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity cursor-pointer">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center hidden sm:flex overflow-hidden">
                  <img src={`${import.meta.env.BASE_URL}logo.png`} alt="FIT UET 30 Years" className="w-full h-full object-contain p-0.5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight uppercase">Khoa Công nghệ Thông tin</h1>
                  <p className="text-xs opacity-80 uppercase tracking-wider">Trường Đại học Công nghệ - ĐHQGHN</p>
                </div>
              </Link>

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => { setIsNotificationOpen(!isNotificationOpen); setIsMenuOpen(false); }}
                      className="relative w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors focus:outline-none"
                      title="Thông báo"
                    >
                      <Bell size={20} />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-[#004a99]">
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </span>
                      )}
                    </button>
                    {isNotificationOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-[min(92vw,420px)] bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden text-slate-800 origin-top-right">
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <div className="font-bold text-slate-900 flex items-center gap-2"><Bell size={16} className="text-amber-600" /> Thông báo</div>
                            <Link to="/notifications" onClick={() => setIsNotificationOpen(false)} className="text-xs font-semibold text-blue-600 hover:underline">Xem tất cả</Link>
                          </div>
                          <div className="max-h-[70vh] overflow-y-auto">
                            <MyNotifications token={token} compact onChanged={setUnreadNotifications} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={() => { setIsMenuOpen(!isMenuOpen); setIsNotificationOpen(false); }} className="flex items-center gap-3 hover:bg-white/10 p-1.5 pr-3 rounded-full transition-colors cursor-pointer group focus:outline-none">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium group-hover:text-blue-100 transition-colors">{user.name}</p>
                        <p className="text-[11px] opacity-70 group-hover:opacity-100 transition-opacity">{user.email}</p>
                      </div>
                      {user.picture ? (
                        <img src={user.picture} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-green-400 shadow-inner group-hover:border-green-300 transition-colors" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-green-400 flex items-center justify-center text-[#004a99] font-bold shadow-inner group-hover:border-green-300 transition-colors"><UserIcon size={18} /></div>
                      )}
                    </button>

                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden text-slate-800 origin-top-right">
                          <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                            <UserIcon size={16} className="text-blue-600" /> Cập nhật hồ sơ
                          </Link>
                          {user.role === 'student' && (
                            <Link to="/grades" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                              <CheckCircle2 size={16} className="text-green-600" /> Điểm thực tập
                            </Link>
                          )}
                          {user.role === 'admin' && (
                            <>
                              <Link to="/admin/students" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <Users size={16} className="text-indigo-500" /> Quản lý Sinh viên
                              </Link>
                              <Link to="/admin/lecturers" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <UserIcon size={16} className="text-teal-500" /> Quản lý Giảng viên
                              </Link>
                              <Link to="/admin/advisors" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <Users size={16} className="text-emerald-500" /> Phân công GVHD
                              </Link>
                              <Link to="/admin/reports" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <FileText size={16} className="text-indigo-500" /> Báo cáo final
                              </Link>
                              <Link to="/admin/grades" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <CheckCircle2 size={16} className="text-green-500" /> Bảng điểm
                              </Link>
                              <Link to="/admin/notifications" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <Clock size={16} className="text-amber-500" /> Thông báo
                              </Link>
                              <Link to="/admin/companies" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <Building2 size={16} className="text-orange-500" /> Quản lý Công ty
                              </Link>
                              <Link to="/admin/admins" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <Shield size={16} className="text-purple-500" /> Quản lý Quản trị viên
                              </Link>
                              <Link to="/admin/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                                <AlertTriangle size={16} className="text-orange-500" /> Cài đặt hệ thống
                              </Link>
                            </>
                          )}
                          <Link to="/faq" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50">
                            <CircleHelp size={16} className="text-amber-600" /> FAQ
                          </Link>
                          <button onClick={() => { setIsMenuOpen(false); logout(); }} className="flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-sm font-medium text-red-600 w-full text-left transition-colors">
                            <LogOut size={16} /> Đăng xuất
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
            {!token ? (
              <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow border border-gray-100 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogIn className="text-blue-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập</h2>
                <p className="text-gray-500 text-sm mb-8">
                  Hệ thống đăng ký Thực tập.<br />
                  Yêu cầu đăng nhập bằng VNU mail <strong className="text-gray-900">@vnu.edu.vn</strong>
                </p>

                <div className="flex justify-center border p-4 bg-gray-50 rounded-xl">
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={() => setLoginError('Lỗi đăng nhập từ Google.')}
                    useOneTap
                    shape="pill"
                  />
                </div>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={user.role === 'lecturer' ? <LecturerHome user={user} token={token} /> : <Dashboard user={user} setUser={setUser} token={token} onAuthExpired={handleAuthExpired} />} />
                <Route path="/admin" element={user.role === 'admin' ? <AdminPanel token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/final-internships" element={user.role === 'admin' ? <FinalInternshipListAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/students" element={user.role === 'admin' ? <StudentRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/lecturers" element={user.role === 'admin' ? <LecturerRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/advisors" element={user.role === 'admin' ? <AdvisorAssignmentAdmin token={token} view="assignments" /> : <Navigate to="/" />} />
                <Route path="/admin/advisors/requests" element={user.role === 'admin' ? <AdvisorAssignmentAdmin token={token} view="requests" /> : <Navigate to="/" />} />
                <Route path="/admin/advisors/quotas" element={user.role === 'admin' ? <AdvisorAssignmentAdmin token={token} view="quotas" /> : <Navigate to="/" />} />
                <Route path="/admin/reports" element={user.role === 'admin' ? <FinalReportAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/grades" element={user.role === 'admin' ? <GradeAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/notifications" element={user.role === 'admin' ? <NotificationAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/companies" element={user.role === 'admin' ? <CompanyRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/approved-companies" element={user.role === 'admin' ? <ApprovedCompanyRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/admins" element={user.role === 'admin' ? <AdminRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/settings" element={user.role === 'admin' ? <AdminSettings token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/faq" element={user.role === 'admin' ? <FAQSettingsAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/faq-questions" element={user.role === 'admin' ? <FAQQuestionsAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/plan" element={user.role === 'admin' ? <PlanSettingsAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/registration-rules" element={user.role === 'admin' ? <RegistrationRulesSettingsAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/company/:id" element={<CompanyDetail user={user} token={token} />} />
                <Route path="/plan" element={<PlanView user={user} />} />
                <Route path="/faq" element={<FAQView user={user} token={token} />} />
                <Route path="/profile" element={<Profile user={user} setUser={setUser} token={token} />} />
                <Route path="/grades" element={user.role === 'student' ? <StudentGradeView token={token} /> : <Navigate to="/" />} />
                <Route path="/notifications" element={<MyNotifications token={token} onChanged={setUnreadNotifications} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            )}
          </main>

          <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium mt-auto">
            <p>© 2026 Khoa CNTT UET</p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <p>Hỗ trợ thông tin: baoptm@vnu.edu.vn (cô Bảo)</p>
              <p>Hỗ trợ kỹ thuật: 0961309175 (Tuyên)</p>
            </div>
          </div>

          {/* Login Error Modal */}
          {loginError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                  <AlertTriangle size={24} />
                  <h3 className="text-lg font-bold">Lỗi Đăng Nhập</h3>
                </div>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                  {loginError}
                </p>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setLoginError(null)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Đã hiểu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </HashRouter>
    </GoogleOAuthProvider>
  );
}

function Dashboard({ user, setUser, token, onAuthExpired }: { user: any, setUser: any, token: string, onAuthExpired: () => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [myRegsError, setMyRegsError] = useState('');
  const [finalInternship, setFinalInternship] = useState<any>(null);
  const [myAdvisors, setMyAdvisors] = useState<any[]>([]);
  const [advisorRequest, setAdvisorRequest] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [campaign, setCampaign] = useState<any>({ year: '2026', start: '22/05/2026', end: '15/06/2026' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [companyPage, setCompanyPage] = useState(1);
  const companyPageSize = 10;
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(() => {
    try {
      const saved = sessionStorage.getItem('selectedCompanies');
      if (saved) return new Set(JSON.parse(saved));
    } catch { }
    return new Set();
  });
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [confirmFinalOpen, setConfirmFinalOpen] = useState(false);
  const [finalConfirmMode, setFinalConfirmMode] = useState<'company' | 'school'>('company');
  const [selectedFinalRegId, setSelectedFinalRegId] = useState('');
  const [finalSchoolLecturer, setFinalSchoolLecturer] = useState('');
  const [finalAttested, setFinalAttested] = useState(false);
  const [finalNote, setFinalNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advisorRequestSaving, setAdvisorRequestSaving] = useState(false);
  const [isAdvisorEditOpen, setIsAdvisorEditOpen] = useState(false);
  const [isConfirmingFinal, setIsConfirmingFinal] = useState(false);
  const [itCompanyList, setItCompanyList] = useState<string[]>([]);
  const [lecturers, setLecturers] = useState<string[]>([]);
  const studentIdFromEmail = user?.email?.split('@')[0] || '';
  const [registerForm, setRegisterForm] = useState<any>({
    student_id: user?.student_id || studentIdFromEmail,
    dob: user?.dob || '',
    class_name: user?.class_name || '',
    course_code: user?.course_code || '',
    phone: user?.phone || '',
    personal_email: user?.personal_email || '',
    school_lecturer: '',
    school_co_lecturer: '',
    note: ''
  });
  const [otherCompanies, setOtherCompanies] = useState([{
    name: '',
    role: '',
    contact_name: '',
    contact_phone: '',
    contact_email: ''
  }]);
  const [advisorRequestForm, setAdvisorRequestForm] = useState({
    request_type: '',
    lecturer_name: '',
    co_lecturer_name: '',
    student_note: ''
  });
  const navigate = useNavigate();

  const hasRegistered = myRegs.length > 0;

  // Compute registration time window status (GMT+7)
  const registrationWindowStatus = useMemo(() => {
    const openStr = campaign?.registration_open_at;
    const closeStr = campaign?.registration_close_at;
    if (!openStr && !closeStr) return 'open'; // no restriction
    const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
    const now = new Date();
    const openUTC = openStr ? toUTC(openStr) : null;
    const closeUTC = closeStr ? toUTC(closeStr) : null;
    if (openUTC && now < openUTC) return 'not_open_yet';
    if (closeUTC && now > closeUTC) return 'closed';
    return 'open';
  }, [campaign]);
  const canWithdrawRegistration = registrationWindowStatus === 'open';

  const confirmationWindowStatus = useMemo(() => {
    const openStr = campaign?.confirmation_open_at;
    const closeStr = campaign?.confirmation_close_at;
    if (!openStr && !closeStr) return 'open';
    const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
    const now = new Date();
    const openUTC = openStr ? toUTC(openStr) : null;
    const closeUTC = closeStr ? toUTC(closeStr) : null;
    if (openUTC && now < openUTC) return 'not_open_yet';
    if (closeUTC && now > closeUTC) return 'closed';
    return 'open';
  }, [campaign]);

  const advisorRequestWindowStatus = useMemo(() => {
    const openStr = campaign?.advisor_request_open_at;
    const closeStr = campaign?.advisor_request_close_at;
    if (!openStr && !closeStr) return 'open';
    const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
    const now = new Date();
    const openUTC = openStr ? toUTC(openStr) : null;
    const closeUTC = closeStr ? toUTC(closeStr) : null;
    if (openUTC && now < openUTC) return 'not_open_yet';
    if (closeUTC && now > closeUTC) return 'closed';
    return 'open';
  }, [campaign]);

  const finalReportWindowStatus = useMemo(() => {
    const openStr = campaign?.final_report_open_at;
    const closeStr = campaign?.final_report_close_at;
    if (!openStr && !closeStr) return 'open';
    const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
    const now = new Date();
    const openUTC = openStr ? toUTC(openStr) : null;
    const closeUTC = closeStr ? toUTC(closeStr) : null;
    if (openUTC && now < openUTC) return 'not_open_yet';
    if (closeUTC && now > closeUTC) return 'closed';
    return 'open';
  }, [campaign]);

  const formatGMT7 = (isoLocal: string) => {
    if (!isoLocal) return '';
    const [date, time] = isoLocal.split('T');
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y} ${time}`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const reportStatusLabel = (status?: string) => {
    if (status === 'accepted') return 'Đã chấp nhận';
    if (status === 'needs_revision') return 'Cần nộp lại';
    if (status === 'submitted') return 'Đã nộp';
    return 'Chưa nộp';
  };

  const khacCompany = companies.find(c => c.name === 'Công ty khác');
  const hasSelectedKhac = khacCompany && selectedCompanies.has(khacCompany.id);

  const schoolCompany = companies.find(c => c.name === 'Trường Đại học Công nghệ');
  const hasSelectedSchool = schoolCompany && selectedCompanies.has(schoolCompany.id);
  const selectedPreferencePreview = Array.from(selectedCompanies).flatMap((companyId) => {
    if (khacCompany && companyId === khacCompany.id) {
      return otherCompanies.map((otherCompany, index) => ({
        key: `other-${index}`,
        name: otherCompany.name?.trim() ? `(Khác) ${otherCompany.name.trim()}` : `Công ty tự liên hệ ${index + 1}`,
      }));
    }
    const company = companies.find(c => c.id === companyId);
    return [{ key: `company-${companyId}`, name: company?.name || 'Không rõ' }];
  });
  const selectedWishCount = selectedPreferencePreview.length;

  useEffect(() => {
    sessionStorage.setItem('selectedCompanies', JSON.stringify(Array.from(selectedCompanies)));
  }, [selectedCompanies]);

  // Sync registerForm whenever user profile updates (e.g. after registration saves phone/personal_email)
  useEffect(() => {
    setRegisterForm((prev: any) => ({
      ...prev,
      student_id: user?.student_id || studentIdFromEmail || prev.student_id,
      dob: user?.dob || prev.dob,
      class_name: user?.class_name || prev.class_name,
      course_code: user?.course_code || prev.course_code,
      phone: user?.phone || prev.phone,
      personal_email: user?.personal_email || prev.personal_email,
    }));
  }, [user]);

  const toggleCompanySelection = (companyId: number) => {
    setSelectedCompanies(prev => {
      const next = new Set(prev);
      const isSchool = schoolCompany && companyId === schoolCompany.id;
      const hasSchool = schoolCompany && prev.has(schoolCompany.id);

      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        if (isSchool) {
          alert("Lưu ý: Khi đăng ký Trường Đại học Công nghệ, bạn sẽ không được đăng ký thêm công ty nào khác.");
          return new Set([companyId]);
        }
        if (hasSchool) {
          alert("Bạn đã chọn Trường Đại học Công nghệ nên không thể chọn thêm công ty ngoài.");
          return prev;
        }
        if (next.size >= 5) return prev;
        next.add(companyId);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isStudent = user?.role === 'student';
      const [compRes, regRes, finalRes, advisorRes, advisorReqRes, reportRes, campRes, itListRes, lecRes] = await Promise.all([
        fetch(`${API_BASE}/api/companies`, { headers: { Authorization: `Bearer ${token}` } }),
        isStudent ? fetch(`${API_BASE}/api/registrations/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/internships/final/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/advisor/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/advisor/request/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/reports/final/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        fetch(`${API_BASE}/api/settings/campaign`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/companies/it-list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/lecturers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const compData = await compRes.json().catch(() => null);
      if (isAuthExpiredResponse(compRes, compData)) return onAuthExpired();
      setCompanies(Array.isArray(compData) ? compData : []);

      const regData = regRes ? await regRes.json().catch(() => null) : [];
      if (regRes && !regRes.ok) {
        if (isAuthExpiredResponse(regRes, regData)) return onAuthExpired();
        setMyRegsError(regData?.error || 'Không tải được danh sách đăng ký của bạn.');
      } else if (Array.isArray(regData)) {
        setMyRegs(regData);
        setMyRegsError('');
      } else {
        setMyRegsError('Dữ liệu đăng ký trả về không hợp lệ.');
      }

      const finalData = finalRes ? await finalRes.json() : null;
      setFinalInternship(finalData && !finalData.error ? finalData : null);

      const advisorData = advisorRes ? await advisorRes.json() : [];
      setMyAdvisors(Array.isArray(advisorData) ? advisorData : []);

      const advisorReqData = advisorReqRes ? await advisorReqRes.json().catch(() => null) : null;
      setAdvisorRequest(advisorReqData && !advisorReqData.error ? advisorReqData : null);
      if (advisorReqData && !advisorReqData.error) {
        setAdvisorRequestForm({
          request_type: advisorReqData.request_type === 'faculty_assign' ? '' : advisorReqData.request_type || '',
          lecturer_name: advisorReqData.lecturer_name || advisorReqData.lecturer_name_text || '',
          co_lecturer_name: advisorReqData.co_lecturer_name || advisorReqData.co_lecturer_name_text || '',
          student_note: advisorReqData.student_note || ''
        });
      }

      const reportData = reportRes ? await reportRes.json() : null;
      setFinalReport(reportData && !reportData.error ? reportData : null);

      const campData = await campRes.json();
      if (campData && !campData.error) {
        setCampaign(campData);
      }

      setItCompanyList(await itListRes.json());
      setLecturers(await lecRes.json());
    } catch (e) {
      console.error(e);
      if (user?.role === 'student') {
        setMyRegsError('Không kết nối được tới máy chủ để kiểm tra danh sách đăng ký.');
      }
    }
    setLoading(false);
  };

  const filteredCompanies = useMemo(() => companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    companyDescriptionText(company.description).toLowerCase().includes(searchTerm.toLowerCase())
  ), [companies, searchTerm]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <span className="text-blue-600 font-bold">↑</span> :
      <span className="text-blue-600 font-bold">↓</span>;
  };

  const sortedCompanies = useMemo(() => [...filteredCompanies].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key] !== undefined ? a[key] : '';
    const bVal = b[key] !== undefined ? b[key] : '';

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  }), [filteredCompanies, sortConfig]);
  useEffect(() => {
    setCompanyPage(1);
  }, [searchTerm, sortConfig, companies.length]);
  const companyTotalPages = Math.max(1, Math.ceil(sortedCompanies.length / companyPageSize));
  const safeCompanyPage = Math.min(companyPage, companyTotalPages);
  const paginatedCompanies = sortedCompanies.slice((safeCompanyPage - 1) * companyPageSize, safeCompanyPage * companyPageSize);

  const submitRegister = async (e: any) => {
    e.preventDefault();
    if (selectedWishCount === 0) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company_ids: Array.from(selectedCompanies).filter(id => id !== khacCompany?.id),
          preferences: Array.from(selectedCompanies).flatMap((companyId) => {
            if (khacCompany && companyId === khacCompany.id) {
              return otherCompanies.map(c => ({
                type: 'other',
                name: c.name,
                role: c.role,
                contact: `${c.contact_name} - ${c.contact_phone} - ${c.contact_email}`
              }));
            }
            return [{ type: 'company', company_id: companyId }];
          }),
          student_id: registerForm.student_id,
          dob: registerForm.dob,
          class_name: registerForm.class_name,
          course_code: registerForm.course_code,
          phone: registerForm.phone,
          personal_email: registerForm.personal_email,
          school_lecturer: registerForm.school_lecturer,
          school_co_lecturer: registerForm.school_co_lecturer,
          ...(advisorRequestForm.request_type ? {
            advisor_request: {
              request_type: advisorRequestForm.request_type,
              lecturer_name: advisorRequestForm.lecturer_name,
              co_lecturer_name: advisorRequestForm.co_lecturer_name,
              student_note: advisorRequestForm.student_note
            }
          } : {}),
          note: registerForm.note,
          other_companies: hasSelectedKhac ? otherCompanies.map(c => ({
            name: c.name,
            role: c.role,
            contact: `${c.contact_name} - ${c.contact_phone} - ${c.contact_email}`
          })) : []
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        setRegisterModalOpen(false);
        setSelectedCompanies(new Set());
        setRegisterForm({ student_id: data.user?.student_id || user?.student_id || studentIdFromEmail, dob: data.user?.dob || user?.dob || '', class_name: data.user?.class_name || user?.class_name || '', course_code: data.user?.course_code || user?.course_code || '', phone: data.user?.phone || user?.phone || '', personal_email: data.user?.personal_email || user?.personal_email || '', school_lecturer: '', school_co_lecturer: '', note: '' });
        setAdvisorRequestForm({ request_type: '', lecturer_name: '', co_lecturer_name: '', student_note: '' });
        setOtherCompanies([{ name: '', role: '', contact_name: '', contact_phone: '', contact_email: '' }]);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Đăng ký lỗi!");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setUploadingReport(true);
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
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Nộp báo cáo thất bại.');
      setFinalReport(data);
      alert('Đã nộp báo cáo final.');
    } catch (err) {
      alert('Lỗi kết nối khi nộp báo cáo.');
    } finally {
      setUploadingReport(false);
      e.target.value = '';
    }
  };

  const downloadMyFinalReport = async () => {
    if (!finalReport) return;
    const res = await fetch(`${API_BASE}/api/reports/final/${user.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return alert('Không tải được báo cáo đã nộp.');
    saveAs(await res.blob(), finalReport.original_filename || 'final-report.pdf');
  };

  const handleWithdraw = async () => {
    if (!canWithdrawRegistration) {
      setIsWithdrawModalOpen(false);
      alert('Chỉ được hủy đăng ký trong thời gian Khoa mở đăng ký.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/registrations/my`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        fetchData();
        setIsWithdrawModalOpen(false);
      } else {
        alert(data.error || 'Không thể hủy đăng ký.');
      }
    } catch (e) {
      alert("Hủy lỗi!");
    }
  };

  const submitAdvisorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (advisorRequestSaving) return;
    if (advisorRequestWindowStatus !== 'open') {
      alert('Ngoài thời gian đăng ký Giảng viên hướng dẫn.');
      return;
    }
    if (!['agreed', 'proposed'].includes(advisorRequestForm.request_type)) {
      alert('Vui lòng chọn phương án đăng ký giảng viên hướng dẫn.');
      return;
    }
    setAdvisorRequestSaving(true);
    try {
      const payload = {
        request_type: advisorRequestForm.request_type,
        lecturer_name: advisorRequestForm.lecturer_name,
        co_lecturer_name: advisorRequestForm.co_lecturer_name,
        student_note: advisorRequestForm.student_note,
      };
      const res = await fetch(`${API_BASE}/api/advisor/request/my`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Không gửi được đề xuất GVHD.');
      setAdvisorRequest(data.request || null);
      setIsAdvisorEditOpen(false);
      alert('Đã ghi nhận đề xuất GVHD.');
      fetchData();
    } catch (e) {
      alert('Lỗi kết nối khi gửi đề xuất GVHD.');
    } finally {
      setAdvisorRequestSaving(false);
    }
  };

  const cancelAdvisorRequest = async () => {
    if (advisorRequestSaving) return;
    if (advisorRequestWindowStatus !== 'open') return alert('Ngoài thời gian đăng ký Giảng viên hướng dẫn.');
    if (!confirm('Hủy đăng ký giảng viên hướng dẫn hiện tại?')) return;
    setAdvisorRequestSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/advisor/request/my`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Không hủy được đăng ký GVHD.');
      setAdvisorRequest(null);
      setMyAdvisors([]);
      setAdvisorRequestForm({ request_type: '', lecturer_name: '', co_lecturer_name: '', student_note: '' });
      setIsAdvisorEditOpen(true);
      fetchData();
    } catch (e) {
      alert('Lỗi kết nối khi hủy đăng ký GVHD.');
    } finally {
      setAdvisorRequestSaving(false);
    }
  };

  const approvedFinalOptions = myRegs.filter((reg: any) => reg.status === 'approved' && reg.company_name !== 'Trường Đại học Công nghệ');

  const openFinalConfirm = (mode: 'company' | 'school') => {
    setFinalConfirmMode(mode);
    setSelectedFinalRegId(mode === 'company' ? String(approvedFinalOptions[0]?.id || '') : '');
    setFinalSchoolLecturer('');
    setFinalAttested(false);
    setFinalNote('');
    setConfirmFinalOpen(true);
  };

  const submitFinalConfirmation = async (e: any) => {
    e.preventDefault();
    if (isConfirmingFinal) return;
    setIsConfirmingFinal(true);
    try {
      const payload = finalConfirmMode === 'school'
        ? {
          internship_type: 'school',
          school_lecturer: finalSchoolLecturer.trim(),
          school_assignment_request: !finalSchoolLecturer.trim(),
          note: finalNote
        }
        : { internship_type: 'company', registration_id: Number(selectedFinalRegId), attested: finalAttested, note: finalNote };
      const res = await fetch(`${API_BASE}/api/internships/final/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Xác nhận thất bại');
        return;
      }
      setConfirmFinalOpen(false);
      fetchData();
    } catch (e) {
      alert('Lỗi kết nối khi xác nhận nơi thực tập.');
    } finally {
      setIsConfirmingFinal(false);
    }
  };

  if (loading) return <div className="text-center py-20 animate-pulse text-gray-500">Đang tải dữ liệu...</div>;
  const registrationRulesMarkdown = String(campaign.registration_rules_md || DEFAULT_REGISTRATION_RULES);
  const hasAdvisorSelection = myAdvisors.length > 0 || !!advisorRequest;
  const showAdvisorForm = advisorRequestWindowStatus === 'open' && (!hasAdvisorSelection || isAdvisorEditOpen);
  const campaignStatusItems = [
    {
      label: 'Đăng ký thực tập',
      openAt: campaign.registration_open_at,
      closeAt: campaign.registration_close_at,
      status: (!campaign.registration_open_at && !campaign.registration_close_at) ? 'unconfigured' : registrationWindowStatus,
    },
    {
      label: 'Xác nhận nơi thực tập',
      openAt: campaign.confirmation_open_at,
      closeAt: campaign.confirmation_close_at,
      status: (!campaign.confirmation_open_at && !campaign.confirmation_close_at) ? 'unconfigured' : confirmationWindowStatus,
    },
    {
      label: 'Đăng ký GVHD',
      openAt: campaign.advisor_request_open_at,
      closeAt: campaign.advisor_request_close_at,
      status: (!campaign.advisor_request_open_at && !campaign.advisor_request_close_at) ? 'unconfigured' : advisorRequestWindowStatus,
    },
    {
      label: 'Nộp báo cáo final',
      openAt: campaign.final_report_open_at,
      closeAt: campaign.final_report_close_at,
      status: (!campaign.final_report_open_at && !campaign.final_report_close_at) ? 'unconfigured' : finalReportWindowStatus,
    },
  ];
  const visibleCampaignStatusItems = campaignStatusItems.some(item => item.status === 'open')
    ? campaignStatusItems.filter(item => item.status === 'open')
    : campaignStatusItems.slice(0, 1);
  const campaignStatusText = (status: string) => status === 'open' ? 'Đang mở' : status === 'not_open_yet' ? 'Chưa mở' : status === 'unconfigured' ? 'Chưa cấu hình' : 'Đã đóng';
  const campaignStatusColor = (status: string) => status === 'open'
    ? 'bg-green-50 text-green-700 border-green-100'
    : status === 'not_open_yet'
      ? 'bg-orange-50 text-orange-700 border-orange-100'
      : status === 'unconfigured'
        ? 'bg-slate-50 text-slate-700 border-slate-200'
        : 'bg-red-50 text-red-700 border-red-100';
  const campaignStatusDot = (status: string) => status === 'open' ? 'bg-green-500' : status === 'not_open_yet' ? 'bg-orange-500' : status === 'unconfigured' ? 'bg-slate-400' : 'bg-red-500';
  const openCampaigns = campaignStatusItems.filter(item => item.status === 'open');
  const advisorCampaign = campaignStatusItems.find(item => item.label === 'Đăng ký GVHD');
  const registrationCampaign = campaignStatusItems.find(item => item.label === 'Đăng ký thực tập');
  const openCampaign = (advisorCampaign?.status === 'open' && hasRegistered && !hasAdvisorSelection)
    ? advisorCampaign
    : (registrationCampaign?.status === 'open' && !hasRegistered)
      ? registrationCampaign
      : openCampaigns
        .sort((a, b) => String(b.openAt || '').localeCompare(String(a.openAt || '')))[0];
  const activeCampaignKey = openCampaign?.label === 'Đăng ký thực tập'
    ? 'registration'
    : openCampaign?.label === 'Xác nhận nơi thực tập'
      ? 'confirmation'
      : openCampaign?.label === 'Đăng ký GVHD'
        ? 'advisor'
        : openCampaign?.label === 'Nộp báo cáo final'
          ? 'final_report'
          : 'registration';
  const activeCampaignTitle = openCampaign?.label || 'Đăng ký thực tập';
  const showRegistrationTask = activeCampaignKey === 'registration';
  const showConfirmationTask = activeCampaignKey === 'confirmation' && hasRegistered;
  const showAdvisorTask = activeCampaignKey === 'advisor' && hasRegistered;
  const showFinalReportTask = activeCampaignKey === 'final_report' && !!finalInternship;
  const showCompanyList = showRegistrationTask && !hasRegistered;
  const registrationSummary = hasRegistered
    ? `Đã đăng ký ${myRegs.length} nơi`
    : registrationWindowStatus === 'open'
      ? 'Chưa đăng ký'
      : 'Chưa có dữ liệu';
  const finalInternshipSummary = finalInternship
    ? (finalInternship.internship_type === 'school'
      ? 'Thực tập tại trường'
      : (finalInternship.company_name === 'Công ty khác' ? finalInternship.other_company_name || 'Công ty khác' : finalInternship.company_name))
    : 'Chưa xác nhận';
  const advisorSummary = myAdvisors.length > 0
    ? myAdvisors.map((a: any) => `${a.role === 'primary' ? 'Chính' : 'Đồng'}: ${a.lecturer_name}`).join('; ')
    : advisorRequest
      ? advisorRequest.request_type === 'faculty_assign'
        ? 'Khoa sẽ phân công'
        : advisorRequest.lecturer_name || advisorRequest.lecturer_name_text || 'Đã gửi đề xuất'
      : 'Chưa có GVHD';
  const finalReportSummary = finalReport ? reportStatusLabel(finalReport.status) : 'Chưa nộp';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Sidebar Info */}
      <div className="col-span-1 lg:col-span-3 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Trạng thái Hệ thống</h2>
          <div className="space-y-3">
            {visibleCampaignStatusItems.map(item => (
              <div key={item.label} className={`rounded-xl border px-3 py-3 ${campaignStatusColor(item.status)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {item.status === 'open' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${campaignStatusDot(item.status)}`}></span>
                    </span>
                    <span className="text-sm font-semibold truncate">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold whitespace-nowrap">{campaignStatusText(item.status)}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] opacity-90">
                  <div>
                    <div className="font-semibold">Mở</div>
                    <div>{item.openAt ? formatGMT7(item.openAt) : '—'}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Đóng</div>
                    <div>{item.closeAt ? formatGMT7(item.closeAt) : '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <details className="group bg-[#004a99] text-white rounded-2xl shadow-md overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Quy định Đăng ký</span>
            <ChevronDown size={18} className="text-blue-200 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5">
            {registrationRulesMarkdown.trim()
              ? <RegistrationRulesMarkdown content={registrationRulesMarkdown} />
              : <p className="text-sm text-blue-100">Chưa có quy định nào.</p>}
          </div>
        </details>
      </div>

      <div className="col-span-1 lg:col-span-9 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Thực tập {campaign.year}</h2>
            <p className="mt-1 text-sm text-slate-500">Việc cần làm hiện tại: <strong className="text-slate-800">{activeCampaignTitle}</strong></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/plan')}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-md text-xs font-bold hover:bg-blue-200 shadow-sm transition-colors"
            >
              KẾ HOẠCH TRIỂN KHAI
            </button>
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-slate-800 shadow-sm transition-colors"
                >
                  <LayoutDashboard size={14} /> DANH SÁCH ĐĂNG KÝ
                </button>
                <button
                  onClick={() => navigate('/admin/final-internships')}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  <CheckCircle2 size={14} /> DANH SÁCH XÁC NHẬN THỰC TẬP
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className={`rounded-xl border p-4 ${showRegistrationTask ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Đăng ký thực tập</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{registrationSummary}</div>
            {hasRegistered && <div className="mt-1 text-xs text-slate-500">Ngày ghi nhận: {new Date(myRegs[0].created_at).toLocaleDateString('vi-VN')}</div>}
          </div>
          <div className={`rounded-xl border p-4 ${showConfirmationTask ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Nơi thực tập chính thức</div>
            <div className="mt-2 text-sm font-semibold text-slate-900 line-clamp-2">{finalInternshipSummary}</div>
          </div>
          <div className={`rounded-xl border p-4 ${showAdvisorTask ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Giảng viên hướng dẫn</div>
            <div className="mt-2 text-sm font-semibold text-slate-900 line-clamp-2">{advisorSummary}</div>
          </div>
          <div className={`rounded-xl border p-4 ${showFinalReportTask ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Báo cáo final</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{finalReportSummary}</div>
            {finalReport?.submitted_at && <div className="mt-1 text-xs text-slate-500">{new Date(finalReport.submitted_at).toLocaleString('vi-VN')}</div>}
          </div>
        </div>

        {myRegsError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">
            Hệ thống chưa kiểm tra được danh sách đăng ký của bạn. Vui lòng đăng nhập lại để hiện thị đúng thông tin đăng ký hoặc liên hệ Khoa nếu thông báo này vẫn xuất hiện.
            <div className="text-xs text-amber-700 mt-1">{myRegsError}</div>
          </div>
        ) : showRegistrationTask ? (hasRegistered ? (
          <div className="bg-green-50/50 border border-green-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-green-600" size={20} />
                  <h3 className="text-base font-bold text-green-900">Đã ghi nhận đăng ký {myRegs.length} công ty</h3>
                </div>
                <ul className="text-sm text-green-800 mb-4 space-y-1">
                  {myRegs.map((reg: any, idx: number) => (
                    <li key={reg.id}>
                      <div>NV{idx + 1}: <strong>{reg.company_name === 'Công ty khác' ? `(Khác) ${reg.other_company_name || ''}` : reg.company_name}</strong> — <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${reg.status === 'approved' ? 'bg-green-100 text-green-700' : reg.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}</span></div>
                      {reg.review_comment && <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">Nhận xét của Khoa: {reg.review_comment}</div>}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-3 text-xs text-green-700 font-medium">
                  <span>NGÀY GHI NHẬN: {new Date(myRegs[0].created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <button
                onClick={() => canWithdrawRegistration && setIsWithdrawModalOpen(true)}
                disabled={!canWithdrawRegistration}
                title={canWithdrawRegistration ? 'Hủy đăng ký trong thời gian Khoa mở đăng ký' : 'Chỉ được hủy đăng ký trong thời gian Khoa mở đăng ký'}
                className={`px-4 py-1.5 border rounded-md text-xs font-bold transition-colors whitespace-nowrap ${canWithdrawRegistration ? 'border-red-500 text-red-500 hover:bg-red-50/50' : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'}`}
              >
                Hủy tất cả đăng ký
              </button>
            </div>
          </div>
        ) : (
          <div className={`${registrationWindowStatus === 'open' ? 'bg-blue-50/30 border-blue-100 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-700'} border rounded-xl p-4 text-sm`}>
            {registrationWindowStatus === 'open' ? (
              <>Bạn chưa đăng ký công ty nào. Vui lòng chọn tối đa 5 nơi thực tập từ danh sách dưới đây rồi bấm <strong>Đăng ký</strong>.</>
            ) : registrationWindowStatus === 'not_open_yet' ? (
              <>Bạn chưa có đăng ký nào được ghi nhận. Đợt đăng ký hiện chưa mở.</>
            ) : (
              <>Bạn chưa có đăng ký nào được ghi nhận trong hệ thống. Đợt đăng ký đã đóng, vui lòng liên hệ Khoa nếu bạn cho rằng dữ liệu đăng ký của mình bị thiếu.</>
            )}
          </div>
        )) : null}

        {(showConfirmationTask || showAdvisorTask) && (
          <div className={`border rounded-2xl p-6 shadow-sm ${finalInternship ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
            {showConfirmationTask && <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={finalInternship ? 'text-emerald-600' : 'text-slate-400'} size={20} />
                  <h3 className={`text-base font-bold ${finalInternship ? 'text-emerald-900' : 'text-slate-800'}`}>Nơi thực tập chính thức</h3>
                </div>
                {finalInternship ? (
                  <div className="text-sm text-emerald-800 space-y-1">
                    <p>
                      Đã xác nhận: <strong>{finalInternship.internship_type === 'school' ? 'Thực tập tại trường' : (finalInternship.company_name === 'Công ty khác' ? `Công ty khác: ${finalInternship.other_company_name || ''}` : finalInternship.company_name)}</strong>
                    </p>
                    {finalInternship.school_lecturer && <p>GVHD đăng ký: <strong>{finalInternship.school_lecturer}</strong></p>}
                    {finalInternship.school_assignment_request ? <p>GVHD: <strong>Khoa sẽ phân công</strong></p> : null}
                    {myAdvisors.length > 0 && (
                      <p>
                        GVHD đã phân công:{' '}
                        <strong>{myAdvisors.map((a: any) => `${a.role === 'primary' ? 'Chính' : 'Đồng'}: ${a.lecturer_name}`).join('; ')}</strong>
                      </p>
                    )}
                    <p className="text-xs">Thời gian xác nhận: {finalInternship.confirmed_at ? new Date(finalInternship.confirmed_at).toLocaleString('vi-VN') : '-'}</p>
                    {finalInternship.locked_at && <p className="text-xs font-semibold text-emerald-900">Khoa đã khóa chỉnh sửa nơi thực tập chính thức.</p>}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 space-y-2">
                    <p>Sau khi có kết quả từ doanh nghiệp, bạn cần xác nhận một nơi thực tập chính thức để Khoa phân công GVHD và tính điểm.</p>
                    {confirmationWindowStatus !== 'open' && (
                      <p className={`text-xs font-semibold ${confirmationWindowStatus === 'not_open_yet' ? 'text-orange-700' : 'text-red-700'}`}>
                        {confirmationWindowStatus === 'not_open_yet'
                          ? `Chưa mở xác nhận${campaign.confirmation_open_at ? `: ${formatGMT7(campaign.confirmation_open_at)} (GMT+7)` : ''}.`
                          : `Đã hết hạn xác nhận${campaign.confirmation_close_at ? `: ${formatGMT7(campaign.confirmation_close_at)} (GMT+7)` : ''}.`}
                      </p>
                    )}
                    {approvedFinalOptions.length === 0 && <p className="text-xs text-orange-700">Hiện chưa có công ty đã duyệt để xác nhận. Nếu không trúng tuyển nơi nào, bạn có thể chọn thực tập tại trường khi Khoa mở xác nhận.</p>}
                  </div>
                )}
              </div>
              {!finalInternship && (
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    onClick={() => openFinalConfirm('company')}
                    disabled={confirmationWindowStatus !== 'open' || approvedFinalOptions.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    Xác nhận công ty
                  </button>
                  <button
                    onClick={() => openFinalConfirm('school')}
                    disabled={confirmationWindowStatus !== 'open'}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                  Thực tập tại trường
                </button>
              </div>
              )}
            </div>}
            {showAdvisorTask && <div className={showConfirmationTask ? 'mt-5 border-t border-slate-200 pt-4' : ''}>
              <h4 className="text-sm font-bold text-slate-800 mb-2">Đề xuất giảng viên hướng dẫn</h4>
              {advisorRequestWindowStatus !== 'open' && (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {advisorRequestWindowStatus === 'not_open_yet'
                    ? `Chưa mở đăng ký GVHD${campaign.advisor_request_open_at ? `: ${formatGMT7(campaign.advisor_request_open_at)} (GMT+7)` : ''}.`
                    : `Đã hết hạn đăng ký GVHD${campaign.advisor_request_close_at ? `: ${formatGMT7(campaign.advisor_request_close_at)} (GMT+7)` : ''}. Nếu chưa chọn GVHD, hệ thống sẽ tự phân công theo quota còn lại.`}
                </div>
              )}
              <form onSubmit={submitAdvisorRequest} className="space-y-3">
                {hasAdvisorSelection && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <div className="font-bold">GVHD hiện tại</div>
                        <div className="mt-1">
                          {myAdvisors.length > 0
                            ? myAdvisors.map((a: any) => `${a.role === 'primary' ? 'Chính' : 'Đồng'}: ${a.lecturer_name}`).join('; ')
                            : advisorRequest?.request_type === 'faculty_assign'
                              ? 'Khoa sẽ phân công'
                              : advisorRequest?.lecturer_name || advisorRequest?.lecturer_name_text || '-'}
                        </div>
                        {advisorRequest && (
                          <div className="mt-1 text-xs text-emerald-800">
                            Trạng thái: {advisorRequest.status === 'approved' ? 'Đã duyệt' : advisorRequest.status === 'rejected' ? 'Từ chối' : 'Chờ Khoa xử lý'}
                            {advisorRequest.co_lecturer_name || advisorRequest.co_lecturer_name_text ? ` · Đồng HD: ${advisorRequest.co_lecturer_name || advisorRequest.co_lecturer_name_text}` : ''}
                            {advisorRequest.admin_note ? ` · Nhận xét: ${advisorRequest.admin_note}` : ''}
                          </div>
                        )}
                      </div>
                      {advisorRequestWindowStatus === 'open' && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button type="button" onClick={() => setIsAdvisorEditOpen(prev => !prev)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                            {isAdvisorEditOpen ? 'Đóng chỉnh sửa' : 'Thay đổi GVHD'}
                          </button>
                          <button type="button" onClick={cancelAdvisorRequest} disabled={advisorRequestSaving} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                            Hủy đăng ký
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {showAdvisorForm && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={advisorRequestForm.request_type}
                        onChange={e => {
                          const requestType = e.target.value;
                          setAdvisorRequestForm({
                            ...advisorRequestForm,
                            request_type: requestType,
                            lecturer_name: requestType ? advisorRequestForm.lecturer_name : '',
                            co_lecturer_name: requestType ? advisorRequestForm.co_lecturer_name : ''
                          });
                        }}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="">-- Chọn phương án GVHD --</option>
                        <option value="agreed">Sinh viên đã được GV đồng ý hướng dẫn</option>
                        <option value="proposed">Sinh viên tự đề xuất GVHD</option>
                      </select>
                      <input
                        value={advisorRequestForm.lecturer_name}
                        onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, lecturer_name: e.target.value })}
                        disabled={!advisorRequestForm.request_type}
                        required={!!advisorRequestForm.request_type}
                        list="advisor-primary-lecturers"
                        placeholder="Nhập/chọn GVHD chính"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <input
                        value={advisorRequestForm.co_lecturer_name}
                        onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, co_lecturer_name: e.target.value })}
                        disabled={!advisorRequestForm.request_type}
                        list="advisor-co-lecturers"
                        placeholder="Nhập/chọn đồng hướng dẫn"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <datalist id="advisor-primary-lecturers">
                        {lecturers.map(name => <option key={name} value={name} />)}
                      </datalist>
                      <datalist id="advisor-co-lecturers">
                        {lecturers.map(name => <option key={name} value={name} />)}
                      </datalist>
                    </div>
                    <textarea
                      value={advisorRequestForm.student_note}
                      onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, student_note: e.target.value })}
                      placeholder="Ghi chú cho Khoa nếu tự đề xuất, ví dụ: lý do đề xuất, lĩnh vực phù hợp, hoặc thông tin đã trao đổi với GV..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-y"
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={advisorRequestSaving || advisorRequestWindowStatus !== 'open'} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed">
                        {advisorRequestSaving ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} {hasAdvisorSelection ? 'Lưu thay đổi' : 'Gửi đề xuất GVHD'}
                      </button>
                      {hasAdvisorSelection && (
                        <button type="button" onClick={() => setIsAdvisorEditOpen(false)} disabled={advisorRequestSaving} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                          Hủy chỉnh sửa
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>}
          </div>
        )}

        {showFinalReportTask && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-indigo-600" size={20} />
                  <h3 className="text-base font-bold text-slate-900">Báo cáo thực tập final</h3>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>
                    Thời gian nộp:{' '}
                    <strong>{campaign.final_report_open_at ? formatGMT7(campaign.final_report_open_at) : '—'}</strong>
                    {' '}đến{' '}
                    <strong>{campaign.final_report_close_at ? formatGMT7(campaign.final_report_close_at) : '—'}</strong>
                    {' '}(GMT+7)
                  </p>
                  {finalReport ? (
                    <>
                      <p>Trạng thái: <strong>{reportStatusLabel(finalReport.status)}</strong></p>
                      <p>File: <strong>{finalReport.original_filename}</strong> ({formatBytes(Number(finalReport.file_size || 0))})</p>
                      <p className="text-xs">Nộp lúc: {finalReport.submitted_at ? new Date(finalReport.submitted_at).toLocaleString('vi-VN') : '-'}</p>
                      {finalReport.lecturer_comment && <p className="text-xs text-orange-700">Ghi chú GVHD: {finalReport.lecturer_comment}</p>}
                    </>
                  ) : (
                    <p>Chưa nộp báo cáo final.</p>
                  )}
                  {finalReportWindowStatus !== 'open' && (
                    <p className={`text-xs font-semibold ${finalReportWindowStatus === 'not_open_yet' ? 'text-orange-700' : 'text-red-700'}`}>
                      {finalReportWindowStatus === 'not_open_yet'
                        ? `Chưa mở nộp báo cáo${campaign.final_report_open_at ? `: ${formatGMT7(campaign.final_report_open_at)} (GMT+7)` : ''}.`
                        : `Đã hết hạn nộp báo cáo${campaign.final_report_close_at ? `: ${formatGMT7(campaign.final_report_close_at)} (GMT+7)` : ''}.`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {finalReport && (
                  <button onClick={downloadMyFinalReport} className="px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 whitespace-nowrap bg-slate-100 text-slate-800 hover:bg-slate-200">
                    <Download size={16} /> Tải PDF
                  </button>
                )}
                <label className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 whitespace-nowrap ${finalReportWindowStatus === 'open' && !uploadingReport ? 'bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                  {uploadingReport ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                  {finalReport ? 'Nộp lại PDF' : 'Nộp PDF'}
                  <input type="file" accept="application/pdf,.pdf" disabled={finalReportWindowStatus !== 'open' || uploadingReport} className="hidden" onChange={uploadFinalReport} />
                </label>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Chỉ nhận PDF tối đa 10 MB. Nếu lớn hơn, vui lòng nén file trước khi nộp.</p>
          </div>
        )}

        {/* Registration Table Area */}
        {showCompanyList && <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-800 text-sm">Danh sách nơi thực tập</h2>
              {!hasRegistered && selectedWishCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Đã chọn: {selectedWishCount}/5</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nơi thực tập..."
                className="text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
              {!hasRegistered && (
                <>
                  {registrationWindowStatus !== 'open' ? (
                    <button
                      disabled
                      className="px-5 py-1.5 rounded-md text-sm font-bold bg-slate-200 text-slate-400 cursor-not-allowed shadow-none whitespace-nowrap"
                      title={registrationWindowStatus === 'not_open_yet'
                        ? `Chưa mở đăng ký. Mở lúc: ${formatGMT7(campaign.registration_open_at)} (GMT+7)`
                        : `Đã đóng đăng ký. Kết thúc lúc: ${formatGMT7(campaign.registration_close_at)} (GMT+7)`}
                    >
                      <Clock size={14} className="inline mr-1" />
                      {registrationWindowStatus === 'not_open_yet' ? 'Chưa mở' : 'Đã đóng'}
                    </button>
                  ) : (
                    <button
                      disabled={selectedWishCount === 0}
                      onClick={() => setRegisterModalOpen(true)}
                      className={`px-5 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors whitespace-nowrap ${selectedWishCount === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      Đăng ký ({selectedWishCount})
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Registration time window banner */}
          {!hasRegistered && (campaign?.registration_open_at || campaign?.registration_close_at) && (
            <div className={`px-6 py-3 text-sm flex items-center gap-2 border-b ${registrationWindowStatus === 'open'
              ? 'bg-green-50 border-green-100 text-green-800'
              : registrationWindowStatus === 'not_open_yet'
                ? 'bg-orange-50 border-orange-100 text-orange-800'
                : 'bg-red-50 border-red-100 text-red-800'
              }`}>
              <Clock size={16} className="shrink-0" />
              {registrationWindowStatus === 'open' && (
                <span>Đăng ký đang <strong>mở</strong>{campaign.registration_close_at && <> — đóng lúc <strong>{formatGMT7(campaign.registration_close_at)}</strong> (GMT+7)</>}.</span>
              )}
              {registrationWindowStatus === 'not_open_yet' && (
                <span>Đăng ký <strong>chưa mở</strong>{campaign.registration_open_at && <> — sẽ mở lúc <strong>{formatGMT7(campaign.registration_open_at)}</strong> (GMT+7)</>}. Vui lòng quay lại đúng giờ.</span>
              )}
              {registrationWindowStatus === 'closed' && (
                <span>Đã <strong>hết thời gian</strong> đăng ký{campaign.registration_close_at && <> (đóng lúc <strong>{formatGMT7(campaign.registration_close_at)}</strong> GMT+7)</>}. Vui lòng liên hệ bộ phận quản lý.</span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider font-bold">
                  <th className="px-4 py-3 border-b border-slate-200 text-center w-14">Chọn</th>
                  <th
                    className="px-6 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => requestSort('name')}
                  >
                    <div className="flex items-center gap-1">Nơi thực tập {getSortIcon('name')}</div>
                  </th>
                  <th className="px-6 py-3 border-b border-slate-200">Địa chỉ</th>
                  <th
                    className="px-6 py-3 border-b border-slate-200 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => requestSort('slots')}
                  >
                    <div className="flex items-center justify-center gap-1">Số lượng tuyển {getSortIcon('slots')}</div>
                  </th>
                  <th
                    className="px-6 py-3 border-b border-slate-200 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => requestSort('applicant_count')}
                  >
                    <div className="flex items-center justify-center gap-1">Số ứng viên {getSortIcon('applicant_count')}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {paginatedCompanies.map((company) => {
                  const isSelected = selectedCompanies.has(company.id);
                  const isRegistered = myRegs.some((r: any) => r.company_id === company.id);
                  return (
                    <tr key={company.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''} ${isRegistered ? 'bg-green-50/30' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected || isRegistered}
                          disabled={hasRegistered || (!isSelected && selectedWishCount >= 5)}
                          onChange={() => toggleCompanySelection(company.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-700">
                        <button
                          onClick={() => navigate(`/company/${company.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-left"
                        >
                          {company.name} <ChevronRight size={14} className="opacity-70 transition-transform group-hover:translate-x-1" />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{company.address}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[11px] text-slate-500 font-bold">
                          {company.slots}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[11px] text-slate-500 font-bold">
                          {company.applicant_count ?? 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sortedCompanies.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Không tìm thấy doanh nghiệp phù hợp.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Đang tải danh sách doanh nghiệp...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {sortedCompanies.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
              <span>
                Hiển thị <strong>{(safeCompanyPage - 1) * companyPageSize + 1}</strong>-<strong>{Math.min(safeCompanyPage * companyPageSize, sortedCompanies.length)}</strong> / <strong>{sortedCompanies.length}</strong> nơi thực tập
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCompanyPage(page => Math.max(1, page - 1))}
                  disabled={safeCompanyPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <span className="min-w-20 text-center">Trang {safeCompanyPage}/{companyTotalPages}</span>
                <button
                  onClick={() => setCompanyPage(page => Math.min(companyTotalPages, page + 1))}
                  disabled={safeCompanyPage >= companyTotalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          )}


        </div>}
      </div>

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && canWithdrawRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Xác nhận hủy đăng ký</h3>
            </div>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              Bạn có chắc chắn muốn hủy kết quả đăng ký thực tập hiện tại?
              <br /><br />
              <strong>Lưu ý:</strong> Mọi lựa chọn đều được hệ thống ghi lại. Hủy bỏ là hành động không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleWithdraw}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Vẫn hủy Đăng ký
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmFinalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">Xác nhận nơi thực tập chính thức</h3>
              <button onClick={() => setConfirmFinalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={submitFinalConfirmation} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFinalConfirmMode('company')}
                  className={`px-3 py-2 rounded-md text-sm font-bold ${finalConfirmMode === 'company' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
                >
                  Công ty
                </button>
                <button
                  type="button"
                  onClick={() => setFinalConfirmMode('school')}
                  className={`px-3 py-2 rounded-md text-sm font-bold ${finalConfirmMode === 'school' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
                >
                  Tại trường
                </button>
              </div>

              {finalConfirmMode === 'company' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nơi thực tập đã trúng tuyển *</label>
                    <select
                      required
                      value={selectedFinalRegId}
                      onChange={e => setSelectedFinalRegId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn nơi thực tập --</option>
                      {approvedFinalOptions.map((reg: any) => (
                        <option key={reg.id} value={reg.id}>
                          {reg.company_name === 'Công ty khác' ? `Công ty khác: ${reg.other_company_name || ''}` : reg.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900">
                    <input
                      type="checkbox"
                      required
                      checked={finalAttested}
                      onChange={e => setFinalAttested(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-blue-300"
                    />
                    <span>Tôi xác nhận đã được đơn vị này tiếp nhận thực tập và chịu trách nhiệm về thông tin khai báo.</span>
                  </label>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Giảng viên đã đồng ý hướng dẫn <span className="text-slate-400 font-normal">(nếu có)</span></label>
                    <input
                      type="text"
                      list="final-lecturers-list"
                      value={finalSchoolLecturer}
                      onChange={e => setFinalSchoolLecturer(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Để trống nếu Khoa phân công sau..."
                    />
                    <datalist id="final-lecturers-list">
                      {lecturers.map(lec => <option key={lec} value={lec} />)}
                    </datalist>
                  </div>
                  <p className="text-xs text-slate-500">Chỉ chọn thực tập tại trường khi bạn không trúng tuyển công ty nào hoặc thực hiện theo sắp xếp của Khoa. Nếu để trống GVHD, Khoa sẽ phân công sau.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows={3}
                  value={finalNote}
                  onChange={e => setFinalNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Thông tin liên hệ mentor, thời gian bắt đầu, ghi chú với Khoa..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setConfirmFinalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingFinal || (finalConfirmMode === 'company' && !selectedFinalRegId)}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isConfirmingFinal ? 'Đang xác nhận...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 h-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">Đăng ký thực tập</h3>
              <button onClick={() => setRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">Bạn đang đăng ký <strong>{selectedWishCount}</strong> nguyện vọng:</p>
              <ul className="text-sm text-slate-700 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {selectedPreferencePreview.map((item, idx) => (
                  <li key={item.key} className="flex items-center gap-2"><span className="text-blue-600 font-bold text-xs">NV{idx + 1}</span> {item.name}</li>
                ))}
              </ul>
            </div>
            <form onSubmit={submitRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã sinh viên *</label>
                <input required disabled={!!user?.student_id} type="text" className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${user?.student_id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} value={registerForm.student_id} onChange={e => setRegisterForm({ ...registerForm, student_id: e.target.value })} placeholder="VD: 20021234" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày sinh *</label>
                <input required disabled={!!user?.dob} type="date" max={new Date().toISOString().split('T')[0]} className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${user?.dob ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} value={registerForm.dob} onChange={e => setRegisterForm({ ...registerForm, dob: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại *</label>
                <input required type="tel" pattern="^(0|\+84)[35789][0-9]{8}$" title="Vui lòng nhập số điện thoại hợp lệ (10 số, VD: 0912345678)" className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${user?.phone ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} disabled={!!user?.phone} value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="VD: 0912345678" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email cá nhân (khác VNU) *</label>
                <input required type="email" className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${user?.personal_email ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} disabled={!!user?.personal_email} value={registerForm.personal_email} onChange={e => setRegisterForm({ ...registerForm, personal_email: e.target.value })} placeholder="VD: abc@gmail.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lớp khóa học *</label>
                <select required disabled={!!user?.class_name} className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${user?.class_name ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} value={registerForm.class_name} onChange={e => setRegisterForm({ ...registerForm, class_name: e.target.value })}>
                  <option value="">-- Chọn lớp khóa học --</option>
                  {(campaign.classes_list ? campaign.classes_list.split(',').map((c: string) => c.trim()) : []).map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Học phần thực tập *</label>
                <select required disabled={!!user?.course_code} className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${user?.course_code ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} value={registerForm.course_code} onChange={e => setRegisterForm({ ...registerForm, course_code: e.target.value })}>
                  <option value="">-- Chọn mã môn học --</option>
                  <option value="Thực tập Doanh nghiệp INT4002">1. Thực tập Doanh nghiệp INT4002</option>
                  <option value="Thực tập Chuyên ngành INT3508">2. Thực tập Chuyên ngành INT3508</option>
                  <option value="Thực tập Doanh nghiệp Nhật Bản INT4003">3. Thực tập Doanh nghiệp Nhật Bản INT4003</option>
                </select>
                <p className="text-[11px] text-red-500 mt-1.5 italic font-medium">* Lưu ý: Sinh viên phải chọn chính xác học phần theo khung chương trình đào tạo của mình.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows={hasSelectedKhac ? 2 : 3} value={registerForm.note} onChange={e => setRegisterForm({ ...registerForm, note: e.target.value })} placeholder="Mong muốn, kỹ năng nổi bật..." />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Đăng ký giảng viên hướng dẫn</h4>
                  <p className="text-xs text-emerald-800 mt-1">Nếu chưa chọn trong bước này, Khoa sẽ phân công sau theo quota còn lại.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={advisorRequestForm.request_type}
                    onChange={e => {
                      const requestType = e.target.value;
                      setAdvisorRequestForm({
                        ...advisorRequestForm,
                        request_type: requestType,
                        lecturer_name: requestType ? advisorRequestForm.lecturer_name : '',
                        co_lecturer_name: requestType ? advisorRequestForm.co_lecturer_name : ''
                      });
                    }}
                    className="border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Không đăng ký GVHD trong bước này</option>
                    <option value="agreed">Sinh viên đã được GV đồng ý hướng dẫn</option>
                    <option value="proposed">Sinh viên tự đề xuất GVHD</option>
                  </select>
                  <input
                    value={advisorRequestForm.lecturer_name}
                    onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, lecturer_name: e.target.value })}
                    disabled={!advisorRequestForm.request_type}
                    required={!!advisorRequestForm.request_type}
                    list="registration-advisor-primary-lecturers"
                    placeholder="Nhập/chọn GVHD chính"
                    className="border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-emerald-50 disabled:text-emerald-400"
                  />
                  <input
                    value={advisorRequestForm.co_lecturer_name}
                    onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, co_lecturer_name: e.target.value })}
                    disabled={!advisorRequestForm.request_type}
                    list="registration-advisor-co-lecturers"
                    placeholder="Nhập/chọn đồng hướng dẫn"
                    className="border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-emerald-50 disabled:text-emerald-400"
                  />
                  <datalist id="registration-advisor-primary-lecturers">
                    {lecturers.map(name => <option key={name} value={name} />)}
                  </datalist>
                  <datalist id="registration-advisor-co-lecturers">
                    {lecturers.map(name => <option key={name} value={name} />)}
                  </datalist>
                </div>
                <textarea
                  value={advisorRequestForm.student_note}
                  onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, student_note: e.target.value })}
                  placeholder="Ghi chú cho Khoa nếu tự đề xuất, ví dụ: lý do đề xuất, lĩnh vực phù hợp, hoặc thông tin đã trao đổi với GV..."
                  className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm resize-y bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={2}
                />
              </div>

              {hasSelectedSchool && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-900">
                  <h4 className="text-sm font-bold text-blue-900">Thực tập tại Trường</h4>
                  <p className="mt-1">Thông tin GVHD được lấy từ phần “Đăng ký giảng viên hướng dẫn” ở trên. Nếu chưa chọn trong bước này, Khoa sẽ phân công sau.</p>
                </div>
              )}

              {hasSelectedKhac && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-orange-800">Thông tin Công ty tự liên hệ</h4>
                  </div>
                  {otherCompanies.map((otherCompany, index) => (
                    <div key={index} className="space-y-4 pb-4 border-b border-orange-200 last:border-0 last:pb-0 relative">
                      {otherCompanies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOtherCompanies(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-1 -right-1 text-red-500 hover:text-red-700 bg-red-50 p-1 rounded-full"
                        >
                          <X size={16} />
                        </button>
                      )}
                      {otherCompanies.length > 1 && <h5 className="text-xs font-bold text-orange-700">Công ty {index + 1}</h5>}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tên công ty *</label>
                        <input required list="it-companies-datalist" type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={otherCompany.name} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, name: e.target.value } : c))} placeholder="Công ty CP Công nghệ..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Vị trí Thực tập *</label>
                        <input required list="role-suggestions" type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={otherCompany.role} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, role: e.target.value } : c))} placeholder="Thực tập sinh Frontend..." />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Người liên hệ *</label>
                          <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={otherCompany.contact_name} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, contact_name: e.target.value } : c))} placeholder="Anh Nguyễn Văn A" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Điện thoại *</label>
                          <input required type="tel" pattern="^(0|\+84)[35789][0-9]{8}$" title="Vui lòng nhập số điện thoại hợp lệ (10 số, VD: 0912345678)" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={otherCompany.contact_phone} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, contact_phone: e.target.value } : c))} placeholder="0987654321" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                          <input required type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={otherCompany.contact_email} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, contact_email: e.target.value } : c))} placeholder="a@company.com" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {Array.from(selectedCompanies).filter(id => id !== khacCompany?.id).length + otherCompanies.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setOtherCompanies(prev => [...prev, { name: '', role: '', contact_name: '', contact_phone: '', contact_email: '' }])}
                      className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      + Thêm công ty tự liên hệ
                    </button>
                  )}
                  <datalist id="it-companies-datalist">
                    {itCompanyList.map((name, i) => <option key={i} value={name} />)}
                  </datalist>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setRegisterModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                      Đang xử lý...
                    </>
                  ) : 'Xác nhận đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ token }: { token: string }) {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [savingToSheet, setSavingToSheet] = useState(false);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<any | null>(null);
  const [editRegistrationForm, setEditRegistrationForm] = useState({
    company_id: '',
    course_code: '',
    other_company_name: '',
    other_company_role: '',
    other_company_contact: '',
    note: '',
    preference_order: '',
    status: 'pending',
    review_comment: '',
  });
  const [registrationPage, setRegistrationPage] = useState(1);
  const registrationPageSize = 25;

  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
    fetchRegistrationCompanies();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (e) { }
    setLoading(false);
  };

  const fetchRegistrationCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/companies`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e) {
      setCompanies([]);
    }
  };

  const registrationExportData = (dataList: any[]) => {
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'SĐT', 'Email cá nhân', 'Lớp KH', 'Mã môn học', 'Nơi thực tập', 'Vị trí', 'Liên hệ', 'Ghi chú', 'Nhận xét duyệt', 'Trạng thái', 'Đã gửi DN', 'Thời gian đăng ký'];
    const rows = dataList.map((r, i) => {
      let noi_tt = r.company_name;
      if (r.company_name === 'Công ty khác') noi_tt = 'Công ty khác: ' + (r.other_company_name || '');

      let vi_tri = r.company_name === 'Công ty khác' ? (r.other_company_role || '') : 'Thực tập sinh';
      let lien_he = r.company_name === 'Công ty khác' ? (r.other_company_contact || '') : (r.contact_email || '');
      let ghi_chu = r.note || '';

      if (r.company_name === 'Trường Đại học Công nghệ') {
        lien_he = '';
        ghi_chu = 'GVHD: ' + (r.other_company_contact || '') + (r.other_company_role ? ` - Đồng HD: ${r.other_company_role}` : '') + (r.note ? ` - ${r.note}` : '');
      }

      return [
        i + 1,
        r.student_id,
        r.student_name,
        r.dob,
        r.phone || '',
        r.personal_email || '',
        r.class_name,
        r.course_code,
        noi_tt,
        vi_tri,
        lien_he,
        ghi_chu,
        r.review_comment || '',
        r.status === 'approved' ? 'Đã duyệt' : (r.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'),
        r.sent_to_company_at ? new Date(r.sent_to_company_at).toLocaleString('vi-VN') : '',
        new Date(r.created_at).toLocaleString('vi-VN')
      ];
    });
    return { headers, rows };
  };

  const handleExportCurrent = () => {
    const { headers, rows } = registrationExportData(filteredRegistrations);
    saveXlsx('danh_sach_hien_tai.xlsx', headers, rows, 'Danh sách');
    setIsExportMenuOpen(false);
  };

  const handleExportByCourse = async () => {
    const zip = new JSZip();
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'Lớp khóa học'];
    uniqueCourses.forEach(course => {
      const data = registrations.filter(r => r.course_code === course);
      if (data.length > 0) {
        const uniqueStudents = Array.from(
          data.reduce((map, row) => {
            const key = String(row.student_id || row.email || row.user_id || '').trim();
            if (key && !map.has(key)) map.set(key, row);
            return map;
          }, new Map<string, any>()).values()
        );
        const rows = uniqueStudents.map((row: any, idx: number) => [
          idx + 1,
          row.student_id || '',
          row.student_name || '',
          row.dob || '',
          row.class_name || '',
        ]);
        zip.file(`Lop_${course || 'KhongXacDinh'}.xlsx`, xlsxArrayBuffer(headers, rows, 'Danh sách'));
      }
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'DanhSachTheoLop.zip');
    setIsExportMenuOpen(false);
  };

  const handleExportByCompany = async () => {
    const zip = new JSZip();
    uniqueCompanies.forEach(company => {
      const data = registrations.filter(r => r.company_name === company);
      if (data.length > 0) {
        const safeName = (company as string).replace(/[^a-z0-9]/gi, '_');
        const { headers, rows } = registrationExportData(data);
        zip.file(`CongTy_${safeName}.xlsx`, xlsxArrayBuffer(headers, rows, 'Danh sách'));
      }
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'DanhSachTheoCongTy.zip');
    setIsExportMenuOpen(false);
  };

  const handleSaveToGoogleSheets = async () => {
    if (savingToSheet) return;
    if (!confirm('Hệ thống sẽ ghi đè toàn bộ dữ liệu hiện tại lên Google Sheets. Bạn có chắc chắn?')) return;
    setSavingToSheet(true);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      const res = await fetch(`${API_BASE}/api/admin/export-to-sheet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Đã lưu vào Google Sheets thành công!');
      } else {
        alert(data.error || 'Đã xảy ra lỗi khi lưu vào Google Sheets.');
      }
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSavingToSheet(false);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <span className="text-blue-600 font-bold">↑</span> :
      <span className="text-blue-600 font-bold">↓</span>;
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const current = registrations.find(r => Number(r.registration_id) === Number(id));
      const commentPrompt = status === 'pending'
        ? ''
        : prompt(status === 'approved' ? 'Nhận xét gửi cho sinh viên khi duyệt (có thể để trống):' : 'Lý do/nhận xét gửi cho sinh viên khi từ chối:', current?.review_comment || '');
      if (commentPrompt === null) return;
      const review_comment = status === 'pending' ? '' : commentPrompt;
      const res = await fetch(`${API_BASE}/api/admin/registrations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, review_comment })
      });
      if (res.ok) {
        fetchRegistrations();
      } else {
        const data = await res.json();
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    }
  };

  const handleSendRegistrationComment = async (reg: any) => {
    const comment = prompt(
      `Nhận xét gửi cho ${reg.student_name || 'sinh viên'}:`,
      reg.review_comment || ''
    );
    if (comment === null) return;
    const review_comment = comment.trim();
    if (!review_comment) return alert('Vui lòng nhập nội dung nhận xét.');
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/${reg.registration_id}/comment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ review_comment })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Gửi nhận xét thất bại.');
      fetchRegistrations();
      alert('Đã gửi nhận xét cho sinh viên.');
    } catch (e) {
      alert('Lỗi kết nối.');
    }
  };

  const handleSendFilteredRegistrationComment = async () => {
    if (filteredRegistrations.length === 0) return alert('Danh sách đang lọc đang trống.');
    const comment = prompt(`Nhận xét gửi cho ${filteredRegistrations.length} đăng ký trong danh sách đang lọc:`, '');
    if (comment === null) return;
    const review_comment = comment.trim();
    if (!review_comment) return alert('Vui lòng nhập nội dung nhận xét.');
    if (!confirm(`Gửi nhận xét này cho ${filteredRegistrations.length} đăng ký trong danh sách đang lọc?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/comments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          registration_ids: filteredRegistrations.map(reg => Number(reg.registration_id)).filter(Boolean),
          review_comment
        })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Gửi nhận xét thất bại.');
      fetchRegistrations();
      alert(`Đã gửi nhận xét cho ${data.count || 0} đăng ký.`);
    } catch (e) {
      alert('Lỗi kết nối.');
    }
  };

  const startEditRegistration = (reg: any) => {
    setEditingRegistration(reg);
    setEditRegistrationForm({
      company_id: String(reg.company_id || ''),
      course_code: reg.course_code || '',
      other_company_name: reg.other_company_name || '',
      other_company_role: reg.other_company_role || '',
      other_company_contact: reg.other_company_contact || '',
      note: reg.note || '',
      preference_order: reg.preference_order ? String(reg.preference_order) : '',
      status: reg.status || 'pending',
      review_comment: reg.review_comment || '',
    });
  };

  const closeEditRegistration = () => {
    if (savingRegistration) return;
    setEditingRegistration(null);
  };

  const handleSaveRegistrationEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegistration) return;
    if (!editRegistrationForm.company_id) return alert('Vui lòng chọn nơi thực tập.');
    setSavingRegistration(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/${editingRegistration.registration_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editRegistrationForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Cập nhật đăng ký thất bại.');
      setEditingRegistration(null);
      await fetchRegistrations();
    } catch (e) {
      alert('Lỗi kết nối khi cập nhật đăng ký.');
    } finally {
      setSavingRegistration(false);
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn duyệt tất cả các đăng ký đang chờ?")) return;
    const commentPrompt = prompt('Nhận xét chung gửi cho các sinh viên được duyệt (có thể để trống):', '');
    if (commentPrompt === null) return;
    const review_comment = commentPrompt;
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/approve-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ review_comment })
      });
      if (res.ok) {
        fetchRegistrations();
        alert('Đã duyệt tất cả');
      } else {
        const data = await res.json();
        alert(data.error || 'Duyệt thất bại');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    }
  };

  const sortedRegistrations = [...registrations].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key] || '';
    const bVal = b[key] || '';

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const uniqueCourses = Array.from(new Set(registrations.map(r => r.course_code).filter(Boolean)));
  const uniqueCompanies = Array.from(new Set(registrations.map(r => r.company_name).filter(Boolean)));

  const filteredRegistrations = sortedRegistrations.filter(reg => {
    const term = searchTerm.toLowerCase();
    const matchTerm = (
      (reg.student_name || '').toLowerCase().includes(term) ||
      (reg.email || '').toLowerCase().includes(term) ||
      (reg.company_name || '').toLowerCase().includes(term) ||
      (reg.other_company_name || '').toLowerCase().includes(term) ||
      (reg.other_company_contact || '').toLowerCase().includes(term) ||
      (reg.student_id || '').toLowerCase().includes(term) ||
      (reg.class_name || '').toLowerCase().includes(term) ||
      (reg.review_comment || '').toLowerCase().includes(term)
    );
    const matchCourse = filterCourse ? reg.course_code === filterCourse : true;
    const matchStatus = filterStatus ? reg.status === filterStatus : true;
    return matchTerm && matchCourse && matchStatus;
  });
  useEffect(() => {
    setRegistrationPage(1);
  }, [searchTerm, filterCourse, filterStatus, sortConfig, registrations.length]);
  const registrationPagination = paginationBounds(filteredRegistrations.length, registrationPage, registrationPageSize);
  const paginatedRegistrations = filteredRegistrations.slice(
    (registrationPagination.safePage - 1) * registrationPageSize,
    registrationPagination.safePage * registrationPageSize
  );

  const totalRegistrations = registrations.length;
  const totalStudents = new Set(registrations.map(r => r.user_id || r.student_id || r.email).filter(Boolean)).size;
  const totalCompanies = new Set(registrations.map(r => (
    r.company_name === 'Công ty khác'
      ? (r.other_company_name || r.company_name)
      : r.company_name
  )).filter(Boolean)).size;
  const pendingRegistrations = registrations.filter(r => r.status === 'pending').length;
  const approvedRegistrations = registrations.filter(r => r.status === 'approved').length;
  const rejectedRegistrations = registrations.filter(r => r.status === 'rejected').length;
  const clearRegistrationFilters = () => {
    setSearchTerm('');
    setFilterCourse('');
    setFilterStatus('');
  };
  const applyRegistrationStatusFilter = (status: string) => {
    setFilterStatus(status);
  };
  const editingCompany = companies.find(company => Number(company.id) === Number(editRegistrationForm.company_id));
  const editingIsOtherCompany = editingCompany?.name === 'Công ty khác';
  const editingIsSchoolInternship = editingCompany?.name === 'Trường Đại học Công nghệ';

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm whitespace-nowrap font-medium">&larr; Quay lại</button>
          <span title="Gửi cùng một nhận xét cho toàn bộ danh sách đăng ký đang được lọc ở bảng bên dưới.">
            <button
              onClick={handleSendFilteredRegistrationComment}
              disabled={filteredRegistrations.length === 0}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 shadow-sm transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} /> Gửi nhận xét
            </button>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 flex-1 lg:justify-end">
          <div className="relative flex-1 min-w-[250px] max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm sinh viên, công ty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm"
            />
          </div>
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap"
          >
            <CheckCircle2 size={18} /> Duyệt tất cả
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm transition-colors whitespace-nowrap"
            >
              <Download size={18} /> Xuất dữ liệu <ChevronDown size={14} />
            </button>
            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden text-slate-800 origin-top-right">
                  <button onClick={handleExportCurrent} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50 w-full text-left">
                    <FileText size={16} className="text-green-600" /> Xuất danh sách đang lọc (XLSX)
                  </button>
                  <button onClick={handleExportByCourse} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50 w-full text-left">
                    <Download size={16} className="text-blue-600" /> Xuất theo môn học (ZIP)
                  </button>
                  <button onClick={handleExportByCompany} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors w-full text-left">
                    <Download size={16} className="text-blue-600" /> Xuất theo công ty (ZIP)
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleSaveToGoogleSheets}
            disabled={savingToSheet}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap disabled:opacity-70 disabled:cursor-wait"
          >
            {savingToSheet ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
            {savingToSheet ? 'Đang lưu...' : 'Lưu vào Google Sheets'}
          </button>
        </div>
      </div>

      {savingToSheet && (
        <div aria-live="polite" className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <RefreshCw size={18} className="animate-spin shrink-0" />
          <span>Đang ghi danh sách đăng ký lên Google Sheets, vui lòng đợi...</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <button type="button" onClick={clearRegistrationFilters} className={`text-left bg-white p-5 rounded-xl border shadow-sm flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md ${!searchTerm && !filterCourse && !filterStatus ? 'border-slate-400 ring-2 ring-slate-100' : 'border-slate-200'}`}>
          <span className="text-slate-500 text-sm font-medium mb-1">Tổng nguyện vọng</span>
          <span className="text-3xl font-bold text-slate-800">{totalRegistrations}</span>
        </button>
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col">
          <span className="text-blue-600 text-sm font-medium mb-1">Số sinh viên đăng ký</span>
          <span className="text-3xl font-bold text-blue-700">{totalStudents}</span>
        </div>
        <div className="bg-cyan-50 p-5 rounded-xl border border-cyan-100 shadow-sm flex flex-col">
          <span className="text-cyan-700 text-sm font-medium mb-1">Số công ty</span>
          <span className="text-3xl font-bold text-cyan-800">{totalCompanies}</span>
        </div>
        <button type="button" onClick={() => applyRegistrationStatusFilter('pending')} className={`text-left bg-orange-50 p-5 rounded-xl border shadow-sm flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md ${filterStatus === 'pending' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-orange-100'}`}>
          <span className="text-orange-600 text-sm font-medium mb-1">Chờ duyệt</span>
          <span className="text-3xl font-bold text-orange-700">{pendingRegistrations}</span>
        </button>
        <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm flex flex-col">
          <span className="text-green-600 text-sm font-medium mb-1">Đã duyệt</span>
          <span className="text-3xl font-bold text-green-700">{approvedRegistrations}</span>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm flex flex-col">
          <span className="text-red-600 text-sm font-medium mb-1">Từ chối</span>
          <span className="text-3xl font-bold text-red-700">{rejectedRegistrations}</span>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('student_id')}>
                  <div className="flex items-center gap-1">Mã SV {getSortIcon('student_id')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('student_name')}>
                  <div className="flex items-center gap-1">Họ và tên {getSortIcon('student_name')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('dob')}>
                  <div className="flex items-center gap-1">Ngày sinh {getSortIcon('dob')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('phone')}>
                  <div className="flex items-center gap-1">SĐT {getSortIcon('phone')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('personal_email')}>
                  <div className="flex items-center gap-1">Email cá nhân {getSortIcon('personal_email')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('class_name')}>
                  <div className="flex items-center gap-1">Lớp KH {getSortIcon('class_name')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('course_code')}>
                  <div className="flex items-center gap-1">Mã môn {getSortIcon('course_code')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('company_name')}>
                  <div className="flex items-center gap-1">Nơi thực tập {getSortIcon('company_name')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('note')}>
                  <div className="flex items-center gap-1">Ghi chú {getSortIcon('note')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('created_at')}>
                  <div className="flex items-center gap-1">Thời gian {getSortIcon('created_at')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('sent_to_company_at')}>
                  <div className="flex items-center gap-1">Gửi DN {getSortIcon('sent_to_company_at')}</div>
                </th>
                <th className="px-6 py-4 text-center">Thao tác</th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center justify-center gap-1">Trạng thái {getSortIcon('status')}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('review_comment')}>
                  <div className="flex items-center gap-1">Nhận xét {getSortIcon('review_comment')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu.</td>
                </tr>
              ) : (
                paginatedRegistrations.map(reg => (
                  <tr key={reg.registration_id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">{reg.student_id || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{reg.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{reg.dob ? new Date(reg.dob).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{reg.phone || '-'}</td>
                    <td className="px-6 py-4">{reg.personal_email ? <a href={`mailto:${reg.personal_email}`} className="text-blue-600 hover:underline">{reg.personal_email}</a> : '-'}</td>
                    <td className="px-6 py-4">{reg.class_name || '-'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{reg.course_code?.split(' ').pop() || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {reg.company_name === 'Công ty khác' ? ('Công ty khác: ' + (reg.other_company_name || '')) : reg.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {reg.company_name === 'Công ty khác' ? (
                        <div className="text-xs text-gray-600 font-normal leading-relaxed">
                          <span className="inline-block font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded mb-1 border border-blue-100">Tự liên hệ</span><br />
                          <span className="font-semibold text-gray-700">Vị trí:</span> {reg.other_company_role} <br />
                          <span className="font-semibold text-gray-700">Liên hệ:</span> {reg.other_company_contact}
                          {reg.note && <><br /><span className="font-semibold text-gray-700">Lưu ý thêm:</span> {reg.note}</>}
                        </div>
                      ) : reg.company_name === 'Trường Đại học Công nghệ' ? (
                        <div className="text-xs text-gray-600 font-normal leading-relaxed">
                          <span className="font-semibold text-gray-700">GVHD:</span> {reg.other_company_contact}
                          {reg.other_company_role && <><br /><span className="font-semibold text-gray-700">Đồng HD:</span> {reg.other_company_role}</>}
                          {reg.note && <><br /><span className="font-semibold text-gray-700">Ghi chú:</span> {reg.note}</>}
                        </div>
                      ) : (
                        reg.note
                      )}
                    </td>
                    <td className="px-6 py-4">{new Date(reg.created_at).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {reg.sent_to_company_at ? (
                        <span className="text-emerald-700 font-semibold">{new Date(reg.sent_to_company_at).toLocaleString('vi-VN')}</span>
                      ) : (
                        <span className="text-slate-400">Chưa gửi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => startEditRegistration(reg)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        title="Sửa thông tin đăng ký"
                      >
                        <Edit2 size={13} /> Sửa
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={reg.status}
                        onChange={(e) => handleUpdateStatus(reg.registration_id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full outline-none cursor-pointer border-2 border-transparent transition-colors ${reg.status === 'pending' ? 'bg-orange-100 text-orange-800 hover:border-orange-200 focus:border-orange-400' :
                          reg.status === 'approved' ? 'bg-green-100 text-green-800 hover:border-green-200 focus:border-green-400' :
                            'bg-red-100 text-red-800 hover:border-red-200 focus:border-red-400'
                          }`}
                      >
                        <option value="pending" className="bg-white text-gray-900">Chờ Duyệt</option>
                        <option value="approved" className="bg-white text-gray-900">Đã Duyệt</option>
                        <option value="rejected" className="bg-white text-gray-900">Từ Chối</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 min-w-[220px] whitespace-pre-wrap">
                      <div className="space-y-2">
                        <div>{reg.review_comment || '-'}</div>
                        <button
                          onClick={() => handleSendRegistrationComment(reg)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Send size={12} /> Gửi nhận xét
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={filteredRegistrations.length}
          currentPage={registrationPage}
          pageSize={registrationPageSize}
          onPageChange={setRegistrationPage}
          label="đăng ký"
        />
      </div>

      {editingRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sửa đăng ký thực tập</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {editingRegistration.student_id || '-'} - {editingRegistration.student_name || 'Sinh viên'}
                </p>
              </div>
              <button onClick={closeEditRegistration} disabled={savingRegistration} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-60">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveRegistrationEdit} className="overflow-y-auto max-h-[calc(90vh-73px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nơi thực tập *</label>
                  <select
                    value={editRegistrationForm.company_id}
                    onChange={e => setEditRegistrationForm({ ...editRegistrationForm, company_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Chọn nơi thực tập --</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Thứ tự nguyện vọng</label>
                  <input
                    type="number"
                    min="1"
                    value={editRegistrationForm.preference_order}
                    onChange={e => setEditRegistrationForm({ ...editRegistrationForm, preference_order: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Học phần</label>
                  <select
                    value={editRegistrationForm.course_code}
                    onChange={e => setEditRegistrationForm({ ...editRegistrationForm, course_code: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chưa xác định --</option>
                    <option value="Thực tập Doanh nghiệp INT4002">Thực tập Doanh nghiệp INT4002</option>
                    <option value="Thực tập Chuyên ngành INT3508">Thực tập Chuyên ngành INT3508</option>
                    <option value="Thực tập Doanh nghiệp Nhật Bản INT4003">Thực tập Doanh nghiệp Nhật Bản INT4003</option>
                  </select>
                </div>

                {editingIsOtherCompany && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tên công ty tự liên hệ *</label>
                      <input
                        value={editRegistrationForm.other_company_name}
                        onChange={e => setEditRegistrationForm({ ...editRegistrationForm, other_company_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tên công ty"
                        required={editingIsOtherCompany}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Vị trí thực tập</label>
                      <input
                        value={editRegistrationForm.other_company_role}
                        onChange={e => setEditRegistrationForm({ ...editRegistrationForm, other_company_role: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="VD: Frontend Intern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Thông tin liên hệ</label>
                      <input
                        value={editRegistrationForm.other_company_contact}
                        onChange={e => setEditRegistrationForm({ ...editRegistrationForm, other_company_contact: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Email/SĐT/người liên hệ"
                      />
                    </div>
                  </>
                )}

                {editingIsSchoolInternship && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Giảng viên hướng dẫn</label>
                      <input
                        value={editRegistrationForm.other_company_contact}
                        onChange={e => setEditRegistrationForm({ ...editRegistrationForm, other_company_contact: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tên GVHD nếu đã có"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Giảng viên đồng hướng dẫn</label>
                      <input
                        value={editRegistrationForm.other_company_role}
                        onChange={e => setEditRegistrationForm({ ...editRegistrationForm, other_company_role: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Không bắt buộc"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú đăng ký</label>
                  <textarea
                    rows={3}
                    value={editRegistrationForm.note}
                    onChange={e => setEditRegistrationForm({ ...editRegistrationForm, note: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ghi chú của sinh viên hoặc điều chỉnh từ Khoa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
                  <select
                    value={editRegistrationForm.status}
                    onChange={e => setEditRegistrationForm({ ...editRegistrationForm, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Từ chối</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nhận xét gửi sinh viên</label>
                  <input
                    value={editRegistrationForm.review_comment}
                    onChange={e => setEditRegistrationForm({ ...editRegistrationForm, review_comment: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Lý do duyệt/từ chối hoặc yêu cầu chỉnh sửa"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button type="button" onClick={closeEditRegistration} disabled={savingRegistration} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  Huỷ
                </button>
                <button type="submit" disabled={savingRegistration} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {savingRegistration ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingRegistration ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function FinalInternshipListAdmin({ token }: { token: string }) {
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
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Trang chủ</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-emerald-600" /> Danh sách xác nhận thực tập</h2>
          <p className="text-sm text-slate-500 mt-1">Sinh viên đã xác nhận nơi thực tập chính thức để lấy điểm học phần.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={fetchRows} className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-200 text-sm font-medium shadow-sm flex items-center gap-2">
            <RefreshCw size={16} /> Tải lại
          </button>
          <button onClick={exportXlsx} disabled={filteredRows.length === 0} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-50">
            <Download size={16} /> Xuất XLSX
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-slate-500 text-sm font-medium mb-1">Tổng xác nhận</span>
          <span className="text-3xl font-bold text-slate-800">{rows.length}</span>
        </div>
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col">
          <span className="text-blue-600 text-sm font-medium mb-1">Số sinh viên</span>
          <span className="text-3xl font-bold text-blue-700">{uniqueStudents}</span>
        </div>
        <div className="bg-cyan-50 p-5 rounded-xl border border-cyan-100 shadow-sm flex flex-col">
          <span className="text-cyan-700 text-sm font-medium mb-1">Số nơi thực tập</span>
          <span className="text-3xl font-bold text-cyan-800">{uniquePlaces}</span>
        </div>
        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col">
          <span className="text-emerald-600 text-sm font-medium mb-1">Thực tập công ty</span>
          <span className="text-3xl font-bold text-emerald-700">{companyCount}</span>
        </div>
        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col">
          <span className="text-indigo-600 text-sm font-medium mb-1">TT ở trường</span>
          <span className="text-3xl font-bold text-indigo-700">{schoolCount}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm mã SV, tên, nơi thực tập, GVHD..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tất cả loại</option>
          <option value="company">Công ty</option>
          <option value="school">Tại trường</option>
          <option value="partner">Đối tác</option>
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('student_id')}>Mã SV<SortIcon col="student_id" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('student_name')}>Họ và tên<SortIcon col="student_name" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('internship_type')}>Loại<SortIcon col="internship_type" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('internship_place')}>Nơi thực tập<SortIcon col="internship_place" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('school_lecturer')}>GVHD tại trường<SortIcon col="school_lecturer" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('course_code')}>Môn học<SortIcon col="course_code" /></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('confirmed_at')}>Thời gian xác nhận<SortIcon col="confirmed_at" /></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Chưa có sinh viên xác nhận nơi thực tập chính thức.</td>
                </tr>
              ) : (
                paginatedRows.map(item => (
                  <tr key={item.id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono">{item.student_id || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.student_name}</div>
                      <div className="text-xs text-slate-500">{item.class_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${item.internship_type === 'school' ? 'bg-blue-100 text-blue-700' : item.internship_type === 'partner' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {typeLabel(item.internship_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 min-w-[220px]">{internshipPlace(item)}</td>
                    <td className="px-6 py-4">{item.school_assignment_request ? 'Khoa sẽ phân công' : (item.school_lecturer || '-')}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{item.course_code?.split(' ').pop() || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.confirmed_at ? new Date(item.confirmed_at).toLocaleString('vi-VN') : '-'}</td>
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

function AdvisorAssignmentAdmin({ token, view = 'assignments' }: { token: string, view?: 'assignments' | 'requests' | 'quotas' }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [advisorRequests, setAdvisorRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLecturers, setSelectedLecturers] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, 'primary' | 'co'>>({});
  const [assigningKey, setAssigningKey] = useState<string | null>(null);
  const [quotaEdits, setQuotaEdits] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const fetchData = async () => {
    setLoading(true);
    try {
      const reqRes = await fetch(`${API_BASE}/api/admin/advisor-requests`, { headers: { Authorization: `Bearer ${token}` } });
      const requestData = await reqRes.json();
      const res = await fetch(`${API_BASE}/api/admin/advisor-assignments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLecturers(Array.isArray(data.lecturers) ? data.lecturers : []);
      setAdvisorRequests(Array.isArray(requestData) ? requestData : []);
    } catch (e) {
      alert('Không tải được danh sách phân công.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const parseAssignments = (value: string | null) => String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [id, name, email] = item.split('|');
      return { id: Number(id), name, email };
    })
    .filter(item => item.id && item.name);

  const filteredRows = rows.filter(row => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      row.student_id?.toLowerCase().includes(term) ||
      row.student_name?.toLowerCase().includes(term) ||
      row.class_name?.toLowerCase().includes(term) ||
      row.course_code?.toLowerCase().includes(term) ||
      row.internship_place?.toLowerCase().includes(term)
    );
  });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rows.length]);
  const pagination = paginationBounds(filteredRows.length, currentPage, pageSize);
  const paginatedRows = filteredRows.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);

  const assign = async (row: any) => {
    const key = String(row.user_id);
    const lecturerId = selectedLecturers[key];
    if (!lecturerId) return alert('Vui lòng chọn giảng viên.');
    setAssigningKey(key);
    try {
      const res = await fetch(`${API_BASE}/api/admin/advisor-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: row.user_id, lecturer_id: Number(lecturerId), role: selectedRoles[key] || 'primary' })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Phân công thất bại.');
      setSelectedLecturers(prev => ({ ...prev, [key]: '' }));
      fetchData();
    } catch (e) {
      alert('Lỗi kết nối khi phân công.');
    } finally {
      setAssigningKey(null);
    }
  };

  const removeAssignment = async (id: number) => {
    if (!confirm('Xóa phân công này?')) return;
    const res = await fetch(`${API_BASE}/api/admin/advisor-assignments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) fetchData();
    else alert('Xóa phân công thất bại.');
  };

  const saveQuota = async (lecturer: any) => {
    const value = Number(quotaEdits[String(lecturer.id)] || lecturer.max_total_students);
    if (!value || value < 1) return alert('Chỉ tiêu không hợp lệ.');
    const res = await fetch(`${API_BASE}/api/admin/lecturer-quotas/${lecturer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ max_total_students: value })
    });
    if (res.ok) fetchData();
    else alert('Lưu chỉ tiêu thất bại.');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rows = await readSpreadsheetRows(file);
      const dataRows = rows[0]?.join(' ').toLowerCase().includes('student_id') || rows[0]?.join(' ').toLowerCase().includes('mã sv')
        ? rows.slice(1)
        : rows;
      const items = dataRows.map(parts => {
        return {
          student_id: parts[0],
          lecturer_email_or_name: parts[1],
          role: parts[2] === 'co' ? 'co' : 'primary',
          note: parts[3] || ''
        };
      }).filter(item => item.student_id && item.lecturer_email_or_name);
      if (items.length === 0) return alert('File cần cột: student_id, lecturer_email_or_name, role, note');
      const res = await fetch(`${API_BASE}/api/admin/advisor-assignments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignments: items })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Import thất bại.');
      alert(`Đã import ${data.count || 0} phân công.${data.errors?.length ? `\nLỗi:\n${data.errors.slice(0, 10).join('\n')}` : ''}`);
      fetchData();
    } catch (err) {
      alert('Không đọc được file XLSX/CSV.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const autoAssignPrimary = async () => {
    if (!confirm('Tự phân công GVHD chính cho tất cả sinh viên đã xác nhận nhưng chưa có GVHD chính?')) return;
    setAutoAssigning(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/advisor-assignments/auto-primary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Tự phân công thất bại.');
      alert(`Đã phân công ${data.count || 0} sinh viên.${data.errors?.length ? `\nCòn lỗi:\n${data.errors.slice(0, 10).join('\n')}` : ''}`);
      fetchData();
    } catch (e) {
      alert('Lỗi kết nối khi tự phân công.');
    } finally {
      setAutoAssigning(false);
    }
  };

  const reviewAdvisorRequest = async (request: any, action: 'approve' | 'reject') => {
    const adminNote = action === 'reject' ? prompt('Nhập nhận xét gửi sinh viên:') : (request.quota_status === 'over_quota' ? prompt('GV đã đủ/vượt quota. Nhập ghi chú duyệt thủ công (có thể để trống):') : '');
    if (adminNote === null) return;
    if (action === 'reject' && !adminNote) return;
    const res = await fetch(`${API_BASE}/api/admin/advisor-requests/${request.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, admin_note: adminNote || '' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'Không xử lý được đề xuất.');
    fetchData();
  };

  const exportXlsx = () => {
    const headers = ['STT', 'Mã SV', 'Họ tên', 'Lớp', 'Mã môn', 'Nơi thực tập', 'GVHD chính', 'Đồng hướng dẫn'];
    const data = filteredRows.map((row, idx) => [
      idx + 1,
      row.student_id || '',
      row.student_name || '',
      row.class_name || '',
      row.course_code || '',
      row.internship_place || '',
      parseAssignments(row.primary_assignments).map(a => a.name).join('; '),
      parseAssignments(row.co_assignments).map(a => a.name).join('; ')
    ]);
    saveXlsx('phan_cong_gvhd.xlsx', headers, data, 'Phân công GVHD');
  };

  const isAssignmentsView = view === 'assignments';
  const isRequestsView = view === 'requests';
  const isQuotasView = view === 'quotas';
  const pageTitle = isRequestsView ? 'Phê duyệt đề xuất GVHD' : isQuotasView ? 'Chỉ tiêu giảng viên' : 'Phân công giảng viên hướng dẫn';

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải dữ liệu GVHD...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="min-w-0">
          <button onClick={() => navigate(isAssignmentsView ? '/admin' : '/admin/advisors')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; {isAssignmentsView ? 'Quay lại Quản trị' : 'Quay lại Phân công GVHD'}</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 leading-tight">
            <Users className="text-emerald-600 shrink-0" size={26} /> {pageTitle}
          </h2>
        </div>
        {isAssignmentsView && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate('/admin/advisors/requests')} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
                  <CheckCircle2 size={16} /> Phê duyệt đề xuất
                  {advisorRequests.filter(item => item.status === 'pending').length > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{advisorRequests.filter(item => item.status === 'pending').length}</span>}
                </button>
                <button onClick={() => navigate('/admin/advisors/quotas')} className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
                  <Settings size={16} /> Chỉ tiêu GV
                </button>
              </div>
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm sinh viên, nơi thực tập..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex flex-wrap gap-2">
                <label className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap ${importing ? 'bg-slate-400 text-white cursor-wait' : 'bg-teal-600 text-white cursor-pointer hover:bg-teal-700'}`}>
                  {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />} Import XLSX
                  <input type="file" accept=".xlsx,.xls,.csv" disabled={importing} className="hidden" onChange={handleImport} onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} />
                </label>
                <button onClick={autoAssignPrimary} disabled={autoAssigning} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
                  {autoAssigning ? <RefreshCw size={16} className="animate-spin" /> : <Users size={16} />} Tự phân công
                </button>
                <button onClick={exportXlsx} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
                  <Download size={16} /> Xuất XLSX
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isRequestsView && <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">Đề xuất GVHD từ sinh viên</h3>
            <p className="text-xs text-slate-500 mt-1">Sinh viên đã được GV đồng ý, tự đề xuất, hoặc nhờ Khoa phân công.</p>
          </div>
          <span className="text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1">
            {advisorRequests.filter(item => item.status === 'pending').length} chờ xử lý
          </span>
        </div>
        {advisorRequests.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">Chưa có đề xuất GVHD.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Sinh viên</th>
                  <th className="px-4 py-3">Nguồn / Trạng thái</th>
                  <th className="px-4 py-3">GV đề xuất</th>
                  <th className="px-4 py-3">Ghi chú</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advisorRequests.slice(0, 12).map(request => (
                  <tr key={request.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{request.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{request.student_id || '-'}</div>
                      <div className="text-xs text-slate-500">{request.class_name || '-'} · {request.course_code || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-700">
                        {request.request_type === 'agreed' ? 'Đã được GV đồng ý' : request.request_type === 'faculty_assign' ? 'Khoa sẽ phân công' : 'Tự đề xuất'}
                      </div>
                      <div className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-bold ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' : request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {request.status === 'pending' ? 'Chờ xử lý' : request.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                      </div>
                      {request.source_registration_id && <div className="text-[11px] text-blue-700 mt-1">Từ đăng ký tại trường</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div>{request.lecturer_name || request.lecturer_name_text || '-'}</div>
                      {(request.co_lecturer_name || request.co_lecturer_name_text) && <div className="text-xs text-slate-500 mt-1">Đồng HD: {request.co_lecturer_name || request.co_lecturer_name_text}</div>}
                      {request.quota_status === 'over_quota' && <div className="text-xs text-red-700 font-semibold mt-1">Vượt quota - duyệt thủ công</div>}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-xs text-slate-600 whitespace-pre-wrap">{request.student_note || '-'}</div>
                      {request.admin_note && <div className="text-xs text-red-700 mt-1">Khoa: {request.admin_note}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {request.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => reviewAdvisorRequest(request, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Duyệt</button>
                          <button onClick={() => reviewAdvisorRequest(request, 'reject')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Từ chối</button>
                        </div>
                      ) : <span className="text-xs text-slate-400">Đã xử lý</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {isAssignmentsView && <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Sinh viên</th>
                <th className="px-4 py-3">Nơi thực tập</th>
                <th className="px-4 py-3">GVHD hiện tại</th>
                <th className="px-4 py-3">Phân công</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Chưa có sinh viên cần phân công.</td></tr>
              ) : paginatedRows.map(row => {
                const key = String(row.user_id);
                const primary = parseAssignments(row.primary_assignments);
                const co = parseAssignments(row.co_assignments);
                return (
                  <tr key={key} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{row.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{row.student_id || '-'}</div>
                      <div className="text-xs text-slate-500">{row.class_name || '-'} · {row.course_code || '-'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-800">{row.internship_place || '-'}</div>
                      {row.school_assignment_request ? <div className="text-xs text-orange-700 mt-1">Sinh viên nhờ Khoa phân công</div> : null}
                    </td>
                    <td className="px-4 py-4 space-y-2">
                      {[...primary.map(a => ({ ...a, role: 'primary' })), ...co.map(a => ({ ...a, role: 'co' }))].length === 0 ? (
                        <span className="text-slate-400 text-sm">Chưa phân công</span>
                      ) : (
                        [...primary.map(a => ({ ...a, role: 'primary' })), ...co.map(a => ({ ...a, role: 'co' }))].map(a => (
                          <div key={a.id} className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${a.role === 'primary' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{a.role === 'primary' ? 'Chính' : 'Đồng'}</span>
                            <span className="text-sm">{a.name}</span>
                            <button onClick={() => removeAssignment(a.id)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Xóa"><Trash2 size={14} /></button>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col lg:flex-row gap-2">
                        <select value={selectedRoles[key] || 'primary'} onChange={e => setSelectedRoles(prev => ({ ...prev, [key]: e.target.value as 'primary' | 'co' }))} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
                          <option value="primary">Hướng dẫn chính</option>
                          <option value="co">Đồng hướng dẫn</option>
                        </select>
                        <select value={selectedLecturers[key] || ''} onChange={e => setSelectedLecturers(prev => ({ ...prev, [key]: e.target.value }))} className="border border-slate-300 rounded-lg px-2 py-2 text-sm min-w-[220px]">
                          <option value="">-- Chọn giảng viên --</option>
                          {lecturers.map(lecturer => (
                            <option key={lecturer.id} value={lecturer.id}>
                              {lecturer.name} ({lecturer.assignment_count}/{lecturer.max_total_students})
                            </option>
                          ))}
                        </select>
                        <button onClick={() => assign(row)} disabled={assigningKey === key} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                          {assigningKey === key ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Gán
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={filteredRows.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          label="sinh viên"
        />
      </div>}

      {isQuotasView && <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-3">Chỉ tiêu giảng viên</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {lecturers.map(lecturer => (
            <div key={lecturer.id} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm text-slate-800 truncate">{lecturer.name}</div>
                <div className="text-xs text-slate-500">{lecturer.assignment_count}/{lecturer.max_total_students} sinh viên</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="1" value={quotaEdits[String(lecturer.id)] ?? lecturer.max_total_students} onChange={e => setQuotaEdits(prev => ({ ...prev, [lecturer.id]: e.target.value }))} className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-center" />
                <button onClick={() => saveQuota(lecturer)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Lưu chỉ tiêu"><Save size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

function FinalReportAdmin({ token }: { token: string }) {
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
    saveXlsx('bao_cao_final.xlsx', headers, data, 'Báo cáo final');
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải báo cáo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-indigo-600" /> Báo cáo final</h2>
          <p className="text-sm text-slate-500 mt-1">Theo dõi báo cáo PDF final của sinh viên đã xác nhận nơi thực tập.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Tất cả trạng thái</option>
            <option value="missing">Chưa nộp</option>
            <option value="submitted">Đã nộp</option>
            <option value="needs_revision">Cần nộp lại</option>
            <option value="accepted">Đã chấp nhận</option>
          </select>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm sinh viên, nơi TT, GVHD..." className="w-full sm:w-80 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          <button onClick={exportXlsx} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
            <Download size={16} /> Xuất XLSX
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Chưa có', gradeStats.missing, 'text-slate-700'],
          ['Nháp', gradeStats.draft, 'text-orange-700'],
          ['Đã nộp', gradeStats.submitted, 'text-emerald-700'],
          ['Đã khóa', gradeStats.locked, 'text-red-700'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs uppercase font-semibold text-slate-500">{label}</div>
            <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
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
                <tr key={row.user_id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{row.student_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{row.student_id || '-'}</div>
                    <div className="text-xs text-slate-500">{row.class_name || '-'} · {row.course_code || '-'}</div>
                  </td>
                  <td className="px-4 py-4">{row.internship_place || '-'}</td>
                  <td className="px-4 py-4">
                    <div>{row.primary_advisors || '-'}</div>
                    {row.co_advisors && <div className="text-xs text-slate-500 mt-1">Đồng HD: {row.co_advisors}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <div className={`font-semibold ${row.report_status === 'accepted' ? 'text-emerald-700' : row.report_status === 'needs_revision' ? 'text-orange-700' : row.report_status ? 'text-blue-700' : 'text-slate-400'}`}>{statusLabel(row.report_status)}</div>
                    {row.original_filename && <div className="text-xs text-slate-500 mt-1">{row.original_filename} · {formatBytes(Number(row.file_size || 0))}</div>}
                    {row.report_submitted_at && <div className="text-xs text-slate-500">{new Date(row.report_submitted_at).toLocaleString('vi-VN')}</div>}
                    {row.lecturer_comment && <div className="text-xs text-orange-700 mt-1">{row.lecturer_comment}</div>}
                  </td>
                  <td className="px-4 py-4">
                    {row.report_id ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => downloadReport(row.user_id, row.original_filename)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-semibold">Tải PDF</button>
                        <button onClick={() => updateStatus(row.user_id, 'accepted')} className="text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">Chấp nhận</button>
                        <button onClick={() => updateStatus(row.user_id, 'needs_revision')} className="text-orange-700 hover:bg-orange-50 px-2 py-1 rounded text-xs font-semibold">Nộp lại</button>
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

function StudentGradeView({ token }: { token: string }) {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const statusLabel = (status?: string) => status === 'submitted' ? 'Đã nộp' : status === 'draft' ? 'Nháp' : 'Chưa có điểm';
  const scoreText = (value: any) => value === null || value === undefined || value === '' ? '-' : value;

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
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại</button>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="text-green-600" /> Điểm thực tập
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-5">
            <div className="text-xs uppercase font-semibold text-slate-500">Nơi thực tập</div>
            <div className="mt-2 text-base font-semibold text-slate-900">{grade?.internship_place || 'Chưa xác nhận'}</div>
            {grade?.confirmed_at && <div className="mt-1 text-xs text-slate-500">Xác nhận: {new Date(grade.confirmed_at).toLocaleString('vi-VN')}</div>}
          </div>
          <div className="p-5">
            <div className="text-xs uppercase font-semibold text-slate-500">Giảng viên hướng dẫn</div>
            <div className="mt-2 text-base font-semibold text-slate-900">{grade?.primary_advisors || 'Chưa phân công'}</div>
            {grade?.co_advisors && <div className="mt-1 text-xs text-slate-500">Đồng hướng dẫn: {grade.co_advisors}</div>}
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
          <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.highlight ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-700">{card.label}</div>
              <div className="text-xs rounded-full bg-slate-100 text-slate-600 px-2 py-1">{card.note}</div>
            </div>
            <div className={`mt-4 text-4xl font-bold ${card.highlight ? 'text-green-700' : 'text-slate-900'}`}>{scoreText(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
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
        {grade?.locked_at && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">Điểm đã được Khoa khóa.</div>}
      </div>
    </div>
  );
}

function GradeAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const statusLabel = (status?: string) => status === 'submitted' ? 'Đã nộp' : status === 'draft' ? 'Nháp' : 'Chưa có';

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/grades`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      alert('Không tải được bảng điểm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [token]);

  const toggleLock = async (row: any) => {
    const locked = !row.locked_at;
    const res = await fetch(`${API_BASE}/api/admin/grades/${row.user_id}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locked })
    });
    if (res.ok) fetchRows();
    else alert('Cập nhật khóa điểm thất bại.');
  };

  const filtered = rows.filter(row => {
    const term = searchTerm.trim().toLowerCase();
    const status = row.grade_status || 'missing';
    const matchStatus = statusFilter ? status === statusFilter : true;
    const matchTerm = !term || row.student_id?.toLowerCase().includes(term) || row.student_name?.toLowerCase().includes(term) || row.internship_place?.toLowerCase().includes(term) || row.primary_advisors?.toLowerCase().includes(term) || row.co_advisors?.toLowerCase().includes(term);
    return matchStatus && matchTerm;
  });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, rows.length]);
  const pagination = paginationBounds(filtered.length, currentPage, pageSize);
  const paginatedRows = filtered.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);

  const exportXlsx = () => {
    const headers = ['STT', 'Mã SV', 'Họ tên', 'Lớp', 'Mã học phần', 'Nơi thực tập', 'GVHD chính', 'Đồng hướng dẫn', 'Điểm định kỳ', 'Điểm final', 'Điểm công ty/GVHD', 'Điểm tổng kết', 'Trạng thái', 'Người nhập', 'Nộp điểm lúc', 'Ghi chú'];
    const data = filtered.map((row, idx) => [
      idx + 1,
      row.student_id || '',
      row.student_name || '',
      row.class_name || '',
      row.course_code || '',
      row.internship_place || '',
      row.primary_advisors || '',
      row.co_advisors || '',
      row.progress_score ?? '',
      row.report_score ?? '',
      row.company_score ?? '',
      row.final_score ?? '',
      statusLabel(row.grade_status),
      row.grading_lecturer_name || '',
      row.grade_submitted_at || '',
      row.comment || ''
    ]);
    saveXlsx('bang_diem_thuc_tap.xlsx', headers, data, 'Bảng điểm');
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải bảng điểm...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-green-600" /> Bảng điểm thực tập</h2>
          <p className="text-sm text-slate-500 mt-1">Tổng hợp điểm 20% định kỳ, 20% báo cáo final, 60% đánh giá công ty/GVHD.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Tất cả trạng thái</option>
            <option value="missing">Chưa có</option>
            <option value="draft">Nháp</option>
            <option value="submitted">Đã nộp</option>
          </select>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm sinh viên, nơi TT, GVHD..." className="w-full sm:w-80 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
          <button onClick={exportXlsx} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
            <Download size={16} /> Xuất XLSX
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Sinh viên</th>
                <th className="px-4 py-3">Nơi thực tập</th>
                <th className="px-4 py-3">GVHD</th>
                <th className="px-4 py-3">Điểm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Khóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Không có dữ liệu phù hợp.</td></tr>
              ) : paginatedRows.map(row => (
                <tr key={row.user_id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{row.student_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{row.student_id || '-'}</div>
                    <div className="text-xs text-slate-500">{row.class_name || '-'} · {row.course_code || '-'}</div>
                  </td>
                  <td className="px-4 py-4">{row.internship_place || '-'}</td>
                  <td className="px-4 py-4">
                    <div>{row.primary_advisors || '-'}</div>
                    {row.co_advisors && <div className="text-xs text-slate-500 mt-1">Đồng HD: {row.co_advisors}</div>}
                  </td>
                  <td className="px-4 py-4 text-xs leading-relaxed">
                    <div>Định kỳ: <strong>{row.progress_score ?? '-'}</strong></div>
                    <div>Final: <strong>{row.report_score ?? '-'}</strong></div>
                    <div>Đánh giá: <strong>{row.company_score ?? '-'}</strong></div>
                    <div className="text-base text-green-700 font-bold mt-1">{row.final_score ?? '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`font-semibold ${row.grade_status === 'submitted' ? 'text-emerald-700' : row.grade_status === 'draft' ? 'text-orange-700' : 'text-slate-400'}`}>{statusLabel(row.grade_status)}</div>
                    {row.grading_lecturer_name && <div className="text-xs text-slate-500">Người nhập: {row.grading_lecturer_name}</div>}
                    {row.grade_submitted_at && <div className="text-xs text-slate-500">{new Date(row.grade_submitted_at).toLocaleString('vi-VN')}</div>}
                    {row.comment && <div className="text-xs text-slate-500 mt-1">{row.comment}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => toggleLock(row)} disabled={row.grade_status === 'missing'} className={`px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50 ${row.locked_at ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {row.locked_at ? 'Mở khóa' : 'Khóa điểm'}
                    </button>
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
          label="dòng điểm"
        />
      </div>
    </div>
  );
}

function NotificationAdmin({ token }: { token: string }) {
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
    if (!confirm('Tạo thông báo nhắc nộp báo cáo final cho sinh viên chưa nộp hoặc cần nộp lại?')) return;
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
      advisor_assigned: 'Phân công giảng viên hướng dẫn',
      company_applicants_sent: 'Đã gửi danh sách cho doanh nghiệp',
      faq_answered: 'Trả lời FAQ',
      faq_question_created: 'Câu hỏi FAQ mới',
      final_confirmation_open: 'Mở xác nhận nơi thực tập',
      final_internship_confirmed: 'Xác nhận nơi thực tập',
      final_report_due_reminder: 'Nhắc nộp báo cáo final',
      final_report_status_changed: 'Trạng thái báo cáo final',
      grade_locked: 'Bảng điểm đã khóa',
      manual_direct_notice: 'Thông báo tới một tài khoản',
      manual_lecturer_notice: 'Thông báo cho giảng viên',
      manual_student_notice: 'Thông báo cho sinh viên',
      registration_review_comment: 'Nhận xét đăng ký',
      registration_status_changed: 'Trạng thái đăng ký',
      system_announcement: 'Thông báo hệ thống',
    };
    return labels[String(type || '')] || String(type || 'Thông báo');
  };

  const types = Array.from(new Set(rows.map(row => row.type).filter(Boolean))).sort();
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
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Clock className="text-amber-600" /> Lịch sử thông báo</h2>
          {stats && (
            <p className="text-xs text-slate-500 mt-1">
              Provider: <strong>{stats.provider}</strong> · Đã gửi hôm nay: <strong>{stats.sent_today}/{stats.daily_cap}</strong> · Đang chờ: <strong>{stats.statuses?.queued || 0}</strong> · Batch: <strong>{stats.batch_size}</strong>
            </p>
          )}
        </div>
        <button onClick={exportXlsx} className="w-full sm:w-auto justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
          <Download size={16} /> Xuất XLSX
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Gửi email</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              <button onClick={() => sendQueued('all', 'quota')} disabled={sendingQueue || !stats?.statuses?.queued || !stats?.remaining_today} className="justify-center bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-800 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
                <Send size={16} /> Gửi theo quota
              </button>
              <button onClick={() => sendQueued('filtered', 'quota')} disabled={sendingQueue || filtered.filter(row => row.status === 'queued').length === 0} className="justify-center bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
                <Send size={16} /> Gửi lọc
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Xoá thông báo</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2">
              <button onClick={() => deleteNotifications('selected')} disabled={deletingNotifications || selectedCount === 0} className="justify-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
                {deletingNotifications ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />} Đã chọn
              </button>
              <button onClick={() => deleteNotifications('filtered')} disabled={deletingNotifications || sortedFiltered.length === 0} className="justify-center bg-rose-600 text-white px-3 py-2 rounded-lg hover:bg-rose-700 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
                <Trash2 size={16} /> Đang lọc
              </button>
              <button onClick={() => deleteNotifications('queued')} disabled={deletingNotifications || !stats?.statuses?.queued} className="justify-center bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
                <Trash2 size={16} /> Hàng đợi
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Tạo thông báo hệ thống</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              <button onClick={createFinalConfirmationOpen} disabled={creatingReminders} className="justify-center bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
                <CheckCircle2 size={16} /> Mở xác nhận
              </button>
              <button onClick={createFinalReportReminders} disabled={creatingReminders} className="justify-center bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
                {creatingReminders ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />} Nhắc báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm email, sinh viên, tiêu đề..." className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tất cả loại</option>
          {types.map(type => <option key={type} value={type}>{notificationTypeLabel(type)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tất cả trạng thái</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="website_only">Chỉ website</option>
        </select>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Soạn thông báo thủ công</h3>
            <p className="text-xs text-slate-500 mt-1">Thông báo được tạo vào hàng đợi; dùng nút “Gửi theo quota” để gửi email thật.</p>
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
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="website_and_email">Hiển thị trên website và đưa vào hàng đợi email</option>
          <option value="website_only">Chỉ hiển thị trên website, không gửi email</option>
        </select>
        {manualNotice.target === 'system_all' && (
          <p className="text-xs text-slate-500 -mt-1">
            Phần hiển thị trên website của thông báo cả hệ thống luôn được lưu bằng 1 bản ghi nội dung. Nếu chọn gửi email, hệ thống sẽ tạo thêm hàng đợi email theo từng tài khoản.
          </p>
        )}
        {manualNotice.target === 'single_account' && (
          <input
            value={manualNotice.recipient}
            onChange={e => setManualNotice(prev => ({ ...prev, recipient: e.target.value }))}
            placeholder="Email VNU/email cá nhân hoặc mã sinh viên"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          />
        )}
        <input
          value={manualNotice.subject}
          onChange={e => setManualNotice(prev => ({ ...prev, subject: e.target.value }))}
          placeholder="Tiêu đề email/thông báo"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
        />
        <textarea
          value={manualNotice.body}
          onChange={e => setManualNotice(prev => ({ ...prev, body: e.target.value }))}
          placeholder="Nội dung thông báo..."
          rows={5}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 resize-y"
        />
        <div className="flex justify-end">
          <button onClick={createManualNotice} disabled={creatingManual} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm flex items-center gap-2 disabled:opacity-60">
            {creatingManual ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} Tạo thông báo
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={pageSelected}
                    disabled={paginatedIds.length === 0}
                    onChange={e => toggleCurrentPageSelection(e.target.checked)}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:opacity-40"
                    title="Chọn thông báo trong trang hiện tại"
                  />
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('recipient')} className="font-bold hover:text-slate-900 flex items-center gap-1">
                    Người nhận{sortLabel('recipient')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('type')} className="font-bold hover:text-slate-900 flex items-center gap-1">
                    Loại{sortLabel('type')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('created_at')} className="font-bold hover:text-slate-900 flex items-center gap-1">
                    Nội dung / Tạo lúc{sortLabel('created_at')}
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => sortNotifications('status')} className="font-bold hover:text-slate-900 flex items-center gap-1">
                    Trạng thái{sortLabel('status')}
                  </button>
                </th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFiltered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Không có thông báo phù hợp.</td></tr>
              ) : paginatedRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedNotificationIds.includes(Number(row.id))}
                      onChange={e => toggleNotificationSelection(Number(row.id), e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                      title="Chọn để xoá"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{row.recipient_email}</div>
                    <div className="text-xs text-slate-500">{row.user_name || '-'} {row.student_id ? `· ${row.student_id}` : ''}</div>
                  </td>
                  <td className="px-4 py-4"><span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded">{notificationTypeLabel(row.type)}</span></td>
                  <td className="px-4 py-4 max-w-xl">
                    <div className="font-semibold text-slate-800">{row.subject}</div>
                    <div className="text-xs text-slate-500 whitespace-pre-wrap mt-1">{row.body}</div>
                    <div className="text-xs text-slate-400 mt-2">{row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`font-semibold ${row.status === 'sent' ? 'text-emerald-700' : row.status === 'failed' ? 'text-red-700' : row.status === 'website_only' ? 'text-blue-700' : 'text-orange-700'}`}>{row.status}</div>
                    {row.error && <div className="text-xs text-red-600 mt-1">{row.error}</div>}
                    {row.sent_at && <div className="text-xs text-slate-500">{new Date(row.sent_at).toLocaleString('vi-VN')}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => markStatus(row.id, 'sent')} className="text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">Đã gửi</button>
                      <button onClick={() => markStatus(row.id, 'failed')} className="text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-semibold">Lỗi</button>
                      <button onClick={() => markStatus(row.id, 'queued')} className="text-orange-700 hover:bg-orange-50 px-2 py-1 rounded text-xs font-semibold">Queue</button>
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

function LecturerRegistry({ token }: { token: string }) {
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [override, setOverride] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWorkUnit, setNewWorkUnit] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWorkUnit, setEditWorkUnit] = useState('');

  const fetchLecturers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/lecturers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLecturers(data);
    } catch (e) {
      alert('Lỗi lấy danh sách giảng viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLecturers(); }, [token]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...lecturers];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name?.toLowerCase().includes(lower) ||
        l.email?.toLowerCase().includes(lower) ||
        l.work_unit?.toLowerCase().includes(lower)
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [lecturers, searchTerm, sortConfig]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, lecturers.length]);
  const pagination = paginationBounds(filteredAndSorted.length, currentPage, pageSize);
  const paginatedLecturers = filteredAndSorted.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);

  const exportXlsx = () => {
    const headers = ['STT', 'Họ và tên', 'Email', 'Đơn vị công tác'];
    const rows = filteredAndSorted.map((l, idx) => [idx + 1, l.name, l.email || '', l.work_unit || '']);
    saveXlsx('danh_sach_giang_vien.xlsx', headers, rows, 'Giảng viên');
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage(`Đang đọc file "${file.name}"...`);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      const rows = await readSpreadsheetRows(file);
      const imported: { name: string; email?: string; work_unit?: string }[] = [];
      const normalizeHeader = (value: string) => String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, ' ');
      const headers = rows[0]?.map(normalizeHeader) || [];
      const nameIndex = headers.findIndex(h => ['ho va ten', 'ten', 'ten giang vien', 'giang vien', 'ho ten'].includes(h));
      const emailIndex = headers.findIndex(h => ['email', 'email vnu', 'thu dien tu'].includes(h));
      const workUnitIndex = headers.findIndex(h => ['don vi cong tac', 'don vi', 'bo mon', 'khoa/bo mon', 'khoa', 'department', 'work unit', 'work_unit'].includes(h));
      const hasHeader = nameIndex >= 0 || emailIndex >= 0 || workUnitIndex >= 0;

      for (let i = 0; i < rows.length; i++) {
        const parts = rows[i];
        if (!parts.some(Boolean)) continue;
        if (hasHeader && i === 0) continue;

        const isNumeric = (s: string) => /^\d+$/.test(s);

        let name = '';
        let email = '';
        let workUnit = '';

        if (hasHeader) {
          name = nameIndex >= 0 ? parts[nameIndex] : '';
          email = emailIndex >= 0 ? parts[emailIndex] : '';
          workUnit = workUnitIndex >= 0 ? parts[workUnitIndex] : '';
        } else if (parts.length >= 4 && isNumeric(parts[0])) {
          // Format A: STT, Tên, Email, Đơn vị công tác
          name = parts[1];
          email = parts[2]?.includes('@') ? parts[2] : '';
          workUnit = parts[3] || (!email ? parts[2] : '');
        } else if (parts.length >= 3 && isNumeric(parts[0])) {
          // Format A: STT, Tên, Email hoặc STT, Tên, Đơn vị công tác
          name = parts[1];
          email = parts[2]?.includes('@') ? parts[2] : '';
          workUnit = parts[2]?.includes('@') ? '' : parts[2];
        } else if (parts.length >= 3 && !isNumeric(parts[0])) {
          // Format B: Tên, Email, Đơn vị công tác
          name = parts[0];
          email = parts[1]?.includes('@') ? parts[1] : '';
          workUnit = parts[2] || (!email ? parts[1] : '');
        } else if (parts.length >= 2 && !isNumeric(parts[0]) && parts[1].includes('@')) {
          // Format B: Tên, Email
          name = parts[0];
          email = parts[1];
        } else if (parts.length >= 2 && !isNumeric(parts[0])) {
          // Format B without email: Tên, Đơn vị công tác
          name = parts[0];
          workUnit = parts[1];
        } else if (parts.length >= 2 && isNumeric(parts[0])) {
          // Format A without email: STT, Tên
          name = parts[1];
        } else if (parts.length === 1) {
          // Format C: Tên only
          name = parts[0];
        }

        if (name) imported.push({ name, email: email || undefined, work_unit: workUnit || undefined });
      }

      if (imported.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ trong file');
        return;
      }

      setImportMessage(`Đang import ${imported.length} giảng viên lên hệ thống...`);
      const res = await fetch(`${API_BASE}/api/admin/lecturers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lecturers: imported, override })
      });
      if (res.ok) {
        alert('Import thành công!');
        fetchLecturers();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi import');
    } finally {
      setImporting(false);
      setImportMessage('');
      e.target.value = '';
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return alert('Vui lòng nhập tên giảng viên');
    try {
      const res = await fetch(`${API_BASE}/api/admin/lecturers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || undefined, work_unit: newWorkUnit.trim() || undefined })
      });
      if (res.ok) {
        setNewName('');
        setNewEmail('');
        setNewWorkUnit('');
        fetchLecturers();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi thêm giảng viên');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return alert('Vui lòng nhập tên giảng viên');
    try {
      const res = await fetch(`${API_BASE}/api/admin/lecturers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() || undefined, work_unit: editWorkUnit.trim() || undefined })
      });
      if (res.ok) {
        setEditingId(null);
        fetchLecturers();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi cập nhật');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giảng viên này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/lecturers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLecturers();
      } else {
        alert('Xóa thất bại');
      }
    } catch (e) {
      alert('Lỗi xóa');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><UserIcon className="text-teal-600" /> Quản lý Giảng viên</h2>
          <p className="text-sm text-slate-500 mt-1">Import chỉ cập nhật danh sách giảng viên, không xóa đăng ký hoặc phân công hiện có.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm tên, email, đơn vị..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={override} disabled={importing} onChange={e => setOverride(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 disabled:opacity-60" />
            Cập nhật dữ liệu trùng
          </label>
          <label className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap ${importing ? 'bg-green-500 text-white cursor-wait pointer-events-none opacity-80' : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'}`}>
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />} {importing ? 'Đang import...' : 'Import'}
            <input type="file" accept=".xlsx,.xls,.csv" disabled={importing} className="hidden" onChange={handleFileUpload} onClick={(e) => { (e.target as any).value = null }} />
          </label>
          <button onClick={exportXlsx} disabled={importing} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed">
            <Download size={16} /> Xuất XLSX
          </button>
        </div>
      </div>

      {importing && (
        <div aria-live="polite" className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <RefreshCw size={18} className="animate-spin shrink-0" />
          <span>{importMessage || 'Hệ thống đang import dữ liệu, vui lòng đợi...'}</span>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Họ và tên giảng viên..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="email"
          placeholder="Email (tuỳ chọn)"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="text"
          placeholder="Đơn vị công tác (tuỳ chọn)"
          value={newWorkUnit}
          onChange={e => setNewWorkUnit(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
          <Plus size={16} /> Thêm Giảng viên
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 text-sm border-b border-slate-200">
              <th className="p-4 font-semibold whitespace-nowrap w-16">STT</th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                Họ và tên {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('email')}>
                Email {sortConfig?.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('work_unit')}>
                Đơn vị công tác {sortConfig?.key === 'work_unit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap text-right w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-slate-500">
                  {lecturers.length === 0 ? 'Chưa có dữ liệu giảng viên.' : 'Không có giảng viên phù hợp.'}
                </td>
              </tr>
            ) : paginatedLecturers.map((l, idx) => (
              <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-sm text-slate-600">{(pagination.safePage - 1) * pageSize + idx + 1}</td>
                <td className="p-4 text-sm text-slate-800 font-medium">
                  {editingId === l.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full border border-teal-500 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdate(l.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : l.name}
                </td>
                <td className="p-4 text-sm">
                  {editingId === l.id ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="Email..."
                      className="w-full border border-teal-500 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdate(l.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    l.email
                      ? <a href={`mailto:${l.email}`} className="text-blue-600 hover:underline">{l.email}</a>
                      : <span className="text-slate-400 italic text-xs">Chưa có</span>
                  )}
                </td>
                <td className="p-4 text-sm">
                  {editingId === l.id ? (
                    <input
                      type="text"
                      value={editWorkUnit}
                      onChange={e => setEditWorkUnit(e.target.value)}
                      placeholder="Đơn vị công tác..."
                      className="w-full border border-teal-500 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdate(l.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    l.work_unit || <span className="text-slate-400 italic text-xs">Chưa có</span>
                  )}
                </td>
                <td className="p-4 text-sm text-right flex items-center justify-end gap-2">
                  {editingId === l.id ? (
                    <>
                      <button onClick={() => handleUpdate(l.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" title="Lưu"><Save size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg transition-colors" title="Hủy"><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(l.id); setEditName(l.name); setEditEmail(l.email || ''); setEditWorkUnit(l.work_unit || ''); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Sửa"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Xóa"><Trash2 size={18} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationControls
        total={filteredAndSorted.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        label="giảng viên"
      />
    </div>
  );
}

function CompanyRegistry({ token }: { token: string }) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [markingSentKey, setMarkingSentKey] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [override, setOverride] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCompanyKeys, setSelectedCompanyKeys] = useState<string[]>([]);
  const [mailMergeOpen, setMailMergeOpen] = useState(false);
  const [mailMergeScope, setMailMergeScope] = useState<'filtered' | 'page' | 'selected' | 'unsent'>('filtered');
  const [mailMergeSending, setMailMergeSending] = useState(false);
  const [mailMergeUseGmail, setMailMergeUseGmail] = useState(true);
  const [mailMergeCc, setMailMergeCc] = useState('');
  const [mailMergeReplyDeadline, setMailMergeReplyDeadline] = useState('');
  const defaultMailMergeSubject = 'Danh sách sinh viên đăng ký thực tập - {{company_name}}';
  const defaultMailMergeBody = `Kính gửi Quý Công ty,

Khoa Công nghệ thông tin - Trường Đại học Công nghệ, Đại học Quốc gia Hà Nội trân trọng gửi tới Quý Công ty danh sách sinh viên đăng ký thực tập đã được Khoa rà soát trong đợt triển khai thực tập năm học hiện tại.

Thông tin tổng hợp:
- Doanh nghiệp/Nơi tiếp nhận: {{company_name}}
- Số sinh viên trong danh sách gửi Quý Công ty: {{approved_student_count}}
- Email liên hệ đang ghi nhận: {{contact_email}}
{{reply_deadline_line}}
{{applicants_drive_link_line}}

{{applicant_list_text}}

Kính đề nghị Quý Công ty xem xét hồ sơ, liên hệ sinh viên để phỏng vấn/trao đổi nếu cần và phản hồi kết quả tiếp nhận cho Khoa để phối hợp quản lý học phần thực tập.

Trân trọng,
Khoa Công nghệ thông tin
Trường Đại học Công nghệ, ĐHQGHN`;
  const [mailMergeSubject, setMailMergeSubject] = useState(defaultMailMergeSubject);
  const [mailMergeBody, setMailMergeBody] = useState(defaultMailMergeBody);
  const [openCompanyActionKey, setOpenCompanyActionKey] = useState<string | null>(null);
  const pageSize = 20;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', slots: '', contact_email: '', address: '', phone: '', contact_name: '', recruitment_link: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState({ name: '', slots: '5', contact_email: '', address: '', phone: '', contact_name: '', recruitment_link: '' });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const [companyRes, regRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/companies`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/registrations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const companyData = await companyRes.json();
      const regData = await regRes.json();
      setCompanies(Array.isArray(companyData) ? companyData : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
    } catch (e) {
      alert('Lỗi lấy danh sách công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, [token]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...companies];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(lower) ||
        c.address?.toLowerCase().includes(lower) ||
        c.contact_email?.toLowerCase().includes(lower) ||
        c.contact_name?.toLowerCase().includes(lower) ||
        c.contacts?.toLowerCase().includes(lower)
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] ?? '';
        let bVal = b[sortConfig.key] ?? '';
        if (['slots', 'applicant_count', 'approved_applicant_count', 'sent_count', 'remaining_slots'].includes(sortConfig.key)) {
          aVal = Number(aVal) || 0; bVal = Number(bVal) || 0;
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [companies, searchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, companies.length]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCompanies = filteredAndSorted.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getCompanyRegistrations = (company: any) => registrations.filter((r: any) => {
    if (company.record_type === 'other') {
      return (r.other_company_name || '').trim().toLowerCase() === (company.name || '').trim().toLowerCase();
    }
    return Number(r.company_id) === Number(company.id) ||
      (r.other_company_name || '').trim().toLowerCase() === (company.name || '').trim().toLowerCase();
  });

  const extractEmails = (value: string) => Array.from(new Set((value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []));
  const companyActionKey = (company: any) => company.company_key || String(company.id || company.name);
  const selectedCompanyKeySet = useMemo(() => new Set(selectedCompanyKeys), [selectedCompanyKeys]);
  const selectedPageCompanyKeys = paginatedCompanies.map(companyActionKey);
  const selectedPageCount = selectedPageCompanyKeys.filter(key => selectedCompanyKeySet.has(key)).length;
  const isPageSelected = selectedPageCompanyKeys.length > 0 && selectedPageCount === selectedPageCompanyKeys.length;
  const toggleCompanySelection = (company: any, checked: boolean) => {
    const key = companyActionKey(company);
    setSelectedCompanyKeys(prev => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return Array.from(next);
    });
  };
  const toggleCurrentPageSelection = (checked: boolean) => {
    setSelectedCompanyKeys(prev => {
      const next = new Set(prev);
      selectedPageCompanyKeys.forEach(key => checked ? next.add(key) : next.delete(key));
      return Array.from(next);
    });
  };
  const openSelectedMailMerge = () => {
    if (selectedCompanyKeys.length === 0) return alert('Vui lòng chọn ít nhất một công ty.');
    setMailMergeScope('selected');
    setMailMergeOpen(true);
  };
  const isOfficialBusinessCompany = (company: any) =>
    company.record_type !== 'other' && !['Công ty khác', 'Trường Đại học Công nghệ'].includes(company.name || '');

  const approvedRegistrationsForCompany = (company: any) =>
    getCompanyRegistrations(company).filter((r: any) => r.status === 'approved');

  const companyRecipientEmails = (company: any) =>
    company.record_type === 'other'
      ? extractEmails(company.contacts || '')
      : extractEmails([company.contact_email, company.contacts].filter(Boolean).join(' '));
  const mailMergeCcEmails = () => extractEmails(mailMergeCc);

  const buildApplicantListText = (data: any[], maxRows = 30) => {
    const rows = data.slice(0, maxRows).map((row: any, idx: number) =>
      `${idx + 1}. ${row.student_id || ''} - ${row.student_name || ''} - ${row.class_name || ''} - ${row.course_code || ''} - ${row.phone || ''} - ${row.personal_email || ''}${row.note ? ` - Ghi chú: ${row.note}` : ''}`
    );
    if (data.length > maxRows) rows.push(`\n(Danh sách đầy đủ có ${data.length} sinh viên. Vui lòng đính kèm file XLSX đã xuất từ hệ thống nếu cần.)`);
    return rows.join('\n');
  };

  const renderCompanyTemplate = (template: string, company: any, data: any[]) => {
    const emails = companyRecipientEmails(company);
    const deadlineDisplay = mailMergeReplyDeadline
      ? new Date(`${mailMergeReplyDeadline}T00:00:00+07:00`).toLocaleDateString('vi-VN')
      : '';
    const replacements: Record<string, string> = {
      company_name: company.name || '',
      contact_name: company.contact_name || 'Quý Công ty',
      contact_email: emails[0] || '',
      student_count: String(getCompanyRegistrations(company).length),
      approved_student_count: String(data.length),
      reply_deadline: deadlineDisplay,
      reply_deadline_line: deadlineDisplay ? `- Thời hạn Khoa mong nhận phản hồi: ${deadlineDisplay}` : '',
      applicants_drive_link: company.applicants_drive_link || '',
      applicants_drive_link_line: company.applicants_drive_link ? `- Link danh sách sinh viên: ${company.applicants_drive_link}` : '',
      applicant_list_text: company.applicants_drive_link ? '' : buildApplicantListText(data),
    };
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => replacements[key] ?? '');
  };

  const mailMergeSourceCompanies = useMemo(() => {
    const source = mailMergeScope === 'page'
      ? paginatedCompanies
      : mailMergeScope === 'selected'
        ? companies.filter(company => selectedCompanyKeySet.has(companyActionKey(company)))
        : filteredAndSorted;
    const withApproved = source.filter(company => isOfficialBusinessCompany(company) && approvedRegistrationsForCompany(company).length > 0);
    if (mailMergeScope === 'unsent') {
      return withApproved.filter(company => approvedRegistrationsForCompany(company).some((reg: any) => !reg.sent_to_company_at));
    }
    return withApproved;
  }, [mailMergeScope, paginatedCompanies, filteredAndSorted, companies, selectedCompanyKeySet, registrations]);

  const mailMergeItems = useMemo(() => mailMergeSourceCompanies.map(company => {
    const data = approvedRegistrationsForCompany(company);
    const emails = companyRecipientEmails(company);
    return {
      company,
      data,
      emails,
      subject: renderCompanyTemplate(mailMergeSubject, company, data),
      body: renderCompanyTemplate(mailMergeBody, company, data),
      registrationIds: data.map((row: any) => Number(row.registration_id)).filter(Boolean),
    };
  }), [mailMergeSourceCompanies, mailMergeSubject, mailMergeBody, mailMergeReplyDeadline]);

  const openMailMergeComposer = (item: any) => {
    if (!item.emails.length) return;
    const bodyForUrl = item.body.length > 6500
      ? `${item.body.slice(0, 6200)}\n\n(Nội dung bị rút gọn do giới hạn URL. Vui lòng đính kèm/xuất file XLSX từ hệ thống nếu cần danh sách đầy đủ.)`
      : item.body;
    const url = mailMergeUseGmail
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.emails.join(','))}&cc=${encodeURIComponent(mailMergeCcEmails().join(','))}&su=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(bodyForUrl)}`
      : `mailto:${encodeURIComponent(item.emails.join(','))}?cc=${encodeURIComponent(mailMergeCcEmails().join(','))}&subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(bodyForUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveApplicantsDriveLink = async (company: any, link: string) => {
    const res = await fetch(`${API_BASE}/api/admin/companies/${company.id}/applicants-drive-link`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ applicants_drive_link: link })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Không lưu được link Drive cho ${company.name}.`);
  };

  const createDriveLinkForCompany = async (accessToken: string, folderId: string, company: any, data: any[]) => {
    const { headers, rows } = companyApplicantsXlsxData(company, data);
    const safeName = (company.name || 'cong_ty').replace(/[^a-z0-9]+/gi, '_');
    const file = xlsxBlob(headers, rows, 'Đăng ký');
    const link = await uploadXlsxToDrive(accessToken, folderId, `dang_ky_${safeName}.xlsx`, file);
    await saveApplicantsDriveLink(company, link);
    return link;
  };

  const createDriveLinksForMailMerge = async () => {
    const items = mailMergeItems.filter(item => item.data.length > 0 && item.company.id);
    if (items.length === 0) return alert('Không có doanh nghiệp chính thức nào có đăng ký đã duyệt để tạo link.');
    if (!GOOGLE_API_KEY) return alert('Chưa cấu hình VITE_GOOGLE_API_KEY nên hệ thống chưa tạo được link Google Drive.');
    if (!confirm(`Tạo lại link Google Drive cho ${items.length} doanh nghiệp? Nếu đã có link cũ, hệ thống sẽ lưu link mới thay thế trong DB.`)) return;
    setMailMergeSending(true);
    try {
      const accessToken = await getDriveAccessToken();
      const folder = await pickDriveFolder(accessToken);
      for (const item of items) {
        await createDriveLinkForCompany(accessToken, folder.id, item.company, item.data);
      }
      await fetchCompanies();
      alert(`Đã tạo và lưu link Drive cho ${items.length} doanh nghiệp trong thư mục "${folder.name}".`);
    } catch (e: any) {
      alert(e?.message || 'Không tạo được link Drive.');
    } finally {
      setMailMergeSending(false);
    }
  };

  const createDriveLinksForFilteredOfficial = async () => {
    const hasSelectedCompanies = selectedCompanyKeys.length > 0;
    const sourceCompanies = hasSelectedCompanies
      ? companies.filter(company => selectedCompanyKeySet.has(companyActionKey(company)))
      : filteredAndSorted;
    const items = sourceCompanies
      .filter(company => isOfficialBusinessCompany(company))
      .map(company => ({ company, data: approvedRegistrationsForCompany(company) }))
      .filter(item => item.data.length > 0 && item.company.id);
    if (items.length === 0) return alert(hasSelectedCompanies
      ? 'Không có doanh nghiệp chính thức nào trong danh sách đã chọn có đăng ký đã duyệt.'
      : 'Không có doanh nghiệp chính thức nào trong danh sách đang lọc có đăng ký đã duyệt.');
    if (!GOOGLE_API_KEY) return alert('Chưa cấu hình VITE_GOOGLE_API_KEY nên hệ thống chưa tạo được link Google Drive.');
    if (!confirm(`Tạo lại link Google Drive cho ${items.length} doanh nghiệp chính thức ${hasSelectedCompanies ? 'đã chọn' : 'trong danh sách đang lọc'}? Link mới sẽ được lưu thay thế link cũ trong DB.`)) return;
    setMailMergeSending(true);
    try {
      const accessToken = await getDriveAccessToken();
      const folder = await pickDriveFolder(accessToken);
      for (const item of items) {
        await createDriveLinkForCompany(accessToken, folder.id, item.company, item.data);
      }
      await fetchCompanies();
      alert(`Đã tạo và lưu link Drive cho ${items.length} doanh nghiệp trong thư mục "${folder.name}".`);
    } catch (e: any) {
      alert(e?.message || 'Không tạo được link Drive.');
    } finally {
      setMailMergeSending(false);
    }
  };

  const sendBrevoMailMergeItem = async (item: any) => {
    if (!isOfficialBusinessCompany(item.company)) return alert('Chỉ gửi email thật cho doanh nghiệp chính thức.');
    if (!item.emails.length) return alert('Doanh nghiệp này chưa có email liên hệ.');
    if (!confirm(`Gửi email thật qua Brevo tới ${item.company.name}?`)) return;
    setMailMergeSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/companies/send-applicants-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_name: item.company.name,
          recipient_email: item.emails[0],
          cc_emails: mailMergeCcEmails(),
          subject: item.subject,
          body: item.body,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Gửi email thật thất bại.');
      await fetchCompanies();
      alert(`Đã gửi email thật cho ${item.company.name}.`);
    } catch (e: any) {
      alert(e?.message || 'Gửi email thật thất bại.');
    } finally {
      setMailMergeSending(false);
    }
  };

  const sendAllBrevoMailMerge = async () => {
    const sendable = mailMergeItems.filter(item => item.emails.length > 0 && item.data.length > 0 && isOfficialBusinessCompany(item.company));
    if (sendable.length === 0) return alert('Không có doanh nghiệp chính thức nào đủ điều kiện gửi Brevo.');
    if (!confirm(`Gửi email thật qua Brevo cho ${sendable.length} doanh nghiệp? Các lỗi quota/cấu hình sẽ dừng tiến trình và hiển thị thông báo.`)) return;
    setMailMergeSending(true);
    try {
      let sent = 0;
      for (const item of sendable) {
        const res = await fetch(`${API_BASE}/api/admin/companies/send-applicants-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            company_name: item.company.name,
            recipient_email: item.emails[0],
            cc_emails: mailMergeCcEmails(),
            subject: item.subject,
            body: item.body,
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`${item.company.name}: ${data.error || 'Gửi email thật thất bại.'}`);
        sent++;
      }
      await fetchCompanies();
      alert(`Đã gửi email thật cho ${sent} doanh nghiệp.`);
    } catch (e: any) {
      alert(e?.message || 'Gửi email thật thất bại.');
    } finally {
      setMailMergeSending(false);
    }
  };

  const markMailMergeSent = async (items: any[]) => {
    const registrationIds = Array.from(new Set(items.flatMap(item => item.registrationIds))).filter(Boolean);
    if (registrationIds.length === 0) return;
    const res = await fetch(`${API_BASE}/api/admin/registrations/mark-sent`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ registration_ids: registrationIds, note: 'Mail merge thủ công' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Đánh dấu đã gửi DN thất bại.');
  };

  const openAllMailMerge = async () => {
    const sendable = mailMergeItems.filter(item => item.emails.length > 0 && item.data.length > 0);
    const missingEmail = mailMergeItems.length - sendable.length;
    if (sendable.length === 0) return alert('Không có công ty nào đủ điều kiện gửi mail merge.');
    if (!confirm(`Mở ${sendable.length} email đã merge${missingEmail ? ` (${missingEmail} công ty thiếu email sẽ bỏ qua)` : ''}? Trình duyệt có thể hỏi quyền mở nhiều cửa sổ.`)) return;
    setMailMergeSending(true);
    try {
      sendable.forEach(item => openMailMergeComposer(item));
      if (confirm('Sau khi mở email, đánh dấu các đăng ký tương ứng là Đã gửi DN?')) {
        await markMailMergeSent(sendable);
        await fetchCompanies();
      }
    } catch (e: any) {
      alert(e?.message || 'Mail merge thất bại.');
    } finally {
      setMailMergeSending(false);
    }
  };

  const exportMailMergeZip = async () => {
    const items = mailMergeItems.filter(item => item.data.length > 0);
    if (items.length === 0) return alert('Không có dữ liệu để xuất.');
    const zip = new JSZip();
    items.forEach(item => {
      const { headers, rows } = companyApplicantsXlsxData(item.company, item.data);
      const safeName = (item.company.name || 'cong_ty').replace(/[^a-z0-9]+/gi, '_');
      zip.file(`dang_ky_${safeName}.xlsx`, xlsxArrayBuffer(headers, rows, 'Đăng ký'));
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'mail_merge_danh_sach_theo_cong_ty.zip');
  };

  const exportXlsx = () => {
    const headers = ['STT', 'Loại', 'Tên doanh nghiệp', 'Chỉ tiêu', 'Ứng viên', 'Đã duyệt', 'Đã gửi DN', 'Link Drive', 'Email liên hệ', 'Người liên hệ', 'SĐT', 'Địa chỉ'];
    const rows = filteredAndSorted.map((c, idx) => [
      idx + 1,
      c.record_type === 'other' ? 'Tự liên hệ' : 'Danh sách chính thức',
      c.name,
      c.record_type === 'other' ? '' : c.slots,
      c.applicant_count ?? 0,
      c.approved_applicant_count ?? 0,
      c.sent_count ? `${c.sent_count}${c.last_sent_at ? ` (${new Date(c.last_sent_at).toLocaleString('vi-VN')})` : ''}` : '',
      c.applicants_drive_link || '',
      c.contact_email || extractEmails(c.contacts || '').join('; '),
      c.contact_name || '',
      c.phone || '',
      c.address || ''
    ]);
    saveXlsx('danh_sach_cong_ty.xlsx', headers, rows, 'Công ty');
  };

  const exportApplicantsForCompany = (company: any) => {
    const data = getCompanyRegistrations(company);
    if (data.length === 0) return alert('Công ty này chưa có đăng ký.');
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'SĐT', 'Email cá nhân', 'Lớp KH', 'Mã môn học', 'Ghi chú', 'Trạng thái', 'Đã gửi DN', 'Thời gian đăng ký'];
    const rows = data.map((r, idx) => [
      idx + 1,
      r.student_id || '',
      r.student_name || '',
      r.dob || '',
      r.phone || '',
      r.personal_email || '',
      r.class_name || '',
      r.course_code || '',
      r.note || '',
      r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
      r.sent_to_company_at ? new Date(r.sent_to_company_at).toLocaleString('vi-VN') : '',
      r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''
    ]);
    const safeName = (company.name || 'cong_ty').replace(/[^a-z0-9]+/gi, '_');
    saveXlsx(`dang_ky_${safeName}.xlsx`, headers, rows, 'Đăng ký');
  };

  const companyApplicantsXlsxData = (company: any, data: any[]) => {
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'SĐT', 'Email cá nhân', 'Lớp KH', 'Mã môn học', 'Ghi chú'];
    const rows = data.map((r, idx) => [
      idx + 1,
      r.student_id || '',
      r.student_name || '',
      r.dob || '',
      r.phone || '',
      r.personal_email || '',
      r.class_name || '',
      r.course_code || '',
      r.note || '',
    ]);
    return { headers, rows };
  };

  const markCompanySent = async (company: any) => {
    const approvedCount = Number(company.approved_applicant_count || 0);
    if (approvedCount === 0) return alert('Công ty này chưa có đăng ký đã duyệt để đánh dấu gửi.');
    if (!confirm(`Đánh dấu ${approvedCount} đăng ký đã duyệt của "${company.name}" là đã gửi đến doanh nghiệp?`)) return;
    setMarkingSentKey(company.company_key || String(company.id || company.name));
    try {
      const payload = company.record_type === 'other'
        ? { other_company_name: company.name }
        : { company_name: company.name };
      const res = await fetch(`${API_BASE}/api/admin/registrations/mark-sent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Cập nhật trạng thái gửi thất bại.');
      fetchCompanies();
    } catch (e) {
      alert('Lỗi kết nối khi cập nhật trạng thái gửi.');
    } finally {
      setMarkingSentKey(null);
    }
  };

  const composeCompanyEmail = async (company: any) => {
    if (!isOfficialBusinessCompany(company)) return alert('Chỉ soạn/gửi email doanh nghiệp cho doanh nghiệp chính thức.');
    const emails = company.record_type === 'other' ? extractEmails(company.contacts || '') : extractEmails(company.contact_email || '');
    if (emails.length === 0) return alert('Chưa có email liên hệ cho công ty này. Vui lòng xuất danh sách và gửi thủ công.');
    const data = getCompanyRegistrations(company).filter((r: any) => r.status === 'approved');
    const approvedCount = Number(company.approved_applicant_count || 0);
    if (approvedCount === 0 || data.length === 0) return alert('Công ty này chưa có đăng ký đã duyệt để gửi.');
    const safeName = (company.name || 'cong_ty').replace(/[^a-z0-9]+/gi, '_');
    let driveLink = '';
    if (GOOGLE_API_KEY) {
      const uploadToDrive = confirm('Tạo file XLSX trên Google Drive và chèn link vào email?\n\nChọn OK để chọn thư mục Drive.\nChọn Cancel để chỉ soạn email, bạn có thể tự đính kèm file XLSX.');
      if (uploadToDrive) {
        setMarkingSentKey(company.company_key || String(company.id || company.name));
        try {
          const accessToken = await getDriveAccessToken();
          const folder = await pickDriveFolder(accessToken);
          const { headers, rows } = companyApplicantsXlsxData(company, data);
          const file = xlsxBlob(headers, rows, 'Đăng ký');
          driveLink = await uploadXlsxToDrive(accessToken, folder.id, `dang_ky_${safeName}.xlsx`, file);
          if (company.id) await saveApplicantsDriveLink(company, driveLink);
          alert(`Đã tạo file trong thư mục "${folder.name}" và bật quyền xem bằng link.`);
        } catch (e: any) {
          alert(e?.message || 'Không tạo được file Google Drive. Email sẽ được soạn không kèm link.');
        } finally {
          setMarkingSentKey(null);
        }
      }
    } else if (!company.applicants_drive_link) {
      alert('Chưa cấu hình VITE_GOOGLE_API_KEY nên hệ thống chưa mở được Google Drive Picker. Email sẽ được soạn sẵn; vui lòng tự đính kèm file XLSX hoặc link Drive.');
    }
    const subject = `Danh sách sinh viên đăng ký thực tập - ${company.name}`;
    driveLink = driveLink || company.applicants_drive_link || '';
    const fullList = data.map((row: any, idx: number) =>
      `${idx + 1}. ${row.student_id || ''} - ${row.student_name || ''} - ${row.class_name || ''} - ${row.course_code || ''} - ${row.phone || ''} - ${row.personal_email || ''}${row.note ? ` - Ghi chú: ${row.note}` : ''}`
    ).join('\n');
    const listForUrl = driveLink ? '' : fullList.length > 4500
      ? `${data.slice(0, 25).map((row: any, idx: number) => `${idx + 1}. ${row.student_id || ''} - ${row.student_name || ''} - ${row.class_name || ''} - ${row.course_code || ''}`).join('\n')}\n\n(Danh sách đầy đủ có ${data.length} sinh viên. Vui lòng đính kèm file XLSX đã xuất từ hệ thống hoặc link Google Drive.)`
      : fullList;
    const body = [
      `Kính gửi Quý Công ty ${company.name},`,
      '',
      'Khoa Công nghệ thông tin - Trường Đại học Công nghệ, Đại học Quốc gia Hà Nội trân trọng gửi tới Quý Công ty danh sách sinh viên đăng ký thực tập đã được Khoa rà soát.',
      '',
      `Số sinh viên trong danh sách: ${data.length}.`,
      driveLink ? `Link danh sách sinh viên: ${driveLink}` : '',
      driveLink ? 'Kính đề nghị Quý Công ty xem xét hồ sơ, liên hệ sinh viên để phỏng vấn/trao đổi nếu cần, và phản hồi kết quả tiếp nhận cho Khoa.' : '',
      listForUrl,
      '',
      'Trân trọng,',
      'Khoa Công nghệ thông tin',
      'Trường Đại học Công nghệ, ĐHQGHN',
    ].filter((line, idx, arr) => line !== '' || arr[idx - 1] !== '').join('\n');
    const useGmail = confirm('Mở Gmail để soạn thư?\n\nChọn OK: mở Gmail trên trình duyệt.\nChọn Cancel: mở ứng dụng Mail mặc định.');
    const url = useGmail
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emails[0])}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : `mailto:${encodeURIComponent(emails[0])}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage(`Đang đọc file "${file.name}"...`);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      const rows = await readSpreadsheetRows(file);
      const imported: { name: string; slots?: number; contact_email?: string; address?: string; phone?: string; contact_name?: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const parts = rows[i];
        if (!parts.some(Boolean)) continue;

        // Skip header
        if (i === 0 && (parts[0].toLowerCase() === 'stt' || parts[0].toLowerCase() === 'tên doanh nghiệp' || parts[0].toLowerCase() === 'tên')) continue;

        const isNumeric = (s: string) => /^\d+$/.test(s);
        let name = '';
        let slots = 5;

        if (parts.length >= 3 && isNumeric(parts[0])) {
          // STT, Tên, Chỉ tiêu, ...
          name = parts[1];
          if (parts[2] && isNumeric(parts[2])) slots = parseInt(parts[2]);
        } else if (parts.length >= 1 && !isNumeric(parts[0])) {
          name = parts[0];
          if (parts[1] && isNumeric(parts[1])) slots = parseInt(parts[1]);
        }

        if (name) imported.push({ name, slots });
      }

      if (imported.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ trong file');
        return;
      }

      setImportMessage(`Đang import ${imported.length} doanh nghiệp lên hệ thống...`);
      const res = await fetch(`${API_BASE}/api/admin/companies/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companies: imported, override })
      });
      if (res.ok) {
        alert('Import thành công!');
        fetchCompanies();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi import');
    } finally {
      setImporting(false);
      setImportMessage('');
      e.target.value = '';
    }
  };

  const handleAdd = async () => {
    if (!newCompany.name.trim()) return alert('Vui lòng nhập tên công ty');
    try {
      const res = await fetch(`${API_BASE}/api/admin/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCompany)
      });
      if (res.ok) {
        setNewCompany({ name: '', slots: '', contact_email: '', address: '', phone: '', contact_name: '', recruitment_link: '' });
        setShowAddForm(false);
        fetchCompanies();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi thêm công ty');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editCompany.name.trim()) return alert('Vui lòng nhập tên công ty');
    try {
      const res = await fetch(`${API_BASE}/api/admin/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editCompany)
      });
      if (res.ok) {
        setEditingId(null);
        fetchCompanies();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi cập nhật');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa "${name}"? Toàn bộ đăng ký liên quan sẽ bị xóa.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/companies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCompanies();
      else alert('Xóa thất bại');
    } catch (e) {
      alert('Lỗi xóa');
    }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-xs">{sortConfig?.key === col ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
  );

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div className="min-w-0">
            <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản trị</button>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="text-orange-600" /> Quản lý Công ty</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <button
              onClick={() => navigate('/admin/approved-companies')}
              className="bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Shield size={16} /> Công ty thẩm định
            </button>
            <button
              onClick={() => setMailMergeOpen(true)}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Send size={16} /> Mail merge
            </button>
            <button
              onClick={openSelectedMailMerge}
              disabled={selectedCompanyKeys.length === 0}
              className="bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              title="Tạo mail merge cho các công ty đang được chọn"
            >
              <Send size={16} /> Mail merge đã chọn ({selectedCompanyKeys.length})
            </button>
            <button
              onClick={createDriveLinksForFilteredOfficial}
              disabled={mailMergeSending}
              className="bg-sky-600 text-white px-3 py-2 rounded-lg hover:bg-sky-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
            >
              {mailMergeSending ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />} {selectedCompanyKeys.length > 0 ? 'Tạo link Drive đã chọn' : 'Tạo link Drive'}
            </button>
            <button onClick={exportXlsx} disabled={importing} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed">
              <Download size={16} /> Xuất XLSX
            </button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên, địa chỉ, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox" checked={override} disabled={importing} onChange={e => setOverride(e.target.checked)} className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 disabled:opacity-60" />
              Ghi đè khi import
            </label>
            <label className={`px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap ${importing ? 'bg-green-500 text-white cursor-wait pointer-events-none opacity-80' : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'}`}>
              {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />} {importing ? 'Đang import...' : 'Import'}
              <input type="file" accept=".xlsx,.xls,.csv" disabled={importing} className="hidden" onChange={handleFileUpload} onClick={(e) => { (e.target as any).value = null }} />
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>Đã chọn: <strong>{selectedCompanyKeys.length}</strong></span>
              <button type="button" onClick={() => toggleCurrentPageSelection(!isPageSelected)} className="font-semibold text-blue-600 hover:underline">
                {isPageSelected ? 'Bỏ chọn trang' : 'Chọn trang'}
              </button>
              {selectedCompanyKeys.length > 0 && (
                <button type="button" onClick={() => setSelectedCompanyKeys([])} className="font-semibold text-slate-500 hover:underline">
                  Xóa chọn
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {importing && (
        <div aria-live="polite" className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <RefreshCw size={18} className="animate-spin shrink-0" />
          <span>{importMessage || 'Hệ thống đang import dữ liệu, vui lòng đợi...'}</span>
        </div>
      )}

      {mailMergeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 p-3 sm:p-4 overflow-y-auto">
          <div className="mx-auto my-3 sm:my-6 w-full max-w-6xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Send size={18} className="text-indigo-600" /> Mail merge doanh nghiệp</h3>
                <p className="text-sm text-slate-500 mt-1">Tạo email riêng cho từng công ty có sinh viên đã duyệt. Hệ thống mở Gmail/Mail để admin gửi thủ công.</p>
              </div>
              <button onClick={() => setMailMergeOpen(false)} disabled={mailMergeSending} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-60">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-0 flex-1 overflow-hidden">
              <div className="lg:col-span-2 border-r border-slate-200 p-5 overflow-y-auto min-h-0">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phạm vi công ty</label>
                    <select value={mailMergeScope} onChange={e => setMailMergeScope(e.target.value as any)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="filtered">Toàn bộ danh sách đang lọc</option>
                      <option value="page">Trang hiện tại</option>
                      <option value="selected">Công ty đã chọn ({selectedCompanyKeys.length})</option>
                      <option value="unsent">Đang lọc và chưa gửi DN</option>
                    </select>
                    {mailMergeScope === 'selected' && selectedCompanyKeys.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-600">Chưa chọn công ty nào trong bảng Quản lý công ty.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cách mở email</label>
                    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                      <button type="button" onClick={() => setMailMergeUseGmail(true)} className={`px-3 py-2 ${mailMergeUseGmail ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Gmail</button>
                      <button type="button" onClick={() => setMailMergeUseGmail(false)} className={`px-3 py-2 ${!mailMergeUseGmail ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Mail app</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">CC email</label>
                    <input
                      value={mailMergeCc}
                      onChange={e => setMailMergeCc(e.target.value)}
                      placeholder="vd: fit@vnu.edu.vn; admin@vnu.edu.vn"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Có thể nhập nhiều email, phân tách bằng dấu phẩy, chấm phẩy hoặc khoảng trắng.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn phản hồi</label>
                    <input type="date" value={mailMergeReplyDeadline} onChange={e => setMailMergeReplyDeadline(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề</label>
                    <input value={mailMergeSubject} onChange={e => setMailMergeSubject(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-600">Nội dung</label>
                      <button
                        type="button"
                        onClick={() => {
                          setMailMergeSubject(defaultMailMergeSubject);
                          setMailMergeBody(defaultMailMergeBody);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Khôi phục mẫu
                      </button>
                    </div>
                    <textarea value={mailMergeBody} onChange={e => setMailMergeBody(e.target.value)} rows={12} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Biến hỗ trợ: <code>{'{{company_name}}'}</code>, <code>{'{{contact_name}}'}</code>, <code>{'{{contact_email}}'}</code>, <code>{'{{student_count}}'}</code>, <code>{'{{approved_student_count}}'}</code>, <code>{'{{reply_deadline}}'}</code>, <code>{'{{reply_deadline_line}}'}</code>, <code>{'{{applicants_drive_link}}'}</code>, <code>{'{{applicants_drive_link_line}}'}</code>, <code>{'{{applicant_list_text}}'}</code>.
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 shrink-0">
                  <div className="text-sm text-slate-600">
                    Sẵn sàng gửi: <strong>{mailMergeItems.filter(item => item.emails.length > 0 && item.data.length > 0).length}</strong> / <strong>{mailMergeItems.length}</strong> công ty
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                    <button onClick={createDriveLinksForMailMerge} disabled={mailMergeSending || mailMergeItems.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60 disabled:cursor-not-allowed">
                      {mailMergeSending ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />} Tạo link Drive
                    </button>
                    <button onClick={exportMailMergeZip} disabled={mailMergeItems.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed">
                      <Download size={16} /> Xuất ZIP XLSX
                    </button>
                    <button onClick={sendAllBrevoMailMerge} disabled={mailMergeSending || mailMergeItems.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed">
                      {mailMergeSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} Gửi Brevo
                    </button>
                    <button onClick={openAllMailMerge} disabled={mailMergeSending || mailMergeItems.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">
                      {mailMergeSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                      Mở tất cả email
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto p-5 space-y-3 min-h-0 flex-1">
                  {mailMergeItems.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">Không có công ty nào có đăng ký đã duyệt trong phạm vi hiện tại.</div>
                  ) : mailMergeItems.map(item => (
                    <div key={item.company.company_key || item.company.id || item.company.name} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{item.company.name}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {item.data.length} sinh viên đã duyệt · {item.emails.length ? item.emails[0] : 'Thiếu email liên hệ'}
                            {item.company.applicants_drive_link && <> · <a href={item.company.applicants_drive_link} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">Link Drive</a></>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button onClick={() => exportApplicantsForCompany(item.company)} className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100">XLSX</button>
                          <button onClick={() => openMailMergeComposer(item)} disabled={item.emails.length === 0} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed">Soạn</button>
                          <button onClick={() => sendBrevoMailMergeItem(item)} disabled={item.emails.length === 0 || mailMergeSending} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed">Brevo</button>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                        <div className="text-xs font-semibold text-slate-500 mb-1">Preview</div>
                        <div className="text-sm font-semibold text-slate-800">{item.subject}</div>
                        <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-xs text-slate-600 font-sans">{item.body}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add company form */}
      {!showAddForm ? (
        <div className="mb-6">
          <button onClick={() => setShowAddForm(true)} className="bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm">
            <Plus size={16} /> Thêm Công ty
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-orange-800">Thêm công ty mới</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input placeholder="Tên doanh nghiệp *" value={newCompany.name} onChange={e => setNewCompany({ ...newCompany, name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            <input type="number" min="1" placeholder="Chỉ tiêu tiếp nhận" value={newCompany.slots} onChange={e => setNewCompany({ ...newCompany, slots: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            <input placeholder="Email liên hệ" value={newCompany.contact_email} onChange={e => setNewCompany({ ...newCompany, contact_email: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            <input placeholder="Người liên hệ" value={newCompany.contact_name} onChange={e => setNewCompany({ ...newCompany, contact_name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            <input placeholder="Số điện thoại" value={newCompany.phone} onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            <input placeholder="Địa chỉ" value={newCompany.address} onChange={e => setNewCompany({ ...newCompany, address: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <input placeholder="Link tuyển dụng" value={newCompany.recruitment_link} onChange={e => setNewCompany({ ...newCompany, recruitment_link: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
          <button onClick={handleAdd} className="bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm">
            <Plus size={16} /> Lưu công ty
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 text-xs border-b border-slate-200">
              <th className="p-3 font-semibold w-10">
                <input
                  type="checkbox"
                  checked={isPageSelected}
                  disabled={paginatedCompanies.length === 0}
                  onChange={e => toggleCurrentPageSelection(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                  title="Chọn/bỏ chọn công ty trong trang hiện tại"
                />
              </th>
              <th className="p-3 font-semibold w-12">STT</th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>Tên doanh nghiệp<SortIcon col="name" /></th>
              <th className="p-3 font-semibold">Loại</th>
              <th className="p-3 font-semibold text-center cursor-pointer hover:bg-slate-100 w-20" onClick={() => handleSort('slots')}>Chỉ tiêu<SortIcon col="slots" /></th>
              <th className="p-3 font-semibold text-center cursor-pointer hover:bg-slate-100 w-20" onClick={() => handleSort('applicant_count')}>ƯV<SortIcon col="applicant_count" /></th>
              <th className="p-3 font-semibold text-center cursor-pointer hover:bg-slate-100 w-24" onClick={() => handleSort('approved_applicant_count')}>Đã duyệt<SortIcon col="approved_applicant_count" /></th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('last_sent_at')}>Gửi DN<SortIcon col="last_sent_at" /></th>
              <th className="p-3 font-semibold">Link Drive</th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('contact_email')}>Email<SortIcon col="contact_email" /></th>
              <th className="p-3 font-semibold">Người LH</th>
              <th className="p-3 font-semibold">SĐT</th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('address')}>Địa chỉ<SortIcon col="address" /></th>
              <th className="p-3 font-semibold text-right w-44">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedCompanies.map((c, idx) => (
              <tr key={c.company_key || c.id || `${c.record_type}-${c.name}`} className="hover:bg-slate-50/50 transition-colors text-xs">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedCompanyKeySet.has(companyActionKey(c))}
                    onChange={e => toggleCompanySelection(c, e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    title="Chọn công ty"
                  />
                </td>
                <td className="p-3 text-slate-500">{(safeCurrentPage - 1) * pageSize + idx + 1}</td>
                {editingId === c.id && c.record_type !== 'other' ? (
                  <>
                    <td className="p-3"><input autoFocus value={editCompany.name} onChange={e => setEditCompany({ ...editCompany, name: e.target.value })} className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">Chính thức</span></td>
                    <td className="p-3"><input type="number" value={editCompany.slots} onChange={e => setEditCompany({ ...editCompany, slots: e.target.value })} className="w-16 border border-orange-400 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3 text-center text-slate-500">{c.applicant_count ?? 0}</td>
                    <td className="p-3 text-center text-slate-500">{c.approved_applicant_count ?? 0}</td>
                    <td className="p-3 text-slate-500">{c.last_sent_at ? new Date(c.last_sent_at).toLocaleString('vi-VN') : 'Chưa gửi'}</td>
                    <td className="p-3 text-slate-400">—</td>
                    <td className="p-3"><input value={editCompany.contact_email} onChange={e => setEditCompany({ ...editCompany, contact_email: e.target.value })} className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3"><input value={editCompany.contact_name} onChange={e => setEditCompany({ ...editCompany, contact_name: e.target.value })} className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3"><input value={editCompany.phone} onChange={e => setEditCompany({ ...editCompany, phone: e.target.value })} className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3"><input value={editCompany.address} onChange={e => setEditCompany({ ...editCompany, address: e.target.value })} className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3 text-right flex items-center justify-end gap-1">
                      <button onClick={() => handleUpdate(c.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors" title="Lưu"><Save size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Hủy"><X size={16} /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 text-slate-800 font-medium">
                      {c.name}
                      {c.record_type === 'other' && <div className="text-[11px] text-slate-500 font-normal mt-1">Từ đăng ký “Công ty khác”</div>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full font-semibold ${c.record_type === 'other' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                        {c.record_type === 'other' ? 'Tự liên hệ' : 'Chính thức'}
                      </span>
                    </td>
                    <td className="p-3 text-center">{c.record_type === 'other' ? '—' : c.slots}</td>
                    <td className="p-3 text-center">{c.applicant_count ?? 0}</td>
                    <td className="p-3 text-center">{c.approved_applicant_count ?? 0}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {c.last_sent_at ? (
                        <span className="text-emerald-700 font-semibold">{new Date(c.last_sent_at).toLocaleString('vi-VN')}</span>
                      ) : (
                        <span className="text-slate-300">Chưa gửi</span>
                      )}
                      {Number(c.sent_count || 0) > 0 && <div className="text-[11px] text-slate-400">{c.sent_count} đăng ký</div>}
                    </td>
                    <td className="p-3 text-slate-600">
                      {c.applicants_drive_link ? <a href={c.applicants_drive_link} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">Mở link</a> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-slate-600">{c.contact_email ? <a href={`mailto:${c.contact_email}`} className="text-blue-600 hover:underline">{c.contact_email}</a> : (extractEmails(c.contacts || '').length > 0 ? <span>{extractEmails(c.contacts || '').join(', ')}</span> : <span className="text-slate-300">—</span>)}</td>
                    <td className="p-3 text-slate-600">{c.contact_name || <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-slate-600">{c.phone || <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-slate-600 max-w-[200px] truncate" title={c.address || c.contacts}>{c.address || c.contacts || <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setOpenCompanyActionKey(openCompanyActionKey === companyActionKey(c) ? null : companyActionKey(c))}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Thao tác <ChevronDown size={13} />
                        </button>
                        {openCompanyActionKey === companyActionKey(c) && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenCompanyActionKey(null)} />
                            <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                              <button onClick={() => { exportApplicantsForCompany(c); setOpenCompanyActionKey(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">
                                <Download size={14} className="text-green-600" /> Xuất danh sách XLSX
                              </button>
                              {isOfficialBusinessCompany(c) && (
                                <button onClick={() => { composeCompanyEmail(c); setOpenCompanyActionKey(null); }} disabled={markingSentKey === companyActionKey(c)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                  <FileText size={14} className="text-indigo-600" /> Tạo link/soạn email
                                </button>
                              )}
                              <button onClick={() => { markCompanySent(c); setOpenCompanyActionKey(null); }} disabled={markingSentKey === companyActionKey(c)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                <CheckCircle2 size={14} className="text-emerald-600" /> Đánh dấu đã gửi
                              </button>
                              {c.record_type !== 'other' && (
                                <>
                                  <button onClick={() => { setEditingId(c.id); setEditCompany({ name: c.name, slots: String(c.slots), contact_email: c.contact_email || '', address: c.address || '', phone: c.phone || '', contact_name: c.contact_name || '', recruitment_link: c.recruitment_link || '' }); setOpenCompanyActionKey(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">
                                    <Edit2 size={14} className="text-blue-600" /> Sửa công ty
                                  </button>
                                  <button onClick={() => { handleDelete(c.id, c.name); setOpenCompanyActionKey(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50">
                                    <Trash2 size={14} /> Xóa công ty
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAndSorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
              Hiển thị <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong>-<strong>{Math.min(safeCurrentPage * pageSize, filteredAndSorted.length)}</strong> / <strong>{filteredAndSorted.length}</strong> công ty
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="min-w-20 text-center">Trang {safeCurrentPage}/{totalPages}</span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
        {companies.length > 0 && filteredAndSorted.length === 0 && !loading && (
          <div className="text-center py-12 px-4 text-slate-500 text-sm">
            Không tìm thấy công ty phù hợp với bộ lọc hiện tại.
          </div>
        )}
        {companies.length === 0 && !loading && (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Building2 size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-base font-medium">Chưa có dữ liệu công ty.</p>
            <p className="text-slate-400 text-sm mt-1">Vui lòng đồng bộ từ Google Sheet hoặc thêm thủ công.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovedCompanyRegistry({ token }: { token: string }) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [override, setOverride] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/approved-companies`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e) {
      alert('Lỗi lấy danh sách công ty thẩm định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, [token]);

  const filteredAndSorted = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    const result = companies.filter(c =>
      !lower ||
      c.name?.toLowerCase().includes(lower) ||
      c.source?.toLowerCase().includes(lower) ||
      c.created_at?.toLowerCase().includes(lower)
    );
    result.sort((a, b) => {
      const aVal = String(a[sortConfig.key] ?? '').toLowerCase();
      const bVal = String(b[sortConfig.key] ?? '').toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [companies, searchTerm, sortConfig]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, companies.length]);
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedApprovedCompanies = filteredAndSorted.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-xs">{sortConfig.key === col ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span>
  );

  const handleAdd = async () => {
    if (!newName.trim()) return alert('Vui lòng nhập tên công ty');
    const res = await fetch(`${API_BASE}/api/admin/approved-companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim(), source: 'manual' })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Thêm công ty thất bại');
    setNewName('');
    fetchCompanies();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return alert('Vui lòng nhập tên công ty');
    const res = await fetch(`${API_BASE}/api/admin/approved-companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editName.trim(), source: 'manual' })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Cập nhật thất bại');
    setEditingId(null);
    fetchCompanies();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Xóa "${name}" khỏi danh sách thẩm định nội bộ?`)) return;
    const res = await fetch(`${API_BASE}/api/admin/approved-companies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return alert('Xóa thất bại');
    fetchCompanies();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rows = await readSpreadsheetRows(file);
      const headerCells = (rows[0] || []).map(cell => cell.toLowerCase());
      const hasHeader = headerCells.some(cell => cell.includes('tên') || cell.includes('ten') || cell === 'stt');
      const nameIndex = Math.max(0, headerCells.findIndex(cell => cell.includes('tên công ty') || cell.includes('ten cong ty') || cell === 'name'));
      const bodyRows = hasHeader ? rows.slice(1) : rows;
      const companiesToImport = bodyRows.map(cells => {
        if (nameIndex > 0) return cells[nameIndex] || '';
        if (/^\d+$/.test(cells[0] || '') && cells[1]) return cells[1];
        return cells[0] || '';
      }).map(name => name.trim()).filter(Boolean);
      if (companiesToImport.length === 0) return alert('Không tìm thấy tên công ty hợp lệ trong file.');
      const res = await fetch(`${API_BASE}/api/admin/approved-companies/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companies: companiesToImport, override, source: file.name })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Import thất bại');
      alert(`Đã import ${data.count || companiesToImport.length} công ty thẩm định.`);
      fetchCompanies();
    } catch (err) {
      alert('Không thể đọc/import file XLSX/CSV.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const exportXlsx = () => {
    const headers = ['STT', 'Tên công ty', 'Nguồn', 'Ngày tạo'];
    const rows = filteredAndSorted.map((c, idx) => [idx + 1, c.name || '', c.source || '', c.created_at || '']);
    saveXlsx('danh_sach_cong_ty_tham_dinh_noi_bo.xlsx', headers, rows, 'Thẩm định nội bộ');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/admin/companies')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản lý công ty</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Shield className="text-teal-600" /> Danh sách công ty thẩm định nội bộ</h2>
          <p className="text-sm text-slate-500 mt-1">Danh sách này dùng để tự động duyệt công ty sinh viên tự liên hệ, không công khai cho sinh viên. Tổng: <strong>{companies.length}</strong></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm tên, nguồn..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none whitespace-nowrap">
            <input type="checkbox" checked={override} disabled={importing} onChange={e => setOverride(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 disabled:opacity-60" />
            Ghi đè
          </label>
          <label className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap ${importing ? 'bg-slate-400 text-white cursor-wait pointer-events-none' : 'bg-teal-600 text-white cursor-pointer hover:bg-teal-700'}`}>
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />} {importing ? 'Đang import...' : 'Import XLSX'}
            <input type="file" accept=".xlsx,.xls,.csv" disabled={importing} className="hidden" onChange={handleImport} onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} />
          </label>
          <button onClick={exportXlsx} disabled={loading || importing} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
            <Download size={16} /> Xuất XLSX
          </button>
        </div>
      </div>

      <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Tên công ty đã thẩm định"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
        />
        <button onClick={handleAdd} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
          <Plus size={16} /> Thêm
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 text-xs border-b border-slate-200">
              <th className="p-3 font-semibold w-12">STT</th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>Tên công ty<SortIcon col="name" /></th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100 w-40" onClick={() => handleSort('source')}>Nguồn<SortIcon col="source" /></th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100 w-44" onClick={() => handleSort('created_at')}>Ngày tạo<SortIcon col="created_at" /></th>
              <th className="p-3 font-semibold text-right w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedApprovedCompanies.map((c, idx) => (
              <tr key={c.id} className="hover:bg-slate-50 text-sm">
                <td className="p-3 text-slate-500">{(safeCurrentPage - 1) * pageSize + idx + 1}</td>
                <td className="p-3">
                  {editingId === c.id ? (
                    <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-teal-400 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-teal-500" />
                  ) : (
                    <span className="font-medium text-slate-800">{c.name}</span>
                  )}
                </td>
                <td className="p-3 text-slate-600">{c.source || 'manual'}</td>
                <td className="p-3 text-slate-600 whitespace-nowrap">{c.created_at ? new Date(c.created_at).toLocaleString('vi-VN') : '-'}</td>
                <td className="p-3 text-right">
                  {editingId === c.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleUpdate(c.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors" title="Lưu"><Save size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Hủy"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditingId(c.id); setEditName(c.name || ''); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="Sửa"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Xóa"><Trash2 size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredAndSorted.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">Không có công ty thẩm định phù hợp.</div>
        )}
        {loading && (
          <div className="text-center py-12 text-slate-500 text-sm">Đang tải danh sách...</div>
        )}
        {filteredAndSorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
              Hiển thị <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong>-<strong>{Math.min(safeCurrentPage * pageSize, filteredAndSorted.length)}</strong> / <strong>{filteredAndSorted.length}</strong> công ty
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="min-w-20 text-center">Trang {safeCurrentPage}/{totalPages}</span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSettings({ token }: { token: string }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [exportSheetUrl, setExportSheetUrl] = useState('');
  const [campaign, setCampaign] = useState({ year: '', registration_open_at: '', registration_close_at: '', classes_list: '' } as any);
  const [savingUrl, setSavingUrl] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);



  const fetchSettings = async () => {
    try {
      const [sheetRes, campRes] = await Promise.all([
        fetch(`${API_BASE}/api/settings/google-sheet`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/settings/campaign`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const data = await sheetRes.json();
      setSheetUrl(data.url || '');
      setExportSheetUrl(data.export_url || '');
      setCampaign(await campRes.json());
    } catch (e) { }
  };

  const handleSaveImportUrl = async () => {
    setSavingUrl(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/google-sheet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: sheetUrl })
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Đã lưu URL danh sách công ty thành công!');
    } catch (e) {
      alert('Lỗi khi lưu.');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleSaveExportUrl = async () => {
    setSavingUrl(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/google-sheet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ export_url: exportSheetUrl })
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Đã lưu URL xuất dữ liệu thành công!');
    } catch (e) {
      alert('Lỗi khi lưu.');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleSaveCampaign = async () => {
    setSavingCampaign(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/campaign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(campaign)
      });
      if (res.ok) alert('Đã lưu cấu hình học phần');
    } catch (e) { }
    setSavingCampaign(false);
  };

  const cohortOptions = cohortOptionsForYear(campaign.year);
  const defaultAllowedCohorts = defaultAllowedCohortsForYear(campaign.year);
  const selectedCohorts = String((campaign as any).allowed_registration_cohorts || defaultAllowedCohorts)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const toggleAllowedCohort = (cohort: string) => {
    const next = selectedCohorts.includes(cohort)
      ? selectedCohorts.filter(item => item !== cohort)
      : [...selectedCohorts, cohort];
    const ordered = cohortOptions.map(item => item.key).filter(item => next.includes(item));
    setCampaign({ ...campaign, allowed_registration_cohorts: ordered.join(',') } as any);
  };

  const campaignWindowStatus = (openKey: string, closeKey: string) => {
    const toGMT7Date = (s: string) => s ? new Date(s + ':00+07:00') : null;
    const now = new Date();
    const open = toGMT7Date((campaign as any)[openKey]);
    const close = toGMT7Date((campaign as any)[closeKey]);
    if (open && now < open) return { label: 'Chưa mở', className: 'bg-orange-50 border-orange-200 text-orange-800' };
    if (close && now > close) return { label: 'Đã đóng', className: 'bg-red-50 border-red-200 text-red-800' };
    if (open || close) return { label: 'Đang mở', className: 'bg-green-50 border-green-200 text-green-800' };
    return { label: 'Chưa cấu hình', className: 'bg-slate-50 border-slate-200 text-slate-700' };
  };

  const campaignWindows = [
    { title: 'Đăng ký học phần', openKey: 'registration_open_at', closeKey: 'registration_close_at' },
    { title: 'Xác nhận nơi thực tập', openKey: 'confirmation_open_at', closeKey: 'confirmation_close_at' },
    { title: 'Nộp báo cáo final', openKey: 'final_report_open_at', closeKey: 'final_report_close_at' },
    { title: 'Đăng ký GV hướng dẫn', openKey: 'advisor_request_open_at', closeKey: 'advisor_request_close_at' }
  ];

  const handleSyncCompanies = async () => {
    // Show a choice dialog
    const choice = prompt(
      'Đồng bộ danh sách công ty từ Google Sheet:\n\n'
      + '1 — Giữ lại toàn bộ đăng ký hiện tại\n'
      + '2 — Xoá toàn bộ đăng ký hiện tại\n\n'
      + 'Nhập 1 hoặc 2 để tiếp tục (hoặc bấm Hủy):'
    );
    if (choice !== '1' && choice !== '2') return;

    const keepRegistrations = choice === '1';
    const confirmMsg = keepRegistrations
      ? 'Hệ thống sẽ cập nhật danh sách công ty và GIỮ LẠI toàn bộ đăng ký hiện tại. Tiếp tục?'
      : 'Hệ thống sẽ cập nhật danh sách công ty và XOÁ TOÀN BỘ đăng ký hiện tại. Tiếp tục?';
    if (!confirm(confirmMsg)) return;

    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/import-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ keepRegistrations })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Đã đồng bộ thành công ${data.count} công ty.${keepRegistrations ? ' Các đăng ký hiện tại được giữ nguyên.' : ' Toàn bộ đăng ký đã bị xoá.'}`);
      } else {
        alert('Lỗi đồng bộ: ' + data.error);
      }
    } catch (e) {
      alert('Lỗi kết nối khi đồng bộ.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h2>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
        <h3 className="font-bold text-lg text-slate-800">Cài đặt học phần</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Năm học / Khóa</label>
            <input
              type="text"
              value={campaign.year}
              onChange={e => {
                const nextYear = e.target.value;
                setCampaign({ ...campaign, year: nextYear, allowed_registration_cohorts: defaultAllowedCohortsForYear(nextYear) });
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Khóa được phép đăng nhập/đăng ký học phần</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {cohortOptions.map(item => (
                <label key={item.key} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${selectedCohorts.includes(item.key) ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <span className="font-semibold">{item.key}</span>
                  <span className="text-xs text-slate-500">{item.prefix}</span>
                  <input
                    type="checkbox"
                    checked={selectedCohorts.includes(item.key)}
                    onChange={() => toggleAllowedCohort(item.key)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">Ngoại lệ khóa luôn được áp dụng theo danh sách sinh viên</div>
            <div className="text-xs text-amber-800 mt-1">
              Hệ thống kiểm tra khóa từ email trước. Nếu khóa nằm trong danh sách đang mở thì cho đăng nhập/đăng ký ngay; nếu không, hệ thống mới kiểm tra MSSV/email trong site Quản lý sinh viên. Ví dụ K69 MSSV 24021400 chỉ được vào nếu admin đã thêm/import sinh viên này.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">⏰ Mở đăng ký lúc <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).registration_open_at || ''}
              onChange={e => setCampaign({ ...campaign, registration_open_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">⏱️ Đóng đăng ký lúc <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).registration_close_at || ''}
              onChange={e => setCampaign({ ...campaign, registration_close_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mở xác nhận nơi TT <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).confirmation_open_at || ''}
              onChange={e => setCampaign({ ...campaign, confirmation_open_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đóng xác nhận nơi TT <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).confirmation_close_at || ''}
              onChange={e => setCampaign({ ...campaign, confirmation_close_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mở nộp báo cáo final <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).final_report_open_at || ''}
              onChange={e => setCampaign({ ...campaign, final_report_open_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đóng nộp báo cáo final <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).final_report_close_at || ''}
              onChange={e => setCampaign({ ...campaign, final_report_close_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mở đăng ký GVHD <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).advisor_request_open_at || ''}
              onChange={e => setCampaign({ ...campaign, advisor_request_open_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đóng đăng ký GVHD <span className="text-slate-400 font-normal">(GMT+7)</span></label>
            <input
              type="datetime-local"
              value={(campaign as any).advisor_request_close_at || ''}
              onChange={e => setCampaign({ ...campaign, advisor_request_close_at: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Danh sách lớp khóa học <span className="text-slate-400 font-normal">(mỗi lớp cách nhau bởi dấu phẩy)</span></label>
            <textarea value={campaign.classes_list || ''} onChange={e => setCampaign({ ...campaign, classes_list: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" rows={2} />
          </div>
          <div className="md:col-span-2 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Quota mặc định GVHD</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">GS/PGS</label>
                <input
                  type="number"
                  min="1"
                  value={(campaign as any).advisor_quota_pgs || '5'}
                  onChange={e => setCampaign({ ...campaign, advisor_quota_pgs: e.target.value } as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">TS</label>
                <input
                  type="number"
                  min="1"
                  value={(campaign as any).advisor_quota_ts || '8'}
                  onChange={e => setCampaign({ ...campaign, advisor_quota_ts: e.target.value } as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ThS/Khác</label>
                <input
                  type="number"
                  min="1"
                  value={(campaign as any).advisor_quota_ths || '10'}
                  onChange={e => setCampaign({ ...campaign, advisor_quota_ths: e.target.value } as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Quota riêng của từng giảng viên trong site Phân công GVHD vẫn được ưu tiên nếu đã thiết lập.</p>
          </div>
          <p className="md:col-span-2 text-xs text-slate-500">Mỗi campaign dùng khoảng thời gian riêng. Để trống nếu chưa cấu hình campaign đó.</p>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campaignWindows.map(item => {
              const status = campaignWindowStatus(item.openKey, item.closeKey);
              return (
                <div key={item.openKey} className={`p-3 rounded-lg text-sm border flex items-start gap-2 ${status.className}`}>
                  <Clock size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    <div>Trạng thái hiện tại: <strong>{status.label}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSaveCampaign}
            disabled={savingCampaign}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm transition-all"
          >
            <Save size={18} /> {savingCampaign ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">Tích hợp Google Sheets <RefreshCw size={18} className="text-slate-400" /></h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đường dẫn Google Sheets (chứa danh sách công ty)</label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1VVH.../edit?usp=sharing"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button
                onClick={handleSaveImportUrl}
                disabled={savingUrl}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70 shadow-sm transition-colors"
              >
                <Save size={18} /> {savingUrl ? 'Đang lưu...' : 'Lưu URL'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Lưu ý: Link này cần được cấp quyền "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link can view).</p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">Đường dẫn Google Sheets (lưu dữ liệu xuất file)</label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1ABC..."
                value={exportSheetUrl}
                onChange={(e) => setExportSheetUrl(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button
                onClick={handleSaveExportUrl}
                disabled={savingUrl}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-70 shadow-sm transition-colors"
              >
                <Save size={18} /> {savingUrl ? 'Đang lưu...' : 'Lưu URL'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Lưu ý: Để tính năng này hoạt động, bạn <b>bắt buộc</b> phải cấp quyền Người chỉnh sửa (Editor) cho tài khoản Service Account của bạn trên Google Sheet này.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">Đồng bộ danh sách công ty</p>
              <p className="text-xs">Cập nhật danh sách công ty từ Google Sheet. Bạn có thể chọn giữ lại hoặc xoá đăng ký hiện tại.</p>
            </div>
            <button
              onClick={handleSyncCompanies}
              disabled={syncing}
              className="flex items-center justify-center gap-2 bg-orange-600 white text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-70 shadow-sm transition-colors whitespace-nowrap"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
            </button>
          </div>

        </div>
      </div>


      <div className="bg-blue-50 text-blue-800 p-5 rounded-xl text-sm leading-relaxed border border-blue-100">
        <strong className="block mb-2 text-base">💡 Mẹo nhập dữ liệu vào Google Sheets:</strong>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Từ danh sách Quản trị &gt; Bấm <strong>Lưu vào Google Sheets</strong> để đồng bộ dữ liệu lên bảng tính.</li>
          <li>Trên trang web Google Sheets, tạo một Bảng tính trống mới.</li>
          <li>Nếu cần nhập thủ công, có thể tải file XLSX từ hệ thống rồi import vào Google Sheets.</li>
          <li>Tùy chỉnh thông tin công ty rồi dùng tính năng Share (Bất kỳ ai có link) để lấy liên kết bỏ vào cấu hình trên.</li>
        </ol>
      </div>
    </div>
  );
}

function CompanyDetail({ user, token }: { user: any, token: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCompany = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/companies/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setCompany(data);
        setEditForm({
          name: data?.name || '',
          description: companyDescriptionText(data?.description) || '',
          slots: data?.slots || 5,
          contact_email: data?.contact_email || '',
          contact_name: data?.contact_name || '',
          phone: data?.phone || '',
          address: data?.address || '',
          recruitment_link: data?.recruitment_link || '',
          history: data?.history || '',
          qualifications: data?.qualifications || '',
        });
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCompany();
  }, [id, token]);

  const saveCompany = async () => {
    if (!editForm?.name?.trim()) return alert('Tên công ty không được để trống.');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...editForm,
          description: editForm.description?.trim() || 'Chưa rõ',
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Không lưu được thông tin công ty.');
      setEditing(false);
      await loadCompany();
      alert('Đã cập nhật thông tin công ty.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">Đang tải dữ liệu...</div>;
  if (!company || company.error) return <div className="text-center py-20 text-red-500">Không tìm thấy công ty!</div>;
  const description = companyDisplayDescription(company.description);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm block flex items-center gap-1">
          &larr; Quay lại
        </button>
        {user?.role === 'admin' && !editing && (
          <button onClick={() => setEditing(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm font-semibold shadow-sm flex items-center gap-2 w-fit">
            <Edit2 size={16} /> Chỉnh sửa công ty
          </button>
        )}
      </div>
      {user?.role === 'admin' && editing && editForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-bold text-slate-900">Chỉnh sửa thông tin công ty</h2>
            <button onClick={() => { setEditing(false); setEditForm({ ...company, description: companyDescriptionText(company.description) || '' }); }} className="text-slate-500 hover:text-slate-900">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên công ty *</label>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả công ty</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4} placeholder="Chưa rõ" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chỉ tiêu tiếp nhận</label>
              <input type="number" min={1} value={editForm.slots} onChange={e => setEditForm({ ...editForm, slots: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Người liên hệ</label>
              <input value={editForm.contact_name} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email liên hệ</label>
              <input value={editForm.contact_email} onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Điện thoại liên hệ</label>
              <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Địa chỉ</label>
              <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Link chi tiết tuyển dụng</label>
              <input value={editForm.recruitment_link} onChange={e => setEditForm({ ...editForm, recruitment_link: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lịch sử & Tổ chức</label>
              <textarea value={editForm.history} onChange={e => setEditForm({ ...editForm, history: e.target.value })} rows={3} placeholder="Chưa cập nhật" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Yêu cầu & Tiêu chí</label>
              <textarea value={editForm.qualifications} onChange={e => setEditForm({ ...editForm, qualifications: e.target.value })} rows={4} placeholder="Chưa cập nhật" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => { setEditing(false); setEditForm({ ...company, description: companyDescriptionText(company.description) || '' }); }} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Hủy</button>
            <button onClick={saveCompany} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-2 disabled:opacity-60">
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-slate-100 opacity-50 pointer-events-none">
          <Building2 size={120} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{company.name}</h1>
          <p className="text-lg text-slate-600 mb-4">{description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Thông tin chung</h3>
              <ul className="space-y-4">
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Email liên hệ:</span>
                  <span className="font-medium text-slate-800">
                    {company.contact_name && <span className="font-bold">{company.contact_name} - </span>}
                    {company.contact_email || 'Chưa cập nhật'}
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Điện thoại liên hệ:</span>
                  <span className="font-medium text-slate-800">
                    {company.contact_name && <span className="font-bold">{company.contact_name} - </span>}
                    {company.phone || 'Chưa cập nhật'}
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Địa chỉ:</span>
                  <span className="font-medium text-slate-800">{company.address || 'Chưa cập nhật'}</span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Chi tiết tuyển dụng:</span>
                  <span className="font-medium text-blue-600">
                    {company.recruitment_link ? (
                      <a href={company.recruitment_link} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                        {company.recruitment_link}
                      </a>
                    ) : 'Chưa cập nhật'}
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Chỉ tiêu tiếp nhận:</span>
                  <span className="font-medium text-slate-800">{company.slots} sinh viên</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Lịch sử & Tổ chức</h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{company.history || 'Chưa cập nhật'}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Yêu cầu & Tiêu chí</h3>
            <p className="text-sm text-blue-900 leading-relaxed bg-blue-50/50 p-5 rounded-xl border border-blue-100">{company.qualifications || 'Chưa cập nhật'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanView({ user }: { user: any }) {
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/api/plan`)
      .then(res => res.json())
      .then(data => {
        setPlan(data.plan);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại trang chủ</button>
        {user?.role === 'admin' && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/admin/registration-rules')} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 text-sm font-semibold shadow-sm flex items-center gap-2 whitespace-nowrap">
              <Shield size={16} /> Cài đặt quy định
            </button>
            <button onClick={() => navigate('/admin/plan')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-2 whitespace-nowrap">
              <Edit2 size={16} /> Cài đặt kế hoạch
            </button>
          </div>
        )}
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-none prose prose-blue prose-sm sm:prose-base">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 rounded w-4/6"></div>
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-slate-800 mb-4" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-800 mt-6 mb-3" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2" {...props} />,
              p: ({ node, ...props }) => <p className="mb-4 text-slate-600 leading-relaxed" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
              a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
              table: ({ node, ...props }) => <div className="overflow-x-auto mb-6"><table className="min-w-full divide-y divide-slate-200 border border-slate-200" {...props} /></div>,
              thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
              tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-200 bg-white" {...props} />,
              tr: ({ node, ...props }) => <tr className="hover:bg-slate-50/50" {...props} />,
              th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-x border-slate-200" {...props} />,
              td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-slate-600 border-x border-slate-200" {...props} />,
            }}
          >
            {plan}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function PlanSettingsAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [planContent, setPlanContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingDocx, setImportingDocx] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPlanContent(data?.plan || ''))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: planContent }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu kế hoạch thất bại.');
      alert('Đã lưu Kế hoạch triển khai.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Vui lòng chọn file .docx');
      return;
    }
    setImportingDocx(true);
    try {
      setPlanContent(await convertDocxFileToMarkdown(file));
    } catch (err: any) {
      alert('Không đọc được file Word: ' + (err?.message || err));
    } finally {
      setImportingDocx(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải nội dung kế hoạch...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/plan')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại Kế hoạch triển khai</button>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileText className="text-blue-600" /> Cài đặt Kế hoạch triển khai</h2>
          <p className="text-sm text-slate-500 mt-1">Chỉnh nội dung kế hoạch hiển thị cho sinh viên bằng Markdown.</p>
        </div>
        <button onClick={handleSavePlan} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-2 disabled:opacity-60">
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Lưu kế hoạch
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors shadow-sm border w-fit ${importingDocx
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
            }`}>
            <Upload size={16} />
            {importingDocx ? 'Đang đọc file...' : 'Import từ Word (.docx)'}
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={importingDocx}
              onChange={handleImportDocx}
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
            />
          </label>
          <span className="text-xs text-slate-500">Nội dung file Word sẽ được chuyển sang Markdown và thay thế nội dung đang soạn.</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nội dung Kế hoạch triển khai</label>
            <textarea
              className="w-full min-h-[560px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              value={planContent}
              onChange={(e) => setPlanContent(e.target.value)}
              placeholder="Nhập nội dung kế hoạch triển khai bằng Markdown..."
            />
          </div>
          <div className="p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Xem trước</div>
            <div className="prose prose-blue prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {planContent || ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrationRulesSettingsAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rules, setRules] = useState(DEFAULT_REGISTRATION_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/registration-rules`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setRules(data?.registration_rules_md || DEFAULT_REGISTRATION_RULES))
      .finally(() => setLoading(false));
  }, [token]);

  const saveRules = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/registration-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ registration_rules_md: rules }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu quy định đăng ký thất bại.');
      alert('Đã lưu Quy định đăng ký.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải quy định đăng ký...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/plan')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại Kế hoạch triển khai</button>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield className="text-slate-700" /> Cài đặt Quy định đăng ký</h2>
          <p className="text-sm text-slate-500 mt-1">Chỉnh nội dung quy định hiển thị cho sinh viên bằng Markdown.</p>
        </div>
        <button onClick={saveRules} disabled={saving} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 text-sm font-semibold shadow-sm flex items-center gap-2 disabled:opacity-60">
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Lưu quy định
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-semibold text-slate-700">Nội dung Quy định đăng ký</label>
              <button
                onClick={() => setRules(DEFAULT_REGISTRATION_RULES)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-2 rounded-lg"
              >
                Khôi phục mặc định
              </button>
            </div>
            <textarea
              value={rules}
              onChange={e => setRules(e.target.value)}
              className="w-full min-h-[480px] px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-sm"
              placeholder="Nhập nội dung quy định bằng Markdown..."
            />
          </div>
          <div className="p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Xem trước</div>
            <div className="bg-[#004a99] text-white rounded-2xl p-5 shadow-md">
              <h2 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-4">Quy định Đăng ký</h2>
              {String(rules || '').trim()
                ? <RegistrationRulesMarkdown content={rules} />
                : <p className="text-sm text-blue-100">Chưa có quy định nào.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQView({ user, token }: { user: any, token: string }) {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const fetchMyFaqQuestions = async () => {
    const res = await fetch(`${API_BASE}/api/faq/questions/my`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/settings/faq`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setCampaign(data && !data.error ? data : {})),
      fetchMyFaqQuestions().catch(() => setQuestions([])),
    ]).finally(() => setLoading(false));
  }, [token]);

  const submitQuestion = async () => {
    const question = newQuestion.trim();
    if (!question) return alert('Vui lòng nhập câu hỏi.');
    setSubmittingQuestion(true);
    try {
      const res = await fetch(`${API_BASE}/api/faq/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Gửi câu hỏi thất bại.');
      setNewQuestion('');
      await fetchMyFaqQuestions();
      alert('Đã gửi câu hỏi tới quản trị viên.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const faqRole = user?.role === 'lecturer' ? 'lecturer' : 'student';
  const markdown = faqRole === 'lecturer'
    ? (campaign?.faq_lecturer_md || DEFAULT_LECTURER_FAQ)
    : (campaign?.faq_student_md || DEFAULT_STUDENT_FAQ);
  const roleLabel = faqRole === 'lecturer' ? 'Giảng viên' : 'Sinh viên';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại trang chủ</button>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-amber-50/60">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CircleHelp className="text-amber-600" /> FAQ</h2>
              <p className="text-sm text-slate-500 mt-1">Nội dung câu hỏi thường gặp dành cho vai trò <strong>{roleLabel}</strong>.</p>
            </div>
            {user?.role === 'admin' && (
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => navigate('/admin/faq-questions')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-2 whitespace-nowrap">
                  <Send size={16} /> Trả lời câu hỏi
                </button>
                <button onClick={() => navigate('/admin/faq')} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm font-semibold shadow-sm flex items-center gap-2 whitespace-nowrap">
                  <Edit2 size={16} /> Cài đặt FAQ
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 max-w-none prose prose-blue prose-sm sm:prose-base">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-slate-800 mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-800 mt-6 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-800 mt-5 mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="mb-4 text-slate-600 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
                table: ({ node, ...props }) => <div className="overflow-x-auto mb-6"><table className="min-w-full divide-y divide-slate-200 border border-slate-200" {...props} /></div>,
                th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border-x border-slate-200" {...props} />,
                td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-slate-600 border-x border-slate-200" {...props} />,
              }}
            >
              {markdown}
            </ReactMarkdown>
          )}
        </div>
      </div>
      {user?.role !== 'admin' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><CircleHelp size={18} className="text-blue-600" /> Gửi câu hỏi cho Khoa</h3>
            <p className="text-xs text-slate-500 mt-1">Câu hỏi sẽ được quản trị viên trả lời trong mục FAQ; câu trả lời cũng hiển thị trong thông báo của bạn.</p>
          </div>
          <div className="p-6 space-y-4">
            <textarea
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Nhập câu hỏi của bạn..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500">{newQuestion.length}/2000 ký tự</span>
              <button onClick={submitQuestion} disabled={submittingQuestion || !newQuestion.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {submittingQuestion ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} Gửi câu hỏi
              </button>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Câu hỏi của tôi</h4>
              {questions.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4">Bạn chưa gửi câu hỏi nào.</div>
              ) : (
                <div className="space-y-3">
                  {questions.map(q => (
                    <div key={q.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded w-fit ${q.status === 'answered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {q.status === 'answered' ? 'Đã trả lời' : 'Chờ trả lời'}
                        </span>
                        <span className="text-xs text-slate-400">{q.created_at ? new Date(q.created_at).toLocaleString('vi-VN') : ''}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 whitespace-pre-wrap">{q.question}</div>
                      {q.answer && (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                          <div className="text-xs font-bold text-blue-700 uppercase mb-1">Trả lời</div>
                          {q.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FAQQuestionsAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<number | null>(null);

  const fetchFaqQuestions = async () => {
    const res = await fetch(`${API_BASE}/api/admin/faq/questions`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    setQuestions(rows);
    setAnswerDrafts(Object.fromEntries(rows.map((row: any) => [Number(row.id), row.answer || ''])));
  };

  useEffect(() => {
    fetchFaqQuestions()
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [token]);

  const pendingQuestions = questions.filter(q => q.status !== 'answered').length;

  const answerQuestion = async (questionId: number) => {
    const answer = String(answerDrafts[questionId] || '').trim();
    if (!answer) return alert('Vui lòng nhập câu trả lời.');
    setAnsweringId(questionId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faq/questions/${questionId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu câu trả lời thất bại.');
      await fetchFaqQuestions();
      alert('Đã trả lời câu hỏi.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setAnsweringId(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải danh sách câu hỏi...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/faq')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại FAQ</button>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Send className="text-blue-600" /> Trả lời câu hỏi FAQ</h2>
          <p className="text-sm text-slate-500 mt-1">Xem và trả lời câu hỏi do sinh viên hoặc giảng viên gửi từ trang FAQ.</p>
        </div>
        <button onClick={fetchFaqQuestions} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 text-sm font-semibold shadow-sm flex items-center gap-2">
          <RefreshCw size={16} /> Tải lại
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><CircleHelp size={18} className="text-blue-600" /> Câu hỏi gửi tới FAQ</h3>
            <p className="text-xs text-slate-500 mt-1">Còn <strong>{pendingQuestions}</strong> câu hỏi đang chờ trả lời.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {questions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Chưa có câu hỏi nào được gửi.</div>
          ) : questions.map(q => (
            <div key={q.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${q.status === 'answered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {q.status === 'answered' ? 'Đã trả lời' : 'Chờ trả lời'}
                  </span>
                  <span className="text-xs text-slate-500">{q.role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'}</span>
                  <span className="text-xs text-slate-400">{q.created_at ? new Date(q.created_at).toLocaleString('vi-VN') : ''}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">{q.user_name || q.user_email || 'Người dùng'}</div>
                <div className="text-xs text-slate-500 mb-3">{q.student_id || q.user_email || ''}</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-3">{q.question}</div>
              </div>
              <div className="space-y-3">
                <textarea
                  value={answerDrafts[Number(q.id)] || ''}
                  onChange={e => setAnswerDrafts(prev => ({ ...prev, [Number(q.id)]: e.target.value }))}
                  rows={5}
                  placeholder="Nhập câu trả lời..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
                {q.answered_at && (
                  <div className="text-xs text-slate-500">
                    Trả lời lúc {new Date(q.answered_at).toLocaleString('vi-VN')}{q.answered_by_name ? ` bởi ${q.answered_by_name}` : ''}
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => answerQuestion(Number(q.id))} disabled={answeringId === Number(q.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-2 disabled:opacity-60">
                    {answeringId === Number(q.id) ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} {q.status === 'answered' ? 'Cập nhật trả lời' : 'Trả lời'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FAQSettingsAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [faq, setFaq] = useState<any>({ faq_student_md: DEFAULT_STUDENT_FAQ, faq_lecturer_md: DEFAULT_LECTURER_FAQ });
  const [activeTab, setActiveTab] = useState<'student' | 'lecturer'>('student');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingDocx, setImportingDocx] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/faq`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setFaq({
            faq_student_md: data.faq_student_md || DEFAULT_STUDENT_FAQ,
            faq_lecturer_md: data.faq_lecturer_md || DEFAULT_LECTURER_FAQ,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const saveFaq = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/faq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(faq),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Lưu FAQ thất bại.');
      alert('Đã lưu FAQ.');
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const activeKey = activeTab === 'student' ? 'faq_student_md' : 'faq_lecturer_md';
  const activeDefault = activeTab === 'student' ? DEFAULT_STUDENT_FAQ : DEFAULT_LECTURER_FAQ;

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Vui lòng chọn file .docx');
      return;
    }
    setImportingDocx(true);
    try {
      const markdown = await convertDocxFileToMarkdown(file);
      setFaq((prev: any) => ({ ...prev, [activeKey]: markdown }));
    } catch (err: any) {
      alert('Không đọc được file Word: ' + (err?.message || err));
    } finally {
      setImportingDocx(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải cấu hình FAQ...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/faq')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại FAQ</button>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CircleHelp className="text-amber-600" /> Cài đặt FAQ</h2>
          <p className="text-sm text-slate-500 mt-1">Chọn nhóm người dùng và chỉnh nội dung FAQ hiển thị cho sinh viên hoặc giảng viên.</p>
        </div>
        <button onClick={saveFaq} disabled={saving} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm font-semibold shadow-sm flex items-center gap-2 disabled:opacity-60">
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Lưu FAQ
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 w-fit">
            <button
              onClick={() => setActiveTab('student')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'student' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              FAQ sinh viên
            </button>
            <button
              onClick={() => setActiveTab('lecturer')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'lecturer' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              FAQ giảng viên
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${importingDocx
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              }`}>
              <Upload size={14} />
              {importingDocx ? 'Đang đọc file...' : 'Import Word'}
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={importingDocx}
                onChange={handleImportDocx}
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              />
            </label>
            <button
              onClick={() => setFaq((prev: any) => ({ ...prev, [activeKey]: activeDefault }))}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white px-3 py-2 rounded-lg"
            >
              Khôi phục nội dung mặc định
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
            <label className="block text-sm font-semibold text-slate-700 mb-2">{activeTab === 'student' ? 'Nội dung FAQ sinh viên' : 'Nội dung FAQ giảng viên'}</label>
            <textarea
              value={faq[activeKey] || ''}
              onChange={e => setFaq((prev: any) => ({ ...prev, [activeKey]: e.target.value }))}
              className="w-full min-h-[520px] px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm font-mono"
            />
          </div>
          <div className="p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Xem trước</div>
            <div className="prose prose-blue prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {faq[activeKey] || ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LecturerHome({ user, token }: { user: any, token: string }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [gradeEdits, setGradeEdits] = useState<Record<string, any>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(true);

  const fetchStudents = () => {
    setLoadingStudents(true);
    fetch(`${API_BASE}/api/lecturer/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  };

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
      })
      .catch(() => setGrades([]))
      .finally(() => setLoadingGrades(false));
  };

  useEffect(() => {
    fetchStudents();
    fetchGrades();
  }, [token]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const statusLabel = (status?: string) => status === 'accepted' ? 'Đã chấp nhận' : status === 'needs_revision' ? 'Cần nộp lại' : status === 'submitted' ? 'Đã nộp' : 'Chưa nộp';
  const gradeStatusLabel = (status?: string) => status === 'submitted' ? 'Đã nộp' : status === 'draft' ? 'Nháp' : 'Chưa có';
  const previewFinalScore = (edit: any) => {
    const p = edit?.progress_score === '' ? null : Number(edit?.progress_score);
    const r = edit?.report_score === '' ? null : Number(edit?.report_score);
    const c = edit?.company_score === '' ? null : Number(edit?.company_score);
    if (![p, r, c].every(v => v !== null && Number.isFinite(v))) return '-';
    return ((p as number) * 0.2 + (r as number) * 0.2 + (c as number) * 0.6).toFixed(2);
  };

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

  const updateGradeEdit = (userId: number, key: string, value: string) => {
    setGradeEdits(prev => ({ ...prev, [userId]: { ...(prev[String(userId)] || {}), [key]: value } }));
  };

  const saveGrade = async (row: any, submit = false) => {
    const edit = gradeEdits[String(row.user_id)] || {};
    const endpoint = `${API_BASE}/api/lecturer/grades/${row.user_id}${submit ? '/submit' : ''}`;
    const res = await fetch(endpoint, {
      method: submit ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(edit)
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Lưu điểm thất bại.');
    fetchGrades();
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
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors"
          >
            <UserIcon size={18} /> Cập nhật hồ sơ
          </button>
          <button
            onClick={() => navigate('/plan')}
            className="flex items-center gap-2 bg-slate-100 text-slate-800 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200 shadow-sm transition-colors"
          >
            <FileText size={18} /> Kế hoạch triển khai
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-200 shadow-sm transition-colors"
          >
            <Bell size={18} /> Thông báo
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-teal-50/60">
          <h3 className="font-bold text-slate-800">Sinh viên phụ trách</h3>
          <p className="text-xs text-slate-500 mt-1">Danh sách sinh viên đã được Khoa phân công cho giảng viên.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Mã SV</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Nơi thực tập</th>
                <th className="px-4 py-3">Báo cáo final</th>
                <th className="px-4 py-3">Liên hệ</th>
                <th className="px-4 py-3">Môn học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingStudents ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Đang tải danh sách...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chưa có sinh viên được phân công.</td></tr>
              ) : students.map((student: any) => (
                <tr key={student.assignment_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono">{student.student_id || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{student.student_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${student.advisor_role === 'primary' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {student.advisor_role === 'primary' ? 'Hướng dẫn chính' : 'Đồng hướng dẫn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{student.internship_place || '-'}</td>
                  <td className="px-4 py-3">
                    <div className={`text-xs font-bold ${student.report_status === 'accepted' ? 'text-emerald-700' : student.report_status === 'needs_revision' ? 'text-orange-700' : student.report_status ? 'text-blue-700' : 'text-slate-400'}`}>
                      {statusLabel(student.report_status)}
                    </div>
                    {student.report_filename && (
                      <div className="mt-1 space-y-1">
                        <div className="text-xs text-slate-500">{student.report_filename} · {formatBytes(Number(student.report_file_size || 0))}</div>
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => downloadReport(student)} className="text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded text-xs font-semibold">Tải</button>
                          <button onClick={() => updateReportStatus(student, 'accepted')} className="text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded text-xs font-semibold">OK</button>
                          <button onClick={() => updateReportStatus(student, 'needs_revision')} className="text-orange-700 hover:bg-orange-50 px-1.5 py-0.5 rounded text-xs font-semibold">Nộp lại</button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed">
                    <div>{student.phone || '-'}</div>
                    <div>{student.personal_email || student.email || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{student.course_code || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-green-50/60">
          <h3 className="font-bold text-slate-800">Chấm điểm thực tập</h3>
          <p className="text-xs text-slate-500 mt-1">Chỉ GVHD chính nhập điểm. Công thức: 20% định kỳ, 20% báo cáo final, 60% đánh giá công ty/GVHD.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Sinh viên</th>
                <th className="px-4 py-3">Báo cáo</th>
                <th className="px-4 py-3">20% định kỳ</th>
                <th className="px-4 py-3">20% final</th>
                <th className="px-4 py-3">60% đánh giá</th>
                <th className="px-4 py-3">Tổng</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingGrades ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Đang tải bảng điểm...</td></tr>
              ) : grades.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chưa có sinh viên hướng dẫn chính.</td></tr>
              ) : grades.map((row: any) => {
                const edit = gradeEdits[String(row.user_id)] || {};
                const disabled = !!row.locked_at;
                return (
                  <tr key={row.user_id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{row.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{row.student_id || '-'}</div>
                      <div className="text-xs text-slate-500">{row.internship_place || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className={row.report_status === 'accepted' ? 'text-emerald-700 font-semibold' : row.report_status ? 'text-blue-700 font-semibold' : 'text-slate-400'}>{statusLabel(row.report_status)}</div>
                      <div className={`mt-1 ${row.grade_status === 'submitted' ? 'text-emerald-700' : row.grade_status === 'draft' ? 'text-orange-700' : 'text-slate-400'}`}>{gradeStatusLabel(row.grade_status)}</div>
                      {row.locked_at && <div className="text-red-700 mt-1 font-semibold">Đã khóa</div>}
                    </td>
                    {['progress_score', 'report_score', 'company_score'].map(key => (
                      <td key={key} className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          disabled={disabled}
                          value={edit[key] ?? ''}
                          onChange={e => updateGradeEdit(row.user_id, key, e.target.value)}
                          className="w-20 border border-slate-300 rounded px-2 py-1 text-sm disabled:bg-slate-100"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 font-bold text-green-700">{previewFinalScore(edit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <input disabled={disabled} value={edit.comment ?? ''} onChange={e => updateGradeEdit(row.user_id, 'comment', e.target.value)} placeholder="Ghi chú" className="border border-slate-300 rounded px-2 py-1 text-xs disabled:bg-slate-100" />
                        <div className="flex gap-2">
                          <button disabled={disabled} onClick={() => saveGrade(row, false)} className="text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs font-semibold disabled:opacity-50">Lưu</button>
                          <button disabled={disabled} onClick={() => saveGrade(row, true)} className="text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded text-xs font-semibold disabled:opacity-50">Nộp</button>
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
  );
}

function Profile({ user, setUser, token }: { user: any, setUser: any, token: string }) {
  const isAdmin = user?.role === 'admin';
  const isLecturer = user?.role === 'lecturer';
  const isStaff = isAdmin || isLecturer;
  const [formData, setFormData] = useState({
    name: user?.name || '',
    student_id: user?.student_id || user?.email?.split('@')[0] || '',
    dob: user?.dob || '',
    class_name: user?.class_name || '',
    course_code: user?.course_code || '',
    phone: user?.phone || '',
    personal_email: user?.personal_email || ''
  });
  const [saving, setSaving] = useState(false);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isStaff) {
      fetch(`${API_BASE}/api/settings/campaign`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.classes_list) {
            setClassesList(data.classes_list.split(',').map((c: string) => c.trim()));
          }
        })
        .catch(() => { });

      fetch(`${API_BASE}/api/registrations/my`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => { setMyRegs(Array.isArray(data) ? data : []); })
        .catch(() => { });
    }
  }, [token, isStaff]);

  // Sync formData when user prop changes (e.g. after registration updates phone/personal_email)
  useEffect(() => {
    setFormData({
      name: user?.name || '',
      student_id: user?.student_id || user?.email?.split('@')[0] || '',
      dob: user?.dob || '',
      class_name: user?.class_name || '',
      course_code: user?.course_code || '',
      phone: user?.phone || '',
      personal_email: user?.personal_email || ''
    });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = isStaff
        ? { name: formData.name }
        : formData;
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Cập nhật hồ sơ thành công!');
        navigate('/');
      } else {
        const err = await res.json();
        alert(err.error || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
      }
    } catch (e) {
      alert('Lỗi kết nối.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm flex items-center gap-1">&larr; Quay lại</button>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <UserIcon className="text-blue-600" /> Cập nhật Hồ sơ cá nhân
        </h2>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar + info banner */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            {user.picture ? (
              <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[#004a99] font-bold shadow-sm"><UserIcon size={24} /></div>
            )}
            <div>
              <p className="font-semibold text-slate-800 text-lg">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-slate-500 bg-slate-200 inline-block px-2 py-0.5 rounded-full uppercase tracking-wider font-medium">{user.role}</p>
                {user.is_lecturer ? (
                  <p className="text-xs text-teal-700 bg-teal-50 border border-teal-100 inline-block px-2 py-0.5 rounded-full font-semibold">Giảng viên</p>
                ) : null}
              </div>
            </div>
          </div>

          {isStaff ? (
            /* ── ADMIN / LECTURER VIEW ── */
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                Với tư cách <strong>{isLecturer ? 'Giảng viên' : `Quản trị viên${user.is_lecturer ? ' / Giảng viên' : ''}`}</strong>, hồ sơ của bạn chỉ cần cập nhật họ tên hiển thị.
                {(isLecturer || user.is_lecturer) && <span> Tên này sẽ được <strong>đồng bộ tự động</strong> vào danh sách Giảng viên hướng dẫn.</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
          ) : (
            /* ── STUDENT VIEW ── */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã sinh viên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    pattern="^(0|\+84)[35789][0-9]{8}$"
                    title="Vui lòng nhập số điện thoại hợp lệ (10 số, VD: 0912345678)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    placeholder="VD: 0912345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email cá nhân (khác VNU)</label>
                  <input
                    type="email"
                    value={formData.personal_email}
                    onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    placeholder="VD: abc@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lớp khóa học <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="">-- Chọn lớp khóa học --</option>
                    {classesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Học phần thực tập <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="">-- Chọn học phần --</option>
                    <option value="Thực tập Doanh nghiệp INT4002">Thực tập Doanh nghiệp INT4002</option>
                    <option value="Thực tập Chuyên ngành INT3508">Thực tập Chuyên ngành INT3508</option>
                    <option value="Thực tập Doanh nghiệp Nhật Bản INT4003">Thực tập Doanh nghiệp Nhật Bản INT4003</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-600" /> Nơi đăng ký thực tập
                </h3>
                {myRegs.length > 0 ? (
                  <ul className="space-y-3">
                    {myRegs.map((reg: any, idx: number) => (
                      <li key={reg.id} className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-sm flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-blue-900">
                            <strong>NV{idx + 1}:</strong> {reg.company_name === 'Công ty khác' ? `(Khác) ${reg.other_company_name || ''}` : reg.company_name}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded w-fit ${reg.status === 'approved' ? 'bg-green-100 text-green-700' : reg.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}
                          </span>
                        </div>
                        {reg.review_comment && (
                          <div className={`text-xs rounded-lg px-3 py-2 whitespace-pre-wrap ${reg.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-white/80 text-slate-600 border border-blue-100'}`}>
                            <strong>Nhận xét của Khoa:</strong> {reg.review_comment}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100">Bạn chưa đăng ký nơi thực tập nào. Vui lòng quay lại trang chủ để đăng ký.</p>
                )}
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-70"
            >
              <Save size={18} /> {saving ? 'Đang lưu...' : 'Lưu Hồ sơ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentRegistry({ token }: { token: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [override, setOverride] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const emptyStudentForm = { student_id: '', name: '', dob: '', class_name: '', phone: '', personal_email: '' };
  const [newStudent, setNewStudent] = useState(emptyStudentForm);
  const [editingStudentKey, setEditingStudentKey] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState(emptyStudentForm);
  const pageSize = 25;
  const studentSelector = (student: any) => student?.student_id || `user:${student?.id}`;

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/students`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) {
        setStudents([]);
        return alert(data.error || 'Lỗi lấy danh sách sinh viên');
      }
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      setStudents([]);
      alert('Lỗi lấy danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [token]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.student_id?.toLowerCase().includes(lower) ||
        s.name?.toLowerCase().includes(lower) ||
        s.class_name?.toLowerCase().includes(lower)
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [students, searchTerm, sortConfig]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, students.length]);
  const pagination = paginationBounds(filteredAndSortedStudents.length, currentPage, pageSize);
  const paginatedStudents = filteredAndSortedStudents.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);

  const exportXlsx = () => {
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'SĐT', 'Email cá nhân', 'Lớp khoá học'];
    const rows = filteredAndSortedStudents.map((s, idx) => [
      idx + 1,
      s.student_id,
      s.name,
      s.dob,
      s.phone || '',
      s.personal_email || '',
      s.class_name
    ]);
    saveXlsx('danh_sach_sinh_vien.xlsx', headers, rows, 'Sinh viên');
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage(`Đang đọc file "${file.name}"...`);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      const rows = await readSpreadsheetRows(file);
      const imported = [];
      const header = (rows[0] || []).map(cell => cell.toLowerCase());
      const startIndex = header.some(cell => cell.includes('mã') || cell.includes('student')) ? 1 : 0;
      const studentIdIndex = Math.max(1, header.findIndex(cell => cell.includes('mã') || cell.includes('student')));
      const nameIndex = Math.max(2, header.findIndex(cell => cell.includes('họ') || cell.includes('tên') || cell === 'name'));
      const dobIndex = Math.max(3, header.findIndex(cell => cell.includes('sinh') || cell.includes('dob')));
      const classIndex = Math.max(4, header.findIndex(cell => cell.includes('lớp') || cell.includes('class')));
      for (let i = startIndex; i < rows.length; i++) {
        const parts = rows[i];
        if (!parts.some(Boolean)) continue;
        if (parts.length >= 5) {
          let dob = parts[dobIndex];
          if (dob.includes('/')) {
            const d = dob.split('/');
            if (d.length === 3) dob = `${d[2]}-${d[1]}-${d[0]}`;
          }
          imported.push({
            student_id: parts[studentIdIndex],
            name: parts[nameIndex],
            dob,
            class_name: parts[classIndex]
          });
        }
      }
      if (imported.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ trong file');
        return;
      }

      setImportMessage(`Đang import ${imported.length} sinh viên lên hệ thống...`);
      const res = await fetch(`${API_BASE}/api/admin/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ students: imported, override })
      });
      if (res.ok) {
        alert('Import thành công!');
        fetchStudents();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (e) {
      alert('Lỗi import');
    } finally {
      setImporting(false);
      setImportMessage('');
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá sinh viên này khỏi CSDL?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Xóa sinh viên thất bại.');
      fetchStudents();
    } catch (e) {
      alert('Lỗi xoá');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      student_id: newStudent.student_id.trim(),
      name: newStudent.name.trim(),
      dob: newStudent.dob,
      class_name: newStudent.class_name.trim(),
      phone: newStudent.phone.trim(),
      personal_email: newStudent.personal_email.trim(),
    };
    if (!payload.student_id || !payload.name) {
      alert('Vui lòng nhập Mã SV và Họ tên.');
      return;
    }
    setSavingStudent(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Không thể thêm sinh viên.');
      setNewStudent(emptyStudentForm);
      setShowAddForm(false);
      await fetchStudents();
    } catch (e) {
      alert('Lỗi thêm sinh viên');
    } finally {
      setSavingStudent(false);
    }
  };

  const startEditStudent = (student: any) => {
    setShowAddForm(false);
    setEditingStudentKey(studentSelector(student));
    setEditStudent({
      student_id: student.student_id || '',
      name: student.name || '',
      dob: student.dob || '',
      class_name: student.class_name || '',
      phone: student.phone || '',
      personal_email: student.personal_email || '',
    });
  };

  const cancelEditStudent = () => {
    setEditingStudentKey(null);
    setEditStudent(emptyStudentForm);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudentKey) return;
    const payload = {
      student_id: editStudent.student_id.trim(),
      name: editStudent.name.trim(),
      dob: editStudent.dob,
      class_name: editStudent.class_name.trim(),
      phone: editStudent.phone.trim(),
      personal_email: editStudent.personal_email.trim(),
    };
    if (!payload.student_id || !payload.name) {
      alert('Vui lòng nhập Mã SV và Họ tên.');
      return;
    }
    setSavingStudent(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${encodeURIComponent(editingStudentKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data.error || 'Không thể cập nhật sinh viên.');
      cancelEditStudent();
      await fetchStudents();
    } catch (e) {
      alert('Lỗi cập nhật sinh viên');
    } finally {
      setSavingStudent(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600" /> CSDL Sinh viên</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo Mã SV, Tên, Lớp..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={override} disabled={importing} onChange={e => setOverride(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 disabled:opacity-60" />
            Ghi đè SV
          </label>
          <label className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap ${importing ? 'bg-green-500 text-white cursor-wait pointer-events-none opacity-80' : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'}`}>
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />} {importing ? 'Đang import...' : 'Import'}
            <input type="file" accept=".xlsx,.xls,.csv" disabled={importing} className="hidden" onChange={handleFileUpload} onClick={(e) => { (e.target as any).value = null }} />
          </label>
          <button onClick={() => setShowAddForm(prev => !prev)} disabled={importing} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed">
            {showAddForm ? <X size={16} /> : <Plus size={16} />} {showAddForm ? 'Đóng' : 'Thêm sinh viên'}
          </button>
          <button onClick={exportXlsx} disabled={importing} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed">
            <Download size={16} /> Xuất XLSX
          </button>
        </div>
      </div>
      {showAddForm && (
        <form onSubmit={handleAddStudent} className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mã SV *</label>
              <input
                value={newStudent.student_id}
                onChange={e => setNewStudent({ ...newStudent, student_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="24021400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên *</label>
              <input
                value={newStudent.name}
                onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={newStudent.dob}
                onChange={e => setNewStudent({ ...newStudent, dob: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">SĐT</label>
              <input
                value={newStudent.phone}
                onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="09..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lớp khoá học</label>
              <input
                value={newStudent.class_name}
                onChange={e => setNewStudent({ ...newStudent, class_name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="QH-2024-I/CQ..."
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email cá nhân</label>
              <input
                type="email"
                value={newStudent.personal_email}
                onChange={e => setNewStudent({ ...newStudent, personal_email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>
            <div className="md:col-span-3 flex items-end justify-end gap-2">
              <button type="button" onClick={() => { setNewStudent(emptyStudentForm); setShowAddForm(false); }} disabled={savingStudent} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-white disabled:opacity-60">
                Huỷ
              </button>
              <button type="submit" disabled={savingStudent} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                {savingStudent ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {savingStudent ? 'Đang lưu...' : 'Lưu sinh viên'}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Email VNU được tạo tự động theo dạng MSSV@vnu.edu.vn. Sinh viên ngoài khóa đang mở sẽ được xem là ngoại lệ nếu MSSV/email này tồn tại trong danh sách.</p>
        </form>
      )}
      {importing && (
        <div aria-live="polite" className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <RefreshCw size={18} className="animate-spin shrink-0" />
          <span>{importMessage || 'Hệ thống đang import dữ liệu, vui lòng đợi...'}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 text-sm border-b border-slate-200">
              <th className="p-4 font-semibold whitespace-nowrap">STT</th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('student_id')}>
                Mã SV {sortConfig?.key === 'student_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                Họ và tên {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('dob')}>
                Ngày sinh {sortConfig?.key === 'dob' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('phone')}>
                SĐT {sortConfig?.key === 'phone' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('personal_email')}>
                Email cá nhân {sortConfig?.key === 'personal_email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-100" onClick={() => handleSort('class_name')}>
                Lớp khoá học {sortConfig?.key === 'class_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-500">
                  {students.length === 0 ? 'Chưa có dữ liệu sinh viên.' : 'Không có sinh viên phù hợp.'}
                </td>
              </tr>
            ) : paginatedStudents.map((s, idx) => {
              const selector = studentSelector(s);
              const isEditing = editingStudentKey === selector;
              return (
                <tr key={selector} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="p-4 text-sm text-slate-600">{(pagination.safePage - 1) * pageSize + idx + 1}</td>
                  {isEditing ? (
                    <>
                      <td className="p-3">
                        <input
                          value={editStudent.student_id}
                          onChange={e => setEditStudent({ ...editStudent, student_id: e.target.value })}
                          className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          value={editStudent.name}
                          onChange={e => setEditStudent({ ...editStudent, name: e.target.value })}
                          className="w-48 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="date"
                          value={editStudent.dob}
                          onChange={e => setEditStudent({ ...editStudent, dob: e.target.value })}
                          className="w-36 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          value={editStudent.phone}
                          onChange={e => setEditStudent({ ...editStudent, phone: e.target.value })}
                          className="w-32 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="email"
                          value={editStudent.personal_email}
                          onChange={e => setEditStudent({ ...editStudent, personal_email: e.target.value })}
                          className="w-52 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          value={editStudent.class_name}
                          onChange={e => setEditStudent({ ...editStudent, class_name: e.target.value })}
                          className="w-44 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={handleUpdateStudent} disabled={savingStudent} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors disabled:opacity-50" title="Lưu">
                            {savingStudent ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                          </button>
                          <button onClick={cancelEditStudent} disabled={savingStudent} className="text-slate-500 hover:bg-slate-100 p-2 rounded-lg transition-colors disabled:opacity-50" title="Huỷ">
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-sm font-mono text-slate-800 font-medium">{s.student_id}</td>
                      <td className="p-4 text-sm text-slate-800">{s.name}</td>
                      <td className="p-4 text-sm text-slate-600">{s.dob}</td>
                      <td className="p-4 text-sm text-slate-600">{s.phone || '-'}</td>
                      <td className="p-4 text-sm text-slate-600">{s.personal_email ? <a href={`mailto:${s.personal_email}`} className="text-blue-600 hover:underline">{s.personal_email}</a> : '-'}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-medium">{s.class_name}</span>
                      </td>
                      <td className="p-4 text-sm text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEditStudent(s)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors tooltip" title="Sửa">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(selector)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors tooltip" title="Xóa">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationControls
        total={filteredAndSortedStudents.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        label="sinh viên"
      />
    </div>
  );
}

export default App;

function AdminRegistry({ token }: { token: string }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/admins`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAdmins(data);
    } catch (e) {
      alert('Lỗi lấy danh sách admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, [token]);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.endsWith('@vnu.edu.vn')) {
      alert('Vui lòng nhập email @vnu.edu.vn hợp lệ');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newAdminEmail.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setNewAdminEmail('');
        fetchAdmins();
        alert(data.message || 'Đã thêm admin thành công.');
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi thêm admin');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleRemoveAdmin = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa quyền admin của người dùng này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdmins();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi xóa admin');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const toggleLecturer = async (admin: any) => {
    const newVal = !admin.is_lecturer;
    const action = newVal ? 'thêm' : 'xóa';
    if (!confirm(`Bạn có muốn ${action} "${admin.name}" khỏi danh sách Giảng viên?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${admin.id}/lecturer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_lecturer: newVal })
      });
      if (res.ok) {
        fetchAdmins();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch {
      alert('Lỗi cập nhật');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="text-purple-600" /> Quản lý Quản trị viên
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Danh sách các tài khoản có quyền Admin. Admin có thể đồng thời là Giảng viên.
        </p>
      </div>

      {/* Add admin */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Plus size={16} className="text-purple-500" /> Thêm Quản trị viên mới</h3>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="VD: nguyenvanan@vnu.edu.vn"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
          />
          <button
            onClick={handleAddAdmin}
            className="flex items-center gap-2 bg-purple-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-800 shadow-sm transition-colors"
          >
            <Plus size={18} /> Thêm Admin
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Chỉ chấp nhận email có đuôi @vnu.edu.vn. Người dùng phải đăng nhập lại để quyền Admin có hiệu lực.</p>
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800 leading-relaxed">
        <strong>Lưu ý:</strong> Tích vào ô <strong>"Là Giảng viên"</strong> sẽ tự động đồng bộ tên của Admin đó vào danh sách Giảng viên để sinh viên có thể chọn khi đăng ký thực tập tại Trường.
      </div>

      {/* Admin list */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 text-sm border-b border-slate-200">
              <th className="p-4 font-semibold w-12 text-center">STT</th>
              <th className="p-4 font-semibold">Họ và Tên</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold text-center">Là Giảng viên</th>
              <th className="p-4 font-semibold text-center w-24">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Đang tải...</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Chưa có admin nào</td></tr>
            ) : (
              admins.map((admin, idx) => (
                <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm text-slate-500 text-center">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {admin.picture ? (
                        <img src={admin.picture} alt={admin.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <UserIcon size={14} className="text-purple-600" />
                        </div>
                      )}
                      <span className="font-semibold text-slate-800 text-sm">{admin.name || <span className="text-slate-400 font-normal italic">Chưa đăng nhập</span>}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{admin.email}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleLecturer(admin)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${admin.is_lecturer ? 'bg-teal-500' : 'bg-slate-200'
                        }`}
                      title={admin.is_lecturer ? 'Click để bỏ khỏi danh sách GV' : 'Click để thêm vào danh sách GV'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${admin.is_lecturer ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                    {admin.is_lecturer ? (
                      <span className="ml-2 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">GV</span>
                    ) : null}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Xóa quyền admin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
