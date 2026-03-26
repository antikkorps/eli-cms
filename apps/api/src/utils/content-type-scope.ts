import { AppError } from './app-error.js';

export function isContentTypeAllowed(
  contentTypeId: string,
  allowedContentTypes: string[] | null | undefined,
  permissions: string[],
): boolean {
  if (permissions.includes('*')) return true;
  if (!allowedContentTypes || allowedContentTypes.length === 0) return true;
  return allowedContentTypes.includes(contentTypeId);
}

export function assertContentTypeAllowed(
  contentTypeId: string,
  allowedContentTypes: string[] | null | undefined,
  permissions: string[],
): void {
  if (!isContentTypeAllowed(contentTypeId, allowedContentTypes, permissions)) {
    throw new AppError(403, 'You do not have access to this content type');
  }
}
