import bcrypt from 'bcryptjs';
import { db, pool } from './index.js';
import { users, roles } from './schema/index.js';
import { eq } from 'drizzle-orm';
import { DEFAULT_ROLE_PERMISSIONS } from '@eli-cms/shared';

async function seed() {
  console.log('Seeding database...');

  // 1. Ensure default roles exist
  for (const [slug, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const existing = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
    if (existing.length === 0) {
      const name = slug === 'super-admin' ? 'Super Admin' : 'Editor';
      const description = slug === 'super-admin' ? 'Full access to all features' : 'Can manage content and uploads';
      await db.insert(roles).values({
        name,
        slug,
        description,
        permissions: [...permissions],
        isSystem: true,
      });
      console.log(`Role created: ${name}`);
    } else {
      console.log(`Role "${slug}" already exists, skipping.`);
    }
  }

  // 2. Ensure admin user exists
  const email = 'admin@eli-cms.local';
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length === 0) {
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin')).limit(1);
    if (!superAdminRole) {
      throw new Error('super-admin role not found — cannot create admin user');
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);
    await db.insert(users).values({
      email,
      password: hashedPassword,
      roleId: superAdminRole.id,
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
