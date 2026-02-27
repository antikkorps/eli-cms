<script setup lang="ts">
const { token } = useAuth();

onMounted(() => {
  if (token.value) {
    navigateTo('/admin');
  } else {
    navigateTo('/login');
  }
});
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">{{ $t('common.appName') }}</h1>
      <p class="text-lg text-gray-500">{{ $t('index.redirecting') }}</p>
    </div>
  </div>
</template>
