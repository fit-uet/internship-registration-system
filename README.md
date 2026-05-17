# Hệ thống đăng ký thực tập FIT UET

Tài liệu này mô tả hiện trạng hệ thống đăng ký thực tập trong repo, đối chiếu với quy trình nghiệp vụ trong file `Đăng ký thực tập FIT UET.md`, và liệt kê các chức năng còn thiếu nếu muốn hệ thống xử lý trọn vòng đời học phần thực tập.

## 1. Mục tiêu hệ thống

Hệ thống hiện tại hỗ trợ Khoa CNTT tổ chức đợt đăng ký thực tập cho sinh viên qua Website TTCN:

- Sinh viên đăng nhập bằng tài khoản Google `@vnu.edu.vn`.
- Sinh viên cập nhật hồ sơ cá nhân và đăng ký nơi thực tập.
- Khoa quản lý danh sách sinh viên, doanh nghiệp, giảng viên, quản trị viên.
- Khoa duyệt/từ chối đăng ký, xuất danh sách đăng ký ra XLSX/ZIP và đồng bộ Google Sheets.
- Khoa công bố kế hoạch triển khai dưới dạng Markdown hoặc import từ file Word `.docx`.

Phạm vi hiện tại tập trung chủ yếu vào giai đoạn trước và trong lúc đăng ký. Các bước sau đăng ký như gửi danh sách sang doanh nghiệp, sinh viên xác nhận nơi thực tập chính thức, Khoa phân công giảng viên hướng dẫn, sinh viên nộp báo cáo final và giảng viên chấm điểm chưa được quản lý đầy đủ trong hệ thống.

## 1.1. Quy tắc nghiệp vụ đã xác nhận

Các quy tắc sau được dùng làm cơ sở khi mở rộng hệ thống:

- Khoa chỉ duyệt thủ công khi doanh nghiệp sinh viên tự liên hệ không nằm trong danh sách công ty đã được Khoa thẩm định trong `it-companies-list.csv`. Danh sách này không công khai cho sinh viên.
- Danh sách công ty đã thẩm định được quản lý riêng trong màn “Danh sách công ty thẩm định nội bộ” bên trong khu “Quản lý công ty”, có CRUD, import/export XLSX, tìm kiếm và sắp xếp.
- Kết quả phỏng vấn do công ty xác nhận trực tiếp với sinh viên; Khoa không cần nhập trạng thái `PASS/FAIL` cho từng sinh viên trên hệ thống.
- Sinh viên chịu trách nhiệm xác nhận 1 nơi thực tập chính thức mà mình đã trúng tuyển để thực tập, nộp báo cáo và tính điểm.
- Sau khi có kết quả phỏng vấn trong thời hạn Khoa cho phép, sinh viên đăng nhập hệ thống để xác nhận nơi thực tập chính thức và cam kết thông tin là đúng.
- Nếu sinh viên không trúng tuyển tất cả nơi đã đăng ký, hệ thống cho phép sinh viên đăng ký/xác nhận phương án thực tập tại trường.
- Sinh viên không được xác nhận nơi thực tập tại công ty chưa được Khoa duyệt.
- Với sinh viên thực tập tại công ty, Khoa tự phân công giảng viên hướng dẫn.
- Với sinh viên thực tập tại trường, nếu đã được giảng viên đồng ý thì sinh viên chọn giảng viên đó; nếu chưa có giảng viên đồng ý thì chọn “Nhờ Khoa phân công” để Khoa tổng hợp và phân công sau.
- Giảng viên cử nhân, nhận diện theo tên có chữ `CN`, không được làm giảng viên hướng dẫn chính, chỉ được đồng hướng dẫn.
- Chỉ tiêu dự kiến tính gộp cả hướng dẫn chính và đồng hướng dẫn: `GS`/`PGS` không quá 10 sinh viên; `TS` và `ThS` không quá 15 sinh viên.
- Tạm thời không có ngoại lệ chỉ tiêu theo từng giảng viên; nếu vượt chỉ tiêu thì Khoa cần phân công sang giảng viên khác.
- Sinh viên không tìm được cơ hội thực tập tại doanh nghiệp sau thời hạn sẽ được Khoa chủ động chuyển trạng thái và phân công phương án thực tập tại trường hoặc đối tác khác.
- Báo cáo định kỳ được nộp qua email cho giảng viên; hệ thống chỉ cần quản lý báo cáo final theo khoảng thời gian mở/đóng nộp của đợt.
- Báo cáo final nộp trên hệ thống ở định dạng PDF.
- Để có phương án miễn phí cho khoảng 900 sinh viên, ưu tiên lưu file PDF trên Cloudflare R2 và giới hạn dung lượng mỗi file tối đa 10 MB. Với giới hạn này, 900 báo cáo tương đương khoảng 9 GB, nằm trong mức free tier 10 GB-month của R2 tại thời điểm cập nhật tài liệu. Hệ thống từ chối file PDF lớn hơn 10 MB và yêu cầu sinh viên nén lại trước khi nộp.
- Điểm 60% đánh giá công ty/GVHD do giảng viên tự nhập dựa trên trao đổi và bản cứng sinh viên nộp.
- Hệ thống không cần lưu chữ ký/xác nhận của doanh nghiệp hoặc giảng viên.
- Bảng điểm cuối cùng cần xuất được XLSX để Khoa tổng hợp và nhập hệ thống.
- Các học phần `INT4002`, `INT3508`, `INT4003` dùng chung quy trình, mốc thời gian và rubric trong hệ thống.
- Cần có thông báo email tự động khi các trạng thái quan trọng thay đổi, ví dụ: đăng ký được duyệt/từ chối, mở hạn xác nhận nơi thực tập, sinh viên đã xác nhận nơi thực tập, phân công GVHD, nhắc hạn nộp báo cáo final và giảng viên nộp điểm.

## 2. Công nghệ và triển khai

Frontend:

- React 19, Vite 6, TypeScript.
- Tailwind CSS.
- React Router dạng `HashRouter`.
- Google OAuth bằng `@react-oauth/google`.
- Xuất dữ liệu XLSX/ZIP bằng `xlsx`, `file-saver` và `jszip`; import XLSX cho các danh sách quản trị.
- Import kế hoạch từ Word bằng `mammoth`, chuyển HTML sang Markdown bằng `turndown`.

Backend:

- Cloudflare Worker entrypoint: `src/worker.ts`.
- Express server cho môi trường local/build: `server.ts`.
- Cơ sở dữ liệu Turso/libSQL.
- JWT tự ký bằng `JWT_SECRET`.
- Tích hợp Google Sheets bằng Service Account.
- Cloudflare R2 lưu báo cáo final PDF qua binding `REPORTS_BUCKET`.
- Notification history ghi vào bảng `notifications`; nếu cấu hình `RESEND_API_KEY` và `EMAIL_FROM`, hệ thống gửi email thật qua Resend và cập nhật trạng thái `sent/failed`.

Các biến/secrets chính:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET`
- `VITE_GOOGLE_CLIENT_ID`
- `ADMIN_EMAIL`
- `RESEND_API_KEY` nếu muốn gửi email thật qua Resend.
- `EMAIL_FROM`, ví dụ `FIT UET Internship <no-reply@domain.edu.vn>`, cần là sender/domain đã xác minh ở provider.

Gửi email thật:

- Mặc định hệ thống luôn ghi bản ghi vào `notifications`.
- Nếu cấu hình `RESEND_API_KEY` và `EMAIL_FROM`, backend/Worker gọi Resend API để gửi email ngay khi tạo notification.
- Gửi thành công thì trạng thái chuyển `sent` và có `sent_at`; gửi lỗi thì trạng thái chuyển `failed` và lưu `error`.
- Nếu chưa cấu hình provider, notification giữ trạng thái `queued` để admin theo dõi/đánh dấu thủ công.
- `CORS_ORIGIN`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- R2 binding cho bucket lưu báo cáo final, ví dụ `REPORTS_BUCKET`

Chạy local:

```bash
npm install
npm run dev
```

Deploy Cloudflare Worker:

```bash
npx wrangler login
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put JWT_SECRET
npx wrangler secret put VITE_GOOGLE_CLIENT_ID
npx wrangler secret put ADMIN_EMAIL
npm run deploy:worker
```

Nếu dùng tính năng xuất dữ liệu vào Google Sheets:

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
```

## 3. Vai trò người dùng

### Sinh viên

Sinh viên là người dùng mặc định khi đăng nhập bằng email `@vnu.edu.vn` và email đó không nằm trong danh sách giảng viên hoặc admin.

Sinh viên có thể:

- Xem kế hoạch triển khai thực tập.
- Xem danh sách nơi thực tập.
- Tìm kiếm/sắp xếp danh sách doanh nghiệp.
- Xem chi tiết doanh nghiệp: mô tả, chỉ tiêu, liên hệ, địa chỉ, link tuyển dụng, yêu cầu.
- Cập nhật hồ sơ: họ tên, mã sinh viên, ngày sinh, lớp khóa học, học phần thực tập, số điện thoại, email cá nhân.
- Đăng ký tối đa 5 nơi thực tập.
- Đăng ký doanh nghiệp chính thức trong danh sách.
- Đăng ký “Công ty khác” với thông tin công ty tự liên hệ.
- Đăng ký “Trường Đại học Công nghệ” khi thực tập tại trường, kèm tên giảng viên hướng dẫn.
- Hủy toàn bộ đăng ký và đăng ký lại trong thời gian hệ thống mở.
- Xem trạng thái đăng ký: `Chờ duyệt`, `Đã duyệt`, `Từ chối`.

### Quản trị viên

Admin có thể:

- Xem toàn bộ danh sách đăng ký.
- Tìm kiếm, sắp xếp, lọc theo học phần.
- Duyệt/từ chối từng đăng ký.
- Duyệt tất cả đăng ký đang chờ.
- Xuất danh sách đang lọc ra XLSX.
- Xuất danh sách theo học phần hoặc theo công ty thành ZIP chứa XLSX.
- Lưu danh sách đăng ký vào Google Sheets.
- Quản lý sinh viên: import XLSX, xuất XLSX, xóa sinh viên.
- Quản lý giảng viên: thêm/sửa/xóa/import/export danh sách giảng viên.
- Quản lý doanh nghiệp: thêm/sửa/xóa/import/export danh sách doanh nghiệp.
- Đồng bộ danh sách doanh nghiệp từ Google Sheets.
- Quản lý admin khác.
- Đánh dấu admin đồng thời là giảng viên để sinh viên có thể chọn làm GVHD.
- Cấu hình năm học, thời gian mở/đóng đăng ký, danh sách lớp khóa học.
- Cập nhật nội dung kế hoạch triển khai.

### Giảng viên

Giảng viên được xác định khi email nằm trong bảng `lecturers`. Khi đăng nhập, tài khoản có vai trò `lecturer`.

Hiện tại giảng viên có thể:

- Xem trang hồ sơ giảng viên.
- Cập nhật tên hiển thị.
- Xem kế hoạch triển khai.
- Xem danh sách sinh viên được phân công.
- Tải và cập nhật trạng thái báo cáo final của sinh viên phụ trách.
- Nhập/lưu nháp/nộp điểm thực tập cho sinh viên mình là GVHD chính.

## 4. Mô hình dữ liệu hiện tại

### `users`

Lưu người dùng dùng chung cho sinh viên, giảng viên và admin.

Trường chính:

- `email`, `name`, `picture`
- `role`: `student`, `lecturer`, `admin`
- `is_lecturer`: admin đồng thời là giảng viên
- `student_id`, `dob`, `class_name`, `course_code`
- `phone`, `personal_email`

### `companies`

Lưu danh sách nơi thực tập.

Trường chính:

- `name`, `description`, `slots`
- `contact_email`, `contact_name`, `phone`
- `address`, `recruitment_link`
- `history`, `qualifications`

Hệ thống tự tạo 2 nơi đặc biệt:

- `Công ty khác`: dùng cho doanh nghiệp sinh viên tự liên hệ.
- `Trường Đại học Công nghệ`: dùng cho thực tập tại trường.

### `registrations`

Lưu nguyện vọng đăng ký của sinh viên.

Trường chính:

- `user_id`, `company_id`
- `note`
- `status`: `pending`, `approved`, `rejected`
- `created_at`
- `other_company_name`, `other_company_role`, `other_company_contact`

Với thực tập tại trường, tên giảng viên hướng dẫn hiện được lưu tạm trong `other_company_contact`.

### `lecturers`

Danh sách giảng viên hướng dẫn:

- `name`
- `email`

### `settings`

Lưu cấu hình:

- Google Sheet import/export.
- Năm đợt thực tập.
- Thời gian mở/đóng đăng ký.
- Danh sách lớp khóa học.
- Nội dung kế hoạch triển khai Markdown.

## 5. Luồng nghiệp vụ hiện được hỗ trợ

### 5.1. Đăng nhập

1. Người dùng đăng nhập bằng Google.
2. Backend kiểm tra email `@vnu.edu.vn` hoặc `ADMIN_EMAIL`.
3. Nếu email nằm trong danh sách giảng viên, user được gán role `lecturer`.
4. Nếu email là admin, user được gán role `admin`.
5. Các trường hợp còn lại là `student`.
6. Backend trả về JWT để frontend gọi API.

### 5.2. Công bố kế hoạch thực tập

Admin cập nhật nội dung kế hoạch tại phần cài đặt hệ thống. Nội dung được lưu Markdown trong `settings.implementation_plan_md`.

Sinh viên và giảng viên xem kế hoạch tại màn hình “Kế hoạch triển khai”.

### 5.3. Cấu hình đợt đăng ký

Admin cấu hình:

- Năm/đợt thực tập.
- Thời điểm mở đăng ký.
- Thời điểm đóng đăng ký.
- Thời điểm mở/đóng xác nhận nơi thực tập chính thức.
- Thời điểm mở/đóng nộp báo cáo final.
- Danh sách lớp khóa học được chọn trong form.

Sinh viên chỉ có thể đăng ký trong khoảng thời gian mở/đóng nếu các mốc này được cấu hình.

### 5.4. Quản lý danh sách doanh nghiệp

Admin có thể thêm/sửa/xóa/import/export doanh nghiệp chính thức.

Riêng trong màn “Quản lý Công ty”, hệ thống hiển thị danh sách vận hành gồm:

- Công ty chính thức trong bảng `companies`.
- Các công ty sinh viên tự liên hệ đã phát sinh đăng ký, lấy từ `registrations.other_company_name`, thay vì chỉ hiện một dòng chung “Công ty khác”.
- Nếu tên công ty tự liên hệ trùng với một công ty chính thức, đăng ký được gộp vào đúng dòng công ty chính thức để Khoa quản lý theo một đầu mối.

Mỗi dòng công ty trong màn admin hiển thị số ứng viên, số đăng ký đã duyệt, trạng thái đã gửi doanh nghiệp, nút xuất danh sách đăng ký theo công ty, nút soạn email và nút đánh dấu “Đã gửi DN”.

Hệ thống hiển thị cho sinh viên:

- Tên nơi thực tập.
- Địa chỉ.
- Chỉ tiêu.
- Số ứng viên đã đăng ký.
- Chi tiết tuyển dụng và liên hệ.

### 5.4.1. Quản lý danh sách công ty thẩm định nội bộ

Từ màn “Quản lý Công ty”, admin mở màn “Danh sách công ty thẩm định nội bộ”.

Màn này hỗ trợ:

- Thêm/sửa/xóa công ty thẩm định.
- Import XLSX danh sách công ty thẩm định nội bộ.
- Export XLSX danh sách đang xem.
- Tìm kiếm và sắp xếp theo tên, nguồn, ngày tạo.

Danh sách này không hiển thị cho sinh viên. Hệ thống chỉ dùng danh sách để tự động duyệt công ty tự liên hệ khi tên công ty sau chuẩn hóa trùng với một công ty đã thẩm định.

### 5.5. Sinh viên đăng ký nguyện vọng thực tập

Sinh viên chọn tối đa 5 nơi thực tập.

Khi đăng ký, sinh viên bắt buộc cung cấp:

- Mã sinh viên.
- Ngày sinh.
- Số điện thoại.
- Email cá nhân.
- Lớp khóa học.
- Học phần thực tập.

Các loại đăng ký:

- Doanh nghiệp có trong danh sách chính thức: tự động ghi nhận trạng thái `approved`.
- Công ty tự liên hệ: sinh viên nhập tên công ty, vị trí, người liên hệ, số điện thoại, email. Hệ thống đối chiếu với bảng công ty thẩm định nội bộ: nếu có trong danh sách thì tự động `approved`, nếu không thì `pending` để Khoa duyệt thủ công.
- Thực tập tại trường: sinh viên chọn `Trường Đại học Công nghệ` và nhập/chọn giảng viên hướng dẫn. Hệ thống yêu cầu có tên GVHD.

Quy tắc đặc biệt:

- Nếu chọn `Trường Đại học Công nghệ`, sinh viên không được chọn thêm công ty khác.
- Sinh viên có thể hủy toàn bộ đăng ký và đăng ký lại trong thời gian hệ thống mở.

### 5.6. Khoa duyệt danh sách đăng ký

Admin xem toàn bộ đăng ký và đổi trạng thái:

- `pending`: Chờ duyệt.
- `approved`: Đã duyệt.
- `rejected`: Từ chối.

Admin có thể duyệt tất cả các đăng ký đang chờ.

Theo nghiệp vụ đã xác nhận, việc duyệt thủ công chỉ cần áp dụng với công ty tự liên hệ chưa nằm trong danh sách thẩm định nội bộ. Các công ty đã nằm trong danh sách này được xem là đủ điều kiện để sinh viên xác nhận thực tập nếu sinh viên đã được công ty nhận. Hệ thống hiện dùng bảng `approved_company_names` để phục vụ đối chiếu này.

### 5.7. Xuất danh sách cho Khoa/doanh nghiệp

Admin có thể:

- Xuất danh sách đang lọc ra XLSX.
- Xuất theo học phần ra ZIP chứa XLSX.
- Xuất theo công ty ra ZIP chứa XLSX.
- Ghi toàn bộ dữ liệu đăng ký lên Google Sheets.
- Trong màn “Quản lý Công ty”, xuất danh sách đăng ký riêng cho từng công ty và đánh dấu danh sách đã gửi doanh nghiệp theo từng công ty.

Tính năng này hỗ trợ bước Khoa gửi danh sách sinh viên đăng ký đến doanh nghiệp để phỏng vấn. Hệ thống xuất XLSX theo từng công ty, ghi notification history, và nếu đã cấu hình Resend thì có thể gửi email thật cho doanh nghiệp với danh sách sinh viên đã duyệt trong nội dung email rồi tự đánh dấu “Đã gửi DN”.

## 6. Đối chiếu với quy trình trong kế hoạch thực tập

| Bước nghiệp vụ | Hiện trạng hệ thống | Mức đáp ứng |
| --- | --- | --- |
| Sinh viên đăng ký thông tin cá nhân trên Website TTCN | Có hồ sơ sinh viên và form đăng ký bắt buộc thông tin cá nhân | Đáp ứng tốt |
| Sinh viên theo dõi thông tin tuyển thực tập | Có danh sách doanh nghiệp và trang chi tiết | Đáp ứng cơ bản |
| Sinh viên đăng ký công ty trong danh sách | Có chọn tối đa 5 nơi thực tập | Đáp ứng tốt |
| Sinh viên đăng ký công ty tự liên hệ | Có `Công ty khác`, lưu tên/vị trí/liên hệ | Đáp ứng cơ bản |
| Khoa xét duyệt công ty ngoài danh sách thẩm định nội bộ | Có trạng thái `pending/approved/rejected`, đã có bảng và màn quản lý danh sách thẩm định nội bộ để tự động duyệt công ty tự liên hệ | Đáp ứng phần chính |
| Khoa gửi danh sách sinh viên đăng ký đến doanh nghiệp | Có export XLSX/ZIP/Google Sheets và quản lý trạng thái đã gửi theo công ty | Đáp ứng phần chính |
| Doanh nghiệp phỏng vấn và phản hồi kết quả | Kết quả phỏng vấn được công ty xác nhận trực tiếp với sinh viên, hệ thống không cần ghi nhận `PASS/FAIL` từ công ty | Ngoài phạm vi hệ thống |
| Sinh viên kiểm tra kết quả phỏng vấn | Sinh viên tự nhận kết quả từ công ty ngoài hệ thống | Ngoài phạm vi hệ thống |
| Sinh viên chọn 1 nơi thực tập chính thức để lấy điểm | Có luồng xác nhận nơi thực tập chính thức, chỉ cho chọn công ty đã duyệt hoặc thực tập tại trường | Đáp ứng tốt |
| Khoa phân công giảng viên hướng dẫn | Có phân công thủ công/import/tự phân công theo quota, có lịch sử tạo/xóa phân công | Đáp ứng phần chính |
| Sinh viên thực tập tại trường nếu chưa có công ty | Có lựa chọn thực tập tại trường, cho chọn GV đã đồng ý hoặc nhờ Khoa phân công | Đáp ứng tốt |
| Sinh viên báo cáo định kỳ với giảng viên | Nghiệp vụ thực hiện qua email, không cần quản lý chi tiết trên hệ thống | Ngoài phạm vi hệ thống |
| Sinh viên nộp báo cáo thực tập | Có upload báo cáo final PDF theo khoảng thời gian mở/đóng nộp, giới hạn 10 MB | Đáp ứng phần chính |
| Giảng viên đánh giá và chấm điểm | Có nhập 3 đầu điểm và tự tính điểm tổng kết theo công thức 20/20/60 | Đáp ứng phần chính |
| Giảng viên nộp điểm cho Khoa | Có lưu nháp/nộp điểm, admin xem trạng thái | Đáp ứng phần chính |
| Khoa tổng hợp và nhập hệ thống đào tạo | Có trang bảng điểm và export XLSX cuối kỳ | Đáp ứng phần chính |
| Sinh viên đăng ký học phần trên daotao.vnu.edu.vn | Hệ thống chỉ lưu học phần sinh viên chọn, chưa đối soát với hệ thống đào tạo | Đáp ứng nhắc nhở, chưa kiểm chứng |

## 7. Chức năng còn thiếu nên bổ sung

### Ưu tiên 1: Hoàn thiện luồng sau đăng ký và xác nhận nơi thực tập

1. Thêm chức năng gửi/xuất danh sách đăng ký cho doanh nghiệp:
   - Xuất riêng từng công ty đã có.
   - Nên bổ sung trạng thái “đã gửi” và ngày gửi.
   - Có thể phát triển thêm gửi email tự động sau.

2. Thêm bước sinh viên xác nhận 1 nơi thực tập chính thức:
   - Kết quả phỏng vấn do công ty xác nhận trực tiếp với sinh viên ngoài hệ thống.
   - Sinh viên tự chịu trách nhiệm chỉ xác nhận nơi mình đã trúng tuyển.
   - Khi xác nhận, sinh viên phải tick cam kết đã được công ty tiếp nhận thực tập.
   - Chỉ cho chọn từ các đăng ký công ty đã được duyệt.
   - Không cho xác nhận công ty đang `pending` hoặc `rejected`, kể cả khi sinh viên đã có trao đổi bên ngoài.
   - Nếu không trúng tuyển tất cả nơi đã đăng ký, sinh viên được chọn/xác nhận thực tập tại trường.
   - Với thực tập tại trường, chỉ cho xác nhận khi đăng ký/phương án đã được Khoa ghi nhận hợp lệ.
   - Mỗi sinh viên chỉ có 1 `final_internship`.
   - Sau khi xác nhận, khóa lựa chọn; nếu đổi nơi cần Khoa mở khóa hoặc cập nhật thay.

3. Thêm quản lý danh sách công ty thẩm định nội bộ:
   - Dữ liệu gốc hiện là `it-companies-list.csv`.
   - Danh sách này không công khai cho sinh viên.
   - Worker cần dùng danh sách này, hoặc một bảng database import từ danh sách này, để quyết định tự động duyệt công ty tự liên hệ.
   - Có thể bổ sung màn hình admin import/xem/sửa, nhưng đây là ưu tiên thấp hơn luồng xác nhận nơi thực tập.

### Ưu tiên 2: Phân công giảng viên hướng dẫn

Hiện hệ thống mới hỗ trợ sinh viên chọn GVHD khi đăng ký thực tập tại trường. Theo nghiệp vụ đã xác nhận, sinh viên thực tập tại công ty sẽ do Khoa tự phân công giảng viên hướng dẫn; sinh viên thực tập tại trường tự đăng ký giảng viên theo sự đồng ý trước.

Cần bổ sung:

- Bảng phân công GVHD cho sinh viên.
- Admin phân công thủ công hoặc import XLSX.
- Tự động gợi ý/phân công theo lớp, học phần, công ty, số lượng tối đa mỗi giảng viên.
- Cấu hình chỉ tiêu theo học hàm/học vị:
  - Giảng viên có tên chứa `CN` không được làm hướng dẫn chính, chỉ được đồng hướng dẫn.
  - `GS`/`PGS` không quá 10 sinh viên, tính gộp cả hướng dẫn chính và đồng hướng dẫn.
  - `TS` và `ThS` không quá 15 sinh viên, tính gộp cả hướng dẫn chính và đồng hướng dẫn.
  - Tạm thời không có ngoại lệ theo từng giảng viên.
- Màn hình giảng viên xem danh sách sinh viên mình phụ trách.
- Màn hình sinh viên xem GVHD được phân công.
- Lịch sử thay đổi phân công.
- Luồng Khoa chủ động chuyển sinh viên chưa có nơi thực tập sang thực tập tại trường hoặc đối tác khác sau thời hạn.

Gợi ý model:

- `advisor_assignments(id, user_id, lecturer_id, role, assigned_by, assigned_at, note)`
- `lecturer_quotas(id, lecturer_id, max_total_students, note)`

### Ưu tiên 3: Nộp báo cáo final và chấm điểm

Theo nghiệp vụ đã xác nhận, báo cáo định kỳ được sinh viên gửi qua email cho giảng viên. Hệ thống chỉ cần quản lý việc nộp báo cáo final theo khoảng thời gian mở/đóng của đợt.

Cần bổ sung:

- Admin cấu hình thời điểm mở và đóng nộp báo cáo final.
- Sinh viên upload báo cáo final định dạng PDF.
- File PDF được lưu trên Cloudflare R2, giới hạn mặc định 10 MB/file để khoảng 900 sinh viên vẫn nằm trong mức miễn phí 10 GB-month. Hệ thống cần kiểm tra MIME type, phần mở rộng `.pdf`, kích thước file và đặt tên object theo đợt/sinh viên để tránh trùng. File lớn hơn 10 MB bị từ chối, sinh viên phải nén lại và nộp lại.
- Trạng thái báo cáo: chưa nộp, đã nộp, cần nộp lại, đã chấp nhận. Hệ thống chặn nộp ngoài khoảng thời gian mở/đóng của đợt.
- Giảng viên xem/tải báo cáo PDF của sinh viên phụ trách.
- Giảng viên nhập điểm thành phần:
  - 20% báo cáo định kỳ, do giảng viên tự tổng hợp từ email/trao đổi.
  - 20% báo cáo final.
  - 60% đánh giá công ty hoặc GVHD nếu thực tập tại trường, do giảng viên tự nhập dựa trên trao đổi và bản cứng sinh viên nộp.
- Tự động tính điểm tổng kết.
- Giảng viên xác nhận/nộp điểm về Khoa.
- Admin khóa điểm và export bảng điểm cuối kỳ ra XLSX.
- Tự động gửi email nhắc hạn nộp báo cáo final cho sinh viên và email nhắc chấm/nộp điểm cho giảng viên.

Gợi ý model:

- `final_reports(id, user_id, object_key, original_filename, file_size, mime_type, status, submitted_at, lecturer_comment)`
- `grades(id, user_id, lecturer_id, progress_score, report_score, company_score, final_score, comment, submitted_at, locked_at)`

### Ưu tiên 4: Đối soát học phần với hệ thống đào tạo

Quy trình yêu cầu sinh viên đăng ký học phần trên `http://daotao.vnu.edu.vn` để được công nhận điểm.

Hệ thống hiện chỉ cho sinh viên chọn học phần trong form, chưa biết sinh viên đã đăng ký trên hệ thống đào tạo hay chưa.

Cần bổ sung một trong các cách:

- Admin import danh sách sinh viên đã đăng ký học phần từ Phòng Đào tạo.
- Hệ thống tự đánh dấu `course_enrollment_verified`.
- Cảnh báo sinh viên chưa có trong danh sách đăng ký học phần.
- Khi xuất điểm, chỉ xuất sinh viên đã đối soát hợp lệ hoặc đánh dấu rõ trạng thái.

### Ưu tiên 5: Cổng doanh nghiệp hoặc luồng phản hồi từ doanh nghiệp

Hiện doanh nghiệp không có tài khoản/cổng riêng. Theo nghiệp vụ đang chốt, Khoa có thể nhận kết quả ngoài hệ thống rồi nhập/import lại; vì vậy cổng doanh nghiệp là tùy chọn mở rộng, không phải yêu cầu bắt buộc.

Có thể bổ sung trong tương lai nếu Khoa muốn doanh nghiệp phản hồi trực tiếp trên hệ thống:

- Link phản hồi bảo mật theo từng doanh nghiệp.
- Doanh nghiệp xem danh sách ứng viên của mình.
- Doanh nghiệp cập nhật kết quả phỏng vấn.
- Doanh nghiệp nhập thông tin mentor/supervisor.
- Doanh nghiệp upload/nhập đánh giá cuối kỳ.

Theo nghiệp vụ hiện tại, không triển khai cổng doanh nghiệp ở giai đoạn chính vì công ty xác nhận kết quả trực tiếp với sinh viên.

### Ưu tiên 6: Thông báo email tự động

Cần bổ sung thông báo email cho các mốc quan trọng:

- Sinh viên đăng ký thành công.
- Công ty tự liên hệ được duyệt/từ chối.
- Khoa đã gửi danh sách sang doanh nghiệp.
- Mở/đóng thời hạn xác nhận nơi thực tập chính thức.
- Sinh viên xác nhận nơi thực tập thành công.
- Khoa phân công hoặc thay đổi GVHD.
- Nhắc hạn nộp báo cáo final.
- Báo cáo final được ghi nhận hoặc cần nộp lại.
- Giảng viên nộp điểm và Khoa khóa/tổng hợp điểm.

Về triển khai, có thể dùng một dịch vụ email transaction miễn phí hoặc quota thấp trước; nếu không muốn phụ thuộc dịch vụ ngoài, hệ thống vẫn nên lưu bảng `notifications` để theo dõi lịch sử thông báo và trạng thái gửi.

## 8. Đề xuất lộ trình triển khai

### Giai đoạn A: Đủ dùng cho đợt đăng ký và gửi doanh nghiệp

- Chuẩn hóa README/tài liệu vận hành.
- Bổ sung trạng thái gửi doanh nghiệp.
- Xuất danh sách theo từng doanh nghiệp kèm định dạng chuẩn.
- Sinh viên xác nhận 1 nơi thực tập chính thức trong thời hạn Khoa cho phép và cam kết đã trúng tuyển.
- Chặn xác nhận nếu công ty chưa được duyệt.
- Cho phép sinh viên không trúng tuyển nơi nào đăng ký thực tập tại trường.

### Giai đoạn B: Đủ dùng cho Khoa quản lý thực tập

- Khoa phân công GVHD cho sinh viên thực tập tại công ty.
- Giữ luồng sinh viên tự đăng ký GVHD khi thực tập tại trường.
- Áp dụng chỉ tiêu hướng dẫn theo học hàm/học vị và quy tắc `CN` chỉ đồng hướng dẫn.
- Giảng viên xem danh sách sinh viên phụ trách.
- Sinh viên xem GVHD và nơi thực tập chính thức.
- Admin xử lý sinh viên chưa tìm được doanh nghiệp và chuyển sang thực tập tại trường/đối tác.

### Giai đoạn C: Đủ dùng đến cuối học phần

- Nộp báo cáo final PDF theo khoảng thời gian mở/đóng nộp.
- Lưu báo cáo final trên Cloudflare R2 với giới hạn 10 MB/file.
- Giảng viên nhập điểm theo rubric 20/20/60.
- Giảng viên nộp điểm.
- Khoa tổng hợp/xuất bảng điểm XLSX.
- Đối soát đăng ký học phần với Phòng Đào tạo.
- Gửi email nhắc hạn/nộp điểm cho sinh viên và giảng viên.

## 9. Kế hoạch ưu tiên và thiết kế triển khai chi tiết

Phần này chuyển các yêu cầu nghiệp vụ đã chốt thành kế hoạch triển khai theo thứ tự ưu tiên. Mục tiêu là làm trước các phần mở khóa luồng nghiệp vụ chính, tránh xây các chức năng cuối kỳ khi hệ thống chưa có “nơi thực tập chính thức” và “phân công GVHD”.

### 9.1. Nguyên tắc triển khai

- Giữ nguyên luồng đăng ký hiện tại, chỉ mở rộng dữ liệu và trạng thái sau đăng ký.
- Mọi sinh viên chỉ có 1 hồ sơ thực tập chính thức trong một đợt.
- Không cho xác nhận công ty chưa được duyệt.
- Khoa là nguồn quyết định phân công GVHD cho sinh viên thực tập tại công ty.
- Sinh viên thực tập tại trường được chọn GVHD, nhưng vẫn cần được Khoa ghi nhận trong hồ sơ chính thức.
- Báo cáo định kỳ nằm ngoài hệ thống, giảng viên tự tổng hợp điểm phần này.
- Báo cáo final PDF phải nhỏ hơn hoặc bằng 10 MB.
- Dữ liệu điểm cuối kỳ phải xuất được XLSX.

### 9.2. P0 - Củng cố nền dữ liệu và trạng thái

Mục tiêu: sửa các điểm lệch nghiệp vụ hiện tại trước khi thêm màn hình mới.

Phạm vi:

- Dùng danh sách công ty thẩm định nội bộ để tự động duyệt công ty tự liên hệ.
- Bổ sung cấu hình thời hạn xác nhận nơi thực tập và khoảng thời gian nộp báo cáo final.
- Bổ sung trạng thái/ngày gửi danh sách sang doanh nghiệp theo từng công ty.
- Màn “Quản lý Công ty” bao gồm cả công ty tự liên hệ đã phát sinh đăng ký, hỗ trợ xuất danh sách và đánh dấu “Đã gửi DN” theo công ty.
- Tách màn quản lý danh sách thẩm định nội bộ khỏi Cài đặt hệ thống, đặt trong khu “Quản lý công ty”.

Thiết kế dữ liệu:

```sql
CREATE TABLE IF NOT EXISTS approved_company_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  normalized_name TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'csv',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE registrations ADD COLUMN sent_to_company_at DATETIME;
ALTER TABLE registrations ADD COLUMN sent_to_company_note TEXT;
```

Hệ thống không lưu `PASS/FAIL` phỏng vấn do doanh nghiệp phản hồi. Công ty xác nhận kết quả trực tiếp với sinh viên; sinh viên tự chịu trách nhiệm khi xác nhận nơi thực tập chính thức.

Thiết kế API:

- `POST /api/admin/approved-companies/import`: import danh sách thẩm định từ XLSX/CSV qua UI.
- `GET /api/admin/approved-companies`: xem/tìm kiếm danh sách thẩm định.
- `POST /api/admin/approved-companies`: thêm công ty thẩm định.
- `PUT /api/admin/approved-companies/:id`: sửa công ty thẩm định.
- `DELETE /api/admin/approved-companies/:id`: xóa công ty thẩm định.
- `PUT /api/admin/registrations/mark-sent`: đánh dấu đã gửi danh sách sang doanh nghiệp theo công ty hoặc theo đăng ký.
- `GET /api/admin/companies`: danh sách công ty vận hành cho admin, gồm công ty chính thức và công ty tự liên hệ đã phát sinh đăng ký.
- `PUT /api/settings/campaign`: bổ sung `confirmation_open_at`, `confirmation_close_at`, `final_report_open_at`, `final_report_close_at`.

Tiêu chí nghiệm thu:

- Công ty tự liên hệ có trong danh sách thẩm định được tự động `approved`.
- Công ty tự liên hệ không có trong danh sách thẩm định là `pending`.
- Admin xuất/đánh dấu được danh sách đã gửi sang doanh nghiệp.
- Admin không phải quản lý các đăng ký tự liên hệ dưới một dòng “Công ty khác”; mỗi công ty tự liên hệ có dòng riêng trong màn “Quản lý Công ty”.
- Không phá luồng đăng ký hiện tại.

### 9.3. P1 - Xác nhận nơi thực tập chính thức

Mục tiêu: sinh viên chọn đúng 1 nơi thực tập để tính điểm sau khi được doanh nghiệp xác nhận trúng tuyển ngoài hệ thống.

Thiết kế dữ liệu:

```sql
CREATE TABLE IF NOT EXISTS final_internships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  registration_id INTEGER,
  company_id INTEGER,
  internship_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  student_attested INTEGER NOT NULL DEFAULT 0,
  attestation_text TEXT,
  school_lecturer TEXT,
  school_assignment_request INTEGER NOT NULL DEFAULT 0,
  confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_by INTEGER,
  locked_at DATETIME,
  note TEXT
);
```

Giá trị `internship_type`:

- `company`: thực tập tại doanh nghiệp.
- `school`: thực tập tại trường.
- `partner`: đối tác khác do Khoa sắp xếp.

Quy tắc xác nhận:

- Sinh viên chỉ xác nhận trong khoảng `confirmation_open_at` đến `confirmation_close_at`.
- Chỉ xác nhận đăng ký có `status = approved`.
- Nếu là công ty, sinh viên phải tick cam kết đã được công ty nhận thực tập.
- Hệ thống không kiểm tra `PASS/FAIL`; trách nhiệm xác nhận đúng thuộc về sinh viên.
- Nếu không trúng tuyển tất cả nơi đã đăng ký, sinh viên có thể chọn phương án thực tập tại trường nếu Khoa mở lựa chọn này.
- Khi thực tập tại trường, sinh viên chọn giảng viên đã đồng ý hoặc chọn “Nhờ Khoa phân công”; hệ thống lưu `school_assignment_request = 1` để Khoa tổng hợp.
- Với thực tập tại trường hoặc đối tác khác, Khoa có thể tạo/cập nhật hồ sơ thay sinh viên.
- Mỗi sinh viên chỉ có 1 bản ghi `final_internships`.
- Sau khi khóa, chỉ admin được thay đổi.

Thiết kế API:

- `GET /api/internships/final/my`: sinh viên xem nơi thực tập chính thức.
- `POST /api/internships/final/confirm`: sinh viên xác nhận.
- `GET /api/admin/final-internships`: admin xem toàn bộ.
- `PUT /api/admin/final-internships/:userId`: admin tạo/sửa/chuyển trạng thái.
- `PUT /api/admin/final-internships/:userId/lock`: khóa hồ sơ.

Thiết kế UI:

- Sinh viên:
  - Thêm thẻ “Xác nhận nơi thực tập” trên Dashboard.
  - Hiển thị các công ty đủ điều kiện xác nhận.
  - Hiển thị checkbox cam kết: “Tôi xác nhận đã được đơn vị này tiếp nhận thực tập và chịu trách nhiệm về thông tin khai báo.”
  - Hiển thị lựa chọn thực tập tại trường khi sinh viên không trúng tuyển nơi nào.
  - Hiển thị lý do không đủ điều kiện: công ty chưa duyệt, ngoài thời hạn.
- Admin:
  - Tab “Nơi thực tập chính thức”.
  - Bộ lọc: chưa xác nhận, đã xác nhận, công ty pending, thực tập tại trường.
  - Hành động: tạo/chỉnh nơi thực tập, khóa/mở khóa.

Tiêu chí nghiệm thu:

- Sinh viên không thể xác nhận công ty `pending` hoặc `rejected`.
- Sinh viên phải tick cam kết đã trúng tuyển trước khi xác nhận công ty.
- Một sinh viên không thể có 2 nơi thực tập chính thức.
- Admin xử lý được sinh viên không tìm được doanh nghiệp bằng cách chuyển sang `school` hoặc `partner`.

### 9.4. P2 - Phân công giảng viên hướng dẫn

Mục tiêu: Khoa phân công GVHD cho sinh viên thực tập tại công ty, đồng thời quản lý chỉ tiêu. Phần lõi đã được triển khai ở backend và UI admin/giảng viên/sinh viên.

Thiết kế dữ liệu:

```sql
CREATE TABLE IF NOT EXISTS advisor_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lecturer_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'primary',
  assigned_by INTEGER,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  UNIQUE(user_id, lecturer_id, role)
);

CREATE TABLE IF NOT EXISTS lecturer_quotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lecturer_id INTEGER UNIQUE NOT NULL,
  max_total_students INTEGER,
  note TEXT
);

CREATE TABLE IF NOT EXISTS advisor_assignment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER,
  user_id INTEGER NOT NULL,
  lecturer_id INTEGER,
  role TEXT,
  action TEXT NOT NULL,
  actor_id INTEGER,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Giá trị `role`:

- `primary`: hướng dẫn chính.
- `co`: đồng hướng dẫn.

Quy tắc chỉ tiêu:

- Tên chứa `CN`: không được `primary`, chỉ được `co`.
- `GS`/`PGS`: tối đa 10 sinh viên, tính gộp `primary` và `co`.
- `TS`/`ThS`: tối đa 15 sinh viên, tính gộp `primary` và `co`.
- Tạm thời không có ngoại lệ theo từng giảng viên.

Thiết kế API:

- `GET /api/admin/advisor-assignments`: danh sách phân công.
- `POST /api/admin/advisor-assignments`: phân công 1 sinh viên.
- `POST /api/admin/advisor-assignments/bulk`: import phân công từ XLSX/CSV qua UI.
- `POST /api/admin/advisor-assignments/auto-primary`: tự phân công GVHD chính cho sinh viên chưa có GVHD theo quota.
- `DELETE /api/admin/advisor-assignments/:id`: xóa phân công.
- `PUT /api/admin/lecturer-quotas/:id`: cập nhật chỉ tiêu tổng cho giảng viên.
- `GET /api/lecturer/students`: giảng viên xem sinh viên phụ trách.
- `GET /api/advisor/my`: sinh viên xem GVHD.

Thiết kế UI:

- Admin:
  - Bảng phân công theo sinh viên.
  - Tìm kiếm theo sinh viên, lớp, học phần, nơi thực tập.
  - Chặn khi chọn giảng viên vượt chỉ tiêu.
  - Chặn khi chọn `CN` làm hướng dẫn chính.
  - Import XLSX: `student_id, lecturer_email_or_name, role, note`.
  - Tự phân công GVHD chính cho sinh viên chưa có GVHD theo quota còn trống.
  - Cập nhật chỉ tiêu giảng viên ngay trên màn phân công.
  - Ghi lịch sử tạo/xóa phân công ở backend để truy vết.
- Giảng viên:
  - Trang “Sinh viên phụ trách”.
  - Hiển thị nơi thực tập, email, số điện thoại, học phần.
- Sinh viên:
  - Hiển thị GVHD trong hồ sơ thực tập chính thức.
  - Nếu sinh viên xác nhận thực tập tại trường với một giảng viên đã đồng ý, hệ thống tự tạo phân công hướng dẫn chính và vẫn kiểm tra quy tắc `CN`/quota.

Tiêu chí nghiệm thu:

- Không phân công `CN` làm hướng dẫn chính.
- Không vượt chỉ tiêu mặc định.
- Giảng viên đăng nhập xem đúng danh sách sinh viên được phân công.

### 9.5. P3 - Nộp báo cáo final PDF bằng R2

Mục tiêu: sinh viên nộp báo cáo final PDF, giảng viên/admin xem được và hệ thống giữ chi phí trong free tier. Phần lõi đã được triển khai ở backend và UI sinh viên/giảng viên/admin.

Thiết kế dữ liệu:

```sql
CREATE TABLE IF NOT EXISTS final_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  object_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  lecturer_comment TEXT
);
```

Quy tắc upload:

- Chỉ nhận `.pdf`.
- MIME type phải là `application/pdf`.
- Dung lượng tối đa 10 MB.
- File lớn hơn 10 MB bị từ chối, sinh viên phải nén lại.
- Object key gợi ý: `reports/{campaign_year}/{student_id}/final.pdf`.
- Khi nộp lại, ghi đè object hoặc tạo version tùy quyết định triển khai; ưu tiên đơn giản là ghi đè và cập nhật `updated_at`.

Cloudflare Worker binding:

```toml
[[r2_buckets]]
binding = "REPORTS_BUCKET"
bucket_name = "internship-final-reports"
```

Thiết kế API:

- `POST /api/reports/final`: sinh viên upload PDF.
- `GET /api/reports/final/my`: sinh viên xem trạng thái file đã nộp.
- `GET /api/reports/final/:userId/download`: sinh viên sở hữu báo cáo, giảng viên được phân công hoặc admin tải file nếu có quyền.
- `PUT /api/reports/final/:userId/status`: giảng viên/admin cập nhật `accepted` hoặc `needs_revision`.
- `GET /api/admin/reports/final`: admin xem bảng tổng hợp trạng thái nộp.

Thiết kế UI:

- Sinh viên:
  - Widget nộp báo cáo final.
  - Hiển thị thời gian mở/đóng nộp, trạng thái, tên file, dung lượng, thời điểm nộp.
  - Tải lại PDF đã nộp.
  - Nếu file > 10 MB, báo rõ “Vui lòng nén PDF xuống tối đa 10 MB”.
- Giảng viên:
  - Cột trạng thái báo cáo trong danh sách sinh viên phụ trách.
  - Nút tải PDF.
  - Ghi chú “cần nộp lại” nếu cần.
- Admin:
  - Bảng tổng hợp trạng thái nộp báo cáo.
  - Bộ lọc chưa nộp/đã nộp/cần nộp lại/đã chấp nhận.
  - Xuất XLSX và tải PDF từng sinh viên.

Tiêu chí nghiệm thu:

- File > 10 MB bị từ chối ở cả frontend và backend.
- Sinh viên không xem/tải được báo cáo của sinh viên khác.
- Giảng viên chỉ tải được báo cáo của sinh viên mình phụ trách.
- Admin tải được tất cả.

### 9.6. P4 - Chấm điểm và xuất bảng điểm

Mục tiêu: giảng viên nhập điểm, nộp điểm về Khoa, admin tổng hợp XLSX. Phần lõi đã được triển khai ở backend và UI giảng viên/admin; UI admin hiện xuất XLSX.

Thiết kế dữ liệu:

```sql
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  lecturer_id INTEGER NOT NULL,
  progress_score REAL,
  report_score REAL,
  company_score REAL,
  final_score REAL,
  status TEXT NOT NULL DEFAULT 'draft',
  comment TEXT,
  submitted_at DATETIME,
  locked_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Quy tắc điểm:

- `progress_score`: 20%, giảng viên tự tổng hợp từ báo cáo định kỳ qua email.
- `report_score`: 20%, điểm báo cáo final.
- `company_score`: 60%, giảng viên nhập dựa trên trao đổi/bản cứng.
- `final_score = progress_score * 0.2 + report_score * 0.2 + company_score * 0.6`.
- Điểm hợp lệ từ 0 đến 10.
- Giảng viên có thể lưu nháp.
- Khi `submitted`, admin nhìn thấy để tổng hợp.
- Khi `locked`, chỉ admin mở khóa mới sửa được.

Thiết kế API:

- `GET /api/lecturer/grades`: giảng viên xem danh sách điểm.
- `PUT /api/lecturer/grades/:userId`: lưu điểm nháp.
- `POST /api/lecturer/grades/:userId/submit`: nộp điểm.
- `GET /api/admin/grades`: admin xem toàn bộ điểm.
- `PUT /api/admin/grades/:userId/lock`: khóa điểm.
- `GET /api/admin/grades`: UI dùng dữ liệu này để xuất XLSX.
- `GET /api/admin/grades/export.csv`: endpoint tương thích cũ nếu cần tải CSV trực tiếp.

Thiết kế UI:

- Giảng viên:
  - Bảng “Chấm điểm thực tập” trong trang giảng viên.
  - Chỉ GVHD chính nhập/sửa/nộp điểm.
  - Hiển thị trạng thái báo cáo final để hỗ trợ chấm điểm báo cáo.
  - Chặn sửa khi điểm đã bị admin khóa.
  - Tự tính điểm tổng kết khi nhập.
  - Cảnh báo thiếu báo cáo final hoặc chưa xác nhận nơi thực tập.
  - Nút “Nộp điểm cho Khoa”.
- Admin:
  - Site “Bảng điểm”.
  - Lọc theo chưa có/nháp/đã nộp.
  - Dashboard tổng hợp: chưa có điểm, nháp, đã nộp, đã khóa.
  - Khóa/mở khóa điểm từng sinh viên.
  - Xuất XLSX để tổng hợp và nhập hệ thống.

Tiêu chí nghiệm thu:

- Không nhập điểm ngoài khoảng 0-10.
- Công thức 20/20/60 tính đúng.
- Giảng viên chỉ nhập điểm sinh viên mình phụ trách.
- Admin xuất được bảng điểm cuối kỳ.

### 9.7. P5 - Email tự động và lịch sử thông báo

Mục tiêu: giảm thao tác thủ công và giúp các bên không bỏ lỡ hạn. Phần lõi đã được triển khai: hệ thống ghi notification history khi có sự kiện quan trọng, có trang admin để xem/lọc/xuất XLSX/đánh dấu trạng thái, và có thể gửi email thật qua Resend khi cấu hình provider.

Thiết kế dữ liệu:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  recipient_email TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME
);
```

Các loại email ưu tiên:

- `registration_status_changed`
- `final_confirmation_open`
- `final_internship_confirmed`
- `advisor_assigned`
- `final_report_due_reminder`
- `final_report_status_changed`
- `grade_submitted`

Thiết kế API/worker:

- Khi sự kiện xảy ra, ghi bản ghi `notifications` với trạng thái `queued`.
- Nếu chưa chọn provider, vẫn lưu lịch sử thông báo để sau này gửi lại hoặc đánh dấu thủ công.
- `GET /api/admin/notifications`: admin xem lịch sử thông báo.
- `PUT /api/admin/notifications/:id/status`: admin cập nhật `queued/sent/failed`.
- `POST /api/admin/notifications/final-confirmation-open`: tạo thông báo mở xác nhận nơi thực tập cho sinh viên chưa xác nhận.
- `POST /api/admin/notifications/final-report-reminders`: tạo thông báo nhắc nộp báo cáo final cho sinh viên chưa nộp hoặc cần nộp lại.
- Có thể thêm cron job Cloudflare Worker để gửi nhắc hạn theo ngày.

Sự kiện đã ghi notification:

- Admin đổi trạng thái đăng ký hoặc duyệt tất cả.
- Sinh viên xác nhận nơi thực tập chính thức.
- Khoa phân công GVHD thủ công/import/tự phân công.
- Giảng viên/admin đổi trạng thái báo cáo final.
- GVHD chính nộp điểm.

Tiêu chí nghiệm thu:

- Mỗi sự kiện quan trọng tạo được notification.
- Admin xem được lịch sử gửi và lỗi gửi.
- Hệ thống không chặn nghiệp vụ chính nếu gửi email lỗi.

### 9.8. Thứ tự triển khai khuyến nghị

1. P0: Migration dữ liệu, danh sách thẩm định nội bộ, trạng thái gửi danh sách sang doanh nghiệp.
2. P1: Xác nhận nơi thực tập chính thức.
3. P2: Phân công GVHD và trang giảng viên.
4. P3: Upload báo cáo final PDF lên R2.
5. P4: Nhập điểm, nộp điểm, export bảng điểm.
6. P5: Email tự động và notification history.
7. P6: Đối soát đăng ký học phần với Phòng Đào tạo.
8. P7: Cổng doanh nghiệp, chỉ khi Khoa muốn doanh nghiệp tự phản hồi trên hệ thống trong tương lai.

### 9.9. Rủi ro và lưu ý kỹ thuật

- Cloudflare Worker hiện nhận JSON; upload PDF cần dùng `multipart/form-data` hoặc upload bằng signed URL. Với R2, hướng đơn giản là Worker nhận file, kiểm tra và ghi vào bucket.
- Cần đồng bộ logic giữa `server.ts` và `src/worker.ts` nếu vẫn duy trì cả hai runtime.
- Các migration hiện nằm trong code khởi tạo DB; khi schema phức tạp hơn nên tách thành migration có phiên bản.
- Danh sách giảng viên đang dựa vào tên để nhận diện `CN`, `GS`, `PGS`, `TS`, `ThS`; nên chuẩn hóa thêm trường học hàm/học vị nếu muốn chắc chắn.
- UI import đã ưu tiên XLSX; CSV vẫn được giữ như đường tương thích cho file cũ/seed. Nếu tiếp tục dùng CSV, cần parser chuẩn để tránh lỗi dấu phẩy trong tên/cột.
- Quyền tải báo cáo PDF phải kiểm tra chặt: sinh viên chỉ xem file của mình, giảng viên chỉ xem sinh viên được phân công, admin xem tất cả.
- Nếu số lượng file hoặc dung lượng vượt free tier R2, cần chính sách dọn dữ liệu sau khi kết thúc đợt hoặc chuyển lưu trữ dài hạn.

## 10. Các điểm đã chốt thêm

- Không có ngoại lệ dung lượng báo cáo final trong giai đoạn hiện tại. File PDF lớn hơn 10 MB bị từ chối và sinh viên phải nén lại.
- Không có ngoại lệ chỉ tiêu theo từng giảng viên trong giai đoạn hiện tại. Hệ thống dùng mặc định `GS`/`PGS` tối đa 10 sinh viên và `TS`/`ThS` tối đa 15 sinh viên, tính gộp cả hướng dẫn chính và đồng hướng dẫn.

## 11. Nhận xét tổng quan

Hệ thống hiện tại phù hợp để dùng như cổng đăng ký và tổng hợp danh sách ban đầu cho Khoa. Nếu mục tiêu là xử lý càng nhiều nghiệp vụ sau đăng ký càng tốt, cần mở rộng mô hình dữ liệu từ “nguyện vọng đăng ký” sang “hồ sơ thực tập” với các phần riêng: nơi thực tập chính thức, phân công GVHD, báo cáo final, đánh giá và điểm.

Thay đổi quan trọng nhất nên làm tiếp theo là thêm thực thể “nơi thực tập chính thức” cho mỗi sinh viên. Đây là điểm nối giữa giai đoạn đăng ký/xác nhận nơi thực tập và toàn bộ giai đoạn quản lý thực tập, phân công giảng viên, nộp báo cáo final và chấm điểm về sau.
