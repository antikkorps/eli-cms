import { describe, it, expect } from 'vitest';
import { useContentValidation } from '~/composables/useContentValidation.js';
import type { FieldDefinition } from '@eli-cms/shared';

describe('useContentValidation', () => {
  const textField: FieldDefinition = {
    name: 'title',
    type: 'text',
    required: true,
    label: 'Title',
  };

  const numberField: FieldDefinition = {
    name: 'age',
    type: 'number',
    required: false,
    label: 'Age',
  };

  const emailField: FieldDefinition = {
    name: 'email',
    type: 'email',
    required: true,
    label: 'Email',
  };

  it('validates valid data successfully', () => {
    const { validate } = useContentValidation();
    const result = validate([textField], { title: 'Hello' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns errors for missing required fields', () => {
    const { validate, errors } = useContentValidation();
    const result = validate([textField], {});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('title');
    expect(errors.value).toHaveProperty('title');
  });

  it('validates multiple fields', () => {
    const { validate } = useContentValidation();
    const result = validate([textField, numberField, emailField], {
      title: 'Test',
      age: 25,
      email: 'test@example.com',
    });
    expect(result.valid).toBe(true);
  });

  it('reports multiple errors', () => {
    const { validate } = useContentValidation();
    const result = validate([textField, emailField], {});
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(1);
  });

  it('clearError removes a specific error', () => {
    const { validate, clearError, errors } = useContentValidation();
    validate([textField, emailField], {});
    expect(errors.value).toHaveProperty('title');
    clearError('title');
    expect(errors.value).not.toHaveProperty('title');
  });

  it('clearErrors removes all errors', () => {
    const { validate, clearErrors, errors } = useContentValidation();
    validate([textField, emailField], {});
    expect(Object.keys(errors.value).length).toBeGreaterThan(0);
    clearErrors();
    expect(errors.value).toEqual({});
  });

  it('allows optional fields to be omitted', () => {
    const { validate } = useContentValidation();
    const result = validate([numberField], {});
    expect(result.valid).toBe(true);
  });

  it('rejects invalid email', () => {
    const { validate } = useContentValidation();
    const result = validate([emailField], { email: 'not-an-email' });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('email');
  });
});
