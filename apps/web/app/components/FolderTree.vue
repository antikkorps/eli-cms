<script setup lang="ts">
interface FolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: FolderNode[];
}

const props = withDefaults(defineProps<{
  folders: FolderNode[];
  selected: string | null;
  depth?: number;
}>(), {
  depth: 0,
});

const emit = defineEmits<{
  select: [id: string | null];
}>();

const expanded = ref<Set<string>>(new Set());

function toggle(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expanded.value = next;
}

function select(id: string | null) {
  emit('select', id);
}
</script>

<template>
  <div>
    <div
      v-for="folder in folders"
      :key="folder.id"
    >
      <button
        class="flex items-center gap-1 w-full text-left px-2 py-1.5 rounded text-sm transition-colors hover:bg-elevated"
        :class="{
          'bg-primary/10 text-primary font-medium': selected === folder.id,
          'text-muted': selected !== folder.id,
        }"
        :style="{ paddingLeft: `${depth * 16 + 8}px` }"
        @click="select(folder.id)"
      >
        <button
          v-if="folder.children.length > 0"
          class="shrink-0 p-0.5 hover:bg-muted rounded"
          @click.stop="toggle(folder.id)"
        >
          <UIcon
            :name="expanded.has(folder.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3.5"
          />
        </button>
        <span v-else class="shrink-0 w-4.5" />
        <UIcon name="i-lucide-folder" class="size-4 shrink-0" />
        <span class="truncate">{{ folder.name }}</span>
      </button>

      <FolderTree
        v-if="folder.children.length > 0 && expanded.has(folder.id)"
        :folders="folder.children"
        :selected="selected"
        :depth="depth + 1"
        @select="select"
      />
    </div>
  </div>
</template>
