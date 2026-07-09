<script setup lang="ts">
import type { SeoGeo } from '~/components/SeoGeoFields.vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

interface Category extends SeoGeo {
  id: string
  name: string
  slug: string
  level: number
  parentId: string | null
  order: number
}
const { api } = useAdminApi()
const cats = ref<Category[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    cats.value = await api<Category[]>('/admin/categories')
  } finally {
    loading.value = false
  }
}
onMounted(load)

// árvore (raiz → filhos → netos) para exibição indentada
const ordered = computed(() => {
  const out: Category[] = []
  const add = (parentId: string | null) => {
    cats.value
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .forEach((c) => {
        out.push(c)
        add(c.id)
      })
  }
  add(null)
  return out
})

// só nível 1 ou 2 pode ser pai (filho não passa de 3)
const parentOptions = computed(() =>
  cats.value
    .filter((c) => c.level < 3 && c.id !== editingId.value)
    .map((c) => ({ value: c.id, label: `${'— '.repeat(c.level - 1)}${c.name}` })),
)

function emptyForm(): SeoGeo & { name: string; slug: string; parentId: string } {
  return {
    name: '',
    slug: '',
    parentId: '',
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
function openEdit(c: Category) {
  editingId.value = c.id
  Object.assign(form, {
    name: c.name,
    slug: c.slug ?? '',
    parentId: c.parentId ?? '',
    description: c.description ?? '',
    intro: c.intro ?? '',
    faq: Array.isArray(c.faq) ? JSON.parse(JSON.stringify(c.faq)) : [],
    metaTitle: c.metaTitle ?? '',
    metaDescription: c.metaDescription ?? '',
    canonicalUrl: c.canonicalUrl ?? '',
    ogImage: c.ogImage ?? '',
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
    // parentId só é enviado na criação (mudar o pai reposicionaria a árvore)
    const seo = {
      description: form.description,
      intro: form.intro,
      faq: form.faq,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      canonicalUrl: form.canonicalUrl,
      ogImage: form.ogImage,
    }
    if (editingId.value) {
      await api(`/admin/categories/${editingId.value}`, {
        method: 'PATCH',
        body: { name: form.name.trim(), slug: form.slug.trim(), ...seo },
      })
    } else {
      await api('/admin/categories', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim(),
          parentId: form.parentId || undefined,
          ...seo,
        },
      })
    }
    modalOpen.value = false
    await load()
  } catch {
    error.value = 'Erro ao salvar a categoria.'
  } finally {
    saving.value = false
  }
}
async function remove(c: Category) {
  if (!confirm(`Excluir "${c.name}" e suas subcategorias? Os posts serão desvinculados.`)) return
  await api(`/admin/categories/${c.id}`, { method: 'DELETE' })
  await load()
}

const editingLevel = computed(
  () => (editingId.value ? cats.value.find((c) => c.id === editingId.value)?.level : null),
)
const hasSeo = (c: Category) =>
  !!(c.metaTitle || c.metaDescription || c.intro || (c.faq && c.faq.length))
</script>

<template>
  <div class="p-4 sm:p-6 max-w-4xl">
    <PageHeader
      title="Categorias"
      subtitle="Taxonomia de até 3 níveis (categoria → subcategoria → tópico), com SEO e GEO."
    >
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none"
          @click="openCreate"
        >
          <AdminIcon name="plus" :size="16" /> Nova categoria
        </button>
      </template>
    </PageHeader>

    <div class="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
      <div
        v-for="c in ordered"
        :key="c.id"
        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
        :style="{ paddingLeft: 16 + (c.level - 1) * 24 + 'px' }"
      >
        <span
          class="inline-flex items-center h-[18px] px-1.5 rounded text-[10px] font-bold shrink-0"
          :class="
            c.level === 1
              ? 'bg-brand-soft text-brand'
              : c.level === 2
                ? 'bg-[#E4ECFB] text-[#1E40AF]'
                : 'bg-slate-100 text-slate-500'
          "
          >N{{ c.level }}</span
        >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[14px] text-slate-900 truncate">{{ c.name }}</span>
            <span
              v-if="hasSeo(c)"
              class="inline-flex items-center h-[18px] px-1.5 rounded bg-brand-soft text-brand text-[10px] font-bold shrink-0"
              >SEO</span
            >
          </div>
          <div class="text-[12px] text-slate-400 truncate">/{{ c.slug }}</div>
        </div>
        <button
          class="text-[13px] font-semibold text-slate-600 cursor-pointer bg-transparent border-none hover:text-brand"
          @click="openEdit(c)"
        >
          Editar
        </button>
        <button
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer bg-transparent border-none"
          title="Excluir"
          @click="remove(c)"
        >
          <AdminIcon name="trash" :size="16" />
        </button>
      </div>
      <SkeletonTable v-if="loading" :rows="6" :cols="3" />
      <div
        v-else-if="ordered.length === 0"
        class="px-4 py-10 text-center text-slate-400 text-[14px]"
      >
        Nenhuma categoria ainda.
      </div>
    </div>

    <!-- modal criar/editar -->
    <AppModal
      v-model="modalOpen"
      size="lg"
      :title="editingId ? 'Editar categoria' : 'Nova categoria'"
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
              placeholder="Ex.: Financiamento"
              class="w-full h-[40px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
          <div>
            <label class="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Slug
              <InfoTip>Parte da URL: /guias/categoria/<b>slug</b>. Deixe vazio para gerar do nome. Mudar afeta o link público.</InfoTip>
            </label>
            <input
              v-model="form.slug"
              :placeholder="editingId ? '' : 'gerado do nome'"
              class="w-full h-[40px] px-3 text-[14px] border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 font-mono text-[13px]"
            />
          </div>
          <div v-if="!editingId">
            <label class="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 mb-1.5">
              Categoria pai
              <InfoTip>Deixe vazio para criar no nível 1. Define a posição na taxonomia.</InfoTip>
            </label>
            <SearchableSelect
              v-model="form.parentId"
              :options="parentOptions"
              placeholder="— Raiz (nível 1) —"
              search-placeholder="Buscar…"
            />
          </div>
          <div v-else class="flex items-end">
            <p class="text-[12.5px] text-slate-400 mb-2">
              Nível {{ editingLevel }} · a posição na árvore não é alterada aqui.
            </p>
          </div>
        </div>
        <SeoGeoFields :data="form" entity="categoria" />
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
