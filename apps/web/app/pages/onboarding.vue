<script setup lang="ts">
import { resetSetupCheck } from '~/middleware/setup.global';

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const { isAuthenticated } = useAuth();

// Redirect to login if not authenticated
onMounted(async () => {
  if (!isAuthenticated.value) {
    navigateTo('/login');
    return;
  }
  // Check if onboarding already done
  try {
    const res = await apiFetch<{ success: boolean; data: { needsSetup: boolean; onboardingCompleted: boolean } }>(
      '/setup/status',
    );
    if (res.data.onboardingCompleted) {
      navigateTo('/admin');
    }
  } catch {
    // continue
  }
});

const step = ref(1);
const totalSteps = 4;

// Step 1 — Template
const templates = [
  { id: 'blog', icon: 'i-lucide-pen-line', color: 'text-blue-500' },
  { id: 'corporate', icon: 'i-lucide-building', color: 'text-emerald-500' },
  { id: 'portfolio', icon: 'i-lucide-palette', color: 'text-purple-500' },
  { id: 'ecommerce', icon: 'i-lucide-shopping-cart', color: 'text-orange-500' },
] as const;

type TemplateId = (typeof templates)[number]['id'];
const selectedTemplate = ref<TemplateId>('blog');

// Step 2 — Site info
const siteName = ref('');
const siteDescription = ref('');

// Step 3 — Options
const demoContent = ref(true);
const extraComponents = ref(true);

// Step 4 — Submit
const submitting = ref(false);
const done = ref(false);
const result = ref<{ contentTypesCreated: string[]; contentsCreated: number } | null>(null);

function next() {
  if (step.value < totalSteps) step.value++;
}

function prev() {
  if (step.value > 1) step.value--;
}

async function submit() {
  submitting.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { contentTypesCreated: string[]; contentsCreated: number };
    }>('/setup/onboarding', {
      method: 'POST',
      body: {
        template: selectedTemplate.value,
        siteName: siteName.value || undefined,
        siteDescription: siteDescription.value || undefined,
        demoContent: demoContent.value,
        extraComponents: extraComponents.value,
      },
    });
    result.value = res.data;
    done.value = true;
    resetSetupCheck();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('common.error');
    toast.add({ title: message, color: 'error' });
  } finally {
    submitting.value = false;
  }
}

function goToAdmin() {
  navigateTo('/admin');
}

async function skipOnboarding() {
  try {
    // Mark onboarding as completed without seeding anything
    await apiFetch('/setup/onboarding', {
      method: 'POST',
      body: { template: 'blog', demoContent: false, extraComponents: false },
    });
  } catch {
    // ignore — just proceed
  }
  resetSetupCheck();
  navigateTo('/admin');
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
    <div class="absolute top-4 right-4 flex items-center gap-2">
      <DarkModeToggle />
      <LocaleSwitcher />
    </div>

    <!-- Done state -->
    <UCard v-if="done" class="w-full max-w-lg text-center">
      <div class="space-y-4 py-4">
        <div class="flex justify-center">
          <div class="size-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UIcon name="i-lucide-check" class="text-green-600 dark:text-green-400 text-3xl" />
          </div>
        </div>
        <h2 class="text-2xl font-bold">{{ $t('onboarding.doneTitle') }}</h2>
        <p class="text-muted">{{ $t('onboarding.doneSubtitle') }}</p>

        <div v-if="result" class="text-left bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div v-if="result.contentTypesCreated.length" class="flex items-start gap-2">
            <UIcon name="i-lucide-layers" class="text-primary mt-0.5 shrink-0" />
            <div>
              <p class="text-sm font-medium">{{ $t('onboarding.createdTypes') }}</p>
              <p class="text-sm text-muted">{{ result.contentTypesCreated.join(', ') }}</p>
            </div>
          </div>
          <div v-if="result.contentsCreated > 0" class="flex items-start gap-2">
            <UIcon name="i-lucide-file-text" class="text-primary mt-0.5 shrink-0" />
            <p class="text-sm">{{ $t('onboarding.createdContents', { count: result.contentsCreated }) }}</p>
          </div>
        </div>

        <UButton size="lg" @click="goToAdmin">
          {{ $t('onboarding.goToAdmin') }}
        </UButton>
      </div>
    </UCard>

    <!-- Wizard -->
    <UCard v-else class="w-full max-w-2xl">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">{{ $t('onboarding.title') }}</h1>
          <p class="text-sm text-muted mt-1">{{ $t('onboarding.subtitle') }}</p>
        </div>
        <!-- Progress bar -->
        <div class="flex gap-1.5 mt-4">
          <div
            v-for="s in totalSteps"
            :key="s"
            class="flex-1 h-1.5 rounded-full transition-colors"
            :class="s <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'"
          />
        </div>
      </template>

      <!-- Step 1: Template -->
      <div v-if="step === 1" class="space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('onboarding.step1Title') }}</h2>
        <p class="text-sm text-muted">{{ $t('onboarding.step1Subtitle') }}</p>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="tpl in templates"
            :key="tpl.id"
            class="p-4 rounded-lg border-2 text-left transition-all hover:shadow-md"
            :class="
              selectedTemplate === tpl.id
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            "
            @click="selectedTemplate = tpl.id"
          >
            <UIcon :name="tpl.icon" :class="['text-2xl mb-2', tpl.color]" />
            <p class="font-medium">{{ $t(`onboarding.template_${tpl.id}`) }}</p>
            <p class="text-xs text-muted mt-1">{{ $t(`onboarding.template_${tpl.id}_desc`) }}</p>
          </button>
        </div>
      </div>

      <!-- Step 2: Site info -->
      <div v-if="step === 2" class="space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('onboarding.step2Title') }}</h2>
        <p class="text-sm text-muted">{{ $t('onboarding.step2Subtitle') }}</p>

        <UFormField :label="$t('onboarding.siteNameLabel')">
          <UInput v-model="siteName" :placeholder="$t('onboarding.siteNamePlaceholder')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('onboarding.siteDescriptionLabel')">
          <UTextarea
            v-model="siteDescription"
            :placeholder="$t('onboarding.siteDescriptionPlaceholder')"
            class="w-full"
            :rows="3"
          />
        </UFormField>
      </div>

      <!-- Step 3: Options -->
      <div v-if="step === 3" class="space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('onboarding.step3Title') }}</h2>
        <p class="text-sm text-muted">{{ $t('onboarding.step3Subtitle') }}</p>

        <div class="space-y-3">
          <label
            class="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <UCheckbox v-model="demoContent" class="mt-0.5" />
            <div>
              <p class="font-medium">{{ $t('onboarding.demoContentLabel') }}</p>
              <p class="text-xs text-muted mt-0.5">{{ $t('onboarding.demoContentHint') }}</p>
            </div>
          </label>

          <label
            class="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <UCheckbox v-model="extraComponents" class="mt-0.5" />
            <div>
              <p class="font-medium">{{ $t('onboarding.extraComponentsLabel') }}</p>
              <p class="text-xs text-muted mt-0.5">{{ $t('onboarding.extraComponentsHint') }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Step 4: Summary -->
      <div v-if="step === 4" class="space-y-4">
        <h2 class="font-semibold text-lg">{{ $t('onboarding.step4Title') }}</h2>
        <p class="text-sm text-muted">{{ $t('onboarding.step4Subtitle') }}</p>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <div class="flex items-center gap-2">
            <UIcon
              :name="templates.find((t) => t.id === selectedTemplate)?.icon || ''"
              :class="templates.find((t) => t.id === selectedTemplate)?.color"
            />
            <span class="font-medium">{{ $t(`onboarding.template_${selectedTemplate}`) }}</span>
          </div>

          <div v-if="siteName" class="flex items-center gap-2">
            <UIcon name="i-lucide-type" class="text-muted" />
            <span class="text-sm">{{ siteName }}</span>
          </div>

          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="text-muted" />
            <span class="text-sm">{{
              demoContent ? $t('onboarding.withDemoContent') : $t('onboarding.withoutDemoContent')
            }}</span>
          </div>

          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-component" class="text-muted" />
            <span class="text-sm">{{
              extraComponents ? $t('onboarding.withExtraComponents') : $t('onboarding.withoutExtraComponents')
            }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <div>
            <UButton v-if="step > 1" variant="ghost" color="neutral" @click="prev">
              {{ $t('onboarding.prev') }}
            </UButton>
            <UButton v-else variant="ghost" color="neutral" @click="skipOnboarding">
              {{ $t('onboarding.skip') }}
            </UButton>
          </div>
          <div>
            <UButton v-if="step < totalSteps" @click="next">
              {{ $t('onboarding.next') }}
            </UButton>
            <UButton v-else :loading="submitting" @click="submit">
              {{ $t('onboarding.launch') }}
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
