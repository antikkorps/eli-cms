<script setup lang="ts">
const { hasPermission } = useAuth();
const { t } = useI18n();

const navigation = computed(() => {
  const items: Array<{ label: string; icon: string; to: string }> = [
    { label: t('nav.dashboard'), icon: 'i-lucide-layout-dashboard', to: '/admin' },
  ];

  if (hasPermission('content-types:read') || hasPermission('content-types:manage')) {
    items.push({ label: t('nav.contentTypes'), icon: 'i-lucide-blocks', to: '/admin/content-types' });
  }
  if (hasPermission('content:read')) {
    items.push({ label: t('nav.contents'), icon: 'i-lucide-file-text', to: '/admin/contents' });
  }
  if (hasPermission('uploads:read')) {
    items.push({ label: t('nav.uploads'), icon: 'i-lucide-upload', to: '/admin/uploads' });
  }
  if (hasPermission('users:read') || hasPermission('users:manage')) {
    items.push({ label: t('nav.users'), icon: 'i-lucide-users', to: '/admin/users' });
  }
  if (hasPermission('roles:read') || hasPermission('roles:manage')) {
    items.push({ label: t('nav.roles'), icon: 'i-lucide-shield', to: '/admin/roles' });
  }
  if (hasPermission('webhooks:manage')) {
    items.push({ label: t('nav.webhooks'), icon: 'i-lucide-webhook', to: '/admin/webhooks' });
  }
  if (hasPermission('settings:manage')) {
    items.push({ label: t('nav.settings'), icon: 'i-lucide-settings', to: '/admin/settings' });
  }
  if (hasPermission('audit-logs:read')) {
    items.push({ label: t('nav.auditLogs'), icon: 'i-lucide-scroll-text', to: '/admin/audit-logs' });
  }
  if (hasPermission('api-keys:manage')) {
    items.push({ label: t('nav.apiKeys'), icon: 'i-lucide-key', to: '/admin/api-keys' });
  }

  return items;
});
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible toggle-side="right" :default-size="20" :ui="{ root: 'transition-[width] duration-200 ease-in-out' }">
      <template #header="{ collapsed }">
        <UButton to="/admin" variant="ghost" :class="collapsed ? 'w-full justify-center' : 'w-full justify-start gap-2.5'">
          <div
            class="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-white text-sm shrink-0"
          >
            E
          </div>
          <span v-if="!collapsed" class="font-semibold text-lg">{{ $t('common.appName') }}</span>
        </UButton>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :items="navigation" orientation="vertical" :collapsed="collapsed" />
      </template>

      <template #footer="{ collapsed }">
        <SidebarUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <div class="flex flex-col flex-1 min-w-0">
      <UDashboardNavbar :toggle="{ class: 'lg:hidden' }">
        <template #leading>
          <UDashboardSidebarCollapse class="hidden lg:flex" />
        </template>
        <template #right>
          <LocaleSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardPanel>
        <slot />
      </UDashboardPanel>
    </div>
  </UDashboardGroup>
</template>
