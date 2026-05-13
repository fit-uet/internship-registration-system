import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { DatabaseSync } from 'node:sqlite';", "import { createClient, Client } from '@libsql/client';")

# 2. Variable type
content = content.replace("let db: DatabaseSync;", "let db: Client;")

# 3. DB Init
# async function initDb() {
#   db = new DatabaseSync('./database.sqlite');
content = content.replace(
    "db = new DatabaseSync('./database.sqlite');",
    "db = createClient({ url: process.env.TURSO_DATABASE_URL || 'file:database.sqlite', authToken: process.env.TURSO_AUTH_TOKEN });"
)

# 4. db.exec -> await db.executeMultiple
content = content.replace("db.exec(", "await db.executeMultiple(")

# 5. db.prepare(SQL).run(...) -> await db.execute({ sql: SQL, args: [...] })
# Let's replace db.prepare(...) method calls safely.
def replace_db_prepare(match):
    full_call = match.group(0)
    sql = match.group(1)
    method_call = match.group(2)
    
    m = re.match(r"\.(run|get|all)\((.*?)\)", method_call)
    if not m:
        return full_call
    
    method = m.group(1)
    args_str = m.group(2)
    
    if args_str.strip():
        new_call = f"await db.execute({{ sql: {sql}, args: [{args_str}] }})"
    else:
        new_call = f"await db.execute({sql})"
        
    if method == "get":
        new_call = f"({new_call}).rows[0]"
    elif method == "all":
        new_call = f"({new_call}).rows"
        
    return new_call

content = re.sub(r"db\.prepare\((.*?)\)(\.(?:run|get|all)\(.*?\))", replace_db_prepare, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)

