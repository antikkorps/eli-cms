<script setup lang="ts">
import type { DiceBearStyle } from '@eli-cms/shared';

const props = defineProps<{
  open: boolean;
  currentStyle: string | null;
  currentSeed: string | null;
  email: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [style: DiceBearStyle, seed: string];
}>();

const { t } = useI18n();
const { avatarUrl, randomSeeds, DICEBEAR_STYLES } = useAvatar();

// Steps: 'style' | 'seed'
const step = ref<'style' | 'seed'>('style');
const selectedStyle = ref<DiceBearStyle>((props.currentStyle as DiceBearStyle) || 'initials');
const selectedSeed = ref(props.currentSeed || props.email);
const seeds = ref<string[]>([]);

function regenerateSeeds() {
  seeds.value = randomSeeds(8);
}

// Reset on open
watch(() => props.open, (val) => {
  if (val) {
    step.value = 'style';
    selectedStyle.value = (props.currentStyle as DiceBearStyle) || 'initials';
    selectedSeed.value = props.currentSeed || props.email;
    regenerateSeeds();
  }
});

function selectStyle(style: DiceBearStyle) {
  selectedStyle.value = style;
  step.value = 'seed';
}

function selectSeed(seed: string) {
  selectedSeed.value = seed;
}

function confirmSelection() {
  emit('confirm', selectedStyle.value, selectedSeed.value);
  emit('update:open', false);
}

function goBack() {
  step.value = 'style';
}

const styleLabels: Record<string, string> = {
  initials: 'Initials',
  avataaars: 'Avataaars',
  bottts: 'Bottts',
  'fun-emoji': 'Fun Emoji',
  'pixel-art': 'Pixel Art',
  lorelei: 'Lorelei',
  adventurer: 'Adventurer',
  micah: 'Micah',
  thumbs: 'Thumbs',
  shapes: 'Shapes',
  rings: 'Rings',
  identicon: 'Identicon',
};

const allSeeds = computed(() => [props.email, ...seeds.value]);
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-6 space-y-4">
        <!-- Step 1: Style Grid -->
        <template v-if="step === 'style'">
          <div>
            <h3 class="text-lg font-semibold">{{ t('profile.avatarPickerTitle') }}</h3>
            <p class="text-sm text-muted mt-1">{{ t('profile.avatarPickerSubtitle') }}</p>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <button
              v-for="style in DICEBEAR_STYLES"
              :key="style"
              class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:border-primary hover:bg-primary/5"
              :class="style === selectedStyle ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-default'"
              @click="selectStyle(style)"
            >
              <img
                :src="avatarUrl(email, style, 64)"
                :alt="styleLabels[style]"
                class="size-14 rounded-full"
              />
              <span class="text-xs truncate max-w-full">{{ styleLabels[style] }}</span>
            </button>
          </div>

          <div class="flex justify-end">
            <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">
              {{ t('common.cancel') }}
            </UButton>
          </div>
        </template>

        <!-- Step 2: Seed Grid -->
        <template v-else>
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-arrow-left" variant="ghost" size="xs" @click="goBack" />
            <div>
              <h3 class="text-lg font-semibold">{{ styleLabels[selectedStyle] }}</h3>
              <p class="text-sm text-muted">{{ t('profile.avatarSeedSubtitle') }}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="seed in allSeeds"
              :key="seed"
              class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:border-primary hover:bg-primary/5"
              :class="seed === selectedSeed ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-default'"
              @click="selectSeed(seed)"
            >
              <img
                :src="avatarUrl(seed, selectedStyle, 64)"
                :alt="seed"
                class="size-14 rounded-full"
              />
              <span class="text-xs truncate max-w-full">{{ seed === email ? 'Default' : seed }}</span>
            </button>
          </div>

          <div class="flex items-center justify-between">
            <UButton variant="ghost" color="neutral" icon="i-lucide-refresh-cw" size="sm" @click="regenerateSeeds">
              {{ t('profile.avatarRandomize') }}
            </UButton>
            <div class="flex gap-2">
              <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">
                {{ t('common.cancel') }}
              </UButton>
              <UButton @click="confirmSelection">
                {{ t('profile.avatarConfirm') }}
              </UButton>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
