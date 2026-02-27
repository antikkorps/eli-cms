<script setup lang="ts">
const { locale, setLocale } = useI18n();

const nextLocale = computed(() => (locale.value === 'en' ? 'fr' : 'en'));

// Prevent hydration mismatch by only rendering after mount
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
</script>

<template>
  <UButton
    v-if="mounted"
    size="xs"
    variant="ghost"
    color="neutral"
    icon="i-lucide-globe"
    :label="locale.toUpperCase()"
    @click="setLocale(nextLocale)"
  />
  <UButton v-else size="xs" variant="ghost" color="neutral" icon="i-lucide-globe" label="EN" />
</template>
