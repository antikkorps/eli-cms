<script setup lang="ts">
const modelValue = defineModel<string>({ default: '' });
const mentionedUserIds = defineModel<string[]>('mentionedUserIds', { default: () => [] });

defineProps<{
  placeholder?: string;
  rows?: number;
}>();

const { apiFetch } = useApi();
const { userAvatarUrl } = useAvatar();

interface MentionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarStyle: string | null;
  avatarSeed: string | null;
}

const suggestions = ref<MentionUser[]>([]);
const showDropdown = ref(false);
const selectedIndex = ref(0);
const mentionQuery = ref('');
const mentionStartPos = ref(-1);
const textareaRef = ref<{ textarea: HTMLTextAreaElement } | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function displayName(user: MentionUser): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  return user.email;
}

async function searchUsers(query: string) {
  if (!query) {
    suggestions.value = [];
    showDropdown.value = false;
    return;
  }
  try {
    const res = await apiFetch<{ success: boolean; data: MentionUser[] }>(
      `/users/mention-search?q=${encodeURIComponent(query)}`,
    );
    suggestions.value = res.data;
    showDropdown.value = res.data.length > 0;
    selectedIndex.value = 0;
  } catch {
    suggestions.value = [];
    showDropdown.value = false;
  }
}

function onInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  const pos = textarea.selectionStart;
  const text = textarea.value;

  // Find @ before cursor
  const beforeCursor = text.substring(0, pos);
  const atIndex = beforeCursor.lastIndexOf('@');

  if (atIndex >= 0 && (atIndex === 0 || /\s/.test(beforeCursor[atIndex - 1]!))) {
    const query = beforeCursor.substring(atIndex + 1);
    if (query.length > 0 && !/\s/.test(query)) {
      mentionQuery.value = query;
      mentionStartPos.value = atIndex;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => searchUsers(query), 300);
      return;
    }
  }

  showDropdown.value = false;
  mentionQuery.value = '';
}

function selectUser(user: MentionUser) {
  const name = displayName(user);
  const text = modelValue.value;
  const before = text.substring(0, mentionStartPos.value);
  const after = text.substring(mentionStartPos.value + mentionQuery.value.length + 1);
  modelValue.value = `${before}@${name} ${after}`;

  if (!mentionedUserIds.value.includes(user.id)) {
    mentionedUserIds.value = [...mentionedUserIds.value, user.id];
  }

  showDropdown.value = false;
  suggestions.value = [];
  mentionQuery.value = '';

  nextTick(() => {
    const textarea = textareaRef.value?.textarea;
    if (textarea) {
      const newPos = mentionStartPos.value + name.length + 2; // @name + space
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
      textarea.focus();
    }
  });
}

function onKeydown(event: KeyboardEvent) {
  if (!showDropdown.value) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, suggestions.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    if (suggestions.value[selectedIndex.value]) {
      event.preventDefault();
      selectUser(suggestions.value[selectedIndex.value]!);
    }
  } else if (event.key === 'Escape') {
    showDropdown.value = false;
  }
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="relative">
    <UTextarea
      ref="textareaRef"
      :model-value="modelValue"
      @update:model-value="modelValue = $event"
      @input="onInput"
      @keydown="onKeydown"
      :placeholder="placeholder"
      :rows="rows ?? 2"
      autoresize
      class="w-full"
    />

    <!-- Mention suggestions dropdown -->
    <div
      v-if="showDropdown && suggestions.length"
      class="absolute z-50 mt-1 w-72 max-h-48 overflow-y-auto rounded-lg border border-(--ui-border) bg-(--ui-bg) shadow-lg"
    >
      <button
        v-for="(user, idx) in suggestions"
        :key="user.id"
        type="button"
        class="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-(--ui-bg-elevated) transition-colors"
        :class="{ 'bg-(--ui-bg-elevated)': idx === selectedIndex }"
        @mousedown.prevent="selectUser(user)"
      >
        <img :src="userAvatarUrl(user)" class="w-6 h-6 rounded-full shrink-0" />
        <div class="min-w-0 flex-1">
          <span class="font-medium truncate block">{{ displayName(user) }}</span>
          <span v-if="user.firstName" class="text-xs text-(--ui-text-muted) truncate block">{{ user.email }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
