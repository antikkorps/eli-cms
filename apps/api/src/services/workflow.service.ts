import { AppError } from '../utils/app-error.js';
import { CONTENT_UPDATE, CONTENT_REVIEW, CONTENT_PUBLISH } from '@eli-cms/shared';
import type { ContentStatus } from '@eli-cms/shared';

interface Transition {
  to: ContentStatus;
  permission: string;
}

/**
 * Map of allowed status transitions.
 * Each key is the current status; value is an array of valid transitions.
 */
const TRANSITION_MAP: Record<string, Transition[]> = {
  draft: [{ to: 'in-review', permission: CONTENT_UPDATE }],
  'in-review': [
    { to: 'approved', permission: CONTENT_REVIEW },
    { to: 'draft', permission: CONTENT_REVIEW },
  ],
  approved: [
    { to: 'published', permission: CONTENT_PUBLISH },
    { to: 'scheduled', permission: CONTENT_PUBLISH },
    { to: 'draft', permission: CONTENT_PUBLISH },
  ],
  scheduled: [
    { to: 'published', permission: CONTENT_PUBLISH },
    { to: 'draft', permission: CONTENT_PUBLISH },
  ],
  published: [{ to: 'draft', permission: CONTENT_PUBLISH }],
};

export class WorkflowService {
  /**
   * Validates a status transition. Throws AppError if invalid.
   * Returns the required permission for the transition.
   */
  static validateTransition(from: string, to: string, userPermissions: string[]): void {
    if (from === to) return; // No-op transition is always allowed

    const allowed = TRANSITION_MAP[from];
    if (!allowed) {
      throw new AppError(400, `Unknown status: ${from}`);
    }

    const transition = allowed.find((t) => t.to === to);
    if (!transition) {
      throw new AppError(400, `Invalid transition from "${from}" to "${to}"`);
    }

    if (!userPermissions.includes(transition.permission)) {
      throw new AppError(403, `Missing permission "${transition.permission}" for this status transition`);
    }
  }

  /**
   * Returns valid next statuses for a given status and set of permissions.
   */
  static getAvailableTransitions(from: string, userPermissions: string[]): ContentStatus[] {
    const allowed = TRANSITION_MAP[from] ?? [];
    return allowed.filter((t) => userPermissions.includes(t.permission)).map((t) => t.to);
  }
}
