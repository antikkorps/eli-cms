<script setup lang="ts">
const { hasPermission } = useAuth();
const { t } = useI18n();
const router = useRouter();
const { items: contentTypeItems, fetch: fetchContentTypes } = useContentTypes();
const { count: trashCount, fetch: fetchTrashCount } = useTrashCount();
const { tree: folderTree, fetch: fetchFolders } = useMediaFolders();

const MAX_SIDEBAR_TYPES = 7;
const MAX_SIDEBAR_FOLDERS = 7;

// Command palette
const commandPaletteOpen = ref(false);

defineShortcuts({
  meta_k: {
    handler: () => {
      commandPaletteOpen.value = !commandPaletteOpen.value;
    },
  },
  meta_n: {
    handler: () => {
      router.push('/admin/contents/new');
    },
  },
});

// Defer permission-based filtering to client to avoid SSR hydration mismatch
// (server doesn't have auth state → fewer items → mismatch with client)
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
  if (hasPermission('content:read')) {
    fetchContentTypes();
    fetchTrashCount();
  }
  if (hasPermission('uploads:read')) {
    fetchFolders();
  }
});

const navigation = computed(() => {
  const items: Array<Record<string, unknown>> = [
    { label: t('nav.dashboard'), icon: 'i-lucide-layout-dashboard', to: '/admin' },
  ];

  if (!mounted.value) return items;

  if (hasPermission('content:read')) {
    const children: Array<Record<string, unknown>> = [];

    if (hasPermission('content:create')) {
      children.push({
        label: t('nav.newContent'),
        icon: 'i-lucide-plus',
        to: '/admin/contents/new',
      });
    }

    children.push({ label: t('nav.allContents'), to: '/admin/contents' });

    const types = contentTypeItems.value;
    const visibleTypes = types.slice(0, MAX_SIDEBAR_TYPES);

    for (const ct of visibleTypes) {
      children.push({
        label: ct.name,
        icon: ct.isSingleton ? 'i-lucide-file-cog' : undefined,
        to: `/admin/contents?type=${ct.slug}`,
        badge: ct.isSingleton ? undefined : ct.contentCount != null ? String(ct.contentCount) : undefined,
      });
    }

    if (types.length > MAX_SIDEBAR_TYPES) {
      children.push({ label: t('nav.seeAllTypes'), to: '/admin/content-types' });
    }

    children.push({
      label: t('nav.trash'),
      to: '/admin/contents/trash',
      badge: trashCount.value > 0 ? String(trashCount.value) : undefined,
    });

    items.push({
      label: t('nav.content'),
      icon: 'i-lucide-file-text',
      children,
    });
  }
  if (hasPermission('uploads:read')) {
    const folderChildren: Array<Record<string, unknown>> = [];

    if (hasPermission('uploads:create')) {
      folderChildren.push({
        label: t('nav.uploadFile'),
        icon: 'i-lucide-plus',
        to: '/admin/uploads?action=upload',
      });
    }

    folderChildren.push({ label: t('mediaFolders.allFiles'), to: '/admin/uploads' });

    const folders = folderTree.value;
    // Flatten top-level folders for sidebar
    const flatFolders: Array<{ id: string; name: string }> = [];
    for (const f of folders) {
      flatFolders.push({ id: f.id, name: f.name });
    }
    const visibleFolders = flatFolders.slice(0, MAX_SIDEBAR_FOLDERS);

    for (const folder of visibleFolders) {
      folderChildren.push({
        label: folder.name,
        to: `/admin/uploads?folder=${folder.id}`,
      });
    }

    if (flatFolders.length > MAX_SIDEBAR_FOLDERS) {
      folderChildren.push({ label: t('nav.seeAllFolders'), to: '/admin/media-folders' });
    }

    if (hasPermission('uploads:create')) {
      folderChildren.push({
        label: t('mediaFolders.manageFolders'),
        to: '/admin/media-folders',
      });
    }

    items.push({
      label: t('nav.uploads'),
      icon: 'i-lucide-image',
      children: folderChildren,
    });
  }
  // Structure group (Content Types + Components)
  const structureChildren: Array<Record<string, unknown>> = [];
  if (hasPermission('content-types:read') || hasPermission('content-types:create')) {
    structureChildren.push({ label: t('nav.contentTypes'), icon: 'i-lucide-blocks', to: '/admin/content-types' });
  }
  if (hasPermission('components:read') || hasPermission('components:create')) {
    structureChildren.push({ label: t('nav.components'), icon: 'i-lucide-component', to: '/admin/components' });
  }
  if (hasPermission('content-types:read') || hasPermission('content-types:create')) {
    structureChildren.push({
      label: t('nav.contentTypeTemplates'),
      icon: 'i-lucide-layout-template',
      to: '/admin/content-type-templates',
    });
  }
  if (structureChildren.length > 0) {
    items.push({
      label: t('nav.structure'),
      icon: 'i-lucide-puzzle',
      children: structureChildren,
    });
  }

  if (
    hasPermission('users:read') ||
    hasPermission('users:create') ||
    hasPermission('users:update') ||
    hasPermission('users:delete')
  ) {
    items.push({ label: t('nav.users'), icon: 'i-lucide-users', to: '/admin/users' });
  }
  if (hasPermission('roles:read')) {
    items.push({ label: t('nav.roles'), icon: 'i-lucide-shield', to: '/admin/roles' });
  }
  if (hasPermission('webhooks:read') || hasPermission('webhooks:create')) {
    items.push({ label: t('nav.webhooks'), icon: 'i-lucide-webhook', to: '/admin/webhooks' });
  }
  if (hasPermission('settings:read') || hasPermission('settings:update')) {
    items.push({ label: t('nav.settings'), icon: 'i-lucide-settings', to: '/admin/settings' });
  }
  if (hasPermission('audit-logs:read')) {
    items.push({ label: t('nav.auditLogs'), icon: 'i-lucide-scroll-text', to: '/admin/audit-logs' });
  }
  if (hasPermission('api-keys:read') || hasPermission('api-keys:create')) {
    items.push({ label: t('nav.apiKeys'), icon: 'i-lucide-key', to: '/admin/api-keys' });
  }

  return items;
});
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      toggle-side="right"
      :default-size="20"
      :ui="{ root: 'transition-[width] duration-200 ease-in-out' }"
    >
      <template #header="{ collapsed }">
        <UButton
          to="/admin"
          variant="ghost"
          :class="collapsed ? 'w-full justify-center' : 'w-full justify-start gap-2.5'"
        >
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

    <div class="flex flex-col flex-1 min-w-0 min-h-0 h-dvh">
      <UDashboardNavbar :toggle="{ class: 'lg:hidden' }">
        <template #leading>
          <UDashboardSidebarCollapse class="hidden lg:flex" />
        </template>
        <template #right>
          <NotificationBell />
          <DarkModeToggle />
          <LocaleSwitcher />
        </template>
      </UDashboardNavbar>

      <UDashboardPanel class="flex-1 min-h-0 overflow-y-auto">
        <slot />
      </UDashboardPanel>
    </div>

    <CommandPalette v-model:open="commandPaletteOpen" />
  </UDashboardGroup>
</template>
