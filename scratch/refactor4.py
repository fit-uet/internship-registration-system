import re

with open('server.ts', 'r') as f:
    code = f.read()

# 1. Replace imports
code = code.replace("import { DatabaseSync } from 'node:sqlite';", "import { createClient, Client } from '@libsql/client';")

# 2. Replace db type
code = code.replace("let db: DatabaseSync;", "let db: Client;")

# 3. Replace async initDb
code = code.replace("function initDb() {", "async function initDb() {")
code = code.replace("initDb();", "await initDb();")

# 4. Replace DB instantiation
turso_str = """db = createClient({ 
    url: process.env.TURSO_DATABASE_URL || 'libsql://internship-db-kieuvantuyen01.aws-ap-northeast-1.turso.io', 
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg2Njc1ODgsImlkIjoiMDE5ZTIwYmMtZjYwMS03NDM4LWJhNGYtM2RmMGY0ZTczMWQ4IiwicmlkIjoiZTMxNjg3NjYtZWYzYy00OTI0LTlmYzItNWM3NzBlYTJhY2U0In0.6Ll3Ta48hjFtTme0UBKZZ8xNVO0wOD-f4JKTgRMGsTS4ob7ZiGAt1HIZxZ3b98seSdTDjP3XkgV6VGg3ii_ZAw' 
  });"""
code = code.replace("db = new DatabaseSync('./database.sqlite');", turso_str)

# 5. Replace db.exec
code = code.replace("db.exec(", "await db.executeMultiple(")

# 6. Replace db.prepare(SQL).run/get/all
def replacer(m):
    sql = m.group(1)
    method = m.group(2)
    args = m.group(3).strip()
    
    if args:
        new_call = f"await db.execute({{ sql: {sql}, args: [{args}] }})"
    else:
        new_call = f"await db.execute({sql})"
        
    if method == "get":
        return f"({new_call}).rows[0]"
    elif method == "all":
        return f"({new_call}).rows"
    else:
        # run
        return new_call

code = re.sub(r"db\.prepare\((.*?)\)\.(run|get|all)\((.*?)\)", replacer, code, flags=re.DOTALL)

# 7. Replace the insertStmt loops (which don't chain .run directly)
# Pattern:
# const insertStmt = db.prepare(`...`);
# ...
# insertStmt.run(args);
def replacer_insert(m):
    sql = m.group(1)
    middle = m.group(2)
    args = m.group(3)
    return f"const insertSql = {sql};{middle}await db.execute({{ sql: insertSql, args: [{args}] }});"

code = re.sub(r"const insertStmt = db\.prepare\((.*?)\);([\s\S]*?)insertStmt\.run\((.*?)\);", replacer_insert, code)
# Since there are multiple insertStmt in loops, we need to replace them. 
# Wait! In a loop, `insertStmt.run` is called multiple times.
# If we replace it like this, it will only replace the FIRST occurrence of insertStmt.run!
# Actually, let's just do it manually for the two loops to be 100% safe.
pass

with open('server.ts', 'w') as f:
    f.write(code)
