import os

file_path = '/Users/tuyenkv/Documents/internship-registration-system/src/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def do_replace(label, target, replacement):
    global content
    if target in content:
        content = content.replace(target, replacement)
        print(f"[Success] {label}")
        return True
    else:
        print(f"[Error] {label} - Target not found!")
        return False

# 1. Header background and layout (keeping #004a99 blue branding)
t1 = """          {/* Header */}
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
                  {(user.role === 'student' || user.role === 'lecturer' || user.is_lecturer) && (
                    <Link
                      to="/chat"
                      onClick={() => { setIsMenuOpen(false); setIsNotificationOpen(false); }}
                      className="inline-flex items-center gap-2 h-10 rounded-full px-3 hover:bg-white/10 transition-colors text-sm font-semibold"
                      title={user.role === 'student' ? 'Trao đổi GVHD' : 'Trao đổi sinh viên'}
                    >
                      <MessageCircle size={20} />
                      <span className="hidden md:inline">{user.role === 'student' ? 'Trao đổi GVHD' : 'Trao đổi sinh viên'}</span>
                    </Link>
                  )}
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
                    </button>"""

r1 = """          {/* Header */}
          <header className="h-16 bg-[#004a99] text-white px-6 flex items-center justify-between shadow-md z-10 sticky top-0 w-full">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center hidden sm:flex overflow-hidden border border-white/20 shadow-sm">
                  <img src={`${import.meta.env.BASE_URL}logo.png`} alt="FIT UET 30 Years" className="w-full h-full object-contain p-0.5" />
                </div>
                <div>
                  <h1 className="text-sm md:text-base font-extrabold leading-tight uppercase tracking-tight">Khoa Công nghệ Thông tin</h1>
                  <p className="text-[9px] md:text-[10px] text-blue-100 font-bold uppercase tracking-wider opacity-90">Trường Đại học Công nghệ - ĐHQGHN</p>
                </div>
              </Link>

              {user ? (
                <div className="flex items-center gap-3">
                  {(user.role === 'student' || user.role === 'lecturer' || user.is_lecturer) && (
                    <Link
                      to="/chat"
                      onClick={() => { setIsMenuOpen(false); setIsNotificationOpen(false); }}
                      className="inline-flex items-center gap-2 h-9 rounded-xl px-3 hover:bg-white/10 transition-colors text-xs font-semibold text-white"
                      title={user.role === 'student' ? 'Trao đổi GVHD' : 'Trao đổi sinh viên'}
                    >
                      <MessageCircle size={18} />
                      <span className="hidden md:inline">{user.role === 'student' ? 'Trao đổi GVHD' : 'Trao đổi sinh viên'}</span>
                    </Link>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => { setIsNotificationOpen(!isNotificationOpen); setIsMenuOpen(false); }}
                      className="relative w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-white"
                      title="Thông báo"
                    >
                      <Bell size={18} />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#004a99]">
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </span>
                      )}
                    </button>"""

do_replace('Header Top Design', t1, r1)

# 2. Dropdown button inside header
t2 = """                  <div className="relative">
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
                    </button>"""

r2 = """                  <div className="relative">
                    <button onClick={() => { setIsMenuOpen(!isMenuOpen); setIsNotificationOpen(false); }} className="flex items-center gap-2 hover:bg-white/10 text-white p-1 pr-2 rounded-xl transition-all cursor-pointer group focus:outline-none">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold group-hover:text-blue-100 transition-colors leading-normal">{user.name}</p>
                        <p className="text-[10px] text-blue-100 opacity-80 group-hover:opacity-100 transition-all">{user.email}</p>
                      </div>
                      {user.picture ? (
                        <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-emerald-400 shadow-inner group-hover:border-emerald-300 transition-colors" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-emerald-400 flex items-center justify-center text-[#004a99] font-bold shadow-inner group-hover:border-emerald-300 transition-colors"><UserIcon size={14} /></div>
                      )}
                    </button>"""

do_replace('Header User Dropdown Menu Button', t2, r2)

# 3. Login card box
t3 = """            {!token ? (
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
              </div>"""

r3 = """            {!token ? (
              <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm">
                  <LogIn className="text-blue-600" size={28} />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2 tracking-tight">Đăng nhập</h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
                  Hệ thống đăng ký Thực tập.<br />
                  Yêu cầu đăng nhập bằng VNU mail <strong className="text-blue-600 font-bold">@vnu.edu.vn</strong>
                </p>

                <div className="flex justify-center border border-slate-200 p-4 bg-slate-50/50 rounded-2xl shadow-inner">
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={() => setLoginError('Lỗi đăng nhập từ Google.')}
                    useOneTap
                    shape="pill"
                  />
                </div>
              </div>"""

do_replace('Login Card Redesign', t3, r3)

# 4. AdminPanel load and container
t4 = """  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">"""

r4 = """  if (loading) return <div className="text-center py-20 text-slate-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">"""

do_replace('AdminPanel load and container', t4, r4)

# 5. Toolbar buttons and fields
t5 = """        <div className="flex items-center gap-4">
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
        </div>"""

r5 = """        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/')} className="bg-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold shadow-sm flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer">&larr; Quay lại</button>
          <span title="Gửi cùng một nhận xét cho toàn bộ danh sách đăng ký đang được lọc ở bảng bên dưới.">
            <button
              onClick={handleSendFilteredRegistrationComment}
              disabled={filteredRegistrations.length === 0}
              className="bg-amber-600 text-white px-3.5 py-2 rounded-xl hover:bg-amber-700 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Send size={14} /> Gửi nhận xét
            </button>
          </span>
          <button
            onClick={handleApproveAll}
            className="bg-indigo-650 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-750 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
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
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-slate-50/50 shadow-inner"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-semibold shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Tất cả học phần</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-semibold shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>

            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="bg-emerald-650 text-white px-3.5 py-2 rounded-xl hover:bg-emerald-750 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
              >
                <Download size={14} /> Xuất dữ liệu <ChevronDown size={12} />
              </button>
              {isExportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden text-slate-800 origin-top-right">
                    <button onClick={handleExportCurrent} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50 w-full text-left cursor-pointer">
                      <FileText size={16} className="text-emerald-600" /> Xuất danh sách đang lọc (XLSX)
                    </button>
                    <button onClick={handleExportByCourse} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors border-b border-slate-50 w-full text-left cursor-pointer">
                      <Download size={16} className="text-blue-600" /> Xuất theo môn học (ZIP)
                    </button>
                    <button onClick={handleExportByCompany} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm font-medium transition-colors w-full text-left cursor-pointer">
                      <Download size={16} className="text-blue-600" /> Xuất theo công ty (ZIP)
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleSaveToGoogleSheets}
              disabled={savingToSheet}
              className="bg-blue-600 text-white px-3.5 py-2 rounded-xl hover:bg-blue-700 text-xs font-semibold shadow-sm flex items-center gap-1.5 whitespace-nowrap disabled:opacity-70 disabled:cursor-wait transition-colors cursor-pointer"
            >
              {savingToSheet ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {savingToSheet ? 'Đang lưu...' : 'Lưu Google Sheets'}
            </button>
          </div>
        </div>"""

# Wait, in the above block, I noticed bg-indigo-650 and bg-emerald-650, which are invalid in Tailwind!
# I will use standard Tailwind CSS classes instead: bg-indigo-600, hover:bg-indigo-700, bg-emerald-600, hover:bg-emerald-700.
# Let's fix that directly!
r5 = r5.replace("bg-indigo-650", "bg-indigo-600").replace("hover:bg-indigo-750", "hover:bg-indigo-700")
r5 = r5.replace("bg-emerald-650", "bg-emerald-600").replace("hover:bg-emerald-750", "hover:bg-emerald-700")

do_replace('AdminPanel toolbar items', t5, r5)

# 6. 6 colored stats cards
t6 = """      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
          <span className="text-red-650 text-sm font-medium mb-1">Từ chối</span>
          <span className="text-3xl font-bold text-red-700">{rejectedRegistrations}</span>
        </div>
      </div>"""

# Wait, the source text has text-red-600 on line 3116 in the original/reverted App.tsx, not text-red-650. Let's fix that in target block:
t6 = t6.replace("text-red-650", "text-red-600")

r6 = """      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <button
          type="button"
          onClick={clearRegistrationFilters}
          className={`text-left bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md ${!searchTerm && !filterCourse && !filterStatus ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tổng nguyện vọng</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-800">{totalRegistrations}</span>
        </button>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">SV đăng ký</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-blue-700">{totalStudents}</span>
        </div>
        <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-cyan-700 text-xs font-semibold uppercase tracking-wider">Công ty</span>
            <Building2 size={16} className="text-cyan-600" />
          </div>
          <span className="text-2xl font-bold text-cyan-800">{totalCompanies}</span>
        </div>
        <button
          type="button"
          onClick={() => applyRegistrationStatusFilter('pending')}
          className={`text-left bg-orange-50 p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md ${filterStatus === 'pending' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-orange-600 text-xs font-semibold uppercase tracking-wider">Chờ duyệt</span>
            <Clock size={16} className="text-orange-500" />
          </div>
          <span className="text-2xl font-bold text-slate-800">{pendingRegistrations}</span>
        </button>
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-green-600 text-xs font-semibold uppercase tracking-wider">Đã duyệt</span>
            <CheckCircle2 size={16} className="text-green-500" />
          </div>
          <span className="text-2xl font-bold text-slate-800">{approvedRegistrations}</span>
        </div>
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-red-650 text-xs font-semibold uppercase tracking-wider">Từ chối</span>
            <X size={16} className="text-red-550" />
          </div>
          <span className="text-2xl font-bold text-slate-800">{rejectedRegistrations}</span>
        </div>
      </div>"""

# Fix red-650 and red-550 to red-600/red-500 in stats card:
r6 = r6.replace("text-red-655", "text-red-600").replace("text-red-650", "text-red-600").replace("text-red-550", "text-red-500")

do_replace('AdminPanel stats cards list', t6, r6)

# 7. Registrations Table styling & pagination wrapper layout
t7 = """      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b border-gray-200">"""

r7 = """      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-slate-700 font-semibold border-b border-slate-100 text-[10px] tracking-wider uppercase">"""

do_replace('AdminPanel table container & thead styles', t7, r7)

# 8. Table cell spacing (th, td padding px-6 py-4 to px-4 py-3)
content = content.replace('<th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"', '<th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"')
content = content.replace('<th className="px-6 py-4 text-center"', '<th className="px-4 py-3 text-center"')
content = content.replace('<th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"', '<th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"')

t8 = """<tr key={reg.registration_id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">"""
r8 = """<tr key={reg.registration_id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/50 transition-colors">"""
do_replace('Table rows transition styles', t8, r8)

# 9. Cell tds styling first part
t9 = """                    <td className="px-6 py-4">{reg.student_id || '-'}</td>
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
                    <td className="px-6 py-4">"""

r9 = """                    <td className="px-4 py-3 font-mono">{reg.student_id || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-850">{reg.student_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{reg.dob ? new Date(reg.dob).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{reg.phone || '-'}</td>
                    <td className="px-4 py-3">{reg.personal_email ? <a href={`mailto:${reg.personal_email}`} className="text-blue-600 hover:underline font-mono">{reg.personal_email}</a> : '-'}</td>
                    <td className="px-4 py-3 font-medium">{reg.class_name || '-'}</td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-slate-700">{reg.course_code?.split(' ').pop() || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {reg.company_name === 'Công ty khác' ? ('Công ty khác: ' + (reg.other_company_name || '')) : reg.company_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">"""

# Fix text-slate-850 to text-slate-800:
r9 = r9.replace("text-slate-855", "text-slate-800").replace("text-slate-850", "text-slate-800")

do_replace('Cell tds styling first part', t9, r9)

# 10. Cell tds styling second part
t10 = """                    <td className="px-6 py-4">{new Date(reg.created_at).toLocaleString('vi-VN')}</td>
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
                    </td>"""

# Wait, in the source text reg.sent_to_company_at has class text-emerald-750/700? Let's check reverted App.tsx line 3244-3250
# Ah, the target has text-emerald-700. Let's make sure it matches.
# Wait, let's look at what the original reverted code was. Yes, the original code had:
# text-emerald-700 font-semibold inside reg.sent_to_company_at. Let's make sure it matches exactly!
# Let's replace it with 100% correct class names:
r10 = """                    <td className="px-4 py-3 font-mono text-[11px]">{new Date(reg.created_at).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                      {reg.sent_to_company_at ? (
                        <span className="text-emerald-700 font-semibold">{new Date(reg.sent_to_company_at).toLocaleString('vi-VN')}</span>
                      ) : (
                        <span className="text-slate-400">Chưa gửi</span>
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
                        className={`text-[11px] font-bold px-2 py-1 rounded-xl outline-none cursor-pointer border border-transparent transition-all shadow-sm ${reg.status === 'pending' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200/50 focus:ring-2 focus:ring-orange-100' :
                          reg.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-200/50 focus:ring-2 focus:ring-green-100' :
                            'bg-red-100 text-red-800 hover:bg-red-200/50 focus:ring-2 focus:ring-red-100'
                          }`}
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
                          className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer"
                        >
                          <Send size={10} /> Gửi nhận xét
                        </button>
                      </div>
                    </td>"""

do_replace('Cell tds styling second part', t10, r10)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved all changes successfully!")
