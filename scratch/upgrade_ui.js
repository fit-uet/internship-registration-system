import fs from 'fs';
import path from 'path';

const file = '/Users/tuyenkv/Documents/internship-registration-system/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

function doReplace(label, target, replacement) {
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    console.log(`[Success] ${label}`);
    return true;
  } else {
    console.error(`[Error] ${label} - Target not found!`);
    return false;
  }
}

// 1. Loading screen and outer toolbar container
const t1 = `  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">`;

const r1 = `  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">`;

doReplace('AdminPanel load and container', t1, r1);

// 2. Toolbar buttons and fields
const t2 = `        <div className="flex items-center gap-4">
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
        </div>`;

const r2 = `        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/')} className="bg-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1 whitespace-nowrap transition-colors">&larr; Quay lại</button>
          <span title="Gửi cùng một nhận xét cho toàn bộ danh sách đăng ký đang được lọc ở bảng bên dưới.">
            <button
              onClick={handleSendFilteredRegistrationComment}
              disabled={filteredRegistrations.length === 0}
              className="bg-amber-50 text-amber-600 border border-amber-200 px-3.5 py-2 rounded-xl hover:bg-amber-100/80 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 transition-colors"
            >
              <Send size={14} /> Gửi nhận xét
            </button>
          </span>
          <button
            onClick={handleApproveAll}
            className="bg-indigo-650 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-750 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <CheckCircle2 size={14} /> Duyệt tất cả
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1 xl:justify-end">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Tìm sinh viên, lớp, công ty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-semibold shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Tất cả học phần</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-semibold shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>

            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="bg-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Download size={14} /> Xuất dữ liệu <ChevronDown size={12} />
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
              className="bg-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap disabled:opacity-70 disabled:cursor-wait transition-colors"
            >
              {savingToSheet ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {savingToSheet ? 'Đang lưu...' : 'Lưu Google Sheets'}
            </button>
          </div>
        </div>`;

doReplace('AdminPanel toolbar items', t2, r2);

// 3. 6 colored stats cards
const t3 = `      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <button type="button" onClick={clearRegistrationFilters} className={\`text-left bg-white p-5 rounded-xl border shadow-sm flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md \${!searchTerm && !filterCourse && !filterStatus ? 'border-slate-400 ring-2 ring-slate-100' : 'border-slate-200'}\`}>
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
        <button type="button" onClick={() => applyRegistrationStatusFilter('pending')} className={\`text-left bg-orange-50 p-5 rounded-xl border shadow-sm flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md \${filterStatus === 'pending' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-orange-100'}\`}>
          <span className="text-orange-600 text-sm font-medium mb-1">Chờ duyệt</span>
          <span className="text-3xl font-bold text-orange-700">{pendingRegistrations}</span>
        </button>
        <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm flex flex-col">
          <span className="text-green-600 text-sm font-medium mb-1">Đã duyệt</span>
          <span className="text-3xl font-bold text-green-700">{approvedRegistrations}</span>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm flex flex-col">
          <span className="text-red-650 text-sm font-medium mb-1">Từ chối</span>
          <span className="text-3xl font-bold text-red-700">{rejectedRegistrations}</span>
        </div>
      </div>`;

const r3 = `      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <button
          type="button"
          onClick={clearRegistrationFilters}
          className={\`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md \${!searchTerm && !filterCourse && !filterStatus ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-200'}\`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tổng nguyện vọng</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{totalRegistrations}</span>
        </button>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Sinh viên đăng ký</span>
            <Users size={16} className="text-indigo-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{totalStudents}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Công ty</span>
            <Building2 size={16} className="text-cyan-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{totalCompanies}</span>
        </div>
        <button
          type="button"
          onClick={() => applyRegistrationStatusFilter('pending')}
          className={\`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md \${filterStatus === 'pending' ? 'border-amber-500 ring-2 ring-amber-50' : 'border-slate-200'}\`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Chờ duyệt</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{pendingRegistrations}</span>
        </button>
        <button
          type="button"
          onClick={() => applyRegistrationStatusFilter('approved')}
          className={\`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md \${filterStatus === 'approved' ? 'border-emerald-500 ring-2 ring-emerald-50' : 'border-slate-200'}\`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Đã duyệt</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{approvedRegistrations}</span>
        </button>
        <button
          type="button"
          onClick={() => applyRegistrationStatusFilter('rejected')}
          className={\`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md \${filterStatus === 'rejected' ? 'border-rose-500 ring-2 ring-rose-50' : 'border-slate-200'}\`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Từ chối</span>
            <X size={16} className="text-rose-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{rejectedRegistrations}</span>
        </button>
      </div>`;

doReplace('AdminPanel stats cards list', t3, r3);

// 4. Registrations Table styling & pagination wrapper layout
const t4 = `      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b border-gray-200">`;

const r4 = `      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-slate-700 font-semibold border-b border-slate-100 text-[10px] tracking-wider uppercase">`;

doReplace('AdminPanel table container & thead styles', t4, r4);

// 5. Table cell spacing (th, td padding px-6 py-4 to px-4 py-3)
const t5 = `<th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"`;
const r5 = `<th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"`;
content = content.split(t5).join(r5);
console.log('Replaced table th headers!');

const t6 = `<th className="px-6 py-4 text-center"`;
const r6 = `<th className="px-4 py-3 text-center"`;
content = content.split(t6).join(r6);

const t6_2 = `<th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"`;
const r6_2 = `<th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"`;
content = content.split(t6_2).join(r6_2);

const t7 = `<tr key={reg.registration_id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">`;
const r7 = `<tr key={reg.registration_id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/50 transition-colors">`;
doReplace('Table rows transition styles', t7, r7);

// 6. Cell tds styling (changing classNames)
content = content.replace(
  `<td className="px-6 py-4">{reg.student_id || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{reg.student_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{reg.dob ? new Date(reg.dob).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{reg.phone || '-'}</td>
                    <td className="px-6 py-4">{reg.personal_email ? <a href={\`mailto:\${reg.personal_email}\`} className="text-blue-600 hover:underline">{reg.personal_email}</a> : '-'}</td>
                    <td className="px-6 py-4">{reg.class_name || '-'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">{reg.course_code?.split(' ').pop() || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {reg.company_name === 'Công ty khác' ? ('Công ty khác: ' + (reg.other_company_name || '')) : reg.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">`,
  `<td className="px-4 py-3 font-mono">{reg.student_id || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{reg.student_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{reg.dob ? new Date(reg.dob).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{reg.phone || '-'}</td>
                    <td className="px-4 py-3">{reg.personal_email ? <a href={\`mailto:\${reg.personal_email}\`} className="text-indigo-600 hover:underline font-mono">{reg.personal_email}</a> : '-'}</td>
                    <td className="px-4 py-3 font-medium">{reg.class_name || '-'}</td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-slate-700">{reg.course_code?.split(' ').pop() || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {reg.company_name === 'Công ty khác' ? ('Công ty khác: ' + (reg.other_company_name || '')) : reg.company_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">`
);

content = content.replace(
  `<td className="px-6 py-4">{new Date(reg.created_at).toLocaleString('vi-VN')}</td>
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
                        className={\`text-xs font-semibold px-2 py-1 rounded-full outline-none cursor-pointer border-2 border-transparent transition-colors \${reg.status === 'pending' ? 'bg-orange-100 text-orange-800 hover:border-orange-200 focus:border-orange-400' :
                          reg.status === 'approved' ? 'bg-green-100 text-green-800 hover:border-green-200 focus:border-green-400' :
                            'bg-red-100 text-red-800 hover:border-red-200 focus:border-red-400'
                          }\`}
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
                    </td>`,
  `<td className="px-4 py-3 font-mono text-[11px]">{new Date(reg.created_at).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                      {reg.sent_to_company_at ? (
                        <span className="text-emerald-600 font-semibold">{new Date(reg.sent_to_company_at).toLocaleString('vi-VN')}</span>
                      ) : (
                        <span className="text-slate-450">Chưa gửi</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => startEditRegistration(reg)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
                        title="Sửa thông tin đăng ký"
                      >
                        <Edit2 size={12} /> Sửa
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={reg.status}
                        onChange={(e) => handleUpdateStatus(reg.registration_id, e.target.value)}
                        className={\`text-[11px] font-bold px-2 py-1 rounded-xl outline-none cursor-pointer border border-transparent transition-all shadow-sm \${reg.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100/50 focus:ring-2 focus:ring-amber-100' :
                          reg.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/50 focus:ring-2 focus:ring-emerald-100' :
                            'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100/50 focus:ring-2 focus:ring-rose-100'
                          }\`}
                      >
                        <option value="pending" className="bg-white text-slate-800">Chờ Duyệt</option>
                        <option value="approved" className="bg-white text-slate-800">Đã Duyệt</option>
                        <option value="rejected" className="bg-white text-slate-800">Từ Chối</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-600 min-w-[220px] whitespace-pre-wrap leading-relaxed">
                      <div className="space-y-1.5">
                        <div className="text-[11px]">{reg.review_comment || '-'}</div>
                        <button
                          onClick={() => handleSendRegistrationComment(reg)}
                          className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
                        >
                          <Send size={10} /> Gửi nhận xét
                        </button>
                      </div>
                    </td>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Complete rewrite of file done!');
