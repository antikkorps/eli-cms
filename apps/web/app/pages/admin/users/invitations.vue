<script setup lang="ts">
import { h, resolveComponent } from 'vue';
import type { UserInvitation, UserInvitationStatus } from '@eli-cms/shared';

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
});

const { apiFetch } = useApi();
const { t, locale } = useI18n();
const { user: currentUser, hasPermission } = useAuth();
const toast = useToast();

interface RoleOption {
  id: string;
  name: string;
}

const status = ref<UserInvitationStatus>('pending');
const invitations = ref<UserInvitation[]>([]);
const loading = ref(false);
const roleOptions = ref<RoleOption[]>([]);

const canInvite = computed(() => hasPermission('users:create'));

async function fetchInvitations() {
  loading.value = true;
  try {
    const res = await apiFetch<{ success: boolean; data: UserInvitation[] }>(
      `/invitations?status=${status.value}&limit=100`,
    );
    invitations.value = res.data;
  } catch {
    invitations.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  try {
    const res = await apiFetch<{ success: boolean; data: RoleOption[] }>('/roles?limit=100');
    roleOptions.value = res.data;
  } catch {
    // ignore
  }
}

const inviteOpen = ref(false);
const inviting = ref(false);
const inviteForm = reactive({ email: '', roleId: '' });
const roleItems = computed(() => roleOptions.value.map((r) => ({ label: r.name, value: r.id })));

async function submitInvite() {
  if (!inviteForm.email || !inviteForm.roleId) return;
  inviting.value = true;
  try {
    await apiFetch('/invitations', {
      method: 'POST',
      body: { email: inviteForm.email, roleId: inviteForm.roleId },
    });
    toast.add({ title: t('invitations.sent'), color: 'success' });
    inviteOpen.value = false;
    inviteForm.email = '';
    inviteForm.roleId = '';
    if (status.value !== 'pending') status.value = 'pending';
    else await fetchInvitations();
  } catch (err: unknown) {
    const message = (err as { data?: { error?: string } }).data?.error || t('invitations.sendError');
    toast.add({ title: message, color: 'error' });
  } finally {
    inviting.value = false;
  }
}

const revokeOpen = ref(false);
const revokeTarget = ref<UserInvitation | null>(null);
const revoking = ref(false);

function askRevoke(inv: UserInvitation) {
  revokeTarget.value = inv;
  revokeOpen.value = true;
}

async function confirmRevoke() {
  if (!revokeTarget.value) return;
  revoking.value = true;
  try {
    await apiFetch(`/invitations/${revokeTarget.value.id}`, { method: 'DELETE' });
    toast.add({ title: t('invitations.revokeSuccess'), color: 'success' });
    revokeOpen.value = false;
    await fetchInvitations();
  } catch (err: unknown) {
    const message = (err as { data?: { error?: string } }).data?.error || t('common.error');
    toast.add({ title: message, color: 'error' });
  } finally {
    revoking.value = false;
  }
}

async function resend(inv: UserInvitation) {
  if (inv.invitedBy !== currentUser.value?.id) {
    toast.add({ title: t('invitations.resendOnlyInviter'), color: 'warning' });
    return;
  }
  try {
    await apiFetch(`/invitations/${inv.id}/resend`, { method: 'POST' });
    toast.add({ title: t('invitations.resendSuccess'), color: 'success' });
    await fetchInvitations();
  } catch (err: unknown) {
    const message = (err as { data?: { error?: string } }).data?.error || t('common.error');
    toast.add({ title: message, color: 'error' });
  }
}

const statusTabs = computed(() => [
  { label: t('invitations.tabPending'), value: 'pending' as const },
  { label: t('invitations.tabAccepted'), value: 'accepted' as const },
  { label: t('invitations.tabRevoked'), value: 'revoked' as const },
  { label: t('invitations.tabExpired'), value: 'expired' as const },
]);

const statusBadgeColor: Record<UserInvitationStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  accepted: 'success',
  revoked: 'error',
  expired: 'neutral',
};

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');

const columns = computed(() => [
  {
    accessorKey: 'email',
    header: t('invitations.columnEmail'),
    cell: ({ row }: { row: { original: UserInvitation } }) => row.original.email,
  },
  {
    accessorKey: 'roleName',
    header: t('invitations.columnRole'),
    cell: ({ row }: { row: { original: UserInvitation } }) =>
      h(
        UBadge as ReturnType<typeof resolveComponent>,
        { variant: 'subtle', size: 'sm' },
        () => row.original.roleName ?? '',
      ),
  },
  {
    accessorKey: 'status',
    header: t('invitations.columnStatus'),
    cell: ({ row }: { row: { original: UserInvitation } }) =>
      h(
        UBadge as ReturnType<typeof resolveComponent>,
        { variant: 'subtle', size: 'sm', color: statusBadgeColor[row.original.status] },
        () => t(`invitations.status${row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}`),
      ),
  },
  {
    accessorKey: 'invitedByEmail',
    header: t('invitations.columnInvitedBy'),
    cell: ({ row }: { row: { original: UserInvitation } }) =>
      row.original.invitedByName || row.original.invitedByEmail || '—',
  },
  {
    accessorKey: 'expiresAt',
    header: t('invitations.columnExpires'),
    cell: ({ row }: { row: { original: UserInvitation } }) =>
      new Date(row.original.expiresAt).toLocaleDateString(locale.value),
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: { row: { original: UserInvitation } }) => {
      const inv = row.original;
      const buttons = [];
      if (canInvite.value && (inv.status === 'pending' || inv.status === 'expired' || inv.status === 'revoked')) {
        const isInviter = inv.invitedBy === currentUser.value?.id;
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-send',
            variant: 'ghost',
            color: 'neutral',
            size: 'sm',
            disabled: !isInviter,
            title: isInviter ? t('invitations.resend') : t('invitations.resendOnlyInviter'),
            onClick: () => resend(inv),
          }),
        );
      }
      if (canInvite.value && inv.status === 'pending') {
        buttons.push(
          h(UButton as ReturnType<typeof resolveComponent>, {
            icon: 'i-lucide-trash-2',
            variant: 'ghost',
            color: 'error',
            size: 'sm',
            onClick: () => askRevoke(inv),
          }),
        );
      }
      if (buttons.length === 0) return '';
      return h('div', { class: 'flex gap-1 justify-end' }, buttons);
    },
  },
]);

watch(status, fetchInvitations);
onMounted(async () => {
  await Promise.all([fetchRoles(), fetchInvitations()]);
});
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('invitations.title') }}</h1>
        <p class="text-sm text-muted mt-1">{{ $t('invitations.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <UButton to="/admin/users" variant="ghost" icon="i-lucide-users">
          {{ $t('nav.users') }}
        </UButton>
        <UButton v-if="canInvite" icon="i-lucide-send" @click="inviteOpen = true">
          {{ $t('invitations.invite') }}
        </UButton>
      </div>
    </div>

    <UTabs v-model="status" :items="statusTabs" variant="link" />

    <div v-if="loading && !invitations.length" class="space-y-3">
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded" />
    </div>
    <div v-else-if="!loading && !invitations.length" class="flex flex-col items-center justify-center py-16">
      <UIcon name="i-lucide-mail" class="size-12 text-muted" />
      <p class="mt-3 font-medium">{{ $t('invitations.emptyTitle') }}</p>
      <p class="text-sm text-muted">{{ $t('invitations.emptyDescription') }}</p>
    </div>
    <UTable v-else :data="invitations" :columns="columns" :loading="loading" />

    <!-- Invite modal -->
    <UModal v-model:open="inviteOpen">
      <template #content>
        <form class="p-6 space-y-4" @submit.prevent="submitInvite">
          <div>
            <h3 class="text-lg font-semibold">{{ $t('invitations.inviteTitle') }}</h3>
            <p class="text-sm text-muted mt-1">{{ $t('invitations.inviteSubtitle') }}</p>
          </div>

          <UFormField :label="$t('invitations.emailLabel')">
            <UInput
              v-model="inviteForm.email"
              type="email"
              :placeholder="$t('invitations.emailPlaceholder')"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('invitations.roleLabel')">
            <USelect
              v-model="inviteForm.roleId"
              :items="roleItems"
              :placeholder="$t('invitations.rolePlaceholder')"
              required
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" color="neutral" @click="inviteOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton type="submit" :loading="inviting" :disabled="!inviteForm.email || !inviteForm.roleId">
              {{ $t('invitations.send') }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Revoke modal -->
    <UModal v-model:open="revokeOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">{{ $t('invitations.revokeTitle') }}</h3>
          <i18n-t keypath="invitations.revokeConfirm" tag="p" class="text-sm text-muted">
            <template #email>
              <strong>{{ revokeTarget?.email }}</strong>
            </template>
          </i18n-t>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="revokeOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="revoking" @click="confirmRevoke">
              {{ $t('invitations.revoke') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
