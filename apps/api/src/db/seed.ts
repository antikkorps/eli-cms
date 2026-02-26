import bcrypt from 'bcryptjs';
import { db, pool } from './index.js';
import { users } from './schema/index.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  const email = 'admin@eli-cms.local';
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await db.insert(users).values({
      email,
      password: hashedPassword,
      role: 'admin',
    });
    console.log(`Admin user created: ${email} / admin123`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  await pool.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
