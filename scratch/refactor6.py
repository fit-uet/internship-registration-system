import re

with open('server.ts', 'r') as f:
    code = f.read()

# 1. Imports
code = code.replace("import { DatabaseSync } from 'node:sqlite';", "import { createClient, Client } from '@libsql/client';")

# 2. Variable type
code = code.replace("let db: DatabaseSync;", "let db: Client;")

# 3. DB Init
turso_str = """db = createClient({ 
  url: process.env.TURSO_DATABASE_URL || 'libsql://internship-db-kieuvantuyen01.aws-ap-northeast-1.turso.io', 
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg2Njc1ODgsImlkIjoiMDE5ZTIwYmMtZjYwMS03NDM4LWJhNGYtM2RmMGY0ZTczMWQ4IiwicmlkIjoiZTMxNjg3NjYtZWYzYy00OTI0LTlmYzItNWM3NzBlYTJhY2U0In0.6Ll3Ta48hjFtTme0UBKZZ8xNVO0wOD-f4JKTgRMGsTS4ob7ZiGAt1HIZxZ3b98seSdTDjP3XkgV6VGg3ii_ZAw' 
});"""
code = code.replace("db = new DatabaseSync('./database.sqlite');", turso_str)

# 4. Async initDb
code = code.replace("function initDb() {", "async function initDb() {")
code = code.replace("initDb();", "await initDb();")

# 5. Replace db.exec
code = code.replace("db.exec(", "await db.executeMultiple(")

# 6. Replace loops carefully!
# Loop 1: seedCompaniesIfEmpty
#     const insertStmt = db.prepare(`
#       INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)
#       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
#     `);
# ...
#       insertStmt.run(name, description, slots, contactEmail, history, qualifications, address, infoLink, phone, contactName);
pattern1 = r"const insertStmt = db\.prepare\(`\s*INSERT INTO companies \([\s\S]*?\)\s*VALUES \([\s\S]*?\)\s*`\);"
sql1 = "`\n      INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n    `"
code = re.sub(pattern1, f"const insertSql1 = {sql1};", code)
code = code.replace("insertStmt.run(name, description, slots, contactEmail, history, qualifications, address, infoLink, phone, contactName);", "await db.execute({ sql: insertSql1, args: [name, description, slots, contactEmail, history, qualifications, address, infoLink, phone, contactName] });")

# Loop 2: /api/registrations
pattern2 = r"const insertStmt = db\.prepare\(\s*'INSERT INTO registrations \([\s\S]*?\)\s*'\s*\);"
sql2 = "'INSERT INTO registrations (user_id, company_id, student_id, dob, class_name, note, status, other_company_name, other_company_role, other_company_contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'"
code = re.sub(pattern2, f"const insertSql2 = {sql2};", code)
run_repl = "await db.execute({ sql: insertSql2, args: [req.user.id, companyId, student_id, dob, class_name, note, 'approved', null, null, null] });"
code = code.replace("insertStmt.run(req.user.id, companyId, student_id, dob, class_name, note, 'approved', null, null, null);", run_repl)

run_repl2 = """await db.execute({
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
            other.contact
            ]
          });"""
# Because formatting might vary, let's just regex the big run call:
code = re.sub(r"insertStmt\.run\(\s*req\.user\.id,\s*khacCompany\.id,\s*student_id,\s*dob,\s*class_name,\s*note,\s*status,\s*other\.name,\s*other\.role,\s*other\.contact\s*\);", run_repl2, code)

# Loop 3: import-companies
pattern3 = r"const insertStmt = db\.prepare\(`\s*INSERT INTO companies \([\s\S]*?\)\s*VALUES \([\s\S]*?\)\s*`\);"
sql3 = "`\n        INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      `"
# since pattern1 might have replaced it already if the regex is greedy? No, pattern1 only replaces one if it matches exactly. Let's use re.sub again just in case, or replace directly.
code = code.replace("const insertStmt = db.prepare(`\n        INSERT INTO companies (name, description, slots, contact_email, history, qualifications, address, recruitment_link, phone, contact_name)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      `);", f"const insertSql3 = {sql3};")
code = code.replace("insertStmt.run(name, description, slots, contactEmail, history, qualifications, address, infoLink, phone, contactName);", "await db.execute({ sql: insertSql3, args: [name, description, slots, contactEmail, history, qualifications, address, infoLink, phone, contactName] });")

# Now that we've isolated the problematic statements, we can safely replace all other db.prepare(SQL).run/get/all
# Wait, some queries are multiline.
def safe_replace(m):
    # m is db.prepare(...).run/get/all(...)
    full = m.group(0)
    # The tricky part is finding the boundaries of the prepare string and the chained method call.
    # To do this safely, we search for `)\.run\((.*?)\)` etc at the END.
    pass

# Simpler way: just iterate over `db.prepare(` and find the matching closing paren, then the method.
def parse_db(code):
    out = ""
    idx = 0
    while True:
        pos = code.find("db.prepare(", idx)
        if pos == -1:
            out += code[idx:]
            break
        out += code[idx:pos]
        
        # find matching paren for db.prepare(
        pcount = 1
        i = pos + 11
        in_string = False
        string_char = ''
        while pcount > 0 and i < len(code):
            c = code[i]
            if not in_string:
                if c in ("'", '"', "`"):
                    in_string = True
                    string_char = c
                elif c == '(':
                    pcount += 1
                elif c == ')':
                    pcount -= 1
            else:
                if c == '\\':
                    i += 1
                elif c == string_char:
                    in_string = False
            i += 1
            
        sql_arg = code[pos+11:i-1]
        
        # Now find the method call
        method_pos = code.find(".", i)
        if method_pos == i: # .get, .run, .all
            method_end = code.find("(", method_pos)
            method = code[method_pos+1:method_end]
            
            pcount = 1
            j = method_end + 1
            in_string = False
            while pcount > 0 and j < len(code):
                c = code[j]
                if not in_string:
                    if c in ("'", '"', "`"):
                        in_string = True
                        string_char = c
                    elif c == '(':
                        pcount += 1
                    elif c == ')':
                        pcount -= 1
                else:
                    if c == '\\':
                        j += 1
                    elif c == string_char:
                        in_string = False
                j += 1
            
            args_str = code[method_end+1:j-1].strip()
            
            if args_str:
                new_call = f"await db.execute({{ sql: {sql_arg}, args: [{args_str}] }})"
            else:
                new_call = f"await db.execute({sql_arg})"
                
            if method == "get":
                new_call = f"({new_call}).rows[0]"
            elif method == "all":
                new_call = f"({new_call}).rows"
                
            out += new_call
            idx = j
        else:
            # no chained method, leave it?
            # but we already handled insertStmt
            out += code[pos:i]
            idx = i
            
    return out

code = parse_db(code)

# Let's save it
with open('server.ts', 'w') as f:
    f.write(code)

