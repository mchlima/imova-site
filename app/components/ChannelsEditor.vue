<script setup lang="ts">
import { type DraftChannel, CHANNEL_LABELS, CHANNEL_ICONS } from '~/utils/opportunityModel'

// Editor genérico de formas de contato (v-model de { type, value }[]).
// Reutilizado por qualquer form que monte um contato novo em memória.
const props = defineProps<{ modelValue: DraftChannel[] }>()
const emit = defineEmits<{ 'update:modelValue': [DraftChannel[]] }>()

const CHANNEL_TYPES = [
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'outro', label: 'Outro' },
]
const newType = ref('email')
const newValue = ref('')

function add() {
  const value = newValue.value.trim()
  if (!value) return
  emit('update:modelValue', [...props.modelValue, { type: newType.value, value }])
  newValue.value = ''
  newType.value = 'email'
}
function remove(i: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, idx) => idx !== i),
  )
}

const input = 'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none'
const select = 'w-full h-[38px] pl-[11px] pr-7 text-[13px] text-slate-900 border border-slate-300 rounded-lg bg-white cursor-pointer outline-none'
</script>

<template>
  <div>
    <div v-if="modelValue.length" class="flex flex-col gap-1.5 mb-2">
      <div
        v-for="(ch, i) in modelValue"
        :key="i"
        class="flex items-center gap-2 border border-slate-100 rounded-lg px-2.5 py-2"
      >
        <span
          class="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md bg-slate-100 text-slate-500 shrink-0"
          :title="CHANNEL_LABELS[ch.type] || ch.type"
        >
          <AdminIcon :name="CHANNEL_ICONS[ch.type] || 'message'" :size="15" />
        </span>
        <span class="text-[13px] text-slate-800 truncate flex-1">{{ ch.value }}</span>
        <button
          type="button"
          title="Remover"
          class="text-slate-300 hover:text-red-600 cursor-pointer bg-transparent border-none text-[14px] leading-none shrink-0"
          @click="remove(i)"
        >
          ✕
        </button>
      </div>
    </div>
    <div class="flex gap-2 items-center">
      <select v-model="newType" :class="select" class="!w-[120px]">
        <option v-for="t in CHANNEL_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <input
        v-model="newValue"
        :class="input"
        class="flex-1"
        placeholder="ex.: contato@email.com / (11) 90000-0000"
        @keyup.enter="add"
      />
      <button
        type="button"
        class="h-[38px] px-3 bg-slate-900 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none disabled:opacity-50 shrink-0"
        :disabled="!newValue.trim()"
        @click="add"
      >
        Adicionar
      </button>
    </div>
  </div>
</template>
