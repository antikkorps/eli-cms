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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
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
