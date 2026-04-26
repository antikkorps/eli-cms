import bcrypt from 'bcryptjs';
import { db, pool } from './index.js';
import { users, roles, components, contentTypes, contentTypeTemplates } from './schema/index.js';
import { eq } from 'drizzle-orm';
import { DEFAULT_ROLE_PERMISSIONS } from '@eli-cms/shared';
import type { FieldDefinition } from '@eli-cms/shared';
import { seedSystemContentTypeTemplates } from './seed-content-type-templates.js';

async function seed() {
  console.log('Seeding database...');

  // 1. Ensure default roles exist
  const roleMetadata: Record<string, { name: string; description: string }> = {
    'super-admin': { name: 'Super Admin', description: 'Full access to all features' },
    manager: { name: 'Manager', description: 'Can manage users, content, and uploads — ideal for team leads' },
    editor: { name: 'Editor', description: 'Can manage content and uploads, publish approved content' },
    reviewer: { name: 'Reviewer', description: 'Can manage content and review submissions' },
  };

  for (const [slug, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const existing = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
    if (existing.length === 0) {
      const meta = roleMetadata[slug] ?? { name: slug, description: '' };
      const name = meta.name;
      const description = meta.description;
      await db.insert(roles).values({
        name,
        slug,
        description,
        permissions: [...permissions],
        isSystem: true,
      });
      console.log(`Role created: ${name}`);
    } else {
      // Update permissions of existing system roles to stay in sync
      await db
        .update(roles)
        .set({ permissions: [...permissions] })
        .where(eq(roles.slug, slug));
      console.log(`Role "${slug}" already exists, permissions updated.`);
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

  // 3. Ensure default components exist
  const defaultComponents: Array<{ slug: string; name: string; icon: string; fields: FieldDefinition[] }> = [
    {
      slug: 'seo',
      name: 'SEO',
      icon: 'i-lucide-search',
      fields: [
        { name: 'meta_title', type: 'text', required: false, label: 'Meta Title' },
        { name: 'meta_description', type: 'textarea', required: false, label: 'Meta Description' },
        { name: 'og_image', type: 'media', required: false, label: 'OG Image', accept: ['image'] },
        { name: 'canonical_url', type: 'url', required: false, label: 'Canonical URL' },
        { name: 'no_index', type: 'boolean', required: false, label: 'No Index', defaultValue: false },
      ],
    },
    {
      slug: 'hero',
      name: 'Hero',
      icon: 'i-lucide-layout-template',
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Title' },
        { name: 'subtitle', type: 'textarea', required: false, label: 'Subtitle' },
        { name: 'image', type: 'media', required: false, label: 'Background Image', accept: ['image'] },
        { name: 'cta_label', type: 'text', required: false, label: 'CTA Label' },
        { name: 'cta_url', type: 'url', required: false, label: 'CTA URL' },
      ],
    },
    {
      slug: 'cta',
      name: 'Call to Action',
      icon: 'i-lucide-megaphone',
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Title' },
        { name: 'description', type: 'textarea', required: false, label: 'Description' },
        { name: 'button_label', type: 'text', required: false, label: 'Button Label' },
        { name: 'button_url', type: 'url', required: false, label: 'Button URL' },
      ],
    },
    {
      slug: 'company-identity',
      name: 'Company Identity',
      icon: 'i-lucide-building-2',
      fields: [
        { name: 'company_name', type: 'text', required: true, label: 'Company Name' },
        { name: 'logo', type: 'media', required: false, label: 'Logo', accept: ['image'] },
        { name: 'tagline', type: 'text', required: false, label: 'Tagline' },
        { name: 'description', type: 'textarea', required: false, label: 'Description' },
        { name: 'email', type: 'email', required: false, label: 'Contact Email' },
        { name: 'phone', type: 'text', required: false, label: 'Phone' },
        { name: 'address', type: 'textarea', required: false, label: 'Address' },
        {
          name: 'social_links',
          type: 'repeatable',
          required: false,
          label: 'Social Links',
          subFields: [
            {
              name: 'platform',
              type: 'select',
              required: true,
              label: 'Platform',
              options: ['Facebook', 'Twitter / X', 'Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'GitHub', 'Other'],
            },
            { name: 'url', type: 'url', required: true, label: 'URL' },
          ],
        },
      ],
    },
  ];

  for (const comp of defaultComponents) {
    const existing = await db.select().from(components).where(eq(components.slug, comp.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(components).values(comp);
      console.log(`Component created: ${comp.name}`);
    } else {
      console.log(`Component "${comp.slug}" already exists, skipping.`);
    }
  }

  // 4. Ensure default content types exist
  const defaultContentTypes: Array<{ slug: string; name: string; isSingleton: boolean; fields: FieldDefinition[] }> = [
    {
      slug: 'site-settings',
      name: 'Site Settings',
      isSingleton: true,
      fields: [
        { name: 'site_name', type: 'text', required: true, label: 'Site Name', defaultValue: 'My Website' },
        { name: 'site_description', type: 'textarea', required: false, label: 'Site Description' },
        { name: 'favicon', type: 'media', required: false, label: 'Favicon', accept: ['image'] },
        {
          name: 'company',
          type: 'component',
          required: false,
          label: 'Company Identity',
          componentSlugs: ['company-identity'],
        },
        { name: 'seo', type: 'component', required: false, label: 'Default SEO', componentSlugs: ['seo'] },
      ],
    },
  ];

  for (const ct of defaultContentTypes) {
    const existing = await db.select().from(contentTypes).where(eq(contentTypes.slug, ct.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(contentTypes).values(ct);
      console.log(`Content type created: ${ct.name}`);
    } else {
      console.log(`Content type "${ct.slug}" already exists, skipping.`);
    }
  }

  // 5. Ensure system content type templates exist
  await seedSystemContentTypeTemplates(db, contentTypeTemplates);

  await pool.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
