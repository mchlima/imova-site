<script setup lang="ts">
import type { FieldDef } from '~/composables/useFieldDefinitions'

const props = defineProps<{ def: FieldDef; modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [unknown] }>()

const strVal = computed(() => (props.modelValue == null ? '' : String(props.modelValue)))
const boolVal = computed(() => !!props.modelValue)

function set(v: unknown) {
  emit('update:modelValue', v)
}

// moeda: exibe com separador de milhar (pt-BR), guarda inteiro em reais
const moneyDisplay = computed(() => {
  const n = Number(props.modelValue ?? 0)
  return n ? n.toLocaleString('pt-BR') : ''
})
function onMoney(e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  set(digits ? parseInt(digits, 10) : 0)
}

const label = 'block text-[12.5px] font-semibold text-slate-700 mb-[7px]'
const input =
  'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none'
const select =
  'w-full h-[38px] pl-[11px] pr-7 text-[13px] text-slate-900 border border-slate-300 rounded-lg bg-white cursor-pointer outline-none'
</script>

<template>
  <div>
    <label :class="label">{{ def.label }}</label>

    <select
      v-if="def.type === 'select'"
      :value="strVal"
      :class="select"
      @change="set(($event.target as HTMLSelectElement).value)"
    >
      <option value="">—</option>
      <option v-for="o in def.options" :key="o" :value="o">{{ o }}</option>
    </select>

    <textarea
      v-else-if="def.type === 'textarea'"
      :value="strVal"
      class="w-full min-h-[64px] px-[11px] py-[9px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none resize-y leading-[1.5]"
      @input="set(($event.target as HTMLTextAreaElement).value)"
    ></textarea>

    <div v-else-if="def.type === 'money'" class="relative">
      <span class="absolute left-[11px] top-1/2 -translate-y-1/2 text-slate-400 text-[13px] pointer-events-none">R$</span>
      <input
        :value="moneyDisplay"
        inputmode="numeric"
        placeholder="0"
        class="w-full h-[38px] pl-9 pr-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none"
        @input="onMoney"
      />
    </div>

    <input
      v-else-if="def.type === 'number'"
      type="number"
      :value="strVal"
      :class="input"
      @input="set(($event.target as HTMLInputElement).value)"
    />

    <input
      v-else-if="def.type === 'date'"
      type="date"
      :value="strVal"
      :class="input"
      @input="set(($event.target as HTMLInputElement).value)"
    />

    <label
      v-else-if="def.type === 'boolean'"
      class="inline-flex items-center gap-2 cursor-pointer select-none h-[38px]"
    >
      <input
        type="checkbox"
        :checked="boolVal"
        class="w-4 h-4 accent-brand cursor-pointer"
        @change="set(($event.target as HTMLInputElement).checked)"
      />
      <span class="text-[13px] text-slate-600">Sim</span>
    </label>

    <!-- text (default) -->
    <input
      v-else
      :value="strVal"
      :class="input"
      @input="set(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
