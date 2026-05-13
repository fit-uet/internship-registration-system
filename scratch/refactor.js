const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace("import { DatabaseSync } from 'node:sqlite';", "import { createClient, Client } from '@libsql/client';");

content = content.replace("let db: DatabaseSync;", "let db: Client;");

content = content.replace(
  "db = new DatabaseSync('./database.sqlite');",
  "db = createClient({ url: process.env.TURSO_DATABASE_URL || 'libsql://internship-db-kieuvantuyen01.aws-ap-northeast-1.turso.io', authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg2Njc1ODgsImlkIjoiMDE5ZTIwYmMtZjYwMS03NDM4LWJhNGYtM2RmMGY0ZTczMWQ4IiwicmlkIjoiZTMxNjg3NjYtZWYzYy00OTI0LTlmYzItNWM3NzBlYTJhY2U0In0.6Ll3Ta48hjFtTme0UBKZZ8xNVO0wOD-f4JKTgRMGsTS4ob7ZiGAt1HIZxZ3b98seSdTDjP3XkgV6VGg3ii_ZAw' });"
);

// db.exec(`...`) -> await db.executeMultiple(`...`)
// We only have multi-line or single-line db.exec calls.
content = content.replace(/db\.exec\(/g, "await db.executeMultiple(");

// Make initDb async
content = content.replace("function initDb() {", "async function initDb() {");
content = content.replace("initDb();", "await initDb();");

// We need to replace db.prepare(SQL).method(args)
// Since the code has multiline SQL, we can't easily regex it.
// Let's use a simpler approach: we'll find all `db.prepare` occurrences manually.
// Actually, I can use a Regex that matches balanced parentheses or just do it by hand since there are 35.

fs.writeFileSync('scratch/server.ts.temp', content);
