// ─── Roles & Permissions ────────────────────────────────
export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  roleId: string;
  avatarStyle: string | null;
  avatarSeed: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'select' | 'media' | 'richtext' | 'author' | 'repeatable';

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  label: string;
  options?: string[]; // for select type
  multiple?: boolean; // for media type
  accept?: string[]; // MIME filter for media type (e.g. ['image/*', 'application/pdf'])
  subFields?: FieldDefinition[]; // for repeatable type
}

export interface ContentType {
  id: string;
  slug: string;
  name: string;
  fields: FieldDefinition[];
  isSingleton: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentStatus = 'draft' | 'in-review' | 'approved' | 'scheduled' | 'published';

export interface Content {
  id: string;
  contentTypeId: string;
  slug: string | null;
  status: ContentStatus;
  data: Record<string, unknown>;
  publishedAt: Date | null;
  editedBy: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  permissions: string[];
  apiKeyId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Content Relations ──────────────────────────────────
export type RelationType = 'reference' | 'parent' | 'related';

export interface ContentRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  createdAt: Date;
}

export interface PopulatedRelation {
  id: string;
  relationType: RelationType;
  target: Content;
}

// ─── Content Versions ───────────────────────────────────
export interface ContentVersion {
  id: string;
  contentId: string;
  versionNumber: number;
  data: Record<string, unknown>;
  status: string;
  editedBy: string;
  createdAt: Date;
}

// ─── Storage / Media ────────────────────────────────────
export type StorageType = 'local' | 's3';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export interface StorageConfig {
  activeStorage: StorageType;
  s3?: S3Config;
}

export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageType: StorageType;
  createdBy: string;
  createdAt: Date;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  folderId: string | null;
}

export interface MediaFolder {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
}

export interface MediaFolderTree extends MediaFolder {
  children: MediaFolderTree[];
}

// ─── SMTP ───────────────────────────────────────────────
export type SmtpAuthType = 'password' | 'oauth2' | 'none';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  authType: SmtpAuthType;
  user?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  fromName: string;
  fromAddress: string;
}

// ─── Webhooks ───────────────────────────────────────────
export type WebhookEvent =
  | 'content.created'
  | 'content.updated'
  | 'content.deleted'
  | 'content.published'
  | 'content.review-requested'
  | 'content.approved'
  | 'content.rejected'
  | 'content.scheduled'
  | 'content.trashed'
  | 'content.restored'
  | 'content.purged'
  | 'content_type.created'
  | 'content_type.updated'
  | 'content_type.deleted'
  | 'media.uploaded'
  | 'media.deleted';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  responseStatus: number | null;
  attempts: number;
  nextRetryAt: Date | null;
  createdAt: Date;
}

// ─── Audit Logs ─────────────────────────────────────────
export type ActorType = 'user' | 'api_key' | 'system';

export interface AuditLog {
  id: string;
  actorId: string;
  actorType: ActorType;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ─── API Keys ───────────────────────────────────────────
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdBy: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
