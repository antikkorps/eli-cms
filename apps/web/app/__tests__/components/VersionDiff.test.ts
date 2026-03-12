import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import VersionDiff from '~/components/VersionDiff.vue';

const stubs = {
  UBadge: {
    template: '<span class="badge"><slot /></span>',
    props: ['color', 'variant', 'size'],
  },
};

describe('VersionDiff', () => {
  const fields = [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'body', label: 'Body', type: 'richtext' },
    { name: 'count', label: 'Count', type: 'number' },
  ];

  it('renders diff title with version number', () => {
    const wrapper = mount(VersionDiff, {
      props: {
        current: { title: 'Hello', body: '<p>World</p>', count: 5 },
        version: { title: 'Hello', body: '<p>World</p>', count: 5 },
        versionNumber: 3,
        fields,
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('contents.diffTitle');
    expect(wrapper.text()).toContain('contents.diffVersion');
  });

  it('shows "no changes" when current and version are identical', () => {
    const wrapper = mount(VersionDiff, {
      props: {
        current: { title: 'Same', body: 'Same', count: 1 },
        version: { title: 'Same', body: 'Same', count: 1 },
        versionNumber: 1,
        fields,
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('contents.diffNoChanges');
  });

  it('detects changed fields', () => {
    const wrapper = mount(VersionDiff, {
      props: {
        current: { title: 'New Title', body: '<p>Same</p>', count: 10 },
        version: { title: 'Old Title', body: '<p>Same</p>', count: 5 },
        versionNumber: 2,
        fields,
      },
      global: { stubs },
    });

    const text = wrapper.text();
    // Changed badge should appear for title and count
    expect(text).toContain('changed');
    // Should show both old and new values
    expect(text).toContain('Old Title');
    expect(text).toContain('New Title');
  });

  it('handles null/undefined values gracefully', () => {
    const wrapper = mount(VersionDiff, {
      props: {
        current: { title: 'Hello', body: null, count: undefined },
        version: { title: 'Hello', body: null, count: undefined },
        versionNumber: 1,
        fields,
      },
      global: { stubs },
    });

    // Should not throw, should show "(empty)" for null/undefined
    expect(wrapper.text()).toContain('(empty)');
  });

  it('renders richtext fields as HTML', () => {
    const wrapper = mount(VersionDiff, {
      props: {
        current: { title: 'T', body: '<p>Current</p>', count: 1 },
        version: { title: 'T', body: '<p>Old</p>', count: 1 },
        versionNumber: 1,
        fields,
      },
      global: { stubs },
    });

    // Richtext changed field should use v-html (rendered as actual HTML)
    const richtextDivs = wrapper.findAll('.diff-richtext');
    expect(richtextDivs.length).toBeGreaterThan(0);
  });

  it('formats objects as JSON', () => {
    const customFields = [{ name: 'meta', label: 'Meta', type: 'json' }];
    const wrapper = mount(VersionDiff, {
      props: {
        current: { meta: { key: 'new' } },
        version: { meta: { key: 'old' } },
        versionNumber: 1,
        fields: customFields,
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('"key": "new"');
    expect(wrapper.text()).toContain('"key": "old"');
  });
});
