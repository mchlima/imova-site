<script setup lang="ts">
import {
  type DevelopmentStatus,
  statusLabel,
  statusBadgeStyle,
} from '~/utils/developmentModel'

definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

interface DevRow {
  id: string
  slug: string
  name: string
  bairro: string
  cidade: string
  uf: string
  status: DevelopmentStatus
  published: boolean
  updatedAt: string
  _count: { typologies: number; images: number }
}

const { api } = useAdminApi()
const rows = ref<DevRow[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    rows.value = await api<DevRow[]>('/admin/developments')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const search = ref('')
const fPub = ref('')
const pubOptions = [
  { value: '', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Rascunhos' },
]
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (q && !(r.name + ' ' + r.bairro + ' ' + r.cidade).toLowerCase().includes(q)) return false
    if (fPub.value === 'published' && !r.published) return false
    if (fPub.value === 'draft' && r.published) return false
    return true
  })
})

// ── novo empreendimento ──
const modalOpen = ref(false)
const newName = ref('')
const creating = ref(false)
const createError = ref('')
function openCreate() {
  newName.value = ''
  createError.value = ''
  modalOpen.value = true
}
async function create() {
  if (newName.value.trim().length < 2) {
    createError.value = 'Informe um nome com pelo menos 2 caracteres.'
    return
  }
  creating.value = true
  try {
    const d = await api<{ id: string }>('/admin/developments', {
      method: 'POST',
      body: { name: newName.value.trim() },
    })
    await navigateTo(`/admin/imoveis/${d.id}`)
  } catch {
    createError.value = 'Erro ao criar o empreendimento.'
    creating.value = false
  }
}

// ── ações de linha ──
const menuId = ref<string | null>(null)
const busy = ref<string | null>(null)
function toggleMenu(id: string) {
  menuId.value = menuId.value === id ? null : id
}
async function act(r: DevRow, path: string) {
  menuId.value = null
  busy.value = r.id
  try {
    await api(`/admin/developments/${r.id}/${path}`, { method: 'PATCH' })
    await load()
  } finally {
    busy.value = null
  }
}
async function remove(r: DevRow) {
  menuId.value = null
  if (!confirm(`Excluir "${r.name}"? Remove também as imagens do R2. Esta ação não pode ser desfeita.`)) return
  busy.value = r.id
  try {
    await api(`/admin/developments/${r.id}`, { method: 'DELETE' })
    await load()
  } finally {
    busy.value = null
  }
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
    <PageHeader title="Imóveis" subtitle="Empreendimentos do catálogo.">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none"
          @click="openCreate"
        >
          <AdminIcon name="plus" :size="16" /> Novo empreendimento
        </button>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-2.5 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-[380px]">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <AdminIcon name="search" :size="16" />
        </span>
        <input
          v-model="search"
          placeholder="Buscar por nome, bairro ou cidade…"
          class="w-full h-[40px] pl-9 pr-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
        />
      </div>
      <select v-model="fPub" :class="selectCls">
        <option v-for="o in pubOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl overflow-visible shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 text-left">
            <th class="py-3 px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Empreendimento</th>
            <th class="py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Estágio</th>
            <th class="py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Publicação</th>
            <th class="py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400">Atualizado</th>
            <th class="py-3 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in filtered"
            :key="r.id"
            class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            :class="{ 'opacity-60': busy === r.id }"
          >
            <td class="py-3 px-4">
              <NuxtLink :to="`/admin/imoveis/${r.id}`" class="text-[14px] font-semibold text-slate-900 no-underline hover:text-brand">{{ r.name }}</NuxtLink>
              <div class="text-[12.5px] text-slate-400">{{ r.bairro || '—' }}<span v-if="r.cidade"> · {{ r.cidade }}/{{ r.uf }}</span></div>
            </td>
            <td class="py-3 px-3">
              <span class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold" :style="statusBadgeStyle(r.status)">{{ statusLabel(r.status) }}</span>
            </td>
            <td class="py-3 px-3">
              <span
                class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                :class="r.published ? 'bg-brand-soft text-brand' : 'bg-slate-100 text-slate-600'"
                >{{ r.published ? 'Publicado' : 'Rascunho' }}</span
              >
            </td>
            <td class="py-3 px-3 text-[12.5px] text-slate-400 whitespace-nowrap">{{ fmtDate(r.updatedAt) }}</td>
            <td class="py-3 px-4 text-right relative">
              <button
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer bg-transparent border-none"
                @click.stop="toggleMenu(r.id)"
              >
                <AdminIcon name="dots" :size="18" />
              </button>
              <template v-if="menuId === r.id">
                <div class="fixed inset-0 z-20" @click="menuId = null"></div>
                <div class="absolute right-4 top-12 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] overflow-hidden py-1 text-left">
                  <NuxtLink :to="`/admin/imoveis/${r.id}`" class="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 no-underline hover:bg-slate-50">
                    <AdminIcon name="draft" :size="15" /> Editar
                  </NuxtLink>
                  <a v-if="r.published" :href="`/${r.slug}`" target="_blank" class="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 no-underline hover:bg-slate-50">
                    <AdminIcon name="eye" :size="15" /> Ver no site
                  </a>
                  <div class="h-px bg-slate-100 my-1"></div>
                  <button
                    v-if="!r.published"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-brand hover:bg-brand-soft cursor-pointer bg-transparent border-none text-left"
                    @click="act(r, 'publish')"
                  >
                    <AdminIcon name="publish" :size="15" /> Publicar
                  </button>
                  <button
                    v-else
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
                    @click="act(r, 'unpublish')"
                  >
                    <AdminIcon name="draft" :size="15" /> Voltar para rascunho
                  </button>
                  <div class="h-px bg-slate-100 my-1"></div>
                  <button
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-red-600 hover:bg-red-50 cursor-pointer bg-transparent border-none text-left"
                    @click="remove(r)"
                  >
                    <AdminIcon name="trash" :size="15" /> Excluir
                  </button>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <SkeletonTable v-if="loading" :rows="6" :cols="4" />
      <div v-else-if="filtered.length === 0" class="py-10 text-center text-slate-400 text-[14px]">
        {{ rows.length === 0 ? 'Nenhum empreendimento ainda. Clique em "Novo empreendimento".' : 'Nenhum empreendimento corresponde aos filtros.' }}
      </div>
    </div>

    <AppModal v-model="modalOpen" size="sm" title="Novo empreendimento" subtitle="Comece pelo nome — você completa o resto no editor.">
      <div>
        <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Nome</label>
        <input
          v-model="newName"
          autofocus
          placeholder="Ex.: Ares do Horto — Pau Brasil"
          class="w-full h-[42px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          @keydown.enter.prevent="create"
        />
        <p v-if="createError" class="text-[13px] font-semibold text-red-600 mt-2 mb-0">{{ createError }}</p>
      </div>
      <template #footer>
        <button class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100" @click="modalOpen = false">Cancelar</button>
        <button class="h-[38px] px-5 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none disabled:opacity-60" :disabled="creating" @click="create">
          {{ creating ? 'Criando…' : 'Criar e editar' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>
