<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

throw createError({
  statusCode: 404,
  statusMessage: 'Page not found',
});
</script>

<template>
  <div />
</template>
