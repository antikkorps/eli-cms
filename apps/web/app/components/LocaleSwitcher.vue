<script setup lang="ts">
const { locale, setLocale } = useI18n();

const nextLocale = computed(() => (locale.value === 'en' ? 'fr' : 'en'));
</script>

<template>
  <UButton
    icon="i-lucide-globe"
    variant="ghost"
    color="neutral"
    size="xs"
    @click="setLocale(nextLocale)"
  >
    {{ locale.toUpperCase() }}
  </UButton>
</template>
