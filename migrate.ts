import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./internship-db.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function getSqliteObjectType(name: string) {
  const row = (await db.execute({
    sql: "SELECT type FROM sqlite_master WHERE name = ? AND type IN ('table', 'view')",
    args: [name]
  })).rows[0] as { type?: string } | undefined;
  return row?.type || null;
}

async function run() {
  try {
    const studentsType = await getSqliteObjectType('students');
    if (studentsType === 'table') {
      await db.executeMultiple(`
        INSERT INTO users (email, name, picture, role, student_id, dob, class_name, course_code)
        SELECT email, name, picture, 'student', student_id, dob, class_name, course_code
        FROM students
        WHERE email IS NOT NULL AND email != ''
        ON CONFLICT(email) DO UPDATE SET
          name = COALESCE(NULLIF(users.name, ''), excluded.name),
          picture = COALESCE(users.picture, excluded.picture),
          student_id = COALESCE(NULLIF(users.student_id, ''), excluded.student_id),
          dob = COALESCE(NULLIF(users.dob, ''), excluded.dob),
          class_name = COALESCE(NULLIF(users.class_name, ''), excluded.class_name),
          course_code = COALESCE(NULLIF(users.course_code, ''), excluded.course_code);
        DROP TABLE students;
      `);
    }

    const adminsType = await getSqliteObjectType('admins');
    if (adminsType === 'table') {
      await db.executeMultiple(`
        INSERT INTO users (email, name, picture, role)
        SELECT email, name, picture, 'admin'
        FROM admins
        WHERE email IS NOT NULL AND email != ''
        ON CONFLICT(email) DO UPDATE SET
          role = 'admin',
          name = COALESCE(NULLIF(users.name, ''), excluded.name),
          picture = COALESCE(users.picture, excluded.picture);
        DROP TABLE admins;
      `);
    }

    await db.executeMultiple(`
      DROP VIEW IF EXISTS students;
      CREATE VIEW students AS
        SELECT id, email, name, picture, student_id, dob, class_name, course_code
        FROM users
        WHERE role = 'student';

      DROP VIEW IF EXISTS admins;
      CREATE VIEW admins AS
        SELECT id, email, name, picture
        FROM users
        WHERE role = 'admin';
    `);

    await db.executeMultiple(`
      DELETE FROM lecturers
      WHERE email IN (
        SELECT email FROM users
        WHERE role = 'admin' AND COALESCE(is_lecturer, 0) = 0
      );

      UPDATE users
      SET role = CASE WHEN role = 'admin' THEN 'admin' ELSE 'lecturer' END,
          is_lecturer = 1,
          name = (
            SELECT lecturers.name
            FROM lecturers
            WHERE lecturers.email = users.email
            LIMIT 1
          )
      WHERE email IN (
        SELECT email FROM lecturers
        WHERE email IS NOT NULL AND email != ''
      );

      UPDATE users
      SET role = 'student',
          is_lecturer = 0
      WHERE role = 'lecturer'
        AND email NOT IN (
          SELECT email FROM lecturers
          WHERE email IS NOT NULL AND email != ''
        );

      UPDATE lecturers
      SET email = (
        SELECT users.email
        FROM users
        WHERE users.name = lecturers.name
          AND (users.role = 'lecturer' OR (users.role = 'admin' AND COALESCE(users.is_lecturer, 0) = 1))
        LIMIT 1
      )
      WHERE (email IS NULL OR email = '')
        AND name IN (
          SELECT name FROM users
          WHERE role = 'lecturer' OR (role = 'admin' AND COALESCE(is_lecturer, 0) = 1)
        );

      DELETE FROM lecturers
      WHERE email IN (
        SELECT email FROM users
        WHERE role = 'admin' AND COALESCE(is_lecturer, 0) = 1
      )
        AND name != (
          SELECT users.name
          FROM users
          WHERE users.email = lecturers.email
            AND users.role = 'admin'
            AND COALESCE(users.is_lecturer, 0) = 1
        );

      UPDATE lecturers
      SET name = (
        SELECT users.name
        FROM users
        WHERE users.email = lecturers.email
          AND (users.role = 'lecturer' OR (users.role = 'admin' AND COALESCE(users.is_lecturer, 0) = 1))
      )
      WHERE email IN (
        SELECT email FROM users
        WHERE role = 'lecturer' OR (role = 'admin' AND COALESCE(is_lecturer, 0) = 1)
      );

      INSERT OR IGNORE INTO lecturers (name, email)
      SELECT name, email
      FROM users
      WHERE role = 'admin'
        AND COALESCE(is_lecturer, 0) = 1
        AND email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM lecturers
          WHERE lecturers.email = users.email
        );
    `);

    console.log('Migration successful: users is now the source of truth for students/admins.');
  } catch (e: any) {
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  }
}

run();
