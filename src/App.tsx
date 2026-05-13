import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ReactMarkdown from 'react-markdown';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, CheckCircle2, Download, LogIn, LayoutDashboard, ArrowUpDown, Search, AlertTriangle, ChevronRight, Building2, RefreshCw, Save, Plus, Trash2, X } from 'lucide-react';

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '109463395923-mock.apps.googleusercontent.com';
const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';

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
      <BrowserRouter basename={import.meta.env.BASE_URL}>
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
                  Hệ thống đăng ký Thực tập chuyên ngành.<br />
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
                <Route path="/" element={<Dashboard user={user} token={token} />} />
                <Route path="/admin" element={user.role === 'admin' ? <AdminPanel token={token} /> : <Navigate to="/" />} />
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
            <p>Hỗ trợ: fit@vnu.edu.vn</p>
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
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

function Dashboard({ user, token }: { user: any, token: string }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>({ year: '2026', start: '22/05/2026', end: '15/06/2026' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [itCompanyList, setItCompanyList] = useState<string[]>([]);
  const [lecturers, setLecturers] = useState<string[]>([]);
  const studentIdFromEmail = user?.email?.split('@')[0] || '';
  const [registerForm, setRegisterForm] = useState<any>({
    student_id: user?.student_id || studentIdFromEmail,
    dob: user?.dob || '',
    class_name: user?.class_name || '',
    course_code: '',
    school_lecturer: '',
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

  const khacCompany = companies.find(c => c.name === 'Khác');
  const hasSelectedKhac = khacCompany && selectedCompanies.has(khacCompany.id);

  const schoolCompany = companies.find(c => c.name === 'Thực tập ở trường');
  const hasSelectedSchool = schoolCompany && selectedCompanies.has(schoolCompany.id);

  const toggleCompanySelection = (companyId: number) => {
    setSelectedCompanies(prev => {
      const next = new Set(prev);
      const isSchool = schoolCompany && companyId === schoolCompany.id;
      const hasSchool = schoolCompany && prev.has(schoolCompany.id);

      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        if (isSchool) {
          alert("Lưu ý: Khi đăng ký Thực tập ở trường, bạn sẽ không được đăng ký thêm công ty nào khác.");
          return new Set([companyId]);
        }
        if (hasSchool) {
          alert("Bạn đã chọn Thực tập ở trường nên không thể chọn thêm công ty ngoài.");
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
      const [compRes, regRes, campRes, itListRes, lecRes] = await Promise.all([
        fetch(`${API_BASE}/api/companies`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/registrations/my`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/settings/campaign`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/companies/it-list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/lecturers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const compData = await compRes.json();
      setCompanies(Array.isArray(compData) ? compData : []);

      const regData = await regRes.json();
      setMyRegs(Array.isArray(regData) ? regData : []);

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

  const submitRegister = async (e: any) => {
    e.preventDefault();
    if (selectedCompanies.size === 0) return;

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
          school_lecturer: registerForm.school_lecturer,
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
        setRegisterModalOpen(false);
        setSelectedCompanies(new Set());
        setRegisterForm({ student_id: studentIdFromEmail, dob: '', class_name: '', course_code: '', school_lecturer: '', note: '' });
        setOtherCompanies([{ name: '', role: '', contact_name: '', contact_phone: '', contact_email: '' }]);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Đăng ký lỗi!");
    }
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

  if (loading) return <div className="text-center py-20 animate-pulse text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Sidebar Info */}
      <div className="col-span-1 lg:col-span-3 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Trạng thái Hệ thống</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold text-green-700">Đang mở đăng ký</span>
          </div>
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Bắt đầu:</span>
              <span className="font-medium">{campaign.start}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Kết thúc:</span>
              <span className="font-medium">{campaign.end}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#004a99] text-white rounded-2xl p-5 shadow-md flex-1">
          <h2 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-4">Quy định Đăng ký</h2>
          <ul className="text-sm space-y-3">
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Chỉ dành cho sinh viên nhận được thông báo.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Mỗi sinh viên chọn tối đa <strong>05</strong> công ty.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Sinh viên có thể lựa chọn các công ty không có trong Danh sách (các công ty đăng ký tiếp nhận thực tập sinh chính thức với Khoa). Nếu công ty đó có trong danh sách các công ty đã được Khoa thẩm định chất lượng thì sẽ được phê duyệt tự động. Ngược lại, công ty đó sẽ được Khoa xem xét và phê duyệt sau.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Sinh viên có nhu cầu Thực tập tại trường có thể đăng ký Nơi thực tập là <strong>Trường Đại học Công nghệ</strong>, lưu ý phải tìm và được sự đồng ý hướng dẫn của Giảng viên Khoa CNTT.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">•</span>
              <span>Sinh viên có thể thay đổi đăng ký bằng cách chọn <strong>"Huỷ tất cả đăng ký"</strong> và đăng ký lại từ đầu trong thời gian Khoa mở đăng ký.</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="col-span-1 lg:col-span-9 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Thực tập chuyên ngành {campaign.year}</h2>
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
                <LayoutDashboard size={14} /> QUẢN TRỊ ADMIN
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
                    <li key={reg.id}>NV{idx + 1}: <strong>{reg.company_name === 'Khác' ? `(Khác) ${reg.other_company_name || ''}` : reg.company_name}</strong> — <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${reg.status === 'approved' ? 'bg-green-100 text-green-700' : reg.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}</span></li>
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
            Bạn chưa đăng ký công ty nào. Vui lòng chọn tối đa 5 công ty từ danh sách dưới đây rồi bấm <strong>Đăng ký</strong>.
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
                <button
                  disabled={selectedCompanies.size === 0}
                  onClick={() => setRegisterModalOpen(true)}
                  className={`px-5 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors whitespace-nowrap ${selectedCompanies.size === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Đăng ký ({selectedCompanies.size})
                </button>
              )}
            </div>
          </div>

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
                {sortedCompanies.map((company) => {
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
                          {company.name === 'Khác' ? 'Không giới hạn' : company.slots}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[11px] text-slate-500 font-bold">
                          {company.name === 'Khác' ? '—' : (company.applicant_count ?? 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredCompanies.length === 0 && !loading && (
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
                Vẫn Hủy Đăng Ký
              </button>
            </div>
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
                <input required readOnly type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={registerForm.student_id} onChange={e => setRegisterForm({ ...registerForm, student_id: e.target.value })} placeholder="VD: 20021234" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày sinh *</label>
                <input required type="text" placeholder="VD: 15/08/2004" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={registerForm.dob} onChange={e => setRegisterForm({ ...registerForm, dob: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lớp khóa học *</label>
                <select required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={registerForm.class_name} onChange={e => setRegisterForm({ ...registerForm, class_name: e.target.value })}>
                  <option value="">-- Chọn lớp khóa học --</option>
                  <option value="QH-2023-I/CQ-I-IT1">QH-2023-I/CQ-I-IT1</option>
                  <option value="QH-2023-I/CQ-I-IT2">QH-2023-I/CQ-I-IT2</option>
                  <option value="QH-2023-I/CQ-I-IT3">QH-2023-I/CQ-I-IT3</option>
                  <option value="QH-2023-I/CQ-I-IS">QH-2023-I/CQ-I-IS</option>
                  <option value="QH-2023-I/CQ-I-CS1">QH-2023-I/CQ-I-CS1</option>
                  <option value="QH-2023-I/CQ-I-CS2">QH-2023-I/CQ-I-CS2</option>
                  <option value="QH-2023-I/CQ-I-CS3">QH-2023-I/CQ-I-CS3</option>
                  <option value="QH-2023-I/CQ-I-CS4">QH-2023-I/CQ-I-CS4</option>
                  <option value="QH-2023-I/CQ-I-CN">QH-2023-I/CQ-I-CN</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Học phần thực tập *</label>
                <select required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={registerForm.course_code} onChange={e => setRegisterForm({ ...registerForm, course_code: e.target.value })}>
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
                    <h4 className="text-sm font-bold text-blue-800">Thông tin Thực tập ở trường</h4>
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
                          <input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={otherCompany.contact_phone} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, contact_phone: e.target.value } : c))} placeholder="0987654321" />
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
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
                  Xác nhận đăng ký
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (e) { }
    setLoading(false);
  };

  const handleExport = async () => {
    window.location.href = `${API_BASE}/api/admin/export.csv?token=${token}`;
  };

  const handleSaveToGoogleSheets = async () => {
    if (!confirm('Hệ thống sẽ ghi đè toàn bộ dữ liệu hiện tại lên Google Sheets. Bạn có chắc chắn?')) return;
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

  const filteredRegistrations = sortedRegistrations.filter(reg => {
    const term = searchTerm.toLowerCase();
    return (
      (reg.student_name || '').toLowerCase().includes(term) ||
      (reg.email || '').toLowerCase().includes(term) ||
      (reg.company_name || '').toLowerCase().includes(term) ||
      (reg.student_id || '').toLowerCase().includes(term) ||
      (reg.class_name || '').toLowerCase().includes(term)
    );
  });

  const totalRegistrations = registrations.length;
  const pendingRegistrations = registrations.filter(r => r.status === 'pending').length;
  const approvedRegistrations = registrations.filter(r => r.status === 'approved').length;
  const rejectedRegistrations = registrations.filter(r => r.status === 'rejected').length;

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm mb-2 block">&larr; Quay lại trang chủ</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm sinh viên, công ty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
            />
          </div>
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap"
          >
            <CheckCircle2 size={18} /> Duyệt tất cả
          </button>
          <button
            onClick={() => navigate('/admin/settings')}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 shadow-sm transition-colors whitespace-nowrap"
          >
            <AlertTriangle size={18} /> Cài đặt hệ thống
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm transition-colors whitespace-nowrap"
          >
            <Download size={18} /> Xuất CSV
          </button>
          <button
            onClick={handleSaveToGoogleSheets}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap"
          >
            <Download size={18} /> Lưu vào Google Sheets
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-slate-500 text-sm font-medium mb-1">Tổng đăng ký</span>
          <span className="text-3xl font-bold text-slate-800">{totalRegistrations}</span>
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
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center justify-center gap-1">Trạng thái {getSortIcon('status')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu.</td>
                </tr>
              ) : (
                filteredRegistrations.map(reg => (
                  <tr key={reg.registration_id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">{reg.student_id || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{reg.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{reg.dob ? new Date(reg.dob).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-6 py-4">{reg.class_name || '-'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{reg.course_code?.split(' ').pop() || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {reg.company_name === 'Khác' ? ('Công ty khác: ' + (reg.other_company_name || '')) : reg.company_name === 'Thực tập ở trường' ? 'Trường Đại học Công nghệ' : reg.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {reg.company_name === 'Khác' ? (
                        <div className="text-xs text-gray-600 font-normal leading-relaxed">
                          <span className="inline-block font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded mb-1 border border-blue-100">Tự liên hệ</span><br />
                          <span className="font-semibold text-gray-700">Vị trí:</span> {reg.other_company_role} <br />
                          <span className="font-semibold text-gray-700">Liên hệ:</span> {reg.other_company_contact}
                          {reg.note && <><br /><span className="font-semibold text-gray-700">Lưu ý thêm:</span> {reg.note}</>}
                        </div>
                      ) : reg.company_name === 'Thực tập ở trường' ? (
                        <div className="text-xs text-gray-600 font-normal leading-relaxed">
                          <span className="font-semibold text-gray-700">GVHD:</span> {reg.other_company_contact}
                          {reg.note && <><br /><span className="font-semibold text-gray-700">Ghi chú:</span> {reg.note}</>}
                        </div>
                      ) : (
                        reg.note
                      )}
                    </td>
                    <td className="px-6 py-4">{new Date(reg.created_at).toLocaleString('vi-VN')}</td>
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
      </div>
    </div>
  );
}

function AdminSettings({ token }: { token: string }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [exportSheetUrl, setExportSheetUrl] = useState('');
  const [planContent, setPlanContent] = useState('');
  const [campaign, setCampaign] = useState({ year: '', start: '', end: '' });
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins`, { headers: { Authorization: `Bearer ${token}` } });
      setAdmins(await res.json());
    } catch (e) { }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.endsWith('@vnu.edu.vn')) {
      alert('Vui lòng nhập email @vnu.edu.vn hợp lệ');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: newAdminEmail.trim() })
      });
      if (res.ok) {
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        const error = await res.json();
        alert(error.error || 'Lỗi khi thêm admin');
      }
    } catch (e) {
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
        const error = await res.json();
        alert(error.error || 'Lỗi khi xóa admin');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    }
  };

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

  const handleSyncCompanies = async () => {
    if (!confirm('Bạn có chắc chắn muốn đồng bộ danh sách công ty từ Google Sheet? Hành động này sẽ xoá danh sách công ty hiện tại và danh sách sinh viên đã đăng ký.')) return;

    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/import-companies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Đã đồng bộ thành công ${data.count} công ty.`);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Năm học / Khóa</label>
            <input type="text" value={campaign.year} onChange={e => setCampaign({ ...campaign, year: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian bắt đầu</label>
            <input type="date" value={campaign.start} onChange={e => setCampaign({ ...campaign, start: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian kết thúc</label>
            <input type="date" value={campaign.end} onChange={e => setCampaign({ ...campaign, end: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
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
              <p className="text-xs">Hành động này sẽ cập nhật lại toàn bộ danh sách công ty và xóa đăng ký hiện tại.</p>
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
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono h-48"
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

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">Quản lý Quản trị viên (Admin)</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thêm Admin (Email @vnu.edu.vn)</label>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="VD: nguyenvanan@vnu.edu.vn"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <button
                onClick={handleAddAdmin}
                className="flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 shadow-sm transition-colors"
              >
                <Plus size={18} /> Thêm Admin
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-2 mx-[-24px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="font-semibold p-4 pl-6 border-b border-slate-200">Email</th>
                  <th className="font-semibold p-4 border-b border-slate-200">Họ và tên</th>
                  <th className="font-semibold p-4 pr-6 border-b border-slate-200 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {admins.map(admin => (
                  <tr key={admin.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-medium text-slate-800">{admin.email}</td>
                    <td className="p-4 text-slate-600">{admin.name || 'Chưa cập nhật'}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors"
                        title="Xóa quyền admin"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-slate-500">Chưa có admin nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 text-blue-800 p-5 rounded-xl text-sm leading-relaxed border border-blue-100">
        <strong className="block mb-2 text-base">💡 Mẹo nhập dữ liệu vào Google Sheets:</strong>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Từ danh sách Quản trị &gt; Bấm <strong>Lưu vào Google Sheets</strong> để tải file dữ liệu CSV về máy.</li>
          <li>Trên trang web Google Sheets, tạo một Bảng tính trống mới.</li>
          <li>Chọn <strong>Tệp (File) &gt; Nhập (Import) &gt; Tải lên (Upload)</strong> và tải lên file CSV ở bước 1. Dữ liệu sẽ chia cột tự động.</li>
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
                  <span className="font-medium text-slate-800">{company.slots} sinh viên (Còn lại: {company.remaining_slots !== undefined ? Math.max(0, company.remaining_slots) : company.slots})</span>
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
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-800 mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-6 mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-slate-600 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 text-slate-600 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
              a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
            }}
          >
            {plan}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function Profile({ user, setUser, token }: { user: any, setUser: any, token: string }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    student_id: user?.student_id || user?.email?.split('@')[0] || '',
    dob: user?.dob || '',
    class_name: user?.class_name || ''
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Cập nhật hồ sơ thành công!');
        navigate('/');
      } else {
        alert('Có lỗi xảy ra khi cập nhật hồ sơ.');
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
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><UserIcon className="text-blue-600" /> Cập nhật Hồ sơ cá nhân</h2>
        
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            {user.picture ? (
              <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[#004a99] font-bold shadow-sm"><UserIcon size={24} /></div>
            )}
            <div>
              <p className="font-semibold text-slate-800 text-lg">{user.email}</p>
              <p className="text-xs text-slate-500 bg-slate-200 inline-block px-2 py-0.5 rounded-full mt-1 uppercase tracking-wider font-medium">{user.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã sinh viên <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.student_id}
                onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh (DD/MM/YYYY) <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="Ví dụ: 15/08/2004"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lớp khóa học <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="Ví dụ: K66CC"
                value={formData.class_name}
                onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>
          
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

export default App;
