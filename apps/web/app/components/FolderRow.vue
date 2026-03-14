<script setup lang="ts">
interface FolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: FolderNode[];
}

const props = defineProps<{
  folder: FolderNode;
  expanded: Set<string>;
  depth: number;
  canCreate: boolean;
  canDelete: boolean;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  create: [parentId: string];
  rename: [folder: FolderNode];
  delete: [folder: FolderNode];
}>();

const isExpanded = computed(() => props.expanded.has(props.folder.id));
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-elevated transition-colors group"
      :style="{ paddingLeft: `${depth * 24 + 12}px` }"
    >
      <!-- Expand/collapse toggle -->
      <button
        v-if="folder.children.length > 0"
        class="shrink-0 p-0.5 rounded hover:bg-muted"
        @click="emit('toggle', folder.id)"
      >
        <UIcon :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 text-muted" />
      </button>
      <span v-else class="shrink-0 w-5" />

      <UIcon name="i-lucide-folder" class="size-4 text-muted shrink-0" />

      <!-- Folder name as link to uploads filtered -->
      <NuxtLink
        :to="`/admin/uploads?folder=${folder.id}`"
        class="flex-1 text-sm font-medium truncate hover:text-primary transition-colors"
      >
        {{ folder.name }}
      </NuxtLink>

      <!-- Actions -->
      <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <UButton
          v-if="canCreate"
          icon="i-lucide-folder-plus"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="emit('create', folder.id)"
        />
        <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="xs" @click="emit('rename', folder)" />
        <UButton
          v-if="canDelete"
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="xs"
          @click="emit('delete', folder)"
        />
      </div>
    </div>

    <!-- Children (recursive) -->
    <template v-if="isExpanded && folder.children.length > 0">
      <FolderRow
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :expanded="expanded"
        :depth="depth + 1"
        :can-create="canCreate"
        :can-delete="canDelete"
        @toggle="emit('toggle', $event)"
        @create="emit('create', $event)"
        @rename="emit('rename', $event)"
        @delete="emit('delete', $event)"
      />
    </template>
  </div>
</template>
