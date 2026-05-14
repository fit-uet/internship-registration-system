import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import fs from 'fs';
import { createClient, Client } from '@libsql/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { parse } from 'csv-parse/sync';

const JWT_SECRET = process.env.JWT_SECRET || 'uyet-vnu-secret-key-1234';

// A mock OAuth client ID. In production, this must match the frontend client ID.
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '123456789-mock.apps.googleusercontent.com';
const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

let db: Client;

async function initDb() {
  db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://internship-db-kieuvantuyen01.aws-ap-northeast-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg2Njc1ODgsImlkIjoiMDE5ZTIwYmMtZjYwMS03NDM4LWJhNGYtM2RmMGY0ZTczMWQ4IiwicmlkIjoiZTMxNjg3NjYtZWYzYy00OTI0LTlmYzItNWM3NzBlYTJhY2U0In0.6Ll3Ta48hjFtTme0UBKZZ8xNVO0wOD-f4JKTgRMGsTS4ob7ZiGAt1HIZxZ3b98seSdTDjP3XkgV6VGg3ii_ZAw'
  });

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      role TEXT DEFAULT 'student' -- 'student' or 'admin'
    );
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      slots INTEGER NOT NULL DEFAULT 5,
      contact_email TEXT,
      history TEXT,
      qualifications TEXT,
      address TEXT,
      recruitment_link TEXT,
      phone TEXT
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      student_id TEXT,
      dob TEXT,
      class_name TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (company_id) REFERENCES companies (id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed settings if empty
  const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/1VVH_O6glb3e9ugXa7SZcm0JuSNxm9NtarHRKubwJeY4/export?format=csv';
  await db.executeMultiple(`INSERT OR IGNORE INTO settings (key, value) VALUES ('google_sheet_url', '${defaultSheetUrl}')`);
  await db.executeMultiple(`INSERT OR IGNORE INTO settings (key, value) VALUES ('campaign_year', '2026')`);
  await db.executeMultiple(`INSERT OR IGNORE INTO settings (key, value) VALUES ('campaign_start', '22/05/2026')`);
  await db.executeMultiple(`INSERT OR IGNORE INTO settings (key, value) VALUES ('campaign_end', '15/06/2026')`);
  const defaultClasses = 'QH-2023-I/CQ-I-IT1, QH-2023-I/CQ-I-IT2, QH-2023-I/CQ-I-IT3, QH-2023-I/CQ-I-IS, QH-2023-I/CQ-I-CS1, QH-2023-I/CQ-I-CS2, QH-2023-I/CQ-I-CS3, QH-2023-I/CQ-I-CS4, QH-2023-I/CQ-I-CN';
  await db.executeMultiple(`INSERT OR IGNORE INTO settings (key, value) VALUES ('classes_list', '${defaultClasses}')`);

  const defaultPlan = `## KẾ HOẠCH TRIỂN KHAI THỰC TẬP HỌC KỲ

**Khoa CNTT thông báo triển khai Thực tập học kỳ như sau:**

**I. Lịch triển khai**

Đây là đợt thực tập chính thức để hoàn thiện học phần Thực tập dành cho sinh viên Khoa CNTT.
Để **đăng ký đi thực tập và được công nhận điểm học phần** này, các sinh viên cần phải tuân thủ quy trình sau:

1. Đăng ký với Khoa CNTT để xin đi thực tập đợt này trên trang **Hệ thống Đăng ký thực tập** (sau đây gọi là Website TTCN). Sinh viên nào chưa đăng ký thông tin trên hệ thống coi như chưa đăng ký đi thực tập đợt này. **Chú ý: cần làm thêm bước 6 để được công nhận điểm học phần Thực tập**.
2. Theo dõi các thông tin tuyển thực tập trên Website TTCN. Các sinh viên chủ động đăng ký (tối đa 5 công ty) và làm các thủ tục xin thực tập theo hướng dẫn của công ty mà mình đăng ký. Sinh viên sẽ chỉ thực tập tại 1 công ty để lấy điểm. Các sinh viên chưa tìm được thực tập tại công ty có thể xin thực tập tại trường cùng giảng viên hướng dẫn (xem bước 3).
3. Mỗi sinh viên thực tập tại trường sẽ được một giảng viên của Khoa hỗ trợ và chấm báo cáo thực tập (giảng viên hướng dẫn).
4. Các sinh viên được nhận làm thực tập phải cập nhật trạng thái hoặc xác nhận lại theo yêu cầu. Trong quá trình thực tập, sinh viên phải báo cáo định kỳ, nếu không sẽ bị trừ điểm.
5. Các sinh viên không được nhận làm thực tập tại các công ty và có nhu cầu thực tập tại trường với giảng viên (ở mục 3) có thể cập nhật thông tin trong hệ thống bằng cách đăng ký Nơi thực tập là "Trường Đại học Công nghệ" và ghi rõ tên Giảng viên hướng dẫn.
6. Để được công nhận điểm học phần Thực tâp chuyên ngành, các sinh viên cần đăng ký lớp môn học này trên website **http://daotao.vnu.edu.vn** khi có yêu cầu đăng ký từ Phòng Đào tạo. **Chú ý: nếu không đăng ký theo thông báo mở lớp môn học của Phòng Đào tạo trên, sinh viên sẽ không được công nhận điểm học phần Thực tập** **kỳ này.**

**Các mốc thời gian cụ thể cần chú ý**

| STT | Công việc | Thời gian dự kiến |
| --- | --- | --- |
| 1. | Sinh viên đăng ký thông tin cá nhân trên website TTCN. | Xem thông báo |
| 2. | Sinh viên tìm hiểu các thông tin tuyển thực tập trên website và đăng ký thực tập tại công ty **CÓ TRONG DANH SÁCH** (tối đa 5 công ty). | Xem thông báo |
| 3. | Khoa/Công ty nhận danh sách sinh viên đăng ký, sinh viên tham gia phỏng vấn (nếu có). | - |
| 4. | Các sinh viên không tìm được cơ hội thực tập tại công ty sẽ tiếp tục làm thực tập tại trường cùng giảng viên hướng dẫn. | - |
| 5. | Sinh viên đi thực tập (đảm bảo tổng thời lượng tối thiểu tương đương 6 tuần fulltime). Sinh viên phải báo cáo định kỳ với giảng viên hướng dẫn. | - |
| 6. | Sinh viên nộp báo cáo thực tập và giảng viên / công ty hướng dẫn sẽ đánh giá cho điểm. | - |

**II. Các hướng dẫn liên quan đến quá trình đăng ký và thực tập**

**2.1. Về việc đăng ký thực tập của sinh viên trên website TTCN**

* Phải điền đầy đủ các thông tin trên website. Quy trình như sau:
  * Truy cập vào trang **Hệ thống Đăng ký thực tập**.
  * Đăng nhập vào hệ thống bằng tài khoản email **@vnu.edu.vn** (qua nút Đăng nhập với Google).
  * Điền đầy đủ thông tin cá nhân trong form đăng ký (Mã SV, Lớp khóa học, Ngày sinh). Nếu thiếu thông tin hoặc thông tin bị sai, **sinh viên phải chịu hoàn toàn trách nhiệm**.
  * Mục **Danh sách nơi thực tập** sẽ liệt kê các công ty nhận thực tập.
  * Tích chọn các công ty mà mình muốn làm thực tập (tối đa 5 công ty). Có thể tra cứu thông tin công ty bằng cách nhấp vào tên công ty.
  * Ấn nút **Đăng ký** để hoàn tất nộp nguyện vọng.
  * **Lưu ý**: Sinh viên có thể thay đổi nguyện vọng bằng cách ấn nút "Hủy tất cả đăng ký" và thao tác đăng ký lại từ đầu, miễn là hệ thống còn mở trong thời hạn cho phép.

**2.2. Về các yêu cầu đối với sinh viên**

* Nếu sinh viên thực tập ở công ty thì đề tài sẽ do phía công ty giao. Nếu sinh viên thực tập ở trường thì giảng viên hướng dẫn là người giao đề tài.
* Sinh viên cần thường xuyên báo cáo tiến độ với giảng viên hướng dẫn, theo lịch giảng viên đưa ra.
* Mỗi sinh viên cần viết 01 báo cáo thực tập theo mẫu Khoa qui định. Sinh viên Ngành KHMT cần viết báo cáo bằng tiếng Anh. Nếu đi thực tập theo nhóm thì có thể viết chung 1 quyển báo cáo, tuy nhiên trong đó phải ghi rõ sự phân công công việc giữa các thành viên trong nhóm.
* Trong trường hợp cần thiết, giảng viên có thể liên lạc với người hướng dẫn phía công ty (chẳng hạn để trợ giúp sinh viên hoặc đánh giá kết quả làm việc của sinh viên cho chính xác). Sinh viên có trách nhiệm cung cấp thông tin liên hệ của người hướng dẫn phía công ty.
* Cách tính điểm TTCN:
  * 20% điểm báo cáo định kỳ
  * 20% điểm nội dung của bản báo cáo thực tập theo mẫu
  * 60% điểm đánh giá của phía công ty (nếu thực tập tại công ty) hoặc giảng viên hướng dẫn (thực tập tại trường).`;
  await db.executeMultiple(`INSERT OR IGNORE INTO settings (key, value) VALUES ('implementation_plan_md', '${defaultPlan.replace(/'/g, "''")}')`);

  try { await db.executeMultiple('ALTER TABLE companies ADD COLUMN contact_email TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE companies ADD COLUMN contact_name TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE companies ADD COLUMN history TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE companies ADD COLUMN qualifications TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE companies ADD COLUMN address TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE companies ADD COLUMN recruitment_link TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE companies ADD COLUMN phone TEXT'); } catch (e) { }

  try { await db.executeMultiple('ALTER TABLE users ADD COLUMN student_id TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE users ADD COLUMN dob TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE users ADD COLUMN class_name TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE users ADD COLUMN course_code TEXT'); } catch (e) { }

  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN student_id TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN dob TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN class_name TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN note TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN other_company_name TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN other_company_role TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN other_company_contact TEXT'); } catch (e) { }
  try { await db.executeMultiple('ALTER TABLE registrations ADD COLUMN course_code TEXT'); } catch (e) { }

  const otherExist = (await db.execute("SELECT id FROM companies WHERE name = 'Khác'")).rows[0];
  if (!otherExist) {
    await db.execute({
      sql: `
      INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, args: ['Khác', 'Đăng ký công ty ngoài danh sách', 9999, '', '', '', '', '', '', '']
    });
  }

  const schoolExist = (await db.execute("SELECT id FROM companies WHERE name = 'Thực tập ở trường'")).rows[0];
  if (!schoolExist) {
    await db.execute({
      sql: `
      INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, args: ['Thực tập ở trường', 'Thực tập tại các Lab/Dự án trong trường', 9999, '', '', '', '', '', '', '']
    });
  }
}

async function seedCompaniesIfEmpty() {
  const count = (await db.execute("SELECT COUNT(*) as count FROM companies WHERE name != 'Khác' AND name != 'Thực tập ở trường'")).rows[0] as { count: number };
  if (count.count > 0) return;

  const setting = (await db.execute("SELECT value FROM settings WHERE key = 'google_sheet_url'")).rows[0] as { value: string };
  if (!setting || !setting.value) return;

  let fetchUrl = setting.value;
  if (!fetchUrl.includes('export?format=csv')) {
    if (fetchUrl.includes('edit?usp=sharing')) {
      fetchUrl = fetchUrl.replace('edit?usp=sharing', 'export?format=csv');
    } else if (fetchUrl.includes('edit')) {
      fetchUrl = fetchUrl.split('edit')[0] + 'export?format=csv';
    }
  }

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) return;
    const csvData = await response.text();
    const records = parse(csvData, { columns: true, skip_empty_lines: true });

    const insertSql1 = `
      INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const record of records) {
      if (!record["Timestamp"]) continue;
      const name = record["Tên doanh nghiệp"]?.trim();
      if (!name) continue;

      const slotsStr = record["Số lượng sinh viên cần tuyển  "]?.trim() || record["Số lượng sinh viên cần tuyển"]?.trim() || "0";
      const slots = parseInt(slotsStr) || 5;
      let contactEmail = record["Email liên hệ"]?.trim() || record["Email Address"]?.trim() || '';
      const contactName = record["Họ và tên người liên hệ phụ trách thực tập"]?.trim() || '';
      let phone = record["Điện thoại liên hệ"]?.trim() || '';
      const address = record["Địa chỉ nơi thực tập"]?.trim() || '';
      const infoLink = record["Thông tin vị trí tuyển thực tập"]?.trim() || '';

      if (contactEmail && !phone) {
        const parts = contactEmail.split(/[\/,;\s]+/);
        const emails: string[] = [];
        const phones: string[] = [];
        for (const p of parts) {
          if (p.includes('@')) emails.push(p);
          else if (p.match(/[\d]{8,}/)) phones.push(p);
        }
        if (emails.length > 0) contactEmail = emails.join(', ');
        if (phones.length > 0) phone = phones.join(', ');
      }

      const description = `Tuyển ${slots} sinh viên thực tập.`;
      let qualifications = '';
      const history = `Công ty ${name} tuyển dụng thực tập sinh.`;

      await db.execute({ sql: insertSql1, args: [name, description, slots, contactEmail, history, qualifications, address, infoLink, phone, contactName] });
    }
  } catch (e) {
    console.error("Error seeding companies:", e);
  }
}

async function startServer() {
  await initDb();
  await seedCompaniesIfEmpty();

  const app = express();
  const PORT = 3000;

  // In-memory lock to prevent duplicate concurrent registration requests
  const processingUsers = new Set<number>();


  app.use(express.json());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://fit-uet.github.io',
    credentials: true,
  }));

  // --- API Routes ---

  // Auth Middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = (await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [decoded.id] })).rows[0];
      if (!req.user) return res.status(401).json({ error: 'User not found' });
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  };

  // 1. Google Login endpoint
  app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
      // Decode locally OR verify with google API if client ID is real
      // For development, we just decode the credential
      let payload: any;

      try {
        const ticket = await oAuth2Client.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (e) {
        // Fallback to simple decode if we have an invalid mock client ID
        const jwtDecode = (await import('jwt-decode')).jwtDecode;
        payload = jwtDecode(credential);
      }

      if (!payload || !payload.email) {
        return res.status(400).json({ error: 'Invalid token' });
      }

      const email = payload.email;

      const adminEmail = process.env.ADMIN_EMAIL;

      // Strict filter for @vnu.edu.vn and admin email
      if (!email.endsWith('@vnu.edu.vn') && email !== adminEmail) {
        return res.status(403).json({ error: 'Chỉ chấp nhận email @vnu.edu.vn' });
      }

      const role = (email === adminEmail) ? 'admin' : 'student';

      let user = (await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] })).rows[0] as any;
      if (!user) {
        const studentId = email.split('@')[0];
        const result = await db.execute({
          sql:
            'INSERT INTO users (email, name, picture, role, student_id) VALUES (?, ?, ?, ?, ?)'
          , args: [email, payload.name, payload.picture, role, studentId]
        });
        user = { id: result.lastInsertRowid, email, name: payload.name, picture: payload.picture, role, student_id: studentId, dob: null, class_name: null };
      } else {
        await db.execute({ sql: 'UPDATE users SET picture = ? WHERE id = ?', args: [payload.picture, user.id] });
        user.picture = payload.picture;
      }

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role, student_id: user.student_id, dob: user.dob, class_name: user.class_name, course_code: user.course_code } });
    } catch (err: any) {
      res.status(500).json({ error: 'Authenticaton failed', details: err.message });
    }
  });

  // 2. Get Companies
  app.get('/api/companies', requireAuth, async (req: any, res: any) => {
    const companies = (await db.execute(`
      SELECT c.*, 
             c.slots - (SELECT COUNT(*) FROM registrations r WHERE r.company_id = c.id AND r.status != 'rejected') as remaining_slots,
             (SELECT COUNT(*) FROM registrations r WHERE r.company_id = c.id AND r.status != 'rejected') as applicant_count
      FROM companies c
    `)).rows;
    res.json(companies);
  });

  app.get('/api/companies/it-list', requireAuth, (req, res) => {
    try {
      const itCompaniesFile = join(process.cwd(), 'it-companies-list.csv');
      if (fs.existsSync(itCompaniesFile)) {
        const content = fs.readFileSync(itCompaniesFile, 'utf8');
        const records = parse(content, { columns: true, skip_empty_lines: true });
        const list = records.map((r: any) => r['Tên công ty']?.trim()).filter(Boolean);
        res.json(list);
      } else {
        res.json([]);
      }
    } catch (e) {
      res.json([]);
    }
  });

  // 2c. Get lecturers
  app.get('/api/lecturers', async (req: any, res: any) => {
    try {
      const p = join(process.cwd(), 'lectures-list.csv');
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf-8');
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        res.json(lines);
      } else {
        res.json([]);
      }
    } catch (e) {
      res.json([]);
    }
  });

  // 2b. Get a single company
  app.get('/api/companies/:id', requireAuth, async (req: any, res: any) => {
    const company = (await db.execute({
      sql: `
      SELECT c.*, 
             c.slots - (SELECT COUNT(*) FROM registrations r WHERE r.company_id = c.id AND r.status != 'rejected') as remaining_slots,
             (SELECT COUNT(*) FROM registrations r WHERE r.company_id = c.id AND r.status != 'rejected') as applicant_count
      FROM companies c 
      WHERE c.id = ?
    `, args: [req.params.id]
    })).rows[0];
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  });

  // 1.5. Update user profile
  app.put('/api/users/profile', requireAuth, async (req: any, res: any) => {
    const { name, student_id, dob, class_name, course_code } = req.body;
    if (dob) {
      const d = new Date(dob);
      if (isNaN(d.getTime()) || d > new Date()) {
        return res.status(400).json({ error: 'Ngày sinh không hợp lệ.' });
      }
    }
    try {
      await db.execute({
        sql: 'UPDATE users SET name = ?, student_id = ?, dob = ?, class_name = ?, course_code = ? WHERE id = ?',
        args: [name, student_id, dob, class_name, course_code, req.user.id]
      });
      const updatedUser = (await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.user.id] })).rows[0];
      res.json(updatedUser);
    } catch (e: any) {
      res.status(500).json({ error: 'Database error: ' + e.message });
    }
  });

  // 3. Get Registration (Student)
  app.get('/api/registrations/my', requireAuth, async (req: any, res: any) => {
    const regs = (await db.execute({
      sql: `
      SELECT r.*, c.name as company_name 
      FROM registrations r
      JOIN companies c ON r.company_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.created_at ASC
    `, args: [req.user.id]
    })).rows;
    res.json(regs);
  });

  // 4. Register for companies (batch - up to 5)
  app.post('/api/registrations', requireAuth, async (req: any, res: any) => {
    const userId = req.user.id;
    if (processingUsers.has(userId)) {
      return res.status(429).json({ error: 'Yêu cầu đăng ký đang được xử lý, vui lòng không nhấn thêm.' });
    }
    processingUsers.add(userId);
    try {
    const { company_ids, student_id, dob, class_name, note, other_companies, course_code, school_lecturer } = req.body;

    if (!Array.isArray(company_ids) && (!Array.isArray(other_companies) || other_companies.length === 0)) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 công ty.' });
    }

    const khacCompany = (await db.execute("SELECT id FROM companies WHERE name = 'Khác'")).rows[0] as any;
    const schoolCompany = (await db.execute("SELECT id FROM companies WHERE name = 'Thực tập ở trường'")).rows[0] as any;
    const normal_company_ids = Array.isArray(company_ids) ? company_ids.filter((id: number) => id !== khacCompany?.id) : [];
    const totalWishes = normal_company_ids.length + (other_companies ? other_companies.length : 0);

    if (dob) {
      const d = new Date(dob);
      if (isNaN(d.getTime()) || d > new Date()) {
        return res.status(400).json({ error: 'Ngày sinh không hợp lệ.' });
      }
    }

    if (totalWishes === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 công ty.' });
    }
    if (normal_company_ids.includes(schoolCompany?.id)) {
      if (!school_lecturer) {
        return res.status(400).json({ error: 'Vui lòng chọn giảng viên hướng dẫn khi thực tập ở trường.' });
      }
      const p = join(process.cwd(), 'lectures-list.csv');
      let lecturers: string[] = [];
      if (fs.existsSync(p)) {
        lecturers = fs.readFileSync(p, 'utf-8').split('\n').map((l: string) => l.trim()).filter(Boolean);
      }
      if (lecturers.length > 0 && !lecturers.includes(school_lecturer)) {
        return res.status(400).json({ error: 'Giảng viên hướng dẫn không hợp lệ. Vui lòng chọn trong danh sách.' });
      }
    }
    if (totalWishes > 5) {
      return res.status(400).json({ error: 'Bạn chỉ được chọn tối đa 5 công ty.' });
    }

    if (other_companies && other_companies.length > 0) {
      for (const other of other_companies) {
        if (!other.name || !other.role || !other.contact) {
          return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin các công ty ngoài danh sách.' });
        }
      }
    }

    // Delete existing registrations first
    await db.execute({ sql: 'DELETE FROM registrations WHERE user_id = ?', args: [req.user.id] });

      const insertSql2 = "INSERT INTO registrations (user_id, company_id, student_id, dob, class_name, note, status, other_company_name, other_company_role, other_company_contact, course_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))";

      for (const companyId of normal_company_ids) {
        const contactInfo = companyId === schoolCompany?.id ? school_lecturer : null;
        await db.execute({ sql: insertSql2, args: [req.user.id, companyId, student_id, dob, class_name, note, 'approved', null, null, contactInfo, course_code] });
      }

      if (other_companies && Array.isArray(other_companies)) {
        for (const other of other_companies) {
          let inList = false;
          const itCompaniesFile = join(process.cwd(), 'it-companies-list.csv');
          if (fs.existsSync(itCompaniesFile) && other.name) {
            const content = fs.readFileSync(itCompaniesFile, 'utf8');
            const records = parse(content, { columns: true, skip_empty_lines: true });
            const list = records.map((r: any) => r['Tên công ty']?.trim()).filter(Boolean);
            inList = list.includes(other.name.trim());
          }
          const status = inList ? 'approved' : 'pending';

          await db.execute({
            sql: insertSql2,
            args: [
              req.user.id,
              khacCompany.id,
              student_id,
              dob,
              class_name,
              note,
              status,
              other.name,
              other.role,
              other.contact,
              course_code
            ]
          });
        }
      }

      await db.execute({
        sql: 'UPDATE users SET student_id = ?, dob = ?, class_name = ?, course_code = ? WHERE id = ?',
        args: [student_id || req.user.student_id, dob || req.user.dob, class_name || req.user.class_name, course_code || req.user.course_code, req.user.id]
      });
      const updatedUser = (await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.user.id] })).rows[0];

      res.json({ success: true, user: updatedUser });
    } catch (e: any) {
      res.status(500).json({ error: 'Database error: ' + e.message });
    } finally {
      processingUsers.delete(userId);
    }
  });

  // 5. Withdraw Registration
  app.delete('/api/registrations/my', requireAuth, async (req: any, res: any) => {
    await db.execute({ sql: 'DELETE FROM registrations WHERE user_id = ?', args: [req.user.id] });
    res.json({ success: true });
  });

  // 5b. Withdraw a single registration
  app.delete('/api/registrations/:id', requireAuth, async (req: any, res: any) => {
    const { id } = req.params;
    // Only allow deleting own registration
    const reg = (await db.execute({ sql: 'SELECT * FROM registrations WHERE id = ? AND user_id = ?', args: [id, req.user.id] })).rows[0];
    if (!reg) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    await db.execute({ sql: 'DELETE FROM registrations WHERE id = ?', args: [id] });
    res.json({ success: true });
  });

  // 12. Admin: Get Students
  app.get('/api/admin/students', requireAuth, requireAdmin, async (req: any, res: any) => {
    const students = (await db.execute("SELECT id, email, name, student_id, dob, class_name FROM users WHERE role = 'student' ORDER BY student_id ASC")).rows;
    res.json(students);
  });

  // 13. Admin: Bulk Import Students
  app.post('/api/admin/students/bulk', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { students, override } = req.body;
    if (!Array.isArray(students)) return res.status(400).json({ error: 'Expected array of students' });
    try {
      let count = 0;
      for (const s of students) {
        if (!s.student_id || !s.name) continue;
        const email = `${s.student_id}@vnu.edu.vn`;
        if (override) {
          await db.execute({
            sql: `INSERT INTO users (email, name, role, student_id, dob, class_name) 
                  VALUES (?, ?, 'student', ?, ?, ?) 
                  ON CONFLICT(email) DO UPDATE SET 
                  name=excluded.name, dob=excluded.dob, class_name=excluded.class_name, student_id=excluded.student_id`,
            args: [email, s.name, s.student_id, s.dob || '', s.class_name || '']
          });
        } else {
          await db.execute({
            sql: `INSERT OR IGNORE INTO users (email, name, role, student_id, dob, class_name) 
                  VALUES (?, ?, 'student', ?, ?, ?)`,
            args: [email, s.name, s.student_id, s.dob || '', s.class_name || '']
          });
        }
        count++;
      }
      res.json({ success: true, count });
    } catch (e: any) {
      res.status(500).json({ error: 'Database error: ' + e.message });
    }
  });

  // 14. Admin: Add/Update Single Student
  app.post('/api/admin/students', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { student_id, name, dob, class_name } = req.body;
    if (!student_id || !name) return res.status(400).json({ error: 'Mã SV và Họ tên là bắt buộc' });
    try {
      await db.execute({
        sql: `INSERT INTO users (email, name, role, student_id, dob, class_name) 
              VALUES (?, ?, 'student', ?, ?, ?) 
              ON CONFLICT(email) DO UPDATE SET 
              name=excluded.name, dob=excluded.dob, class_name=excluded.class_name, student_id=excluded.student_id`,
        args: [`${student_id}@vnu.edu.vn`, name, student_id, dob || '', class_name || '']
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Database error: ' + e.message });
    }
  });

  // 15. Admin: Delete Single Student
  app.delete('/api/admin/students/:id', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
      const user = (await db.execute({ sql: "SELECT id FROM users WHERE student_id = ? AND role = 'student'", args: [req.params.id] })).rows[0] as any;
      if (user) {
        await db.execute({ sql: 'DELETE FROM registrations WHERE user_id = ?', args: [user.id] });
        await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [user.id] });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Database error: ' + e.message });
    }
  });

  // 6. Admin: Get all registrations
  app.get('/api/admin/registrations', requireAuth, requireAdmin, async (req, res) => {
    const data = (await db.execute(`
      SELECT 
        r.id as registration_id,
        u.email,
        u.name as student_name,
        r.student_id,
        r.dob,
        r.class_name,
        r.note,
        c.name as company_name,
        r.status,
        r.created_at,
        r.other_company_name,
        r.other_company_role,
        r.other_company_contact,
        r.course_code,
        c.contact_email
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN companies c ON r.company_id = c.id
      ORDER BY r.created_at DESC
    `)).rows;
    res.json(data);
  });

  // 7. Admin: Export CSV
  app.get('/api/admin/export.csv', requireAuth, requireAdmin, async (req, res) => {
    const data = (await db.execute(`
      SELECT 
        r.student_id as "Mã SV",
        u.name as "Họ và tên",
        r.dob as "Ngày sinh",
        r.class_name as "Lớp KH",
        r.course_code as "Mã môn học",
        CASE WHEN c.name = 'Khác' THEN 'Công ty khác: ' || coalesce(r.other_company_name, '') WHEN c.name = 'Thực tập ở trường' THEN 'Trường Đại học Công nghệ' ELSE c.name END as "Nơi thực tập",
        CASE WHEN c.name = 'Khác' THEN coalesce(r.other_company_role, '') ELSE 'Thực tập sinh' END as "Vị trí",
        CASE WHEN c.name = 'Khác' THEN coalesce(r.other_company_contact, '') ELSE c.contact_email END as "Liên hệ",
        CASE WHEN c.name = 'Thực tập ở trường' THEN 'GVHD: ' || coalesce(r.other_company_contact, '') || CASE WHEN coalesce(r.note, '') != '' THEN ' - ' || r.note ELSE '' END ELSE r.note END as "Ghi chú",
        r.status as "Trạng thái",
        r.created_at as "Thời gian đăng ký"
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      JOIN companies c ON r.company_id = c.id
      ORDER BY r.created_at DESC
    `)).rows as any[];

    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="thuctap_cntt_uet.csv"');
      return res.send('\uFEFF"STT","Mã SV","Họ và tên","Ngày sinh","Lớp KH","Mã môn học","Nơi thực tập","Vị trí","Liên hệ","Ghi chú","Trạng thái","Thời gian đăng ký"\n');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push('"STT",' + headers.map(h => `"${h}"`).join(','));

    let stt = 1;
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(`"${stt++}",` + values.join(','));
    }

    const csvStr = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8 UTF16
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="thuctap_cntt_uet_2026.csv"');
    res.send(csvStr);
  });


  // 7a. Admin: Save to Google Sheets
  app.post('/api/admin/export-to-sheet', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const key = process.env.GOOGLE_PRIVATE_KEY;
      if (!email || !key) {
        return res.status(400).json({ error: 'Chức năng này yêu cầu cấu hình Service Account (GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_PRIVATE_KEY) trên Render.' });
      }

      const setting = (await db.execute("SELECT value FROM settings WHERE key = 'export_google_sheet_url'")).rows[0] as { value: string };
      const url = setting?.value;
      if (!url) return res.status(400).json({ error: 'Bạn chưa cấu hình [Đường dẫn Google Sheet xuất dữ liệu] trong phần Cài đặt hệ thống.' });

      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) return res.status(400).json({ error: 'URL Google Sheet không hợp lệ' });
      const spreadsheetId = match[1];

      const data = (await db.execute(`
        SELECT 
          r.student_id as "Mã SV",
          u.name as "Họ và tên",
          r.dob as "Ngày sinh",
          r.class_name as "Lớp KH",
          r.course_code as "Mã môn học",
          CASE WHEN c.name = 'Khác' THEN 'Công ty khác: ' || coalesce(r.other_company_name, '') WHEN c.name = 'Thực tập ở trường' THEN 'Trường Đại học Công nghệ' ELSE c.name END as "Nơi thực tập",
          CASE WHEN c.name = 'Khác' THEN coalesce(r.other_company_role, '') ELSE 'Thực tập sinh' END as "Vị trí",
          CASE WHEN c.name = 'Khác' THEN coalesce(r.other_company_contact, '') ELSE c.contact_email END as "Liên hệ",
          CASE WHEN c.name = 'Thực tập ở trường' THEN 'GVHD: ' || coalesce(r.other_company_contact, '') || CASE WHEN coalesce(r.note, '') != '' THEN ' - ' || r.note ELSE '' END ELSE r.note END as "Ghi chú",
          r.status as "Trạng thái",
          r.created_at as "Thời gian đăng ký"
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        JOIN companies c ON r.company_id = c.id
        ORDER BY r.created_at DESC
      `)).rows as any[];

      const headers = data.length > 0 ? ['STT', ...Object.keys(data[0])] : ['STT'];
      const rows = data.map((r, i) => [i + 1, ...Object.values(r)]);
      const sheetData = [headers, ...rows];

      const { google } = await import('googleapis');
      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: email, private_key: key.replace(/\\n/g, '\n') },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: sheetData },
      });

      res.json({ success: true, message: 'Đã lưu dữ liệu vào Google Sheets thành công!' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi khi lưu vào Google Sheets: ' + error.message });
    }
  });


  // 7b. Admin: Approve all pending registrations
  app.put('/api/admin/registrations/approve-all', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
      await db.execute("UPDATE registrations SET status = 'approved' WHERE status = 'pending'");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 8. Admin: Update registration status
  app.put('/api/admin/registrations/:id/status', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      await db.execute({ sql: 'UPDATE registrations SET status = ? WHERE id = ?', args: [status, id] });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/settings/campaign', async (req: any, res: any) => {
    const year = (await db.execute("SELECT value FROM settings WHERE key = 'campaign_year'")).rows[0] as { value: string };
    const start = (await db.execute("SELECT value FROM settings WHERE key = 'campaign_start'")).rows[0] as { value: string };
    const end = (await db.execute("SELECT value FROM settings WHERE key = 'campaign_end'")).rows[0] as { value: string };
    const classes = (await db.execute("SELECT value FROM settings WHERE key = 'classes_list'")).rows[0] as { value: string };

    res.json({
      year: year ? year.value : '2026',
      start: start ? start.value : '22/05/2026',
      end: end ? end.value : '15/06/2026',
      classes_list: classes ? classes.value : 'QH-2023-I/CQ-I-IT1, QH-2023-I/CQ-I-IT2, QH-2023-I/CQ-I-IT3, QH-2023-I/CQ-I-IS, QH-2023-I/CQ-I-CS1, QH-2023-I/CQ-I-CS2, QH-2023-I/CQ-I-CS3, QH-2023-I/CQ-I-CS4, QH-2023-I/CQ-I-CN'
    });
  });

  app.put('/api/settings/campaign', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { year, start, end, classes_list } = req.body;
    await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('campaign_year', ?)", args: [year] });
    await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('campaign_start', ?)", args: [start] });
    await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('campaign_end', ?)", args: [end] });
    if (classes_list) {
      await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('classes_list', ?)", args: [classes_list] });
    }
    res.json({ success: true });
  });

  // 9. Admin: Settings
  app.get('/api/settings/google-sheet', requireAuth, requireAdmin, async (req: any, res: any) => {
    const setting = (await db.execute("SELECT value FROM settings WHERE key = 'google_sheet_url'")).rows[0] as { value: string };
    const exportSetting = (await db.execute("SELECT value FROM settings WHERE key = 'export_google_sheet_url'")).rows[0] as { value: string };
    const planSetting = (await db.execute("SELECT value FROM settings WHERE key = 'implementation_plan_md'")).rows[0] as { value: string };
    res.json({
      url: setting ? setting.value : '',
      export_url: exportSetting ? exportSetting.value : '',
      plan: planSetting ? planSetting.value : ''
    });
  });

  app.put('/api/settings/google-sheet', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { url, export_url, plan } = req.body;
    if (url !== undefined) {
      await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('google_sheet_url', ?)", args: [url] });
    }
    if (export_url !== undefined) {
      await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('export_google_sheet_url', ?)", args: [export_url] });
    }
    if (plan !== undefined) {
      await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('implementation_plan_md', ?)", args: [plan] });
    }
    res.json({ success: true });
  });

  // Public endpoint for students to view the plan
  app.get('/api/plan', async (req: any, res: any) => {
    const planSetting = (await db.execute("SELECT value FROM settings WHERE key = 'implementation_plan_md'")).rows[0] as { value: string };
    res.json({ plan: planSetting ? planSetting.value : '' });
  });

  // 11. Admin: Manage admins
  app.get('/api/admin/admins', requireAuth, requireAdmin, async (req: any, res: any) => {
    const admins = (await db.execute("SELECT id, email, name FROM users WHERE role = 'admin'")).rows;
    res.json(admins);
  });

  app.post('/api/admin/admins', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { email } = req.body;
    if (!email || (!email.endsWith('@vnu.edu.vn') && email !== process.env.ADMIN_EMAIL)) {
      return res.status(400).json({ error: 'Chỉ hỗ trợ email @vnu.edu.vn' });
    }
    try {
      await db.execute({
        sql: `
        INSERT INTO users (email, name, role) VALUES (?, 'Admin', 'admin')
        ON CONFLICT(email) DO UPDATE SET role = 'admin'
      `, args: [email]
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/admins/:id', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Không thể tự hủy quyền của chính mình' });
    }
    try {
      await db.execute({ sql: "UPDATE users SET role = 'student' WHERE id = ?", args: [id] });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 10. Admin: Import companies from Google Sheet
  app.post('/api/settings/import-companies', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
      const setting = (await db.execute("SELECT value FROM settings WHERE key = 'google_sheet_url'")).rows[0] as { value: string };
      if (!setting || !setting.value) {
        return res.status(400).json({ error: 'Spreadsheet URL not set' });
      }

      let fetchUrl = setting.value;
      if (!fetchUrl.includes('export?format=csv')) {
        if (fetchUrl.includes('edit?usp=sharing')) {
          fetchUrl = fetchUrl.replace('edit?usp=sharing', 'export?format=csv');
        } else if (fetchUrl.includes('edit')) {
          fetchUrl = fetchUrl.split('edit')[0] + 'export?format=csv';
        }
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch from Google Sheets');
      }

      const csvData = await response.text();
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true
      });

      if (records.length === 0) {
        return res.status(400).json({ error: 'No records found in CSV' });
      }

      // We clear the tables
      await db.executeMultiple('DELETE FROM companies');
      await db.executeMultiple('DELETE FROM registrations');

      const insertSql1 = `
      INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      let importedCount = 0;
      for (const record of records) {
        if (!record["Timestamp"]) continue;

        const name = record["Tên doanh nghiệp"]?.trim();
        if (!name) continue;

        const slotsStr = record["Số lượng sinh viên cần tuyển  "]?.trim() || record["Số lượng sinh viên cần tuyển"]?.trim() || "0";
        const slots = parseInt(slotsStr) || 5;
        let contactEmail = record["Email liên hệ"]?.trim() || record["Email Address"]?.trim() || '';
        const contactName = record["Họ và tên người liên hệ phụ trách thực tập"]?.trim() || '';
        let phone = record["Điện thoại liên hệ"]?.trim() || '';
        const address = record["Địa chỉ nơi thực tập"]?.trim() || '';
        const infoLink = record["Thông tin vị trí tuyển thực tập"]?.trim() || '';

        // Clean up email/phone if they are combined in the email field
        if (contactEmail && !phone) {
          const parts = contactEmail.split(/[\/,;\s]+/);
          const emails: string[] = [];
          const phones: string[] = [];
          for (const p of parts) {
            if (p.includes('@')) emails.push(p);
            else if (p.match(/[\d]{8,}/)) phones.push(p);
          }
          if (emails.length > 0) contactEmail = emails.join(', ');
          if (phones.length > 0) phone = phones.join(', ');
        }

        let qualifications = '';

        const description = `Tuyển ${slots} sinh viên thực tập.`;
        const history = `Công ty ${name} tuyển dụng thực tập sinh.`;
        await db.execute({ sql: insertSql1, args: [name, description, slots, contactEmail, history, qualifications, address, infoLink, phone, contactName] });
        importedCount++;
      }

      insertStmt.run('Khác', 'Đăng ký công ty ngoài danh sách', 9999, '', '', '', '', '', '', '');
      res.json({ success: true, count: importedCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
