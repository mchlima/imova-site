<script setup lang="ts">
// Par de campos "a partir de" / "até" para faixa monetária. Reutilizável tanto inline
// (dentro de um painel) quanto dentro do MoneyRangeFilter (botão suspenso).
export interface MoneyRange {
  min: number | null
  max: number | null
}

const model = defineModel<MoneyRange>({ default: () => ({ min: null, max: null }) })
withDefaults(defineProps<{ prefix?: string }>(), { prefix: 'R$' })

const parseNum = (v: string): number | null => {
  const d = (v || '').replace(/\D/g, '')
  return d ? parseInt(d, 10) : null
}
const fmt = (n: number | null) => (n == null ? '' : n.toLocaleString('pt-BR'))

const setMin = (v: string) => (model.value = { ...model.value, min: parseNum(v) })
const setMax = (v: string) => (model.value = { ...model.value, max: parseNum(v) })

const field =
  'w-full h-[38px] pl-9 pr-3 text-[14px] font-semibold text-slate-900 border border-slate-300 rounded-[7px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/10'
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5"
        >A partir de</label
      >
      <div class="relative">
        <span
          class="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 font-medium"
          >{{ prefix }}</span
        >
        <input
          :value="fmt(model.min)"
          inputmode="numeric"
          placeholder="0"
          :class="field"
          @input="setMin(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div>
      <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Até</label>
      <div class="relative">
        <span
          class="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 font-medium"
          >{{ prefix }}</span
        >
        <input
          :value="fmt(model.max)"
          inputmode="numeric"
          placeholder="—"
          :class="field"
          @input="setMax(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>
