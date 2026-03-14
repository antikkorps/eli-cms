<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false });

const { hasPermission } = useAuth();
const { t } = useI18n();
const router = useRouter();
const { items: contentTypeItems } = useContentTypes();

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const groups = computed(() => {
  if (!mounted.value) return [];

  const navItems: Array<{ id: string; label: string; icon: string; to: string }> = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'i-lucide-layout-dashboard', to: '/admin' },
  ];

  if (hasPermission('content-types:read') || hasPermission('content-types:create')) {
    navItems.push({
      id: 'content-types',
      label: t('nav.contentTypes'),
      icon: 'i-lucide-blocks',
      to: '/admin/content-types',
    });
  }
  if (hasPermission('content:read')) {
    navItems.push({ id: 'contents', label: t('nav.contents'), icon: 'i-lucide-file-text', to: '/admin/contents' });
  }
  if (hasPermission('content:create')) {
    navItems.push({ id: 'new-content', label: t('contents.create'), icon: 'i-lucide-plus', to: '/admin/contents/new' });
  }
  if (hasPermission('uploads:read')) {
    navItems.push({ id: 'uploads', label: t('nav.uploads'), icon: 'i-lucide-upload', to: '/admin/uploads' });
  }
  if (hasPermission('users:read') || hasPermission('users:delete')) {
    navItems.push({ id: 'users', label: t('nav.users'), icon: 'i-lucide-users', to: '/admin/users' });
  }
  if (hasPermission('roles:read')) {
    navItems.push({ id: 'roles', label: t('nav.roles'), icon: 'i-lucide-shield', to: '/admin/roles' });
  }
  if (hasPermission('webhooks:read') || hasPermission('webhooks:create')) {
    navItems.push({ id: 'webhooks', label: t('nav.webhooks'), icon: 'i-lucide-webhook', to: '/admin/webhooks' });
  }
  if (hasPermission('settings:read') || hasPermission('settings:update')) {
    navItems.push({ id: 'settings', label: t('nav.settings'), icon: 'i-lucide-settings', to: '/admin/settings' });
  }
  if (hasPermission('components:read') || hasPermission('components:create')) {
    navItems.push({
      id: 'components',
      label: t('nav.components'),
      icon: 'i-lucide-component',
      to: '/admin/components',
    });
  }
  if (hasPermission('audit-logs:read')) {
    navItems.push({
      id: 'audit-logs',
      label: t('nav.auditLogs'),
      icon: 'i-lucide-scroll-text',
      to: '/admin/audit-logs',
    });
  }
  if (hasPermission('api-keys:read') || hasPermission('api-keys:create')) {
    navItems.push({ id: 'api-keys', label: t('nav.apiKeys'), icon: 'i-lucide-key', to: '/admin/api-keys' });
  }

  const groups = [
    {
      id: 'navigation',
      label: t('commandPalette.navigation'),
      items: navItems,
    },
  ];

  if (hasPermission('content:read') && contentTypeItems.value.length > 0) {
    groups.push({
      id: 'content-types',
      label: t('nav.content'),
      items: contentTypeItems.value.map((ct) => ({
        id: `ct-${ct.slug}`,
        label: ct.name,
        icon: 'i-lucide-file-text',
        to: `/admin/contents?type=${ct.slug}`,
      })),
    });
  }

  return groups;
});

function onSelect(item: Record<string, unknown>) {
  const to = item.to as string | undefined;
  if (to) {
    router.push(to);
    open.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCommandPalette
        :groups="groups"
        :placeholder="t('commandPalette.placeholder')"
        :close="true"
        @update:open="open = $event"
        @update:model-value="onSelect"
      />
    </template>
  </UModal>
</template>
