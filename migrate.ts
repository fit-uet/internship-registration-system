import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:./local.db' });
async function run() {
  try {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        picture TEXT,
        student_id TEXT,
        dob TEXT,
        class_name TEXT,
        course_code TEXT
      );
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        picture TEXT
      );
    `);
    
    // Migrate
    try {
      await db.execute("INSERT OR IGNORE INTO admins (email, name, picture) SELECT email, name, picture FROM users WHERE role = 'admin'");
      await db.execute("INSERT OR IGNORE INTO students (id, email, name, picture, student_id, dob, class_name, course_code) SELECT id, email, name, picture, student_id, dob, class_name, course_code FROM users WHERE role = 'student'");
      await db.execute("DROP TABLE users");
      console.log("Migration successful");
    } catch (e: any) {
      console.log("Migration error or already migrated:", e.message);
    }
  } catch (e: any) {
    console.error(e);
  }
}
run();
