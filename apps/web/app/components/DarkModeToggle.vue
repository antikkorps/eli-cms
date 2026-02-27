<script setup lang="ts">
const colorMode = useColorMode();

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

function toggle() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

const icon = computed(() =>
  colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
);
</script>

<template>
  <UButton
    v-if="mounted"
    size="xs"
    variant="ghost"
    color="neutral"
    :icon="icon"
    @click="toggle"
  />
  <UButton v-else size="xs" variant="ghost" color="neutral" icon="i-lucide-moon" />
</template>
