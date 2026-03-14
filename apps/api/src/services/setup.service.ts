import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { count as drizzleCount, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, roles, refreshTokens, settings, contentTypes, contents, components } from '../db/schema/index.js';
import { env } from '../config/environment.js';
import { parseDuration, parseDurationSec } from '../utils/parse-duration.js';
import { AppError } from '../utils/app-error.js';
import { DEFAULT_ROLE_PERMISSIONS } from '@eli-cms/shared';
import type { JwtPayload, TokenPair, FieldDefinition, OnboardingInput } from '@eli-cms/shared';
import { createHash } from 'node:crypto';

const ONBOARDING_KEY = 'onboarding_completed';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class SetupService {
  static async getStatus(): Promise<{ needsSetup: boolean; onboardingCompleted: boolean }> {
    const [{ total }] = await db.select({ total: drizzleCount() }).from(users);
    if (total === 0) return { needsSetup: true, onboardingCompleted: false };

    const [row] = await db.select().from(settings).where(eq(settings.key, ONBOARDING_KEY)).limit(1);
    return { needsSetup: false, onboardingCompleted: row ? (row.value as boolean) : false };
  }

  static async initialize(input: { email: string; password: string }) {
    // Guard: refuse if any user already exists
    const { needsSetup } = await this.getStatus();
    if (!needsSetup) {
      throw new AppError(403, 'Setup already completed');
    }

    // 1. Upsert default roles
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
      }
    }

    // 2. Get the super-admin role
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin')).limit(1);
    if (!superAdminRole) {
      throw new AppError(500, 'Failed to create default roles');
    }

    // 3. Hash password & create user
    const hashedPassword = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        password: hashedPassword,
        roleId: superAdminRole.id,
      })
      .returning({ id: users.id, email: users.email, roleId: users.roleId, createdAt: users.createdAt });

    // 4. Generate tokens (auto-login)
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions: superAdminRole.permissions as string[],
    };
    const tokens = await this.generateTokens(payload, randomUUID());

    return { user, tokens };
  }

  static async resetOnboarding(): Promise<void> {
    await db.delete(settings).where(eq(settings.key, ONBOARDING_KEY));
  }

  static async onboarding(input: OnboardingInput): Promise<{ contentTypesCreated: string[]; contentsCreated: number }> {
    const templates = this.getTemplates();
    const template = templates[input.template];
    if (!template) throw new AppError(400, `Unknown template: ${input.template}`);

    const created: string[] = [];
    let contentsCreated = 0;

    // 1. Seed the Site Settings singleton if it doesn't exist
    const [existingSettings] = await db
      .select()
      .from(contentTypes)
      .where(eq(contentTypes.slug, 'site-settings'))
      .limit(1);
    if (!existingSettings) {
      await db.insert(contentTypes).values({
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
        ] as FieldDefinition[],
      });
    }

    // 2. Create Site Settings content entry with user info
    const [settingsCt] = await db.select().from(contentTypes).where(eq(contentTypes.slug, 'site-settings')).limit(1);
    if (settingsCt) {
      const [existingContent] = await db
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.contentTypeId, settingsCt.id))
        .limit(1);
      if (!existingContent) {
        await db.insert(contents).values({
          contentTypeId: settingsCt.id,
          status: 'published',
          data: {
            site_name: input.siteName || 'My Website',
            site_description: input.siteDescription || '',
          },
        });
        contentsCreated++;
      }
    }

    // 3. Seed template content types
    for (const ct of template.contentTypes) {
      const [existing] = await db.select().from(contentTypes).where(eq(contentTypes.slug, ct.slug)).limit(1);
      if (!existing) {
        await db.insert(contentTypes).values(ct);
        created.push(ct.name);
      }
    }

    // 4. Seed demo content if requested
    if (input.demoContent && template.demoContent) {
      for (const demo of template.demoContent) {
        const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.slug, demo.contentTypeSlug)).limit(1);
        if (!ct) continue;
        for (const entry of demo.entries) {
          await db.insert(contents).values({
            contentTypeId: ct.id,
            slug: entry.slug,
            status: 'published',
            data: entry.data,
          });
          contentsCreated++;
        }
      }
    }

    // 5. Seed extra page builder components if requested
    if (input.extraComponents) {
      const extraComps: Array<{ slug: string; name: string; icon: string; fields: FieldDefinition[] }> = [
        {
          slug: 'testimonial',
          name: 'Testimonial',
          icon: 'i-lucide-quote',
          fields: [
            { name: 'quote', type: 'textarea', required: true, label: 'Quote' },
            { name: 'author_name', type: 'text', required: true, label: 'Author Name' },
            { name: 'author_title', type: 'text', required: false, label: 'Author Title' },
            { name: 'avatar', type: 'media', required: false, label: 'Avatar', accept: ['image'] },
          ],
        },
        {
          slug: 'faq',
          name: 'FAQ',
          icon: 'i-lucide-help-circle',
          fields: [
            {
              name: 'items',
              type: 'repeatable',
              required: false,
              label: 'Questions',
              subFields: [
                { name: 'question', type: 'text', required: true, label: 'Question' },
                { name: 'answer', type: 'textarea', required: true, label: 'Answer' },
              ],
            },
          ],
        },
        {
          slug: 'feature-grid',
          name: 'Feature Grid',
          icon: 'i-lucide-grid-3x3',
          fields: [
            { name: 'title', type: 'text', required: false, label: 'Section Title' },
            {
              name: 'features',
              type: 'repeatable',
              required: false,
              label: 'Features',
              subFields: [
                { name: 'icon', type: 'text', required: false, label: 'Icon name' },
                { name: 'title', type: 'text', required: true, label: 'Title' },
                { name: 'description', type: 'textarea', required: false, label: 'Description' },
              ],
            },
          ],
        },
        {
          slug: 'gallery',
          name: 'Gallery',
          icon: 'i-lucide-images',
          fields: [
            { name: 'title', type: 'text', required: false, label: 'Title' },
            { name: 'images', type: 'media', required: false, label: 'Images', accept: ['image'], multiple: true },
          ],
        },
      ];

      for (const comp of extraComps) {
        const [existing] = await db.select().from(components).where(eq(components.slug, comp.slug)).limit(1);
        if (!existing) {
          await db.insert(components).values(comp);
        }
      }
    }

    // 6. Mark onboarding as completed
    await db
      .insert(settings)
      .values({ key: ONBOARDING_KEY, value: true, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: true, updatedAt: new Date() } });

    return { contentTypesCreated: created, contentsCreated };
  }

  private static getTemplates(): Record<
    string,
    {
      contentTypes: Array<{ slug: string; name: string; isSingleton?: boolean; fields: FieldDefinition[] }>;
      demoContent?: Array<{ contentTypeSlug: string; entries: Array<{ slug: string; data: Record<string, unknown> }> }>;
    }
  > {
    return {
      blog: {
        contentTypes: [
          {
            slug: 'article',
            name: 'Article',
            fields: [
              { name: 'title', type: 'text', required: true, label: 'Title' },
              { name: 'excerpt', type: 'textarea', required: false, label: 'Excerpt' },
              { name: 'body', type: 'richtext', required: true, label: 'Body' },
              { name: 'cover', type: 'media', required: false, label: 'Cover Image', accept: ['image'] },
              {
                name: 'category',
                type: 'select',
                required: false,
                label: 'Category',
                options: ['News', 'Tutorial', 'Opinion', 'Review'],
              },
              { name: 'author', type: 'author', required: false, label: 'Author' },
              { name: 'seo', type: 'component', required: false, label: 'SEO', componentSlugs: ['seo'] },
            ],
          },
        ],
        demoContent: [
          {
            contentTypeSlug: 'article',
            entries: [
              {
                slug: 'welcome-to-our-blog',
                data: {
                  title: 'Welcome to Our Blog',
                  excerpt: 'This is your first article. Edit or delete it to get started.',
                  body: '<h2>Getting Started</h2><p>Welcome to your new blog! This is a demo article created during onboarding. Feel free to edit it or create new articles.</p><p>You can use the <strong>rich text editor</strong> to format your content, add images, and more.</p>',
                  category: 'News',
                },
              },
              {
                slug: 'how-to-use-the-cms',
                data: {
                  title: 'How to Use the CMS',
                  excerpt: 'A quick guide to managing your content with Eli CMS.',
                  body: '<h2>Managing Content</h2><p>Eli CMS makes it easy to manage your content. Here are the basics:</p><ul><li><strong>Content Types</strong> define the structure of your content</li><li><strong>Contents</strong> are the actual entries you create</li><li><strong>Media</strong> lets you upload and manage files</li></ul><p>Explore the sidebar to discover all features!</p>',
                  category: 'Tutorial',
                },
              },
            ],
          },
        ],
      },
      corporate: {
        contentTypes: [
          {
            slug: 'page',
            name: 'Page',
            fields: [
              { name: 'title', type: 'text', required: true, label: 'Title' },
              { name: 'body', type: 'richtext', required: false, label: 'Content' },
              { name: 'hero', type: 'component', required: false, label: 'Hero Section', componentSlugs: ['hero'] },
              { name: 'seo', type: 'component', required: false, label: 'SEO', componentSlugs: ['seo'] },
            ],
          },
          {
            slug: 'team-member',
            name: 'Team Member',
            fields: [
              { name: 'name', type: 'text', required: true, label: 'Full Name' },
              { name: 'role', type: 'text', required: false, label: 'Job Title' },
              { name: 'bio', type: 'textarea', required: false, label: 'Bio' },
              { name: 'photo', type: 'media', required: false, label: 'Photo', accept: ['image'] },
              { name: 'email', type: 'email', required: false, label: 'Email' },
              { name: 'linkedin', type: 'url', required: false, label: 'LinkedIn' },
            ],
          },
          {
            slug: 'service',
            name: 'Service',
            fields: [
              { name: 'title', type: 'text', required: true, label: 'Title' },
              { name: 'description', type: 'textarea', required: false, label: 'Description' },
              { name: 'icon', type: 'text', required: false, label: 'Icon' },
              { name: 'image', type: 'media', required: false, label: 'Image', accept: ['image'] },
            ],
          },
        ],
        demoContent: [
          {
            contentTypeSlug: 'page',
            entries: [
              {
                slug: 'about',
                data: {
                  title: 'About Us',
                  body: '<h2>Our Story</h2><p>We are a passionate team dedicated to delivering excellence. Edit this page to tell your story.</p>',
                },
              },
              {
                slug: 'contact',
                data: {
                  title: 'Contact',
                  body: "<h2>Get in Touch</h2><p>We'd love to hear from you. Reach out to us using the information below.</p>",
                },
              },
            ],
          },
          {
            contentTypeSlug: 'team-member',
            entries: [
              {
                slug: 'jane-doe',
                data: { name: 'Jane Doe', role: 'CEO & Founder', bio: 'Visionary leader with 15 years of experience.' },
              },
              {
                slug: 'john-smith',
                data: {
                  name: 'John Smith',
                  role: 'CTO',
                  bio: 'Tech enthusiast building the future, one line of code at a time.',
                },
              },
            ],
          },
        ],
      },
      portfolio: {
        contentTypes: [
          {
            slug: 'project',
            name: 'Project',
            fields: [
              { name: 'title', type: 'text', required: true, label: 'Title' },
              { name: 'description', type: 'richtext', required: false, label: 'Description' },
              { name: 'cover', type: 'media', required: false, label: 'Cover Image', accept: ['image'] },
              { name: 'gallery', type: 'media', required: false, label: 'Gallery', accept: ['image'], multiple: true },
              { name: 'client', type: 'text', required: false, label: 'Client' },
              { name: 'year', type: 'number', required: false, label: 'Year' },
              { name: 'url', type: 'url', required: false, label: 'Project URL' },
              {
                name: 'category',
                type: 'select',
                required: false,
                label: 'Category',
                options: ['Web Design', 'Branding', 'Mobile App', 'Illustration', 'Photography'],
              },
            ],
          },
        ],
        demoContent: [
          {
            contentTypeSlug: 'project',
            entries: [
              {
                slug: 'brand-redesign',
                data: {
                  title: 'Brand Redesign',
                  description:
                    '<p>A complete brand overhaul for a tech startup. New logo, color palette, and brand guidelines.</p>',
                  client: 'TechCorp',
                  year: 2025,
                  category: 'Branding',
                },
              },
              {
                slug: 'e-commerce-platform',
                data: {
                  title: 'E-commerce Platform',
                  description: '<p>Modern e-commerce experience built with performance and accessibility in mind.</p>',
                  client: 'ShopWave',
                  year: 2025,
                  category: 'Web Design',
                },
              },
            ],
          },
        ],
      },
      ecommerce: {
        contentTypes: [
          {
            slug: 'product',
            name: 'Product',
            fields: [
              { name: 'name', type: 'text', required: true, label: 'Product Name' },
              { name: 'description', type: 'richtext', required: false, label: 'Description' },
              { name: 'price', type: 'number', required: true, label: 'Price' },
              { name: 'sku', type: 'text', required: false, label: 'SKU' },
              { name: 'in_stock', type: 'boolean', required: false, label: 'In Stock', defaultValue: true },
              { name: 'images', type: 'media', required: false, label: 'Images', accept: ['image'], multiple: true },
              {
                name: 'category',
                type: 'select',
                required: false,
                label: 'Category',
                options: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'],
              },
              { name: 'seo', type: 'component', required: false, label: 'SEO', componentSlugs: ['seo'] },
            ],
          },
          {
            slug: 'product-category',
            name: 'Product Category',
            fields: [
              { name: 'name', type: 'text', required: true, label: 'Category Name' },
              { name: 'description', type: 'textarea', required: false, label: 'Description' },
              { name: 'image', type: 'media', required: false, label: 'Image', accept: ['image'] },
            ],
          },
        ],
        demoContent: [
          {
            contentTypeSlug: 'product',
            entries: [
              {
                slug: 'wireless-headphones',
                data: {
                  name: 'Wireless Headphones',
                  description: '<p>Premium wireless headphones with noise cancellation and 30-hour battery life.</p>',
                  price: 149.99,
                  sku: 'WH-001',
                  in_stock: true,
                  category: 'Electronics',
                },
              },
              {
                slug: 'organic-cotton-tshirt',
                data: {
                  name: 'Organic Cotton T-Shirt',
                  description: '<p>Comfortable and sustainable. Made from 100% organic cotton.</p>',
                  price: 29.99,
                  sku: 'CT-001',
                  in_stock: true,
                  category: 'Clothing',
                },
              },
            ],
          },
        ],
      },
    };
  }

  private static async generateTokens(payload: JwtPayload, family: string): Promise<TokenPair> {
    const accessExpiresIn = parseDurationSec(env.JWT_ACCESS_EXPIRY);
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: accessExpiresIn });

    const rawRefreshToken = randomUUID();
    const tokenHash = hashToken(rawRefreshToken);
    const refreshExpiresMs = parseDuration(env.JWT_REFRESH_EXPIRY)!;

    await db.insert(refreshTokens).values({
      userId: payload.userId,
      tokenHash,
      family,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
