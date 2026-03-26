<script setup lang="ts">
const props = defineProps<{ body: string }>();

const rendered = computed(() => {
  // Escape HTML, then highlight @mentions
  const escaped = props.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Match @Name (2+ word chars, optionally followed by space + more word chars)
  return escaped.replace(
    /@(\w[\w\s]*?\w)(?=\s|$|[.,!?;:])/g,
    '<span class="text-(--ui-primary) font-medium">@$1</span>',
  );
});
</script>

<template>
  <p class="text-sm mt-1 whitespace-pre-wrap break-words" v-html="rendered" />
</template>
