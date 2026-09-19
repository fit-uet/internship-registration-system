import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload, CheckCircle2, Download, LayoutDashboard, ArrowUpDown, AlertTriangle,
  ChevronRight, RefreshCw, Save, Plus, Trash2, X, ChevronDown, FileText, Edit2,
  Clock, Send, Lock, ClipboardList, UserCheck, FileCheck, User as UserIcon,
  GraduationCap, Bell, CircleHelp, Building2, Calendar, Award, ExternalLink, Sparkles, Mail
} from 'lucide-react';
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
  const [myGrade, setMyGrade] = useState<any>(null);
  const [selectedMilestoneTab, setSelectedMilestoneTab] = useState<'overview' | 'registration' | 'confirmation' | 'advisor' | 'report'>('overview');
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

  const getLetterGrade = (score: number | null | undefined) => {
    if (score === null || score === undefined || isNaN(Number(score))) return { letter: '—', gpa: '—', label: 'Chưa có điểm' };
    const s = Number(score);
    if (s >= 9.0) return { letter: 'A+', gpa: '4.0', label: 'Xuất sắc' };
    if (s >= 8.5) return { letter: 'A', gpa: '4.0', label: 'Giỏi' };
    if (s >= 8.0) return { letter: 'B+', gpa: '3.5', label: 'Khá giỏi' };
    if (s >= 7.0) return { letter: 'B', gpa: '3.0', label: 'Khá' };
    if (s >= 6.5) return { letter: 'C+', gpa: '2.5', label: 'Trung bình khá' };
    if (s >= 5.5) return { letter: 'C', gpa: '2.0', label: 'Trung bình' };
    if (s >= 5.0) return { letter: 'D+', gpa: '1.5', label: 'Trung bình yếu' };
    if (s >= 4.0) return { letter: 'D', gpa: '1.0', label: 'Đạt' };
    return { letter: 'F', gpa: '0.0', label: 'Không đạt' };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const isStudent = user?.role === 'student';
      const authHeaders = { Authorization: `Bearer ${token}` };
      const [compData, regRes, finalRes, advisorRes, advisorReqRes, reportRes, campData, itListData, lecData, gradeRes] = await Promise.all([
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
        }),
        isStudent ? fetch(`${API_BASE}/api/grades/my`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
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

      const gradeData = gradeRes ? await gradeRes.json().catch(() => null) : null;
      setMyGrade(gradeData && !gradeData.error ? gradeData : null);

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
      alert('Đã nộp báo cáo.');
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
      label: 'Nộp báo cáo',
      openAt: campaign.final_report_open_at,
      closeAt: campaign.final_report_close_at,
      status: (!campaign.final_report_open_at && !campaign.final_report_close_at) ? 'unconfigured' : finalReportWindowStatus,
    },
  ];
  const visibleCampaignStatusItems = campaignStatusItems;
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
        : openCampaign?.label === 'Nộp báo cáo'
          ? 'final_report'
          : 'registration';
  const activeCampaignTitle = openCampaign?.label || 'Đăng ký thực tập';
  const showRegistrationTask = activeCampaignKey === 'registration' || registrationWindowStatus === 'open';
  const showConfirmationTask = activeCampaignKey === 'confirmation' && hasRegistered;
  const showAdvisorTask = advisorRequestWindowStatus === 'open' && hasRegistered;
  const showFinalReportTask = true;
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Apple ID Style Student Profile Showcase */}
      {user && (
        <div className="bg-white border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {user.picture ? (
                <div className="w-16 h-16 rounded-2xl border border-black/[0.06] bg-[#f5f5f7] shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                  <img src={user.picture} alt="Avatar" className="w-full h-full object-contain p-1" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#0071e3] to-[#005bb5] text-white flex items-center justify-center shadow-xs font-bold text-xl shrink-0">
                  <UserIcon size={28} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0071e3]/10 text-[#0071e3]">
                    <GraduationCap size={12} /> Sinh viên thực tập
                  </span>
                  <span className="text-xs text-[#86868b] font-medium">FIT UET · {campaign.year}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] tracking-tight truncate">{user.name}</h2>
                <p className="text-xs sm:text-sm text-[#86868b] mt-1 flex flex-wrap items-center gap-2">
                  <span>{user.email}</span>
                  {user.student_id && <span>· MSSV: <strong className="text-[#1d1d1f] font-mono">{user.student_id}</strong></span>}
                  {user.class_name && <span>· Lớp: <strong className="text-[#1d1d1f]">{user.class_name}</strong></span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] active:scale-[0.98] transition-all cursor-pointer"
              >
                <UserIcon size={13} className="text-[#86868b]" /> Hồ sơ
              </button>
              <button
                type="button"
                onClick={() => navigate('/plan')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Calendar size={13} className="text-[#86868b]" /> Kế hoạch
              </button>
              <a
                href="https://drive.google.com/drive/u/0/folders/14Fm4yP-2Psj_qMpzI0pBARkcww1sblA3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] active:scale-[0.98] transition-all cursor-pointer"
              >
                <ExternalLink size={13} className="text-[#86868b]" /> Mẫu báo cáo
              </a>
              <button
                type="button"
                onClick={() => navigate('/faq')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] active:scale-[0.98] transition-all cursor-pointer"
              >
                <CircleHelp size={13} className="text-[#86868b]" /> FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apple 4-Stage Lifecycle Milestone Stepper (Full Width Hub) */}
      <div className="bg-white border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
              <LayoutDashboard size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1d1d1f] tracking-tight">Lộ trình học phần Thực tập {campaign.year}</h2>
              <p className="text-xs text-[#86868b]">4 giai đoạn xuyên suốt kỳ thực tập tốt nghiệp · Bấm thẻ để xem chi tiết</p>
            </div>
          </div>
          {user?.role !== 'admin' && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0071e3]/20 bg-[#0071e3]/10 px-3.5 py-1.5 text-xs font-semibold text-[#0071e3]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0071e3] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0071e3]" />
              </span>
              Việc cần làm: {activeCampaignTitle}
            </div>
          )}
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="bg-[#1d1d1f] hover:bg-black text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LayoutDashboard size={13} /> Danh sách đăng ký
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/final-internships')}
                className="bg-[#34c759] hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={13} /> Danh sách xác nhận
              </button>
            </div>
          )}
        </div>

        {/* 4 Connected Milestone Cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Milestone 1 */}
          <div
            onClick={() => setSelectedMilestoneTab(prev => prev === 'registration' ? 'overview' : 'registration')}
            className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 cursor-pointer ${
              selectedMilestoneTab === 'registration'
                ? 'border-[#0071e3] bg-white ring-2 ring-[#0071e3]/20 shadow-md'
                : 'border-black/[0.06] bg-[#fbfbfd] hover:border-black/[0.12] hover:bg-white hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#0071e3] to-[#005bb5] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Send size={15} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  hasRegistered
                    ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60'
                    : registrationWindowStatus === 'open'
                    ? 'bg-[#ebf4ff] text-[#0071e3] border-blue-200/60'
                    : 'bg-[#f5f5f7] text-[#86868b] border-black/[0.04]'
                }`}>
                  {hasRegistered ? 'Đã ghi nhận' : (registrationWindowStatus === 'open' ? 'Đang mở' : 'Chưa đăng ký')}
                </span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">Giai đoạn 1</div>
              <div className="text-sm font-bold text-[#1d1d1f] tracking-tight mt-0.5">Đăng ký nguyện vọng</div>
              <div className="mt-1 text-xs text-[#6e6e73] font-medium truncate">{registrationSummary}</div>
              {hasRegistered && myRegs[0]?.created_at && (
                <div className="mt-1 text-[11px] text-[#86868b]">
                  {new Date(myRegs[0].created_at).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
            <div className="mt-3 pt-2.5 border-t border-black/[0.04] text-[11px] font-bold text-[#0071e3] inline-flex items-center justify-between">
              <span>{selectedMilestoneTab === 'registration' ? 'Đang xem' : 'Xem chi tiết'}</span>
              <ChevronRight size={12} className={selectedMilestoneTab === 'registration' ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </div>
          </div>

          {/* Milestone 2 */}
          <div
            onClick={() => setSelectedMilestoneTab(prev => prev === 'confirmation' ? 'overview' : 'confirmation')}
            className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 cursor-pointer ${
              selectedMilestoneTab === 'confirmation'
                ? 'border-[#34c759] bg-white ring-2 ring-[#34c759]/20 shadow-md'
                : 'border-black/[0.06] bg-[#fbfbfd] hover:border-black/[0.12] hover:bg-white hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#34c759] to-[#28a745] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Building2 size={15} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  finalInternship
                    ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60'
                    : confirmationWindowStatus === 'open'
                    ? 'bg-[#ebf4ff] text-[#0071e3] border-blue-200/60'
                    : 'bg-[#f5f5f7] text-[#86868b] border-black/[0.04]'
                }`}>
                  {finalInternship ? 'Đã xác nhận' : (confirmationWindowStatus === 'open' ? 'Đang mở' : 'Chờ xác nhận')}
                </span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">Giai đoạn 2</div>
              <div className="text-sm font-bold text-[#1d1d1f] tracking-tight mt-0.5">Nơi thực tập chính thức</div>
              <div className="mt-1 text-xs text-[#6e6e73] font-medium truncate" title={finalInternshipSummary}>
                {finalInternshipSummary}
              </div>
              {finalInternship?.confirmed_at && (
                <div className="mt-1 text-[11px] text-[#86868b]">
                  {new Date(finalInternship.confirmed_at).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
            <div className="mt-3 pt-2.5 border-t border-black/[0.04] text-[11px] font-bold text-[#34c759] inline-flex items-center justify-between">
              <span>{selectedMilestoneTab === 'confirmation' ? 'Đang xem' : 'Xem & xác nhận'}</span>
              <ChevronRight size={12} className={selectedMilestoneTab === 'confirmation' ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </div>
          </div>

          {/* Milestone 3 */}
          <div
            onClick={() => setSelectedMilestoneTab(prev => prev === 'advisor' ? 'overview' : 'advisor')}
            className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 cursor-pointer ${
              selectedMilestoneTab === 'advisor'
                ? 'border-[#af52de] bg-white ring-2 ring-[#af52de]/20 shadow-md'
                : 'border-black/[0.06] bg-[#fbfbfd] hover:border-black/[0.12] hover:bg-white hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#af52de] to-[#8e44ad] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <UserCheck size={15} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  primaryAdvisor
                    ? 'bg-[#af52de]/10 text-[#af52de] border-[#af52de]/20'
                    : advisorRequest
                    ? 'bg-[#fff8eb] text-[#b25e00] border-amber-200/60'
                    : 'bg-[#f5f5f7] text-[#86868b] border-black/[0.04]'
                }`}>
                  {primaryAdvisor ? 'Đã phân công' : (advisorRequest ? 'Đang duyệt' : 'Chờ phân công')}
                </span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">Giai đoạn 3</div>
              <div className="text-sm font-bold text-[#1d1d1f] tracking-tight mt-0.5">Giảng viên hướng dẫn</div>
              <div className="mt-1 text-xs text-[#6e6e73] font-medium truncate" title={advisorSummary}>
                {advisorSummary}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-black/[0.04] text-[11px] font-bold text-[#af52de] inline-flex items-center justify-between">
              <span>{selectedMilestoneTab === 'advisor' ? 'Đang xem' : 'Chi tiết & liên hệ'}</span>
              <ChevronRight size={12} className={selectedMilestoneTab === 'advisor' ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </div>
          </div>

          {/* Milestone 4 */}
          <div
            onClick={() => setSelectedMilestoneTab(prev => prev === 'report' ? 'overview' : 'report')}
            className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 text-left transition-all duration-200 cursor-pointer ${
              selectedMilestoneTab === 'report'
                ? 'border-[#ff9500] bg-white ring-2 ring-[#ff9500]/20 shadow-md'
                : 'border-black/[0.06] bg-[#fbfbfd] hover:border-black/[0.12] hover:bg-white hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#ff9500] to-[#e67e22] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Award size={15} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  finalReport?.status === 'accepted'
                    ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60'
                    : finalReport?.status === 'submitted'
                    ? 'bg-[#ebf4ff] text-[#0071e3] border-blue-200/60'
                    : finalReportWindowStatus === 'open'
                    ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60'
                    : 'bg-[#f5f5f7] text-[#86868b] border-black/[0.04]'
                }`}>
                  {finalReportSummary}
                </span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">Giai đoạn 4</div>
              <div className="text-sm font-bold text-[#1d1d1f] tracking-tight mt-0.5">Báo cáo Final & Điểm</div>
              <div className="mt-1 text-xs text-[#6e6e73] font-medium truncate">
                {myGrade?.final_score !== null && myGrade?.final_score !== undefined
                  ? `Điểm: ${Number(myGrade.final_score).toFixed(1)} (${getLetterGrade(myGrade.final_score).letter})`
                  : finalReportSummary}
              </div>
              {finalReport?.submitted_at && (
                <div className="mt-1 text-[11px] text-[#86868b]">
                  {new Date(finalReport.submitted_at).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
            <div className="mt-3 pt-2.5 border-t border-black/[0.04] text-[11px] font-bold text-[#ff9500] inline-flex items-center justify-between">
              <span>{selectedMilestoneTab === 'report' ? 'Đang xem' : 'Mở nộp & bảng điểm'}</span>
              <ChevronRight size={12} className={selectedMilestoneTab === 'report' ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </div>
          </div>
        </div>
      </div>

      {/* Master-Detail Bento Grid: Left (Timeline & Rules) - Right (Active Stage Workspace & Enterprise Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (col-span-4): Timeline, Resources & Rules */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* Timeline Card */}
          <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="mb-4 flex items-center justify-between gap-3 pb-3 border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#0071e3]" />
                <h3 className="text-sm font-bold text-[#1d1d1f] tracking-tight">Tiến độ & Hạn chót</h3>
              </div>
              <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">GMT+7</span>
            </div>

            <div className="space-y-3">
              {visibleCampaignStatusItems.map(item => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-4 transition-all ${
                    item.status === 'open'
                      ? 'border-[#34c759]/40 bg-[#34c759]/[0.02] ring-1 ring-[#34c759]/20 shadow-xs'
                      : 'border-black/[0.04] bg-[#fbfbfd]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        {item.status === 'open' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${campaignStatusDot(item.status)}`} />
                      </span>
                      <span className="truncate text-xs font-bold text-[#1d1d1f]">{item.label}</span>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${campaignStatusColor(item.status)}`}>
                      {campaignStatusText(item.status)}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-black/[0.04] pt-2.5 text-[11px]">
                    <div>
                      <span className="text-[#86868b]">Mở:</span>
                      <div className="font-semibold text-[#1d1d1f] mt-0.5">{item.openAt ? formatGMT7(item.openAt) : 'Chưa thiết lập'}</div>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Đóng:</span>
                      <div className="font-semibold text-[#1d1d1f] mt-0.5">{item.closeAt ? formatGMT7(item.closeAt) : 'Chưa thiết lập'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Apple Quick Resources Card */}
          <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
            <div className="flex items-center gap-2 pb-3 border-b border-black/[0.04]">
              <FileText size={16} className="text-[#0071e3]" />
              <h3 className="text-sm font-bold text-[#1d1d1f] tracking-tight">Biểu mẫu & Hướng dẫn</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <a
                href="https://drive.google.com/drive/u/0/folders/14Fm4yP-2Psj_qMpzI0pBARkcww1sblA3"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-[#fbfbfd] hover:bg-[#f5f5f7] border border-black/[0.04] text-[#1d1d1f] font-semibold transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Download size={14} className="text-[#0071e3]" /> Mẫu báo cáo của Khoa
                </span>
                <ExternalLink size={12} className="text-[#86868b] group-hover:translate-x-0.5 transition-transform" />
              </a>

              <div className="p-3.5 rounded-2xl bg-[#ebf4ff] border border-[#bfe0ff]/80 text-[#005bb5] space-y-1.5 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-[#004085]">
                  <CheckCircle2 size={13} className="text-[#0071e3]" /> Lưu ý nộp báo cáo:
                </div>
                <p>
                  Chỉ cần in riêng trang <strong>Phiếu đánh giá</strong> để xin nhận xét, điểm và chữ ký của người hướng dẫn + dấu công ty. Sau đó scan và gộp vào bản mềm (PDF) để nộp lên hệ thống.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#fbfbfd] border border-black/[0.04] text-[11px] text-[#6e6e73] space-y-1">
                <div>Giáo vụ phụ trách: <strong className="text-[#1d1d1f]">Cô Bảo</strong> (<a href="mailto:baoptm@vnu.edu.vn" className="text-[#0071e3] hover:underline">baoptm@vnu.edu.vn</a>)</div>
                <div>Hỗ trợ kỹ thuật: <strong className="text-[#1d1d1f]">0961309175</strong></div>
              </div>
            </div>
          </section>

          {/* Rules Accordion */}
          <details className="group overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 select-none font-bold text-sm text-[#1d1d1f]">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#86868b]" />
                <span>Quy định thực tập</span>
              </div>
              <ChevronDown size={16} className="shrink-0 text-[#86868b] transition-transform group-open:rotate-180" />
            </summary>
            <div className="max-h-72 overflow-y-auto border-t border-black/[0.04] bg-[#fbfbfd] p-5 text-xs text-[#1d1d1f] leading-relaxed">
              {registrationRulesMarkdown.trim()
                ? <RegistrationRulesMarkdown content={registrationRulesMarkdown} />
                : <p className="text-xs italic text-[#86868b]">Khoa chưa cập nhật quy định đăng ký.</p>}
            </div>
          </details>
        </aside>

        {/* Right Column (col-span-8): Active Stage Workspace & Enterprise Directory */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {myRegsError && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-xs text-amber-900 leading-relaxed shadow-xs flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Hệ thống chưa kiểm tra được danh sách đăng ký của bạn.</strong>
                <p className="mt-0.5 text-amber-800">Vui lòng tải lại trang hoặc liên hệ Khoa nếu lỗi vẫn tiếp diễn: {myRegsError}</p>
              </div>
            </div>
          )}

          {/* Apple Segmented View Switcher */}
          <div className="bg-[#f0f0f2] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar border border-black/[0.04]">
            <button
              type="button"
              onClick={() => setSelectedMilestoneTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                selectedMilestoneTab === 'overview'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-bold'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white/40 font-medium'
              }`}
            >
              <Sparkles size={14} className={selectedMilestoneTab === 'overview' ? 'text-[#0071e3]' : ''} />
              <span>Tổng quan học phần</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMilestoneTab('registration')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                selectedMilestoneTab === 'registration'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-bold'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white/40 font-medium'
              }`}
            >
              <Send size={13} className={selectedMilestoneTab === 'registration' ? 'text-[#0071e3]' : ''} />
              <span>1. Nguyện vọng</span>
              {myRegs.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedMilestoneTab === 'registration' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/[0.06] text-[#6e6e73]'
                }`}>
                  {myRegs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedMilestoneTab('confirmation')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                selectedMilestoneTab === 'confirmation'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-bold'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white/40 font-medium'
              }`}
            >
              <Building2 size={13} className={selectedMilestoneTab === 'confirmation' ? 'text-[#34c759]' : ''} />
              <span>2. Nơi thực tập</span>
              {finalInternship && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedMilestoneTab === 'confirmation' ? 'bg-[#ebf9ee] text-[#1d833f]' : 'bg-black/[0.06] text-[#6e6e73]'
                }`}>
                  Đã chốt
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedMilestoneTab('advisor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                selectedMilestoneTab === 'advisor'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-bold'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white/40 font-medium'
              }`}
            >
              <UserCheck size={13} className={selectedMilestoneTab === 'advisor' ? 'text-[#af52de]' : ''} />
              <span>3. GVHD</span>
              {myAdvisors.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedMilestoneTab === 'advisor' ? 'bg-[#af52de]/15 text-[#8e44ad]' : 'bg-black/[0.06] text-[#6e6e73]'
                }`}>
                  {myAdvisors.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedMilestoneTab('report')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                selectedMilestoneTab === 'report'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-bold'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white/40 font-medium'
              }`}
            >
              <Award size={13} className={selectedMilestoneTab === 'report' ? 'text-[#ff9500]' : ''} />
              <span>4. Báo cáo & Điểm</span>
              {myGrade?.final_score !== null && myGrade?.final_score !== undefined ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedMilestoneTab === 'report' ? 'bg-[#fff8eb] text-[#b25e00]' : 'bg-black/[0.06] text-[#6e6e73]'
                }`}>
                  {Number(myGrade.final_score).toFixed(1)}
                </span>
              ) : finalReport ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedMilestoneTab === 'report' ? 'bg-[#ebf4ff] text-[#0071e3]' : 'bg-black/[0.06] text-[#6e6e73]'
                }`}>
                  Đã nộp
                </span>
              ) : null}
            </button>
          </div>

          {/* TAB 1: OVERVIEW (BENTO SHOWCASE - ALWAYS FULL, NEVER EMPTY) */}
          {selectedMilestoneTab === 'overview' && (
            <div className="space-y-6">
              {/* 1. HERO BENTO: Apple Report & Grade Showcase */}
              <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#0071e3] to-[#005bb5] text-white flex items-center justify-center shadow-xs">
                      <Award size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#1d1d1f] tracking-tight">Tiến độ Báo cáo & Điểm học phần</h2>
                      <p className="text-xs text-[#86868b] mt-0.5">Kỳ thực tập tốt nghiệp 2026 — Khoa Công nghệ Thông tin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {finalReport?.status === 'accepted' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ebf9ee] text-[#1d833f] border border-emerald-200/60">
                        <CheckCircle2 size={13} /> Đã chấp nhận báo cáo
                      </span>
                    ) : finalReport?.status === 'submitted' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ebf4ff] text-[#0071e3] border border-blue-200/60">
                        <CheckCircle2 size={13} /> Đã nộp báo cáo
                      </span>
                    ) : finalReportWindowStatus === 'open' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ebf9ee] text-[#1d833f] border border-emerald-200/60">
                        <span className="animate-ping w-1.5 h-1.5 rounded-full bg-emerald-500 mr-0.5" />
                        Đang mở nộp báo cáo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f5f5f7] text-[#86868b] border border-black/[0.04]">
                        Chưa nộp báo cáo
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Left Bento: File Document Preview Card */}
                  <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-[#fbfbfd] border border-black/[0.05] p-5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">Bản mềm Báo cáo (PDF)</span>
                        <span className="text-[11px] text-[#86868b]">
                          Đóng: {campaign.final_report_close_at ? formatGMT7(campaign.final_report_close_at) : '10/10/2026 23:59'}
                        </span>
                      </div>

                      {finalReport ? (
                        <div className="flex items-start gap-3.5 p-3.5 bg-white rounded-2xl border border-black/[0.05] shadow-xs">
                          <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100/80 text-red-600 flex flex-col items-center justify-center shrink-0">
                            <FileText size={20} />
                            <span className="text-[8px] font-extrabold uppercase mt-0.5">PDF</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#1d1d1f] truncate" title={finalReport.original_filename}>
                              {finalReport.original_filename}
                            </div>
                            <div className="text-[11px] text-[#86868b] mt-0.5 flex items-center gap-2">
                              <span>{formatBytes(Number(finalReport.file_size || 0))}</span>
                              <span>•</span>
                              <span>Nộp lúc {finalReport.submitted_at ? new Date(finalReport.submitted_at).toLocaleString('vi-VN') : '-'}</span>
                            </div>
                            {finalReport.lecturer_comment && (
                              <div className="mt-2 text-xs bg-[#fff8eb] border border-amber-200/60 rounded-xl p-2.5 text-[#b25e00]">
                                <span className="font-bold">Nhận xét GVHD:</span> {finalReport.lecturer_comment}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-2xl border border-dashed border-black/[0.1] text-center space-y-2">
                          <FileText size={28} className="mx-auto text-[#86868b]" />
                          <div className="text-xs font-bold text-[#1d1d1f]">Bạn chưa nộp file báo cáo tốt nghiệp</div>
                          <p className="text-[11px] text-[#86868b] max-w-sm mx-auto">
                            Chỉ cần in riêng trang Phiếu đánh giá để xin nhận xét, điểm và chữ ký + dấu công ty. Sau đó scan và gộp vào bản mềm (PDF) để nộp lên hệ thống.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      {finalReport && (
                        <button
                          type="button"
                          onClick={downloadMyFinalReport}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-black/[0.08] text-[#1d1d1f] hover:bg-[#f5f5f7] shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Download size={13} className="text-[#0071e3]" /> Tải PDF đã nộp
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedMilestoneTab('report')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                      >
                        {finalReport ? <RefreshCw size={13} /> : <Upload size={13} />}
                        {finalReport ? 'Nộp lại & Quản lý file' : 'Nộp báo cáo ngay'}
                      </button>
                    </div>
                  </div>

                  {/* Right Bento: Grade Ring & Score Breakdown */}
                  <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#fbfbfd] to-[#f5f5f7] border border-black/[0.05] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">Bảng điểm học phần</span>
                      <button
                        type="button"
                        onClick={() => navigate('/grades')}
                        className="text-[11px] font-bold text-[#0071e3] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        Xem chi tiết <ChevronRight size={12} />
                      </button>
                    </div>

                    {myGrade?.final_score !== null && myGrade?.final_score !== undefined ? (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-black/[0.06] shadow-sm flex flex-col items-center justify-center shrink-0">
                          <span className="text-2xl font-black text-[#1d1d1f] tracking-tight">{Number(myGrade.final_score).toFixed(1)}</span>
                          <span className="text-[10px] font-extrabold text-[#0071e3] uppercase">Thang 10</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#1d1d1f]">Điểm chữ: {getLetterGrade(myGrade.final_score).letter}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ebf9ee] text-[#1d833f]">
                              GPA {getLetterGrade(myGrade.final_score).gpa}
                            </span>
                          </div>
                          <div className="text-xs text-[#86868b] font-medium">
                            Đánh giá: {getLetterGrade(myGrade.final_score).label}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white/70 rounded-2xl border border-black/[0.04] text-center space-y-1">
                        <div className="text-xs font-bold text-[#1d1d1f]">Đang trong quá trình đánh giá</div>
                        <p className="text-[11px] text-[#86868b]">
                          GVHD và Hội đồng Khoa sẽ công bố điểm số chính thức sau khi chấm xong báo cáo.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-black/[0.04]">
                      <div className="p-2 bg-white rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] font-medium text-[#86868b]">Quá trình (20%)</div>
                        <div className="text-xs font-bold text-[#1d1d1f] mt-0.5">
                          {myGrade?.progress_score !== null && myGrade?.progress_score !== undefined ? Number(myGrade.progress_score).toFixed(1) : '—'}
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] font-medium text-[#86868b]">Báo cáo (20%)</div>
                        <div className="text-xs font-bold text-[#1d1d1f] mt-0.5">
                          {myGrade?.report_score !== null && myGrade?.report_score !== undefined ? Number(myGrade.report_score).toFixed(1) : '—'}
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] font-medium text-[#86868b]">Đơn vị (60%)</div>
                        <div className="text-xs font-bold text-[#1d1d1f] mt-0.5">
                          {myGrade?.company_score !== null && myGrade?.company_score !== undefined ? Number(myGrade.company_score).toFixed(1) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. BENTO 2-COLUMN: Official Placement & Assigned Advisor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Placement Bento */}
                <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#34c759] to-[#28a745] text-white flex items-center justify-center shadow-xs">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1d1d1f]">Nơi thực tập chính thức</h3>
                          <span className="text-[11px] text-[#86868b]">Đơn vị tiếp nhận sinh viên</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        finalInternship ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60' : 'bg-[#f5f5f7] text-[#86868b] border-black/[0.04]'
                      }`}>
                        {finalInternship ? 'Đã xác nhận' : 'Chưa xác nhận'}
                      </span>
                    </div>

                    {finalInternship ? (
                      <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/[0.04] space-y-2">
                        <div className="text-sm font-bold text-[#1d1d1f]">
                          {finalInternship.internship_type === 'school'
                            ? 'Thực tập tại trường (ĐH Công nghệ - ĐHQGHN)'
                            : (finalInternship.company_name === 'Công ty khác' ? `(Khác) ${finalInternship.other_company_name || ''}` : finalInternship.company_name)}
                        </div>
                        <div className="text-xs text-[#86868b] flex flex-wrap items-center gap-y-1 gap-x-3">
                          <span>Hình thức: <strong className="text-[#1d1d1f]">{finalInternship.internship_type === 'school' ? 'Nghiên cứu tại Trường' : 'Doanh nghiệp'}</strong></span>
                          {finalInternship.confirmed_at && (
                            <span>Ngày xác nhận: <strong className="text-[#1d1d1f]">{new Date(finalInternship.confirmed_at).toLocaleDateString('vi-VN')}</strong></span>
                          )}
                        </div>
                        {finalInternship.locked_at && (
                          <div className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                            <Lock size={11} /> Dữ liệu đã được Khoa khóa sổ chính thức
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-dashed border-black/[0.08] text-center space-y-1">
                        <div className="text-xs font-semibold text-[#1d1d1f]">Chưa có nơi thực tập chính thức</div>
                        <p className="text-[11px] text-[#86868b]">Sinh viên cần xác nhận đơn vị trúng tuyển trong đợt mở cổng.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedMilestoneTab('confirmation')}
                      className="text-xs font-bold text-[#34c759] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {finalInternship ? 'Xem chi tiết & Thay đổi' : 'Mở cổng xác nhận'} <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Advisor Bento */}
                <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#af52de] to-[#8e44ad] text-white flex items-center justify-center shadow-xs">
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1d1d1f]">Giảng viên hướng dẫn</h3>
                          <span className="text-[11px] text-[#86868b]">Đồng hành & đánh giá học phần</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        myAdvisors.length > 0
                          ? 'bg-[#af52de]/10 text-[#af52de] border-[#af52de]/20'
                          : advisorRequest
                          ? 'bg-[#fff8eb] text-[#b25e00] border-amber-200/60'
                          : 'bg-[#f5f5f7] text-[#86868b] border-black/[0.04]'
                      }`}>
                        {myAdvisors.length > 0 ? 'Đã phân công' : (advisorRequest ? 'Chờ duyệt' : 'Chưa phân công')}
                      </span>
                    </div>

                    {myAdvisors.length > 0 ? (
                      <div className="space-y-2">
                        {myAdvisors.map((a: any) => (
                          <div key={`${a.role}-${a.lecturer_id}`} className="p-3.5 rounded-2xl bg-[#fbfbfd] border border-black/[0.04] flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  a.role === 'primary' ? 'bg-[#af52de]/15 text-[#8e44ad]' : 'bg-black/[0.05] text-[#6e6e73]'
                                }`}>
                                  {a.role === 'primary' ? 'GV chính' : 'Đồng HD'}
                                </span>
                                <span className="text-xs font-bold text-[#1d1d1f]">{a.lecturer_name}</span>
                              </div>
                              {a.lecturer_email && (
                                <a href={`mailto:${a.lecturer_email}`} className="text-[11px] text-[#0071e3] hover:underline flex items-center gap-1 mt-1">
                                  <Mail size={11} /> {a.lecturer_email}
                                </a>
                              )}
                            </div>
                            {a.lecturer_email && (
                              <a
                                href={`mailto:${a.lecturer_email}?subject=[Thực tập tốt nghiệp] ${user?.name} - ${user?.student_id}`}
                                className="px-2.5 py-1 rounded-xl bg-white border border-black/[0.08] text-[11px] font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] shrink-0"
                              >
                                Email GV
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : advisorRequest ? (
                      <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/[0.04] space-y-1">
                        <div className="text-xs font-bold text-[#1d1d1f]">
                          {advisorRequest.request_type === 'faculty_assign' ? 'Yêu cầu Khoa phân công GVHD' : `Đề xuất: ${advisorRequest.lecturer_name || advisorRequest.lecturer_name_text}`}
                        </div>
                        <p className="text-[11px] text-[#86868b]">Trạng thái: {advisorRequest.status === 'approved' ? 'Đã được duyệt' : 'Đang chờ Khoa tiếp nhận'}</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-dashed border-black/[0.08] text-center space-y-1">
                        <div className="text-xs font-semibold text-[#1d1d1f]">Chưa có thông tin GVHD</div>
                        <p className="text-[11px] text-[#86868b]">Khoa sẽ phân công GVHD sau khi hoàn tất xác nhận nơi thực tập.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedMilestoneTab('advisor')}
                      className="text-xs font-bold text-[#af52de] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Xem phân công & Đăng ký GVHD <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. BENTO CARD: Registered Wishes Summary */}
              <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-black/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#0071e3] to-[#005bb5] text-white flex items-center justify-center shadow-xs">
                      <Send size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1d1d1f]">Danh sách nguyện vọng đã đăng ký</h3>
                      <span className="text-[11px] text-[#86868b]">Các đơn vị thực tập sinh viên đã nộp hồ sơ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasRegistered && canWithdrawRegistration && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMilestoneTab('registration');
                          startEditingPreferences();
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-black/[0.08] text-[#1d1d1f] hover:bg-[#f5f5f7] shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Edit2 size={12} className="text-[#0071e3]" /> Sửa nguyện vọng
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedMilestoneTab('registration')}
                      className="text-xs font-bold text-[#0071e3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Quản lý chi tiết <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {myRegs.length > 0 ? (
                  <div className="space-y-2.5">
                    {myRegs.map((reg: any, idx: number) => (
                      <div key={reg.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-[#fbfbfd] border border-black/[0.04] gap-3">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 shrink-0">
                            NV{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#1d1d1f] truncate">
                              {reg.company_name === 'Công ty khác' ? `(Tự liên hệ) ${reg.other_company_name || ''}` : reg.company_name}
                            </div>
                            {reg.review_comment && (
                              <div className="text-[11px] text-[#86868b] mt-0.5">
                                Nhận xét Khoa: <span className="text-[#1d1d1f]">{reg.review_comment}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-auto shrink-0 ${
                          reg.status === 'approved'
                            ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60'
                            : reg.status === 'rejected'
                            ? 'bg-[#fef2f2] text-[#dc2626] border-red-200/60'
                            : 'bg-[#fff8eb] text-[#b25e00] border-amber-200/60'
                        }`}>
                          {reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#fbfbfd] border border-dashed border-black/[0.08] text-center space-y-2">
                    <Send size={24} className="mx-auto text-[#86868b]" />
                    <div className="text-xs font-bold text-[#1d1d1f]">Bạn chưa đăng ký nguyện vọng thực tập nào</div>
                    <p className="text-[11px] text-[#86868b] max-w-sm mx-auto">
                      {registrationWindowStatus === 'open'
                        ? 'Đợt đăng ký đang mở. Hãy chuyển sang mục Nguyện vọng để chọn tối đa 5 nơi thực tập.'
                        : 'Đợt đăng ký nguyện vọng hiện đang đóng.'}
                    </p>
                    {registrationWindowStatus === 'open' && (
                      <button
                        type="button"
                        onClick={() => setSelectedMilestoneTab('registration')}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-xs cursor-pointer"
                      >
                        Đăng ký nguyện vọng ngay
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REGISTRATION (FULL WISH MANAGEMENT & ENTERPRISE CATALOG) */}
          {selectedMilestoneTab === 'registration' && (
            <div className="space-y-6">
              {/* Wish Status Card */}
              {hasRegistered ? (
                <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  {!editingPreferences ? (
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.04] mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#ebf9ee] text-[#1d833f] flex items-center justify-center shrink-0">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-[#1d1d1f]">Đã ghi nhận đăng ký nguyện vọng</h3>
                            <p className="text-xs text-[#86868b] mt-0.5">
                              Ngày ghi nhận: {myRegs[0]?.created_at ? new Date(myRegs[0].created_at).toLocaleDateString('vi-VN') : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={startEditingPreferences}
                            disabled={!canWithdrawRegistration}
                            title={canWithdrawRegistration ? 'Chỉnh sửa từng nguyện vọng trong thời gian Khoa mở đăng ký' : 'Chỉ được chỉnh sửa trong thời gian Khoa mở đăng ký'}
                            className={`bg-white text-[#1d1d1f] border border-black/[0.08] px-3.5 py-1.5 rounded-xl hover:bg-[#f5f5f7] text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${!canWithdrawRegistration ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Edit2 size={13} className="text-[#0071e3]" /> Sửa nguyện vọng
                          </button>
                          <button
                            type="button"
                            onClick={() => canWithdrawRegistration && setIsWithdrawModalOpen(true)}
                            disabled={!canWithdrawRegistration}
                            title={canWithdrawRegistration ? 'Hủy đăng ký trong thời gian Khoa mở đăng ký' : 'Chỉ được hủy đăng ký trong thời gian Khoa mở đăng ký'}
                            className={`bg-red-50 text-red-600 border border-red-200/60 px-3.5 py-1.5 rounded-xl hover:bg-red-100/80 text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${!canWithdrawRegistration ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Trash2 size={13} /> Hủy tất cả
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 mb-5">
                        {myRegs.map((reg: any, idx: number) => (
                          <div key={reg.id} className="flex items-start sm:items-center justify-between p-4 bg-[#fbfbfd] hover:bg-[#f5f5f7] border border-black/[0.04] rounded-2xl transition-colors">
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-extrabold text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-lg border border-[#0071e3]/20">NV{idx + 1}</span>
                                <span className="text-sm font-bold text-[#1d1d1f]">
                                  {reg.company_name === 'Công ty khác' ? `(Khác) ${reg.other_company_name || ''}` : reg.company_name}
                                </span>
                              </div>
                              {reg.review_comment && (
                                <div className="text-xs text-[#6e6e73] mt-2 bg-white border border-black/[0.06] rounded-xl p-2.5 shadow-xs inline-block max-w-full">
                                  <span className="font-semibold text-[#1d1d1f]">Nhận xét của Khoa:</span> {reg.review_comment}
                                </div>
                              )}
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shadow-xs shrink-0 ${
                              reg.status === 'approved'
                                ? 'bg-[#ebf9ee] text-[#1d833f] border-emerald-200/60'
                                : reg.status === 'rejected'
                                  ? 'bg-[#fef2f2] text-[#dc2626] border-red-200/60'
                                  : 'bg-[#fff8eb] text-[#b25e00] border-amber-200/60'
                            }`}>
                              {reg.status === 'pending' ? 'Chờ Duyệt' : reg.status === 'approved' ? 'Đã Duyệt' : 'Từ Chối'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {canWithdrawRegistration && (
                        <div className="flex items-start gap-2 bg-[#fbfbfd] rounded-2xl p-3.5 border border-black/[0.04] text-xs text-[#6e6e73] leading-relaxed">
                          <Clock size={14} className="mt-0.5 text-[#0071e3] shrink-0" />
                          <p>Trong thời gian Khoa mở đăng ký, sinh viên có thể chỉnh sửa từng nguyện vọng, thêm hoặc bỏ bớt nơi thực tập mà không cần hủy toàn bộ.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.04]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#ebf4ff] text-[#0071e3] flex items-center justify-center shrink-0">
                            <Edit2 size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-[#1d1d1f]">Chỉnh sửa nguyện vọng thực tập</h3>
                            <p className="text-xs text-[#86868b] mt-0.5">Sinh viên có thể chọn thêm hoặc bỏ bớt nơi thực tập từ danh sách bên dưới</p>
                          </div>
                        </div>
                        <div className="rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 px-3.5 py-1 text-xs font-bold text-[#0071e3] shadow-xs shrink-0">
                          Đang chọn {selectedWishCount}/5
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-200/60 bg-[#fff8eb] p-4 text-xs text-[#b25e00] leading-relaxed">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#b25e00]" />
                          <div><strong>Lưu ý:</strong> Sinh viên chỉ được phép xác nhận thực tập tại 1 trong 5 nơi này. Nếu không pass tất cả, sẽ phải thực tập ở Trường.</div>
                        </div>
                      </div>

                      {selectedPreferencePreview.length > 0 && (
                        <div className="rounded-2xl border border-black/[0.05] bg-[#fbfbfd] p-4">
                          <div className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#86868b]">Nguyện vọng sau khi chỉnh sửa</div>
                          <ol className="space-y-2 text-xs text-[#1d1d1f]">
                            {selectedPreferencePreview.map((item, idx) => (
                              <li key={item.key} className="flex items-center gap-2">
                                <span className="font-bold text-[#0071e3] bg-[#0071e3]/10 border border-[#0071e3]/20 px-1.5 py-0.5 rounded-md text-[10px]">NV{idx + 1}</span>
                                <span className="font-semibold text-[#1d1d1f]">{item.name}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-black/[0.04] pt-4">
                        <button
                          type="button"
                          onClick={cancelEditingPreferences}
                          disabled={savingPreferences}
                          className="bg-white text-[#1d1d1f] border border-black/[0.08] px-4 py-2 rounded-xl hover:bg-[#f5f5f7] text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          Hủy chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={savePreferenceEdits}
                          disabled={savingPreferences}
                          className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={14} /> {savingPreferences ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`rounded-3xl border p-6 ${
                  registrationWindowStatus === 'open'
                    ? 'border-[#0071e3]/20 bg-[#ebf4ff]/40 text-[#005bb5]'
                    : 'border-black/[0.06] bg-white text-[#6e6e73]'
                }`}>
                  <h3 className="font-bold text-sm text-[#1d1d1f] mb-1">Trạng thái đăng ký nguyện vọng</h3>
                  <p className="text-xs leading-relaxed">
                    {registrationWindowStatus === 'open'
                      ? 'Bạn chưa đăng ký công ty nào. Vui lòng tick chọn tối đa 5 nơi thực tập từ danh sách bên dưới rồi bấm Đăng ký.'
                      : registrationWindowStatus === 'not_open_yet'
                      ? 'Bạn chưa có đăng ký nào được ghi nhận. Đợt đăng ký hiện chưa mở.'
                      : 'Bạn chưa có đăng ký nào trong hệ thống. Đợt đăng ký đã đóng, vui lòng liên hệ Khoa nếu bạn cần hỗ trợ.'}
                  </p>
                </div>
              )}

              {/* Enterprise Catalog Table Area */}
              <div className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="px-6 py-4.5 border-b border-black/[0.04] flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-[#fbfbfd]">
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-[#1d1d1f] text-sm">Danh mục nơi thực tập tuyển dụng</h2>
                    {(!hasRegistered || editingPreferences) && selectedWishCount > 0 && (
                      <span className="text-xs bg-[#0071e3]/10 text-[#0071e3] px-2.5 py-0.5 rounded-full font-bold">
                        Đã chọn: {selectedWishCount}/5
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm nơi thực tập..."
                      className="px-3.5 py-2 border border-black/[0.08] rounded-xl text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all w-full sm:w-64 bg-white font-medium text-[#1d1d1f]"
                    />
                    {editingPreferences ? (
                      <>
                        <button
                          type="button"
                          onClick={cancelEditingPreferences}
                          disabled={savingPreferences}
                          className="bg-white text-[#1d1d1f] border border-black/[0.08] px-3.5 py-2 rounded-xl hover:bg-[#f5f5f7] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={savePreferenceEdits}
                          disabled={savingPreferences || selectedWishCount === 0}
                          className="bg-[#34c759] hover:bg-[#28a745] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {savingPreferences ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </>
                    ) : !hasRegistered && (
                      <>
                        {registrationWindowStatus !== 'open' ? (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f5f5f7] text-[#86868b] border border-black/[0.04] cursor-not-allowed shadow-none whitespace-nowrap"
                          >
                            <Clock size={13} className="inline mr-1" />
                            {registrationWindowStatus === 'not_open_yet' ? 'Chưa mở' : 'Đã đóng'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={selectedWishCount === 0}
                            onClick={() => setRegisterModalOpen(true)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap cursor-pointer ${
                              selectedWishCount === 0 ? 'bg-[#f5f5f7] text-[#86868b] cursor-not-allowed' : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
                            }`}
                          >
                            Đăng ký ({selectedWishCount})
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left min-w-[700px]">
                    <thead>
                      <tr className="bg-[#fbfbfd] text-[#86868b] text-[11px] uppercase tracking-wider font-bold border-b border-black/[0.04]">
                        <th className="px-4 py-3 text-center w-14">Chọn</th>
                        <th
                          className="px-6 py-3 cursor-pointer hover:bg-black/[0.02] transition-colors"
                          onClick={() => requestSort('name')}
                        >
                          <div className="flex items-center gap-1 text-[#1d1d1f]">Nơi thực tập {getSortIcon('name')}</div>
                        </th>
                        <th className="px-6 py-3">Địa chỉ</th>
                        <th
                          className="px-6 py-3 text-center cursor-pointer hover:bg-black/[0.02] transition-colors"
                          onClick={() => requestSort('slots')}
                        >
                          <div className="flex items-center justify-center gap-1 text-[#1d1d1f]">Chỉ tiêu {getSortIcon('slots')}</div>
                        </th>
                        <th
                          className="px-6 py-3 text-center cursor-pointer hover:bg-black/[0.02] transition-colors"
                          onClick={() => requestSort('applicant_count')}
                        >
                          <div className="flex items-center justify-center gap-1 text-[#1d1d1f]">Ứng viên {getSortIcon('applicant_count')}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-black/[0.04]">
                      {paginatedCompanies.map((company) => {
                        const isSelected = selectedCompanies.has(company.id);
                        const isRegistered = myRegs.some((r: any) => r.company_id === company.id);
                        return (
                          <tr key={company.id} className={`hover:bg-[#fbfbfd] transition-colors ${isSelected ? 'bg-[#ebf4ff]/50' : ''} ${isRegistered ? 'bg-[#ebf9ee]/40' : ''}`}>
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected || (!editingPreferences && isRegistered)}
                                disabled={(!editingPreferences && hasRegistered) || (!isSelected && selectedWishCount >= 5)}
                                onChange={() => toggleCompanySelection(company.id)}
                                className="w-4 h-4 text-[#0071e3] rounded border-black/[0.2] focus:ring-[#0071e3] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </td>
                            <td className="px-6 py-3.5 font-bold text-[#0071e3]">
                              <button
                                type="button"
                                onClick={() => navigate(`/company/${company.id}`)}
                                className="text-[#0071e3] hover:underline flex items-center gap-1 text-left cursor-pointer"
                              >
                                {company.name} <ChevronRight size={13} className="opacity-60" />
                              </button>
                            </td>
                            <td className="px-6 py-3.5 text-[#6e6e73]">{company.address}</td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="font-bold text-[#1d1d1f]">{company.slots}</span>
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              <span className="font-bold text-[#1d1d1f]">{company.applicant_count ?? 0}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {sortedCompanies.length === 0 && !loading && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-[#86868b] text-xs">
                            Không tìm thấy doanh nghiệp phù hợp.
                          </td>
                        </tr>
                      )}
                      {loading && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-[#86868b] text-xs">
                            Đang tải danh sách doanh nghiệp...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {editingPreferences && hasSelectedKhac && (
                  <div className="border-t border-amber-200/60 bg-[#fff8eb]/60 px-6 py-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#b25e00]">Thông tin công ty tự liên hệ</h3>
                        <p className="mt-0.5 text-xs text-[#8a4700]">Mỗi công ty tự liên hệ được tính là một nguyện vọng riêng trong giới hạn 5 nơi thực tập.</p>
                      </div>
                      {Array.from(selectedCompanies).filter(id => id !== khacCompany?.id).length + otherCompanies.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setOtherCompanies(prev => [...prev, { name: '', role: '', contact_name: '', contact_phone: '', contact_email: '', note: '' }])}
                          className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-[#b25e00] hover:bg-[#fff8eb]"
                        >
                          <Plus size={13} /> Thêm công ty
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {otherCompanies.map((otherCompany: any, index) => (
                        <div key={otherCompany.id || index} className="rounded-2xl border border-amber-200/80 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-xs font-bold text-[#b25e00]">Công ty tự liên hệ {index + 1}</h4>
                            {otherCompanies.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setOtherCompanies(prev => prev.filter((_, i) => i !== index))}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={12} /> Xóa
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Tên công ty *</label>
                            <input
                              list="edit-it-companies-datalist"
                              value={otherCompany.name || ''}
                              onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, name: e.target.value } : c))}
                              className="w-full border border-black/[0.08] rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-[#fbfbfd] font-semibold text-[#1d1d1f]"
                              placeholder="Tên công ty"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Người liên hệ *</label>
                              <input
                                value={otherCompany.contact_name || ''}
                                onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, contact_name: e.target.value } : c))}
                                className="w-full border border-black/[0.08] rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-[#fbfbfd] font-semibold text-[#1d1d1f]"
                                placeholder="Tên người liên hệ"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Điện thoại *</label>
                              <input
                                value={otherCompany.contact_phone || ''}
                                onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, contact_phone: e.target.value } : c))}
                                className="w-full border border-black/[0.08] rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-[#fbfbfd] font-semibold text-[#1d1d1f]"
                                placeholder="Số điện thoại"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1">Email *</label>
                              <input
                                type="email"
                                value={otherCompany.contact_email || ''}
                                onChange={e => setOtherCompanies(prev => prev.map((c: any, i: number) => i === index ? { ...c, contact_email: e.target.value } : c))}
                                className="w-full border border-black/[0.08] rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-[#fbfbfd] font-semibold text-[#1d1d1f]"
                                placeholder="email@company.com"
                              />
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
              </div>
            </div>
          )}

          {/* TAB 3: CONFIRMATION (OFFICIAL PLACEMENT CONFIRMATION) */}
          {selectedMilestoneTab === 'confirmation' && (
            <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.04]">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${finalInternship ? 'bg-[#ebf9ee] text-[#1d833f]' : 'bg-[#f5f5f7] text-[#86868b]'}`}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1d1d1f]">Xác nhận nơi thực tập chính thức</h3>
                    <p className="text-xs text-[#86868b] mt-0.5">Xác nhận nơi trúng tuyển chính thức để Khoa phân công GVHD và quản lý điểm số</p>
                  </div>
                </div>
                {finalInternship && (
                  <span className="text-xs font-bold px-3 py-1 bg-[#ebf9ee] text-[#1d833f] border border-emerald-200/60 rounded-full shadow-xs">
                    Đã Xác Nhận
                  </span>
                )}
              </div>

              {finalInternship ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Đơn vị tiếp nhận</span>
                      <span className="text-sm font-bold text-[#1d1d1f] mt-1.5 block">
                        {finalInternship.internship_type === 'school' ? 'Thực tập tại trường' : (finalInternship.company_name === 'Công ty khác' ? `Công ty khác: ${finalInternship.other_company_name || ''}` : finalInternship.company_name)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Giảng viên hướng dẫn</span>
                      {myAdvisors.length > 0 ? (
                        <div className="mt-1.5 space-y-1.5">
                          {myAdvisors.map((a: any) => (
                            <div key={`${a.role}-${a.lecturer_id}`} className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${a.role === 'primary' ? 'bg-[#af52de]/15 text-[#8e44ad]' : 'bg-black/[0.05] text-[#6e6e73]'}`}>
                                {a.role === 'primary' ? 'GV chính' : 'Đồng HD'}
                              </span>
                              <span>{a.lecturer_name}</span>
                            </div>
                          ))}
                        </div>
                      ) : finalInternship.school_lecturer ? (
                        <span className="text-xs font-bold text-[#1d1d1f] mt-1.5 block">{finalInternship.school_lecturer}</span>
                      ) : (
                        <span className="text-xs text-[#86868b] italic mt-1.5 block">Khoa sẽ phân công</span>
                      )}
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#86868b] tracking-wider">Thời gian xác nhận</span>
                      <span className="text-sm font-bold text-[#1d1d1f] mt-1.5 block">
                        {finalInternship.confirmed_at ? new Date(finalInternship.confirmed_at).toLocaleString('vi-VN') : '-'}
                      </span>
                      {finalInternship.locked_at && (
                        <div className="text-red-600 font-bold text-[10px] flex items-center gap-1 mt-1">
                          <Lock size={11} /> Khoa đã khóa dữ liệu xác nhận.
                        </div>
                      )}
                    </div>
                  </div>

                  {!finalInternship.locked_at && confirmationWindowStatus === 'open' && (
                    <div className="border-t border-black/[0.04] pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openFinalConfirm('company')}
                        disabled={approvedFinalOptions.length === 0}
                        className="bg-white text-[#1d1d1f] border border-black/[0.08] px-4 py-2 rounded-xl hover:bg-[#f5f5f7] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                      >
                        {finalInternship.internship_type === 'company' ? 'Cập nhật công ty' : 'Chuyển sang công ty'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openFinalConfirm('school')}
                        className="bg-white text-[#1d1d1f] border border-black/[0.08] px-4 py-2 rounded-xl hover:bg-[#f5f5f7] text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                      >
                        {finalInternship.internship_type === 'school' ? 'Cập nhật thực tập tại trường' : 'Chuyển sang thực tập tại trường'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-[#6e6e73] leading-relaxed">
                    Sau khi có kết quả tuyển dụng từ doanh nghiệp hoặc trường học, sinh viên bắt buộc phải chọn và xác nhận một nơi thực tập chính thức để hệ thống ghi nhận làm căn cứ phân công giảng viên và nhập điểm học phần.
                  </p>
                  {confirmationWindowStatus !== 'open' && (
                    <div className="rounded-2xl bg-[#fff8eb] border border-amber-200/60 p-3.5 flex items-start gap-2.5 text-xs text-[#b25e00]">
                      <Clock size={15} className="shrink-0 mt-0.5 text-[#b25e00]" />
                      <div>
                        {confirmationWindowStatus === 'not_open_yet'
                          ? `Đợt xác nhận chưa mở. Thời gian mở: ${campaign.confirmation_open_at ? formatGMT7(campaign.confirmation_open_at) : '—'} (GMT+7).`
                          : `Đợt xác nhận đã kết thúc vào lúc: ${campaign.confirmation_close_at ? formatGMT7(campaign.confirmation_close_at) : '—'} (GMT+7).`}
                      </div>
                    </div>
                  )}
                  <div className="border-t border-black/[0.04] pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => openFinalConfirm('company')}
                      disabled={confirmationWindowStatus !== 'open' || approvedFinalOptions.length === 0}
                      className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                    >
                      Xác nhận công ty
                    </button>
                    <button
                      type="button"
                      onClick={() => openFinalConfirm('school')}
                      disabled={confirmationWindowStatus !== 'open'}
                      className="bg-[#1d1d1f] hover:bg-[#2c2c2e] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                    >
                      Thực tập tại trường
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADVISOR (GVHD MANAGEMENT) */}
          {selectedMilestoneTab === 'advisor' && (
            <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#af52de]/10 text-[#af52de] flex items-center justify-center shrink-0">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1d1d1f]">Giảng viên hướng dẫn học phần</h3>
                    <p className="text-xs text-[#86868b] mt-0.5">Thông tin GVHD theo dõi, hướng dẫn chuyên môn và chấm điểm báo cáo</p>
                  </div>
                </div>
                {canEditAdvisorRequest && (
                  <button
                    type="button"
                    onClick={() => setIsAdvisorEditOpen(prev => !prev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-black/[0.08] text-[#1d1d1f] hover:bg-[#f5f5f7] shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  >
                    <Edit2 size={12} className="text-[#af52de]" /> {isAdvisorEditOpen ? 'Đóng chỉnh sửa' : 'Đăng ký / Đổi GVHD'}
                  </button>
                )}
              </div>

              {hasAdvisorSelection ? (
                <div className="rounded-2xl border border-black/[0.05] bg-[#fbfbfd] p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold text-[#86868b] tracking-wider">GVHD chính thức</span>
                        {advisorRequest && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            advisorRequest.status === 'approved' ? 'bg-[#ebf9ee] text-[#1d833f] border border-emerald-200/60' : 'bg-[#fff8eb] text-[#b25e00] border border-amber-200/60'
                          }`}>
                            {advisorRequest.status === 'approved' ? 'Đã duyệt' : 'Chờ Khoa tiếp nhận'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-[#1d1d1f]">
                        {myAdvisors.length > 0
                          ? myAdvisors.map((a: any) => `${a.role === 'primary' ? 'Chính' : 'Đồng'}: ${a.lecturer_name}`).join('; ')
                          : advisorRequest?.request_type === 'faculty_assign'
                            ? 'Khoa sẽ phân công'
                            : advisorRequest?.lecturer_name || advisorRequest?.lecturer_name_text || '-'}
                      </div>
                      {myAdvisors.length > 0 && myAdvisors.some((a: any) => a.lecturer_email) && (
                        <div className="mt-2 text-xs space-y-1">
                          {myAdvisors.map((a: any) => a.lecturer_email ? (
                            <div key={a.lecturer_email} className="flex items-center gap-2">
                              <span className="text-[#86868b]">{a.lecturer_name}:</span>
                              <a href={`mailto:${a.lecturer_email}`} className="text-[#0071e3] hover:underline font-medium">
                                {a.lecturer_email}
                              </a>
                            </div>
                          ) : null)}
                        </div>
                      )}
                    </div>
                    {canEditAdvisorRequest && (
                      <button
                        type="button"
                        onClick={cancelAdvisorRequest}
                        disabled={advisorRequestSaving}
                        className="bg-white text-red-600 border border-red-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        Hủy đăng ký
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#fbfbfd] border border-dashed border-black/[0.08] text-center space-y-2">
                  <UserCheck size={24} className="mx-auto text-[#86868b]" />
                  <div className="text-xs font-bold text-[#1d1d1f]">Chưa có thông tin Giảng viên hướng dẫn</div>
                  <p className="text-[11px] text-[#86868b] max-w-md mx-auto">
                    Nếu bạn đã trao đổi và được giảng viên đồng ý, hãy chọn Đăng ký GVHD để Khoa ghi nhận. Hoặc bạn có thể chọn để Khoa tự phân công.
                  </p>
                </div>
              )}

              {showAdvisorForm && (
                <form onSubmit={submitAdvisorRequest} className="rounded-2xl border border-black/[0.06] bg-[#fbfbfd] p-5 space-y-4">
                  <div className="text-xs font-bold text-[#1d1d1f]">Biểu mẫu đăng ký giảng viên hướng dẫn</div>
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
                      className="px-3.5 py-2 border border-black/[0.08] rounded-xl text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-white font-semibold text-[#1d1d1f] cursor-pointer"
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
                      className="px-3.5 py-2 border border-black/[0.08] rounded-xl text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-white font-semibold text-[#1d1d1f] disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <input
                      value={advisorRequestForm.co_lecturer_name}
                      onChange={e => setAdvisorRequestForm({ ...advisorRequestForm, co_lecturer_name: e.target.value })}
                      disabled={!advisorRequestForm.request_type}
                      list="advisor-co-lecturers"
                      placeholder="Nhập/chọn đồng hướng dẫn (nếu có)"
                      className="px-3.5 py-2 border border-black/[0.08] rounded-xl text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-white font-semibold text-[#1d1d1f] disabled:bg-slate-100 disabled:text-slate-400"
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
                    placeholder="Ghi chú thêm nếu có (ví dụ: thông tin đã trao đổi với GV, hướng đề tài...)"
                    className="w-full px-3.5 py-2 border border-black/[0.08] rounded-xl text-xs focus:ring-2 focus:ring-[#0071e3]/20 focus:border-[#0071e3] outline-none transition-all bg-white resize-y text-[#1d1d1f]"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="submit"
                      disabled={advisorRequestSaving || !canEditAdvisorRequest}
                      className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {advisorRequestSaving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} {hasAdvisorSelection ? 'Lưu thay đổi' : 'Gửi đăng ký GVHD'}
                    </button>
                    {hasAdvisorSelection && (
                      <button
                        type="button"
                        onClick={() => setIsAdvisorEditOpen(false)}
                        disabled={advisorRequestSaving}
                        className="bg-white text-[#1d1d1f] border border-black/[0.08] px-4 py-2 rounded-xl hover:bg-[#f5f5f7] text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Hủy chỉnh sửa
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 5: REPORT & GRADES (NỘP BÁO CÁO & XEM BẢNG ĐIỂM) */}
          {selectedMilestoneTab === 'report' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-black/[0.04]">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#ff9500] to-[#e67e22] text-white flex items-center justify-center shadow-xs">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#1d1d1f]">Báo cáo thực tập tốt nghiệp (Bản mềm PDF)</h3>
                        <p className="text-xs text-[#86868b] mt-0.5">Thời hạn: {campaign.final_report_open_at ? formatGMT7(campaign.final_report_open_at) : '—'} đến {campaign.final_report_close_at ? formatGMT7(campaign.final_report_close_at) : '—'} (GMT+7)</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {finalReport && (
                      <button
                        type="button"
                        onClick={downloadMyFinalReport}
                        className="px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 whitespace-nowrap bg-white text-[#1d1d1f] border border-black/[0.08] hover:bg-[#f5f5f7]"
                      >
                        <Download size={14} className="text-[#0071e3]" /> Tải PDF đã nộp
                      </button>
                    )}
                    <label className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 whitespace-nowrap ${
                      finalReportWindowStatus === 'open' && !uploadingReport ? 'bg-[#0071e3] text-white cursor-pointer hover:bg-[#0077ed]' : 'bg-[#f5f5f7] text-[#86868b] cursor-not-allowed border border-black/[0.04]'
                    }`}>
                      {uploadingReport ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                      {finalReport ? 'Nộp lại bản mềm PDF' : 'Chọn file PDF nộp'}
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={finalReportWindowStatus !== 'open' || uploadingReport}
                        className="hidden"
                        onChange={uploadFinalReport}
                      />
                    </label>
                  </div>
                </div>

                {finalReport ? (
                  <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/[0.04] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-xs font-bold text-[#1d1d1f]">{finalReport.original_filename}</span>
                        <span className="text-[11px] text-[#86868b]">({formatBytes(Number(finalReport.file_size || 0))})</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ebf9ee] text-[#1d833f] border border-emerald-200/60">
                        {reportStatusLabel(finalReport.status)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#86868b]">
                      Thời gian nộp: {finalReport.submitted_at ? new Date(finalReport.submitted_at).toLocaleString('vi-VN') : '-'}
                    </div>
                    {finalReport.lecturer_comment && (
                      <div className="p-3 bg-[#fff8eb] border border-amber-200/60 rounded-xl text-xs text-[#b25e00]">
                        <span className="font-bold">Nhận xét từ GVHD:</span> {finalReport.lecturer_comment}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#fbfbfd] border border-dashed border-black/[0.08] text-center space-y-2">
                    <FileText size={24} className="mx-auto text-[#86868b]" />
                    <div className="text-xs font-bold text-[#1d1d1f]">Chưa có file báo cáo nào được nộp</div>
                    <p className="text-[11px] text-[#86868b] max-w-sm mx-auto">
                      Vui lòng nộp báo cáo bằng định dạng PDF (tối đa 10 MB). Chỉ cần in riêng trang Phiếu đánh giá để xin nhận xét và dấu công ty, scan và gộp vào file PDF trước khi nộp.
                    </p>
                  </div>
                )}
              </div>

              {/* Grade Overview Bento in Report tab */}
              <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-[#1d1d1f]">Bảng điểm chi tiết học phần</h4>
                  <p className="text-xs text-[#86868b] mt-0.5">
                    {myGrade?.final_score !== null && myGrade?.final_score !== undefined
                      ? `Điểm tổng kết: ${Number(myGrade.final_score).toFixed(1)} (${getLetterGrade(myGrade.final_score).letter}) — GPA: ${getLetterGrade(myGrade.final_score).gpa}`
                      : 'Hội đồng và GVHD đang chấm điểm báo cáo của bạn.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/grades')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  Mở Bảng Điểm Học Phần
                </button>
              </div>
            </div>
          )}
        </div>
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
