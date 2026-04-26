import { describe, it, expect } from 'vitest';
import { localizeData, flattenLocalizedData } from './localize.js';
import type { FieldDefinition, I18nConfig } from '@eli-cms/shared';
import { buildContentDataSchema } from '@eli-cms/shared';

const i18n: I18nConfig = { defaultLocale: 'en', locales: ['en', 'fr'] };

const titleField: FieldDefinition = { name: 'title', type: 'text', required: true, label: 'Title', localizable: true };
const slugField: FieldDefinition = { name: 'slug', type: 'text', required: false, label: 'Slug' };
const tagsField: FieldDefinition = {
  name: 'tags',
  type: 'repeatable',
  required: false,
  label: 'Tags',
  subFields: [{ name: 'value', type: 'text', required: true, label: 'Value' }],
};

describe('localizeData', () => {
  it('wraps a legacy primitive into the default-locale object', () => {
    const out = localizeData([titleField], { title: 'Hello' }, i18n);
    expect(out).toEqual({ title: { en: 'Hello' } });
  });

  it('leaves already locale-keyed values alone', () => {
    const out = localizeData([titleField], { title: { en: 'Hello', fr: 'Bonjour' } }, i18n);
    expect(out).toEqual({ title: { en: 'Hello', fr: 'Bonjour' } });
  });

  it('does not wrap non-localizable fields', () => {
    const out = localizeData([slugField], { slug: 'hello' }, i18n);
    expect(out).toEqual({ slug: 'hello' });
  });

  it('replaces null with empty object', () => {
    const out = localizeData([titleField], { title: null }, i18n);
    expect(out).toEqual({ title: {} });
  });

  it('passes through repeatable items without wrapping them', () => {
    const out = localizeData([tagsField], { tags: [{ value: 'a' }, { value: 'b' }] }, i18n);
    expect(out).toEqual({ tags: [{ value: 'a' }, { value: 'b' }] });
  });

  it('handles undefined input gracefully', () => {
    expect(localizeData([titleField], null, i18n)).toEqual({});
    expect(localizeData([titleField], undefined, i18n)).toEqual({});
  });
});

describe('flattenLocalizedData', () => {
  it('returns the requested locale value', () => {
    const out = flattenLocalizedData([titleField], { title: { en: 'Hello', fr: 'Bonjour' } }, i18n, 'fr');
    expect(out.title).toBe('Bonjour');
  });

  it('falls back to default locale when requested is missing', () => {
    const out = flattenLocalizedData([titleField], { title: { en: 'Hello' } }, i18n, 'fr');
    expect(out.title).toBe('Hello');
  });

  it('returns null when both requested and default are missing', () => {
    const out = flattenLocalizedData([titleField], { title: { de: 'Hallo' } }, i18n, 'fr');
    expect(out.title).toBeNull();
  });

  it('leaves non-localizable fields untouched', () => {
    const out = flattenLocalizedData([slugField, titleField], { slug: 'hi', title: { en: 'Hi' } }, i18n, 'en');
    expect(out.slug).toBe('hi');
  });
});

describe('buildContentDataSchema with i18n', () => {
  it('requires the default-locale value when field is required', () => {
    const schema = buildContentDataSchema([titleField], undefined, i18n);
    const result = schema.safeParse({ title: { fr: 'Bonjour' } });
    expect(result.success).toBe(false);
  });

  it('accepts a value with default locale present', () => {
    const schema = buildContentDataSchema([titleField], undefined, i18n);
    const result = schema.safeParse({ title: { en: 'Hello' } });
    expect(result.success).toBe(true);
  });

  it('accepts both locales', () => {
    const schema = buildContentDataSchema([titleField], undefined, i18n);
    const result = schema.safeParse({ title: { en: 'Hello', fr: 'Bonjour' } });
    expect(result.success).toBe(true);
  });

  it('rejects unknown locale keys', () => {
    const schema = buildContentDataSchema([titleField], undefined, i18n);
    const result = schema.safeParse({ title: { en: 'Hello', de: 'Hallo' } });
    expect(result.success).toBe(false);
  });

  it('does not wrap non-localizable fields', () => {
    const schema = buildContentDataSchema([slugField], undefined, i18n);
    const result = schema.safeParse({ slug: 'hi' });
    expect(result.success).toBe(true);
  });

  it('falls back to plain shape when no i18n config is passed (back-compat)', () => {
    const schema = buildContentDataSchema([titleField]);
    const result = schema.safeParse({ title: 'Hello' });
    expect(result.success).toBe(true);
  });
});
