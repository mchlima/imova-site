<script setup lang="ts">
// aceita qualquer atividade que tenha tipo/título/notas (Activity ou PendingActivity)
type EditableActivity = { type: string; title: string; notes: string }

const open = defineModel<boolean>({ default: false })
const props = defineProps<{ activity: EditableActivity | null }>()
const emit = defineEmits<{ confirm: [{ type: string; title: string; notes: string }] }>()

const ACTIVITY_TYPES = [
  { value: 'ligação', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'reunião', label: 'Reunião' },
  { value: 'visita', label: 'Visita' },
  { value: 'tarefa', label: 'Tarefa' },
]

const form = reactive({ type: 'ligação', title: '', notes: '' })
watch(
  () => props.activity,
  (a) => {
    if (a) {
      form.type = a.type
      form.title = a.title
      form.notes = a.notes || ''
    }
  },
  { immediate: true },
)

function confirm() {
  if (!form.title.trim()) return
  emit('confirm', { type: form.type, title: form.title.trim(), notes: form.notes.trim() })
  open.value = false
}

const field =
  'w-full h-[40px] px-3 text-[14px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15'
const lbl = 'block text-[12.5px] font-semibold text-slate-700 mb-1.5'
</script>

<template>
  <AppModal
    v-model="open"
    size="sm"
    title="Concluir atividade"
    subtitle="Revise e registre o desfecho antes de concluir."
  >
    <div class="flex flex-col gap-3.5">
      <div class="grid grid-cols-[120px_1fr] gap-3">
        <div>
          <label :class="lbl">Tipo</label>
          <select v-model="form.type" :class="field" class="cursor-pointer">
            <option v-for="t in ACTIVITY_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div>
          <label :class="lbl">Título</label>
          <input v-model="form.title" :class="field" @keydown.enter.prevent="confirm" />
        </div>
      </div>
      <div>
        <label :class="lbl">Desfecho / observações</label>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="Ex.: cliente pediu para retornar na semana que vem…"
          class="w-full px-3 py-2 text-[14px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 resize-y leading-[1.5]"
        ></textarea>
      </div>
    </div>
    <template #footer>
      <button
        class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100"
        @click="open = false"
      >
        Cancelar
      </button>
      <button
        class="inline-flex items-center gap-1.5 h-[38px] px-5 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none disabled:opacity-60"
        :disabled="!form.title.trim()"
        @click="confirm"
      >
        <AdminIcon name="check" :size="15" /> Concluir
      </button>
    </template>
  </AppModal>
</template>
