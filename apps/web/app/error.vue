<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number;
    statusMessage?: string;
    message?: string;
  };
}>();

const { t } = useI18n();

const is404 = computed(() => props.error.statusCode === 404);

function handleError() {
  clearError({ redirect: '/' });
}

function goBack() {
  clearError({ redirect: '/admin' });
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
    <div class="absolute top-4 right-4 flex items-center gap-2">
      <DarkModeToggle />
      <LocaleSwitcher />
    </div>

    <div class="text-center max-w-md space-y-6">
      <!-- Status code -->
      <p class="text-8xl font-bold text-primary/20">{{ error.statusCode }}</p>

      <!-- 404 -->
      <template v-if="is404">
        <h1 class="text-2xl font-bold">{{ $t('errors.notFoundTitle') }}</h1>
        <p class="text-muted">{{ $t('errors.notFoundDescription') }}</p>
      </template>

      <!-- Other errors -->
      <template v-else>
        <h1 class="text-2xl font-bold">{{ $t('errors.genericTitle') }}</h1>
        <p class="text-muted">{{ $t('errors.genericDescription') }}</p>
        <UAlert
          v-if="error.message || error.statusMessage"
          color="error"
          variant="subtle"
          :title="error.message || error.statusMessage || ''"
          class="text-left"
        />
      </template>

      <!-- Actions -->
      <div class="flex justify-center gap-3">
        <UButton variant="soft" color="neutral" icon="i-lucide-arrow-left" @click="goBack">
          {{ $t('errors.backToDashboard') }}
        </UButton>
        <UButton icon="i-lucide-home" @click="handleError">
          {{ $t('errors.backToHome') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
