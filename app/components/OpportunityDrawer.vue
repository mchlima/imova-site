<script setup lang="ts">
import {
  type Opportunity,
  type Contact,
  type Activity,
  type Assignee,
  type RawOpportunity,
  mapOpportunity,
  formatResidence,
  CHANNEL_LABELS,
  CHANNEL_ICONS,
  TEMPS,
  TEMP_HEX,
  tempBadgeStyle,
  fmtBRL,
  fmtDateTime,
  dueState,
} from '~/utils/opportunityModel'

import type { Pipeline } from '~/composables/usePipelines'

const props = defineProps<{
  modelValue: boolean
  opportunity: Opportunity | null
  // boards disponíveis (para repassar a oportunidade a outro board)
  boards?: Pipeline[]
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  updated: [Opportunity]
  moved: [Opportunity]
}>()

const apiBase = useRuntimeConfig().public.apiBase
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const sel = computed(() => props.opportunity)
const fmt = fmtBRL

// funil como dado — opções/cores de status vêm de GET /stages. Com 2+ boards, o
// seletor de status mostra só os estágios do board DESTA oportunidade.
const { loadStages, stagesFor, stageMap, stageBadgeStyle, stageLabel } = useStages()
loadStages()

// estágios do board da oportunidade aberta
const oppStages = computed(() => stagesFor(sel.value?.pipelineId))
// outros boards (destinos de repasse), na ordem
const otherBoards = computed(() =>
  [...(props.boards ?? [])]
    .sort((a, b) => a.order - b.order)
    .filter((b) => b.id !== sel.value?.pipelineId),
)
const currentBoard = computed(() => props.boards?.find((b) => b.id === sel.value?.pipelineId) || null)

// Repasse: move a oportunidade para outro board (cai no 1º estágio do destino).
const moving = ref(false)
async function moveToBoard(target: Pipeline) {
  const id = sel.value?.id
  if (!id || moving.value) return
  moving.value = true
  try {
    const updated = await $fetch<RawOpportunity>(`/opportunities/${id}/move-pipeline`, {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { pipelineId: target.id },
    })
    emit('moved', mapOpportunity(updated))
  } catch {
    /* o pai recarrega se precisar */
  } finally {
    moving.value = false
  }
}

// campos personalizados (qualificação, preferências) — vêm de GET /field-definitions
const { sections: fieldSections, loadFieldDefinitions } = useFieldDefinitions()
loadFieldDefinitions()

// drawer de edição do contato, aberto por cima do drawer de oportunidade
const editContactOpen = ref(false)
// contato editado no ContactDrawer → reflete na oportunidade e avisa o pai
function onContactEdited(contact: Contact) {
  if (!sel.value) return
  emit('updated', {
    ...(sel.value as Opportunity),
    contact: { ...sel.value.contact, ...contact },
  })
}

// Link do WhatsApp para um número específico do contato.
function waHref(value: string) {
  const first = (sel.value?.contact.name || '').split(' ')[0]
  return (
    'https://wa.me/55' +
    value.replace(/\D/g, '') +
    '?text=' +
    encodeURIComponent(
      'Olá ' + first + '! Aqui é do Meu Revelar, sobre a sua simulação. Posso te ajudar?',
    )
  )
}

const badgeBase =
  'inline-flex items-center h-[22px] px-[9px] rounded-md text-[11.5px] font-semibold whitespace-nowrap'

// Atualização otimista + PATCH; emite a oportunidade atualizada para o pai.
async function patchSel(patch: Partial<Opportunity>) {
  const id = sel.value?.id
  if (!id) return
  emit('updated', { ...(sel.value as Opportunity), ...patch })
  try {
    const updated = await $fetch<RawOpportunity>(`/opportunities/${id}`, {
      baseURL: apiBase,
      method: 'PATCH',
      credentials: 'include',
      body: patch,
    })
    emit('updated', mapOpportunity(updated))
  } catch {
    /* o pai recarrega se precisar */
  }
}

// responsáveis: atualização otimista dos avatares + PATCH com o conjunto de ids
async function patchAssignees(assignees: Assignee[]) {
  const id = sel.value?.id
  if (!id) return
  emit('updated', { ...(sel.value as Opportunity), assignees })
  try {
    const updated = await $fetch<RawOpportunity>(`/opportunities/${id}`, {
      baseURL: apiBase,
      method: 'PATCH',
      credentials: 'include',
      body: { assigneeIds: assignees.map((a) => a.id) },
    })
    emit('updated', mapOpportunity(updated))
  } catch {
    /* o pai recarrega se precisar */
  }
}

// valor de um campo personalizado (aninhado por seção)
function fieldValue(sectionKey: string, fieldKey: string) {
  const fields = sel.value?.fields as Record<string, Record<string, unknown>> | undefined
  return fields?.[sectionKey]?.[fieldKey]
}
// patch de um campo: merge profundo local (evita piscar) + persiste; backend re-mescla/coage
function patchField(sectionKey: string, fieldKey: string, value: unknown) {
  const cur = (sel.value?.fields as Record<string, Record<string, unknown>>) ?? {}
  const merged = { ...cur, [sectionKey]: { ...(cur[sectionKey] ?? {}), [fieldKey]: value } }
  patchSel({ fields: merged })
}

const LOSS_REASONS = ['Sem retorno', 'Fora do perfil', 'Comprou com outro', 'Sem interesse', 'Outro']
// estágio de perda é dado (isLost no funil), não string fixa — cada board tem o seu.
const isLossKey = (key: string) => !!stageMap.value[key]?.isLost
const isLostStatus = computed(() => isLossKey(sel.value?.status || ''))
function onStatusChange(status: string) {
  // ao sair de um estágio de perda, limpa o motivo da perda
  if (!isLossKey(status) && sel.value?.lossReason) patchSel({ status, lossReason: '' })
  else patchSel({ status })
}

const tempBtnBase =
  'h-[34px] px-[13px] rounded-[7px] text-[12.5px] font-semibold cursor-pointer border transition-all'
function tempBtn(val: string, activeCls: string) {
  return [
    tempBtnBase,
    sel.value?.temperature === val ? activeCls : 'bg-white text-slate-500 border-slate-200',
  ]
}

// ── atividades / histórico (timeline unificada) ──
// "Nota" é só mais um tipo de entrada; anotações não têm data e nunca ficam pendentes.
const ACTIVITY_TYPES = [
  { value: 'nota', label: 'Nota' },
  { value: 'ligação', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'reunião', label: 'Reunião' },
  { value: 'visita', label: 'Visita' },
  { value: 'tarefa', label: 'Tarefa' },
]
const activityLabel = (t: string) => ACTIVITY_TYPES.find((x) => x.value === t)?.label || t

// valor inicial do campo datetime-local = agora (formato YYYY-MM-DDTHH:mm)
function nowLocal() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const naType = ref('nota')
const naTitle = ref('')
const naNotes = ref('')
const naDue = ref(nowLocal())
const savingActivity = ref(false)
// nota = anotação livre: sem detalhes, sem data, nunca vira follow-up
const isNota = computed(() => naType.value === 'nota')

// abas do drawer
const tab = ref<'oportunidade' | 'atividades' | 'dados'>('oportunidade')

// ao (re)abrir o drawer: atualiza o campo de data e volta pra aba Oportunidade
watch(open, (v) => {
  if (v) {
    naDue.value = nowLocal()
    tab.value = 'oportunidade'
  }
})

const pendingActivities = computed(() =>
  (sel.value?.activities ?? [])
    .filter((a) => !a.done)
    .sort((a, b) => {
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    }),
)
const doneActivities = computed(() =>
  (sel.value?.activities ?? [])
    .filter((a) => a.done)
    .sort(
      (a, b) =>
        new Date(b.doneAt || b.createdAt).getTime() - new Date(a.doneAt || a.createdAt).getTime(),
    ),
)

async function saveActivity(schedule: boolean) {
  const id = sel.value?.id
  const title = naTitle.value.trim()
  if (!id || !title) return
  if (schedule && !naDue.value) return
  savingActivity.value = true
  try {
    const body: Record<string, unknown> = { type: naType.value, title }
    if (!isNota.value && naNotes.value.trim()) body.notes = naNotes.value.trim()
    if (schedule) body.dueAt = new Date(naDue.value).toISOString()
    else body.done = true
    const updated = await $fetch<RawOpportunity>(`/opportunities/${id}/activities`, {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body,
    })
    emit('updated', mapOpportunity(updated))
    naTitle.value = ''
    naNotes.value = ''
    naDue.value = nowLocal()
  } finally {
    savingActivity.value = false
  }
}
// concluir abre o modal para revisar/registrar o desfecho
const completeOpen = ref(false)
const toComplete = ref<Activity | null>(null)
function askComplete(a: Activity) {
  toComplete.value = a
  completeOpen.value = true
}
async function confirmComplete(patch: { type: string; title: string; notes: string }) {
  const id = sel.value?.id
  const act = toComplete.value
  if (!id || !act) return
  const updated = await $fetch<RawOpportunity>(`/opportunities/${id}/activities/${act.id}`, {
    baseURL: apiBase,
    method: 'PATCH',
    credentials: 'include',
    body: { done: true, ...patch },
  })
  emit('updated', mapOpportunity(updated))
}
async function deleteActivity(actId: string) {
  const id = sel.value?.id
  if (!id) return
  const updated = await $fetch<RawOpportunity>(`/opportunities/${id}/activities/${actId}`, {
    baseURL: apiBase,
    method: 'DELETE',
    credentials: 'include',
  })
  emit('updated', mapOpportunity(updated))
}

// animações: backdrop (fade) e painel (slide da direita)
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

const drawerLabel = 'block text-[12.5px] font-semibold text-slate-700 mb-[7px]'
const drawerSelect =
  'w-full h-[38px] pl-[11px] pr-7 text-[13px] text-slate-900 border border-slate-300 rounded-lg bg-white cursor-pointer outline-none'
const drawerInput =
  'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none'
const blockLabel = 'text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-3.5'
</script>

<template>
  <div>
    <Transition v-bind="fadeT">
      <div
        v-if="open && sel"
        class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
        @click="open = false"
      ></div>
    </Transition>
    <Transition v-bind="slideT">
      <aside
        v-if="open && sel"
        class="fixed top-0 right-0 z-[41] w-[520px] max-w-[94vw] h-screen bg-slate-50 shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.3)] overflow-y-auto"
      >
        <!-- drawer header (fixo): nome + temperatura + status sempre visíveis -->
        <div class="sticky top-0 z-[2] bg-white border-b border-slate-200">
          <div class="px-[22px] pt-[18px] pb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h2 class="text-[19px] font-extrabold tracking-[-0.02em] m-0 text-slate-900 truncate">
                  {{ sel.contact.name }}
                </h2>
                <span :class="badgeBase" :style="tempBadgeStyle(sel.temperature)">{{ sel.temperature }}</span>
                <span :class="badgeBase" :style="stageBadgeStyle(sel.status)">{{ stageLabel(sel.status) }}</span>
              </div>
              <div class="text-[12.5px] text-slate-400">Recebido em {{ sel.date }}</div>
            </div>
            <button
              class="w-9 h-9 border border-slate-200 bg-white rounded-[7px] text-[16px] text-slate-500 cursor-pointer leading-none shrink-0"
              @click="open = false"
            >
              ✕
            </button>
          </div>
          <!-- abas -->
          <div class="px-[22px] flex gap-5">
            <button
              type="button"
              class="pb-2.5 -mb-px text-[13px] font-semibold border-b-2 cursor-pointer bg-transparent transition-colors"
              :class="tab === 'oportunidade' ? 'text-brand border-brand' : 'text-slate-500 border-transparent hover:text-slate-700'"
              @click="tab = 'oportunidade'"
            >
              Oportunidade
            </button>
            <button
              type="button"
              class="pb-2.5 -mb-px text-[13px] font-semibold border-b-2 cursor-pointer bg-transparent transition-colors"
              :class="tab === 'atividades' ? 'text-brand border-brand' : 'text-slate-500 border-transparent hover:text-slate-700'"
              @click="tab = 'atividades'"
            >
              Atividades
            </button>
            <button
              type="button"
              class="pb-2.5 -mb-px text-[13px] font-semibold border-b-2 cursor-pointer bg-transparent transition-colors"
              :class="tab === 'dados' ? 'text-brand border-brand' : 'text-slate-500 border-transparent hover:text-slate-700'"
              @click="tab = 'dados'"
            >
              Dados
            </button>
          </div>
        </div>

        <!-- ABA OPORTUNIDADE -->
        <div v-show="tab === 'oportunidade'" class="px-[22px] pt-5 pb-10 flex flex-col gap-[18px]">
          <!-- contato (pessoa) — apenas apresentação; edição fica em /admin/contatos -->
          <div class="bg-white border border-slate-200 rounded-[10px] p-[18px]">
            <div class="flex items-center justify-between mb-3.5">
              <div :class="blockLabel" class="mb-0">Contato</div>
              <button
                type="button"
                class="text-[12.5px] font-semibold text-brand hover:underline cursor-pointer bg-transparent border-none p-0"
                @click="editContactOpen = true"
              >
                Editar →
              </button>
            </div>

            <div class="mb-3">
              <div class="text-[11.5px] text-slate-400 mb-0.5">Nome</div>
              <div class="text-[14px] font-semibold text-slate-900">{{ sel.contact.name }}</div>
            </div>

            <div v-if="sel.contact.channels?.length" class="flex flex-col gap-1.5">
              <div
                v-for="ch in sel.contact.channels"
                :key="ch.id"
                class="flex items-center gap-2 border border-slate-100 rounded-lg px-2.5 py-2"
              >
                <span
                  class="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md bg-slate-100 text-slate-500 shrink-0"
                  :title="CHANNEL_LABELS[ch.type] || ch.type"
                >
                  <AdminIcon :name="CHANNEL_ICONS[ch.type] || 'message'" :size="15" />
                </span>
                <span class="text-[13px] text-slate-800 truncate flex-1">{{ ch.value }}</span>
                <a
                  v-if="ch.type === 'whatsapp' || ch.type === 'telefone'"
                  :href="waHref(ch.value)"
                  target="_blank"
                  class="inline-flex items-center h-[26px] px-2.5 rounded-md bg-brand text-white text-[12px] font-semibold no-underline shrink-0 transition-all hover:bg-brand-dark"
                  >WhatsApp</a
                >
              </div>
            </div>
            <div v-else class="text-[12.5px] text-slate-400">Nenhuma forma de contato.</div>

            <div v-if="formatResidence(sel.contact)" class="mt-3">
              <div class="text-[11.5px] text-slate-400 mb-0.5">Reside em</div>
              <div class="text-[13px] text-slate-700">{{ formatResidence(sel.contact) }}</div>
            </div>
          </div>

          <!-- funil: status + temperatura (intrínsecos da oportunidade) -->
          <div class="bg-white border border-slate-200 rounded-[10px] p-[18px]">
            <div :class="blockLabel">Funil</div>

            <label :class="drawerLabel">Responsáveis</label>
            <div class="mb-4">
              <AssigneePicker
                :model-value="sel.assignees"
                @update:model-value="patchAssignees($event)"
              />
            </div>

            <label :class="drawerLabel">Temperatura</label>
            <div class="mb-4">
              <ChipSelect
                :model-value="sel.temperature"
                :options="TEMPS.map((t) => ({ value: t, label: t, color: TEMP_HEX[t] || '#94A3B8' }))"
                @update:model-value="patchSel({ temperature: $event })"
              />
            </div>

            <label :class="drawerLabel">Status</label>
            <div :class="{ 'mb-4': isLostStatus }">
              <ChipSelect
                :model-value="sel.status"
                :options="oppStages.map((s) => ({ value: s.key, label: s.label, color: s.color }))"
                @update:model-value="onStatusChange($event)"
              />
            </div>
            <div v-if="isLostStatus">
              <label :class="drawerLabel">Motivo da perda</label>
              <select
                :value="sel.lossReason"
                :class="drawerSelect"
                @change="patchSel({ lossReason: ($event.target as HTMLSelectElement).value })"
              >
                <option value="">—</option>
                <option v-for="r in LOSS_REASONS" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>

            <!-- REPASSE entre boards (ex.: enviar para o board da Corretora) -->
            <div v-if="otherBoards.length" class="mt-4 pt-4 border-t border-slate-100">
              <label :class="drawerLabel">Board</label>
              <div class="flex items-center gap-2 mb-2.5">
                <span class="inline-flex items-center h-[24px] px-2.5 rounded-md text-[12px] font-semibold bg-slate-100 text-slate-600">
                  {{ currentBoard?.label || '—' }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="b in otherBoards"
                  :key="b.id"
                  type="button"
                  :disabled="moving"
                  class="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-[13px] font-semibold text-white bg-brand rounded-[8px] cursor-pointer border-none transition-all hover:bg-brand-dark disabled:opacity-50"
                  @click="moveToBoard(b)"
                >
                  <span class="text-[15px] leading-none">→</span>
                  Enviar para {{ b.label }}
                </button>
              </div>
              <p class="text-[11.5px] text-slate-400 mt-2">
                A oportunidade entra no primeiro estágio do board de destino.
              </p>
            </div>
          </div>
        </div>

        <!-- ABA DADOS (campos personalizados por seção) -->
        <div v-show="tab === 'dados'" class="px-[22px] pt-5 pb-10 flex flex-col gap-[18px]">
          <div
            v-for="section in fieldSections"
            :key="section.id"
            class="bg-white border border-slate-200 rounded-[10px] p-[18px]"
          >
            <div :class="blockLabel">{{ section.label }}</div>
            <div class="grid grid-cols-2 gap-3">
              <DynamicField
                v-for="f in section.fields"
                :key="f.id"
                :def="f"
                :model-value="fieldValue(section.key, f.key)"
                :class="f.type === 'textarea' ? 'col-span-2' : ''"
                @update:model-value="patchField(section.key, f.key, $event)"
              />
            </div>
          </div>
          <div v-if="!fieldSections.length" class="text-[13px] text-slate-400 text-center py-6">
            Nenhum campo personalizado. Configure em Configurações.
          </div>
        </div>

        <!-- ABA ATIVIDADES -->
        <div v-show="tab === 'atividades'" class="px-[22px] pt-5 pb-10 flex flex-col gap-[18px]">
          <!-- atividades e histórico (timeline unificada: notas + interações + follow-ups) -->
          <div class="bg-white border border-slate-200 rounded-[10px] p-[18px]">
            <div :class="blockLabel">Atividades e histórico</div>

            <div class="border border-slate-200 rounded-lg p-3 mb-3.5 flex flex-col gap-2.5 bg-slate-50/50">
              <div class="flex gap-2">
                <select v-model="naType" :class="drawerSelect" class="!w-auto">
                  <option v-for="t in ACTIVITY_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
                <input
                  v-if="!isNota"
                  v-model="naTitle"
                  placeholder="Ex.: Ligar para apresentar opções"
                  :class="drawerInput"
                  class="flex-1"
                />
              </div>

              <!-- nota: texto livre; interação: detalhes opcionais -->
              <textarea
                v-if="isNota"
                v-model="naTitle"
                placeholder="Escreva uma anotação…"
                class="w-full min-h-[70px] px-3 py-2 text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none resize-y leading-[1.5]"
              ></textarea>
              <textarea
                v-else
                v-model="naNotes"
                placeholder="Detalhes (opcional)"
                class="w-full min-h-[70px] px-3 py-2 text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none resize-y leading-[1.5]"
              ></textarea>

              <div class="flex flex-wrap items-center gap-2">
                <input
                  v-if="!isNota"
                  v-model="naDue"
                  type="datetime-local"
                  :class="drawerInput"
                  class="!w-auto"
                />
                <div class="flex gap-2 ml-auto">
                  <button
                    class="h-9 px-3 bg-slate-900 text-white text-[13px] font-semibold rounded-[7px] cursor-pointer hover:bg-slate-800 border-none disabled:opacity-50"
                    :disabled="savingActivity || !naTitle.trim()"
                    :title="isNota ? 'Adiciona a anotação ao histórico' : 'Registra como já realizada agora'"
                    @click="saveActivity(false)"
                  >
                    {{ isNota ? 'Adicionar' : 'Registrar' }}
                  </button>
                  <button
                    v-if="!isNota"
                    class="h-9 px-3 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-[7px] cursor-pointer hover:bg-slate-100 disabled:opacity-50"
                    :disabled="savingActivity || !naTitle.trim() || !naDue"
                    title="Agenda para a data/hora escolhida"
                    @click="saveActivity(true)"
                  >
                    Agendar
                  </button>
                </div>
              </div>
            </div>

            <div v-if="pendingActivities.length" class="flex flex-col gap-2 mb-3">
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">Pendentes</div>
              <div
                v-for="a in pendingActivities"
                :key="a.id"
                class="flex items-start gap-2.5 border border-slate-100 rounded-lg px-3 py-2.5"
              >
                <button
                  title="Concluir"
                  class="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-slate-300 hover:border-brand cursor-pointer bg-white shrink-0"
                  @click="askComplete(a)"
                ></button>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{{ activityLabel(a.type) }}</span>
                    <span class="text-[13px] font-semibold text-slate-800">{{ a.title }}</span>
                  </div>
                  <div v-if="a.notes" class="text-[12px] text-slate-500 mt-0.5 leading-[1.5]">{{ a.notes }}</div>
                  <span
                    v-if="a.dueAt"
                    class="inline-flex items-center mt-1 h-[20px] px-1.5 rounded text-[11px] font-semibold"
                    :class="
                      dueState(a.dueAt) === 'overdue'
                        ? 'bg-red-50 text-red-700'
                        : dueState(a.dueAt) === 'today'
                          ? 'bg-[#FEF6E7] text-amber-700'
                          : 'bg-brand-soft text-brand'
                    "
                    >{{ dueState(a.dueAt) === 'overdue' ? 'Atrasada · ' : '' }}{{ fmtDateTime(a.dueAt) }}</span
                  >
                </div>
                <button
                  title="Excluir"
                  class="text-slate-300 hover:text-red-600 cursor-pointer bg-transparent border-none text-[15px] leading-none shrink-0"
                  @click="deleteActivity(a.id)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div v-if="doneActivities.length" class="flex flex-col gap-1.5">
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">Histórico</div>
              <div v-for="a in doneActivities" :key="a.id" class="flex items-start gap-2.5 px-1 py-1.5">
                <span
                  v-if="a.type === 'nota'"
                  class="mt-0.5 w-[18px] h-[18px] rounded-full bg-slate-100 text-slate-400 shrink-0 flex items-center justify-center"
                  title="Nota"
                >
                  <AdminIcon name="draft" :size="11" />
                </span>
                <span
                  v-else
                  class="mt-0.5 w-[18px] h-[18px] rounded-full bg-brand text-white text-[11px] flex items-center justify-center shrink-0"
                  >✓</span
                >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{{ activityLabel(a.type) }}</span>
                    <span class="text-[13px] text-slate-700">{{ a.title }}</span>
                  </div>
                  <div v-if="a.notes" class="text-[12px] text-slate-500 mt-0.5 leading-[1.5]">{{ a.notes }}</div>
                  <div class="text-[11px] text-slate-400 mt-0.5">{{ a.author }} · {{ fmtDateTime(a.doneAt || a.createdAt) }}</div>
                </div>
                <button
                  title="Excluir"
                  class="text-slate-300 hover:text-red-600 cursor-pointer bg-transparent border-none text-[15px] leading-none shrink-0"
                  @click="deleteActivity(a.id)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              v-if="!pendingActivities.length && !doneActivities.length"
              class="text-[12.5px] text-slate-400 text-center py-1"
            >
              Nada por aqui ainda. Escreva uma nota, registre um contato ou agende um follow-up.
            </div>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- edição do contato, por cima do drawer de oportunidade -->
    <ContactDrawer
      v-model="editContactOpen"
      :contact-id="sel?.contact.id ?? null"
      @updated="onContactEdited"
    />

    <ActivityCompleteModal v-model="completeOpen" :activity="toComplete" @confirm="confirmComplete" />
  </div>
</template>
