<script setup lang="ts">
import {
  type Opportunity,
  type Contact,
  type Activity,
  type OpportunityComment,
  type RawOpportunity,
  mapOpportunity,
  formatResidence,
  sourceLabel,
  CHANNEL_LABELS,
  CHANNEL_ICONS,
  tempBadgeStyle,
  fmtBRL,
  fmtDateTime,
  dueState,
  initials as personInitials,
  avatarColor,
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

// iniciais do contato para o avatar do header
const initials = computed(() => {
  const parts = (sel.value?.contact.name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : ''
  return (first + last).toUpperCase()
})

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

// Recarrega a oportunidade do servidor (atividades + histórico atualizados) e
// emite para o pai. Usado ao abrir o drawer: mudanças feitas fora dele (drag no
// kanban, menu do card) atualizam o objeto local sem os eventos novos.
async function refreshSel() {
  const id = sel.value?.id
  if (!id) return
  try {
    const fresh = await $fetch<RawOpportunity>(`/opportunities/${id}`, {
      baseURL: apiBase,
      credentials: 'include',
    })
    emit('updated', mapOpportunity(fresh))
  } catch {
    /* mantém o que já tem */
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

// ícone por tipo de atividade (nós da linha do tempo)
const ACT_ICONS: Record<string, string> = {
  nota: '<path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  ligação:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z"/>',
  whatsapp: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  reunião:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="8" r="3.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
  visita: '<path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  tarefa: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
}
const ActIcon = (props: { type: string; size?: number }) =>
  h('svg', {
    width: props.size || 14,
    height: props.size || 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    innerHTML: ACT_ICONS[props.type] || '<circle cx="12" cy="12" r="9"/>',
  })

// ── histórico (eventos do sistema) ──
const EVENT_ICONS: Record<string, string> = {
  created: '<path d="M12 5v14M5 12h14"/>',
  stage_changed: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  won: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M12 14v4M8 21h8"/>',
  lost: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  pipeline_changed: '<path d="M7 16V4M4 7l3-3 3 3"/><path d="M17 8v12M14 17l3 3 3-3"/>',
  assignees_changed: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="8" r="3.5"/>',
  temperature_changed: '<path d="M14 14.76V4a2 2 0 1 0-4 0v10.76a4 4 0 1 0 4 0z"/>',
  fields_updated: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  document_added: '<path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.19 9.19a1 1 0 0 1-1.41-1.41l8.48-8.49"/>',
  document_removed: '<path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.19 9.19a1 1 0 0 1-1.41-1.41l8.48-8.49"/>',
}
const EvIcon = (props: { type: string; size?: number }) =>
  h('svg', {
    width: props.size || 14,
    height: props.size || 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    innerHTML: EVENT_ICONS[props.type] || '<circle cx="12" cy="12" r="9"/>',
  })
const EVENT_COLORS: Record<string, string> = {
  created: '#4338ca',
  stage_changed: '#0369a1',
  won: '#146c4e',
  lost: '#be123c',
  pipeline_changed: '#7c3aed',
  assignees_changed: '#0f766e',
  temperature_changed: '#c2410c',
  fields_updated: '#64748b',
  document_added: '#0f766e',
  document_removed: '#be123c',
}
const eventColor = (t: string) => EVENT_COLORS[t] || '#64748b'
// eventos já vêm do backend do mais recente para o mais antigo
const eventTimeline = computed(() => sel.value?.events ?? [])
// descrição legível de cada evento (rótulos "congelados" vêm no data)
function eventText(e: { type: string; data: Record<string, unknown> }) {
  const d = (e.data || {}) as Record<string, any>
  switch (e.type) {
    case 'created':
      return 'Oportunidade criada'
    case 'stage_changed':
      return `Mudou de estágio: ${d.fromStageLabel || '—'} → ${d.toStageLabel || '—'}`
    case 'won':
      return `Marcou como ganho${d.toStageLabel ? ` (${d.toStageLabel})` : ''}`
    case 'lost':
      return `Marcou como perdido${d.lossReason ? ` — ${d.lossReason}` : ''}`
    case 'pipeline_changed':
      return `Repassou: ${d.fromPipelineLabel || '—'} → ${d.toPipelineLabel || '—'}`
    case 'temperature_changed':
      return `Temperatura: ${d.from || '—'} → ${d.to || '—'}`
    case 'assignees_changed': {
      const parts: string[] = []
      if (Array.isArray(d.added) && d.added.length) parts.push(`+ ${d.added.join(', ')}`)
      if (Array.isArray(d.removed) && d.removed.length) parts.push(`− ${d.removed.join(', ')}`)
      return `Responsáveis ${parts.join('   ') || 'atualizados'}`
    }
    case 'fields_updated':
      return `Atualizou: ${Array.isArray(d.fields) ? d.fields.join(', ') : 'campos'}`
    case 'document_added':
      return `Anexou documento: ${d.fileName || ''}`
    case 'document_removed':
      return `Removeu documento: ${d.fileName || ''}`
    default:
      return e.type
  }
}

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
const tab = ref<'atividades' | 'comentarios' | 'oportunidade' | 'historico' | 'dados'>('atividades')

// ── descrição (markdown) da oportunidade ──
const descDraft = ref('')
const descDirty = computed(() => descDraft.value !== (sel.value?.description ?? ''))
// (re)inicializa o rascunho ao abrir ou trocar de oportunidade
watch([open, () => sel.value?.id], () => {
  if (open.value) descDraft.value = sel.value?.description ?? ''
})
async function saveDescription() {
  await patchSel({ description: descDraft.value })
}

// ── comentários internos ──
const { user: authUser } = useAuth()
const comments = computed(() => sel.value?.comments ?? [])
const newComment = ref('')
const editingComment = ref<string | null>(null)
const editCommentBody = ref('')
const commentEl = ref<HTMLElement | null>(null)

function scrollComments() {
  nextTick(() => {
    if (commentEl.value) commentEl.value.scrollTop = commentEl.value.scrollHeight
  })
}
async function addComment() {
  const id = sel.value?.id
  const body = newComment.value.trim()
  if (!id || !body) return
  newComment.value = ''
  try {
    const updated = await $fetch<RawOpportunity>(`/opportunities/${id}/comments`, {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { body },
    })
    emit('updated', mapOpportunity(updated))
    scrollComments()
  } catch {
    newComment.value = body // devolve o texto se falhar
  }
}
function startEditComment(c: OpportunityComment) {
  editingComment.value = c.id
  editCommentBody.value = c.body
}
function cancelEditComment() {
  editingComment.value = null
  editCommentBody.value = ''
}
async function saveEditComment(c: OpportunityComment) {
  const id = sel.value?.id
  const body = editCommentBody.value.trim()
  if (!id || !body) return
  cancelEditComment()
  const updated = await $fetch<RawOpportunity>(`/opportunities/${id}/comments/${c.id}`, {
    baseURL: apiBase,
    method: 'PATCH',
    credentials: 'include',
    body: { body },
  })
  emit('updated', mapOpportunity(updated))
}
async function deleteComment(c: OpportunityComment) {
  const id = sel.value?.id
  if (!id) return
  const updated = await $fetch<RawOpportunity>(`/opportunities/${id}/comments/${c.id}`, {
    baseURL: apiBase,
    method: 'DELETE',
    credentials: 'include',
  })
  emit('updated', mapOpportunity(updated))
}

// ao (re)abrir o drawer: atualiza o campo de data e volta pra aba Atividades
watch(open, (v) => {
  if (v) {
    naDue.value = nowLocal()
    tab.value = 'atividades'
    scrollTimeline()
    refreshSel() // pega atividades/histórico atualizados por ações fora do drawer
  }
})
// ao entrar na aba Atividades, rola pro fim (mais recente)
watch(tab, (t) => {
  if (t === 'atividades') scrollTimeline()
  if (t === 'comentarios') scrollComments()
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
          <div class="px-[22px] pt-[18px] pb-3.5">
            <!-- topo: avatar + nome/meta + ações -->
            <div class="flex items-start gap-3">
              <div
                class="w-11 h-11 rounded-full font-bold text-[15px] flex items-center justify-center shrink-0 select-none"
                :style="tempBadgeStyle(sel.temperature)"
                :title="'Temperatura: ' + sel.temperature"
              >
                {{ initials }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1">
                  <h2 class="text-[18px] font-extrabold tracking-[-0.02em] m-0 text-slate-900 truncate">
                    {{ sel.contact.name }}
                  </h2>
                  <button
                    type="button"
                    class="w-6 h-6 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand cursor-pointer bg-transparent border-none shrink-0"
                    title="Editar contato"
                    @click="editContactOpen = true"
                  >
                    <svg class="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                </div>
                <div class="text-[12px] text-slate-400 mt-0.5 truncate">
                  <template v-if="sel.source">{{ sourceLabel(sel.source) }} · </template>Recebido em {{ sel.date }}
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  class="w-9 h-9 inline-flex items-center justify-center border border-slate-200 bg-white rounded-[8px] text-slate-500 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors"
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
                  class="w-9 h-9 inline-flex items-center justify-center border border-slate-200 bg-white rounded-[8px] text-slate-500 cursor-pointer hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  title="Fechar"
                  @click="open = false"
                >
                  <svg class="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <!-- chips: status + temperatura (bolinha) + responsáveis -->
            <div class="flex items-center gap-2.5 flex-wrap mt-3">
              <span :class="badgeBase" :style="stageBadgeStyle(sel.stageId)">{{ stageLabel(sel.stageId) }}</span>
              <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: tempBadgeStyle(sel.temperature).color }"></span>
                {{ sel.temperature }}
              </span>
              <AvatarStack v-if="sel.assignees?.length" :users="sel.assignees" :size="22" :max="4" />
            </div>

            <!-- canais — clicar copia o valor -->
            <div v-if="sel.contact.channels?.length" class="flex items-center gap-1.5 flex-wrap mt-2.5">
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

            <!-- residência -->
            <div v-if="formatResidence(sel.contact)" class="flex items-center gap-1 text-[12px] text-slate-400 mt-2.5">
              <svg class="w-[13px] h-[13px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              <span class="truncate">{{ formatResidence(sel.contact) }}</span>
            </div>
          </div>
          <!-- abas -->
          <div class="px-[22px] flex gap-4 overflow-x-auto">
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
              :class="tab === 'comentarios' ? 'text-brand border-brand' : 'text-slate-500 border-transparent hover:text-slate-700'"
              @click="tab = 'comentarios'"
            >
              Comentários<span v-if="comments.length" class="ml-1 text-slate-400">{{ comments.length }}</span>
            </button>
            <button
              type="button"
              class="pb-2.5 -mb-px text-[13px] font-semibold border-b-2 cursor-pointer bg-transparent transition-colors whitespace-nowrap"
              :class="tab === 'oportunidade' ? 'text-brand border-brand' : 'text-slate-500 border-transparent hover:text-slate-700'"
              @click="tab = 'oportunidade'"
            >
              Oportunidade
            </button>
            <button
              type="button"
              class="pb-2.5 -mb-px text-[13px] font-semibold border-b-2 cursor-pointer bg-transparent transition-colors"
              :class="tab === 'historico' ? 'text-brand border-brand' : 'text-slate-500 border-transparent hover:text-slate-700'"
              @click="tab = 'historico'"
            >
              Histórico
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

        <!-- ABA COMENTÁRIOS (thread interno: lista rola acima, form fixo embaixo) -->
        <div v-show="tab === 'comentarios'" class="flex-1 min-h-0 flex flex-col">
          <div ref="commentEl" class="flex-1 min-h-0 overflow-y-auto px-[22px] py-4">
            <div v-if="!comments.length" class="text-[13px] text-slate-400 text-center py-8">
              Nenhum comentário ainda. Deixe o primeiro para a equipe.
            </div>
            <div class="flex flex-col gap-3.5">
              <div v-for="c in comments" :key="c.id" class="group/cmt flex gap-2.5">
                <span
                  class="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-bold"
                  :style="{ backgroundColor: avatarColor(c.authorId) }"
                >
                  {{ personInitials(c.author) }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[12.5px] font-semibold text-slate-800">{{ c.author || '—' }}</span>
                    <span class="text-[11px] text-slate-400">
                      {{ fmtDateTime(c.createdAt) }}<template v-if="c.updatedAt !== c.createdAt"> · editado</template>
                    </span>
                    <span
                      v-if="authUser && c.authorId === authUser.id && editingComment !== c.id"
                      class="ml-auto flex items-center gap-2 opacity-0 group-hover/cmt:opacity-100 transition-opacity"
                    >
                      <button type="button" class="text-[11px] font-semibold text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-0" @click="startEditComment(c)">Editar</button>
                      <button type="button" class="text-[11px] font-semibold text-slate-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-0" @click="deleteComment(c)">Excluir</button>
                    </span>
                  </div>
                  <div v-if="editingComment === c.id" class="mt-1">
                    <textarea
                      v-model="editCommentBody"
                      rows="2"
                      class="w-full px-3 py-2 text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none resize-y leading-[1.5]"
                    ></textarea>
                    <div class="flex gap-2 mt-1">
                      <button type="button" class="h-8 px-3 text-[12.5px] font-semibold text-white bg-brand rounded-md cursor-pointer border-none hover:bg-brand-dark disabled:opacity-50" :disabled="!editCommentBody.trim()" @click="saveEditComment(c)">Salvar</button>
                      <button type="button" class="h-8 px-3 text-[12.5px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-md cursor-pointer" @click="cancelEditComment">Cancelar</button>
                    </div>
                  </div>
                  <div v-else class="text-[13px] text-slate-700 whitespace-pre-wrap leading-snug mt-0.5">{{ c.body }}</div>
                </div>
              </div>
            </div>
          </div>
          <!-- composer -->
          <div class="shrink-0 border-t border-slate-200 bg-white px-[22px] py-3">
            <textarea
              v-model="newComment"
              rows="2"
              placeholder="Escreva um comentário interno… (Ctrl+Enter para enviar)"
              class="w-full min-h-[44px] px-3 py-2 text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none resize-y leading-[1.5]"
              @keydown.enter.ctrl.prevent="addComment"
              @keydown.enter.meta.prevent="addComment"
            ></textarea>
            <div class="flex justify-end mt-2">
              <button
                type="button"
                class="h-9 px-3.5 text-[13px] font-semibold text-white bg-brand rounded-[7px] cursor-pointer border-none hover:bg-brand-dark disabled:opacity-50"
                :disabled="!newComment.trim()"
                @click="addComment"
              >
                Comentar
              </button>
            </div>
          </div>
        </div>

        <!-- ABA OPORTUNIDADE (descrição em markdown + documentos) -->
        <div v-show="tab === 'oportunidade'" class="flex-1 min-h-0 overflow-y-auto px-[22px] py-4 flex flex-col gap-6">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Descrição</div>
              <button
                v-if="descDirty"
                type="button"
                class="h-7 px-3 text-[12px] font-semibold text-white bg-brand rounded-md cursor-pointer border-none hover:bg-brand-dark"
                @click="saveDescription"
              >
                Salvar
              </button>
            </div>
            <MarkdownEditor
              v-if="tab === 'oportunidade'"
              v-model="descDraft"
              height="240px"
              initial-edit-type="markdown"
              preview-style="tab"
            />
          </div>

          <div>
            <div class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2">Documentos</div>
            <DocumentsPanel v-if="sel" :contact-id="sel.contact.id" :opportunity-id="sel.id" @changed="refreshSel" />
          </div>
        </div>

        <!-- ABA HISTÓRICO (log read-only de alterações/movimentações) -->
        <div v-show="tab === 'historico'" class="flex-1 min-h-0 overflow-y-auto px-[22px] py-4">
          <div v-if="!eventTimeline.length" class="text-[13px] text-slate-400 text-center py-8">
            Sem alterações registradas ainda.
          </div>
          <div v-for="(e, i) in eventTimeline" :key="e.id" class="relative flex gap-3">
            <!-- nó + trilho vertical -->
            <div class="flex flex-col items-center">
              <span
                class="inline-flex items-center justify-center w-6 h-6 rounded-full text-white shrink-0"
                :style="{ backgroundColor: eventColor(e.type) }"
              >
                <EvIcon :type="e.type" :size="13" />
              </span>
              <div
                v-if="i < eventTimeline.length - 1"
                class="w-px flex-1 bg-slate-200 my-1 min-h-[10px]"
              ></div>
            </div>
            <!-- conteúdo -->
            <div class="pb-4 min-w-0">
              <div class="text-[13px] text-slate-800 leading-snug">{{ eventText(e) }}</div>
              <div class="text-[11.5px] text-slate-400 mt-0.5">
                {{ e.author || 'Sistema' }} · {{ fmtDateTime(e.createdAt) }}
              </div>
            </div>
          </div>
        </div>

        <!-- ABA ATIVIDADES (chat: lista rola acima, form fixo embaixo) -->
        <div v-show="tab === 'atividades'" class="flex-1 min-h-0 flex flex-col">
          <!-- timeline: mais antiga no topo, mais recente colada no form -->
          <div ref="timelineEl" class="flex-1 min-h-0 overflow-y-auto px-[22px] py-4">
            <div class="flex flex-col min-h-full justify-end">
              <div
                v-if="!timeline.length"
                class="text-[12.5px] text-slate-400 text-center py-8"
              >
                Nada por aqui ainda. Escreva uma nota, registre um contato ou agende um follow-up.
              </div>

              <div
                v-for="(a, i) in timeline"
                :key="a.id"
                class="group/act relative flex gap-3"
              >
                <!-- trilho: nó (ícone do tipo) + linha conectora -->
                <div class="flex flex-col items-center shrink-0">
                  <button
                    v-if="!a.done"
                    title="Concluir"
                    class="w-7 h-7 rounded-full flex items-center justify-center bg-white border-2 border-brand/30 text-brand hover:bg-brand hover:text-white cursor-pointer transition-colors shrink-0"
                    @click="askComplete(a)"
                  >
                    <ActIcon :type="a.type" :size="13" />
                  </button>
                  <div
                    v-else
                    class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    :class="a.type === 'nota' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'"
                  >
                    <ActIcon :type="a.type" :size="13" />
                  </div>
                  <div v-if="i < timeline.length - 1" class="w-px flex-1 bg-slate-200 mt-1.5 min-h-[10px]"></div>
                </div>

                <!-- conteúdo: tipo → título → observação → prazo/autor -->
                <div class="flex-1 min-w-0 pb-4">
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">{{ activityLabel(a.type) }}</span>
                    <button
                      title="Excluir"
                      class="-mt-0.5 text-slate-300 hover:text-red-600 cursor-pointer bg-transparent border-none text-[14px] leading-none shrink-0 opacity-0 group-hover/act:opacity-100 transition-opacity"
                      @click="deleteActivity(a.id)"
                    >
                      ✕
                    </button>
                  </div>
                  <div class="text-[13px] text-slate-800 mt-0.5" :class="{ 'font-semibold': !a.done }">{{ a.title }}</div>
                  <div v-if="a.notes" class="text-[12px] text-slate-500 mt-1 leading-[1.5] whitespace-pre-line">{{ a.notes }}</div>
                  <span
                    v-if="!a.done && a.dueAt"
                    class="inline-flex items-center mt-1.5 h-[20px] px-1.5 rounded text-[11px] font-semibold"
                    :class="
                      dueState(a.dueAt) === 'overdue'
                        ? 'bg-red-50 text-red-700'
                        : dueState(a.dueAt) === 'today'
                          ? 'bg-[#FEF6E7] text-amber-700'
                          : 'bg-brand-soft text-brand'
                    "
                    >{{ dueState(a.dueAt) === 'overdue' ? 'Atrasada · ' : '' }}{{ fmtDateTime(a.dueAt) }}</span
                  >
                  <div v-else-if="a.done" class="text-[11px] text-slate-400 mt-1">
                    {{ a.author }} · {{ fmtDateTime(a.doneAt || a.createdAt) }}
                  </div>
                </div>
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
