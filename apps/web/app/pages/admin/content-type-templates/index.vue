<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { t } = useI18n();
const { hasPermission } = useAuth();
const { apiFetch } = useApi();
const toast = useToast();

const { items: templates, loading, fetch, invalidate } = useContentTypeTemplates();
onMounted(fetch);

const canManage = computed(() => hasPermission('content-types:create'));
const canDelete = computed(() => hasPermission('content-types:delete'));

const deleteOpen = ref(false);
const deleteTarget = ref<{ id: string; name: string; isSystem: boolean } | null>(null);
const deleting = ref(false);

function confirmDelete(tpl: { id: string; name: string; isSystem: boolean }) {
  if (tpl.isSystem) return;
  deleteTarget.value = tpl;
  deleteOpen.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await apiFetch(`/content-type-templates/${deleteTarget.value.id}`, { method: 'DELETE' });
    invalidate();
    await fetch(true);
    deleteOpen.value = false;
    toast.add({ title: t('common.deleted'), color: 'success' });
  } catch (err: unknown) {
    const msg = (err as { data?: { error?: string } })?.data?.error || t('common.error');
    toast.add({ title: msg, color: 'error' });
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('contentTypeTemplates.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('contentTypeTemplates.subtitle') }}</p>
      </div>
      <UButton v-if="canManage" to="/admin/content-type-templates/new" icon="i-lucide-plus">
        {{ $t('contentTypeTemplates.create') }}
      </UButton>
    </div>

    <div v-if="loading && !templates.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 6" :key="i" class="h-32 w-full rounded-lg" />
    </div>

    <div v-else-if="!loading && !templates.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-layout-template" class="size-12 text-muted" />
      <p class="mt-3 text-sm font-medium">{{ $t('contentTypeTemplates.noTemplates') }}</p>
      <p class="text-xs text-muted">{{ $t('contentTypeTemplates.noTemplatesHint') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="tpl in templates"
        :key="tpl.id"
        :to="`/admin/content-type-templates/${tpl.id}`"
        class="group relative flex flex-col gap-3 rounded-lg border border-accented bg-default p-4 hover:border-primary-500 hover:shadow-sm transition"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950">
              <UIcon
                :name="tpl.icon || 'i-lucide-layout-template'"
                class="size-5 text-primary-600 dark:text-primary-400"
              />
            </div>
            <div>
              <p class="font-medium text-sm">{{ tpl.name }}</p>
              <p class="text-xs text-muted font-mono">{{ tpl.slug }}</p>
            </div>
          </div>
          <UBadge v-if="tpl.isSystem" color="neutral" variant="subtle" size="xs">
            {{ $t('contentTypeTemplates.systemBadge') }}
          </UBadge>
        </div>

        <p v-if="tpl.description" class="text-xs text-muted line-clamp-2">{{ tpl.description }}</p>

        <div class="flex items-center justify-between pt-1">
          <UBadge variant="subtle" size="xs"
            >{{ tpl.fields.length }} {{ $t('contentTypeTemplates.fieldsLabel').toLowerCase() }}</UBadge
          >
          <UButton
            v-if="canDelete && !tpl.isSystem"
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            class="opacity-0 group-hover:opacity-100 transition"
            @click.prevent="confirmDelete(tpl)"
          />
        </div>
      </NuxtLink>
    </div>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('contentTypeTemplates.deleteTitle') }}</h3>
          <i18n-t keypath="contentTypeTemplates.deleteConfirm" tag="p" class="text-sm text-muted">
            <template #name>
              <strong>{{ deleteTarget?.name }}</strong>
            </template>
          </i18n-t>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="deleteOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="deleting" @click="handleDelete">{{ $t('common.delete') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
