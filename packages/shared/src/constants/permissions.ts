// ─── Permission constants (resource:action) ─────────────
export const CONTENT_CREATE = 'content:create';
export const CONTENT_READ = 'content:read';
export const CONTENT_UPDATE = 'content:update';
export const CONTENT_DELETE = 'content:delete';
export const CONTENT_PUBLISH = 'content:publish';
export const CONTENT_REVIEW = 'content:review';
export const CONTENT_PREVIEW = 'content:preview';

export const CONTENT_TYPES_CREATE = 'content-types:create';
export const CONTENT_TYPES_READ = 'content-types:read';
export const CONTENT_TYPES_UPDATE = 'content-types:update';
export const CONTENT_TYPES_DELETE = 'content-types:delete';

export const USERS_CREATE = 'users:create';
export const USERS_READ = 'users:read';
export const USERS_UPDATE = 'users:update';
export const USERS_DELETE = 'users:delete';

export const UPLOADS_CREATE = 'uploads:create';
export const UPLOADS_READ = 'uploads:read';
export const UPLOADS_UPDATE = 'uploads:update';
export const UPLOADS_DELETE = 'uploads:delete';

export const SETTINGS_READ = 'settings:read';
export const SETTINGS_UPDATE = 'settings:update';

export const WEBHOOKS_CREATE = 'webhooks:create';
export const WEBHOOKS_READ = 'webhooks:read';
export const WEBHOOKS_UPDATE = 'webhooks:update';
export const WEBHOOKS_DELETE = 'webhooks:delete';

export const ROLES_CREATE = 'roles:create';
export const ROLES_READ = 'roles:read';
export const ROLES_UPDATE = 'roles:update';
export const ROLES_DELETE = 'roles:delete';

export const COMPONENTS_CREATE = 'components:create';
export const COMPONENTS_READ = 'components:read';
export const COMPONENTS_UPDATE = 'components:update';
export const COMPONENTS_DELETE = 'components:delete';

export const COMMENTS_CREATE = 'comments:create';
export const COMMENTS_READ = 'comments:read';
export const COMMENTS_UPDATE = 'comments:update';
export const COMMENTS_DELETE = 'comments:delete';

export const AUDIT_LOGS_READ = 'audit-logs:read';

export const API_KEYS_CREATE = 'api-keys:create';
export const API_KEYS_READ = 'api-keys:read';
export const API_KEYS_UPDATE = 'api-keys:update';
export const API_KEYS_DELETE = 'api-keys:delete';

export const ALL_PERMISSIONS = [
  CONTENT_CREATE,
  CONTENT_READ,
  CONTENT_UPDATE,
  CONTENT_DELETE,
  CONTENT_PUBLISH,
  CONTENT_REVIEW,
  CONTENT_PREVIEW,
  CONTENT_TYPES_CREATE,
  CONTENT_TYPES_READ,
  CONTENT_TYPES_UPDATE,
  CONTENT_TYPES_DELETE,
  USERS_CREATE,
  USERS_READ,
  USERS_UPDATE,
  USERS_DELETE,
  UPLOADS_CREATE,
  UPLOADS_READ,
  UPLOADS_UPDATE,
  UPLOADS_DELETE,
  SETTINGS_READ,
  SETTINGS_UPDATE,
  WEBHOOKS_CREATE,
  WEBHOOKS_READ,
  WEBHOOKS_UPDATE,
  WEBHOOKS_DELETE,
  ROLES_CREATE,
  ROLES_READ,
  ROLES_UPDATE,
  ROLES_DELETE,
  COMPONENTS_CREATE,
  COMPONENTS_READ,
  COMPONENTS_UPDATE,
  COMPONENTS_DELETE,
  COMMENTS_CREATE,
  COMMENTS_READ,
  COMMENTS_UPDATE,
  COMMENTS_DELETE,
  AUDIT_LOGS_READ,
  API_KEYS_CREATE,
  API_KEYS_READ,
  API_KEYS_UPDATE,
  API_KEYS_DELETE,
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
    CONTENT_REVIEW,
    CONTENT_TYPES_READ,
    COMPONENTS_READ,
    COMMENTS_CREATE,
    COMMENTS_READ,
    COMMENTS_UPDATE,
    COMMENTS_DELETE,
    UPLOADS_CREATE,
    UPLOADS_READ,
    UPLOADS_UPDATE,
  ],
  manager: [
    CONTENT_CREATE,
    CONTENT_READ,
    CONTENT_UPDATE,
    CONTENT_DELETE,
    CONTENT_PUBLISH,
    CONTENT_REVIEW,
    CONTENT_PREVIEW,
    CONTENT_TYPES_READ,
    USERS_CREATE,
    USERS_READ,
    USERS_UPDATE,
    ROLES_READ,
    COMMENTS_CREATE,
    COMMENTS_READ,
    COMMENTS_UPDATE,
    COMMENTS_DELETE,
    UPLOADS_CREATE,
    UPLOADS_READ,
    UPLOADS_UPDATE,
    UPLOADS_DELETE,
    COMPONENTS_READ,
    AUDIT_LOGS_READ,
  ],
  reviewer: [
    CONTENT_CREATE,
    CONTENT_READ,
    CONTENT_UPDATE,
    CONTENT_DELETE,
    CONTENT_REVIEW,
    CONTENT_TYPES_READ,
    COMPONENTS_READ,
    COMMENTS_CREATE,
    COMMENTS_READ,
    COMMENTS_UPDATE,
    UPLOADS_CREATE,
    UPLOADS_READ,
    UPLOADS_UPDATE,
  ],
};
