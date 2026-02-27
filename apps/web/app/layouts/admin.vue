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
    <UDashboardSidebar mode="slideover" collapsible :toggle="false">
      <template #header>
        <div class="flex items-center gap-2.5">
          <div class="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-white text-sm">
            E
          </div>
          <span class="font-semibold text-lg">{{ $t('common.appName') }}</span>
        </div>
      </template>

      <UNavigationMenu :items="navigation" orientation="vertical" />

      <template #footer>
        <SidebarUserMenu />
      </template>
    </UDashboardSidebar>

    <div class="flex flex-col flex-1 min-w-0">
      <UDashboardNavbar class="lg:hidden">
        <template #left>
          <UDashboardSidebarToggle />
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
