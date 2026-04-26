<script setup lang="ts">
import { resetSetupCheck } from '~/middleware/setup.global';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();

const { hasPermission } = useAuth();

const activeTab = ref('storage');
const tabs = computed(() => [
  { label: t('settings.storageTitle'), value: 'storage', icon: 'i-lucide-hard-drive' },
  { label: t('settings.smtpTitle'), value: 'smtp', icon: 'i-lucide-mail' },
  { label: t('seo.title'), value: 'seo', icon: 'i-lucide-search' },
  { label: t('settings.i18nTitle'), value: 'i18n', icon: 'i-lucide-languages' },
  ...(hasPermission('settings:update')
    ? [{ label: t('settings.onboardingTitle'), value: 'onboarding', icon: 'i-lucide-wand-sparkles' }]
    : []),
]);

// ─── Storage ────────────────────────────────────────────
const form = reactive({
  activeStorage: 'local' as 'local' | 's3',
  s3: {
    bucket: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    endpoint: '',
  },
});

const loading = ref(true);
const saving = ref(false);

const storageOptions = [
  { label: t('settings.local'), value: 'local' },
  { label: t('settings.s3'), value: 's3' },
];

async function fetchSettings() {
  loading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: {
        activeStorage: 'local' | 's3';
        s3?: { bucket: string; region: string; accessKeyId: string; secretAccessKey: string; endpoint?: string };
      };
    }>('/settings/storage');
    form.activeStorage = res.data.activeStorage;
    if (res.data.s3) {
      form.s3.bucket = res.data.s3.bucket;
      form.s3.region = res.data.s3.region;
      form.s3.accessKeyId = res.data.s3.accessKeyId;
      form.s3.secretAccessKey = res.data.s3.secretAccessKey;
      form.s3.endpoint = res.data.s3.endpoint ?? '';
    }
  } catch {
    // defaults ok
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    const body: Record<string, unknown> = { activeStorage: form.activeStorage };
    if (form.activeStorage === 's3') {
      const s3: Record<string, string> = {
        bucket: form.s3.bucket,
        region: form.s3.region,
        accessKeyId: form.s3.accessKeyId,
        secretAccessKey: form.s3.secretAccessKey,
      };
      if (form.s3.endpoint) s3.endpoint = form.s3.endpoint;
      body.s3 = s3;
    }
    await apiFetch('/settings/storage', { method: 'PUT', body });
    toast.add({ title: t('common.saved'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

// ─── SMTP ───────────────────────────────────────────────
const smtp = reactive({
  host: '',
  port: 587,
  secure: false,
  authType: 'password' as 'password' | 'oauth2' | 'none',
  user: '',
  password: '',
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  fromName: '',
  fromAddress: '',
});

const authTypeOptions = [
  { label: t('settings.smtpAuthPassword'), value: 'password' },
  { label: t('settings.smtpAuthOAuth2'), value: 'oauth2' },
  { label: t('settings.smtpAuthNone'), value: 'none' },
];

const smtpLoading = ref(true);
const smtpSaving = ref(false);
const smtpConfigured = ref(false);
const testEmail = ref('');
const testSending = ref(false);

async function fetchSmtp() {
  smtpLoading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: {
        host: string;
        port: number;
        secure: boolean;
        authType?: 'password' | 'oauth2' | 'none';
        user?: string;
        password?: string;
        clientId?: string;
        clientSecret?: string;
        refreshToken?: string;
        fromName: string;
        fromAddress: string;
      } | null;
    }>('/settings/smtp');
    if (res.data) {
      smtp.host = res.data.host;
      smtp.port = res.data.port;
      smtp.secure = res.data.secure;
      smtp.authType = res.data.authType ?? 'password';
      smtp.user = res.data.user ?? '';
      smtp.password = res.data.password ?? '';
      smtp.clientId = res.data.clientId ?? '';
      smtp.clientSecret = res.data.clientSecret ?? '';
      smtp.refreshToken = res.data.refreshToken ?? '';
      smtp.fromName = res.data.fromName;
      smtp.fromAddress = res.data.fromAddress;
      smtpConfigured.value = true;
    }
  } catch {
    // not configured yet
  } finally {
    smtpLoading.value = false;
  }
}

async function submitSmtp() {
  smtpSaving.value = true;
  try {
    const body: Record<string, unknown> = {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      authType: smtp.authType,
      fromName: smtp.fromName,
      fromAddress: smtp.fromAddress,
    };
    if (smtp.authType === 'password') {
      body.user = smtp.user;
      body.password = smtp.password;
    } else if (smtp.authType === 'oauth2') {
      body.user = smtp.user;
      body.clientId = smtp.clientId;
      body.clientSecret = smtp.clientSecret;
      body.refreshToken = smtp.refreshToken;
    }
    await apiFetch('/settings/smtp', { method: 'PUT', body });
    smtpConfigured.value = true;
    toast.add({ title: t('common.saved'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    smtpSaving.value = false;
  }
}

async function sendTestEmail() {
  if (!smtpConfigured.value) {
    toast.add({ title: t('settings.smtpNotConfigured'), color: 'warning' });
    return;
  }
  testSending.value = true;
  try {
    await apiFetch('/settings/smtp/test', { method: 'POST', body: { email: testEmail.value } });
    toast.add({ title: t('settings.smtpTestSuccess'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    testSending.value = false;
  }
}

// ─── SEO ───────────────────────────────────────────────
const { items: contentTypeItems, fetch: fetchContentTypes } = useContentTypes();

const seo = reactive({
  siteUrl: '',
  defaultOgImage: null as string | null,
  excludedContentTypes: [] as string[],
});

const seoLoading = ref(true);
const seoSaving = ref(false);

const contentTypeSelectItems = computed(() => contentTypeItems.value.map((ct) => ({ label: ct.name, value: ct.id })));

async function fetchSeo() {
  seoLoading.value = true;
  try {
    const res = await apiFetch<{
      success: boolean;
      data: { siteUrl: string; defaultOgImage?: string; excludedContentTypes?: string[] } | null;
    }>('/settings/seo');
    if (res.data) {
      seo.siteUrl = res.data.siteUrl;
      seo.defaultOgImage = res.data.defaultOgImage ?? null;
      seo.excludedContentTypes = res.data.excludedContentTypes ?? [];
    }
  } catch {
    // not configured yet
  } finally {
    seoLoading.value = false;
  }
}

async function submitSeo() {
  seoSaving.value = true;
  try {
    const body: Record<string, unknown> = { siteUrl: seo.siteUrl };
    if (seo.defaultOgImage) body.defaultOgImage = seo.defaultOgImage;
    if (seo.excludedContentTypes.length) body.excludedContentTypes = seo.excludedContentTypes;
    await apiFetch('/settings/seo', { method: 'PUT', body });
    toast.add({ title: t('common.saved'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    seoSaving.value = false;
  }
}

// ─── i18n ──────────────────────────────────────────────
const i18nConfig = reactive({
  defaultLocale: 'en',
  locales: ['en'] as string[],
});
const i18nLoading = ref(true);
const i18nSaving = ref(false);
const newLocaleInput = ref('');
const localePattern = /^[a-z]{2,3}(-[A-Z]{2})?$/;

async function fetchI18n() {
  i18nLoading.value = true;
  try {
    const res = await apiFetch<{ success: boolean; data: { defaultLocale: string; locales: string[] } }>(
      '/settings/i18n',
    );
    if (res.data) {
      i18nConfig.defaultLocale = res.data.defaultLocale;
      i18nConfig.locales = [...res.data.locales];
    }
  } catch {
    // defaults ok
  } finally {
    i18nLoading.value = false;
  }
}

function addLocale() {
  const code = newLocaleInput.value.trim();
  if (!localePattern.test(code)) {
    toast.add({ title: t('settings.i18nInvalidLocale'), color: 'error' });
    return;
  }
  if (i18nConfig.locales.includes(code)) {
    toast.add({ title: t('settings.i18nDuplicateLocale'), color: 'warning' });
    return;
  }
  i18nConfig.locales.push(code);
  newLocaleInput.value = '';
}

function removeLocale(code: string) {
  if (i18nConfig.locales.length <= 1) return;
  i18nConfig.locales = i18nConfig.locales.filter((l) => l !== code);
  if (i18nConfig.defaultLocale === code) {
    i18nConfig.defaultLocale = i18nConfig.locales[0]!;
  }
}

const i18nLocaleOptions = computed(() => i18nConfig.locales.map((l) => ({ label: l, value: l })));

async function submitI18n() {
  i18nSaving.value = true;
  try {
    await apiFetch('/settings/i18n', {
      method: 'PUT',
      body: { defaultLocale: i18nConfig.defaultLocale, locales: i18nConfig.locales },
    });
    useI18nConfig().invalidate();
    toast.add({ title: t('common.saved'), color: 'success' });
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    i18nSaving.value = false;
  }
}

// ─── Onboarding ────────────────────────────────────────
const resettingOnboarding = ref(false);

async function resetOnboarding() {
  resettingOnboarding.value = true;
  try {
    await apiFetch('/setup/onboarding', { method: 'DELETE' });
    resetSetupCheck();
    toast.add({ title: t('settings.onboardingReset'), color: 'success' });
    navigateTo('/onboarding');
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    resettingOnboarding.value = false;
  }
}

onMounted(() => {
  fetchSettings();
  fetchSmtp();
  fetchSeo();
  fetchContentTypes();
  fetchI18n();
});
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold">{{ $t('settings.title') }}</h1>
      <p class="text-sm text-muted mt-1">{{ $t('settings.subtitle') }}</p>
    </div>

    <UTabs v-model="activeTab" :items="tabs" />

    <!-- Storage tab -->
    <div v-if="activeTab === 'storage'">
      <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

      <form v-else class="space-y-6" @submit.prevent="submit">
        <div class="space-y-4">
          <UFormField :label="$t('settings.activeStorageLabel')">
            <USelect v-model="form.activeStorage" :items="storageOptions" class="w-full" />
          </UFormField>

          <template v-if="form.activeStorage === 's3'">
            <UFormField :label="$t('settings.s3BucketLabel')">
              <UInput v-model="form.s3.bucket" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3RegionLabel')">
              <UInput v-model="form.s3.region" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3AccessKeyLabel')">
              <UInput v-model="form.s3.accessKeyId" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3SecretKeyLabel')">
              <UInput v-model="form.s3.secretAccessKey" type="password" required class="w-full" />
            </UFormField>

            <UFormField :label="$t('settings.s3EndpointLabel')" :hint="$t('settings.s3EndpointHint')">
              <UInput v-model="form.s3.endpoint" class="w-full" />
            </UFormField>
          </template>
        </div>

        <div class="flex justify-end">
          <UButton type="submit" :loading="saving">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </form>
    </div>

    <!-- SMTP tab -->
    <div v-if="activeTab === 'smtp'">
      <div v-if="smtpLoading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

      <div v-else class="space-y-6">
        <form class="space-y-6" @submit.prevent="submitSmtp">
          <div class="space-y-4">
            <!-- Server -->
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="$t('settings.smtpHostLabel')">
                <UInput v-model="smtp.host" placeholder="smtp.example.com" required class="w-full" />
              </UFormField>

              <UFormField :label="$t('settings.smtpPortLabel')">
                <UInput v-model.number="smtp.port" type="number" required class="w-full" />
              </UFormField>
            </div>

            <UFormField>
              <UCheckbox v-model="smtp.secure" :label="$t('settings.smtpSecureLabel')" />
            </UFormField>

            <!-- Auth type -->
            <UFormField :label="$t('settings.smtpAuthTypeLabel')">
              <USelect v-model="smtp.authType" :items="authTypeOptions" class="w-full" />
            </UFormField>

            <!-- Password auth -->
            <template v-if="smtp.authType === 'password'">
              <div class="grid grid-cols-2 gap-4">
                <UFormField :label="$t('settings.smtpUserLabel')">
                  <UInput v-model="smtp.user" required class="w-full" />
                </UFormField>

                <UFormField :label="$t('settings.smtpPasswordLabel')">
                  <UInput v-model="smtp.password" type="password" required class="w-full" />
                </UFormField>
              </div>
            </template>

            <!-- OAuth2 auth -->
            <template v-if="smtp.authType === 'oauth2'">
              <UFormField :label="$t('settings.smtpUserLabel')">
                <UInput v-model="smtp.user" required class="w-full" />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField :label="$t('settings.smtpClientIdLabel')">
                  <UInput v-model="smtp.clientId" required class="w-full" />
                </UFormField>

                <UFormField :label="$t('settings.smtpClientSecretLabel')">
                  <UInput v-model="smtp.clientSecret" type="password" required class="w-full" />
                </UFormField>
              </div>

              <UFormField :label="$t('settings.smtpRefreshTokenLabel')" :hint="$t('settings.smtpRefreshTokenHint')">
                <UInput v-model="smtp.refreshToken" type="password" required class="w-full" />
              </UFormField>
            </template>

            <!-- Sender -->
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="$t('settings.smtpFromNameLabel')">
                <UInput v-model="smtp.fromName" placeholder="Eli CMS" required class="w-full" />
              </UFormField>

              <UFormField :label="$t('settings.smtpFromAddressLabel')">
                <UInput
                  v-model="smtp.fromAddress"
                  type="email"
                  placeholder="noreply@example.com"
                  required
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <div class="flex justify-end">
            <UButton type="submit" :loading="smtpSaving">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </form>

        <!-- Test Email -->
        <USeparator v-if="smtpConfigured" />

        <div v-if="smtpConfigured" class="space-y-3">
          <h3 class="text-sm font-medium">{{ $t('settings.smtpTestTitle') }}</h3>
          <div class="flex gap-3 items-end">
            <UFormField :label="$t('settings.smtpTestRecipient')" class="flex-1">
              <UInput v-model="testEmail" type="email" placeholder="test@example.com" class="w-full" />
            </UFormField>
            <UButton :loading="testSending" :disabled="!testEmail" variant="outline" @click="sendTestEmail">
              {{ $t('settings.smtpTestSend') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- SEO tab -->
    <div v-if="activeTab === 'seo'">
      <div v-if="seoLoading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

      <form v-else class="space-y-6" @submit.prevent="submitSeo">
        <div class="space-y-4">
          <UFormField :label="$t('seo.siteUrl')" :hint="$t('seo.siteUrlHint')">
            <UInput v-model="seo.siteUrl" placeholder="https://example.com" required class="w-full" />
          </UFormField>

          <UFormField :label="$t('seo.defaultOgImage')">
            <MediaPicker
              :model-value="seo.defaultOgImage"
              :multiple="false"
              :accept="['image/*']"
              @update:model-value="(v: any) => (seo.defaultOgImage = v)"
            />
          </UFormField>

          <UFormField :label="$t('seo.excludedContentTypes')" :hint="$t('seo.excludedContentTypesHint')">
            <USelectMenu v-model="seo.excludedContentTypes" :items="contentTypeSelectItems" multiple class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end">
          <UButton type="submit" :loading="seoSaving">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </form>
    </div>

    <!-- i18n tab -->
    <div v-if="activeTab === 'i18n'">
      <div v-if="i18nLoading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

      <form v-else class="space-y-6" @submit.prevent="submitI18n">
        <p class="text-sm text-muted">{{ $t('settings.i18nDescription') }}</p>

        <UFormField :label="$t('settings.i18nLocalesLabel')" :hint="$t('settings.i18nLocalesHint')">
          <div class="space-y-2">
            <div v-for="code in i18nConfig.locales" :key="code" class="flex items-center gap-2">
              <UBadge color="neutral" variant="soft" class="font-mono">{{ code }}</UBadge>
              <span v-if="code === i18nConfig.defaultLocale" class="text-xs text-muted">
                ({{ $t('settings.i18nDefaultLocaleLabel').toLowerCase() }})
              </span>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                :disabled="i18nConfig.locales.length <= 1"
                @click="removeLocale(code)"
              >
                {{ $t('settings.i18nRemoveLocale') }}
              </UButton>
            </div>

            <div class="flex gap-2">
              <UInput
                v-model="newLocaleInput"
                placeholder="fr-CA"
                class="flex-1 font-mono"
                @keydown.enter.prevent="addLocale"
              />
              <UButton variant="outline" icon="i-lucide-plus" @click="addLocale">
                {{ $t('settings.i18nAddLocale') }}
              </UButton>
            </div>
          </div>
        </UFormField>

        <UFormField :label="$t('settings.i18nDefaultLocaleLabel')" :hint="$t('settings.i18nDefaultLocaleHint')">
          <USelect v-model="i18nConfig.defaultLocale" :items="i18nLocaleOptions" class="w-full" />
        </UFormField>

        <div class="flex justify-end">
          <UButton type="submit" :loading="i18nSaving">{{ $t('common.save') }}</UButton>
        </div>
      </form>
    </div>

    <!-- Onboarding tab -->
    <div v-if="activeTab === 'onboarding'" class="space-y-4">
      <p class="text-sm text-muted">{{ $t('settings.onboardingDescription') }}</p>
      <UButton variant="soft" icon="i-lucide-rotate-ccw" :loading="resettingOnboarding" @click="resetOnboarding">
        {{ $t('settings.onboardingRelaunch') }}
      </UButton>
    </div>
  </div>
</template>
