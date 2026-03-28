<script setup lang="ts">
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    slug?: string;
    siteUrl?: string;
    contentTypeSlug?: string;
  }>(),
  {
    title: '',
    description: '',
    slug: '',
    siteUrl: '',
    contentTypeSlug: '',
  },
);

const displayUrl = computed(() => {
  if (!props.siteUrl) return 'https://example.com';
  const base = props.siteUrl.replace(/\/+$/, '');
  const parts = [base];
  if (props.contentTypeSlug) parts.push(props.contentTypeSlug);
  if (props.slug) parts.push(props.slug);
  return parts.join(' › ');
});

const titleLength = computed(() => props.title.length);
const descriptionLength = computed(() => props.description.length);

function charCountColor(current: number, warn: number, max: number): string {
  if (current === 0) return 'text-gray-400 dark:text-gray-500';
  if (current <= warn) return 'text-green-500';
  if (current <= max) return 'text-yellow-500';
  return 'text-red-500';
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-search" class="text-gray-500" />
        <span class="text-sm font-medium">{{ t('seo.snippetPreview') }}</span>
      </div>
    </template>

    <!-- Google-style preview -->
    <div class="space-y-1">
      <!-- URL line -->
      <p class="text-sm text-green-700 dark:text-green-400 truncate">
        {{ displayUrl }}
      </p>

      <!-- Title line -->
      <p
        class="text-xl leading-snug cursor-pointer"
        :class="title ? 'text-blue-700 dark:text-blue-400 hover:underline' : 'text-gray-400 dark:text-gray-500 italic'"
      >
        {{ title || t('seo.noTitle') }}
      </p>

      <!-- Description line -->
      <p
        class="text-sm leading-relaxed line-clamp-2"
        :class="description ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'"
      >
        {{ description || t('seo.noDescription') }}
      </p>
    </div>

    <!-- Character counters -->
    <div class="flex gap-6 mt-3 text-xs">
      <span :class="charCountColor(titleLength, 50, 60)"> {{ t('seo.titleCount') }}: {{ titleLength }}/60 </span>
      <span :class="charCountColor(descriptionLength, 140, 160)">
        {{ t('seo.descriptionCount') }}: {{ descriptionLength }}/160
      </span>
    </div>
  </UCard>
</template>
