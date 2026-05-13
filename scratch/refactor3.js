const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace imports
code = code.replace("import { DatabaseSync } from 'node:sqlite';", "import { createClient, Client } from '@libsql/client';");

// Replace db type
code = code.replace("let db: DatabaseSync;", "let db: Client;");

// Replace initDb declaration to async
code = code.replace("function initDb() {", "async function initDb() {");
code = code.replace("initDb();", "await initDb();");

// Replace DB instantiation
code = code.replace(
  "db = new DatabaseSync('./database.sqlite');",
  "db = createClient({ url: process.env.TURSO_DATABASE_URL || 'libsql://internship-db-kieuvantuyen01.aws-ap-northeast-1.turso.io', authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg2Njc1ODgsImlkIjoiMDE5ZTIwYmMtZjYwMS03NDM4LWJhNGYtM2RmMGY0ZTczMWQ4IiwicmlkIjoiZTMxNjg3NjYtZWYzYy00OTI0LTlmYzItNWM3NzBlYTJhY2U0In0.6Ll3Ta48hjFtTme0UBKZZ8xNVO0wOD-f4JKTgRMGsTS4ob7ZiGAt1HIZxZ3b98seSdTDjP3XkgV6VGg3ii_ZAw' });"
);

// Replace db.exec with await db.executeMultiple
code = code.replace(/db\.exec\(/g, "await db.executeMultiple(");

// Function to handle db.prepare replacements
// Example matches:
// db.prepare("SELECT ...").get(id)
// db.prepare('INSERT ...').run(a, b)
// db.prepare(`...`).all()
function replaceDbPrepare() {
    const regex = /db\.prepare\((.*?)\)\.(run|get|all)\((.*?)\)/gs;
    code = code.replace(regex, (match, sql, method, args) => {
        let newCall = '';
        const trimmedArgs = args.trim();
        
        if (trimmedArgs) {
            newCall = `await db.execute({ sql: ${sql}, args: [${trimmedArgs}] })`;
        } else {
            newCall = `await db.execute(${sql})`;
        }
        
        if (method === 'get') {
            newCall = `(${newCall}).rows[0]`;
        } else if (method === 'all') {
            newCall = `(${newCall}).rows`;
        }
        
        return newCall;
    });
}

replaceDbPrepare();

// Special handling for the loop in server.ts:
// const insertStmt = db.prepare(`...`);
// ... insertStmt.run(a, b, c);
code = code.replace(
    /const insertStmt = db\.prepare\((.*?)\);([\s\S]*?)insertStmt\.run\((.*?)\);/g,
    (match, sql, middle, args) => {
        return `const insertSql = ${sql};${middle}await db.execute({ sql: insertSql, args: [${args}] });`;
    }
);

// Second occurrence of insertStmt loop
code = code.replace(
    /const insertStmt = db\.prepare\((.*?)\);([\s\S]*?)insertStmt\.run\((.*?)\);/g,
    (match, sql, middle, args) => {
        return `const insertSql = ${sql};${middle}await db.execute({ sql: insertSql, args: [${args}] });`;
    }
);

fs.writeFileSync('server.ts', code);
