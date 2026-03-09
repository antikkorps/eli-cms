<script setup lang="ts">
const props = defineProps<{
  status: string;
}>();

const emit = defineEmits<{
  transition: [status: string];
  schedule: [];
}>();

const { t } = useI18n();
const { hasPermission } = useAuth();

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'neutral', label: 'contents.draft' },
  'in-review': { color: 'warning', label: 'contents.inReview' },
  approved: { color: 'info', label: 'contents.approved' },
  scheduled: { color: 'primary', label: 'contents.scheduled' },
  published: { color: 'success', label: 'contents.published' },
};

const currentConfig = computed(() => statusConfig[props.status] ?? statusConfig.draft);

interface Action {
  label: string;
  to: string;
  color: string;
  icon: string;
  show: boolean;
}

const actions = computed<Action[]>(() => {
  const s = props.status;
  const all: Action[] = [];

  if (s === 'draft') {
    all.push({
      label: t('contents.submitForReview'),
      to: 'in-review',
      color: 'warning',
      icon: 'i-lucide-send',
      show: hasPermission('content:update'),
    });
  }

  if (s === 'in-review') {
    all.push({
      label: t('contents.approve'),
      to: 'approved',
      color: 'success',
      icon: 'i-lucide-check',
      show: hasPermission('content:review'),
    });
    all.push({
      label: t('contents.reject'),
      to: 'draft',
      color: 'error',
      icon: 'i-lucide-x',
      show: hasPermission('content:review'),
    });
  }

  if (s === 'approved') {
    all.push({
      label: t('contents.publish'),
      to: 'published',
      color: 'success',
      icon: 'i-lucide-globe',
      show: hasPermission('content:publish'),
    });
    all.push({
      label: t('contents.schedule'),
      to: 'schedule',
      color: 'primary',
      icon: 'i-lucide-calendar',
      show: hasPermission('content:publish'),
    });
  }

  if (s === 'scheduled') {
    all.push({
      label: t('contents.publish'),
      to: 'published',
      color: 'success',
      icon: 'i-lucide-globe',
      show: hasPermission('content:publish'),
    });
  }

  if (s === 'published' || s === 'approved' || s === 'scheduled') {
    all.push({
      label: t('contents.unpublish'),
      to: 'draft',
      color: 'neutral',
      icon: 'i-lucide-archive',
      show: hasPermission('content:publish'),
    });
  }

  return all.filter((a) => a.show);
});

function onAction(action: Action) {
  if (action.to === 'schedule') {
    emit('schedule');
  } else {
    emit('transition', action.to);
  }
}
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <UBadge :color="(currentConfig!.color as any)" variant="subtle" size="md">
      {{ t(currentConfig!.label) }}
    </UBadge>
    <UButton
      v-for="action in actions"
      :key="action.to"
      :color="(action.color as any)"
      :icon="action.icon"
      size="sm"
      variant="outline"
      @click="onAction(action)"
    >
      {{ action.label }}
    </UButton>
  </div>
</template>
