import { createClient } from '@libsql/client';
import fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./internship-db.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function importK68() {
  const content = fs.readFileSync('./Danh sách K68.csv', 'utf-8');
  const lines = content.trim().split('\n');
  let count = 0;
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 5) {
      const student_id = parts[1].trim();
      const name = parts[2].trim();
      const dob = parts[3].trim();
      const class_name = parts[4].trim();
      const email = `${student_id}@vnu.edu.vn`;

      let formattedDob = dob;
      if (dob.includes('/')) {
        const dParts = dob.split('/');
        if (dParts.length === 3) {
          // Format to YYYY-MM-DD for <input type="date">
          formattedDob = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
        }
      }

      try {
        await db.execute({
          sql: `INSERT INTO users (email, name, role, student_id, dob, class_name)
                VALUES (?, ?, 'student', ?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET 
                  name=excluded.name, 
                  student_id=excluded.student_id, 
                  dob=excluded.dob, 
                  class_name=excluded.class_name`,
          args: [email, name, student_id, formattedDob, class_name]
        });
        count++;
      } catch (err) {
        console.error(`Error inserting ${student_id}:`, err);
      }
    }
  }
  console.log(`Successfully imported/updated ${count} students from K68.`);
}

importK68().catch(console.error);
