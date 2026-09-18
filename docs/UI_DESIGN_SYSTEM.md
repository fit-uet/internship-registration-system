# TÀI LIỆU THIẾT KẾ GIAO DIỆN HỆ THỐNG (APPLE HIG UI DESIGN SYSTEM)
## HỆ THỐNG ĐĂNG KÝ VÀ QUẢN LÝ THỰC TẬP — FIT UET

---

## 1. TỔNG QUAN VÀ TRIẾT LÝ THIẾT KẾ

Tài liệu này xác lập tiêu chuẩn thiết kế giao diện người dùng (UI/UX Design System) cho toàn bộ Hệ thống Đăng ký và Quản lý Thực tập FIT UET. 

Hệ thống được chuyển đổi toàn diện theo **Triết lý Thiết kế Giao diện của Apple (Apple Human Interface Guidelines - HIG)**, kết hợp giữ vững bản sắc nhận diện thương hiệu của Khoa Công nghệ Thông tin — Đại học Công nghệ, ĐHQGHN thông qua **thanh Header màu xanh đặc trưng**.

Tiêu chuẩn này áp dụng nhất quán trên **tất cả các màn hình** và cho **tất cả các phân hệ / vai trò (Roles)**:
- **Sinh viên (Student)**
- **Giảng viên (Lecturer)**
- **Quản trị viên (Admin / Khoa)**

---

### 1.1. Ba Trụ Cột Triết Lý Apple HIG Ứng Dụng Vào Hệ Thống

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRIẾT LÝ THIẾT KẾ APPLE                         │
├───────────────────┬────────────────────────────┬───────────────────────┤
│    1. CLARITY     │       2. DEFERENCE         │       3. DEPTH        │
│   (SỰ RÕ RÀNG)    │   (TÔN TRỌNG NỘI DUNG)     │      (CHIỀU SÂU)      │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ • Chữ đọc rõ ràng │ • UI làm nền cho dữ liệu   │ • Phân tầng thị giác  │
│ • Phân cấp thị giác│ • Không trang trí rườm rà  │ • Vật liệu mờ cao cấp │
│ • Lược bỏ dư thừa │ • Giữ Header xanh FIT UET  │ • Bo góc squircle mịn │
│ • Khoảng thở rộng │ • Tập trung vào tác vụ     │ • Bóng đổ Ambient mềm │
└───────────────────┴────────────────────────────┴───────────────────────┘
```

1. **Clarity (Sự rõ ràng & Minh bạch)**:
   - **Tối giản thông tin (Zero Redundancy)**: Tuyệt đối không lặp lại một thông tin nhiều lần trên cùng một khung nhìn. Loại bỏ các tiêu đề rườm rà, nhãn phụ không cần thiết, các đường viền hộp lồng hộp (nested boxes).
   - **Phân cấp thị giác tự nhiên**: Sử dụng kích cỡ chữ, trọng lượng font (Font Weight) và khoảng trống (Negative Space) để dẫn dắt ánh nhìn, thay vì lạm dụng khung viền và màu sắc sặc sỡ.
   - **Dễ đọc ở mọi hoàn cảnh**: Độ tương phản chuẩn WCAG AA/AAA, kiểu chữ sắc nét, khoảng cách dòng thoáng đãng.

2. **Deference (Tôn trọng nội dung & Tác vụ)**:
   - **Giao diện làm nền tảng**: UI đóng vai trò là khung đỡ vững chắc, trang nhã để tôn vinh nội dung trọng tâm: bảng điểm, tài liệu báo cáo PDF, danh sách sinh viên, trạng thái nguyện vọng.
   - **Bảo tồn bản sắc thương hiệu**: Thanh Header màu xanh dương chuyển sắc đặc trưng (`#064889` → `#075fc7` → `#1473e6`) được giữ nguyên vẹn ở đỉnh trang, tạo điểm tựa thị giác ổn định và đáng tin cậy. Toàn bộ phần canvas và linh kiện bên dưới tuân thủ bảng màu System tinh tế của Apple.

3. **Depth & Materials (Chiều sâu vật liệu & Phân lớp)**:
   - **Phân tầng thị giác (Layering Hierarchy)**:
     - *Layer 0 (Canvas)*: Nền hệ thống xám nhạt Apple System Gray 6 (`#F5F5F7`), tạo cảm giác sạch sẽ và chuyên nghiệp.
     - *Layer 1 (Card / Thẻ Inset Grouped)*: Thẻ nội dung màu trắng tinh khôi (`#FFFFFF`), bo góc mượt mà, viền siêu mảnh (hairline), nổi nhẹ trên nền canvas bằng bóng Ambient đa tầng.
     - *Layer 2 (Floating Sheet / Modal / Popover)*: Nổi hẳn lên bề mặt với hiệu ứng phủ mờ (Backdrop Blur `16px - 20px`), bóng đổ sâu mềm mại.
   - **Góc bo Squircle liên tục (Continuous Corner Radius)**: Sử dụng các mức bo góc chuẩn Apple (`8px`, `10px`, `12px`, `16px`, `20px`), không có góc nhọn thô ráp.

---

## 2. HỆ THỐNG QUY CHUẨN DESIGN TOKENS (APPLE SYSTEM)

### 2.1. Bảng Màu Hệ Thống (Color Palette)

#### A. Màu Nền và Bề Mặt (Surfaces & Backgrounds)
| Token Name | Giá trị Hex / CSS | Mô tả & Ứng dụng |
| :--- | :--- | :--- |
| `--apple-canvas` | `#F5F5F7` | Nền canvas toàn trang (Apple System Gray 6), dịu mắt, sạch sẽ. |
| `--apple-surface` | `#FFFFFF` | Nền thẻ (Cards), bảng dữ liệu, ô nhập liệu, modal sheet. |
| `--apple-surface-subtle` | `#F9F9FB` | Nền hàng phụ, nền header của bảng, vùng nhập liệu thứ cấp. |
| `--apple-surface-muted` | `#EFEFF1` | Nền của Segmented Control, vùng kéo thả file, badge xám. |
| `--apple-border-hairline`| `rgba(0, 0, 0, 0.08)` / `#E5E5EA` | Viền siêu mỏng hairline của thẻ, bảng, đường phân cách. |
| `--apple-border-strong`  | `#D1D1D6` | Viền ô input, viền nút phụ khi hover. |

#### B. Màu Nhận Diện & Điểm Nhấn (Brand & Accents)
| Token Name | Giá trị Hex / CSS | Mô tả & Ứng dụng |
| :--- | :--- | :--- |
| `--fit-header-gradient` | `linear-gradient(110deg, #064889 0%, #075fc7 62%, #1473e6 100%)` | **Thanh Header FIT UET đặc trưng** (bảo lưu không đổi). |
| `--apple-blue` | `#0071E3` / `#007AFF` | Màu nhấn chính (Primary Action, Link, Active State, Focus Ring). |
| `--apple-blue-hover` | `#0077ED` | Trạng thái hover của nút chính. |
| `--apple-blue-tint` | `#EBF4FF` | Nền mềm cho nút phụ dạng Tinted, badge thông tin xanh. |

#### C. Màu Trạng Thái Ngữ Nghĩa (Semantic System Colors)
| Ngữ nghĩa | Màu chính (Apple System) | Nền mềm (Tint Background) | Viền mềm (Tint Border) |
| :--- | :--- | :--- | :--- |
| **Thành công (Success)** | `#34C759` (Apple Green) | `#EBF9EE` | `#D1F2D9` |
| **Cảnh báo (Warning)** | `#FF9500` (Apple Orange) | `#FFF8EB` | `#FFE7BA` |
| **Nguy hiểm (Destructive)**| `#FF3B30` (Apple Red) | `#FFF2F1` | `#FFD8D6` |
| **Trung tính (Neutral)** | `#8E8E93` (Apple Gray) | `#F2F2F7` | `#E5E5EA` |

#### D. Màu Chữ & Văn Bản (Typography Colors)
| Token Name | Giá trị Hex | Ứng dụng |
| :--- | :--- | :--- |
| `--apple-text-primary` | `#1D1D1F` | Chữ chính: Tiêu đề, nhãn trường, nội dung bảng, điểm số. Tuyệt đối không dùng `#000000` thuần túy. |
| `--apple-text-secondary` | `#6E6E73` | Chữ phụ: Mô tả ngắn, metadata, ngày tháng, mã số phụ. |
| `--apple-text-tertiary` | `#86868B` | Chữ mờ: Placeholder, nhãn đơn vị đo, thông tin phụ trợ. |
| `--apple-text-quaternary`| `#AEAEB2` | Chữ vô hiệu hóa (Disabled state), icon mờ. |

---

### 2.2. Hệ Thống Kiểu Chữ (San Francisco Typography Scale)

Toàn bộ hệ thống ưu tiên sử dụng họ font chữ San Francisco của Apple (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif`).

| Cấp bậc (Hierarchy) | Kích thước | Line Height | Weight | Tracking | Ứng dụng |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Large Title** | `26px - 28px` | `1.25` | Bold (700) | `-0.02em` | Tiêu đề lớn đầu trang Dashboard, PlanView |
| **Title 2** | `20px - 22px` | `1.3` | Bold (700) | `-0.015em`| Tiêu đề khối lớn, nhóm chức năng chính |
| **Title 3** | `16px - 17px` | `1.35` | Semibold (600) | `-0.01em` | Tiêu đề thẻ Card, tên bảng, modal header |
| **Headline** | `14px - 15px` | `1.4` | Semibold (600) | `-0.005em`| Tên sinh viên, tên công ty nổi bật, nhãn cột |
| **Body** | `13px - 14px` | `1.45` | Regular (400) | `0em` | Văn bản nội dung, đoạn mô tả, ô input |
| **Callout** | `12px - 13px` | `1.4` | Medium (500) | `0em` | Ghi chú quan trọng, text nút bấm tiêu chuẩn |
| **Footnote** | `11px - 12px` | `1.35` | Regular/Medium | `+0.01em` | Metadata phụ, thời gian, tên file rút gọn |
| **Caption** | `10px - 11px` | `1.3` | Semibold (600) | `+0.02em` | Badge trạng thái, nhãn tỷ lệ % (Uppercase nhẹ) |

---

### 2.3. Bán Kính Bo Góc & Bóng Đổ (Radii & Elevation)

#### A. Quy chuẩn bo góc (Corner Radii)
- `rounded-md` (`6px - 8px`): Badge trạng thái nhỏ, checkbox, icon container nhỏ.
- `rounded-xl` (`10px - 12px`): Nút bấm (Button), ô nhập liệu (Input, Select, Textarea), Segmented tab.
- `rounded-2xl` (`16px - 20px`): Khung thẻ nội dung (Card), Bảng dữ liệu (Table container), Alert Banner.
- `rounded-3xl` (`24px`): Khung cửa sổ Modal Sheet, Review Panel.
- `rounded-full` (`9999px`): Pill badges, avatar, nút tròn đóng nhanh.

#### B. Hệ thống bóng đổ mềm (Apple Ambient Layered Shadows)
Khắc phục triệt để lỗi bóng đen gắt hoặc bóng viền bẩn:
- **Card Shadow (Thẻ nội dung)**:  
  `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 16px rgba(0, 0, 0, 0.03);`
- **Hover Shadow (Tương tác nổi nhẹ)**:  
  `box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06), 0 10px 24px rgba(0, 0, 0, 0.05);`
- **Modal / Floating Sheet Shadow**:  
  `box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);`
- **Focus Ring**:  
  `box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.16);`

---

## 3. TIÊU CHUẨN THIẾT KẾ LINH KIỆN (APPLE COMPONENT STANDARDS)

### 3.1. Nút Bấm (Buttons)

Mọi nút bấm phải có kích thước tối thiểu đảm bảo công thái học (`min-height: 36px`), bo góc chuẩn `10px - 12px`, trọng lượng chữ Semibold (600), font size 12px - 13px, hiệu ứng nhấn lún nhẹ tinh tế (`active:scale-[0.98]`):

1. **Primary Action Button (Nút Chính)**:
   - Nền: `--apple-blue` (`#0071E3`). Chữ trắng tinh khiết.
   - Hover: `#0077ED` với bóng đổ nổi nhẹ.
   - Sử dụng cho: *Nộp điểm cho Khoa, Đăng ký nguyện vọng, Lưu thiết lập, Xác nhận chính thức*.
2. **Secondary / Outlined Button (Nút Phụ Viền Mảnh)**:
   - Nền: Trắng (`#FFFFFF`). Viền: Hairline `--apple-border-hairline` (`#E5E5EA`). Chữ: `--apple-text-primary` (`#1D1D1F`).
   - Hover: Nền xám nhạt `--apple-canvas` (`#F5F5F7`), viền `#D1D1D6`.
   - Sử dụng cho: *Lưu nháp, Tải PDF, Đóng, Quay lại, Xuất XLSX*.
3. **Tinted / Soft Button (Nút Màu Mềm)**:
   - Nền: Tint mềm tương ứng (ví dụ xanh lá mềm `#EBF9EE`, xanh dương mềm `#EBF4FF`).
   - Chữ: Màu tương phản tương ứng (ví dụ `#1B7F37`, `#0071E3`).
   - Sử dụng cho: *Xem & Chấm, Chi tiết, Chấp nhận báo cáo*.
4. **Destructive Button (Nút Cảnh Báo / Xóa)**:
   - Nền: Trắng hoặc Đỏ nhạt `#FFF2F1`. Viền và chữ: Đỏ `--apple-red` (`#FF3B30`).
   - Khi hover xác nhận nguy hiểm: Nền đỏ `#FF3B30`, chữ trắng.
   - Sử dụng cho: *Hủy đăng ký, Xóa phân công, Từ chối*.

---

### 3.2. Thanh Chuyển Phân Đoạn (Segmented Control)

Thay thế hoàn toàn các hàng tab nút rườm rà hoặc tab có icon emoji lạc điệu:
- Khung ngoài: Nền xám nhạt Apple `#EFEFF1`, padding `2px - 3px`, bo góc `10px`.
- Tab đang kích hoạt (Active): Nền trắng tinh (`#FFFFFF`), bo góc `8px`, chữ đen đậm `#1D1D1F`, bóng đổ nhẹ `0 1px 3px rgba(0,0,0,0.08)`.
- Tab chưa kích hoạt (Inactive): Không nền, chữ xám `#6E6E73`, hover chữ `#1D1D1F`.

---

### 3.3. Thẻ Thông Tin Nhóm (Grouped Inset Cards)

- Tất cả các khối dữ liệu phải được bọc trong các thẻ độc lập.
- Không để các khối dữ liệu nằm trần trụi hoặc viền nét đứt.
- Nền thẻ: Trắng tuyệt đối (`#FFFFFF`).
- Bo góc: `16px` (`rounded-2xl`).
- Viền: Hairline `1px solid rgba(0, 0, 0, 0.08)`.
- Padding trong: Hào phóng và cân đối: `20px` (desktop), `16px` (mobile).

---

### 3.4. Bảng Dữ Liệu Kiểu macOS (macOS Inset Data Tables)

Bảng quản trị và danh sách dữ liệu tuân thủ kiểu dáng macOS Table View:
1. **Khung bao ngoài**: Bo góc `16px`, viền hairline, `overflow-hidden` để các góc bảng không bị răng cưa.
2. **Tiêu đề cột (Table Header)**:
   - Nền xám nhẹ thanh khiết (`#F9F9FB`).
   - Chữ: 11px, Semibold, in hoa nhẹ, màu xám nhã nhặn `#6E6E73`, tracking `0.025em`.
   - Chiều cao header: 38px - 40px.
3. **Các hàng dữ liệu (Table Rows)**:
   - Chiều cao hàng: 48px - 54px (đủ thoáng để thao tác mà không bị chật chội).
   - Đường phân cách: Duy nhất đường kẻ ngang siêu mảnh (`1px solid #F0F0F3`). Tuyệt đối không dùng đường kẻ dọc.
   - Hiệu ứng Hover: Nền chuyển sang xám dịu `#F5F5F7` với độ trễ chuyển động siêu mượt (120ms).
4. **Cột Thao tác (Action Column)**:
   - Tối đa 1-2 nút chính tinh gọn (ví dụ nút Tinted `[FileText] Xem & Chấm` + nút icon tải phụ).
   - Tuyệt đối không nhồi nhét cụm 4-5 nút nhỏ li ti gây vỡ dòng.

---

### 3.5. Cửa Sổ Báo Cáo & Chấm Điểm (Inline Review Sheet)

Áp dụng thiết kế **Floating Window Sheet của iPadOS/macOS**:
1. **Lớp nền (Backdrop)**: Phủ mờ vật liệu tối nhẹ `rgba(15, 23, 42, 0.45)` kết hợp `backdrop-filter: blur(12px)`.
2. **Khung cửa sổ**: Bo góc `20px - 24px`, nền trắng tinh, viền hairline tinh xảo, bóng đổ sâu 36px.
3. **Thanh Header Đơn Dòng (Single-Line Header)**:
   - Chiều cao tối đa `50px`.
   - Bên trái: Họ tên SV (Bold 14px) · MSSV (Badge xám) · Lớp · Badge trạng thái. Không lặp lại tên trường/khoa.
   - Bên phải: Nút "Mở tab mới", "Tải PDF", nút "Đóng (×)".
4. **Phân chia không gian công tác**:
   - **Bên trái (65%)**: Trình đọc PDF **tràn viền (Edge-to-Edge)**. Không đặt thanh công cụ phụ đè lên thanh công cụ có sẵn của trình duyệt.
   - **Bên phải (35%)**: Khối chấm điểm & duyệt báo cáo siêu tinh gọn:
     - Duyệt báo cáo: Chỉ hiển thị 1 dòng trạng thái sạch nếu đã duyệt; chỉ hiện 2 nút duyệt khi cần hành động.
     - 3 ô điểm (Định kỳ 20%, Báo cáo 20%, Đơn vị 60%): Dạng lưới 3 cột ngang nhỏ gọn, có tỷ lệ % rõ ràng.
     - Điểm tổng kết: Hiển thị 1 dòng duy nhất, điểm số to rõ màu xanh nhấn.
     - Nhận xét và cụm nút "Lưu nháp" / "Nộp điểm".
     - Toàn bộ nội dung vừa khít màn hình, không cần cuộn chuột.

---

## 4. QUY CHUẨN ÁP DỤNG CHI TIẾT THEO TỪNG ROLES

### 4.1. Phân Hệ Sinh Viên (Student Experience)

Giao diện sinh viên đề cao sự rõ ràng, an tâm, dẫn dắt từng bước thực hiện:

1. **Thanh Header**:
   - Giữ nguyên Header xanh FIT UET.
   - Hiển thị menu điều hướng mượt mà: *Kế hoạch, Đăng ký thực tập, Nộp báo cáo final, Tra cứu điểm, Hỏi đáp FAQ*.
   - Avatar người dùng bo tròn kèm dropdown menu tinh tế.
2. **Dashboard & Hồ Sơ Sinh Viên**:
   - Các thẻ trạng thái tổng quan (Status Cards) theo phong cách Apple Health / Fitness: số to bản, badge màu sắc rõ ràng (Đã nộp hồ sơ, Đã duyệt, Đã phân công GVHD).
   - Thẻ hiển thị Giảng viên hướng dẫn: Rõ chức danh, họ tên, email VNU, số điện thoại, vai trò (Chính / Đồng hướng dẫn).
3. **Màn Hình Nộp Báo Cáo Final**:
   - Khu vực Upload file dạng Dropzone tối giản: Viền hairline bo góc `16px`, icon đám mây/tài liệu thanh mảnh, cảnh báo rõ ràng giới hạn file PDF tối đa 10 MB.
   - Khi đã nộp: Thẻ tóm tắt hiển thị tên file, dung lượng, thời gian nộp, badge trạng thái và nút xem trực tiếp.

---

### 4.2. Phân Hệ Giảng Viên (Lecturer Experience)

Giao diện giảng viên đề cao năng suất công việc, tính chính xác và không gây mệt mỏi thị giác khi làm việc với nhiều sinh viên:

1. **Dashboard Giảng Viên**:
   - 4 Thẻ KPI thống kê kiểu Inset Card: *Số SV phụ trách, Số SV đã liên hệ, Số SV đã nộp báo cáo, Số SV đã có điểm*.
   - Con số hiển thị cỡ lớn (Headline 28px), màu sắc phân biệt rõ ràng.
2. **Bảng Quản Lý Sinh Viên Phụ Trách**:
   - Danh sách sinh viên sạch sẽ, không rối mắt.
   - Cột Tình trạng liên hệ: Checkbox chuyển đổi nhanh kèm ghi chú thu gọn.
   - Cột Báo cáo: Badge trạng thái + Nút bấm Apple Tinted `[Xem & Chấm]` mở trực tiếp cửa sổ Review Sheet.
3. **Màn Hình Nhập Điểm & Nộp Điểm Cho Khoa**:
   - Bảng điểm rõ ràng với các cột: Sinh viên, Nơi thực tập, Trạng thái báo cáo, Điểm Định kỳ (20%), Điểm Báo cáo (20%), Điểm Doanh nghiệp (60%), Điểm Tổng kết (tính realtime).
   - Trạng thái khóa điểm rõ ràng khi Khoa đã khóa sổ điểm.

---

### 4.3. Phân Hệ Quản Trị Viên (Admin / Khoa)

Giao diện Admin tối ưu cho việc kiểm soát dữ liệu lớn, thẩm định, phân công và cấu hình đợt thực tập:

1. **Thanh Công Cụ Tìm Kiếm & Lọc Dữ Liệu (macOS Search & Filter Bar)**:
   - Ô tìm kiếm phong cách macOS Spotlight / Finder: Nền xám nhạt `#EFEFF1`, icon kính lúp mờ bên trái, viền đổi sang Apple Blue khi focus.
   - Các bộ lọc danh mục (Khóa học, Môn học, Trạng thái, Giảng viên) dạng Select bo góc `10px`.
   - Nút Xuất XLSX, Import XLSX dạng Apple Grouped Buttons khoa học.
2. **Màn Quản Lý Phân Công Giảng Viên Hướng Dẫn**:
   - Hiển thị chỉ tiêu quota trực quan theo từng chức danh (GS/PGS: 5, TS: 8, ThS: 10).
   - Cảnh báo vượt quota tinh tế bằng màu hổ phách mềm `#FFF8EB`, không làm đứt đoạn quy trình phân công.
3. **Màn Thẩm Định Doanh Nghiệp**:
   - Bảng danh sách công ty thẩm định nội bộ với đầy đủ công cụ CRUD, đối soát nhanh với danh sách sinh viên tự liên hệ.
4. **Màn Cấu Hình Đợt & Kế Hoạch Triển Khai**:
   - Trình soạn thảo kế hoạch hỗ trợ Markdown và nhập từ Word `.docx`, hiển thị trực quan và sạch sẽ.

---

## 5. BẢNG ĐỐI CHIẾU TRƯỚC VÀ SAU KHI ÁP DỤNG APPLE HIG

| Tiêu chí | Trước khi chuẩn hóa | Sau khi áp dụng Apple HIG |
| :--- | :--- | :--- |
| **Bảng màu tổng thể** | Tùy biến tự phát, xuất hiện dark mode cục bộ đen kịt (`#0f172a`, `#1e1e1e`). | Chuẩn Apple System Gray (`#F5F5F7`), thẻ trắng sáng, giữ Header xanh FIT UET. |
| **Mức độ thông tin** | Dư thừa, lặp lại tên trường/môn học 3-4 lần; bảng thông tin sinh viên 6 dòng chiếm diện tích. | Zero Redundancy: Tối giản, chỉ giữ thông tin cốt lõi, loại bỏ hoàn toàn chi tiết thừa. |
| **Thanh Header Modal** | Dày 2 tầng, icon to, nhiều dòng văn bản phụ. | Header mỏng đơn dòng (Single-line), thanh lịch, tích hợp đầy đủ hành động. |
| **Trình đọc PDF** | Bị kẹp giữa 2 thanh toolbar trùng lặp, nền đen đối nghịch. | Tràn viền (Edge-to-Edge), tận dụng thanh công cụ gốc của PDF, tối đa không gian xem bài. |
| **Nút bấm & Bảng** | 4 nút nhỏ (`[Tải] [OK] [Nộp lại]`) chen chúc vỡ dòng ở ô bảng. | Chuẩn hóa: 1 nút Tinted `Xem & Chấm` + 1 nút icon tải PDF, thẳng hàng, không vỡ layout. |
| **Form chấm điểm** | Các ô nhập kéo dài chiếm nhiều trang cuộn, công thức diễn giải dài dòng. | Lưới 3 cột ngang gọn gàng, tính điểm tự động nổi bật, không cần cuộn chuột. |
| **Bo góc & Đổ bóng** | Bo góc tùy tiện, bóng đen đục hoặc viền viền lồng nhau. | Bo góc Squircle liên tục (`12px`, `16px`, `20px`), bóng Ambient đa tầng siêu mịn. |

---

## 6. KẾ HOẠCH TRIỂN KHAI VÀ BẢO TRÌ

1. **Đồng bộ hóa Design Tokens trong `src/index.css`**:
   - Khai báo đầy đủ các biến CSS `--apple-*` vào `:root`.
   - Chuẩn hóa các lớp tiện ích `.feature-page`, `.ui-surface`, `.ui-button`, `.ui-table`.
2. **Áp dụng đồng bộ vào các trang Feature**:
   - Đảm bảo tất cả các file trong `src/features/student/`, `src/features/lecturer/`, `src/features/admin/`, `src/features/shared/` kế thừa đúng tokens từ `index.css`.
3. **Kiểm tra hồi quy (Regression Testing)**:
   - Kiểm tra hiển thị nhất quán trên Safari (macOS, iOS, iPadOS), Chrome, Edge.
   - Đảm bảo trải nghiệm responsive mượt mà từ màn hình di động 375px đến màn hình 4K.
