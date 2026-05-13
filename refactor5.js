const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Imports
code = code.replace(
  "import { DatabaseSync } from 'node:sqlite';",
  "import { createClient, Client } from '@libsql/client';"
);

// 2. Variable type
code = code.replace("let db: DatabaseSync;", "let db: Client;");

// 3. DB Init
code = code.replace(
  "db = new DatabaseSync('./database.sqlite');",
  `db = createClient({ 
    url: process.env.TURSO_DATABASE_URL || 'libsql://internship-db-kieuvantuyen01.aws-ap-northeast-1.turso.io', 
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg2Njc1ODgsImlkIjoiMDE5ZTIwYmMtZjYwMS03NDM4LWJhNGYtM2RmMGY0ZTczMWQ4IiwicmlkIjoiZTMxNjg3NjYtZWYzYy00OTI0LTlmYzItNWM3NzBlYTJhY2U0In0.6Ll3Ta48hjFtTme0UBKZZ8xNVO0wOD-f4JKTgRMGsTS4ob7ZiGAt1HIZxZ3b98seSdTDjP3XkgV6VGg3ii_ZAw' 
  });`
);

// 4. db.exec -> await db.executeMultiple
code = code.replace(/db\.exec\(/g, "await db.executeMultiple(");

// 5. Replace initDb function to async
code = code.replace("function initDb() {", "async function initDb() {");
code = code.replace("initDb();", "await initDb();");

// 6. Fix seedCompaniesIfEmpty loop
// It currently uses:
// const insertStmt = db.prepare(`...`);
// for ... insertStmt.run(args);
code = code.replace(
    /const insertStmt = db\.prepare\(`([\s\S]*?)`\);([\s\S]*?)insertStmt\.run\((.*?)\);/g,
    (match, sql, middle, args) => {
        return `const insertSql = \`${sql}\`;${middle}await db.execute({ sql: insertSql, args: [${args}] });`;
    }
);

// Also need to handle the loop in /api/settings/import-companies
code = code.replace(
    /const insertStmt = db\.prepare\(`([\s\S]*?)`\);([\s\S]*?)insertStmt\.run\((.*?)\);/g,
    (match, sql, middle, args) => {
        return `const insertSql = \`${sql}\`;${middle}await db.execute({ sql: insertSql, args: [${args}] });`;
    }
);

// Also need to handle the loop in POST /api/registrations (line 325)
code = code.replace(
    /const insertStmt = db\.prepare\([\s\S]*?'(.*?)'[\s\S]*?\);([\s\S]*?)insertStmt\.run\((.*?)\);([\s\S]*?)insertStmt\.run\((.*?)\);/g,
    (match, sql, m1, a1, m2, a2) => {
        return `const insertSql = '${sql}';${m1}await db.execute({ sql: insertSql, args: [${a1}] });${m2}await db.execute({ sql: insertSql, args: [${a2}] });`;
    }
);

// 7. Replace all remaining db.prepare(SQL).run(ARGS) / get / all
function replacer() {
    // A regex that matches `db.prepare(SQL).method(ARGS)`
    // We cannot use .*? greedily if there are multiple calls.
    // Instead of Regex, let's just find and replace specific patterns.
    
    // Pattern 1: db.prepare('SQL').get(args)
    code = code.replace(/db\.prepare\((['`].*?['`])\)\.get\((.*?)\)/g, (m, sql, args) => {
        if (args.trim()) return `(await db.execute({ sql: ${sql}, args: [${args}] })).rows[0]`;
        return `(await db.execute(${sql})).rows[0]`;
    });
    
    // Pattern 2: db.prepare('SQL').all(args)
    code = code.replace(/db\.prepare\((['`][\s\S]*?['`])\)\.all\((.*?)\)/g, (m, sql, args) => {
        if (args.trim()) return `(await db.execute({ sql: ${sql}, args: [${args}] })).rows`;
        return `(await db.execute(${sql})).rows`;
    });
    
    // Pattern 3: db.prepare('SQL').run(args)
    code = code.replace(/db\.prepare\((['`][\s\S]*?['`])\)\.run\((.*?)\)/g, (m, sql, args) => {
        if (args.trim()) return `await db.execute({ sql: ${sql}, args: [${args}] })`;
        return `await db.execute(${sql})`;
    });
}
replacer();

fs.writeFileSync('server.ts', code);
