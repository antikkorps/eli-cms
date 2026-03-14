<script setup lang="ts">
const { t } = useI18n();

const props = defineProps<{
  file: File | null;
}>();

const emit = defineEmits<{
  confirm: [file: File];
  skip: [file: File];
  cancel: [];
}>();

const open = computed({
  get: () => !!props.file,
  set: (v) => {
    if (!v) emit('cancel');
  },
});
const imageUrl = ref('');
const cropperRef = ref<any>(null);
const processing = ref(false);

const CropperComponent = defineAsyncComponent(() => import('vue-advanced-cropper').then((m) => m.Cropper));

const aspectRatios = [
  { label: t('imageCrop.free'), value: 0 },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
];
const selectedRatio = ref(0);

const stencilProps = computed(() => (selectedRatio.value ? { aspectRatio: selectedRatio.value } : {}));

watch(
  () => props.file,
  (file) => {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
    if (file) {
      imageUrl.value = URL.createObjectURL(file);
      selectedRatio.value = 0;
    } else {
      imageUrl.value = '';
    }
  },
);

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
});

async function confirm() {
  if (!cropperRef.value || !props.file) return;
  processing.value = true;
  try {
    const { canvas } = cropperRef.value.getResult();
    if (!canvas) {
      emit('skip', props.file);
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, props.file!.type || 'image/jpeg', 0.92),
    );
    if (!blob) {
      emit('skip', props.file);
      return;
    }
    const cropped = new File([blob], props.file.name, { type: blob.type });
    emit('confirm', cropped);
  } finally {
    processing.value = false;
  }
}

function skip() {
  if (props.file) emit('skip', props.file);
}

function cancel() {
  emit('cancel');
}
</script>

<template>
  <UModal v-model:open="open" :title="t('imageCrop.title')" class="sm:max-w-3xl">
    <template #body>
      <div class="space-y-4">
        <!-- Aspect ratio selector -->
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="ratio in aspectRatios"
            :key="ratio.label"
            size="sm"
            :variant="selectedRatio === ratio.value ? 'solid' : 'outline'"
            :color="selectedRatio === ratio.value ? 'primary' : 'neutral'"
            @click="selectedRatio = ratio.value"
          >
            {{ ratio.label }}
          </UButton>
        </div>

        <!-- Cropper (client-only to avoid SSR issues with canvas) -->
        <ClientOnly>
          <div class="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden" style="height: 400px">
            <CropperComponent
              v-if="imageUrl"
              ref="cropperRef"
              :src="imageUrl"
              :stencil-props="stencilProps"
              class="h-full"
            />
          </div>
        </ClientOnly>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <UButton variant="ghost" color="neutral" @click="skip">
          {{ t('imageCrop.skipCrop') }}
        </UButton>
        <div class="flex gap-2">
          <UButton variant="outline" color="neutral" @click="cancel">
            {{ t('common.cancel') }}
          </UButton>
          <UButton :loading="processing" @click="confirm">
            {{ t('imageCrop.cropAndUpload') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
