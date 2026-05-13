import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import Database from 'better-sqlite3';", "import { createClient } from '@libsql/client';")

# 2. DB Init
content = content.replace(
    "const db = new Database('database.sqlite');",
    "const db = createClient({ url: process.env.TURSO_DATABASE_URL || 'file:database.sqlite', authToken: process.env.TURSO_AUTH_TOKEN });"
)

# 3. function initDb() -> async function initDb()
content = content.replace("function initDb() {", "async function initDb() {")
content = content.replace("initDb();", "await initDb();")

# 4. try { db.exec( ... ) } -> try { await db.executeMultiple( ... ) }
# We need to replace all `db.exec(` with `await db.executeMultiple(`
content = content.replace("db.exec(", "await db.executeMultiple(")

# 5. db.prepare('SQL').get(args) -> await db.execute({ sql: 'SQL', args: [args] })
# Let's replace simple db.prepare(SQL) with await db.execute(SQL)
# Actually, since we use parameter binding, Turso needs `{ sql, args }`.

def replace_db_prepare(match):
    full_call = match.group(0)
    sql = match.group(1)
    method_call = match.group(2)
    
    # Check if method is run, get, or all
    m = re.match(r"\.(run|get|all)\((.*?)\)", method_call)
    if not m:
        return full_call # something else?
    
    method = m.group(1)
    args_str = m.group(2)
    
    if args_str.strip():
        # Has args
        new_call = f"await db.execute({{ sql: {sql}, args: [{args_str}] }})"
    else:
        # No args
        new_call = f"await db.execute({sql})"
        
    if method == "get":
        new_call = f"({new_call}).rows[0]"
    elif method == "all":
        new_call = f"({new_call}).rows"
        
    return new_call

content = re.sub(r"db\.prepare\((.*?)\)(\.(?:run|get|all)\(.*?\))", replace_db_prepare, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
