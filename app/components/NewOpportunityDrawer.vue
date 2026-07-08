<script setup lang="ts">
import {
  type Opportunity,
  type RawOpportunity,
  type DraftChannel,
  type Assignee,
  mapOpportunity,
  TEMPS,
  TEMP_HEX,
} from '~/utils/opportunityModel'

// Drawer de CRIAÇÃO de oportunidade. Estado local; POST /opportunities ao criar.
// Genérico: as seções/campos vêm das definições do tenant (sem domínio hardcoded).
// pipelineId = board onde criar (vem do board ativo do quadro).
const props = defineProps<{ modelValue: boolean; pipelineId?: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [Opportunity] }>()

const apiBase = useRuntimeConfig().public.apiBase

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// funil e campos como dado — estágios escopados ao board de destino
const { loadStages, stagesFor } = useStages()
const { sections, loadFieldDefinitions } = useFieldDefinitions()
loadStages()
loadFieldDefinitions()

const boardStages = computed(() => stagesFor(props.pipelineId))
const stageOptions = computed(() =>
  boardStages.value.map((s) => ({ value: s.id, label: s.label, color: s.color })),
)
const tempOptions = TEMPS.map((t) => ({ value: t, label: t, color: TEMP_HEX[t] || '#94A3B8' }))

// ── estado do form ──
// Toda criação pelo painel é origem 'manual' (fixo, sem campo na UI por ora).
const mode = ref<'existing' | 'new'>('existing')
const contactId = ref('')
const newContact = reactive({ name: '', channels: [] as DraftChannel[] })
const stageId = ref('')
const temperature = ref('Sem classificação')
// origem do lead — campo aberto (texto livre); vazio cai em 'manual'
const source = ref('')
const assignees = ref<Assignee[]>([])
// valores dos campos personalizados, aninhados por seção { sectionKey: { fieldKey } }
const fieldValues = reactive<Record<string, Record<string, unknown>>>({})
const saving = ref(false)
const error = ref('')

function fieldValue(sk: string, fk: string) {
  return fieldValues[sk]?.[fk]
}
function patchField(sk: string, fk: string, v: unknown) {
  ;(fieldValues[sk] ||= {})[fk] = v
}

// contatos existentes para o seletor
const contacts = ref<{ id: string; name: string; channels: { type: string; value: string }[] }[]>([])
const contactOptions = computed(() =>
  contacts.value.map((c) => {
    const email = c.channels?.find((ch) => ch.type === 'email')?.value
    const phone = c.channels?.find((ch) => ch.type === 'whatsapp' || ch.type === 'telefone')?.value
    const sub = email || phone
    return { value: c.id, label: sub ? `${c.name} — ${sub}` : c.name }
  }),
)
async function loadContacts() {
  try {
    contacts.value = await $fetch('/contacts', { baseURL: apiBase, credentials: 'include' })
  } catch {
    /* ignore */
  }
}

function reset() {
  mode.value = 'existing'
  contactId.value = ''
  newContact.name = ''
  newContact.channels = []
  stageId.value = boardStages.value[0]?.id || ''
  temperature.value = 'Sem classificação'
  source.value = ''
  assignees.value = []
  for (const k of Object.keys(fieldValues)) delete fieldValues[k]
  error.value = ''
}
watch(open, (v) => {
  if (v) {
    loadContacts()
    reset()
  }
})

async function create() {
  // valida contato
  if (mode.value === 'existing' && !contactId.value) {
    error.value = 'Selecione um contato.'
    return
  }
  if (mode.value === 'new') {
    if (!newContact.name.trim()) {
      error.value = 'Informe o nome do contato.'
      return
    }
    if (!newContact.channels.length) {
      error.value = 'Adicione ao menos uma forma de contato.'
      return
    }
  }
  saving.value = true
  error.value = ''
  const body: Record<string, unknown> = {
    source: source.value.trim() || 'manual',
    pipelineId: props.pipelineId || undefined,
    stageId: stageId.value || undefined,
    temperature: temperature.value,
    fields: fieldValues,
    assigneeIds: assignees.value.map((a) => a.id),
  }
  if (mode.value === 'existing') body.contactId = contactId.value
  else body.contact = { name: newContact.name.trim(), channels: newContact.channels }

  try {
    const raw = await $fetch<RawOpportunity>('/opportunities', {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body,
    })
    emit('created', mapOpportunity(raw))
    open.value = false
  } catch {
    error.value = 'Não foi possível criar. Tente novamente.'
  } finally {
    saving.value = false
  }
}

const fadeT = {
  enterActiveClass: 'transition-opacity duration-300 ease-out',
  enterFromClass: 'opacity-0',
  leaveActiveClass: 'transition-opacity duration-200 ease-in',
  leaveToClass: 'opacity-0',
}
const slideT = {
  enterActiveClass: 'transition-transform duration-300 ease-out',
  enterFromClass: 'translate-x-full',
  leaveActiveClass: 'transition-transform duration-200 ease-in',
  leaveToClass: 'translate-x-full',
}

const label = 'block text-[12.5px] font-semibold text-slate-700 mb-[7px]'
const input = 'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none'
const block = 'text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400'
const seg = 'h-[34px] px-3 text-[13px] font-semibold rounded-md cursor-pointer border-none transition-all'
</script>

<template>
  <div>
    <Transition v-bind="fadeT">
      <div v-if="open" class="fixed inset-0 z-[52] bg-slate-900/40 backdrop-blur-[2px]" @click="open = false"></div>
    </Transition>
    <Transition v-bind="slideT">
      <aside
        v-if="open"
        class="fixed top-0 right-0 z-[53] w-[560px] max-w-[94vw] h-screen bg-slate-50 shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.3)] overflow-y-auto flex flex-col"
      >
        <div class="sticky top-0 z-[2] bg-white border-b border-slate-200 px-[22px] py-[18px] flex items-start justify-between">
          <div>
            <h2 class="text-[19px] font-extrabold tracking-[-0.02em] m-0 text-slate-900">Nova oportunidade</h2>
            <div class="text-[12.5px] text-slate-400">Cadastro manual</div>
          </div>
          <button
            class="w-8 h-8 border border-slate-200 bg-white rounded-[7px] text-[16px] text-slate-500 cursor-pointer shrink-0 leading-none"
            @click="open = false"
          >
            ✕
          </button>
        </div>

        <div class="px-[22px] pt-5 pb-4 flex-1 flex flex-col gap-[18px]">
          <!-- CONTATO -->
          <div class="bg-white border border-slate-200 rounded-[10px] p-[18px]">
            <div :class="block" class="mb-3">Contato</div>
            <div class="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg mb-3.5">
              <button :class="[seg, mode === 'existing' ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.1)]' : 'bg-transparent text-slate-500']" @click="mode = 'existing'">
                Contato existente
              </button>
              <button :class="[seg, mode === 'new' ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.1)]' : 'bg-transparent text-slate-500']" @click="mode = 'new'">
                Novo contato
              </button>
            </div>

            <div v-if="mode === 'existing'">
              <label :class="label">Selecione o contato</label>
              <SearchableSelect
                v-model="contactId"
                :options="contactOptions"
                placeholder="Buscar contato…"
                search-placeholder="Buscar por nome…"
              />
            </div>

            <div v-else class="flex flex-col gap-3">
              <div>
                <label :class="label">Nome</label>
                <input v-model="newContact.name" :class="input" placeholder="Nome completo" />
              </div>
              <div>
                <label :class="label">Formas de contato</label>
                <ChannelsEditor v-model="newContact.channels" />
              </div>
            </div>
          </div>

          <!-- FUNIL -->
          <div class="bg-white border border-slate-200 rounded-[10px] p-[18px]">
            <div :class="block" class="mb-3">Funil</div>
            <div class="flex flex-col gap-3.5">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[13px] font-semibold text-slate-700">Origem</span>
                <input v-model="source" :class="input" class="!w-[210px]" placeholder="Ex.: Indicação, Portal…" />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[13px] font-semibold text-slate-700">Temperatura</span>
                <ChipSelect v-model="temperature" :options="tempOptions" />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[13px] font-semibold text-slate-700">Estágio</span>
                <ChipSelect v-model="stageId" :options="stageOptions" />
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-[13px] font-semibold text-slate-700">Responsáveis</span>
                <AssigneePicker v-model="assignees" />
              </div>
            </div>
          </div>

          <!-- CAMPOS PERSONALIZADOS (genéricos) -->
          <div
            v-for="sec in sections"
            :key="sec.id"
            class="bg-white border border-slate-200 rounded-[10px] p-[18px]"
          >
            <div :class="block" class="mb-3">{{ sec.label }}</div>
            <div v-if="!sec.fields.length" class="text-[12.5px] text-slate-400">Nenhum campo nesta seção.</div>
            <div v-else class="flex flex-col gap-3.5">
              <DynamicField
                v-for="f in sec.fields"
                :key="f.id"
                :def="f"
                :model-value="fieldValue(sec.key, f.key)"
                @update:model-value="(v) => patchField(sec.key, f.key, v)"
              />
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white border-t border-slate-200 px-[22px] py-3.5 flex items-center gap-3">
          <span v-if="error" class="text-[12.5px] text-red-600 font-medium flex-1">{{ error }}</span>
          <div class="ml-auto flex gap-2">
            <button
              class="h-9 px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
              @click="open = false"
            >
              Cancelar
            </button>
            <button
              class="h-9 px-4 text-[13px] font-semibold text-white bg-brand rounded-lg cursor-pointer border-none hover:bg-brand-dark disabled:opacity-50"
              :disabled="saving"
              @click="create"
            >
              {{ saving ? 'Criando…' : 'Criar oportunidade' }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>
  </div>
</template>
