import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Users, CheckCircle2, LayoutDashboard, Building2, FileText, Shield, Clock, CircleHelp, Settings, GraduationCap } from 'lucide-react';
import { API_BASE, cachedJsonFetch } from '../../../shared';

export function AdminDashboard({ token, user: propUser }: { token: string; user?: any }) {
  const navigate = useNavigate();
  const user = propUser || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null);
  const [stats, setStats] = useState<any>({ registeredCount: 0, confirmedCount: 0, reportCount: 0, gradedCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    cachedJsonFetch<any>(`${API_BASE}/api/admin/dashboard-stats`, {
      cacheKey: 'admin:dashboard-stats:v2',
      ttlMs: 30_000,
      headers: { Authorization: `Bearer ${token}` },
      forceRefresh: true,
    })
      .then(data => {
        if (data && typeof data === 'object') setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [token]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {user && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              {user.picture ? (
                <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                  <Shield size={26} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1 flex items-center gap-1.5">
                  <Shield size={12} className="text-purple-600" /> Quản trị viên hệ thống
                </p>
                <h2 className="text-2xl font-bold text-slate-900 break-words">{user.name}</h2>
                <p className="text-sm text-slate-500 mt-1 break-all">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => navigate('/profile')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
              >
                <UserIcon size={14} /> Cập nhật hồ sơ
              </button>
              <button
                onClick={() => navigate('/plan')}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
              >
                <FileText size={14} className="text-slate-500" /> Kế hoạch triển khai
              </button>
              <button
                onClick={() => navigate('/faq')}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow"
              >
                <CircleHelp size={14} className="text-slate-500" /> Xem FAQ
              </button>
            </div>
          </div>

          {/* Thống kê Tổng quan Hệ thống */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Số SV đăng ký</span>
                  <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
                    <Users size={18} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-slate-800">{loadingStats ? '—' : stats.registeredCount}</span>
                  <span className="text-[11px] font-medium text-slate-400">tổng số</span>
                </div>
              </div>

              <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Số SV xác nhận</span>
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-blue-700">{loadingStats ? '—' : stats.confirmedCount}</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {stats.registeredCount ? `${Math.round((stats.confirmedCount / stats.registeredCount) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-amber-600 text-xs font-semibold uppercase tracking-wider">Số SV nộp báo cáo</span>
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    <FileText size={18} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-amber-700">{loadingStats ? '—' : stats.reportCount}</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {stats.registeredCount ? `${Math.round((stats.reportCount / stats.registeredCount) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-emerald-600 text-xs font-semibold uppercase tracking-wider">Số SV có điểm</span>
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <GraduationCap size={18} />
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-3xl font-bold text-emerald-700">{loadingStats ? '—' : stats.gradedCount}</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {stats.registeredCount ? `${Math.round((stats.gradedCount / stats.registeredCount) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick navigation modules grid */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  title: 'Quản lý Đăng ký',
                  desc: 'Xem, lọc, duyệt danh sách nguyện vọng đăng ký thực tập của sinh viên.',
                  path: '/admin/registrations',
                  icon: <LayoutDashboard className="text-sky-600" size={20} />,
                  color: 'hover:border-sky-300 hover:bg-sky-50/30'
                },
                {
                  title: 'Quản lý Sinh viên',
                  desc: 'Import, xuất dữ liệu và cập nhật thông tin sinh viên.',
                  path: '/admin/students',
                  icon: <Users className="text-blue-600" size={20} />,
                  color: 'hover:border-blue-300 hover:bg-blue-50/30'
                },
                {
                  title: 'Quản lý Giảng viên',
                  desc: 'Danh sách và thông tin các giảng viên hướng dẫn.',
                  path: '/admin/lecturers',
                  icon: <UserIcon className="text-teal-600" size={20} />,
                  color: 'hover:border-teal-300 hover:bg-teal-50/30'
                },
                {
                  title: 'Quản lý Công ty',
                  desc: 'Danh sách doanh nghiệp tiếp nhận thực tập.',
                  path: '/admin/companies',
                  icon: <Building2 className="text-orange-600" size={20} />,
                  color: 'hover:border-orange-300 hover:bg-orange-50/30'
                },
                {
                  title: 'Phân công GVHD',
                  desc: 'Phân giảng viên hướng dẫn chính & đồng hướng dẫn.',
                  path: '/admin/advisors',
                  icon: <Settings className="text-emerald-600" size={20} />,
                  color: 'hover:border-emerald-300 hover:bg-emerald-50/30'
                },
                {
                  title: 'Báo cáo',
                  desc: 'Theo dõi, duyệt báo cáo thực tập của sinh viên.',
                  path: '/admin/reports',
                  icon: <FileText className="text-indigo-600" size={20} />,
                  color: 'hover:border-indigo-300 hover:bg-indigo-50/30'
                },
                {
                  title: 'Bảng điểm',
                  desc: 'Tổng hợp điểm định kỳ, final và đánh giá công ty.',
                  path: '/admin/grades',
                  icon: <CheckCircle2 className="text-green-600" size={20} />,
                  color: 'hover:border-green-300 hover:bg-green-50/30'
                },
                {
                  title: 'CSDL Thẩm định',
                  desc: 'Duyệt tự động các công ty sinh viên tự liên hệ.',
                  path: '/admin/approved-companies',
                  icon: <Shield className="text-purple-600" size={20} />,
                  color: 'hover:border-purple-300 hover:bg-purple-50/30'
                },
                {
                  title: 'Thông báo và Email',
                  desc: 'Lịch sử thông báo, gửi email hàng loạt cho công ty.',
                  path: '/admin/notifications',
                  icon: <Clock className="text-amber-600" size={20} />,
                  color: 'hover:border-amber-300 hover:bg-amber-50/30'
                },
              {
                title: 'Cài đặt hệ thống',
                desc: 'Đồng bộ Google Sheets, chỉnh năm học, các đợt đk.',
                path: '/admin/settings',
                icon: <Settings className="text-slate-600" size={20} />,
                color: 'hover:border-slate-400 hover:bg-slate-50/30'
              },
              {
                title: 'Hướng dẫn GV',
                desc: 'Chỉnh nội dung hướng dẫn sử dụng hiển thị cho giảng viên.',
                path: '/admin/lecturer-guide',
                icon: <CircleHelp className="text-indigo-600" size={20} />,
                color: 'hover:border-indigo-300 hover:bg-indigo-50/30'
              },
              {
                title: 'Quản trị viên',
                desc: 'Quản lý phân quyền tài khoản quản trị hệ thống.',
                  path: '/admin/admins',
                  icon: <Shield className="text-pink-600" size={20} />,
                  color: 'hover:border-pink-300 hover:bg-pink-50/30'
                }
              ].map(item => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`text-left p-5 rounded-2xl border border-slate-200/60 bg-slate-50/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-50/40 shadow-sm cursor-pointer flex flex-col justify-between min-h-[120px] ${item.color}`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="font-bold text-xs text-slate-800">{item.title}</span>
                    <span className="p-1.5 bg-white rounded-xl shadow-sm border border-slate-100">{item.icon}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2.5 font-medium line-clamp-2 leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
