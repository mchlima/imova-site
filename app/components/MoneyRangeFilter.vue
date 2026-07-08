<script setup lang="ts">
// Filtro de faixa monetária standalone: botão + painel suspenso. Reaproveita os campos
// do MoneyRangeInputs. v-model é { min, max } (null = sem limite).
import type { MoneyRange } from '~/components/MoneyRangeInputs.vue'
export type { MoneyRange }

const model = defineModel<MoneyRange>({ default: () => ({ min: null, max: null }) })
const props = withDefaults(defineProps<{ placeholder?: string; prefix?: string }>(), {
  placeholder: 'Renda',
  prefix: 'R$',
})

const open = ref(false)
const fmt = (n: number | null) => (n == null ? '' : n.toLocaleString('pt-BR'))
const hasRange = computed(() => model.value.min != null || model.value.max != null)

const label = computed(() => {
  const { min, max } = model.value
  if (min == null && max == null) return props.placeholder
  if (min != null && max != null) return `${props.prefix} ${fmt(min)} – ${fmt(max)}`
  if (min != null) return `≥ ${props.prefix} ${fmt(min)}`
  return `≤ ${props.prefix} ${fmt(max)}`
})

const clear = () => (model.value = { min: null, max: null })
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
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
      {{ label }}
    </button>

    <div v-if="open" class="fixed inset-0 z-30" @click="open = false"></div>

    <div
      v-if="open"
      class="absolute right-0 mt-2 z-40 w-[min(92vw,360px)] bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] p-4"
    >
      <MoneyRangeInputs v-model="model" :prefix="prefix" />
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
