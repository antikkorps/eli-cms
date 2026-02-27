<script setup lang="ts">
const props = defineProps<{ disabled?: boolean }>();
const model = defineModel<string[]>({ required: true });

const ALL_ACTIONS = ['create', 'read', 'update', 'delete', 'publish'] as const;

const PERMISSION_GROUPS = [
  { key: 'content', icon: 'i-lucide-file-text', actions: ['create', 'read', 'update', 'delete', 'publish'] },
  { key: 'content-types', icon: 'i-lucide-blocks', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'users', icon: 'i-lucide-users', actions: ['read', 'delete'] },
  { key: 'uploads', icon: 'i-lucide-upload', actions: ['create', 'read', 'delete'] },
  { key: 'roles', icon: 'i-lucide-shield', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'webhooks', icon: 'i-lucide-webhook', actions: ['create', 'read', 'update', 'delete'] },
  { key: 'settings', icon: 'i-lucide-settings', actions: ['read', 'update'] },
  { key: 'audit-logs', icon: 'i-lucide-scroll-text', actions: ['read'] },
  { key: 'api-keys', icon: 'i-lucide-key', actions: ['create', 'read', 'update', 'delete'] },
] as const;

function permKey(group: string, action: string) {
  return `${group}:${action}`;
}

function isChecked(perm: string) {
  return model.value.includes(perm);
}

function toggle(perm: string) {
  if (isChecked(perm)) {
    model.value = model.value.filter((p) => p !== perm);
  } else {
    model.value = [...model.value, perm];
  }
}

function hasAction(group: (typeof PERMISSION_GROUPS)[number], action: string) {
  return (group.actions as readonly string[]).includes(action);
}

function isGroupAllChecked(group: (typeof PERMISSION_GROUPS)[number]) {
  return group.actions.every((a) => model.value.includes(permKey(group.key, a)));
}

function isGroupPartial(group: (typeof PERMISSION_GROUPS)[number]) {
  const some = group.actions.some((a) => model.value.includes(permKey(group.key, a)));
  return some && !isGroupAllChecked(group);
}

function toggleGroup(group: (typeof PERMISSION_GROUPS)[number]) {
  const perms = group.actions.map((a) => permKey(group.key, a));
  if (isGroupAllChecked(group)) {
    model.value = model.value.filter((p) => !perms.includes(p));
  } else {
    const toAdd = perms.filter((p) => !model.value.includes(p));
    model.value = [...model.value, ...toAdd];
  }
}

function isColumnAllChecked(action: string) {
  return PERMISSION_GROUPS.filter((g) => hasAction(g, action)).every((g) =>
    model.value.includes(permKey(g.key, action)),
  );
}

function isColumnPartial(action: string) {
  const groups = PERMISSION_GROUPS.filter((g) => hasAction(g, action));
  const some = groups.some((g) => model.value.includes(permKey(g.key, action)));
  return some && !isColumnAllChecked(action);
}

function toggleColumn(action: string) {
  const groups = PERMISSION_GROUPS.filter((g) => hasAction(g, action));
  const perms = groups.map((g) => permKey(g.key, action));
  if (isColumnAllChecked(action)) {
    model.value = model.value.filter((p) => !perms.includes(p));
  } else {
    const toAdd = perms.filter((p) => !model.value.includes(p));
    model.value = [...model.value, ...toAdd];
  }
}

function selectAll() {
  model.value = PERMISSION_GROUPS.flatMap((g) => g.actions.map((a) => permKey(g.key, a)));
}

function selectNone() {
  model.value = [];
}

const totalCount = PERMISSION_GROUPS.reduce((sum, g) => sum + g.actions.length, 0);
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted"> {{ model.length }} / {{ totalCount }} {{ $t('permissions.selected') }} </span>
      <div v-if="!props.disabled" class="flex gap-2">
        <UButton variant="ghost" size="xs" @click="selectAll">{{ $t('permissions.selectAll') }}</UButton>
        <UButton variant="ghost" size="xs" @click="selectNone">{{ $t('permissions.selectNone') }}</UButton>
      </div>
    </div>

    <!-- Desktop: matrix table -->
    <div class="hidden sm:block rounded-lg border border-default overflow-x-auto mb-4">
      <table class="w-full text-sm border-collapse">
        <thead class="sticky top-0 z-10">
          <tr class="bg-elevated">
            <th
              class="sticky left-0 z-20 bg-elevated text-left pl-3 pr-2 py-2.5 font-medium text-muted border-b border-default min-w-38"
            >
              {{ $t('permissions.groups.resource') }}
            </th>
            <th v-for="action in ALL_ACTIONS" :key="action" class="px-2 py-2.5 border-b border-default min-w-17">
              <label class="flex flex-col items-center gap-1 select-none" :class="props.disabled ? 'cursor-default' : 'cursor-pointer'">
                <span class="text-xs font-medium text-muted">{{ $t(`permissions.actions.${action}`) }}</span>
                <UCheckbox
                  :model-value="isColumnAllChecked(action)"
                  :indeterminate="isColumnPartial(action)"
                  :disabled="props.disabled"
                  @update:model-value="toggleColumn(action)"
                />
              </label>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(group, rowIdx) in PERMISSION_GROUPS"
            :key="group.key"
            class="hover:bg-elevated/40 transition-colors"
            :class="{ 'border-b border-default': rowIdx < PERMISSION_GROUPS.length - 1 }"
          >
            <td class="sticky left-0 z-5 bg-inherit pl-3 pr-2 py-2">
              <label class="flex items-center gap-2 select-none" :class="props.disabled ? 'cursor-default' : 'cursor-pointer'">
                <UCheckbox
                  :model-value="isGroupAllChecked(group)"
                  :indeterminate="isGroupPartial(group)"
                  :disabled="props.disabled"
                  @update:model-value="toggleGroup(group)"
                />
                <UIcon :name="group.icon" class="size-4 text-muted shrink-0" />
                <span class="font-medium text-sm whitespace-nowrap">{{ $t(`permissions.groups.${group.key}`) }}</span>
              </label>
            </td>
            <td v-for="action in ALL_ACTIONS" :key="action" class="px-2 py-2">
              <div class="flex items-center justify-center">
                <UCheckbox
                  v-if="hasAction(group, action)"
                  :model-value="isChecked(permKey(group.key, action))"
                  :disabled="props.disabled"
                  @update:model-value="toggle(permKey(group.key, action))"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile: stacked cards -->
    <div class="sm:hidden max-h-100 overflow-y-auto space-y-2">
      <div v-for="group in PERMISSION_GROUPS" :key="group.key" class="rounded-lg border border-default p-3 space-y-2">
        <label class="flex items-center gap-2 select-none" :class="props.disabled ? 'cursor-default' : 'cursor-pointer'">
          <UCheckbox
            :model-value="isGroupAllChecked(group)"
            :indeterminate="isGroupPartial(group)"
            :disabled="props.disabled"
            @update:model-value="toggleGroup(group)"
          />
          <UIcon :name="group.icon" class="size-4 text-muted shrink-0" />
          <span class="text-sm font-medium">{{ $t(`permissions.groups.${group.key}`) }}</span>
        </label>
        <div class="flex flex-wrap gap-x-4 gap-y-1 pl-7">
          <label
            v-for="action in group.actions"
            :key="action"
            class="flex items-center gap-1.5 select-none"
            :class="props.disabled ? 'cursor-default' : 'cursor-pointer'"
          >
            <UCheckbox
              :model-value="isChecked(permKey(group.key, action))"
              :disabled="props.disabled"
              @update:model-value="toggle(permKey(group.key, action))"
            />
            <span class="text-sm text-muted">{{ $t(`permissions.actions.${action}`) }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
