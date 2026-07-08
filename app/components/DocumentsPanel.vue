<script setup lang="ts">
import { type DocumentItem, DOC_CATEGORIES, DOC_ACCEPT, DOC_MAX_BYTES } from '~/utils/documentModel'

// contactId = dono dos documentos. opportunityId (opcional) = contexto de envio;
// quando presente, separa "desta oportunidade" dos demais do contato (reutilizáveis).
const props = defineProps<{ contactId: string | null | undefined; opportunityId?: string }>()

const apiBase = useRuntimeConfig().public.apiBase
const docs = ref<DocumentItem[]>([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const category = ref('rg_cpf')
const categoryLabel = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

async function load() {
  if (!props.contactId) {
    docs.value = []
    return
  }
  loading.value = true
  try {
    docs.value = await $fetch<DocumentItem[]>(`/documents/contact/${props.contactId}`, {
      baseURL: apiBase,
      credentials: 'include',
    })
  } catch {
    /* mantém o que tiver */
  } finally {
    loading.value = false
  }
}
watch(() => props.contactId, load, { immediate: true })

// desta oportunidade × demais do contato (reutilizáveis)
const docsHere = computed(() =>
  props.opportunityId ? docs.value.filter((d) => d.opportunityId === props.opportunityId) : docs.value,
)
const docsOther = computed(() =>
  props.opportunityId ? docs.value.filter((d) => d.opportunityId !== props.opportunityId) : [],
)

function pickFile() {
  error.value = ''
  if (category.value === 'outro' && !categoryLabel.value.trim()) {
    error.value = 'Descreva o tipo do documento (Outro).'
    return
  }
  fileInput.value?.click()
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permite reenviar o mesmo arquivo
  if (!file || !props.contactId) return
  if (file.size > DOC_MAX_BYTES) {
    error.value = 'Arquivo acima de 25 MB.'
    return
  }
  uploading.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('contactId', props.contactId)
    if (props.opportunityId) form.append('opportunityId', props.opportunityId)
    form.append('category', category.value)
    if (category.value === 'outro') form.append('categoryLabel', categoryLabel.value.trim())
    await $fetch('/documents', { baseURL: apiBase, method: 'POST', credentials: 'include', body: form })
    categoryLabel.value = ''
    await load()
  } catch (err: any) {
    error.value = err?.data?.message || 'Falha ao enviar o documento.'
  } finally {
    uploading.value = false
  }
}

async function openDoc(d: DocumentItem, download = false) {
  try {
    const { url } = await $fetch<{ url: string }>(`/documents/${d.id}/url`, {
      baseURL: apiBase,
      credentials: 'include',
      params: download ? { download: '1' } : {},
    })
    window.open(url, '_blank')
  } catch {
    error.value = 'Não foi possível abrir o documento.'
  }
}

async function removeDoc(d: DocumentItem) {
  if (!confirm(`Excluir "${d.fileName}"? Esta ação não pode ser desfeita.`)) return
  try {
    await $fetch(`/documents/${d.id}`, { baseURL: apiBase, method: 'DELETE', credentials: 'include' })
    await load()
  } catch {
    error.value = 'Não foi possível excluir o documento.'
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- uploader -->
    <div class="bg-white border border-slate-200 rounded-[10px] p-3.5">
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="category"
          class="h-9 px-2.5 text-[13px] text-slate-800 border border-slate-300 rounded-lg outline-none bg-white"
        >
          <option v-for="c in DOC_CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <input
          v-if="category === 'outro'"
          v-model="categoryLabel"
          placeholder="Qual documento?"
          class="h-9 px-2.5 text-[13px] text-slate-800 border border-slate-300 rounded-lg outline-none flex-1 min-w-[120px]"
        />
        <button
          type="button"
          class="h-9 px-3.5 text-[13px] font-semibold text-white bg-brand rounded-[7px] cursor-pointer border-none hover:bg-brand-dark disabled:opacity-50 ml-auto"
          :disabled="uploading || !contactId"
          @click="pickFile"
        >
          {{ uploading ? 'Enviando…' : '+ Enviar documento' }}
        </button>
        <input ref="fileInput" type="file" class="hidden" :accept="DOC_ACCEPT" @change="onFile" />
      </div>
      <p v-if="error" class="text-[12px] text-red-600 mt-2">{{ error }}</p>
      <p class="text-[11.5px] text-slate-400 mt-2">
        PDF, imagens ou Office · até 25 MB · armazenamento privado (acesso só pelo CRM).
      </p>
    </div>

    <div v-if="loading" class="text-[13px] text-slate-400 text-center py-4">Carregando…</div>

    <!-- desta oportunidade -->
    <div v-if="opportunityId">
      <div class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2">
        Desta oportunidade
      </div>
      <div v-if="!docsHere.length" class="text-[12.5px] text-slate-400 py-1">
        Nenhum documento enviado nesta oportunidade.
      </div>
      <div v-else class="flex flex-col gap-2">
        <DocumentRow v-for="d in docsHere" :key="d.id" :doc="d" @open="openDoc" @remove="removeDoc" />
      </div>
    </div>

    <!-- demais do contato (reutilizáveis) OU lista única no contexto do contato -->
    <div v-if="!opportunityId || docsOther.length">
      <div v-if="opportunityId" class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2">
        Outros documentos do contato
      </div>
      <div v-if="!(opportunityId ? docsOther : docsHere).length" class="text-[12.5px] text-slate-400 py-1">
        Nenhum documento ainda.
      </div>
      <div v-else class="flex flex-col gap-2">
        <DocumentRow
          v-for="d in (opportunityId ? docsOther : docsHere)"
          :key="d.id"
          :doc="d"
          @open="openDoc"
          @remove="removeDoc"
        />
      </div>
    </div>
  </div>
</template>
