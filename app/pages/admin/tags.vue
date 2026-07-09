<script setup lang="ts">
import type { SeoGeo } from '~/components/SeoGeoFields.vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

interface Tag extends SeoGeo {
  id: string
  name: string
  slug: string
}
const { api } = useAdminApi()
const tags = ref<Tag[]>([])
const loading = ref(true)
const search = ref('')

async function load() {
  loading.value = true
  try {
    tags.value = await api<Tag[]>('/admin/tags')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return tags.value
  return tags.value.filter((t) => (t.name + ' ' + t.slug).toLowerCase().includes(q))
})

function emptyForm(): SeoGeo & { name: string; slug: string } {
  return {
    name: '',
    slug: '',
    description: '',
    intro: '',
    faq: [],
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    ogImage: '',
  }
}
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const form = reactive(emptyForm())
const saving = ref(false)
const error = ref('')

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  error.value = ''
  modalOpen.value = true
}
function openEdit(t: Tag) {
  editingId.value = t.id
  Object.assign(form, {
    name: t.name,
    slug: t.slug ?? '',
    description: t.description ?? '',
    intro: t.intro ?? '',
    faq: Array.isArray(t.faq) ? JSON.parse(JSON.stringify(t.faq)) : [],
    metaTitle: t.metaTitle ?? '',
    metaDescription: t.metaDescription ?? '',
    canonicalUrl: t.canonicalUrl ?? '',
    ogImage: t.ogImage ?? '',
  })
  error.value = ''
  modalOpen.value = true
}

async function save() {
  if (form.name.trim().length < 2) {
    error.value = 'Informe um nome com pelo menos 2 caracteres.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const body = { ...form, name: form.name.trim(), slug: form.slug.trim() }
    if (editingId.value) await api(`/admin/tags/${editingId.value}`, { method: 'PATCH', body })
    else await api('/admin/tags', { method: 'POST', body })
    modalOpen.value = false
    await load()
  } catch {
    error.value = 'Erro ao salvar a tag.'
  } finally {
    saving.value = false
  }
}
async function remove(t: Tag) {
  if (!confirm(`Excluir a tag "${t.name}"?`)) return
  await api(`/admin/tags/${t.id}`, { method: 'DELETE' })
  await load()
}

const hasSeo = (t: Tag) =>
  !!(t.metaTitle || t.metaDescription || t.intro || (t.faq && t.faq.length))
</script>

<template>
  <div class="p-4 sm:p-6 max-w-3xl">
    <PageHeader title="Tags" subtitle="Marcadores usados nos guias, com SEO e GEO próprios.">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none"
          @click="openCreate"
        >
          <AdminIcon name="plus" :size="16" /> Nova tag
        </button>
      </template>
    </PageHeader>

    <!-- busca -->
    <div class="relative max-w-sm mb-4">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <AdminIcon name="search" :size="16" />
      </span>
      <input
        v-model="search"
        placeholder="Buscar tag…"
        class="w-full h-[40px] pl-9 pr-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
      />
    </div>

    <div class="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
      <div
        v-for="t in filtered"
        :key="t.id"
        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[14px] font-semibold text-slate-900">#{{ t.name }}</span>
            <span
              v-if="hasSeo(t)"
              class="inline-flex items-center h-[18px] px-1.5 rounded bg-brand-soft text-brand text-[10px] font-bold"
              >SEO</span
            >
          </div>
          <div class="text-[12px] text-slate-400 truncate">/{{ t.slug }}</div>
        </div>
        <button
          class="text-[13px] font-semibold text-slate-600 cursor-pointer bg-transparent border-none hover:text-brand"
          @click="openEdit(t)"
        >
          Editar
        </button>
        <button
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer bg-transparent border-none"
          title="Excluir"
          @click="remove(t)"
        >
          <AdminIcon name="trash" :size="16" />
        </button>
      </div>
      <SkeletonTable v-if="loading" :rows="6" :cols="3" />
      <div
        v-else-if="filtered.length === 0"
        class="px-4 py-10 text-center text-slate-400 text-[14px]"
      >
        {{ search ? 'Nenhuma tag encontrada.' : 'Nenhuma tag ainda.' }}
      </div>
    </div>

    <!-- modal criar/editar -->
    <AppModal
      v-model="modalOpen"
      size="lg"
      :title="editingId ? 'Editar tag' : 'Nova tag'"
      subtitle="O slug é gerado automaticamente a partir do nome."
    >
      <div class="flex flex-col gap-5">
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Nome <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              placeholder="Ex.: ITBI"
              class="w-full h-[40px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
              @keydown.enter.prevent="save"
            />
          </div>
          <div>
            <label class="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Slug
              <InfoTip>Parte da URL: /guias/tag/<b>slug</b>. Deixe vazio para gerar do nome. Mudar afeta o link público.</InfoTip>
            </label>
            <input
              v-model="form.slug"
              :placeholder="editingId ? '' : 'gerado do nome'"
              class="w-full h-[40px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 font-mono text-[13px]"
            />
          </div>
        </div>
        <SeoGeoFields :data="form" entity="tag" />
        <p v-if="error" class="text-[13px] font-semibold text-red-600 m-0">{{ error }}</p>
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
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>
