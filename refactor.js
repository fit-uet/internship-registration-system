const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Imports
content = content.replace("import Database from 'better-sqlite3';", "import { createClient } from '@libsql/client';");

// 2. DB Init
content = content.replace(
  "const db = new Database('database.sqlite');",
  `const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:database.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN
});`
);

// 3. db.exec -> await db.executeMultiple
content = content.replace(/db\.exec\(/g, "await db.executeMultiple(");

// 4. try { db.exec(...) } -> try { await db.executeMultiple(...) }
// Wait, the regex above already catches db.exec(. We just need to make sure the surrounding function is async if it isn't.
// initDb() is synchronous. We need to make it async.
content = content.replace("function initDb() {", "async function initDb() {");

// 5. Replace `db.prepare(SQL).get(args)` with `(await db.execute({ sql: SQL, args: [args] })).rows[0]`
// This is tricky using regex because of nested parentheses and multiline SQL strings.
// Let's use a simpler approach: we'll run a custom transformer or just do it with simpler regexes.
