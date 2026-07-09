<script setup lang="ts">
import { type DocumentItem, fmtFileSize, fileEmoji } from '~/utils/documentModel'
import { fmtDateTime } from '~/utils/opportunityModel'

const props = defineProps<{ doc: DocumentItem }>()
const emit = defineEmits<{ open: [DocumentItem, boolean]; remove: [DocumentItem] }>()

const apiBase = useRuntimeConfig().public.apiBase
const isImage = computed(() => props.doc.mimeType.startsWith('image/'))
const thumbUrl = ref('')

// miniatura de imagens: busca uma URL pré-assinada (inline) sob demanda
onMounted(async () => {
  if (!isImage.value) return
  try {
    const { url } = await $fetch<{ url: string }>(`/documents/${props.doc.id}/url`, {
      baseURL: apiBase,
      credentials: 'include',
    })
    thumbUrl.value = url
  } catch {
    /* sem miniatura; cai no ícone */
  }
})
</script>

<template>
  <div class="group/doc flex items-center gap-3 bg-white border border-slate-200 rounded-[10px] px-3 py-2.5">
    <!-- miniatura (imagem) ou ícone -->
    <button
      type="button"
      class="shrink-0 w-10 h-10 rounded-md overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-100 cursor-pointer p-0"
      title="Ver"
      @click="emit('open', doc, false)"
    >
      <img v-if="isImage && thumbUrl" :src="thumbUrl" alt="" class="w-full h-full object-cover" />
      <span v-else class="text-[20px] leading-none">{{ fileEmoji(doc.mimeType) }}</span>
    </button>
    <div class="min-w-0 flex-1">
      <div class="text-[13px] font-semibold text-slate-800 truncate">{{ doc.fileName }}</div>
      <div class="text-[11.5px] text-slate-400 truncate">
        {{ fmtFileSize(doc.size) }} · {{ doc.uploadedBy || '—' }} · {{ fmtDateTime(doc.createdAt) }}
      </div>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <button
        type="button"
        class="h-8 px-2.5 text-[12.5px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
        title="Ver"
        @click="emit('open', doc, false)"
      >
        Ver
      </button>
      <button
        type="button"
        class="h-8 px-2.5 text-[12.5px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
        title="Baixar"
        @click="emit('open', doc, true)"
      >
        Baixar
      </button>
      <button
        type="button"
        class="h-8 w-8 inline-flex items-center justify-center text-slate-400 bg-transparent border-none rounded-md cursor-pointer hover:text-red-600 hover:bg-red-50 opacity-0 group-hover/doc:opacity-100 transition-opacity"
        title="Excluir"
        @click="emit('remove', doc)"
      >
        ✕
      </button>
    </div>
  </div>
</template>
