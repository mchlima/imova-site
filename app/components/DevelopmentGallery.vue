<script setup lang="ts">
import type { Development, DevelopmentImage } from '~/utils/developmentModel'

// Galeria de imagens do empreendimento: upload (convertido p/ WebP no navegador),
// tipo (capa/lazer/planta), legenda, ordem e remoção. Cada mutação chama o backend
// (que gere o R2) e devolve o empreendimento atualizado, emitido ao pai.
const props = defineProps<{ developmentId: string; images: DevelopmentImage[] }>()
const emit = defineEmits<{ updated: [Development] }>()

const { api } = useAdminApi()
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const progress = ref('')
const error = ref('')

const MAX_W = 1920
const QUALITY = 0.82

const KIND_OPTS = [
  { value: 'hero', label: 'Capa' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'planta', label: 'Planta' },
]

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
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('conv'))), 'image/webp', QUALITY),
  )
}

// pipeline compartilhado (seletor de arquivos e drag-and-drop): filtra imagens,
// converte p/ WebP no navegador e envia uma a uma como 'lazer'.
async function handleFiles(files: File[]) {
  if (busy.value) return
  const imgs = files.filter((f) => f.type.startsWith('image/'))
  if (!imgs.length) return
  error.value = ''
  busy.value = true
  let last: Development | null = null
  try {
    let i = 0
    for (const file of imgs) {
      i++
      progress.value = `Enviando ${i}/${imgs.length}…`
      const webp = await toWebp(file)
      const fd = new FormData()
      fd.append('file', new File([webp], 'img.webp', { type: 'image/webp' }))
      last = await api<Development>(`/admin/developments/${props.developmentId}/images?kind=lazer`, {
        method: 'POST',
        body: fd,
      })
    }
    if (last) emit('updated', last)
  } catch {
    error.value = 'Falha ao enviar uma das imagens.'
  } finally {
    busy.value = false
    progress.value = ''
  }
}

function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  const files = Array.from(el.files ?? [])
  el.value = ''
  handleFiles(files)
}

// drag-and-drop: dragDepth conta enter/leave (evita flicker ao passar por filhos)
const dragDepth = ref(0)
const dragActive = computed(() => dragDepth.value > 0)
function onDragEnter() {
  dragDepth.value++
}
function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}
function onDrop(e: DragEvent) {
  dragDepth.value = 0
  handleFiles(Array.from(e.dataTransfer?.files ?? []))
}

async function patchImage(imageId: string, body: Record<string, unknown>) {
  const dev = await api<Development>(`/admin/developments/${props.developmentId}/images/${imageId}`, {
    method: 'PATCH',
    body,
  })
  emit('updated', dev)
}

async function setKind(img: DevelopmentImage, kind: string) {
  if (kind === img.kind) return
  await patchImage(img.id, { kind })
}
async function setCaption(img: DevelopmentImage, caption: string) {
  if (caption === img.caption) return
  await patchImage(img.id, { caption })
}
// define como capa: promove esta e rebaixa as demais capas para lazer
async function setAsHero(img: DevelopmentImage) {
  busy.value = true
  try {
    for (const other of props.images) {
      if (other.id !== img.id && other.kind === 'hero') {
        await api(`/admin/developments/${props.developmentId}/images/${other.id}`, {
          method: 'PATCH',
          body: { kind: 'lazer' },
        })
      }
    }
    await patchImage(img.id, { kind: 'hero' })
  } finally {
    busy.value = false
  }
}
async function move(img: DevelopmentImage, dir: -1 | 1) {
  const list = props.images
  const idx = list.findIndex((i) => i.id === img.id)
  const swap = list[idx + dir]
  if (!swap) return
  busy.value = true
  try {
    await api(`/admin/developments/${props.developmentId}/images/${swap.id}`, {
      method: 'PATCH',
      body: { order: img.order },
    })
    await patchImage(img.id, { order: swap.order })
  } finally {
    busy.value = false
  }
}
async function remove(img: DevelopmentImage) {
  if (!confirm('Remover esta imagem? Ela sai do R2.')) return
  busy.value = true
  try {
    const dev = await api<Development>(
      `/admin/developments/${props.developmentId}/images/${img.id}`,
      { method: 'DELETE' },
    )
    emit('updated', dev)
  } finally {
    busy.value = false
  }
}
function trigger() {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="relative rounded-xl transition-colors"
    :class="dragActive ? 'ring-2 ring-brand ring-offset-2' : ''"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onPick" />

    <!-- overlay ao arrastar -->
    <div
      v-if="dragActive"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-brand-soft/80 backdrop-blur-[1px] border-2 border-dashed border-brand pointer-events-none"
    >
      <span class="text-[14px] font-bold text-brand">Solte as imagens para enviar</span>
    </div>

    <div class="flex items-center justify-between mb-3">
      <span class="text-[12.5px] text-slate-500">{{ images.length }} imagem(ns) · arraste e solte ou clique · converte para WebP</span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-3.5 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-brand-dark disabled:opacity-60"
        :disabled="busy"
        @click="trigger"
      >
        <AppSpinner v-if="busy" :size="14" />
        {{ busy ? (progress || 'Processando…') : '+ Enviar imagens' }}
      </button>
    </div>
    <p v-if="error" class="text-[12.5px] font-semibold text-red-600 mb-2">{{ error }}</p>

    <button
      v-if="!images.length"
      type="button"
      class="block w-full border-2 border-dashed rounded-xl py-10 text-center text-[13px] cursor-pointer transition-colors bg-transparent"
      :class="dragActive ? 'border-brand text-brand' : 'border-slate-300 text-slate-400 hover:border-brand hover:text-brand'"
      :disabled="busy"
      @click="trigger"
    >
      Arraste e solte as imagens aqui, ou clique para escolher.<br />
      Fotos do lazer, plantas e a capa.
    </button>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div v-for="(img, i) in images" :key="img.id" class="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div class="relative aspect-[4/3] bg-slate-100">
          <img :src="img.url" :alt="img.caption" class="w-full h-full object-cover" />
          <span v-if="img.kind === 'hero'" class="absolute top-2 left-2 inline-flex items-center h-[20px] px-2 rounded-md bg-brand text-white text-[10.5px] font-bold">Capa</span>
        </div>
        <div class="p-2.5 flex flex-col gap-2">
          <input
            :value="img.caption"
            placeholder="Legenda"
            class="w-full h-8 px-2 text-[12.5px] border border-slate-200 rounded-md outline-none focus:border-brand"
            @change="setCaption(img, ($event.target as HTMLInputElement).value)"
          />
          <div class="flex items-center gap-1.5">
            <select
              :value="img.kind"
              class="h-8 px-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-md outline-none focus:border-brand cursor-pointer"
              @change="setKind(img, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="k in KIND_OPTS" :key="k.value" :value="k.value">{{ k.label }}</option>
            </select>
            <button
              v-if="img.kind !== 'hero'"
              type="button"
              class="h-8 px-2 text-[11.5px] font-semibold text-slate-600 border border-slate-200 rounded-md cursor-pointer bg-white hover:bg-slate-50 disabled:opacity-50"
              :disabled="busy"
              title="Definir como capa"
              @click="setAsHero(img)"
            >
              Capa
            </button>
            <div class="ml-auto flex items-center gap-1">
              <button type="button" class="w-7 h-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 border border-slate-200 rounded-md cursor-pointer bg-white disabled:opacity-40" :disabled="busy || i === 0" title="Mover para trás" @click="move(img, -1)">↑</button>
              <button type="button" class="w-7 h-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 border border-slate-200 rounded-md cursor-pointer bg-white disabled:opacity-40" :disabled="busy || i === images.length - 1" title="Mover para frente" @click="move(img, 1)">↓</button>
              <button type="button" class="w-7 h-8 inline-flex items-center justify-center text-red-500 hover:text-red-700 border border-slate-200 rounded-md cursor-pointer bg-white disabled:opacity-50" :disabled="busy" title="Remover" @click="remove(img)">
                <AdminIcon name="trash" :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
