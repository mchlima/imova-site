<script setup lang="ts">
// Editor de nota leve (rich text simples) baseado em contenteditable. Guarda HTML
// básico (negrito, itálico, listas, link). Barra minimalista, 100% estilizada aqui.
// Cola sempre como texto puro (evita HTML "sujo" de fora).
const model = defineModel<string>({ default: '' })
const props = withDefaults(
  defineProps<{ placeholder?: string; minHeight?: string }>(),
  { placeholder: '', minHeight: '150px' },
)

const el = ref<HTMLElement | null>(null)
const isEmpty = ref(true)

// Conteúdo antigo pode ter sido salvo em MARKDOWN (editor anterior). Se não parecer
// HTML, converte o subconjunto que suportamos (negrito/itálico/listas/link) para
// exibir e editar visualmente. Se já for HTML (deste editor), usa como está.
function looksLikeHtml(s: string) {
  return /<[a-z][\s\S]*>/i.test(s)
}
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function inlineMd(t: string) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/_(.+?)_/g, '<i>$1</i>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
}
function mdToHtml(src: string) {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`)
      list = null
    }
  }
  for (const raw of lines) {
    const ul = raw.match(/^\s*[-*]\s+(.*)$/)
    const ol = raw.match(/^\s*\d+\.\s+(.*)$/)
    if (ul) {
      if (list !== 'ul') {
        closeList()
        out.push('<ul>')
        list = 'ul'
      }
      out.push(`<li>${inlineMd(ul[1]!)}</li>`)
    } else if (ol) {
      if (list !== 'ol') {
        closeList()
        out.push('<ol>')
        list = 'ol'
      }
      out.push(`<li>${inlineMd(ol[1]!)}</li>`)
    } else if (raw.trim() === '') {
      closeList()
    } else {
      closeList()
      out.push(`<div>${inlineMd(raw)}</div>`)
    }
  }
  closeList()
  return out.join('')
}
// HTML pronto para o contenteditable a partir do valor guardado
function toHtml(v: string) {
  if (!v) return ''
  return looksLikeHtml(v) ? v : mdToHtml(v)
}

// considera vazio quando não sobra texto (ignora <br>/&nbsp;/tags)
function isBlank(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '').trim() === ''
}
function syncEmpty() {
  isEmpty.value = isBlank(el.value?.innerHTML ?? '')
}
function onInput() {
  const html = el.value?.innerHTML ?? ''
  model.value = isBlank(html) ? '' : html
  syncEmpty()
}

// sincroniza quando o valor muda por fora (ex.: abrir/trocar de oportunidade)
watch(model, (v) => {
  const html = toHtml(v || '')
  if (el.value && html !== el.value.innerHTML) {
    el.value.innerHTML = html
    syncEmpty()
  }
})
onMounted(() => {
  if (el.value) {
    el.value.innerHTML = toHtml(model.value || '')
    syncEmpty()
  }
})

function exec(cmd: string, value?: string) {
  el.value?.focus()
  document.execCommand(cmd, false, value)
  onInput()
}
function addLink() {
  const url = window.prompt('URL do link:')?.trim()
  if (!url) return
  const sel = window.getSelection()
  if (sel && sel.toString()) exec('createLink', url)
  else {
    const safe = url.replace(/"/g, '%22').replace(/</g, '%3C')
    exec('insertHTML', `<a href="${safe}">${url.replace(/</g, '&lt;')}</a>`)
  }
}
function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
  onInput()
}

const btn =
  'w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer bg-transparent border-none transition-colors'
</script>

<template>
  <div class="note-editor rounded-lg border border-slate-200 overflow-hidden">
    <div class="flex items-center gap-0.5 px-1.5 py-1 border-b border-slate-100">
      <button type="button" title="Negrito" :class="btn" class="font-bold text-[13px]" @mousedown.prevent="exec('bold')">B</button>
      <button type="button" title="Itálico" :class="btn" class="italic text-[13px] font-serif" @mousedown.prevent="exec('italic')">I</button>
      <span class="w-px h-4 bg-slate-200 mx-1"></span>
      <button type="button" title="Lista" :class="btn" @mousedown.prevent="exec('insertUnorderedList')">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button type="button" title="Lista numerada" :class="btn" @mousedown.prevent="exec('insertOrderedList')">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <line x1="10" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" />
          <path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-1.3 2-2.2C6 15 5.3 14.6 4.6 14.9" />
        </svg>
      </button>
      <span class="w-px h-4 bg-slate-200 mx-1"></span>
      <button type="button" title="Link" :class="btn" @mousedown.prevent="addLink">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.41 1.41" />
          <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.41-1.41" />
        </svg>
      </button>
    </div>
    <div class="relative">
      <div
        ref="el"
        contenteditable="true"
        class="note-content px-3 py-2.5 text-[14px] leading-relaxed text-slate-700 outline-none overflow-y-auto"
        :style="{ minHeight: props.minHeight, maxHeight: '340px' }"
        @input="onInput"
        @blur="onInput"
        @paste="onPaste"
      ></div>
      <div v-if="isEmpty" class="pointer-events-none absolute top-2.5 left-3 text-[14px] text-slate-400 select-none">
        {{ props.placeholder }}
      </div>
    </div>
  </div>
</template>

<style>
.note-editor:focus-within {
  border-color: #146c4e;
  box-shadow: 0 0 0 3px rgba(20, 108, 78, 0.12);
}
/* listas dentro do conteúdo editável (o preflight do Tailwind zera) */
.note-content ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.15rem 0;
}
.note-content ol {
  list-style: decimal;
  padding-left: 1.35rem;
  margin: 0.15rem 0;
}
.note-content a {
  color: #146c4e;
  text-decoration: underline;
}
.note-content:empty {
  min-height: 1.2em;
}
</style>
