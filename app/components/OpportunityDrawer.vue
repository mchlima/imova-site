<script setup lang="ts">
import {
  type Opportunity,
  type Contact,
  type Activity,
  type RawOpportunity,
  mapOpportunity,
  formatResidence,
  CHANNEL_LABELS,
  CHANNEL_ICONS,
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
  deleted: [string]
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
const { loadStages, stagesFor, stageBadgeStyle, stageLabel } = useStages()
loadStages()

// estágios do board da oportunidade aberta
const oppStages = computed(() => stagesFor(sel.value?.pipelineId))

// boards ordenados (destinos de repasse no menu de ações)
const orderedBoards = computed(() => [...(props.boards ?? [])].sort((a, b) => a.order - b.order))

// usuários (responsáveis) — para o menu de ações do header
const { users, loadUsers } = useUsers()
loadUsers()

// menu de ações rápidas (kebab) no header — o mesmo dos cards
const cardMenu = ref<{ openFor: (o: Opportunity, e: MouseEvent) => void } | null>(null)
function openMenu(e: MouseEvent) {
  if (sel.value) cardMenu.value?.openFor(sel.value, e)
}
// oportunidade excluída pelo menu: avisa o pai e fecha o drawer
function onMenuDeleted(id: string) {
  emit('deleted', id)
  open.value = false
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

const badgeBase =
  'inline-flex items-center h-[22px] px-[9px] rounded-md text-[11.5px] font-semibold whitespace-nowrap'

// clicar num dado de contato copia o valor (com feedback "Copiado!" por ~1.5s)
const copiedVal = ref<string | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copyValue(v: string) {
  try {
    await navigator.clipboard.writeText(v)
  } catch {
    /* clipboard indisponível — ignora */
  }
  copiedVal.value = v
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copiedVal.value = null), 1500)
}
onBeforeUnmount(() => clearTimeout(copyTimer))

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
// interação (não-nota): data no futuro = agendamento (follow-up); passada/agora = registro concluído
const naIsFuture = computed(
  () => !isNota.value && !!naDue.value && new Date(naDue.value).getTime() > Date.now(),
)

// abas do drawer (a antiga "Oportunidade" saiu — ações vão pro kebab do header)
const tab = ref<'atividades' | 'dados'>('atividades')

// ao (re)abrir o drawer: atualiza o campo de data e volta pra aba Atividades
watch(open, (v) => {
  if (v) {
    naDue.value = nowLocal()
    tab.value = 'atividades'
    scrollTimeline()
  }
})
// ao entrar na aba Atividades, rola pro fim (mais recente)
watch(tab, (t) => {
  if (t === 'atividades') scrollTimeline()
})

// timeline única, cronológica (mais antiga no topo; a mais recente fica colada no form embaixo).
// tempo efetivo: concluída → doneAt; agendada/registrada → dueAt; senão createdAt.
const timeline = computed(() => {
  const t = (a: Activity) =>
    new Date(a.done ? a.doneAt || a.createdAt : a.dueAt || a.createdAt).getTime()
  return [...(sel.value?.activities ?? [])].sort((a, b) => t(a) - t(b))
})

// rola a lista pro fim (mensagem mais recente) — comportamento de chat
const timelineEl = ref<HTMLElement | null>(null)
function scrollTimeline() {
  nextTick(() => {
    const el = timelineEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function saveActivity() {
  const id = sel.value?.id
  const title = naTitle.value.trim()
  if (!id || !title) return
  if (!isNota.value && !naDue.value) return
  savingActivity.value = true
  try {
    const body: Record<string, unknown> = { type: naType.value, title }
    if (isNota.value) {
      // nota: só histórico, sem data, nunca vira follow-up
      body.done = true
    } else {
      if (naNotes.value.trim()) body.notes = naNotes.value.trim()
      const due = new Date(naDue.value)
      body.dueAt = due.toISOString()
      // passado/agora → registro concluído (não polui follow-up); futuro → agendamento
      body.done = due.getTime() <= Date.now()
    }
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
    scrollTimeline()
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
  scrollTimeline()
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
        class="fixed top-0 right-0 z-[41] w-[520px] max-w-[94vw] h-screen bg-slate-50 shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.3)] flex flex-col overflow-hidden"
      >
        <!-- drawer header (fixo): nome + temperatura + status sempre visíveis -->
        <div class="shrink-0 bg-white border-b border-slate-200">
          <div class="px-[22px] pt-[18px] pb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <!-- linha 1: nome + editar (lápis) -->
              <div class="flex items-center gap-1.5 mb-1.5">
                <h2 class="text-[19px] font-extrabold tracking-[-0.02em] m-0 text-slate-900 truncate">
                  {{ sel.contact.name }}
                </h2>
                <button
                  type="button"
                  class="w-6 h-6 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand cursor-pointer bg-transparent border-none shrink-0"
                  title="Editar contato"
                  @click="editContactOpen = true"
                >
                  <svg class="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              </div>

              <!-- linha 2: badges (temperatura/status) + avatares -->
              <div class="flex items-center gap-2 flex-wrap mb-1.5">
                <span :class="badgeBase" :style="tempBadgeStyle(sel.temperature)">{{ sel.temperature }}</span>
                <span :class="badgeBase" :style="stageBadgeStyle(sel.status)">{{ stageLabel(sel.status) }}</span>
                <AvatarStack v-if="sel.assignees?.length" :users="sel.assignees" :size="22" :max="4" />
              </div>

              <!-- linha 3: canais — clicar copia o valor -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <button
                  v-for="ch in sel.contact.channels"
                  :key="ch.id"
                  type="button"
                  :title="'Copiar ' + (CHANNEL_LABELS[ch.type] || ch.type)"
                  class="inline-flex items-center gap-1.5 h-[26px] pl-1.5 pr-2.5 rounded-md text-[12px] font-medium max-w-[240px] cursor-pointer border-none transition-colors"
                  :class="copiedVal === ch.value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  @click="copyValue(ch.value)"
                >
                  <template v-if="copiedVal === ch.value">
                    <svg class="w-[13px] h-[13px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11" /></svg>
                    Copiado!
                  </template>
                  <template v-else>
                    <AdminIcon :name="CHANNEL_ICONS[ch.type] || 'message'" :size="13" />
                    <span class="truncate">{{ ch.value }}</span>
                  </template>
                </button>
              </div>

              <div class="text-[12px] text-slate-400 mt-1.5">
                Recebido em {{ sel.date }}<template v-if="formatResidence(sel.contact)"> · reside em {{ formatResidence(sel.contact) }}</template>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- ações rápidas (mesmo menu dos cards) -->
              <button
                class="w-9 h-9 inline-flex items-center justify-center border border-slate-200 bg-white rounded-[7px] text-slate-500 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors"
                title="Ações rápidas"
                @click="openMenu($event)"
              >
                <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.7" />
                  <circle cx="12" cy="12" r="1.7" />
                  <circle cx="12" cy="19" r="1.7" />
                </svg>
              </button>
              <button
                class="w-9 h-9 border border-slate-200 bg-white rounded-[7px] text-[16px] text-slate-500 cursor-pointer leading-none"
                @click="open = false"
              >
                ✕
              </button>
            </div>
          </div>
          <!-- abas -->
          <div class="px-[22px] flex gap-5">
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

        <!-- ABA DADOS (campos personalizados por seção) -->
        <div v-show="tab === 'dados'" class="flex-1 min-h-0 overflow-y-auto px-[22px] pt-5 pb-10 flex flex-col gap-[18px]">
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

        <!-- ABA ATIVIDADES (chat: lista rola acima, form fixo embaixo) -->
        <div v-show="tab === 'atividades'" class="flex-1 min-h-0 flex flex-col">
          <!-- timeline: mais antiga no topo, mais recente colada no form -->
          <div ref="timelineEl" class="flex-1 min-h-0 overflow-y-auto px-[22px] py-4">
            <div class="flex flex-col gap-2 min-h-full justify-end">
              <div
                v-if="!timeline.length"
                class="text-[12.5px] text-slate-400 text-center py-8"
              >
                Nada por aqui ainda. Escreva uma nota, registre um contato ou agende um follow-up.
              </div>

              <div
                v-for="a in timeline"
                :key="a.id"
                class="group/act flex items-start gap-2.5"
                :class="!a.done ? 'border border-slate-200 rounded-lg px-3 py-2.5 bg-white' : 'px-1 py-1.5'"
              >
                <!-- ícone / concluir -->
                <button
                  v-if="!a.done"
                  title="Concluir"
                  class="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-slate-300 hover:border-brand cursor-pointer bg-white shrink-0"
                  @click="askComplete(a)"
                ></button>
                <span
                  v-else-if="a.type === 'nota'"
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
                  <span class="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{{ activityLabel(a.type) }}</span>
                  <div class="text-[13px] text-slate-800 mt-1" :class="{ 'font-semibold': !a.done }">{{ a.title }}</div>
                  <div v-if="a.notes" class="text-[12px] text-slate-500 mt-0.5 leading-[1.5]">{{ a.notes }}</div>
                  <!-- pendente: prazo; concluída: autor · quando -->
                  <span
                    v-if="!a.done && a.dueAt"
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
                  <div v-else-if="a.done" class="text-[11px] text-slate-400 mt-0.5">
                    {{ a.author }} · {{ fmtDateTime(a.doneAt || a.createdAt) }}
                  </div>
                </div>

                <button
                  title="Excluir"
                  class="text-slate-300 hover:text-red-600 cursor-pointer bg-transparent border-none text-[15px] leading-none shrink-0 opacity-0 group-hover/act:opacity-100 transition-opacity"
                  @click="deleteActivity(a.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- COMPOSER fixo embaixo -->
          <div class="shrink-0 border-t border-slate-200 bg-white px-[22px] py-3">
            <div class="flex flex-col gap-2.5">
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

              <textarea
                v-if="isNota"
                v-model="naTitle"
                placeholder="Escreva uma anotação…"
                class="w-full min-h-[56px] px-3 py-2 text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none resize-y leading-[1.5]"
              ></textarea>
              <textarea
                v-else
                v-model="naNotes"
                placeholder="Detalhes (opcional)"
                class="w-full min-h-[44px] px-3 py-2 text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none resize-y leading-[1.5]"
              ></textarea>

              <div class="flex flex-wrap items-center gap-2">
                <input v-if="!isNota" v-model="naDue" type="datetime-local" :class="drawerInput" class="!w-auto" />
                <div class="flex gap-2 ml-auto">
                  <button
                    class="h-9 px-3.5 text-[13px] font-semibold rounded-[7px] cursor-pointer border-none disabled:opacity-50"
                    :class="naIsFuture ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-slate-900 text-white hover:bg-slate-800'"
                    :disabled="savingActivity || !naTitle.trim() || (!isNota && !naDue)"
                    :title="isNota ? 'Adiciona a anotação ao histórico' : naIsFuture ? 'Agenda para a data/hora escolhida (follow-up)' : 'Registra como já realizada (concluída)'"
                    @click="saveActivity()"
                  >
                    {{ isNota ? 'Adicionar' : naIsFuture ? 'Agendar' : 'Registrar' }}
                  </button>
                </div>
              </div>
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

    <!-- menu de ações rápidas do header (o mesmo dos cards) -->
    <CardActionsMenu
      ref="cardMenu"
      :stages="oppStages"
      :boards="orderedBoards"
      :users="users"
      @updated="emit('updated', $event)"
      @moved="emit('moved', $event)"
      @deleted="onMenuDeleted"
    />
  </div>
</template>
