import { createClient, type Client } from '@libsql/client/web';

type Env = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET: string;
  VITE_GOOGLE_CLIENT_ID: string;
  ADMIN_EMAIL?: string;
  CORS_ORIGIN?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
};

const encoder = new TextEncoder();
const DB_BATCH_SIZE = 100;
const DEFAULT_CLASSES = 'QH-2023-I/CQ-I-IT1, QH-2023-I/CQ-I-IT2, QH-2023-I/CQ-I-IT3, QH-2023-I/CQ-I-IS, QH-2023-I/CQ-I-CS1, QH-2023-I/CQ-I-CS2, QH-2023-I/CQ-I-CS3, QH-2023-I/CQ-I-CS4, QH-2023-I/CQ-I-CN';
const DEFAULT_PLAN = `## KẾ HOẠCH TRIỂN KHAI THỰC TẬP HỌC KỲ

Khoa CNTT thông báo triển khai Thực tập học kỳ. Sinh viên đăng nhập bằng email @vnu.edu.vn, cập nhật hồ sơ và đăng ký tối đa 5 nguyện vọng thực tập trong thời gian hệ thống mở.`;

let client: Client | null = null;
let initPromise: Promise<void> | null = null;

function db(env: Env) {
  if (!client) {
    client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

function corsHeaders(request: Request, env: Env) {
  const allowed = (env.CORS_ORIGIN || 'https://fit-uet.github.io')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = request.headers.get('origin') || '';
  return {
    'access-control-allow-origin': origin && allowed.includes(origin) ? origin : allowed[0] || '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  };
}

async function readBody<T = any>(request: Request): Promise<T> {
  if (!request.headers.get('content-type')?.includes('application/json')) return {} as T;
  return request.json();
}

function b64url(input: string | ArrayBuffer) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function signJwt(payload: Record<string, unknown>, secret: string, expiresInSeconds = 7 * 24 * 3600) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  return `${signingInput}.${b64url(signature)}`;
}

async function verifyJwt(token: string, secret: string) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new Error('Invalid token');
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, fromB64url(signature), encoder.encode(signingInput));
  if (!ok) throw new Error('Invalid token');
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
  if (claims.exp && Date.now() / 1000 > claims.exp) throw new Error('Token expired');
  return claims;
}

async function executeBatch(database: Client, statements: any[]) {
  for (let i = 0; i < statements.length; i += DB_BATCH_SIZE) {
    await database.batch(statements.slice(i, i + DB_BATCH_SIZE), 'write');
  }
}

function rowsToSettings(rows: any[]) {
  return Object.fromEntries(rows.map(row => [row.key, row.value])) as Record<string, string>;
}

function normalizeCompanyName(name: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

async function ensureSpecialCompanies(database: Client) {
  await executeBatch(database, [
    {
      sql: `INSERT OR IGNORE INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['Công ty khác', 'Đăng ký công ty ngoài danh sách phải đảm bảo công ty đó đáp ứng được chất lượng thực tập.', 9999, '', '', '', '', '', '', ''],
    },
    {
      sql: `INSERT OR IGNORE INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['Trường Đại học Công nghệ', 'Sinh viên thực tập tại các Lab/Dự án trong trường.', 9999, '', '', '', '', '', '', ''],
    },
  ]);
}

async function syncLecturerUsers(database: Client) {
  await database.executeMultiple(`
    DELETE FROM lecturers
    WHERE email IN (SELECT email FROM users WHERE role = 'admin' AND COALESCE(is_lecturer, 0) = 0);

    UPDATE users
    SET role = CASE WHEN role = 'admin' THEN 'admin' ELSE 'lecturer' END,
        is_lecturer = 1,
        name = (SELECT lecturers.name FROM lecturers WHERE lecturers.email = users.email LIMIT 1)
    WHERE email IN (SELECT email FROM lecturers WHERE email IS NOT NULL AND email != '');

    UPDATE users
    SET role = 'student', is_lecturer = 0
    WHERE role = 'lecturer'
      AND email NOT IN (SELECT email FROM lecturers WHERE email IS NOT NULL AND email != '');

    INSERT OR IGNORE INTO lecturers (name, email)
    SELECT name, email
    FROM users
    WHERE role = 'admin' AND COALESCE(is_lecturer, 0) = 1 AND email IS NOT NULL;
  `);
}

async function initDb(env: Env) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const database = db(env);
    await database.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        picture TEXT,
        role TEXT NOT NULL DEFAULT 'student',
        is_lecturer INTEGER DEFAULT 0,
        student_id TEXT,
        dob TEXT,
        class_name TEXT,
        course_code TEXT,
        phone TEXT,
        personal_email TEXT
      );
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        slots INTEGER NOT NULL DEFAULT 5,
        contact_email TEXT,
        contact_name TEXT,
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
        note TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        other_company_name TEXT,
        other_company_role TEXT,
        other_company_contact TEXT,
        sent_to_company_at DATETIME,
        sent_to_company_note TEXT
      );
      CREATE TABLE IF NOT EXISTS approved_company_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        normalized_name TEXT UNIQUE NOT NULL,
        source TEXT DEFAULT 'csv',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
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
        confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_by INTEGER,
        locked_at DATETIME,
        note TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS lecturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, email TEXT);
    `);

    await database.executeMultiple(`
      INSERT OR IGNORE INTO settings (key, value) VALUES ('google_sheet_url', '');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('export_google_sheet_url', '');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('campaign_year', '2026');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('campaign_start', '22/05/2026');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('campaign_end', '15/06/2026');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_open_at', '');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_close_at', '');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('confirmation_open_at', '');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('confirmation_close_at', '');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('final_report_due_at', '');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('classes_list', '${DEFAULT_CLASSES}');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('implementation_plan_md', '${DEFAULT_PLAN.replace(/'/g, "''")}');
    `);

    const migrations = [
      'ALTER TABLE registrations ADD COLUMN sent_to_company_at DATETIME',
      'ALTER TABLE registrations ADD COLUMN sent_to_company_note TEXT',
      'ALTER TABLE final_internships ADD COLUMN school_lecturer TEXT',
    ];
    for (const sql of migrations) {
      try { await database.execute(sql); } catch (e) { }
    }

    await database.executeMultiple(`
      DELETE FROM registrations
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM registrations
        GROUP BY user_id, company_id, COALESCE(other_company_name, '')
      );
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id_unique ON users(student_id)
        WHERE role = 'student' AND student_id IS NOT NULL AND student_id != '';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_unique ON companies(name);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lecturers_email_unique ON lecturers(email)
        WHERE email IS NOT NULL AND email != '';
      CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_company_status ON registrations(company_id, status);
      CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_user_company_other_unique
        ON registrations(user_id, company_id, COALESCE(other_company_name, ''));
      CREATE UNIQUE INDEX IF NOT EXISTS idx_approved_company_names_normalized_unique
        ON approved_company_names(normalized_name);
      CREATE INDEX IF NOT EXISTS idx_final_internships_user_id ON final_internships(user_id);
      CREATE INDEX IF NOT EXISTS idx_final_internships_company_id ON final_internships(company_id);
    `);
    await ensureSpecialCompanies(database);
  })();
  return initPromise;
}

async function requireUser(request: Request, env: Env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const claims: any = await verifyJwt(token, env.JWT_SECRET);
  const user = (await db(env).execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [claims.id] })).rows[0] as any;
  if (!user) throw new Response(JSON.stringify({ error: 'User not found' }), { status: 401 });
  return user;
}

function requireRole(user: any, roles: string[]) {
  if (!roles.includes(user.role)) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
}

async function verifyGoogleToken(credential: string, env: Env) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) throw new Error('Invalid Google token');
  const payload: any = await res.json();
  if (payload.aud !== env.VITE_GOOGLE_CLIENT_ID) throw new Error('Invalid Google client');
  return payload;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function recordsFromCsv(text: string) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  const headers = rows.shift() || [];
  return rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] || ''])));
}

async function getGoogleAccessToken(env: Env) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google service account configuration');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const pem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));
  const assertion = `${signingInput}.${b64url(signature)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Google auth failed');
  return data.access_token as string;
}

async function handleAuthGoogle(request: Request, env: Env) {
  const { credential } = await readBody(request);
  if (!credential) return json({ error: 'Missing credential' }, 400);
  const payload = await verifyGoogleToken(credential, env);
  const email = payload.email;
  if (!email || (!email.endsWith('@vnu.edu.vn') && email !== env.ADMIN_EMAIL)) {
    return json({ error: 'Chỉ chấp nhận email @vnu.edu.vn' }, 403);
  }
  const database = db(env);
  const lecturer = (await database.execute({ sql: 'SELECT * FROM lecturers WHERE email = ?', args: [email] })).rows[0] as any;
  const displayName = lecturer?.name || payload.name || email;
  const isLecturer = !!lecturer;
  const defaultRole = email === env.ADMIN_EMAIL ? 'admin' : isLecturer ? 'lecturer' : 'student';
  let user = (await database.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] })).rows[0] as any;
  if (!user) {
    const studentId = defaultRole === 'student' ? email.split('@')[0] : null;
    const result = await database.execute({
      sql: 'INSERT INTO users (email, name, picture, role, student_id, is_lecturer) VALUES (?, ?, ?, ?, ?, ?)',
      args: [email, displayName, payload.picture || null, defaultRole, studentId, isLecturer ? 1 : 0],
    });
    user = { id: Number(result.lastInsertRowid), email, name: displayName, picture: payload.picture, role: defaultRole, student_id: studentId, is_lecturer: isLecturer ? 1 : 0 };
  } else {
    const nextRole = isLecturer ? (user.role === 'admin' ? 'admin' : 'lecturer') : (user.role === 'lecturer' ? 'student' : user.role);
    await database.execute({
      sql: `UPDATE users SET picture = ?, role = ?, name = CASE WHEN ? = 1 THEN ? ELSE name END,
            is_lecturer = CASE WHEN ? = 1 THEN 1 ELSE CASE WHEN ? = 1 THEN 0 ELSE is_lecturer END END,
            student_id = CASE WHEN ? = 'student' THEN student_id ELSE NULL END
            WHERE id = ?`,
      args: [payload.picture || null, nextRole, isLecturer ? 1 : 0, displayName, isLecturer ? 1 : 0, nextRole === 'student' ? 1 : 0, nextRole, user.id],
    });
    user = (await database.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [user.id] })).rows[0];
  }
  const token = await signJwt({ id: user.id, role: user.role }, env.JWT_SECRET);
  return json({ token, user });
}

async function route(request: Request, env: Env) {
  await initDb(env);
  const database = db(env);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'POST' && path === '/api/auth/google') return handleAuthGoogle(request, env);
  if (method === 'GET' && path === '/api/plan') {
    const row = (await database.execute("SELECT value FROM settings WHERE key = 'implementation_plan_md'")).rows[0] as any;
    return json({ plan: row?.value || '' });
  }

  const user = await requireUser(request, env);

  if (method === 'GET' && path === '/api/companies') {
    requireRole(user, ['student', 'admin']);
    const companies = (await database.execute(`
      SELECT c.*, c.slots - COALESCE(rc.applicant_count, 0) as remaining_slots, COALESCE(rc.applicant_count, 0) as applicant_count
      FROM companies c
      LEFT JOIN (
        SELECT company_id, COUNT(*) as applicant_count
        FROM registrations
        WHERE status != 'rejected'
        GROUP BY company_id
      ) rc ON rc.company_id = c.id
    `)).rows;
    return json(companies);
  }

  if (method === 'GET' && path === '/api/companies/it-list') {
    const list = (await database.execute(`
      SELECT name FROM companies
      WHERE name NOT IN ('Công ty khác', 'Trường Đại học Công nghệ')
      ORDER BY name ASC
    `)).rows.map((row: any) => row.name);
    return json(list);
  }

  if (method === 'GET' && path === '/api/lecturers') {
    const lecturers = (await database.execute('SELECT name FROM lecturers ORDER BY name ASC')).rows.map((r: any) => r.name);
    return json(lecturers);
  }

  const companyMatch = path.match(/^\/api\/companies\/(\d+)$/);
  if (method === 'GET' && companyMatch) {
    requireRole(user, ['student', 'admin']);
    const company = (await database.execute({
      sql: `SELECT c.*, c.slots - COALESCE(rc.applicant_count, 0) as remaining_slots, COALESCE(rc.applicant_count, 0) as applicant_count
            FROM companies c
            LEFT JOIN (
              SELECT company_id, COUNT(*) as applicant_count FROM registrations WHERE status != 'rejected' GROUP BY company_id
            ) rc ON rc.company_id = c.id
            WHERE c.id = ?`,
      args: [companyMatch[1]],
    })).rows[0];
    return company ? json(company) : json({ error: 'Company not found' }, 404);
  }

  if (method === 'PUT' && path === '/api/users/profile') {
    const body = await readBody(request);
    if (!body.name) return json({ error: 'Họ và tên là bắt buộc.' }, 400);
    const isStaff = user.role === 'admin' || user.role === 'lecturer';
    if (isStaff) {
      await database.execute({ sql: 'UPDATE users SET name = ? WHERE id = ?', args: [body.name, user.id] });
      if (user.role === 'lecturer' || user.is_lecturer) {
        await database.execute({ sql: 'UPDATE lecturers SET name = ? WHERE email = ?', args: [body.name, user.email] });
        await syncLecturerUsers(database);
      }
    } else {
      await database.execute({
        sql: 'UPDATE users SET name = ?, student_id = ?, dob = ?, class_name = ?, course_code = ?, phone = ?, personal_email = ? WHERE id = ?',
        args: [body.name, body.student_id || null, body.dob || null, body.class_name || null, body.course_code || null, body.phone || null, body.personal_email || null, user.id],
      });
    }
    const updated = (await database.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [user.id] })).rows[0];
    return json(updated);
  }

  if (method === 'GET' && path === '/api/registrations/my') {
    requireRole(user, ['student']);
    const regs = (await database.execute({
      sql: `SELECT r.*, c.name as company_name FROM registrations r JOIN companies c ON r.company_id = c.id WHERE r.user_id = ? ORDER BY r.created_at ASC`,
      args: [user.id],
    })).rows;
    return json(regs);
  }

  if (method === 'GET' && path === '/api/internships/final/my') {
    requireRole(user, ['student']);
    const final = (await database.execute({
      sql: `SELECT f.*, c.name as company_name, r.other_company_name, r.other_company_role, r.other_company_contact
            FROM final_internships f
            LEFT JOIN companies c ON f.company_id = c.id
            LEFT JOIN registrations r ON f.registration_id = r.id
            WHERE f.user_id = ?`,
      args: [user.id],
    })).rows[0] || null;
    return json(final);
  }

  if (method === 'POST' && path === '/api/internships/final/confirm') {
    requireRole(user, ['student']);
    const body = await readBody(request);
    const settings = rowsToSettings((await database.execute("SELECT key, value FROM settings WHERE key IN ('confirmation_open_at', 'confirmation_close_at')")).rows);
    const now = new Date();
    if (settings.confirmation_open_at && now < new Date(settings.confirmation_open_at + ':00+07:00')) {
      return json({ error: 'Chưa đến thời gian xác nhận nơi thực tập.' }, 403);
    }
    if (settings.confirmation_close_at && now > new Date(settings.confirmation_close_at + ':00+07:00')) {
      return json({ error: 'Đã hết thời gian xác nhận nơi thực tập.' }, 403);
    }
    const existing = (await database.execute({ sql: 'SELECT * FROM final_internships WHERE user_id = ?', args: [user.id] })).rows[0] as any;
    if (existing?.locked_at) return json({ error: 'Nơi thực tập chính thức đã bị khóa. Vui lòng liên hệ Khoa nếu cần thay đổi.' }, 400);

    const type = body.internship_type === 'school' ? 'school' : 'company';
    const school = (await database.execute("SELECT id FROM companies WHERE name = 'Trường Đại học Công nghệ'")).rows[0] as any;
    if (type === 'school') {
      const lecturerName = String(body.school_lecturer || '').trim();
      if (!lecturerName) return json({ error: 'Vui lòng chọn giảng viên hướng dẫn khi xác nhận thực tập tại trường.' }, 400);
      const validLecturer = (await database.execute({ sql: 'SELECT id FROM lecturers WHERE name = ?', args: [lecturerName] })).rows[0];
      if (!validLecturer) return json({ error: 'Giảng viên hướng dẫn không hợp lệ. Vui lòng chọn trong danh sách.' }, 400);
      await database.execute({
        sql: `INSERT INTO final_internships (user_id, registration_id, company_id, internship_type, status, student_attested, attestation_text, school_lecturer, confirmed_by, note, confirmed_at)
              VALUES (?, NULL, ?, 'school', 'confirmed', 1, ?, ?, ?, ?, datetime('now', '+7 hours'))
              ON CONFLICT(user_id) DO UPDATE SET registration_id = NULL, company_id = excluded.company_id, internship_type = 'school',
                status = 'confirmed', student_attested = 1, attestation_text = excluded.attestation_text, school_lecturer = excluded.school_lecturer,
                confirmed_by = excluded.confirmed_by, note = excluded.note, confirmed_at = excluded.confirmed_at`,
        args: [user.id, school?.id || null, 'Tôi xác nhận đăng ký thực tập tại trường theo hướng dẫn của Khoa.', lecturerName, user.id, body.note || null],
      });
      return json({ success: true });
    }

    const registrationId = Number(body.registration_id);
    if (!registrationId) return json({ error: 'Vui lòng chọn nơi thực tập cần xác nhận.' }, 400);
    if (!body.attested) return json({ error: 'Vui lòng xác nhận cam kết đã được đơn vị tiếp nhận thực tập.' }, 400);
    const reg = (await database.execute({
      sql: `SELECT r.*, c.name as company_name
            FROM registrations r JOIN companies c ON r.company_id = c.id
            WHERE r.id = ? AND r.user_id = ?`,
      args: [registrationId, user.id],
    })).rows[0] as any;
    if (!reg) return json({ error: 'Không tìm thấy đăng ký này.' }, 404);
    if (reg.status !== 'approved') return json({ error: 'Bạn chỉ có thể xác nhận nơi thực tập đã được Khoa duyệt.' }, 400);
    if (reg.company_name === 'Trường Đại học Công nghệ') return json({ error: 'Vui lòng chọn hình thức thực tập tại trường.' }, 400);
    await database.execute({
      sql: `INSERT INTO final_internships (user_id, registration_id, company_id, internship_type, status, student_attested, attestation_text, confirmed_by, note, confirmed_at)
            VALUES (?, ?, ?, 'company', 'confirmed', 1, ?, ?, ?, datetime('now', '+7 hours'))
            ON CONFLICT(user_id) DO UPDATE SET registration_id = excluded.registration_id, company_id = excluded.company_id, internship_type = 'company',
              status = 'confirmed', student_attested = 1, attestation_text = excluded.attestation_text, school_lecturer = NULL,
              confirmed_by = excluded.confirmed_by, note = excluded.note, confirmed_at = excluded.confirmed_at`,
      args: [user.id, registrationId, reg.company_id, 'Tôi xác nhận đã được đơn vị này tiếp nhận thực tập và chịu trách nhiệm về thông tin khai báo.', user.id, body.note || null],
    });
    return json({ success: true });
  }

  if (method === 'DELETE' && path === '/api/registrations/my') {
    requireRole(user, ['student']);
    await executeBatch(database, [
      { sql: 'DELETE FROM final_internships WHERE user_id = ? AND locked_at IS NULL', args: [user.id] },
      { sql: 'DELETE FROM registrations WHERE user_id = ?', args: [user.id] },
    ]);
    return json({ success: true });
  }

  const regDeleteMatch = path.match(/^\/api\/registrations\/(\d+)$/);
  if (method === 'DELETE' && regDeleteMatch) {
    requireRole(user, ['student']);
    await executeBatch(database, [
      { sql: 'DELETE FROM final_internships WHERE registration_id = ? AND user_id = ? AND locked_at IS NULL', args: [regDeleteMatch[1], user.id] },
      { sql: 'DELETE FROM registrations WHERE id = ? AND user_id = ?', args: [regDeleteMatch[1], user.id] },
    ]);
    return json({ success: true });
  }

  if (method === 'POST' && path === '/api/registrations') {
    requireRole(user, ['student']);
    const body = await readBody(request);
    const profile = {
      student_id: body.student_id || user.student_id || null,
      dob: body.dob || user.dob || null,
      class_name: body.class_name || user.class_name || null,
      course_code: body.course_code || user.course_code || null,
      phone: body.phone || user.phone || null,
      personal_email: body.personal_email || user.personal_email || null,
    };
    if (!profile.student_id || !profile.dob || !profile.class_name || !profile.course_code || !profile.phone || !profile.personal_email) {
      return json({ error: 'Vui lòng cập nhật đầy đủ thông tin trước khi đăng ký.' }, 400);
    }
    const settings = rowsToSettings((await database.execute("SELECT key, value FROM settings WHERE key IN ('registration_open_at', 'registration_close_at')")).rows);
    const now = new Date();
    if (settings.registration_open_at && now < new Date(settings.registration_open_at + ':00+07:00')) return json({ error: 'Chưa đến giờ đăng ký.' }, 403);
    if (settings.registration_close_at && now > new Date(settings.registration_close_at + ':00+07:00')) return json({ error: 'Đã hết thời gian đăng ký.' }, 403);

    const khac = (await database.execute("SELECT id FROM companies WHERE name = 'Công ty khác'")).rows[0] as any;
    const school = (await database.execute("SELECT id FROM companies WHERE name = 'Trường Đại học Công nghệ'")).rows[0] as any;
    const companyIds = Array.isArray(body.company_ids) ? Array.from(new Set(body.company_ids.filter((id: number) => id !== khac?.id))) : [];
    const otherCompanies = Array.isArray(body.other_companies) ? body.other_companies : [];
    const total = companyIds.length + otherCompanies.length;
    if (total === 0) return json({ error: 'Vui lòng chọn ít nhất 1 công ty.' }, 400);
    if (total > 5) return json({ error: 'Bạn chỉ được chọn tối đa 5 công ty.' }, 400);
    if (school && companyIds.includes(school.id) && !body.school_lecturer) return json({ error: 'Vui lòng chọn giảng viên hướng dẫn.' }, 400);

    const insertSql = "INSERT INTO registrations (user_id, company_id, note, status, other_company_name, other_company_role, other_company_contact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))";
    const statements: any[] = [
      { sql: 'DELETE FROM registrations WHERE user_id = ?', args: [user.id] },
      { sql: 'UPDATE users SET student_id = ?, dob = ?, class_name = ?, course_code = ?, phone = ?, personal_email = ? WHERE id = ?', args: [profile.student_id, profile.dob, profile.class_name, profile.course_code, profile.phone, profile.personal_email, user.id] },
    ];
    for (const companyId of companyIds) {
      statements.push({ sql: insertSql, args: [user.id, companyId, body.note || null, 'approved', null, null, companyId === school?.id ? body.school_lecturer : null] });
    }
    const approvedNameRows = otherCompanies.length > 0
      ? (await database.execute('SELECT normalized_name FROM approved_company_names')).rows
      : [];
    const approvedNames = new Set(approvedNameRows.map((row: any) => String(row.normalized_name || '').trim()).filter(Boolean));
    for (const other of otherCompanies) {
      if (!other.name || !other.role || !other.contact) return json({ error: 'Vui lòng cung cấp đầy đủ thông tin các công ty ngoài danh sách.' }, 400);
      const status = approvedNames.has(normalizeCompanyName(other.name)) ? 'approved' : 'pending';
      statements.push({ sql: insertSql, args: [user.id, khac.id, body.note || null, status, other.name, other.role, other.contact] });
    }
    await executeBatch(database, statements);
    const updatedUser = (await database.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [user.id] })).rows[0];
    return json({ success: true, user: updatedUser });
  }

  if (path.startsWith('/api/admin/')) requireRole(user, ['admin']);

  if (method === 'GET' && path === '/api/admin/approved-companies') {
    const rows = (await database.execute('SELECT * FROM approved_company_names ORDER BY name ASC')).rows;
    return json(rows);
  }

  if (method === 'POST' && path === '/api/admin/approved-companies/import') {
    const body = await readBody(request);
    const items = Array.isArray(body.companies) ? body.companies : [];
    const statements = items.map((item: any) => {
      const name = typeof item === 'string' ? item.trim() : String(item?.name || '').trim();
      const normalized = normalizeCompanyName(name);
      if (!name || !normalized) return null;
      return {
        sql: `INSERT INTO approved_company_names (name, normalized_name, source)
              VALUES (?, ?, ?)
              ON CONFLICT(normalized_name) DO UPDATE SET name = excluded.name, source = excluded.source`,
        args: [name, normalized, body.source || 'manual'],
      };
    }).filter(Boolean);
    if (body.override) await database.execute('DELETE FROM approved_company_names');
    await executeBatch(database, statements);
    return json({ success: true, count: statements.length });
  }

  if (method === 'GET' && path === '/api/admin/students') {
    return json((await database.execute("SELECT id, email, name, student_id, dob, class_name, phone, personal_email FROM users WHERE role = 'student' ORDER BY student_id ASC")).rows);
  }

  if (method === 'POST' && path === '/api/admin/students/bulk') {
    const body = await readBody(request);
    const students = Array.isArray(body.students) ? body.students : [];
    const statements = students.filter((s: any) => s.student_id && s.name).map((s: any) => {
      const email = `${s.student_id}@vnu.edu.vn`;
      return body.override
        ? { sql: `INSERT INTO users (email, name, role, student_id, dob, class_name) VALUES (?, ?, 'student', ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, dob=excluded.dob, class_name=excluded.class_name, student_id=excluded.student_id`, args: [email, s.name, s.student_id, s.dob || '', s.class_name || ''] }
        : { sql: `INSERT OR IGNORE INTO users (email, name, role, student_id, dob, class_name) VALUES (?, ?, 'student', ?, ?, ?)`, args: [email, s.name, s.student_id, s.dob || '', s.class_name || ''] };
    });
    await executeBatch(database, statements);
    return json({ success: true, count: statements.length });
  }

  if (method === 'POST' && path === '/api/admin/students') {
    const body = await readBody(request);
    if (!body.student_id || !body.name) return json({ error: 'Mã SV và Họ tên là bắt buộc' }, 400);
    await database.execute({ sql: `INSERT INTO users (email, name, role, student_id, dob, class_name) VALUES (?, ?, 'student', ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, dob=excluded.dob, class_name=excluded.class_name, student_id=excluded.student_id`, args: [`${body.student_id}@vnu.edu.vn`, body.name, body.student_id, body.dob || '', body.class_name || ''] });
    return json({ success: true });
  }

  const studentDelete = path.match(/^\/api\/admin\/students\/([^/]+)$/);
  if (method === 'DELETE' && studentDelete) {
    const student = (await database.execute({ sql: "SELECT id FROM users WHERE student_id = ? AND role = 'student'", args: [studentDelete[1]] })).rows[0] as any;
    if (student) await executeBatch(database, [
      { sql: 'DELETE FROM final_internships WHERE user_id = ?', args: [student.id] },
      { sql: 'DELETE FROM registrations WHERE user_id = ?', args: [student.id] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [student.id] },
    ]);
    return json({ success: true });
  }

  if (method === 'GET' && path === '/api/admin/lecturers') return json((await database.execute('SELECT * FROM lecturers ORDER BY name ASC')).rows);

  if (method === 'POST' && path === '/api/admin/lecturers/bulk') {
    const body = await readBody(request);
    if (body.override) await database.execute('DELETE FROM lecturers');
    const lecturers = Array.isArray(body.lecturers) ? body.lecturers : [];
    const statements = lecturers.map((item: any) => {
      const name = typeof item === 'string' ? item.trim() : item?.name?.trim();
      const email = typeof item === 'string' ? null : item?.email?.trim() || null;
      return name ? { sql: `INSERT INTO lecturers (name, email) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET email = CASE WHEN excluded.email IS NOT NULL AND excluded.email != '' AND (lecturers.email IS NULL OR lecturers.email = '') THEN excluded.email ELSE lecturers.email END`, args: [name, email] } : null;
    }).filter(Boolean);
    await executeBatch(database, statements);
    await syncLecturerUsers(database);
    return json({ success: true, count: statements.length });
  }

  if (method === 'POST' && path === '/api/admin/lecturers') {
    const body = await readBody(request);
    if (!body.name) return json({ error: 'Tên không được để trống' }, 400);
    const result = await database.execute({ sql: 'INSERT INTO lecturers (name, email) VALUES (?, ?)', args: [body.name.trim(), body.email?.trim() || null] });
    await syncLecturerUsers(database);
    return json((await database.execute({ sql: 'SELECT * FROM lecturers WHERE id = ?', args: [Number(result.lastInsertRowid)] })).rows[0]);
  }

  const lecturerId = path.match(/^\/api\/admin\/lecturers\/(\d+)$/);
  if (lecturerId && method === 'PUT') {
    const body = await readBody(request);
    await database.execute({ sql: 'UPDATE lecturers SET name = ?, email = ? WHERE id = ?', args: [body.name?.trim(), body.email?.trim() || null, lecturerId[1]] });
    await syncLecturerUsers(database);
    return json({ success: true });
  }
  if (lecturerId && method === 'DELETE') {
    await database.execute({ sql: 'DELETE FROM lecturers WHERE id = ?', args: [lecturerId[1]] });
    await syncLecturerUsers(database);
    return json({ success: true });
  }

  if (method === 'POST' && path === '/api/admin/companies') {
    const body = await readBody(request);
    if (!body.name) return json({ error: 'Tên công ty không được để trống' }, 400);
    const result = await database.execute({ sql: `INSERT INTO companies (name, description, slots, contact_email, address, recruitment_link, phone, contact_name, history, qualifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '')`, args: [body.name.trim(), body.description || '', parseInt(body.slots) || 5, body.contact_email || '', body.address || '', body.recruitment_link || '', body.phone || '', body.contact_name || ''] });
    return json((await database.execute({ sql: 'SELECT * FROM companies WHERE id = ?', args: [Number(result.lastInsertRowid)] })).rows[0]);
  }

  const companyAdmin = path.match(/^\/api\/admin\/companies\/(\d+)$/);
  if (companyAdmin && method === 'PUT') {
    const body = await readBody(request);
    await database.execute({ sql: `UPDATE companies SET name = ?, description = ?, slots = ?, contact_email = ?, address = ?, recruitment_link = ?, phone = ?, contact_name = ? WHERE id = ?`, args: [body.name?.trim(), body.description || '', parseInt(body.slots) || 5, body.contact_email || '', body.address || '', body.recruitment_link || '', body.phone || '', body.contact_name || '', companyAdmin[1]] });
    return json({ success: true });
  }
  if (companyAdmin && method === 'DELETE') {
    await executeBatch(database, [
      { sql: 'DELETE FROM final_internships WHERE company_id = ?', args: [companyAdmin[1]] },
      { sql: 'DELETE FROM registrations WHERE company_id = ?', args: [companyAdmin[1]] },
      { sql: 'DELETE FROM companies WHERE id = ?', args: [companyAdmin[1]] },
    ]);
    return json({ success: true });
  }

  if (method === 'POST' && path === '/api/admin/companies/bulk') {
    const body = await readBody(request);
    if (body.override) await executeBatch(database, [{ sql: 'DELETE FROM final_internships' }, { sql: 'DELETE FROM registrations' }, { sql: 'DELETE FROM companies' }]);
    const companies = Array.isArray(body.companies) ? body.companies : [];
    const statements = companies.map((item: any) => {
      const name = typeof item === 'string' ? item.trim() : item?.name?.trim();
      if (!name) return null;
      const slots = parseInt(item?.slots) || 5;
      return { sql: `INSERT OR IGNORE INTO companies (name, description, slots, contact_email, address, phone, contact_name, history, qualifications, recruitment_link) VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '')`, args: [name, `Tuyển ${slots} sinh viên thực tập.`, slots, item?.contact_email || '', item?.address || '', item?.phone || '', item?.contact_name || ''] };
    }).filter(Boolean);
    await executeBatch(database, statements);
    await ensureSpecialCompanies(database);
    return json({ success: true, count: statements.length });
  }

  if (method === 'GET' && path === '/api/admin/registrations') {
    return json((await database.execute(`
      SELECT r.id as registration_id, u.email, u.name as student_name, u.student_id, u.dob, u.class_name, r.note,
             c.name as company_name, r.status, r.created_at, r.other_company_name, r.other_company_role,
             r.other_company_contact, r.sent_to_company_at, r.sent_to_company_note,
             u.course_code, c.contact_email, u.phone, u.personal_email
      FROM registrations r JOIN users u ON r.user_id = u.id JOIN companies c ON r.company_id = c.id
      ORDER BY r.created_at DESC
    `)).rows);
  }

  if (method === 'PUT' && path === '/api/admin/registrations/mark-sent') {
    const body = await readBody(request);
    const note = body.note || null;
    if (Array.isArray(body.registration_ids) && body.registration_ids.length > 0) {
      const ids = body.registration_ids.map((id: any) => Number(id)).filter(Boolean);
      if (ids.length === 0) return json({ error: 'Danh sách đăng ký không hợp lệ' }, 400);
      await database.execute({
        sql: `UPDATE registrations SET sent_to_company_at = datetime('now', '+7 hours'), sent_to_company_note = ?
              WHERE id IN (${ids.map(() => '?').join(',')})`,
        args: [note, ...ids],
      });
      return json({ success: true, count: ids.length });
    }
    if (body.company_name) {
      await database.execute({
        sql: `UPDATE registrations SET sent_to_company_at = datetime('now', '+7 hours'), sent_to_company_note = ?
              WHERE status = 'approved'
                AND company_id IN (SELECT id FROM companies WHERE name = ?)`,
        args: [note, body.company_name],
      });
      return json({ success: true });
    }
    return json({ error: 'Vui lòng chọn đăng ký hoặc công ty cần đánh dấu đã gửi.' }, 400);
  }

  if (method === 'GET' && path === '/api/admin/final-internships') {
    const rows = (await database.execute(`
      SELECT f.*, u.email, u.name as student_name, u.student_id, u.class_name, u.course_code, u.phone, u.personal_email,
             c.name as company_name, r.other_company_name, r.other_company_role, r.other_company_contact
      FROM final_internships f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN companies c ON f.company_id = c.id
      LEFT JOIN registrations r ON f.registration_id = r.id
      ORDER BY f.confirmed_at DESC
    `)).rows;
    return json(rows);
  }

  const finalAdmin = path.match(/^\/api\/admin\/final-internships\/(\d+)$/);
  if (finalAdmin && method === 'PUT') {
    const body = await readBody(request);
    const targetUserId = Number(finalAdmin[1]);
    if (!targetUserId) return json({ error: 'User không hợp lệ' }, 400);
    const type = body.internship_type === 'school' || body.internship_type === 'partner' ? body.internship_type : 'company';
    let registrationId = body.registration_id ? Number(body.registration_id) : null;
    let companyId = body.company_id ? Number(body.company_id) : null;
    if (registrationId) {
      const reg = (await database.execute({ sql: 'SELECT * FROM registrations WHERE id = ? AND user_id = ?', args: [registrationId, targetUserId] })).rows[0] as any;
      if (!reg) return json({ error: 'Không tìm thấy đăng ký của sinh viên.' }, 404);
      if (reg.status !== 'approved') return json({ error: 'Chỉ có thể tạo nơi thực tập từ đăng ký đã duyệt.' }, 400);
      companyId = reg.company_id;
    }
    if (!companyId && type !== 'partner') {
      const school = (await database.execute("SELECT id FROM companies WHERE name = 'Trường Đại học Công nghệ'")).rows[0] as any;
      companyId = school?.id || null;
    }
    await database.execute({
      sql: `INSERT INTO final_internships (user_id, registration_id, company_id, internship_type, status, student_attested, attestation_text, school_lecturer, confirmed_by, note, confirmed_at)
            VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
            ON CONFLICT(user_id) DO UPDATE SET registration_id = excluded.registration_id, company_id = excluded.company_id,
              internship_type = excluded.internship_type, status = 'confirmed', student_attested = excluded.student_attested,
              attestation_text = excluded.attestation_text, school_lecturer = excluded.school_lecturer,
              confirmed_by = excluded.confirmed_by, note = excluded.note, confirmed_at = excluded.confirmed_at`,
      args: [targetUserId, registrationId, companyId, type, body.student_attested ? 1 : 0, body.attestation_text || null, body.school_lecturer || null, user.id, body.note || null],
    });
    return json({ success: true });
  }

  const finalLock = path.match(/^\/api\/admin\/final-internships\/(\d+)\/lock$/);
  if (finalLock && method === 'PUT') {
    const body = await readBody(request);
    await database.execute({
      sql: `UPDATE final_internships SET locked_at = ${body.locked === false ? 'NULL' : "datetime('now', '+7 hours')"} WHERE user_id = ?`,
      args: [Number(finalLock[1])],
    });
    return json({ success: true });
  }

  if (method === 'PUT' && path === '/api/admin/registrations/approve-all') {
    await database.execute("UPDATE registrations SET status = 'approved' WHERE status = 'pending'");
    return json({ success: true });
  }
  const statusMatch = path.match(/^\/api\/admin\/registrations\/(\d+)\/status$/);
  if (method === 'PUT' && statusMatch) {
    const body = await readBody(request);
    if (!['pending', 'approved', 'rejected'].includes(body.status)) return json({ error: 'Invalid status' }, 400);
    await database.execute({ sql: 'UPDATE registrations SET status = ? WHERE id = ?', args: [body.status, statusMatch[1]] });
    return json({ success: true });
  }

  if (method === 'GET' && path === '/api/admin/admins') {
    return json((await database.execute("SELECT id, email, name, picture, is_lecturer FROM users WHERE role = 'admin' ORDER BY name ASC")).rows);
  }
  if (method === 'POST' && path === '/api/admin/admins') {
    const body = await readBody(request);
    const email = body.email;
    if (!email || (!email.endsWith('@vnu.edu.vn') && email !== env.ADMIN_EMAIL)) return json({ error: 'Chỉ hỗ trợ email @vnu.edu.vn' }, 400);
    const lecturer = (await database.execute({ sql: 'SELECT * FROM lecturers WHERE email = ?', args: [email] })).rows[0] as any;
    await database.execute({ sql: `INSERT INTO users (email, name, role, is_lecturer) VALUES (?, ?, 'admin', ?) ON CONFLICT(email) DO UPDATE SET role = 'admin', name = CASE WHEN ? IS NOT NULL THEN ? ELSE name END, is_lecturer = CASE WHEN ? = 1 THEN 1 ELSE is_lecturer END`, args: [email, lecturer?.name || 'Admin', lecturer ? 1 : 0, lecturer?.name || null, lecturer?.name || null, lecturer ? 1 : 0] });
    await syncLecturerUsers(database);
    return json({ success: true, isLecturer: !!lecturer });
  }
  const adminDelete = path.match(/^\/api\/admin\/admins\/(\d+)$/);
  if (method === 'DELETE' && adminDelete) {
    if (Number(adminDelete[1]) === Number(user.id)) return json({ error: 'Không thể tự hủy quyền của chính mình' }, 400);
    await database.execute({ sql: "UPDATE users SET role = 'student', is_lecturer = 0 WHERE id = ?", args: [adminDelete[1]] });
    await syncLecturerUsers(database);
    return json({ success: true });
  }
  const adminLecturer = path.match(/^\/api\/admin\/admins\/(\d+)\/lecturer$/);
  if (method === 'PUT' && adminLecturer) {
    const body = await readBody(request);
    await database.execute({ sql: 'UPDATE users SET is_lecturer = ? WHERE id = ? AND role = ? ', args: [body.is_lecturer ? 1 : 0, adminLecturer[1], 'admin'] });
    await syncLecturerUsers(database);
    return json({ success: true });
  }

  if (method === 'GET' && path === '/api/settings/campaign') {
    const settings = rowsToSettings((await database.execute("SELECT key, value FROM settings WHERE key IN ('campaign_year', 'campaign_start', 'campaign_end', 'classes_list', 'registration_open_at', 'registration_close_at', 'confirmation_open_at', 'confirmation_close_at', 'final_report_due_at')")).rows);
    return json({
      year: settings.campaign_year || '2026',
      start: settings.campaign_start || '22/05/2026',
      end: settings.campaign_end || '15/06/2026',
      classes_list: settings.classes_list || DEFAULT_CLASSES,
      registration_open_at: settings.registration_open_at || '',
      registration_close_at: settings.registration_close_at || '',
      confirmation_open_at: settings.confirmation_open_at || '',
      confirmation_close_at: settings.confirmation_close_at || '',
      final_report_due_at: settings.final_report_due_at || '',
    });
  }

  if (method === 'PUT' && path === '/api/settings/campaign') {
    requireRole(user, ['admin']);
    const body = await readBody(request);
    await executeBatch(database, [
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('campaign_year', ?)", args: [body.year || null] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('campaign_start', ?)", args: [body.start || null] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('campaign_end', ?)", args: [body.end || null] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('registration_open_at', ?)", args: [body.registration_open_at || ''] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('registration_close_at', ?)", args: [body.registration_close_at || ''] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('confirmation_open_at', ?)", args: [body.confirmation_open_at || ''] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('confirmation_close_at', ?)", args: [body.confirmation_close_at || ''] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('final_report_due_at', ?)", args: [body.final_report_due_at || ''] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('classes_list', ?)", args: [body.classes_list || DEFAULT_CLASSES] },
    ]);
    return json({ success: true });
  }

  if (method === 'GET' && path === '/api/settings/google-sheet') {
    requireRole(user, ['admin']);
    const settings = rowsToSettings((await database.execute("SELECT key, value FROM settings WHERE key IN ('google_sheet_url', 'export_google_sheet_url', 'implementation_plan_md')")).rows);
    return json({ url: settings.google_sheet_url || '', export_url: settings.export_google_sheet_url || '', plan: settings.implementation_plan_md || '' });
  }
  if (method === 'PUT' && path === '/api/settings/google-sheet') {
    requireRole(user, ['admin']);
    const body = await readBody(request);
    const statements: any[] = [];
    if (body.url !== undefined) statements.push({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('google_sheet_url', ?)", args: [body.url] });
    if (body.export_url !== undefined) statements.push({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('export_google_sheet_url', ?)", args: [body.export_url] });
    if (body.plan !== undefined) statements.push({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('implementation_plan_md', ?)", args: [body.plan] });
    await executeBatch(database, statements);
    return json({ success: true });
  }

  if (method === 'POST' && path === '/api/settings/import-companies') {
    requireRole(user, ['admin']);
    const body = await readBody(request);
    const setting = (await database.execute("SELECT value FROM settings WHERE key = 'google_sheet_url'")).rows[0] as any;
    if (!setting?.value) return json({ error: 'Spreadsheet URL not set' }, 400);
    let fetchUrl = setting.value;
    if (!fetchUrl.includes('export?format=csv')) fetchUrl = fetchUrl.includes('edit') ? fetchUrl.split('edit')[0] + 'export?format=csv' : fetchUrl;
    const csvRes = await fetch(fetchUrl);
    if (!csvRes.ok) throw new Error('Failed to fetch from Google Sheets');
    const records = recordsFromCsv(await csvRes.text());
    if (!body.keepRegistrations) await executeBatch(database, [{ sql: 'DELETE FROM registrations' }, { sql: 'DELETE FROM companies' }]);
    const statements = records.map((record: any) => {
      if (!record.Timestamp) return null;
      const name = record['Tên doanh nghiệp']?.trim();
      if (!name) return null;
      const slots = parseInt(record['Số lượng sinh viên cần tuyển  '] || record['Số lượng sinh viên cần tuyển'] || '0') || 5;
      const contactEmail = record['Email liên hệ']?.trim() || record['Email Address']?.trim() || '';
      const contactName = record['Họ và tên người liên hệ phụ trách thực tập']?.trim() || '';
      const phone = record['Điện thoại liên hệ']?.trim() || '';
      const address = record['Địa chỉ nơi thực tập']?.trim() || '';
      const infoLink = record['Thông tin vị trí tuyển thực tập']?.trim() || '';
      return { sql: `INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET description=excluded.description, slots=excluded.slots, contact_email=excluded.contact_email, history=excluded.history, address=excluded.address, recruitment_link=excluded.recruitment_link, phone=excluded.phone, contact_name=excluded.contact_name`, args: [name, `Tuyển ${slots} sinh viên thực tập.`, slots, contactEmail, `Công ty ${name} tuyển dụng thực tập sinh.`, address, infoLink, phone, contactName] };
    }).filter(Boolean);
    await executeBatch(database, statements);
    await ensureSpecialCompanies(database);
    return json({ success: true, count: statements.length });
  }

  if (method === 'POST' && path === '/api/admin/export-to-sheet') {
    requireRole(user, ['admin']);
    const setting = (await database.execute("SELECT value FROM settings WHERE key = 'export_google_sheet_url'")).rows[0] as any;
    const match = setting?.value?.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return json({ error: 'URL Google Sheet không hợp lệ hoặc chưa cấu hình' }, 400);
    const data = (await database.execute(`
      SELECT u.student_id as "Mã SV", u.name as "Họ và tên", u.dob as "Ngày sinh", u.class_name as "Lớp KH", u.course_code as "Mã môn học",
             CASE WHEN c.name = 'Công ty khác' THEN 'Công ty khác: ' || coalesce(r.other_company_name, '') ELSE c.name END as "Nơi thực tập",
             CASE WHEN c.name = 'Công ty khác' THEN coalesce(r.other_company_role, '') ELSE 'Thực tập sinh' END as "Vị trí",
             CASE WHEN c.name = 'Công ty khác' THEN coalesce(r.other_company_contact, '') ELSE c.contact_email END as "Liên hệ",
             r.note as "Ghi chú", r.status as "Trạng thái", r.created_at as "Thời gian đăng ký"
      FROM registrations r JOIN users u ON r.user_id = u.id JOIN companies c ON r.company_id = c.id ORDER BY r.created_at DESC
    `)).rows as any[];
    const headers = data.length ? ['STT', ...Object.keys(data[0])] : ['STT'];
    const values = [headers, ...data.map((row, i) => [i + 1, ...Object.values(row)])];
    const accessToken = await getGoogleAccessToken(env);
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${match[1]}/values/A1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) throw new Error(await res.text());
    return json({ success: true, message: 'Đã lưu dữ liệu vào Google Sheets thành công!' });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env) {
    const headers = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const response = await route(request, env);
      const out = new Response(response.body, response);
      Object.entries(headers).forEach(([key, value]) => out.headers.set(key, value));
      return out;
    } catch (error: any) {
      if (error instanceof Response) {
        const out = new Response(error.body, error);
        Object.entries(headers).forEach(([key, value]) => out.headers.set(key, value));
        out.headers.set('content-type', 'application/json; charset=utf-8');
        return out;
      }
      return json({ error: error?.message || 'Internal error' }, 500, headers);
    }
  },
};
