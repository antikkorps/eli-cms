<script setup lang="ts">
const props = defineProps<{ contentId: string }>();

const { apiFetch } = useApi();
const { t } = useI18n();
const toast = useToast();
const { user } = useAuth();
const { userAvatarUrl } = useAvatar();

interface CommentAuthor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarStyle: string | null;
  avatarSeed: string | null;
}

interface Comment {
  id: string;
  contentId: string;
  userId: string;
  body: string;
  mentionedUserIds: string[];
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
}

const comments = ref<Comment[]>([]);
const loading = ref(true);
const newBody = ref('');
const newMentionedUserIds = ref<string[]>([]);
const posting = ref(false);
const editingId = ref<string | null>(null);
const editBody = ref('');
const editMentionedUserIds = ref<string[]>([]);
const deletingId = ref<string | null>(null);
const deleteOpen = ref(false);

async function fetchComments() {
  loading.value = true;
  try {
    const res = await apiFetch<{ success: boolean; data: Comment[] }>(
      `/contents/${props.contentId}/comments?limit=100`,
    );
    comments.value = res.data;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

async function postComment() {
  if (!newBody.value.trim()) return;
  posting.value = true;
  try {
    await apiFetch(`/contents/${props.contentId}/comments`, {
      method: 'POST',
      body: { body: newBody.value, mentionedUserIds: newMentionedUserIds.value },
    });
    newBody.value = '';
    newMentionedUserIds.value = [];
    toast.add({ title: t('contents.commentAdded'), color: 'success' });
    await fetchComments();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    posting.value = false;
  }
}

function startEdit(comment: Comment) {
  editingId.value = comment.id;
  editBody.value = comment.body;
  editMentionedUserIds.value = [...(comment.mentionedUserIds ?? [])];
}

function cancelEdit() {
  editingId.value = null;
  editBody.value = '';
  editMentionedUserIds.value = [];
}

async function saveEdit(commentId: string) {
  if (!editBody.value.trim()) return;
  try {
    await apiFetch(`/contents/${props.contentId}/comments/${commentId}`, {
      method: 'PUT',
      body: { body: editBody.value, mentionedUserIds: editMentionedUserIds.value },
    });
    toast.add({ title: t('contents.commentUpdated'), color: 'success' });
    cancelEdit();
    await fetchComments();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  }
}

function deleteComment(commentId: string) {
  deletingId.value = commentId;
  deleteOpen.value = true;
}

async function confirmDelete() {
  if (!deletingId.value) return;
  try {
    await apiFetch(`/contents/${props.contentId}/comments/${deletingId.value}`, {
      method: 'DELETE',
    });
    toast.add({ title: t('contents.commentDeleted'), color: 'success' });
    await fetchComments();
  } catch {
    toast.add({ title: t('common.error'), color: 'error' });
  } finally {
    deleteOpen.value = false;
    deletingId.value = null;
  }
}

function displayName(author: CommentAuthor): string {
  if (author.firstName || author.lastName) {
    return [author.firstName, author.lastName].filter(Boolean).join(' ');
  }
  return author.email;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function isEdited(comment: Comment): boolean {
  return comment.updatedAt !== comment.createdAt;
}

function canManage(comment: Comment): boolean {
  if (!user.value) return false;
  if (user.value.role?.permissions?.includes('*')) return true;
  return comment.userId === user.value.id;
}

onMounted(fetchComments);
</script>

<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="text-sm text-muted">{{ $t('common.loading') }}</div>

    <!-- Empty state -->
    <div v-else-if="!comments.length" class="text-sm text-muted">
      {{ $t('contents.noComments') }}
    </div>

    <!-- Comment list -->
    <div v-for="comment in comments" :key="comment.id" class="flex gap-3">
      <img
        :src="userAvatarUrl(comment.author)"
        :alt="displayName(comment.author)"
        class="w-8 h-8 rounded-full shrink-0 mt-0.5"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-sm">{{ displayName(comment.author) }}</span>
          <span class="text-xs text-(--ui-text-muted)">{{ timeAgo(comment.createdAt) }}</span>
          <span v-if="isEdited(comment)" class="text-xs text-(--ui-text-muted) italic">
            ({{ $t('contents.editedLabel') }})
          </span>
        </div>

        <!-- View mode -->
        <CommentBody v-if="editingId !== comment.id" :body="comment.body" />

        <!-- Edit mode -->
        <div v-else class="mt-1 space-y-2">
          <MentionTextarea v-model="editBody" v-model:mentioned-user-ids="editMentionedUserIds" :rows="2" />
          <div class="flex gap-2">
            <UButton size="xs" @click="saveEdit(comment.id)">{{ $t('common.save') }}</UButton>
            <UButton size="xs" variant="ghost" @click="cancelEdit">{{ $t('common.cancel') }}</UButton>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="canManage(comment) && editingId !== comment.id" class="flex gap-1 mt-1">
          <UButton size="xs" variant="ghost" @click="startEdit(comment)">
            {{ $t('contents.editComment') }}
          </UButton>
          <UButton size="xs" variant="ghost" color="error" @click="deleteComment(comment.id)">
            {{ $t('contents.deleteComment') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- New comment form -->
    <div class="flex gap-3 pt-4 border-t border-(--ui-border)">
      <img v-if="user" :src="userAvatarUrl(user)" :alt="user.email" class="w-8 h-8 rounded-full shrink-0 mt-0.5" />
      <div class="flex-1 space-y-2">
        <MentionTextarea
          v-model="newBody"
          v-model:mentioned-user-ids="newMentionedUserIds"
          :placeholder="$t('contents.commentPlaceholder')"
          :rows="2"
        />
        <UButton size="sm" :loading="posting" :disabled="!newBody.trim()" @click="postComment">
          {{ $t('contents.addComment') }}
        </UButton>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="deleteOpen">
      <template #body>
        <p class="text-sm">{{ $t('contents.deleteCommentConfirm') }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="deleteOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton color="error" @click="confirmDelete">{{ $t('common.delete') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
