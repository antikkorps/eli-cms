// ─── Permission constants (resource:action) ─────────────
export const CONTENT_CREATE = 'content:create';
export const CONTENT_READ = 'content:read';
export const CONTENT_UPDATE = 'content:update';
export const CONTENT_DELETE = 'content:delete';
export const CONTENT_PUBLISH = 'content:publish';

export const CONTENT_TYPES_READ = 'content-types:read';
export const CONTENT_TYPES_MANAGE = 'content-types:manage';

export const USERS_READ = 'users:read';
export const USERS_MANAGE = 'users:manage';

export const UPLOADS_CREATE = 'uploads:create';
export const UPLOADS_READ = 'uploads:read';
export const UPLOADS_DELETE = 'uploads:delete';

export const SETTINGS_MANAGE = 'settings:manage';

export const WEBHOOKS_MANAGE = 'webhooks:manage';

export const ROLES_READ = 'roles:read';
export const ROLES_MANAGE = 'roles:manage';

export const AUDIT_LOGS_READ = 'audit-logs:read';
export const API_KEYS_MANAGE = 'api-keys:manage';

export const ALL_PERMISSIONS = [
  CONTENT_CREATE,
  CONTENT_READ,
  CONTENT_UPDATE,
  CONTENT_DELETE,
  CONTENT_PUBLISH,
  CONTENT_TYPES_READ,
  CONTENT_TYPES_MANAGE,
  USERS_READ,
  USERS_MANAGE,
  UPLOADS_CREATE,
  UPLOADS_READ,
  UPLOADS_DELETE,
  SETTINGS_MANAGE,
  WEBHOOKS_MANAGE,
  ROLES_READ,
  ROLES_MANAGE,
  AUDIT_LOGS_READ,
  API_KEYS_MANAGE,
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// ─── Default role permission sets ────────────────────────
export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  'super-admin': ALL_PERMISSIONS,
  editor: [
    CONTENT_CREATE,
    CONTENT_READ,
    CONTENT_UPDATE,
    CONTENT_DELETE,
    CONTENT_PUBLISH,
    CONTENT_TYPES_READ,
    UPLOADS_CREATE,
    UPLOADS_READ,
  ],
};
