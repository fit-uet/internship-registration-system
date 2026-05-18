import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HashRouter, Routes, Route, useNavigate, Navigate, useParams, Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, User as UserIcon, Users, Upload, CheckCircle2, Download, LogIn, LayoutDashboard, ArrowUpDown, Search, AlertTriangle, ChevronRight, Building2, RefreshCw, Save, Plus, Trash2, X, ChevronDown, FileText, Edit2, Shield, Clock, Send } from 'lucide-react';
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

const loadScriptOnce = (src: string) => new Promise<void>((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error(`Không tải được script ${src}`));
  document.head.appendChild(script);
});

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
        else reject(new Error(response?.error || 'Không lấy được quyền Google Drive.'));
      },
      error_callback: (error: any) => reject(new Error(error?.message || 'Không lấy được quyền Google Drive.')),
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

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLoginSuccess = async (credentialResponse: any) => {
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Unknown error');
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

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
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-3 hover:bg-white/10 p-1.5 pr-3 rounded-full transition-colors cursor-pointer group focus:outline-none">
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
                        <button onClick={() => { setIsMenuOpen(false); logout(); }} className="flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-sm font-medium text-red-600 w-full text-left transition-colors">
                          <LogOut size={16} /> Đăng xuất
                        </button>
                      </div>
                    </>
                  )}
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
                <Route path="/" element={user.role === 'lecturer' ? <LecturerHome user={user} token={token} /> : <Dashboard user={user} setUser={setUser} token={token} />} />
                <Route path="/admin" element={user.role === 'admin' ? <AdminPanel token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/students" element={user.role === 'admin' ? <StudentRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/lecturers" element={user.role === 'admin' ? <LecturerRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/advisors" element={user.role === 'admin' ? <AdvisorAssignmentAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/reports" element={user.role === 'admin' ? <FinalReportAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/grades" element={user.role === 'admin' ? <GradeAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/notifications" element={user.role === 'admin' ? <NotificationAdmin token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/companies" element={user.role === 'admin' ? <CompanyRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/approved-companies" element={user.role === 'admin' ? <ApprovedCompanyRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/admins" element={user.role === 'admin' ? <AdminRegistry token={token} /> : <Navigate to="/" />} />
                <Route path="/admin/settings" element={user.role === 'admin' ? <AdminSettings token={token} /> : <Navigate to="/" />} />
                <Route path="/company/:id" element={<CompanyDetail token={token} />} />
                <Route path="/plan" element={<PlanView />} />
                <Route path="/profile" element={<Profile user={user} setUser={setUser} token={token} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            )}
          </main>

          <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 flex items-center justify-between text-xs text-slate-500 font-medium mt-auto">
            <p>© 2026 Khoa CNTT UET</p>
            <p>Hỗ trợ: baoptm@vnu.edu.vn</p>
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
                  <br /><br />
                  Vui lòng sử dụng tài khoản email do nhà trường cung cấp (có đuôi <strong>@vnu.edu.vn</strong>) để truy cập vào hệ thống.
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

function Dashboard({ user, setUser, token }: { user: any, setUser: any, token: string }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [finalInternship, setFinalInternship] = useState<any>(null);
  const [myAdvisors, setMyAdvisors] = useState<any[]>([]);
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
  const [finalSchoolMode, setFinalSchoolMode] = useState<'lecturer' | 'assignment'>('lecturer');
  const [finalAttested, setFinalAttested] = useState(false);
  const [finalNote, setFinalNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const [compRes, regRes, finalRes, advisorRes, reportRes, campRes, itListRes, lecRes] = await Promise.all([
        fetch(`${API_BASE}/api/companies`, { headers: { Authorization: `Bearer ${token}` } }),
        isStudent ? fetch(`${API_BASE}/api/registrations/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/internships/final/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/advisor/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/reports/final/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        fetch(`${API_BASE}/api/settings/campaign`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/companies/it-list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/lecturers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const compData = await compRes.json();
      setCompanies(Array.isArray(compData) ? compData : []);

      const regData = regRes ? await regRes.json() : [];
      setMyRegs(Array.isArray(regData) ? regData : []);

      const finalData = finalRes ? await finalRes.json() : null;
      setFinalInternship(finalData && !finalData.error ? finalData : null);

      const advisorData = advisorRes ? await advisorRes.json() : [];
      setMyAdvisors(Array.isArray(advisorData) ? advisorData : []);

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
    }
    setLoading(false);
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
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
  });
  useEffect(() => {
    setCompanyPage(1);
  }, [searchTerm, sortConfig, companies.length]);
  const companyTotalPages = Math.max(1, Math.ceil(sortedCompanies.length / companyPageSize));
  const safeCompanyPage = Math.min(companyPage, companyTotalPages);
  const paginatedCompanies = sortedCompanies.slice((safeCompanyPage - 1) * companyPageSize, safeCompanyPage * companyPageSize);

  const submitRegister = async (e: any) => {
    e.preventDefault();
    if (selectedCompanies.size === 0) return;
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
          student_id: registerForm.student_id,
          dob: registerForm.dob,
          class_name: registerForm.class_name,
          course_code: registerForm.course_code,
          phone: registerForm.phone,
          personal_email: registerForm.personal_email,
          school_lecturer: registerForm.school_lecturer,
          school_co_lecturer: registerForm.school_co_lecturer,
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
    try {
      const res = await fetch(`${API_BASE}/api/registrations/my`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        setIsWithdrawModalOpen(false);
      }
    } catch (e) {
      alert("Hủy lỗi!");
    }
  };

  const approvedFinalOptions = myRegs.filter((reg: any) => reg.status === 'approved' && reg.company_name !== 'Trường Đại học Công nghệ');

  const openFinalConfirm = (mode: 'company' | 'school') => {
    setFinalConfirmMode(mode);
    setSelectedFinalRegId(mode === 'company' ? String(approvedFinalOptions[0]?.id || '') : '');
    setFinalSchoolLecturer('');
    setFinalSchoolMode('lecturer');
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
          school_lecturer: finalSchoolMode === 'lecturer' ? finalSchoolLecturer : '',
          school_assignment_request: finalSchoolMode === 'assignment',
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
  const registrationRules = String(campaign.registration_rules_md || DEFAULT_REGISTRATION_RULES)
    .split(/\r?\n/)
    .map((item: string) => item.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Sidebar Info */}
      <div className="col-span-1 lg:col-span-3 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Trạng thái Hệ thống</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-3 w-3">
              {registrationWindowStatus === 'open' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${registrationWindowStatus === 'open' ? 'bg-green-500' : registrationWindowStatus === 'not_open_yet' ? 'bg-orange-500' : 'bg-red-500'}`}></span>
            </span>
            <span className={`text-sm font-semibold ${registrationWindowStatus === 'open' ? 'text-green-700' : registrationWindowStatus === 'not_open_yet' ? 'text-orange-700' : 'text-red-700'}`}>
              {registrationWindowStatus === 'open' ? 'Đang mở đăng ký' : registrationWindowStatus === 'not_open_yet' ? 'Chưa mở đăng ký' : 'Đã đóng đăng ký'}
            </span>
          </div>
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Bắt đầu:</span>
              <span className="font-medium">{campaign.registration_open_at ? formatGMT7(campaign.registration_open_at) + ' (GMT+7)' : '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Kết thúc:</span>
              <span className="font-medium">{campaign.registration_close_at ? formatGMT7(campaign.registration_close_at) + ' (GMT+7)' : '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#004a99] text-white rounded-2xl p-5 shadow-md flex-1">
          <h2 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-4">Quy định Đăng ký</h2>
          <ul className="text-sm space-y-3">
            {registrationRules.map((rule, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-blue-400">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="col-span-1 lg:col-span-9 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Thực tập {campaign.year}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/plan')}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-md text-xs font-bold hover:bg-blue-200 shadow-sm transition-colors"
            >
              KẾ HOẠCH TRIỂN KHAI
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-slate-800 shadow-sm transition-colors"
              >
                <LayoutDashboard size={14} /> DANH SÁCH ĐĂNG KÝ
              </button>
            )}
          </div>
        </div>

        {hasRegistered ? (
          <div className="bg-green-50/50 border border-green-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-green-600" size={20} />
                  <h3 className="text-base font-bold text-green-900">Đã ghi nhận đăng ký {myRegs.length} công ty</h3>
                </div>
                <ul className="text-sm text-green-800 mb-4 space-y-1">
                  {myRegs.map((reg: any, idx: number) => (
                    <li key={reg.id}>NV{idx + 1}: <strong>{reg.company_name === 'Công ty khác' ? `(Khác) ${reg.other_company_name || ''}` : reg.company_name}</strong> — <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${reg.status === 'approved' ? 'bg-green-100 text-green-700' : reg.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}</span></li>
                  ))}
                </ul>
                <div className="flex items-center gap-3 text-xs text-green-700 font-medium">
                  <span>NGÀY GHI NHẬN: {new Date(myRegs[0].created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="px-4 py-1.5 border border-red-500 text-red-500 rounded-md text-xs font-bold hover:bg-red-50/50 transition-colors whitespace-nowrap"
              >
                Hủy tất cả đăng ký
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 text-blue-800 text-sm">
            Bạn chưa đăng ký công ty nào. Vui lòng chọn tối đa 5 nơi thực tập từ danh sách dưới đây rồi bấm <strong>Đăng ký</strong>.
          </div>
        )}

        {hasRegistered && (
          <div className={`border rounded-2xl p-6 shadow-sm ${finalInternship ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
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
                    {finalInternship.school_assignment_request ? <p>GVHD: <strong>Nhờ Khoa phân công</strong></p> : null}
                    {myAdvisors.length > 0 && (
                      <p>
                        GVHD đã phân công:{' '}
                        <strong>{myAdvisors.map((a: any) => `${a.role === 'primary' ? 'Chính' : 'Đồng'}: ${a.lecturer_name}`).join('; ')}</strong>
                      </p>
                    )}
                    <p className="text-xs">Thời gian xác nhận: {finalInternship.confirmed_at ? new Date(finalInternship.confirmed_at).toLocaleString('vi-VN') : '-'}</p>
                    {finalInternship.locked_at && <p className="text-xs font-semibold text-emerald-900">Hồ sơ đã được Khoa khóa.</p>}
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
            </div>
          </div>
        )}

        {finalInternship && (
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-800 text-sm">Danh sách nơi thực tập</h2>
              {!hasRegistered && selectedCompanies.size > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Đã chọn: {selectedCompanies.size}/5</span>
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
                      disabled={selectedCompanies.size === 0}
                      onClick={() => setRegisterModalOpen(true)}
                      className={`px-5 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors whitespace-nowrap ${selectedCompanies.size === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      Đăng ký ({selectedCompanies.size})
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
                          disabled={hasRegistered || (!isSelected && selectedCompanies.size >= 5)}
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


        </div>
      </div>

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Xác nhận hủy đăng ký</h3>
            </div>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              Bạn có chắc chắn muốn hủy kết quả đăng ký thực tập hiện tại?
              <br /><br />
              <strong>Lưu ý:</strong> Mọi lựa chọn đều được hệ thống ghi lại. Việc hủy để chọn lại công ty có thể khiến bạn mất lượt ở những danh sách đã đầy. Hủy bỏ là hành động không thể hoàn tác.
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFinalSchoolMode('lecturer')}
                      className={`px-3 py-2 rounded-lg text-sm font-bold border ${finalSchoolMode === 'lecturer' ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      Đã có GV đồng ý
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFinalSchoolMode('assignment'); setFinalSchoolLecturer(''); }}
                      className={`px-3 py-2 rounded-lg text-sm font-bold border ${finalSchoolMode === 'assignment' ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      Nhờ Khoa phân công
                    </button>
                  </div>
                  {finalSchoolMode === 'lecturer' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Giảng viên đã đồng ý hướng dẫn *</label>
                      <input
                        type="text"
                        list="final-lecturers-list"
                        required
                        value={finalSchoolLecturer}
                        onChange={e => setFinalSchoolLecturer(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Gõ để tìm kiếm giảng viên..."
                      />
                      <datalist id="final-lecturers-list">
                        {lecturers.map(lec => <option key={lec} value={lec} />)}
                      </datalist>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-orange-100 bg-orange-50 p-3 text-sm text-orange-900">
                      Hệ thống sẽ ghi nhận nhu cầu thực tập tại trường để Khoa tổng hợp và phân công giảng viên hướng dẫn sau.
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Chỉ chọn thực tập tại trường khi bạn không trúng tuyển công ty nào hoặc thực hiện theo sắp xếp của Khoa.</p>
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
                  disabled={isConfirmingFinal || (finalConfirmMode === 'company' && !selectedFinalRegId) || (finalConfirmMode === 'school' && finalSchoolMode === 'lecturer' && !finalSchoolLecturer.trim())}
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
              <p className="text-sm text-slate-600 mb-2">Bạn đang đăng ký <strong>{selectedCompanies.size}</strong> công ty:</p>
              <ul className="text-sm text-slate-700 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {Array.from(selectedCompanies).map((cId, idx) => {
                  const comp = companies.find(c => c.id === cId);
                  return <li key={cId} className="flex items-center gap-2"><span className="text-blue-600 font-bold text-xs">NV{idx + 1}</span> {comp?.name || 'Không rõ'}</li>;
                })}
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

              {hasSelectedSchool && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-blue-800">Thông tin Thực tập tại Trường</h4>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Giảng viên hướng dẫn *</label>
                    <input
                      type="text"
                      list="lecturers-list"
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={registerForm.school_lecturer}
                      onChange={e => setRegisterForm({ ...registerForm, school_lecturer: e.target.value })}
                      placeholder="Gõ để tìm kiếm giảng viên..."
                    />
                    <datalist id="lecturers-list">
                      {lecturers.map(lec => (
                        <option key={lec} value={lec} />
                      ))}
                    </datalist>
                    <p className="text-[11px] text-slate-500 mt-1.5 italic font-medium">* Lưu ý: Sinh viên bắt buộc phải liên hệ với thầy/cô từ trước.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Giảng viên đồng hướng dẫn <span className="text-slate-400 font-normal">(không bắt buộc)</span></label>
                    <input
                      type="text"
                      list="lecturers-list"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={registerForm.school_co_lecturer}
                      onChange={e => setRegisterForm({ ...registerForm, school_co_lecturer: e.target.value })}
                      placeholder="Gõ để tìm kiếm giảng viên đồng hướng dẫn..."
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5 italic font-medium">Chỉ chọn nếu đã được thầy/cô đồng ý đồng hướng dẫn.</p>
                  </div>
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
  const [finalInternships, setFinalInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [savingToSheet, setSavingToSheet] = useState(false);
  const [registrationPage, setRegistrationPage] = useState(1);
  const [finalInternshipPage, setFinalInternshipPage] = useState(1);
  const registrationPageSize = 25;
  const finalInternshipPageSize = 20;

  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const [res, finalRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/registrations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/final-internships`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
      const finalData = await finalRes.json();
      setFinalInternships(Array.isArray(finalData) ? finalData : []);
    } catch (e) { }
    setLoading(false);
  };

  const registrationExportData = (dataList: any[]) => {
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'SĐT', 'Email cá nhân', 'Lớp KH', 'Mã môn học', 'Nơi thực tập', 'Vị trí', 'Liên hệ', 'Ghi chú', 'Trạng thái', 'Đã gửi DN', 'Thời gian đăng ký'];
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
      const res = await fetch(`${API_BASE}/api/admin/registrations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
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

  const handleApproveAll = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn duyệt tất cả các đăng ký đang chờ?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/approve-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
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
      (reg.student_id || '').toLowerCase().includes(term) ||
      (reg.class_name || '').toLowerCase().includes(term)
    );
    const matchCourse = filterCourse ? reg.course_code === filterCourse : true;
    return matchTerm && matchCourse;
  });
  useEffect(() => {
    setRegistrationPage(1);
  }, [searchTerm, filterCourse, sortConfig, registrations.length]);
  const registrationPagination = paginationBounds(filteredRegistrations.length, registrationPage, registrationPageSize);
  const paginatedRegistrations = filteredRegistrations.slice(
    (registrationPagination.safePage - 1) * registrationPageSize,
    registrationPagination.safePage * registrationPageSize
  );

  useEffect(() => {
    setFinalInternshipPage(1);
  }, [finalInternships.length]);
  const finalInternshipPagination = paginationBounds(finalInternships.length, finalInternshipPage, finalInternshipPageSize);
  const paginatedFinalInternships = finalInternships.slice(
    (finalInternshipPagination.safePage - 1) * finalInternshipPageSize,
    finalInternshipPagination.safePage * finalInternshipPageSize
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
  const confirmedFinalCount = finalInternships.length;
  const schoolInternshipCount = finalInternships.filter(item => item.internship_type === 'school').length;

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm whitespace-nowrap font-medium">&larr; Quay lại</button>
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm max-w-[220px] truncate bg-white cursor-pointer">
            <option value="">Tất cả học phần</option>
            {uniqueCourses.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
          </select>
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

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-slate-500 text-sm font-medium mb-1">Tổng nguyện vọng</span>
          <span className="text-3xl font-bold text-slate-800">{totalRegistrations}</span>
        </div>
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col">
          <span className="text-blue-600 text-sm font-medium mb-1">Số sinh viên đăng ký</span>
          <span className="text-3xl font-bold text-blue-700">{totalStudents}</span>
        </div>
        <div className="bg-cyan-50 p-5 rounded-xl border border-cyan-100 shadow-sm flex flex-col">
          <span className="text-cyan-700 text-sm font-medium mb-1">Số công ty</span>
          <span className="text-3xl font-bold text-cyan-800">{totalCompanies}</span>
        </div>
        <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 shadow-sm flex flex-col">
          <span className="text-orange-600 text-sm font-medium mb-1">Chờ duyệt</span>
          <span className="text-3xl font-bold text-orange-700">{pendingRegistrations}</span>
        </div>
        <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm flex flex-col">
          <span className="text-green-600 text-sm font-medium mb-1">Đã duyệt</span>
          <span className="text-3xl font-bold text-green-700">{approvedRegistrations}</span>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm flex flex-col">
          <span className="text-red-600 text-sm font-medium mb-1">Từ chối</span>
          <span className="text-3xl font-bold text-red-700">{rejectedRegistrations}</span>
        </div>
        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col">
          <span className="text-emerald-600 text-sm font-medium mb-1">Đã xác nhận nơi TT</span>
          <span className="text-3xl font-bold text-emerald-700">{confirmedFinalCount}</span>
        </div>
        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col">
          <span className="text-indigo-600 text-sm font-medium mb-1">TT ở trường</span>
          <span className="text-3xl font-bold text-indigo-700">{schoolInternshipCount}</span>
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
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center justify-center gap-1">Trạng thái {getSortIcon('status')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu.</td>
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

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Danh sách nơi thực tập chính thức</h3>
          <p className="text-xs text-slate-500 mt-1">Sinh viên tự xác nhận nơi đã trúng tuyển hoặc phương án thực tập tại trường.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Mã SV</th>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4">Loại</th>
                <th className="px-6 py-4">Nơi thực tập</th>
                <th className="px-6 py-4">GVHD tại trường</th>
                <th className="px-6 py-4">Thời gian xác nhận</th>
                <th className="px-6 py-4">Khóa</th>
              </tr>
            </thead>
            <tbody>
              {finalInternships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Chưa có sinh viên xác nhận nơi thực tập chính thức.</td>
                </tr>
              ) : (
                paginatedFinalInternships.map(item => (
                  <tr key={item.id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono">{item.student_id || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.student_name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${item.internship_type === 'school' ? 'bg-blue-100 text-blue-700' : item.internship_type === 'partner' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.internship_type === 'school' ? 'Tại trường' : item.internship_type === 'partner' ? 'Đối tác' : 'Công ty'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.company_name === 'Công ty khác' ? `Công ty khác: ${item.other_company_name || ''}` : (item.company_name || '-')}
                    </td>
                    <td className="px-6 py-4">{item.school_assignment_request ? 'Nhờ Khoa phân công' : (item.school_lecturer || '-')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.confirmed_at ? new Date(item.confirmed_at).toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-6 py-4">{item.locked_at ? <span className="text-emerald-700 font-semibold">Đã khóa</span> : <span className="text-slate-400">Chưa khóa</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={finalInternships.length}
          currentPage={finalInternshipPage}
          pageSize={finalInternshipPageSize}
          onPageChange={setFinalInternshipPage}
          label="nơi thực tập"
        />
      </div>
    </div>
  );
}

function AdvisorAssignmentAdmin({ token }: { token: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
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
      const res = await fetch(`${API_BASE}/api/admin/advisor-assignments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLecturers(Array.isArray(data.lecturers) ? data.lecturers : []);
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

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải phân công...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-emerald-600" /> Phân công giảng viên hướng dẫn</h2>
          <p className="text-sm text-slate-500 mt-1">Phân công trên danh sách sinh viên đã xác nhận nơi thực tập chính thức.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm sinh viên, nơi thực tập..." className="w-full sm:w-80 pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
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

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
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
      </div>
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
  const [creatingReminders, setCreatingReminders] = useState(false);
  const [sendingQueue, setSendingQueue] = useState(false);
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

  const sendQueued = async () => {
    if (!confirm('Gửi một lô email đang chờ theo giới hạn/ngày đã cấu hình?')) return;
    setSendingQueue(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/send-queued`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Gửi email đang chờ thất bại.');
      alert(`Đã gửi ${data.sent || 0}, lỗi ${data.failed || 0}. Còn quota hôm nay: ${data.remaining_today ?? '-'} email.`);
      fetchRows();
    } catch (e) {
      alert('Lỗi kết nối khi gửi hàng đợi.');
    } finally {
      setSendingQueue(false);
    }
  };

  const types = Array.from(new Set(rows.map(row => row.type).filter(Boolean))).sort();
  const filtered = rows.filter(row => {
    const term = searchTerm.trim().toLowerCase();
    const matchStatus = statusFilter ? row.status === statusFilter : true;
    const matchType = typeFilter ? row.type === typeFilter : true;
    const matchTerm = !term || row.recipient_email?.toLowerCase().includes(term) || row.subject?.toLowerCase().includes(term) || row.body?.toLowerCase().includes(term) || row.user_name?.toLowerCase().includes(term) || row.student_id?.toLowerCase().includes(term);
    return matchStatus && matchType && matchTerm;
  });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, rows.length]);
  const pagination = paginationBounds(filtered.length, currentPage, pageSize);
  const paginatedRows = filtered.slice((pagination.safePage - 1) * pageSize, pagination.safePage * pageSize);

  const exportXlsx = () => {
    const headers = ['STT', 'Người nhận', 'Loại', 'Tiêu đề', 'Nội dung', 'Trạng thái', 'Lỗi', 'Tạo lúc', 'Gửi lúc'];
    const data = filtered.map((row, idx) => [idx + 1, row.recipient_email, row.type, row.subject, row.body, row.status, row.error || '', row.created_at || '', row.sent_at || '']);
    saveXlsx('lich_su_thong_bao.xlsx', headers, data, 'Thông báo');
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải lịch sử thông báo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Clock className="text-amber-600" /> Lịch sử thông báo</h2>
          <p className="text-sm text-slate-500 mt-1">Ghi nhận email quan trọng và gửi theo lô để tránh vượt quota Brevo Free.</p>
          {stats && (
            <p className="text-xs text-slate-500 mt-1">
              Provider: <strong>{stats.provider}</strong> · Đã gửi hôm nay: <strong>{stats.sent_today}/{stats.daily_cap}</strong> · Đang chờ: <strong>{stats.statuses?.queued || 0}</strong> · Batch: <strong>{stats.batch_size}</strong>
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={sendQueued} disabled={sendingQueue || !stats?.statuses?.queued} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
            {sendingQueue ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} Gửi hàng đợi
          </button>
          <button onClick={createFinalConfirmationOpen} disabled={creatingReminders} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
            <CheckCircle2 size={16} /> Mở xác nhận
          </button>
          <button onClick={createFinalReportReminders} disabled={creatingReminders} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
            {creatingReminders ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />} Nhắc nộp báo cáo
          </button>
          <button onClick={exportXlsx} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm flex items-center gap-2 whitespace-nowrap">
            <Download size={16} /> Xuất XLSX
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm email, sinh viên, tiêu đề..." className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tất cả loại</option>
          {types.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tất cả trạng thái</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Người nhận</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Không có thông báo phù hợp.</td></tr>
              ) : paginatedRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{row.recipient_email}</div>
                    <div className="text-xs text-slate-500">{row.user_name || '-'} {row.student_id ? `· ${row.student_id}` : ''}</div>
                  </td>
                  <td className="px-4 py-4"><span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded">{row.type}</span></td>
                  <td className="px-4 py-4 max-w-xl">
                    <div className="font-semibold text-slate-800">{row.subject}</div>
                    <div className="text-xs text-slate-500 whitespace-pre-wrap mt-1">{row.body}</div>
                    <div className="text-xs text-slate-400 mt-2">{row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`font-semibold ${row.status === 'sent' ? 'text-emerald-700' : row.status === 'failed' ? 'text-red-700' : 'text-orange-700'}`}>{row.status}</div>
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
          total={filtered.length}
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

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
      result = result.filter(l => l.name?.toLowerCase().includes(lower) || l.email?.toLowerCase().includes(lower));
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
    const headers = ['STT', 'Họ và tên', 'Email'];
    const rows = filteredAndSorted.map((l, idx) => [idx + 1, l.name, l.email || '']);
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
      const imported: { name: string; email?: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const parts = rows[i];
        if (!parts.some(Boolean)) continue;
        // Detect format:
        // Format A: STT, Tên, Email  (3+ cols, col0 is a number)
        // Format B: Tên, Email        (2 cols)
        // Format C: Tên only          (1 col)
        // Skip header rows
        if (i === 0 && (parts[0].toLowerCase() === 'stt' || parts[0].toLowerCase() === 'họ và tên' || parts[0].toLowerCase() === 'tên')) continue;

        const isNumeric = (s: string) => /^\d+$/.test(s);

        let name = '';
        let email = '';

        if (parts.length >= 3 && isNumeric(parts[0])) {
          // Format A: STT, Tên, Email
          name = parts[1];
          email = parts[2];
        } else if (parts.length >= 2 && !isNumeric(parts[0]) && parts[1].includes('@')) {
          // Format B: Tên, Email
          name = parts[0];
          email = parts[1];
        } else if (parts.length >= 2 && isNumeric(parts[0])) {
          // Format A without email: STT, Tên
          name = parts[1];
        } else if (parts.length === 1) {
          // Format C: Tên only
          name = parts[0];
        }

        if (name) imported.push({ name, email: email || undefined });
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
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || undefined })
      });
      if (res.ok) {
        setNewName('');
        setNewEmail('');
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
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() || undefined })
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
          <p className="text-sm text-slate-500 mt-1">Danh sách giảng viên dùng để sinh viên chọn hướng dẫn.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo Tên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={override} disabled={importing} onChange={e => setOverride(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 disabled:opacity-60" />
            Ghi đè GV
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
              <th className="p-4 font-semibold whitespace-nowrap text-right w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-500">
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
                <td className="p-4 text-sm text-right flex items-center justify-end gap-2">
                  {editingId === l.id ? (
                    <>
                      <button onClick={() => handleUpdate(l.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" title="Lưu"><Save size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg transition-colors" title="Hủy"><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(l.id); setEditName(l.name); setEditEmail(l.email || ''); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Sửa"><Edit2 size={18} /></button>
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

  const exportXlsx = () => {
    const headers = ['STT', 'Loại', 'Tên doanh nghiệp', 'Chỉ tiêu', 'Ứng viên', 'Đã duyệt', 'Đã gửi DN', 'Email liên hệ', 'Người liên hệ', 'SĐT', 'Địa chỉ'];
    const rows = filteredAndSorted.map((c, idx) => [
      idx + 1,
      c.record_type === 'other' ? 'Tự liên hệ' : 'Danh sách chính thức',
      c.name,
      c.record_type === 'other' ? '' : c.slots,
      c.applicant_count ?? 0,
      c.approved_applicant_count ?? 0,
      c.sent_count ? `${c.sent_count}${c.last_sent_at ? ` (${new Date(c.last_sent_at).toLocaleString('vi-VN')})` : ''}` : '',
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
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'SĐT', 'Email cá nhân', 'Lớp KH', 'Mã môn học', 'Nơi thực tập', 'Vị trí', 'Liên hệ', 'Ghi chú', 'Trạng thái', 'Đã gửi DN', 'Thời gian đăng ký'];
    const rows = data.map((r, idx) => [
      idx + 1,
      r.student_id || '',
      r.student_name || '',
      r.dob || '',
      r.phone || '',
      r.personal_email || '',
      r.class_name || '',
      r.course_code || '',
      r.company_name === 'Công ty khác' ? (r.other_company_name || '') : (r.company_name || ''),
      r.company_name === 'Công ty khác' ? (r.other_company_role || '') : 'Thực tập sinh',
      r.company_name === 'Công ty khác' ? (r.other_company_contact || '') : (r.contact_email || ''),
      r.note || '',
      r.status === 'approved' ? 'Đã duyệt' : r.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
      r.sent_to_company_at ? new Date(r.sent_to_company_at).toLocaleString('vi-VN') : '',
      r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''
    ]);
    const safeName = (company.name || 'cong_ty').replace(/[^a-z0-9]+/gi, '_');
    saveXlsx(`dang_ky_${safeName}.xlsx`, headers, rows, 'Đăng ký');
  };

  const companyApplicantsXlsxData = (company: any, data: any[]) => {
    const headers = ['STT', 'Mã SV', 'Họ và tên', 'Ngày sinh', 'SĐT', 'Email cá nhân', 'Lớp KH', 'Mã môn học', 'Nơi thực tập', 'Vị trí', 'Liên hệ', 'Ghi chú'];
    const rows = data.map((r, idx) => [
      idx + 1,
      r.student_id || '',
      r.student_name || '',
      r.dob || '',
      r.phone || '',
      r.personal_email || '',
      r.class_name || '',
      r.course_code || '',
      r.company_name === 'Công ty khác' ? (r.other_company_name || '') : (r.company_name || company.name || ''),
      r.company_name === 'Công ty khác' ? (r.other_company_role || '') : 'Thực tập sinh',
      r.company_name === 'Công ty khác' ? (r.other_company_contact || '') : (r.contact_email || ''),
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
          alert(`Đã tạo file trong thư mục "${folder.name}" và bật quyền xem bằng link.`);
        } catch (e: any) {
          alert(e?.message || 'Không tạo được file Google Drive. Email sẽ được soạn không kèm link.');
        } finally {
          setMarkingSentKey(null);
        }
      }
    } else {
      alert('Chưa cấu hình VITE_GOOGLE_API_KEY nên hệ thống chưa mở được Google Drive Picker. Email sẽ được soạn sẵn; vui lòng tự đính kèm file XLSX hoặc link Drive.');
    }
    const subject = `Danh sách sinh viên đăng ký thực tập - ${company.name}`;
    const fullList = data.map((row: any, idx: number) =>
      `${idx + 1}. ${row.student_id || ''} - ${row.student_name || ''} - ${row.class_name || ''} - ${row.course_code || ''} - ${row.phone || ''} - ${row.personal_email || ''}${row.note ? ` - Ghi chú: ${row.note}` : ''}`
    ).join('\n');
    const listForUrl = fullList.length > 4500
      ? `${data.slice(0, 25).map((row: any, idx: number) => `${idx + 1}. ${row.student_id || ''} - ${row.student_name || ''} - ${row.class_name || ''} - ${row.course_code || ''}`).join('\n')}\n\n(Danh sách đầy đủ có ${data.length} sinh viên. Vui lòng đính kèm file XLSX đã xuất từ hệ thống hoặc link Google Drive.)`
      : fullList;
    const body = [
      'Kính gửi Quý Công ty,',
      '',
      `Khoa CNTT gửi danh sách sinh viên đăng ký thực tập tại ${company.name}.`,
      '',
      driveLink ? `Danh sách XLSX: ${driveLink}` : '',
      driveLink ? '' : '',
      listForUrl,
      '',
      'Trân trọng.',
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline text-sm mb-2 flex items-center gap-1">&larr; Quay lại Quản trị</button>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="text-orange-600" /> Quản lý Công ty</h2>
          <p className="text-sm text-slate-500 mt-1">Bao gồm công ty chính thức và công ty sinh viên tự liên hệ đã phát sinh đăng ký. Tổng: <strong>{companies.length}</strong></p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/admin/approved-companies')}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Shield size={16} /> Công ty thẩm định
          </button>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên, địa chỉ, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none whitespace-nowrap">
            <input type="checkbox" checked={override} disabled={importing} onChange={e => setOverride(e.target.checked)} className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 disabled:opacity-60" />
            Ghi đè
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
              <th className="p-3 font-semibold w-12">STT</th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>Tên doanh nghiệp<SortIcon col="name" /></th>
              <th className="p-3 font-semibold">Loại</th>
              <th className="p-3 font-semibold text-center cursor-pointer hover:bg-slate-100 w-20" onClick={() => handleSort('slots')}>Chỉ tiêu<SortIcon col="slots" /></th>
              <th className="p-3 font-semibold text-center cursor-pointer hover:bg-slate-100 w-20" onClick={() => handleSort('applicant_count')}>ƯV<SortIcon col="applicant_count" /></th>
              <th className="p-3 font-semibold text-center cursor-pointer hover:bg-slate-100 w-24" onClick={() => handleSort('approved_applicant_count')}>Đã duyệt<SortIcon col="approved_applicant_count" /></th>
              <th className="p-3 font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('last_sent_at')}>Gửi DN<SortIcon col="last_sent_at" /></th>
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
                <td className="p-3 text-slate-500">{(safeCurrentPage - 1) * pageSize + idx + 1}</td>
                {editingId === c.id && c.record_type !== 'other' ? (
                  <>
                    <td className="p-3"><input autoFocus value={editCompany.name} onChange={e => setEditCompany({ ...editCompany, name: e.target.value })} className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">Chính thức</span></td>
                    <td className="p-3"><input type="number" value={editCompany.slots} onChange={e => setEditCompany({ ...editCompany, slots: e.target.value })} className="w-16 border border-orange-400 rounded px-2 py-1 text-xs text-center focus:ring-1 focus:ring-orange-500" /></td>
                    <td className="p-3 text-center text-slate-500">{c.applicant_count ?? 0}</td>
                    <td className="p-3 text-center text-slate-500">{c.approved_applicant_count ?? 0}</td>
                    <td className="p-3 text-slate-500">{c.last_sent_at ? new Date(c.last_sent_at).toLocaleString('vi-VN') : 'Chưa gửi'}</td>
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
                    <td className="p-3 text-slate-600">{c.contact_email ? <a href={`mailto:${c.contact_email}`} className="text-blue-600 hover:underline">{c.contact_email}</a> : (extractEmails(c.contacts || '').length > 0 ? <span>{extractEmails(c.contacts || '').join(', ')}</span> : <span className="text-slate-300">—</span>)}</td>
                    <td className="p-3 text-slate-600">{c.contact_name || <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-slate-600">{c.phone || <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-slate-600 max-w-[200px] truncate" title={c.address || c.contacts}>{c.address || c.contacts || <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-right flex items-center justify-end gap-1">
                      <button onClick={() => exportApplicantsForCompany(c)} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors" title="Xuất danh sách đăng ký"><Download size={16} /></button>
                      <button onClick={() => composeCompanyEmail(c)} disabled={markingSentKey === (c.company_key || String(c.id || c.name))} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors disabled:opacity-50" title="Tạo link Drive và soạn email gửi DN">
                        {markingSentKey === (c.company_key || String(c.id || c.name)) ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
                      </button>
                      <button onClick={() => markCompanySent(c)} disabled={markingSentKey === (c.company_key || String(c.id || c.name))} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors disabled:opacity-50" title="Đánh dấu đã gửi DN">
                        {markingSentKey === (c.company_key || String(c.id || c.name)) ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      </button>
                      {c.record_type !== 'other' && (
                        <>
                          <button onClick={() => { setEditingId(c.id); setEditCompany({ name: c.name, slots: String(c.slots), contact_email: c.contact_email || '', address: c.address || '', phone: c.phone || '', contact_name: c.contact_name || '', recruitment_link: c.recruitment_link || '' }); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="Sửa"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(c.id, c.name)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Xóa"><Trash2 size={16} /></button>
                        </>
                      )}
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
  const [planContent, setPlanContent] = useState('');
  const [campaign, setCampaign] = useState({ year: '', registration_open_at: '', registration_close_at: '', classes_list: '' } as any);
  const [savingUrl, setSavingUrl] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importingDocx, setImportingDocx] = useState(false);
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
      setPlanContent(data.plan || '');
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

  const handleSavePlan = async () => {
    setSavingUrl(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/google-sheet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planContent })
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Đã lưu Kế hoạch triển khai thành công!');
    } catch (e) {
      alert('Lỗi khi lưu.');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      alert('Vui lòng chọn file .docx');
      return;
    }
    setImportingDocx(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      // Convert HTML -> Markdown via TurndownService
      const td = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
      });
      // Preserve tables
      td.addRule('strikethrough', {
        filter: ['del', 's'],
        replacement: (content: string) => `~~${content}~~`,
      });
      const markdown = td.turndown(html);
      setPlanContent(markdown);
    } catch (err: any) {
      alert('Không đọc được file Word: ' + err.message);
    } finally {
      setImportingDocx(false);
      e.target.value = '';
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Danh sách lớp khóa học <span className="text-slate-400 font-normal">(mỗi lớp cách nhau bởi dấu phẩy)</span></label>
            <textarea value={campaign.classes_list || ''} onChange={e => setCampaign({ ...campaign, classes_list: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" rows={2} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Quy định đăng ký hiển thị cho sinh viên <span className="text-slate-400 font-normal">(mỗi dòng là một gạch đầu dòng)</span></label>
            <textarea
              value={(campaign as any).registration_rules_md || DEFAULT_REGISTRATION_RULES}
              onChange={e => setCampaign({ ...campaign, registration_rules_md: e.target.value } as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              rows={8}
            />
          </div>
          <p className="md:col-span-2 text-xs text-slate-500">Sinh viên chỉ có thể đăng ký trong khoảng thời gian trên. Để trống nếu không giới hạn thời gian.</p>
          {((campaign as any).registration_open_at || (campaign as any).registration_close_at) && (
            <div className={`md:col-span-2 p-3 rounded-lg text-sm flex items-center gap-2 ${(() => {
              const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
              const now = new Date();
              const open = toUTC((campaign as any).registration_open_at);
              const close = toUTC((campaign as any).registration_close_at);
              if (open && now < open) return 'bg-orange-50 border border-orange-200 text-orange-800';
              if (close && now > close) return 'bg-red-50 border border-red-200 text-red-800';
              return 'bg-green-50 border border-green-200 text-green-800';
            })()
              }`}>
              <Clock size={16} className="shrink-0" />
              <span>Trạng thái hiện tại: {(() => {
                const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
                const now = new Date();
                const open = toUTC((campaign as any).registration_open_at);
                const close = toUTC((campaign as any).registration_close_at);
                if (open && now < open) return <strong>Chưa mở</strong>;
                if (close && now > close) return <strong>Đã đóng</strong>;
                return <strong>Đang mở</strong>;
              })()}</span>
            </div>
          )}
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

          <div className="pt-4 border-t border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung Kế hoạch triển khai (Markdown)</label>
            <div className="mb-2 flex items-center gap-2">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors shadow-sm border ${importingDocx
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
              <span className="text-xs text-slate-400">Nội dung file Word sẽ được tự động chuyển thành Markdown</span>
            </div>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono h-96"
              value={planContent}
              onChange={(e) => setPlanContent(e.target.value)}
              placeholder="Nhập nội dung kế hoạch triển khai bằng Markdown..."
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSavePlan}
                disabled={savingUrl}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70 shadow-sm transition-colors"
              >
                <Save size={18} /> {savingUrl ? 'Đang lưu...' : 'Lưu Kế hoạch'}
              </button>
            </div>
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

function CompanyDetail({ token }: { token: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/companies/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setCompany(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [id, token]);

  if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">Đang tải dữ liệu...</div>;
  if (!company || company.error) return <div className="text-center py-20 text-red-500">Không tìm thấy công ty!</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">
        &larr; Quay lại
      </button>
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-slate-100 opacity-50 pointer-events-none">
          <Building2 size={120} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{company.name}</h1>
          <p className="text-lg text-slate-600 mb-4">{company.description}</p>

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

function PlanView() {
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
      <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm mb-2 block flex items-center gap-1">&larr; Quay lại trang chủ</button>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (không thể thay đổi)</label>
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
                      <li key={reg.id} className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-blue-900">
                          <strong>NV{idx + 1}:</strong> {reg.company_name === 'Công ty khác' ? `(Khác) ${reg.other_company_name || ''}` : reg.company_name}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded w-fit ${reg.status === 'approved' ? 'bg-green-100 text-green-700' : reg.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}
                        </span>
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
  const [importMessage, setImportMessage] = useState('');
  const [override, setOverride] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

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

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600" /> CSDL Sinh viên</h2>
          <p className="text-sm text-slate-500 mt-1">Danh sách sinh viên dùng để tự động điền thông tin khi đăng nhập.</p>
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
            ) : paginatedStudents.map((s, idx) => (
              <tr key={s.student_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-sm text-slate-600">{(pagination.safePage - 1) * pageSize + idx + 1}</td>
                <td className="p-4 text-sm font-mono text-slate-800 font-medium">{s.student_id}</td>
                <td className="p-4 text-sm text-slate-800">{s.name}</td>
                <td className="p-4 text-sm text-slate-600">{s.dob}</td>
                <td className="p-4 text-sm text-slate-600">{s.phone || '-'}</td>
                <td className="p-4 text-sm text-slate-600">{s.personal_email ? <a href={`mailto:${s.personal_email}`} className="text-blue-600 hover:underline">{s.personal_email}</a> : '-'}</td>
                <td className="p-4 text-sm text-slate-600">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-medium">{s.class_name}</span>
                </td>
                <td className="p-4 text-sm text-right">
                  <button onClick={() => handleDelete(s.student_id || `user:${s.id}`)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors tooltip" title="Xóa">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
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
