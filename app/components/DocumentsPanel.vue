<script setup lang="ts">
import { type DocumentItem, DOC_ACCEPT, DOC_MAX_BYTES } from '~/utils/documentModel'

// contactId = dono dos documentos. opportunityId (opcional) = contexto de envio;
// quando presente, separa "desta oportunidade" dos demais do contato (reutilizáveis).
const props = defineProps<{ contactId: string | null | undefined; opportunityId?: string }>()
// avisa o pai (drawer) que a lista mudou → ele recarrega o histórico da oportunidade
const emit = defineEmits<{ changed: [] }>()

const apiBase = useRuntimeConfig().public.apiBase
const docs = ref<DocumentItem[]>([])
const loading = ref(false)
const uploading = ref(false)
const uploadDone = ref(0)
const uploadTotal = ref(0)
const error = ref('')
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

function pickFiles() {
  error.value = ''
  fileInput.value?.click()
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = '' // permite reenviar os mesmos arquivos
  if (!files.length || !props.contactId) return

  // filtra por tamanho (extensão é limitada pelo accept + validada no backend)
  const tooBig = files.filter((f) => f.size > DOC_MAX_BYTES)
  const toSend = files.filter((f) => f.size <= DOC_MAX_BYTES)
  error.value = tooBig.length ? `${tooBig.length} arquivo(s) acima de 25 MB foram ignorados.` : ''
  if (!toSend.length) return

  uploading.value = true
  uploadTotal.value = toSend.length
  uploadDone.value = 0
  try {
    for (const file of toSend) {
      const form = new FormData()
      form.append('file', file)
      form.append('contactId', props.contactId)
      if (props.opportunityId) form.append('opportunityId', props.opportunityId)
      await $fetch('/documents', { baseURL: apiBase, method: 'POST', credentials: 'include', body: form })
      uploadDone.value++
    }
    await load()
  } catch (err: any) {
    error.value = err?.data?.message || 'Falha ao enviar um dos documentos.'
    await load() // reflete os que subiram antes da falha
  } finally {
    uploading.value = false
    emit('changed')
  }
}

// preview inline (modal) para imagem/PDF; demais tipos abrem/baixam em nova aba
const previewDoc = ref<DocumentItem | null>(null)
const previewUrl = ref('')
const previewIsImage = computed(() => !!previewDoc.value?.mimeType.startsWith('image/'))
function canPreview(mime: string) {
  return mime === 'application/pdf' || mime.startsWith('image/')
}
function closePreview() {
  previewDoc.value = null
  previewUrl.value = ''
}

async function openDoc(d: DocumentItem, download = false) {
  try {
    const { url } = await $fetch<{ url: string }>(`/documents/${d.id}/url`, {
      baseURL: apiBase,
      credentials: 'include',
      params: download ? { download: '1' } : {},
    })
    if (!download && canPreview(d.mimeType)) {
      previewDoc.value = d
      previewUrl.value = url
    } else {
      window.open(url, '_blank') // download ou tipo sem preview (Office)
    }
  } catch {
    error.value = 'Não foi possível abrir o documento.'
  }
}

async function removeDoc(d: DocumentItem) {
  if (!confirm(`Excluir "${d.fileName}"? Esta ação não pode ser desfeita.`)) return
  try {
    await $fetch(`/documents/${d.id}`, { baseURL: apiBase, method: 'DELETE', credentials: 'include' })
    await load()
    emit('changed')
  } catch {
    error.value = 'Não foi possível excluir o documento.'
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- uploader -->
    <div class="bg-white border border-slate-200 rounded-[10px] p-3.5">
      <div class="flex items-center gap-2">
        <p class="text-[12.5px] text-slate-500">
          PDF, imagens ou Office · até 25 MB por arquivo.
        </p>
        <button
          type="button"
          class="h-9 px-3.5 text-[13px] font-semibold text-white bg-brand rounded-[7px] cursor-pointer border-none hover:bg-brand-dark disabled:opacity-50 ml-auto shrink-0"
          :disabled="uploading || !contactId"
          @click="pickFiles"
        >
          {{ uploading ? `Enviando ${uploadDone}/${uploadTotal}…` : '+ Enviar documentos' }}
        </button>
        <input ref="fileInput" type="file" multiple class="hidden" :accept="DOC_ACCEPT" @change="onFiles" />
      </div>
      <p v-if="error" class="text-[12px] text-red-600 mt-2">{{ error }}</p>
    </div>

    <div v-if="loading" class="text-[13px] text-slate-400 text-center py-4">Carregando…</div>

    <!-- desta oportunidade -->
    <div v-if="opportunityId">
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

  <!-- modal de preview (imagem/PDF) -->
  <Teleport to="body">
    <div
      v-if="previewDoc"
      class="fixed inset-0 z-[80] bg-slate-900/70 flex flex-col p-4 sm:p-8"
      @click.self="closePreview"
    >
      <div class="flex items-center gap-3 text-white mb-3 shrink-0">
        <span class="text-[14px] font-semibold truncate">{{ previewDoc.fileName }}</span>
        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            class="h-8 px-3 text-[12.5px] font-semibold text-slate-800 bg-white rounded-md cursor-pointer border-none hover:bg-slate-100"
            @click="openDoc(previewDoc, true)"
          >
            Baixar
          </button>
          <button
            type="button"
            class="h-8 w-8 inline-flex items-center justify-center text-white bg-white/15 hover:bg-white/25 rounded-md cursor-pointer border-none text-[16px]"
            title="Fechar"
            @click="closePreview"
          >
            ✕
          </button>
        </div>
      </div>
      <div class="flex-1 min-h-0 flex items-center justify-center">
        <img
          v-if="previewIsImage"
          :src="previewUrl"
          :alt="previewDoc.fileName"
          class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
        <iframe
          v-else
          :src="previewUrl"
          class="w-full h-full bg-white rounded-lg"
          title="Pré-visualização"
        ></iframe>
      </div>
    </div>
  </Teleport>
</template>
