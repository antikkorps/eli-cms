export type UserRole = 'admin' | 'editor';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'select';

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  label: string;
  options?: string[]; // for select type
}

export interface ContentType {
  id: string;
  slug: string;
  name: string;
  fields: FieldDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export type ContentStatus = 'draft' | 'published';

export interface Content {
  id: string;
  contentTypeId: string;
  status: ContentStatus;
  data: Record<string, unknown>;
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
  role: UserRole;
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
}
