<script setup lang="ts">
const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [date: string];
}>();

const { t } = useI18n();

const scheduleDate = ref('');
const scheduleTime = ref('12:00');

const isValid = computed(() => {
  if (!scheduleDate.value) return false;
  const dt = new Date(`${scheduleDate.value}T${scheduleTime.value}`);
  return dt > new Date();
});

// Set default date to tomorrow
onMounted(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  scheduleDate.value = tomorrow.toISOString().split('T')[0]!;
});

function submit() {
  if (!isValid.value) return;
  const isoDate = new Date(`${scheduleDate.value}T${scheduleTime.value}`).toISOString();
  emit('confirm', isoDate);
  emit('update:open', false);
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-semibold">{{ t('contents.scheduleTitle') }}</h3>

        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="t('contents.scheduleDate')">
            <UInput v-model="scheduleDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Time">
            <UInput v-model="scheduleTime" type="time" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </UButton>
          <UButton :disabled="!isValid" @click="submit">
            {{ t('contents.scheduleConfirm') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
