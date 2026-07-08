<script setup lang="ts">
// Seletor de período reutilizável: botão + painel suspenso com atalhos e intervalo
// personalizado. v-model é um { start, end } em ISO 'YYYY-MM-DD' ('' = sem limite).
export interface DateRange {
  start: string
  end: string
}

const model = defineModel<DateRange>({ default: () => ({ start: '', end: '' }) })
const props = withDefaults(defineProps<{ placeholder?: string }>(), {
  placeholder: 'Período',
})

const open = ref(false)

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtBR = (iso: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const shortcuts = computed(() => {
  const today = new Date()
  const t = toISO(today)
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return toISO(d)
  }
  return [
    { label: 'Hoje', start: t, end: t },
    { label: 'Ontem', start: daysAgo(1), end: daysAgo(1) },
    { label: 'Últimos 7 dias', start: daysAgo(6), end: t },
    { label: 'Últimos 30 dias', start: daysAgo(29), end: t },
    {
      label: 'Este mês',
      start: toISO(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: t,
    },
    {
      label: 'Mês passado',
      start: toISO(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      end: toISO(new Date(today.getFullYear(), today.getMonth(), 0)),
    },
  ]
})

const hasRange = computed(() => !!(model.value.start || model.value.end))

const label = computed(() => {
  const { start, end } = model.value
  if (!start && !end) return props.placeholder
  const sc = shortcuts.value.find((s) => s.start === start && s.end === end)
  if (sc) return sc.label
  if (start && end) return `${fmtBR(start)} – ${fmtBR(end)}`
  if (start) return `desde ${fmtBR(start)}`
  return `até ${fmtBR(end)}`
})

const isActiveShortcut = (s: { start: string; end: string }) =>
  model.value.start === s.start && model.value.end === s.end

function applyShortcut(s: { start: string; end: string }) {
  model.value = { start: s.start, end: s.end }
  open.value = false
}
function setStart(v: string) {
  model.value = { ...model.value, start: v }
}
function setEnd(v: string) {
  model.value = { ...model.value, end: v }
}
function clear() {
  model.value = { start: '', end: '' }
}

const dateInput =
  'w-full h-[38px] px-[11px] text-[13px] font-medium text-slate-700 border border-slate-300 rounded-[7px] bg-white outline-none cursor-pointer focus:border-brand focus:ring-[3px] focus:ring-brand/10'
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-2 h-[38px] px-3.5 bg-white border rounded-[7px] text-[13px] font-semibold cursor-pointer transition-all"
      :class="
        hasRange
          ? 'border-brand/40 text-brand hover:bg-brand-soft'
          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
      "
      @click="open = !open"
    >
      <svg
        class="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {{ label }}
    </button>

    <!-- overlay para fechar ao clicar fora -->
    <div v-if="open" class="fixed inset-0 z-30" @click="open = false"></div>

    <!-- PAINEL -->
    <div
      v-if="open"
      class="absolute right-0 mt-2 z-40 w-[min(92vw,460px)] bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] p-4"
    >
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- atalhos -->
        <div class="flex flex-col gap-1 sm:w-[160px] shrink-0">
          <div
            class="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-1"
          >
            Atalhos
          </div>
          <button
            v-for="s in shortcuts"
            :key="s.label"
            type="button"
            class="text-left h-[34px] px-3 rounded-lg text-[13px] font-medium transition-all cursor-pointer border-none"
            :class="
              isActiveShortcut(s)
                ? 'bg-brand-soft text-brand'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            "
            @click="applyShortcut(s)"
          >
            {{ s.label }}
          </button>
        </div>

        <!-- intervalo personalizado -->
        <div class="flex-1 sm:border-l sm:border-slate-100 sm:pl-4">
          <div
            class="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2"
          >
            Personalizado
          </div>
          <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">De</label>
          <input
            type="date"
            :value="model.start"
            :max="model.end || undefined"
            :class="[dateInput, 'mb-3']"
            @input="setStart(($event.target as HTMLInputElement).value)"
          />
          <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5"
            >Até</label
          >
          <input
            type="date"
            :value="model.end"
            :min="model.start || undefined"
            :class="dateInput"
            @input="setEnd(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <div class="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
        <button
          type="button"
          class="h-[36px] px-3.5 text-[13px] font-semibold text-slate-500 cursor-pointer transition-all rounded-[7px] hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-transparent border-none"
          :disabled="!hasRange"
          @click="clear"
        >
          Limpar
        </button>
        <button
          type="button"
          class="h-[36px] px-4 bg-brand text-white text-[13px] font-semibold rounded-[7px] cursor-pointer transition-all hover:bg-brand-dark border-none"
          @click="open = false"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>
