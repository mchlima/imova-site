<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'permission'],
  permission: 'users:manage',
})
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

interface Role {
  id: string
  key: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  _count: { users: number }
}
interface AdminUser {
  id: string
  name: string
  email: string
  active: boolean
  createdAt: string
  roleId: string | null
  roleRef: { id: string; key: string; name: string } | null
}
interface PermissionDef {
  key: string
  label: string
  hint?: string
}
interface PermissionGroup {
  key: string
  label: string
  permissions: PermissionDef[]
}

const { api } = useAdminApi()
const { user: me } = useAuth()

const users = ref<AdminUser[]>([])
const roles = ref<Role[]>([])
const catalog = ref<PermissionGroup[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [u, r, c] = await Promise.all([
      api<AdminUser[]>('/admin/users'),
      api<Role[]>('/admin/roles'),
      api<PermissionGroup[]>('/admin/roles/permissions'),
    ])
    users.value = u
    roles.value = r
    catalog.value = c
  } finally {
    loading.value = false
  }
}
onMounted(load)

const totalPermissions = computed(() =>
  catalog.value.reduce((n, g) => n + g.permissions.length, 0),
)
// a role de sistema guarda o coringa '*', então contamos "tudo" em vez de 1
const permCount = (r: Role) => (r.isSystem ? totalPermissions.value : r.permissions.length)

// ── usuário: criar / editar ──────────────────────────────────────────────
const userModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const error = ref('')
const form = reactive({ name: '', email: '', roleId: '', password: '', active: true })

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    email: '',
    roleId: roles.value.find((r) => !r.isSystem)?.id ?? roles.value[0]?.id ?? '',
    password: '',
    active: true,
  })
  error.value = ''
  userModal.value = true
}
function openEdit(u: AdminUser) {
  editingId.value = u.id
  Object.assign(form, {
    name: u.name,
    email: u.email,
    roleId: u.roleId ?? '',
    password: '',
    active: u.active,
  })
  error.value = ''
  userModal.value = true
}

const isSelf = computed(() => editingId.value === me.value?.id)

async function saveUser() {
  if (form.name.trim().length < 2) return (error.value = 'Informe o nome completo.')
  if (!form.email.includes('@')) return (error.value = 'Informe um e-mail válido.')
  if (!form.roleId) return (error.value = 'Escolha um perfil de acesso.')
  if (!editingId.value && (form.password.length < 8 || form.password.length > 32)) {
    return (error.value = 'A senha deve ter de 8 a 32 caracteres.')
  }

  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await api(`/admin/users/${editingId.value}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          roleId: form.roleId,
          active: form.active,
        },
      })
    } else {
      await api('/admin/users', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          roleId: form.roleId,
          password: form.password,
          active: form.active,
        },
      })
    }
    userModal.value = false
    await load()
  } catch (e) {
    error.value = apiError(e, 'Erro ao salvar o usuário.')
  } finally {
    saving.value = false
  }
}

// ── usuário: redefinir senha ─────────────────────────────────────────────
const pwdModal = ref(false)
const pwdTarget = ref<AdminUser | null>(null)
const newPassword = ref('')
const pwdSaving = ref(false)
const pwdError = ref('')
const pwdDone = ref(false)

function openPassword(u: AdminUser) {
  pwdTarget.value = u
  newPassword.value = ''
  pwdError.value = ''
  pwdDone.value = false
  pwdModal.value = true
}
async function savePassword() {
  if (newPassword.value.length < 8 || newPassword.value.length > 32) {
    return (pwdError.value = 'A senha deve ter de 8 a 32 caracteres.')
  }
  pwdSaving.value = true
  pwdError.value = ''
  try {
    await api(`/admin/users/${pwdTarget.value!.id}/password`, {
      method: 'POST',
      body: { password: newPassword.value },
    })
    // não fechamos o modal: quem administra ainda precisa copiar a senha
    pwdDone.value = true
  } catch (e) {
    pwdError.value = apiError(e, 'Erro ao redefinir a senha.')
  } finally {
    pwdSaving.value = false
  }
}

async function removeUser(u: AdminUser) {
  if (!confirm(`Excluir o acesso de ${u.name}? Para preservar o histórico, prefira desativar.`)) return
  try {
    await api(`/admin/users/${u.id}`, { method: 'DELETE' })
    await load()
  } catch (e) {
    alert(apiError(e, 'Não foi possível excluir este usuário.'))
  }
}

// ── perfis de acesso ─────────────────────────────────────────────────────
const roleModal = ref(false)
const roleDraft = ref<Role | null>(null)
const draftPerms = ref<Set<string>>(new Set())
const roleSaving = ref(false)
const roleError = ref('')

function openRole(r: Role) {
  if (r.isSystem) return
  roleDraft.value = r
  draftPerms.value = new Set(r.permissions)
  roleError.value = ''
  roleModal.value = true
}
function togglePerm(key: string) {
  const s = new Set(draftPerms.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  draftPerms.value = s
}
function toggleGroup(g: PermissionGroup) {
  const keys = g.permissions.map((p) => p.key)
  const all = keys.every((k) => draftPerms.value.has(k))
  const s = new Set(draftPerms.value)
  for (const k of keys) (all ? s.delete(k) : s.add(k))
  draftPerms.value = s
}
const groupState = (g: PermissionGroup) => {
  const keys = g.permissions.map((p) => p.key)
  const on = keys.filter((k) => draftPerms.value.has(k)).length
  return { on, all: on === keys.length, some: on > 0 && on < keys.length }
}

async function saveRole() {
  roleSaving.value = true
  roleError.value = ''
  try {
    await api(`/admin/roles/${roleDraft.value!.id}`, {
      method: 'PATCH',
      body: { permissions: [...draftPerms.value] },
    })
    roleModal.value = false
    await load()
  } catch (e) {
    roleError.value = apiError(e, 'Erro ao salvar o perfil.')
  } finally {
    roleSaving.value = false
  }
}

// mensagem do backend (409/403 trazem o motivo exato) em vez de um erro genérico
function apiError(e: unknown, fallback: string) {
  const msg = (e as { data?: { message?: string | string[] } })?.data?.message
  if (Array.isArray(msg)) return msg[0] ?? fallback
  return msg || fallback
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="p-4 sm:p-6 max-w-4xl">
    <PageHeader
      title="Usuários"
      subtitle="Quem acessa o CRM e o que cada um pode fazer."
    >
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none"
          @click="openCreate"
        >
          <AdminIcon name="plus" :size="16" /> Novo usuário
        </button>
      </template>
    </PageHeader>

    <!-- USUÁRIOS -->
    <div class="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden mb-8">
      <SkeletonTable v-if="loading" :rows="3" :cols="4" />
      <div
        v-for="u in users"
        v-else
        :key="u.id"
        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
        :class="u.active ? '' : 'opacity-60'"
      >
        <span
          class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-soft text-brand text-[12.5px] font-bold shrink-0"
        >
          {{ u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() }}
        </span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[14px] font-semibold text-slate-900">{{ u.name }}</span>
            <span v-if="u.id === me?.id" class="text-[11px] font-bold text-slate-400">(você)</span>
            <span
              v-if="u.roleRef"
              class="inline-flex items-center h-[19px] px-2 rounded-md bg-slate-100 text-slate-600 text-[10.5px] font-bold"
              >{{ u.roleRef.name }}</span
            >
            <span
              v-else
              class="inline-flex items-center h-[19px] px-2 rounded-md bg-amber-100 text-amber-700 text-[10.5px] font-bold"
              >Sem perfil</span
            >
            <span
              v-if="!u.active"
              class="inline-flex items-center h-[19px] px-2 rounded-md bg-red-50 text-red-600 text-[10.5px] font-bold"
              >Desativado</span
            >
          </div>
          <div class="text-[12px] text-slate-400 truncate">
            {{ u.email }} · desde {{ fmtDate(u.createdAt) }}
          </div>
        </div>
        <button
          class="text-[13px] font-semibold text-slate-600 cursor-pointer bg-transparent border-none hover:text-brand"
          @click="openPassword(u)"
        >
          Senha
        </button>
        <button
          class="text-[13px] font-semibold text-slate-600 cursor-pointer bg-transparent border-none hover:text-brand"
          @click="openEdit(u)"
        >
          Editar
        </button>
        <button
          v-if="u.id !== me?.id"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer bg-transparent border-none"
          title="Excluir"
          @click="removeUser(u)"
        >
          <AdminIcon name="trash" :size="16" />
        </button>
      </div>
    </div>

    <!-- PERFIS DE ACESSO -->
    <PageHeader
      title="Perfis de acesso"
      subtitle="Um perfil é um pacote de permissões. Edite o que cada perfil pode fazer."
    />
    <div class="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
      <SkeletonTable v-if="loading" :rows="2" :cols="3" />
      <div
        v-for="r in roles"
        v-else
        :key="r.id"
        class="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[14px] font-semibold text-slate-900">{{ r.name }}</span>
            <span
              v-if="r.isSystem"
              class="inline-flex items-center h-[19px] px-2 rounded-md bg-slate-900 text-white text-[10.5px] font-bold"
              >Sistema</span
            >
          </div>
          <div class="text-[12px] text-slate-400">
            {{ r.description }}
          </div>
          <div class="text-[12px] text-slate-500 mt-0.5">
            {{ permCount(r) }} de {{ totalPermissions }} permissões ·
            {{ r._count.users }} usuário(s)
          </div>
        </div>
        <button
          v-if="!r.isSystem"
          class="text-[13px] font-semibold text-slate-600 cursor-pointer bg-transparent border-none hover:text-brand"
          @click="openRole(r)"
        >
          Editar permissões
        </button>
        <span v-else class="text-[12.5px] text-slate-400 pr-1">Acesso total</span>
      </div>
    </div>

    <!-- modal: criar/editar usuário -->
    <AppModal
      v-model="userModal"
      :title="editingId ? 'Editar usuário' : 'Novo usuário'"
      :subtitle="editingId ? 'A senha é alterada em “Senha”.' : 'Defina a senha e repasse com segurança.'"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
            Nome <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            placeholder="Ex.: Maria Lima"
            class="w-full h-[40px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
        <div>
          <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
            E-mail <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            autocomplete="off"
            placeholder="maria@exemplo.com"
            class="w-full h-[40px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
        <div>
          <label class="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 mb-1.5">
            Perfil de acesso <span class="text-red-500">*</span>
            <InfoTip>Define o que a pessoa pode fazer. Edite os perfis na seção “Perfis de acesso”.</InfoTip>
          </label>
          <select
            v-model="form.roleId"
            :disabled="isSelf"
            class="w-full h-[40px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
          <p v-if="isSelf" class="text-[12px] text-slate-400 mt-1 m-0">
            Você não pode alterar o próprio perfil de acesso.
          </p>
        </div>

        <div v-if="!editingId">
          <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
            Senha <span class="text-red-500">*</span>
          </label>
          <PasswordField v-model="form.password" />
        </div>

        <label
          v-if="!isSelf"
          class="flex items-center gap-2.5 text-[13.5px] text-slate-700 cursor-pointer select-none"
        >
          <input v-model="form.active" type="checkbox" class="w-4 h-4 accent-brand cursor-pointer" />
          Acesso ativo
          <InfoTip>Desativar bloqueia o login e a sessão atual, sem apagar o histórico.</InfoTip>
        </label>

        <p v-if="error" class="text-[13px] font-semibold text-red-600 m-0">{{ error }}</p>
      </div>
      <template #footer>
        <button
          class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100"
          @click="userModal = false"
        >
          Cancelar
        </button>
        <button
          class="h-[38px] px-5 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none disabled:opacity-60"
          :disabled="saving"
          @click="saveUser"
        >
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </template>
    </AppModal>

    <!-- modal: redefinir senha -->
    <AppModal
      v-model="pwdModal"
      :title="`Senha de ${pwdTarget?.name ?? ''}`"
      subtitle="Gere uma senha, copie e repasse por um canal seguro. Ela não é exibida de novo."
    >
      <div class="flex flex-col gap-3">
        <PasswordField v-model="newPassword" />
        <p v-if="pwdDone" class="text-[13px] font-semibold text-emerald-600 m-0">
          Senha alterada. Copie agora — ela não será mostrada novamente.
        </p>
        <p v-if="pwdError" class="text-[13px] font-semibold text-red-600 m-0">{{ pwdError }}</p>
      </div>
      <template #footer>
        <button
          class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100"
          @click="pwdModal = false"
        >
          {{ pwdDone ? 'Fechar' : 'Cancelar' }}
        </button>
        <button
          class="h-[38px] px-5 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none disabled:opacity-60"
          :disabled="pwdSaving"
          @click="savePassword"
        >
          {{ pwdSaving ? 'Salvando…' : 'Definir senha' }}
        </button>
      </template>
    </AppModal>

    <!-- modal: permissões do perfil -->
    <AppModal
      v-model="roleModal"
      size="lg"
      :title="`Permissões — ${roleDraft?.name ?? ''}`"
      subtitle="Marque o que este perfil pode fazer. Vale na hora, inclusive para quem já está logado."
    >
      <div class="flex flex-col gap-5">
        <div v-for="g in catalog" :key="g.key">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[12px] font-bold uppercase tracking-[0.06em] text-slate-400">
              {{ g.label }}
            </span>
            <button
              type="button"
              class="text-[12px] font-semibold text-brand cursor-pointer bg-transparent border-none hover:underline"
              @click="toggleGroup(g)"
            >
              {{ groupState(g).all ? 'Desmarcar todas' : 'Marcar todas' }}
            </button>
          </div>
          <div class="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            <label
              v-for="p in g.permissions"
              :key="p.key"
              class="flex items-start gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <input
                type="checkbox"
                :checked="draftPerms.has(p.key)"
                class="w-4 h-4 mt-0.5 accent-brand cursor-pointer shrink-0"
                @change="togglePerm(p.key)"
              />
              <span class="flex-1 min-w-0">
                <span class="block text-[13.5px] font-medium text-slate-800">{{ p.label }}</span>
                <span v-if="p.hint" class="block text-[12px] text-amber-700 mt-0.5">{{ p.hint }}</span>
                <span class="block text-[11px] font-mono text-slate-300">{{ p.key }}</span>
              </span>
            </label>
          </div>
        </div>
        <p v-if="roleError" class="text-[13px] font-semibold text-red-600 m-0">{{ roleError }}</p>
      </div>
      <template #footer>
        <button
          class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100"
          @click="roleModal = false"
        >
          Cancelar
        </button>
        <button
          class="h-[38px] px-5 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none disabled:opacity-60"
          :disabled="roleSaving"
          @click="saveRole"
        >
          {{ roleSaving ? 'Salvando…' : 'Salvar permissões' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>
