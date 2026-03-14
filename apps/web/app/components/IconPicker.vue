<script setup lang="ts">
const { t } = useI18n();

const model = defineModel<string>({ default: '' });

const search = ref('');
const open = ref(false);

// Curated list of useful Lucide icons for a CMS context
const ICONS = [
  // Layout & structure
  'layout',
  'layout-grid',
  'layout-list',
  'layout-template',
  'layout-dashboard',
  'columns-2',
  'columns-3',
  'rows-3',
  'panel-left',
  'panel-right',
  'panel-top',
  'app-window',
  'square',
  'rectangle-horizontal',
  'rectangle-vertical',
  // Content & text
  'file-text',
  'file',
  'file-check',
  'file-plus',
  'file-image',
  'file-video',
  'text',
  'heading',
  'heading-1',
  'heading-2',
  'heading-3',
  'align-left',
  'align-center',
  'align-right',
  'align-justify',
  'list',
  'list-ordered',
  'quote',
  'type',
  'text-cursor',
  // Media
  'image',
  'images',
  'camera',
  'video',
  'film',
  'play',
  'music',
  'gallery-vertical',
  'picture-in-picture',
  'monitor-play',
  // UI elements
  'toggle-left',
  'toggle-right',
  'sliders-vertical',
  'menu',
  'navigation',
  'panel-bottom',
  'credit-card',
  'badge',
  'tag',
  'tags',
  // Icons & shapes
  'star',
  'heart',
  'thumbs-up',
  'award',
  'trophy',
  'crown',
  'diamond',
  'circle',
  'triangle',
  'hexagon',
  'octagon',
  'pentagon',
  'sparkles',
  'zap',
  'flame',
  'rocket',
  'target',
  // Communication
  'message-square',
  'message-circle',
  'mail',
  'send',
  'at-sign',
  'phone',
  'megaphone',
  'bell',
  'speech',
  // People & social
  'user',
  'users',
  'user-circle',
  'contact',
  'person-standing',
  'share-2',
  'globe',
  'link',
  'external-link',
  // Commerce
  'shopping-cart',
  'shopping-bag',
  'store',
  'package',
  'gift',
  'dollar-sign',
  'euro',
  'receipt',
  'wallet',
  'banknote',
  // Navigation & maps
  'map',
  'map-pin',
  'compass',
  'navigation-2',
  'route',
  'home',
  'building',
  'building-2',
  'landmark',
  'warehouse',
  // Data & charts
  'bar-chart',
  'bar-chart-3',
  'line-chart',
  'pie-chart',
  'trending-up',
  'table',
  'database',
  'server',
  'hard-drive',
  // Actions
  'download',
  'upload',
  'search',
  'filter',
  'settings',
  'sliders-horizontal',
  'refresh-cw',
  'rotate-cw',
  'move',
  'maximize',
  'minimize',
  // Status
  'check',
  'check-circle',
  'x',
  'x-circle',
  'alert-triangle',
  'alert-circle',
  'info',
  'clock',
  'calendar',
  'calendar-days',
  'timer',
  'hourglass',
  // Objects
  'book',
  'book-open',
  'bookmark',
  'newspaper',
  'scroll',
  'pen',
  'pencil',
  'palette',
  'brush',
  'paintbrush',
  'wrench',
  'hammer',
  'puzzle',
  'blocks',
  'component',
  'lightbulb',
  'lamp',
  'sun',
  'moon',
  'cloud',
  // Arrows & indicators
  'arrow-right',
  'arrow-left',
  'arrow-up',
  'arrow-down',
  'chevron-right',
  'chevron-down',
  'chevrons-right',
  'move-right',
  'corner-down-right',
  'redo',
  'undo',
];

const filteredIcons = computed(() => {
  if (!search.value) return ICONS;
  const q = search.value.toLowerCase();
  return ICONS.filter((name) => name.includes(q));
});

function toIconClass(name: string) {
  return `i-lucide-${name}`;
}

function select(name: string) {
  model.value = toIconClass(name);
  open.value = false;
  search.value = '';
}

function clear() {
  model.value = '';
}

const displayName = computed(() => {
  if (!model.value) return '';
  return model.value.replace('i-lucide-', '');
});
</script>

<template>
  <div class="flex items-center gap-2">
    <UButton variant="outline" class="min-w-48 justify-start" @click="open = true">
      <template #leading>
        <UIcon v-if="model" :name="model" class="size-4" />
        <UIcon v-else name="i-lucide-image" class="size-4 text-muted" />
      </template>
      <span :class="model ? '' : 'text-muted'">
        {{ model ? displayName : t('components.iconPlaceholder') }}
      </span>
    </UButton>

    <UButton v-if="model" variant="ghost" size="xs" icon="i-lucide-x" color="neutral" @click="clear" />

    <UModal v-model:open="open" :title="t('components.iconPickerTitle')" :description="t('components.iconPlaceholder')">
      <template #content>
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ t('components.iconPickerTitle') }}</h3>
          </div>

          <UInput v-model="search" :placeholder="t('common.search')" icon="i-lucide-search" autofocus class="w-full" />

          <div class="max-h-80 overflow-y-auto">
            <div v-if="filteredIcons.length === 0" class="text-sm text-muted text-center py-8">
              {{ t('common.noResults') }}
            </div>
            <div v-else class="grid grid-cols-8 gap-1">
              <button
                v-for="name in filteredIcons"
                :key="name"
                type="button"
                class="flex items-center justify-center p-2.5 rounded-lg hover:bg-elevated transition-colors"
                :class="toIconClass(name) === model ? 'bg-primary-100 dark:bg-primary-900 ring-1 ring-primary-500' : ''"
                :title="name"
                @click="select(name)"
              >
                <UIcon :name="toIconClass(name)" class="size-5" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
