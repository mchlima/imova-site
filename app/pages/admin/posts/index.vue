<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

type Status = 'draft' | 'published' | 'changed' | 'archived'
interface PostRow {
  id: string
  title: string
  slug: string
  status: Status
  coverImageUrl: string
  categoryId: string | null
  category: string | null
  tags: { id: string; name: string }[]
  tagIds: string[]
  author: string
  updatedAt: string
}
interface Opt {
  id: string
  name: string
}

const { api } = useAdminApi()
const posts = ref<PostRow[]>([])
const cats = ref<Opt[]>([])
const tags = ref<Opt[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [p, c, t] = await Promise.all([
      api<PostRow[]>('/admin/posts'),
      api<Opt[]>('/admin/categories'),
      api<Opt[]>('/admin/tags'),
    ])
    posts.value = p
    cats.value = c
    tags.value = t
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ── filtros ──
const search = ref('')
const fStatus = ref('')
const fCategory = ref('')
const fTag = ref('')

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'published', label: 'Publicado' },
  { value: 'changed', label: 'Alterações não publicadas' },
  { value: 'archived', label: 'Arquivado' },
]
const catOptions = computed(() => [
  { value: '', label: 'Todas as categorias' },
  ...cats.value.map((c) => ({ value: c.id, label: c.name })),
])
const tagOptions = computed(() => [
  { value: '', label: 'Todas as tags' },
  ...tags.value.map((t) => ({ value: t.id, label: t.name })),
])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return posts.value.filter((p) => {
    if (q && !(p.title + ' ' + p.slug).toLowerCase().includes(q)) return false
    if (fStatus.value && p.status !== fStatus.value) return false
    if (fCategory.value && p.categoryId !== fCategory.value) return false
    if (fTag.value && !p.tagIds.includes(fTag.value)) return false
    return true
  })
})
const activeFilters = computed(
  () => [fStatus.value, fCategory.value, fTag.value].filter(Boolean).length,
)
function clearFilters() {
  fStatus.value = ''
  fCategory.value = ''
  fTag.value = ''
  search.value = ''
}

// ── novo post (modal) ──
const modalOpen = ref(false)
const newTitle = ref('')
const creating = ref(false)
const createError = ref('')
function openCreate() {
  newTitle.value = ''
  createError.value = ''
  modalOpen.value = true
}
async function create() {
  if (newTitle.value.trim().length < 2) {
    createError.value = 'Informe um título com pelo menos 2 caracteres.'
    return
  }
  creating.value = true
  try {
    const p = await api<{ id: string }>('/admin/posts', {
      method: 'POST',
      body: { title: newTitle.value.trim() },
    })
    await navigateTo(`/admin/posts/${p.id}`)
  } catch {
    createError.value = 'Erro ao criar o post.'
    creating.value = false
  }
}

// ── ações de linha ──
const menuId = ref<string | null>(null)
const busy = ref<string | null>(null)
function toggleMenu(id: string) {
  menuId.value = menuId.value === id ? null : id
}
async function act(p: PostRow, path: string) {
  menuId.value = null
  busy.value = p.id
  try {
    await api(`/admin/posts/${p.id}/${path}`, { method: 'POST' })
    await load()
  } finally {
    busy.value = null
  }
}
async function remove(p: PostRow) {
  menuId.value = null
  if (!confirm(`Excluir o post "${p.title}"? Esta ação não pode ser desfeita.`)) return
  busy.value = p.id
  try {
    await api(`/admin/posts/${p.id}`, { method: 'DELETE' })
    await load()
  } finally {
    busy.value = null
  }
}

const statusInfo: Record<Status, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-600' },
  published: { label: 'Publicado', cls: 'bg-brand-soft text-brand' },
  changed: { label: 'Alterações não publicadas', cls: 'bg-[#FEF6E7] text-amber-700' },
  archived: { label: 'Arquivado', cls: 'bg-slate-200 text-slate-500' },
}
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
const selectCls =
  'h-[40px] px-3 text-[13.5px] text-slate-700 bg-white border border-slate-300 rounded-lg outline-none focus:border-brand cursor-pointer'
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader title="Posts" subtitle="Guias do site.">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none"
          @click="openCreate"
        >
          <AdminIcon name="plus" :size="16" /> Novo post
        </button>
      </template>
    </PageHeader>

    <!-- filtros -->
    <div class="flex flex-wrap items-center gap-2.5 mb-4">
      <div class="relative flex-1 min-w-[200px]">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <AdminIcon name="search" :size="16" />
        </span>
        <input
          v-model="search"
          placeholder="Buscar por título…"
          class="w-full h-[40px] pl-9 pr-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
        />
      </div>
      <select v-model="fStatus" :class="selectCls">
        <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="fCategory" :class="selectCls">
        <option v-for="o in catOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="fTag" :class="selectCls">
        <option v-for="o in tagOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <button
        v-if="activeFilters || search"
        class="h-[40px] px-3 text-[13px] font-semibold text-slate-500 hover:text-slate-800 bg-transparent border-none cursor-pointer"
        @click="clearFilters"
      >
        Limpar
      </button>
    </div>

    <div
      class="bg-white border border-slate-200 rounded-xl overflow-visible shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 text-left">
            <th class="py-3 px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Título</th>
            <th class="py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Categoria</th>
            <th class="py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Status</th>
            <th class="py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Autor</th>
            <th class="py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Atualizado</th>
            <th class="py-3 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in filtered"
            :key="p.id"
            class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            :class="{ 'opacity-60': busy === p.id }"
          >
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-[52px] h-[34px] rounded-md overflow-hidden shrink-0 border border-slate-200 bg-slate-100"
                >
                  <img
                    v-if="p.coverImageUrl"
                    :src="p.coverImageUrl"
                    :alt="p.title"
                    loading="lazy"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-slate-300"
                    title="Sem capa"
                  >
                    <AdminIcon name="posts" :size="15" />
                  </div>
                </div>
                <NuxtLink
                  :to="`/admin/posts/${p.id}`"
                  class="text-[14px] font-semibold text-slate-900 no-underline hover:text-brand"
                  >{{ p.title }}</NuxtLink
                >
              </div>
            </td>
            <td class="py-3 px-3 text-[13px] text-slate-500">{{ p.category || '—' }}</td>
            <td class="py-3 px-3">
              <span
                class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                :class="statusInfo[p.status].cls"
                >{{ statusInfo[p.status].label }}</span
              >
            </td>
            <td class="py-3 px-3 text-[13px] text-slate-500">{{ p.author }}</td>
            <td class="py-3 px-3 text-[12.5px] text-slate-400 whitespace-nowrap">
              {{ fmtDate(p.updatedAt) }}
            </td>
            <td class="py-3 px-4 text-right relative">
              <button
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer bg-transparent border-none"
                @click.stop="toggleMenu(p.id)"
              >
                <AdminIcon name="dots" :size="18" />
              </button>
              <template v-if="menuId === p.id">
                <div class="fixed inset-0 z-20" @click="menuId = null"></div>
                <div
                  class="absolute right-4 top-12 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] overflow-hidden py-1 text-left"
                >
                  <NuxtLink
                    :to="`/admin/posts/${p.id}`"
                    class="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 no-underline hover:bg-slate-50"
                  >
                    <AdminIcon name="draft" :size="15" /> Editar
                  </NuxtLink>
                  <a
                    v-if="p.status === 'published' || p.status === 'changed'"
                    :href="`/guias/${p.slug}`"
                    target="_blank"
                    class="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 no-underline hover:bg-slate-50"
                  >
                    <AdminIcon name="eye" :size="15" /> Ver no site
                  </a>
                  <div class="h-px bg-slate-100 my-1"></div>
                  <button
                    v-if="p.status === 'draft' || p.status === 'changed'"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-brand hover:bg-brand-soft cursor-pointer bg-transparent border-none text-left"
                    @click="act(p, 'publish')"
                  >
                    <AdminIcon name="publish" :size="15" />
                    {{ p.status === 'changed' ? 'Publicar alterações' : 'Publicar' }}
                  </button>
                  <button
                    v-if="p.status === 'published' || p.status === 'changed'"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
                    @click="act(p, 'unpublish')"
                  >
                    <AdminIcon name="draft" :size="15" /> Voltar para rascunho
                  </button>
                  <button
                    v-if="p.status !== 'archived'"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
                    @click="act(p, 'archive')"
                  >
                    <AdminIcon name="archive" :size="15" /> Arquivar
                  </button>
                  <button
                    v-else
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
                    @click="act(p, 'unarchive')"
                  >
                    <AdminIcon name="archive" :size="15" /> Desarquivar
                  </button>
                  <div class="h-px bg-slate-100 my-1"></div>
                  <button
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-red-600 hover:bg-red-50 cursor-pointer bg-transparent border-none text-left"
                    @click="remove(p)"
                  >
                    <AdminIcon name="trash" :size="15" /> Excluir
                  </button>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="py-10 text-center text-slate-400 text-[14px]">Carregando…</div>
      <div
        v-else-if="filtered.length === 0"
        class="py-10 text-center text-slate-400 text-[14px]"
      >
        {{
          posts.length === 0
            ? 'Nenhum post ainda. Clique em "Novo post".'
            : 'Nenhum post corresponde aos filtros.'
        }}
      </div>
    </div>

    <!-- modal novo post -->
    <AppModal
      v-model="modalOpen"
      size="sm"
      title="Novo post"
      subtitle="Comece pelo título — você completa o resto no editor."
    >
      <div>
        <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Título</label>
        <input
          v-model="newTitle"
          autofocus
          placeholder="Ex.: Como usar o FGTS na compra do imóvel"
          class="w-full h-[42px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          @keydown.enter.prevent="create"
        />
        <p v-if="createError" class="text-[13px] font-semibold text-red-600 mt-2 mb-0">
          {{ createError }}
        </p>
      </div>
      <template #footer>
        <button
          class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100"
          @click="modalOpen = false"
        >
          Cancelar
        </button>
        <button
          class="h-[38px] px-5 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none disabled:opacity-60"
          :disabled="creating"
          @click="create"
        >
          {{ creating ? 'Criando…' : 'Criar e editar' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>
