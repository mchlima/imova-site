<script setup lang="ts">
// Capa do post: converte a imagem para WebP no navegador, envia ao backend
// (que grava no R2 e apaga a anterior), e mostra preview com alterar/remover.
const props = defineProps<{ postId: string }>()
const model = defineModel<string>({ default: '' }) // coverImageUrl

const { api } = useAdminApi()
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const progress = ref('')
const error = ref('')
const dragOver = ref(false)

const MAX_W = 1600
const QUALITY = 0.82

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_W / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha na conversão'))),
      'image/webp',
      QUALITY,
    ),
  )
}

async function handleFile(file: File) {
  error.value = ''
  if (!file.type.startsWith('image/')) {
    error.value = 'Selecione um arquivo de imagem.'
    return
  }
  busy.value = true
  try {
    progress.value = 'Otimizando…'
    const webp = await toWebp(file)
    progress.value = 'Enviando…'
    const fd = new FormData()
    fd.append('file', new File([webp], 'cover.webp', { type: 'image/webp' }))
    const post = await api<{ coverImageUrl: string }>(`/admin/posts/${props.postId}/cover`, {
      method: 'POST',
      body: fd,
    })
    model.value = post.coverImageUrl
  } catch {
    error.value = 'Não foi possível enviar a imagem.'
  } finally {
    busy.value = false
    progress.value = ''
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onPick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) handleFile(f)
}
function onDrop(e: DragEvent) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) handleFile(f)
}
async function remove() {
  if (!confirm('Remover a imagem de capa?')) return
  busy.value = true
  try {
    await api(`/admin/posts/${props.postId}/cover`, { method: 'DELETE' })
    model.value = ''
  } finally {
    busy.value = false
  }
}
function trigger() {
  fileInput.value?.click()
}
</script>

<template>
  <div>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPick" />

    <!-- com capa: preview -->
    <div
      v-if="model"
      class="relative rounded-xl overflow-hidden border border-slate-200 group aspect-[16/9] bg-slate-100"
    >
      <img :src="model" alt="Capa do post" class="w-full h-full object-cover" />
      <div
        class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/45 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100"
      >
        <button
          class="inline-flex items-center gap-1.5 h-9 px-3 bg-white text-slate-800 text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-slate-100 disabled:opacity-60"
          :disabled="busy"
          @click="trigger"
        >
          <AdminIcon name="draft" :size="15" /> Alterar
        </button>
        <button
          class="inline-flex items-center gap-1.5 h-9 px-3 bg-white text-red-600 text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-red-50 disabled:opacity-60"
          :disabled="busy"
          @click="remove"
        >
          <AdminIcon name="trash" :size="15" /> Remover
        </button>
      </div>
      <div
        v-if="busy"
        class="absolute inset-0 bg-white/70 flex items-center justify-center text-[13px] font-semibold text-slate-600"
      >
        {{ progress || 'Processando…' }}
      </div>
    </div>

    <!-- sem capa: dropzone -->
    <button
      v-else
      type="button"
      class="w-full aspect-[16/9] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors cursor-pointer bg-slate-50"
      :class="dragOver ? 'border-brand bg-brand-soft' : 'border-slate-300 hover:border-slate-400'"
      :disabled="busy"
      @click="trigger"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <span class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white text-slate-400 border border-slate-200">
        <AdminIcon name="eye" :size="20" />
      </span>
      <span class="text-[13.5px] font-semibold text-slate-700">
        {{ busy ? progress : 'Arraste ou clique para enviar' }}
      </span>
      <span class="text-[12px] text-slate-400">Convertida para WebP automaticamente</span>
    </button>

    <p v-if="error" class="text-[12.5px] font-semibold text-red-600 mt-2 mb-0">{{ error }}</p>
  </div>
</template>
