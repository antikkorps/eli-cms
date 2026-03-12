import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkflowActions from '~/components/WorkflowActions.vue';
import { useAuth } from '~/composables/useAuth.js';

const stubs = {
  UBadge: {
    template: '<span class="badge" :data-color="color"><slot /></span>',
    props: ['color', 'variant', 'size'],
  },
  UButton: {
    template: '<button :data-color="color" @click="$emit(\'click\')"><slot /></button>',
    props: ['color', 'icon', 'size', 'variant'],
    emits: ['click'],
  },
};

function mountWithPerms(status: string, permissions: string[]) {
  // Set up auth user with given permissions
  const auth = useAuth();
  auth.setTokens('tok');
  // @ts-expect-error -- set user for testing
  auth.user.value = {
    id: '1',
    email: 'test@test.com',
    firstName: null,
    lastName: null,
    roleId: 'r1',
    avatarStyle: null,
    avatarSeed: null,
    role: { name: 'Test', slug: 'test', permissions },
    createdAt: '',
    updatedAt: '',
  };

  return mount(WorkflowActions, {
    props: { status },
    global: { stubs },
  });
}

describe('WorkflowActions', () => {
  beforeEach(() => {
    const auth = useAuth();
    auth.clearTokens();
  });

  it('shows draft badge for draft status', () => {
    const wrapper = mountWithPerms('draft', []);
    expect(wrapper.find('.badge').text()).toContain('contents.draft');
  });

  it('shows published badge for published status', () => {
    const wrapper = mountWithPerms('published', []);
    expect(wrapper.find('.badge').text()).toContain('contents.published');
  });

  it('shows submit-for-review button when draft and has content:update', () => {
    const wrapper = mountWithPerms('draft', ['content:update']);
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].text()).toContain('contents.submitForReview');
  });

  it('hides actions without permission', () => {
    const wrapper = mountWithPerms('draft', []);
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(0);
  });

  it('shows approve and reject for in-review with content:review', () => {
    const wrapper = mountWithPerms('in-review', ['content:review']);
    const buttons = wrapper.findAll('button');
    const labels = buttons.map((b) => b.text());
    expect(labels).toContain('contents.approve');
    expect(labels).toContain('contents.reject');
  });

  it('shows publish and schedule for approved with content:publish', () => {
    const wrapper = mountWithPerms('approved', ['content:publish']);
    const buttons = wrapper.findAll('button');
    const labels = buttons.map((b) => b.text());
    expect(labels).toContain('contents.publish');
    expect(labels).toContain('contents.schedule');
    expect(labels).toContain('contents.unpublish');
  });

  it('emits transition event on action click', async () => {
    const wrapper = mountWithPerms('draft', ['content:update']);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('transition')).toBeTruthy();
    expect(wrapper.emitted('transition')![0]).toEqual(['in-review']);
  });

  it('emits schedule event for schedule action', async () => {
    const wrapper = mountWithPerms('approved', ['content:publish']);
    const buttons = wrapper.findAll('button');
    const scheduleBtn = buttons.find((b) => b.text().includes('contents.schedule'));
    expect(scheduleBtn).toBeTruthy();
    await scheduleBtn!.trigger('click');
    expect(wrapper.emitted('schedule')).toBeTruthy();
  });

  it('shows unpublish for published status with content:publish', () => {
    const wrapper = mountWithPerms('published', ['content:publish']);
    const buttons = wrapper.findAll('button');
    const labels = buttons.map((b) => b.text());
    // Published status only shows unpublish (no publish button — that's on scheduled/approved)
    expect(labels).toContain('contents.unpublish');
    expect(buttons.length).toBe(1);
  });

  it('super-admin with wildcard sees all relevant actions', () => {
    const wrapper = mountWithPerms('in-review', ['*']);
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(2); // approve + reject
  });
});
