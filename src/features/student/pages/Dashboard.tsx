import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, CheckCircle2, Download, LayoutDashboard, ArrowUpDown, AlertTriangle, ChevronRight, RefreshCw, Save, Plus, Trash2, X, ChevronDown, FileText, Edit2, Clock, Send, Lock, ClipboardList, UserCheck, FileCheck } from 'lucide-react';
import { saveAs } from 'file-saver';
import { API_BASE, DEFAULT_REGISTRATION_RULES, RegistrationRulesMarkdown, companyDescriptionText, isAuthExpiredResponse, CACHE_TTL, cachedJsonFetch, PaginationControls } from '../../../shared';

export function Dashboard({ user, setUser, token, onAuthExpired }: { user: any, setUser: any, token: string, onAuthExpired: () => void }) {
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
  const [showRegistrationDetails, setShowRegistrationDetails] = useState(false);
  const [showConfirmationDetails, setShowConfirmationDetails] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
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
    contact_email: '',
    note: ''
  }]);
  const [advisorRequestForm, setAdvisorRequestForm] = useState({
    request_type: '',
    lecturer_name: '',
    co_lecturer_name: '',
    student_note: ''
  });
  const navigate = useNavigate();

  const hasRegistered = myRegs.length > 0;
  const primaryAdvisor = myAdvisors.find((advisor: any) => advisor.role === 'primary') || null;

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
    if (!openStr && !closeStr) return 'unconfigured';
    const toUTC = (s: string) => s ? new Date(s + ':00+07:00') : null;
    const now = new Date();
    const openUTC = openStr ? toUTC(openStr) : null;
    const closeUTC = closeStr ? toUTC(closeStr) : null;
    if (openUTC && now < openUTC) return 'not_open_yet';
    if (closeUTC && now > closeUTC) return 'closed';
    return 'open';
  }, [campaign]);
  const canEditAdvisorRequest = advisorRequestWindowStatus === 'open';

  const finalReportWindowStatus = useMemo(() => {
    const openStr = campaign?.final_report_open_at;
    const closeStr = campaign?.final_report_close_at;
    if (!openStr && !closeStr) return 'unconfigured';
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

  const startEditingPreferences = () => {
    const selectedIds = new Set<number>();
    const existingOtherCompanies: any[] = [];
    myRegs.forEach((reg: any) => {
      if (reg.company_name === 'Công ty khác' && khacCompany) {
        selectedIds.add(khacCompany.id);
        const contactParts = String(reg.other_company_contact || '').split(' - ');
        existingOtherCompanies.push({
          id: reg.id,
          name: reg.other_company_name || '',
          role: reg.other_company_role || '',
          contact_name: contactParts[0] || '',
          contact_phone: contactParts[1] || '',
          contact_email: contactParts.slice(2).join(' - ') || '',
          note: reg.note || ''
        });
      } else if (reg.company_id) {
        selectedIds.add(Number(reg.company_id));
      }
    });
    setSelectedCompanies(selectedIds);
    if (existingOtherCompanies.length > 0) {
      setOtherCompanies(existingOtherCompanies);
    } else {
      setOtherCompanies([{ name: '', role: '', contact_name: '', contact_phone: '', contact_email: '', note: '' }]);
    }
    setRegisterForm((prev: any) => ({ ...prev, note: '' }));
    setEditingPreferences(true);
  };

  const cancelEditingPreferences = () => {
    setSelectedCompanies(new Set());
    setOtherCompanies([{ name: '', role: '', contact_name: '', contact_phone: '', contact_email: '', note: '' }]);
    setEditingPreferences(false);
  };

  const savePreferenceEdits = async () => {
    if (savingPreferences) return;
    if (registrationWindowStatus !== 'open') {
      alert('Chỉ được sửa nguyện vọng trong thời gian Khoa mở đăng ký.');
      return;
    }
    if (selectedWishCount === 0) {
      alert('Vui lòng giữ ít nhất 1 nguyện vọng.');
      return;
    }
    if (selectedWishCount > 5) {
      alert('Sinh viên chỉ được chọn tối đa 5 nơi thực tập.');
      return;
    }
    const compactName = (value: string) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const seenCompanyIds = new Set<string>();
    const seenOtherNames = new Set<string>();
    const seenAllNames = new Set<string>();
    for (const companyId of Array.from(selectedCompanies)) {
      if (khacCompany && companyId === khacCompany.id) {
        for (const item of otherCompanies) {
          const name = String(item.name || '').trim();
          const role = String(item.role || '').trim();
          const contactName = String(item.contact_name || '').trim();
          const contactPhone = String(item.contact_phone || '').trim();
          const contactEmail = String(item.contact_email || '').trim();
          const contact = [item.contact_name, item.contact_phone, item.contact_email].map(v => String(v || '').trim()).filter(Boolean).join(' - ');
          if (!name || !role || !contactName || !contactPhone || !contactEmail || !contact) {
            alert('Vui lòng nhập đầy đủ tên công ty, vị trí và thông tin liên hệ cho các nguyện vọng tự liên hệ.');
            return;
          }
          const normalizedName = compactName(name);
          if (seenAllNames.has(normalizedName)) {
            alert(`Danh sách nguyện vọng bị trùng nơi thực tập "${name}".`);
            return;
          }
          seenAllNames.add(normalizedName);
          if (seenOtherNames.has(normalizedName)) {
            alert(`Nguyện vọng tự liên hệ bị trùng công ty "${name}".`);
            return;
          }
          seenOtherNames.add(normalizedName);
        }
      } else {
        const company = companies.find(c => Number(c.id) === Number(companyId));
        const companyName = company?.name || '';
        const companyIdText = String(companyId);
        if (!companyIdText || !company) {
          alert('Vui lòng chọn công ty hợp lệ cho tất cả nguyện vọng.');
          return;
        }
        if (seenCompanyIds.has(companyIdText)) {
          alert('Danh sách nguyện vọng có công ty bị chọn trùng.');
          return;
        }
        seenCompanyIds.add(companyIdText);
        const normalizedName = compactName(companyName);
        if (seenAllNames.has(normalizedName)) {
          alert(`Danh sách nguyện vọng bị trùng nơi thực tập "${companyName}".`);
          return;
        }
        seenAllNames.add(normalizedName);
      }
    }
    if (schoolCompany && selectedCompanies.has(schoolCompany.id) && selectedWishCount > 1) {
      alert('Nếu chọn Trường Đại học Công nghệ, sinh viên không được chọn thêm nơi thực tập khác.');
      return;
    }
    const accepted = window.confirm('Sinh viên chỉ được phép xác nhận thực tập tại 1 trong 5 nơi này. Nếu không pass tất cả, sẽ phải thực tập ở Trường.\n\nBạn chắc chắn muốn lưu thay đổi nguyện vọng?');
    if (!accepted) return;

    setSavingPreferences(true);
    try {
      const existingByCompanyId = new Map<number, any>(myRegs.filter((reg: any) => reg.company_name !== 'Công ty khác').map((reg: any) => [Number(reg.company_id), reg]));
      const payload = Array.from(selectedCompanies).flatMap((companyId) => {
        if (khacCompany && companyId === khacCompany.id) {
          return otherCompanies.map((c: any) => ({
            id: c.id || null,
            type: 'other',
            company_id: null,
            name: c.name,
            role: c.role,
            contact: [c.contact_name, c.contact_phone, c.contact_email].map(v => String(v || '').trim()).filter(Boolean).join(' - '),
            note: c.note || registerForm.note || '',
          }));
        }
        const existing = existingByCompanyId.get(Number(companyId));
        return [{
          id: existing?.id || null,
          type: 'company',
          company_id: Number(companyId),
          name: '',
          role: '',
          contact: '',
          note: existing?.note || registerForm.note || '',
        }];
      });
      const res = await fetch(`${API_BASE}/api/registrations/my/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Không thể cập nhật nguyện vọng.');
        return;
      }
      const rows = data.registrations || [];
      setMyRegs(rows);
      setEditingPreferences(false);
      setSelectedCompanies(new Set());
      setOtherCompanies([{ name: '', role: '', contact_name: '', contact_phone: '', contact_email: '', note: '' }]);
      await fetchData();
      alert('Đã cập nhật nguyện vọng.');
    } catch (err) {
      alert('Lỗi kết nối khi cập nhật nguyện vọng.');
    } finally {
      setSavingPreferences(false);
    }
  };

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
      const authHeaders = { Authorization: `Bearer ${token}` };
      const [compData, regRes, finalRes, advisorRes, advisorReqRes, reportRes, campData, itListData, lecData] = await Promise.all([
        cachedJsonFetch<any[]>(`${API_BASE}/api/companies`, {
          cacheKey: 'companies',
          ttlMs: CACHE_TTL.companies,
          headers: authHeaders,
          onAuthExpired,
        }),
        isStudent ? fetch(`${API_BASE}/api/registrations/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/internships/final/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/advisor/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/advisor/request/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        isStudent ? fetch(`${API_BASE}/api/reports/final/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        cachedJsonFetch<any>(`${API_BASE}/api/settings/campaign`, {
          cacheKey: 'settings:campaign',
          ttlMs: CACHE_TTL.campaign,
          headers: authHeaders,
          onAuthExpired,
        }),
        cachedJsonFetch<any[]>(`${API_BASE}/api/companies/it-list`, {
          cacheKey: 'companies:it-list:approved',
          ttlMs: CACHE_TTL.companies,
          headers: authHeaders,
          onAuthExpired,
        }),
        cachedJsonFetch<any[]>(`${API_BASE}/api/lecturers`, {
          cacheKey: 'lecturers:names',
          ttlMs: CACHE_TTL.lecturers,
          headers: authHeaders,
          onAuthExpired,
        })
      ]);

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

      if (campData && !campData.error) {
        setCampaign(campData);
      }

      setItCompanyList(Array.isArray(itListData) ? itListData : []);
      setLecturers(Array.isArray(lecData) ? lecData : []);
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
                contact: `${c.contact_name} - ${c.contact_phone} - ${c.contact_email}`,
                note: c.note || ''
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
          ...(canEditAdvisorRequest && advisorRequestForm.request_type ? {
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
            contact: `${c.contact_name} - ${c.contact_phone} - ${c.contact_email}`,
            note: c.note || ''
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
        setOtherCompanies([{ name: '', role: '', contact_name: '', contact_phone: '', contact_email: '', note: '' }]);
        if (data.advisor_warning) alert(data.advisor_warning);
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
    if (!canEditAdvisorRequest) {
      alert('Ngoài thời gian đăng ký Giảng viên hướng dẫn.');
      return;
    }
    if (advisorRequestForm.request_type !== 'agreed') {
      alert('Chỉ đăng ký GVHD khi sinh viên đã liên hệ và được giảng viên đồng ý hướng dẫn. Nếu chưa có GVHD, Khoa sẽ phân công sau.');
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
      if (!res.ok) return alert(data.error || 'Không gửi được đăng ký GVHD.');
      setAdvisorRequest(data.request || null);
      setIsAdvisorEditOpen(false);
      alert(data.warning || 'Đã ghi nhận đăng ký GVHD.');
      fetchData();
    } catch (e) {
      alert('Lỗi kết nối khi gửi đăng ký GVHD.');
    } finally {
      setAdvisorRequestSaving(false);
    }
  };

  const cancelAdvisorRequest = async () => {
    if (advisorRequestSaving) return;
    if (!canEditAdvisorRequest) return alert('Ngoài thời gian đăng ký Giảng viên hướng dẫn.');
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
    setFinalSchoolLecturer(mode === 'school' && primaryAdvisor ? String(primaryAdvisor.lecturer_name || '') : '');
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
      if (data.advisor_warning) alert(data.advisor_warning);
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
  const showRegistrationTask = activeCampaignKey === 'registration' || registrationWindowStatus === 'open';
  const showConfirmationTask = activeCampaignKey === 'confirmation' && hasRegistered;
  const showAdvisorTask = advisorRequestWindowStatus === 'open' && hasRegistered;
  const showFinalReportTask = false;
  const showCompanyList = registrationWindowStatus === 'open' && (!hasRegistered || editingPreferences);
  const showConfirmationBlock = hasRegistered && showConfirmationDetails;
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
        : advisorRequest.lecturer_name || advisorRequest.lecturer_name_text || 'Đã gửi đăng ký GVHD'
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

        <details className="group bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 select-none focus:outline-none">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Quy định Đăng ký</span>
            <ChevronDown size={18} className="text-slate-400 transition-transform group-open:rotate-180 group-open:text-slate-800" />
          </summary>
          <div className="px-5 pb-5 border-t border-slate-100/80 pt-4 text-slate-700 text-xs leading-relaxed max-h-[400px] overflow-y-auto">
            {registrationRulesMarkdown.trim()
              ? <RegistrationRulesMarkdown content={registrationRulesMarkdown} />
              : <p className="text-sm text-slate-400 italic">Chưa có quy định nào.</p>}
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
              className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-100/70 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Kế hoạch triển khai
            </button>
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => navigate('/admin')}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LayoutDashboard size={14} /> Danh sách đăng ký
                </button>
                <button
                  onClick={() => navigate('/admin/final-internships')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Danh sách xác nhận thực tập
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => hasRegistered && setShowRegistrationDetails(prev => !prev)}
            disabled={!hasRegistered}
            className={`rounded-2xl border p-5 text-left transition-all duration-300 bg-white border-slate-200/70 shadow-sm hover:shadow-md ${hasRegistered ? 'cursor-pointer hover:border-slate-300' : 'cursor-default'} ${showRegistrationTask || showRegistrationDetails ? 'border-t-4 border-t-blue-600 border-x-slate-200/50 border-b-slate-200/50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Đăng ký thực tập</div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <ClipboardList size={15} />
              </div>
            </div>
            <div className="mt-2.5 text-sm font-bold text-slate-800">{registrationSummary}</div>
            {hasRegistered && <div className="mt-1 text-xs text-slate-500">Ngày ghi nhận: {new Date(myRegs[0].created_at).toLocaleDateString('vi-VN')}</div>}
            {hasRegistered && <div className="mt-3 text-xs font-bold text-blue-600 inline-flex items-center gap-1">{showRegistrationDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}</div>}
          </button>

          <button
            type="button"
            onClick={() => hasRegistered && setShowConfirmationDetails(prev => !prev)}
            disabled={!hasRegistered}
            className={`rounded-2xl border p-5 text-left transition-all duration-300 bg-white border-slate-200/70 shadow-sm hover:shadow-md ${hasRegistered ? 'cursor-pointer hover:border-slate-300' : 'cursor-default'} ${showConfirmationTask || showConfirmationDetails ? 'border-t-4 border-t-emerald-500 border-x-slate-200/50 border-b-slate-200/50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Nơi thực tập chính thức</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${finalInternship ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="mt-2.5 text-sm font-bold text-slate-800 line-clamp-2">{finalInternshipSummary}</div>
            {hasRegistered && <div className="mt-3 text-xs font-bold text-emerald-600 inline-flex items-center gap-1">{showConfirmationDetails ? 'Ẩn chi tiết' : 'Xem / xác nhận'}</div>}
          </button>

          <button
            type="button"
            onClick={() => navigate('/grades')}
            className={`rounded-2xl border p-5 text-left transition-all duration-300 bg-white border-slate-200/70 shadow-sm hover:shadow-md cursor-pointer hover:border-slate-300 ${showAdvisorTask ? 'border-t-4 border-t-indigo-500 border-x-slate-200/50 border-b-slate-200/50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Giảng viên hướng dẫn</div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650 shrink-0">
                <UserCheck size={15} />
              </div>
            </div>
            <div className="mt-2.5 text-sm font-bold text-slate-800 line-clamp-2">{advisorSummary}</div>
            <div className="mt-3 text-xs font-bold text-indigo-600 inline-flex items-center gap-1">Xem chi tiết & điểm số</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports/final')}
            className={`rounded-2xl border p-5 text-left transition-all duration-300 bg-white border-slate-200/70 shadow-sm hover:shadow-md cursor-pointer hover:border-slate-300 ${activeCampaignKey === 'final_report' ? 'border-t-4 border-t-violet-600 border-x-slate-200/50 border-b-slate-200/50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Báo cáo final</div>
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-650 shrink-0">
                <FileCheck size={15} />
              </div>
            </div>
            <div className="mt-2.5 text-sm font-bold text-slate-800">{finalReportSummary}</div>
            {finalReport?.submitted_at && <div className="mt-1 text-xs text-slate-500">{new Date(finalReport.submitted_at).toLocaleDateString('vi-VN')}</div>}
            <div className="mt-3 text-xs font-bold text-violet-600 inline-flex items-center gap-1">Mở trang nộp báo cáo</div>
          </button>
        </div>

        {myRegsError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">
            Hệ thống chưa kiểm tra được danh sách đăng ký của bạn. Vui lòng đăng nhập lại để hiện thị đúng thông tin đăng ký hoặc liên hệ Khoa nếu thông báo này vẫn xuất hiện.
            <div className="text-xs text-amber-700 mt-1">{myRegsError}</div>
          </div>
        ) : (showRegistrationTask || (hasRegistered && showRegistrationDetails)) ? (hasRegistered ? (showRegistrationDetails ? (
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
            {!editingPreferences ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Đã ghi nhận đăng ký nguyện vọng</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Ngày ghi nhận: {new Date(myRegs[0].created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={startEditingPreferences}
                      disabled={!canWithdrawRegistration}
                      title={canWithdrawRegistration ? 'Chỉnh sửa từng nguyện vọng trong thời gian Khoa mở đăng ký' : 'Chỉ được chỉnh sửa trong thời gian Khoa mở đăng ký'}
                      className={`bg-white text-slate-750 border border-slate-200 px-3.5 py-1.5 rounded-xl hover:bg-slate-50 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${!canWithdrawRegistration ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Edit2 size={13} /> Sửa nguyện vọng
                    </button>
                    <button
                      onClick={() => canWithdrawRegistration && setIsWithdrawModalOpen(true)}
                      disabled={!canWithdrawRegistration}
                      title={canWithdrawRegistration ? 'Hủy đăng ký trong thời gian Khoa mở đăng ký' : 'Chỉ được hủy đăng ký trong thời gian Khoa mở đăng ký'}
                      className={`bg-rose-50 text-rose-600 border border-rose-100 px-3.5 py-1.5 rounded-xl hover:bg-rose-100/60 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${!canWithdrawRegistration ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Trash2 size={13} /> Hủy tất cả
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {myRegs.map((reg: any, idx: number) => (
                    <div key={reg.id} className="flex items-start sm:items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors">
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">NV{idx + 1}</span>
                          <span className="text-sm font-bold text-slate-800">
                            {reg.company_name === 'Công ty khác' ? `(Khác) ${reg.other_company_name || ''}` : reg.company_name}
                          </span>
                        </div>
                        {reg.review_comment && (
                          <div className="text-xs text-slate-600 mt-2 bg-white border border-slate-150 rounded-lg p-2.5 shadow-sm inline-block max-w-full">
                            <span className="font-semibold text-slate-700">Nhận xét của Khoa:</span> {reg.review_comment}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm shrink-0 ${
                        reg.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : reg.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}
                      </span>
                    </div>
                  ))}
                </div>

                {canWithdrawRegistration && (
                  <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-500 leading-relaxed">
                    <Clock size={14} className="mt-0.5 text-slate-400 shrink-0" />
                    <p>Trong thời gian Khoa mở đăng ký, sinh viên có thể chỉnh sửa từng nguyện vọng, thêm hoặc bỏ bớt nơi thực tập mà không cần hủy toàn bộ.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                      <Edit2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Chỉnh sửa nguyện vọng thực tập</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Sinh viên có thể chọn thêm hoặc bỏ bớt nơi thực tập</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-blue-50 border border-blue-100 px-3.5 py-1 text-xs font-bold text-blue-700 shadow-sm shrink-0">
                    Đang chọn {selectedWishCount}/5
                  </div>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-xs text-amber-900 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                    <div><strong>Lưu ý:</strong> Sinh viên chỉ được phép xác nhận thực tập tại 1 trong 5 nơi này. Nếu không pass tất cả, sẽ phải thực tập ở Trường.</div>
                  </div>
                </div>

                {selectedPreferencePreview.length > 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Nguyện vọng sau khi chỉnh sửa</div>
                    <ol className="space-y-2 text-xs text-slate-850">
                      {selectedPreferencePreview.map((item, idx) => (
                        <li key={item.key} className="flex items-center gap-2">
                          <span className="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">NV{idx + 1}</span>
                          <span className="font-semibold text-slate-800">{item.name}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-slate-100 pt-4">
                  <button onClick={cancelEditingPreferences} disabled={savingPreferences} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50">Hủy chỉnh sửa</button>
                  <button onClick={savePreferenceEdits} disabled={savingPreferences} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save size={14} /> {savingPreferences ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null) : (
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

        {showConfirmationBlock && (
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${finalInternship ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Nơi thực tập chính thức</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Xác nhận nơi trúng tuyển chính thức để lấy điểm học phần</p>
                </div>
              </div>
              {finalInternship && (
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full shadow-sm">
                  Đã Xác Nhận
                </span>
              )}
            </div>

            <div>
              {finalInternship ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đơn vị tiếp nhận</span>
                      <span className="text-sm font-bold text-slate-800 mt-1.5 block">
                        {finalInternship.internship_type === 'school' ? 'Thực tập tại trường' : (finalInternship.company_name === 'Công ty khác' ? `Công ty khác: ${finalInternship.other_company_name || ''}` : finalInternship.company_name)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Giảng viên hướng dẫn</span>
                      {myAdvisors.length > 0 ? (
                        <div className="mt-1.5 space-y-1.5">
                          {myAdvisors.map((a: any) => (
                            <div key={`${a.role}-${a.lecturer_id}`} className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${a.role === 'primary' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-650'}`}>
                                {a.role === 'primary' ? 'GV chính' : 'Đồng HD'}
                              </span>
                              <strong>{a.lecturer_name}</strong>
                              {a.lecturer_email && (
                                <a href={`mailto:${a.lecturer_email}`} className="text-blue-600 hover:underline text-xs font-semibold">
                                  ({a.lecturer_email})
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : finalInternship.school_lecturer ? (
                        <span className="text-sm font-bold text-slate-800 mt-1.5 block">{finalInternship.school_lecturer}</span>
                      ) : finalInternship.school_assignment_request ? (
                        <span className="text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded shadow-sm inline-block mt-1.5">Khoa sẽ phân công</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic mt-1.5 block">Chưa phân công</span>
                      )}
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thời gian xác nhận</span>
                      <span className="text-sm font-bold text-slate-800 mt-1.5 block">
                        {finalInternship.confirmed_at ? new Date(finalInternship.confirmed_at).toLocaleString('vi-VN') : '-'}
                      </span>
                      {finalInternship.locked_at && (
                        <div className="text-rose-600 font-bold text-[10px] flex items-center gap-1 mt-1">
                          <Lock size={10} /> Khoa đã khóa dữ liệu xác nhận.
                        </div>
                      )}
                    </div>
                  </div>

                  {!finalInternship.locked_at && confirmationWindowStatus === 'open' && (
                    <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
                      <button
                        onClick={() => openFinalConfirm('company')}
                        disabled={approvedFinalOptions.length === 0}
                        className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                      >
                        {finalInternship.internship_type === 'company' ? 'Cập nhật công ty' : 'Chuyển sang công ty'}
                      </button>
                      <button
                        onClick={() => openFinalConfirm('school')}
                        className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                      >
                        {finalInternship.internship_type === 'school' ? 'Cập nhật thực tập tại trường' : 'Chuyển sang thực tập tại trường'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="space-y-3.5 mb-5">
                    <p className="text-sm text-slate-600 leading-relaxed">Sau khi có kết quả tuyển dụng từ doanh nghiệp hoặc trường học, sinh viên bắt buộc phải chọn và xác nhận một nơi thực tập chính thức để hệ thống ghi nhận làm căn cứ phân công giảng viên và nhập điểm học phần.</p>
                    {confirmationWindowStatus !== 'open' && (
                      <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 flex items-start gap-2 text-xs text-orange-800">
                        <Clock size={14} className="shrink-0 mt-0.5 text-orange-500" />
                        <div>
                          {confirmationWindowStatus === 'not_open_yet'
                            ? `Đợt xác nhận chưa mở. Thời gian mở: ${campaign.confirmation_open_at ? formatGMT7(campaign.confirmation_open_at) : '—'} (GMT+7).`
                            : `Đợt xác nhận đã kết thúc vào lúc: ${campaign.confirmation_close_at ? formatGMT7(campaign.confirmation_close_at) : '—'} (GMT+7).`}
                        </div>
                      </div>
                    )}
                    {approvedFinalOptions.length === 0 && (
                      <p className="text-xs text-amber-700 italic font-medium bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                        Hiện chưa có công ty nào được Khoa duyệt trong danh sách nguyện vọng của bạn. Nếu không trúng tuyển doanh nghiệp nào ngoài danh sách chính thức, bạn có thể thực tập tại trường khi Khoa mở cổng xác nhận.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
                    <button
                      onClick={() => openFinalConfirm('company')}
                      disabled={confirmationWindowStatus !== 'open' || approvedFinalOptions.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                    >
                      Xác nhận công ty
                    </button>
                    <button
                      onClick={() => openFinalConfirm('school')}
                      disabled={confirmationWindowStatus !== 'open'}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                    >
                      Thực tập tại trường
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showAdvisorTask && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Đăng ký giảng viên hướng dẫn</h4>
            {advisorRequestWindowStatus !== 'open' && (
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {advisorRequestWindowStatus === 'not_open_yet'
                  ? `Chưa mở đăng ký GVHD${campaign.advisor_request_open_at ? `: ${formatGMT7(campaign.advisor_request_open_at)} (GMT+7)` : ''}.`
                  : `Đã hết hạn đăng ký GVHD${campaign.advisor_request_close_at ? `: ${formatGMT7(campaign.advisor_request_close_at)} (GMT+7)` : ''}. Nếu chưa chọn GVHD, hệ thống sẽ tự phân công theo quota còn lại.`}
              </div>
            )}
            <form onSubmit={submitAdvisorRequest} className="space-y-3">
              {hasAdvisorSelection && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">GVHD hiện tại</span>
                        {advisorRequest && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${advisorRequest.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : advisorRequest.status === 'rejected' ? 'bg-red-50 text-red-750 border border-red-150' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {advisorRequest.status === 'approved' ? 'Đã duyệt' : advisorRequest.status === 'rejected' ? 'Từ chối' : 'Chờ Khoa xử lý'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {myAdvisors.length > 0
                          ? myAdvisors.map((a: any) => `${a.role === 'primary' ? 'Chính' : 'Đồng'}: ${a.lecturer_name}`).join('; ')
                          : advisorRequest?.request_type === 'faculty_assign'
                            ? 'Khoa sẽ phân công'
                            : advisorRequest?.lecturer_name || advisorRequest?.lecturer_name_text || '-'}
                      </div>
                      {advisorRequest && (
                        <div className="mt-2 text-xs text-slate-500 font-medium space-y-1">
                          {advisorRequest.quota_status === 'over_quota' && <p className="text-amber-600 font-bold">⚠️ Vượt quota, đã cảnh báo</p>}
                          {(advisorRequest.co_lecturer_name || advisorRequest.co_lecturer_name_text) && <p>Đồng HD: <span className="font-semibold text-slate-700">{advisorRequest.co_lecturer_name || advisorRequest.co_lecturer_name_text}</span></p>}
                          {advisorRequest.admin_note && <p>Nhận xét từ Khoa: <span className="font-semibold text-slate-750">{advisorRequest.admin_note}</span></p>}
                        </div>
                      )}
                    </div>
                    {canEditAdvisorRequest && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button type="button" onClick={() => setIsAdvisorEditOpen(prev => !prev)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer">
                          {isAdvisorEditOpen ? 'Đóng chỉnh sửa' : 'Thay đổi GVHD'}
                        </button>
                        <button type="button" onClick={cancelAdvisorRequest} disabled={advisorRequestSaving} className="bg-white text-red-650 border border-red-200 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
                          Hủy đăng ký
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {showAdvisorForm && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 shadow-inner">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                      className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="">Không đăng ký GVHD, Khoa sẽ phân công</option>
                      <option value="agreed">Sinh viên đã được GV đồng ý hướng dẫn</option>
                    </select>
                    <input
                      value={advisorRequestForm.lecturer_name}
                      onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, lecturer_name: e.target.value })}
                      disabled={!advisorRequestForm.request_type}
                      required={!!advisorRequestForm.request_type}
                      list="advisor-primary-lecturers"
                      placeholder="Nhập/chọn GVHD chính"
                      className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <input
                      value={advisorRequestForm.co_lecturer_name}
                      onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, co_lecturer_name: e.target.value })}
                      disabled={!advisorRequestForm.request_type}
                      list="advisor-co-lecturers"
                      placeholder="Nhập/chọn đồng hướng dẫn (nếu có)"
                      className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
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
                    placeholder="Ghi chú thêm nếu có, ví dụ: thông tin đã trao đổi với GV hoặc lịch hẹn làm việc..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white resize-y text-slate-800"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2.5">
                    <button type="submit" disabled={advisorRequestSaving || !canEditAdvisorRequest} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      {advisorRequestSaving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} {hasAdvisorSelection ? 'Lưu thay đổi' : 'Đăng ký GVHD'}
                    </button>
                    {hasAdvisorSelection && (
                      <button type="button" onClick={() => setIsAdvisorEditOpen(false)} disabled={advisorRequestSaving} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50">
                        Hủy chỉnh sửa
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
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
        {showCompanyList && <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-800 text-sm">Danh sách nơi thực tập</h2>
              {(!hasRegistered || editingPreferences) && selectedWishCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Đã chọn: {selectedWishCount}/5</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nơi thực tập..."
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all w-full sm:w-64 bg-slate-50/50 shadow-inner font-semibold text-slate-800"
              />
              {editingPreferences ? (
                <>
                  <button
                    onClick={cancelEditingPreferences}
                    disabled={savingPreferences}
                    className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={savePreferenceEdits}
                    disabled={savingPreferences || selectedWishCount === 0}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {savingPreferences ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </>
              ) : !hasRegistered && (
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

          <div className="overflow-x-auto">
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
                          checked={isSelected || (!editingPreferences && isRegistered)}
                          disabled={(!editingPreferences && hasRegistered) || (!isSelected && selectedWishCount >= 5)}
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
          {editingPreferences && hasSelectedKhac && (
            <div className="border-t border-orange-100 bg-orange-50/60 px-6 py-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-orange-900">Thông tin công ty tự liên hệ</h3>
                  <p className="mt-1 text-xs text-orange-800">Mỗi công ty tự liên hệ được tính là một nguyện vọng riêng trong giới hạn 5 nơi thực tập.</p>
                </div>
                {Array.from(selectedCompanies).filter(id => id !== khacCompany?.id).length + otherCompanies.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setOtherCompanies(prev => [...prev, { name: '', role: '', contact_name: '', contact_phone: '', contact_email: '', note: '' }])}
                    className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100"
                  >
                    <Plus size={14} /> Thêm công ty
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {otherCompanies.map((otherCompany: any, index) => (
                  <div key={otherCompany.id || index} className="rounded-xl border border-orange-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-xs font-bold text-orange-800">Công ty tự liên hệ {index + 1}</h4>
                      {otherCompanies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOtherCompanies(prev => prev.filter((_, i) => i !== index))}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      )}
                    </div>
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Tên công ty *</label>
                        <input list="edit-it-companies-datalist" value={otherCompany.name || ''} onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, name: e.target.value } : c))} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" placeholder="Tên công ty" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Vị trí *</label>
                        <input value={otherCompany.role || ''} onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, role: e.target.value } : c))} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" placeholder="Vị trí thực tập" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Người liên hệ *</label>
                          <input value={otherCompany.contact_name || ''} onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, contact_name: e.target.value } : c))} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" placeholder="Tên người liên hệ" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Điện thoại *</label>
                          <input value={otherCompany.contact_phone || ''} onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, contact_phone: e.target.value } : c))} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" placeholder="Số điện thoại" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                          <input type="email" value={otherCompany.contact_email || ''} onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, contact_email: e.target.value } : c))} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" placeholder="email@company.com" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú đăng ký</label>
                        <textarea rows={2} value={otherCompany.note || ''} onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, note: e.target.value } : c))} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-850" placeholder="Lý do đăng ký, liên hệ GVHD..." />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <datalist id="edit-it-companies-datalist">
                {itCompanyList.map((name, i) => <option key={i} value={name} />)}
              </datalist>
            </div>
          )}
          <PaginationControls
            total={sortedCompanies.length}
            currentPage={companyPage}
            pageSize={companyPageSize}
            onPageChange={setCompanyPage}
            label="nơi thực tập"
          />


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
              Bạn có chắc chắn muốn hủy toàn bộ nguyện vọng đăng ký thực tập hiện tại để đăng ký lại?
              <br /><br />
              <strong>Lưu ý:</strong> Hệ thống chỉ hủy danh sách nguyện vọng và nơi thực tập chính thức chưa khóa. Thông tin hồ sơ cá nhân, số điện thoại, email cá nhân và thông tin GVHD đã đăng ký/phân công sẽ được giữ lại.
            </p>
            <div className="flex justify-end gap-2.5 mt-6">
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={handleWithdraw}
                className="bg-red-600 hover:bg-red-750 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
              <h3 className="text-lg font-bold text-slate-800">Xác nhận nơi thực tập chính thức</h3>
              <button onClick={() => setConfirmFinalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitFinalConfirmation} className="space-y-4">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFinalConfirmMode('company')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${finalConfirmMode === 'company' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  Công ty
                </button>
                <button
                  type="button"
                  onClick={() => setFinalConfirmMode('school')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${finalConfirmMode === 'school' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  Tại trường
                </button>
              </div>

              {finalConfirmMode === 'company' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nơi thực tập đã trúng tuyển *</label>
                    <select
                      required
                      value={selectedFinalRegId}
                      onChange={e => setSelectedFinalRegId(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                    >
                      <option value="">-- Chọn nơi thực tập --</option>
                      {approvedFinalOptions.map((reg: any) => (
                        <option key={reg.id} value={reg.id}>
                          {reg.company_name === 'Công ty khác' ? `Công ty khác: ${reg.other_company_name || ''}` : reg.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-start gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 font-medium cursor-pointer shadow-sm select-none">
                    <input
                      type="checkbox"
                      required
                      checked={finalAttested}
                      onChange={e => setFinalAttested(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-250 focus:ring-blue-500"
                    />
                    <span>Tôi xác nhận đã được đơn vị này tiếp nhận thực tập và chịu trách nhiệm về thông tin khai báo.</span>
                  </label>
                </>
              ) : (
                <div className="space-y-3">
                  {primaryAdvisor ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/45 p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Giảng viên hướng dẫn đã phân công</span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">GV chính</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{primaryAdvisor.lecturer_name}</p>
                      {primaryAdvisor.lecturer_email && (
                        <a href={`mailto:${primaryAdvisor.lecturer_email}`} className="mt-1 text-xs text-blue-600 hover:underline font-semibold block w-fit">
                          {primaryAdvisor.lecturer_email}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Giảng viên đã đồng ý hướng dẫn <span className="text-slate-400 font-normal normal-case">(nếu có)</span></label>
                      <input
                        type="text"
                        list="final-lecturers-list"
                        value={finalSchoolLecturer}
                        onChange={e => setFinalSchoolLecturer(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800"
                        placeholder="Để trống nếu Khoa phân công sau..."
                      />
                      <datalist id="final-lecturers-list">
                        {lecturers.map(lec => <option key={lec} value={lec} />)}
                      </datalist>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 font-medium">Chỉ chọn thực tập tại trường khi bạn không trúng tuyển công ty nào hoặc thực hiện theo sắp xếp của Khoa.{!primaryAdvisor ? ' Nếu để trống GVHD, Khoa sẽ phân công sau.' : ''}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ghi chú</label>
                <textarea
                  rows={3}
                  value={finalNote}
                  onChange={e => setFinalNote(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner resize-y text-slate-850"
                  placeholder="Thông tin liên hệ mentor, thời gian bắt đầu, ghi chú với Khoa..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setConfirmFinalOpen(false)} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingFinal || (finalConfirmMode === 'company' && !selectedFinalRegId)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h3 className="text-lg font-bold text-slate-800">Đăng ký thực tập</h3>
              <button onClick={() => setRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Bạn đang đăng ký <strong>{selectedWishCount}</strong> nguyện vọng:</p>
              <ul className="text-xs text-slate-700 space-y-1 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 shadow-sm font-semibold">
                {selectedPreferencePreview.map((item, idx) => (
                  <li key={item.key} className="flex items-center gap-2"><span className="text-blue-600 font-bold text-xs">NV{idx + 1}</span> {item.name}</li>
                ))}
              </ul>
            </div>
            <form onSubmit={submitRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mã sinh viên *</label>
                <input required disabled={!!user?.student_id} type="text" className={`w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-mono font-semibold text-slate-850 ${user?.student_id ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''}`} value={registerForm.student_id} onChange={e => setRegisterForm({ ...registerForm, student_id: e.target.value })} placeholder="VD: 20021234" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ngày sinh *</label>
                <input required disabled={!!user?.dob} type="date" max={new Date().toISOString().split('T')[0]} className={`w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-850 ${user?.dob ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''}`} value={registerForm.dob} onChange={e => setRegisterForm({ ...registerForm, dob: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Số điện thoại *</label>
                <input required type="tel" pattern="^(0|\+84)[35789][0-9]{8}$" title="Vui lòng nhập số điện thoại hợp lệ (10 số, VD: 0912345678)" className={`w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-850 ${user?.phone ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''}`} disabled={!!user?.phone} value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="VD: 0912345678" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email cá nhân (khác VNU) *</label>
                <input required type="email" className={`w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-850 ${user?.personal_email ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''}`} disabled={!!user?.personal_email} value={registerForm.personal_email} onChange={e => setRegisterForm({ ...registerForm, personal_email: e.target.value })} placeholder="VD: abc@gmail.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Lớp khóa học *</label>
                <select required disabled={!!user?.class_name} className={`w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-850 ${user?.class_name ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''}`} value={registerForm.class_name} onChange={e => setRegisterForm({ ...registerForm, class_name: e.target.value })}>
                  <option value="">-- Chọn lớp khóa học --</option>
                  {(campaign.classes_list ? campaign.classes_list.split(',').map((c: string) => c.trim()) : []).map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Học phần thực tập *</label>
                <select required disabled={!!user?.course_code} className={`w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-850 ${user?.course_code ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : ''}`} value={registerForm.course_code} onChange={e => setRegisterForm({ ...registerForm, course_code: e.target.value })}>
                  <option value="">-- Chọn mã môn học --</option>
                  <option value="Thực tập Doanh nghiệp INT4002">1. Thực tập Doanh nghiệp INT4002</option>
                  <option value="Thực tập Chuyên ngành INT3508">2. Thực tập Chuyên ngành INT3508</option>
                  <option value="Thực tập Doanh nghiệp Nhật Bản INT4003">3. Thực tập Doanh nghiệp Nhật Bản INT4003</option>
                </select>
                <p className="text-[10px] text-red-500 mt-1.5 italic font-medium">* Lưu ý: Sinh viên phải chọn chính xác học phần theo khung chương trình đào tạo của mình.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ghi chú thêm</label>
                <textarea className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner resize-y text-slate-800" rows={hasSelectedKhac ? 2 : 3} value={registerForm.note} onChange={e => setRegisterForm({ ...registerForm, note: e.target.value })} placeholder="Mong muốn, kỹ năng nổi bật..." />
              </div>

              {canEditAdvisorRequest ? (
                <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-3.5 shadow-inner">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Đăng ký giảng viên hướng dẫn</h4>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">Chỉ điền khi sinh viên đã liên hệ và được giảng viên đồng ý hướng dẫn. Nếu chưa có GVHD, để trống; Khoa sẽ phân công sau theo quota còn lại.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
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
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-semibold text-slate-850 cursor-pointer"
                    >
                      <option value="">Không đăng ký GVHD, Khoa sẽ phân công</option>
                      <option value="agreed">Sinh viên đã được GV đồng ý hướng dẫn</option>
                    </select>
                    <input
                      value={advisorRequestForm.lecturer_name}
                      onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, lecturer_name: e.target.value })}
                      disabled={!advisorRequestForm.request_type}
                      required={!!advisorRequestForm.request_type}
                      list="registration-advisor-primary-lecturers"
                      placeholder="Nhập/chọn GVHD chính"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-semibold text-slate-850 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <input
                      value={advisorRequestForm.co_lecturer_name}
                      onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, co_lecturer_name: e.target.value })}
                      disabled={!advisorRequestForm.request_type}
                      list="registration-advisor-co-lecturers"
                      placeholder="Nhập/chọn đồng hướng dẫn (nếu có)"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-semibold text-slate-850 disabled:bg-slate-100 disabled:text-slate-400"
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
                    placeholder="Ghi chú thêm nếu có, ví dụ: thông tin đã trao đổi với GV hoặc lịch hẹn làm việc..."
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs resize-y bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-850 font-medium"
                    rows={2}
                  />
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 font-medium shadow-sm">
                  Đợt đăng ký GVHD hiện chưa mở. Khi đăng ký bổ sung nơi thực tập, hệ thống sẽ giữ nguyên GVHD đã đăng ký/phân công trước đó; nếu sinh viên chưa có GVHD, Khoa sẽ phân công sau.
                </div>
              )}

              {hasSelectedSchool && (
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl text-xs text-blue-900 font-medium shadow-sm">
                  <h4 className="font-bold text-blue-800 uppercase tracking-wider mb-1">Thực tập tại Trường</h4>
                  <p className="mt-1">Thông tin GVHD được lấy từ phần “Đăng ký giảng viên hướng dẫn” ở trên. Nếu chưa chọn trong bước này, Khoa sẽ phân công sau.</p>
                </div>
              )}

              {hasSelectedKhac && (
                <div className="bg-orange-50/50 border border-orange-100 p-5 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider">Thông tin Công ty tự liên hệ</h4>
                  </div>
                  {otherCompanies.map((otherCompany, index) => (
                    <div key={index} className="space-y-4 pb-4 border-b border-orange-200 last:border-0 last:pb-0 relative">
                      {otherCompanies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOtherCompanies(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-1 -right-1 text-red-500 hover:text-red-600 bg-red-50 p-1 rounded-full cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {otherCompanies.length > 1 && <h5 className="text-xs font-bold text-orange-700">Công ty {index + 1}</h5>}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tên công ty *</label>
                        <input required list="it-companies-datalist" type="text" className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" value={otherCompany.name} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, name: e.target.value } : c))} placeholder="Công ty CP Công nghệ..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vị trí Thực tập *</label>
                        <input required list="role-suggestions" type="text" className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" value={otherCompany.role} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, role: e.target.value } : c))} placeholder="Thực tập sinh Frontend..." />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Người liên hệ *</label>
                          <input required type="text" className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" value={otherCompany.contact_name} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, contact_name: e.target.value } : c))} placeholder="Anh Nguyễn Văn A" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Điện thoại *</label>
                          <input required type="tel" pattern="^(0|\+84)[35789][0-9]{8}$" title="Vui lòng nhập số điện thoại hợp lệ (10 số, VD: 0912345678)" className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" value={otherCompany.contact_phone} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, contact_phone: e.target.value } : c))} placeholder="0987654321" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email *</label>
                          <input required type="email" className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner font-semibold text-slate-800" value={otherCompany.contact_email} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, contact_email: e.target.value } : c))} placeholder="a@company.com" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ghi chú đăng ký</label>
                        <textarea rows={2} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner resize-y text-slate-800" value={otherCompany.note || ''} onChange={e => setOtherCompanies(prev => prev.map((c, i) => i === index ? { ...c, note: e.target.value } : c))} placeholder="Lý do đăng ký, liên hệ GVHD..." />
                      </div>
                    </div>
                  ))}

                  {Array.from(selectedCompanies).filter(id => id !== khacCompany?.id).length + otherCompanies.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setOtherCompanies(prev => [...prev, { name: '', role: '', contact_name: '', contact_phone: '', contact_email: '', note: '' }])}
                      className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      + Thêm công ty tự liên hệ
                    </button>
                  )}
                  <datalist id="it-companies-datalist">
                    {itCompanyList.map((name, i) => <option key={i} value={name} />)}
                  </datalist>
                </div>
              )}

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setRegisterModalOpen(false)} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
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
