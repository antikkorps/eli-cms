import { describe, it, expect } from 'vitest';
import { WorkflowService } from './workflow.service.js';

const ALL = ['content:create', 'content:read', 'content:update', 'content:delete', 'content:publish', 'content:review'];

describe('WorkflowService', () => {
  describe('validateTransition', () => {
    it('allows draft → in-review with content:update', () => {
      expect(() => WorkflowService.validateTransition('draft', 'in-review', ['content:update'])).not.toThrow();
    });

    it('allows in-review → approved with content:review', () => {
      expect(() => WorkflowService.validateTransition('in-review', 'approved', ['content:review'])).not.toThrow();
    });

    it('allows in-review → draft (rejection) with content:review', () => {
      expect(() => WorkflowService.validateTransition('in-review', 'draft', ['content:review'])).not.toThrow();
    });

    it('allows approved → published with content:publish', () => {
      expect(() => WorkflowService.validateTransition('approved', 'published', ['content:publish'])).not.toThrow();
    });

    it('allows approved → scheduled with content:publish', () => {
      expect(() => WorkflowService.validateTransition('approved', 'scheduled', ['content:publish'])).not.toThrow();
    });

    it('allows published → draft with content:publish', () => {
      expect(() => WorkflowService.validateTransition('published', 'draft', ['content:publish'])).not.toThrow();
    });

    it('allows no-op (same status)', () => {
      expect(() => WorkflowService.validateTransition('draft', 'draft', [])).not.toThrow();
    });

    it('throws for invalid transition draft → published', () => {
      expect(() => WorkflowService.validateTransition('draft', 'published', ALL)).toThrow('Invalid transition');
    });

    it('throws for missing permission', () => {
      expect(() => WorkflowService.validateTransition('draft', 'in-review', [])).toThrow('Missing permission');
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns in-review for draft with content:update', () => {
      const result = WorkflowService.getAvailableTransitions('draft', ['content:update']);
      expect(result).toEqual(['in-review']);
    });

    it('returns approved + draft for in-review with content:review', () => {
      const result = WorkflowService.getAvailableTransitions('in-review', ['content:review']);
      expect(result).toContain('approved');
      expect(result).toContain('draft');
    });

    it('returns empty for draft without content:update', () => {
      const result = WorkflowService.getAvailableTransitions('draft', ['content:read']);
      expect(result).toEqual([]);
    });

    it('returns all transitions for approved with content:publish', () => {
      const result = WorkflowService.getAvailableTransitions('approved', ['content:publish']);
      expect(result).toContain('published');
      expect(result).toContain('scheduled');
      expect(result).toContain('draft');
    });
  });
});
