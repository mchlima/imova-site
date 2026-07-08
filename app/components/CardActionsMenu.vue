<script setup lang="ts">
// Menu de contexto (ações rápidas) para um card de oportunidade no kanban/lista.
// Abre pelo botão ⋯ ou pelo botão direito (o pai chama `openFor(opp, event)`).
// Reusa os endpoints existentes: PATCH /opportunities/:id (etapa/temperatura/responsáveis),
// POST /:id/move-pipeline (repasse) e DELETE /:id (excluir).
import type { Opportunity, RawOpportunity, Assignee } from '~/utils/opportunityModel'
import { mapOpportunity, TEMPS, TEMP_HEX, LOSS_REASONS } from '~/utils/opportunityModel'
import type { Stage } from '~/composables/useStages'
import type { Pipeline } from '~/composables/usePipelines'
import type { CrmUser } from '~/composables/useUsers'

const props = defineProps<{
  stages: Stage[]
  boards: Pipeline[]
  users: CrmUser[]
}>()
const emit = defineEmits<{
  updated: [Opportunity]
  moved: [Opportunity]
  deleted: [string]
}>()

const apiBase = useRuntimeConfig().public.apiBase

const opp = ref<Opportunity | null>(null)
const openState = ref(false)
const view = ref<'root' | 'move' | 'stage' | 'assignee' | 'temp' | 'lost'>('root')
const pos = ref({ x: 0, y: 0 })
const busy = ref(false)

const MENU_W = 236
const EST_H = 360
function openFor(o: Opportunity, ev: MouseEvent) {
  opp.value = o
  view.value = 'root'
  const x = Math.min(ev.clientX, window.innerWidth - MENU_W - 8)
  const y = Math.min(ev.clientY, window.innerHeight - EST_H)
  pos.value = { x: Math.max(8, x), y: Math.max(8, y) }
  openState.value = true
}
function close() {
  openState.value = false
  opp.value = null
  view.value = 'root'
}
defineExpose({ openFor })

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
watch(openState, (v) => {
  if (!import.meta.client) return
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => import.meta.client && window.removeEventListener('keydown', onKey))

const otherBoards = computed(() => props.boards.filter((b) => b.id !== opp.value?.pipelineId))
const wonStage = computed(() => props.stages.find((s) => s.isWon) || null)
const lostStage = computed(() => props.stages.find((s) => s.isLost) || null)
const isAssigned = (uid: string) => !!opp.value?.assignees?.some((a) => a.id === uid)
const tempHex = (t: string) => TEMP_HEX[t] || '#94A3B8'

// PATCH otimista: atualiza o card local e o pai na hora; reconcilia com a resposta.
async function patch(body: Record<string, unknown>, optimistic?: Partial<Opportunity>) {
  const o = opp.value
  if (!o) return
  if (optimistic) {
    const merged = { ...o, ...optimistic }
    opp.value = merged
    emit('updated', merged)
  }
  try {
    const updated = await $fetch<RawOpportunity>(`/opportunities/${o.id}`, {
      baseURL: apiBase,
      method: 'PATCH',
      credentials: 'include',
      body,
    })
    const m = mapOpportunity(updated)
    if (opp.value?.id === m.id) opp.value = m
    emit('updated', m)
  } catch {
    /* o pai recarrega se precisar */
  }
}

async function setStage(stageId: string) {
  await patch({ stageId }, { stageId })
  close()
}
async function setTemp(t: string) {
  await patch({ temperature: t }, { temperature: t })
  close()
}
// responsáveis: multi-seleção — mantém o submenu aberto pra marcar vários.
async function toggleAssignee(u: CrmUser) {
  const o = opp.value
  if (!o) return
  const has = isAssigned(u.id)
  const nextAssignees: Assignee[] = has
    ? o.assignees.filter((a) => a.id !== u.id)
    : [...o.assignees, { id: u.id, name: u.name }]
  await patch({ assigneeIds: nextAssignees.map((a) => a.id) }, { assignees: nextAssignees })
}
async function markWon() {
  if (!wonStage.value) return
  await patch({ stageId: wonStage.value.id }, { stageId: wonStage.value.id })
  close()
}
// marca como perdido escolhendo um motivo curado (submenu 'lost')
async function setLost(reason: string) {
  if (!lostStage.value) return
  await patch({ stageId: lostStage.value.id, lossReason: reason }, { stageId: lostStage.value.id })
  close()
}
async function moveTo(b: Pipeline) {
  const o = opp.value
  if (!o || busy.value) return
  busy.value = true
  try {
    const updated = await $fetch<RawOpportunity>(`/opportunities/${o.id}/move-pipeline`, {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { pipelineId: b.id },
    })
    emit('moved', mapOpportunity(updated))
  } catch {
    /* o pai recarrega se precisar */
  } finally {
    busy.value = false
    close()
  }
}
async function removeOpp() {
  const o = opp.value
  if (!o) return
  if (!window.confirm(`Excluir a oportunidade de ${o.contact.name}? Esta ação não pode ser desfeita.`))
    return
  try {
    await $fetch(`/opportunities/${o.id}`, {
      baseURL: apiBase,
      method: 'DELETE',
      credentials: 'include',
    })
    emit('deleted', o.id)
  } catch {
    /* o pai recarrega se precisar */
  } finally {
    close()
  }
}

const item =
  'w-full flex items-center justify-between gap-2 h-9 px-3 text-left text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent disabled:opacity-50 disabled:cursor-default'
const head =
  'w-full flex items-center gap-2 h-9 px-3 text-left text-[13px] font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer border-none bg-transparent'
const divider = 'my-1 border-t border-slate-100'
const chev = 'text-slate-400 text-[12px]'

// ícones (paths internos de um <svg viewBox="0 0 24 24">, stroke)
const ICONS: Record<string, string> = {
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4L22 2z"/>',
  stage: '<rect x="3" y="4" width="6" height="16" rx="1"/><rect x="10" y="4" width="6" height="11" rx="1"/><rect x="17" y="4" width="6" height="7" rx="1"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>',
  temp: '<path d="M14 14.76V4a2 2 0 1 0-4 0v10.76a4 4 0 1 0 4 0z"/>',
  won: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  lost: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
}
// ícone reutilizável: <MIcon name="send" /> (aceita class extra p/ cor)
const MIcon = (props: { name: string; class?: unknown }) =>
  h('svg', {
    class: ['w-4 h-4 shrink-0 text-slate-400', props.class],
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    innerHTML: ICONS[props.name] || '',
  })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="openState && opp"
      class="fixed inset-0 z-[70]"
      @click.self="close"
      @contextmenu.prevent="close"
    >
      <div
        class="absolute w-[236px] bg-white border border-slate-200 rounded-[10px] shadow-[0_10px_34px_rgba(15,23,42,0.16)] py-1.5 max-h-[80vh] overflow-y-auto"
        :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
        @click.stop
      >
        <!-- RAIZ -->
        <template v-if="view === 'root'">
          <div class="px-3 pt-0.5 pb-1.5 text-[11px] font-semibold text-slate-400 truncate">
            {{ opp.contact.name }}
          </div>
          <template v-if="otherBoards.length">
            <button :class="item" @click="view = 'move'">
              <span class="flex items-center gap-2.5"><MIcon name="send" /> Enviar para</span>
              <span :class="chev">▸</span>
            </button>
            <div :class="divider" />
          </template>
          <button :class="item" @click="view = 'stage'">
            <span class="flex items-center gap-2.5"><MIcon name="stage" /> Mudar etapa</span>
            <span :class="chev">▸</span>
          </button>
          <button :class="item" @click="view = 'assignee'">
            <span class="flex items-center gap-2.5"><MIcon name="user" /> Responsável</span>
            <span :class="chev">▸</span>
          </button>
          <button :class="item" @click="view = 'temp'">
            <span class="flex items-center gap-2.5"><MIcon name="temp" /> Temperatura</span>
            <span :class="chev">▸</span>
          </button>
          <div :class="divider" />
          <button v-if="wonStage" :class="item" @click="markWon">
            <span class="flex items-center gap-2.5 text-emerald-600 font-semibold">
              <MIcon name="won" class="!text-emerald-600" /> Marcar ganho
            </span>
          </button>
          <button v-if="lostStage" :class="item" @click="view = 'lost'">
            <span class="flex items-center gap-2.5"><MIcon name="lost" /> Marcar perdido</span>
            <span :class="chev">▸</span>
          </button>
          <div :class="divider" />
          <button :class="item" class="!text-red-600 hover:!bg-red-50" @click="removeOpp">
            <span class="flex items-center gap-2.5"><MIcon name="trash" class="!text-red-500" /> Excluir</span>
          </button>
        </template>

        <!-- ENVIAR PARA (boards de destino) -->
        <template v-else-if="view === 'move'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Enviar para</button>
          <div :class="divider" />
          <button v-for="b in otherBoards" :key="b.id" :class="item" :disabled="busy" @click="moveTo(b)">
            <span class="flex items-center gap-2.5"><MIcon name="send" /> {{ b.label }}</span>
          </button>
        </template>

        <!-- MOTIVO DA PERDA -->
        <template v-else-if="view === 'lost'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Marcar perdido</button>
          <div :class="divider" />
          <button v-for="r in LOSS_REASONS" :key="r" :class="item" @click="setLost(r)">
            <span class="flex items-center gap-2.5"><MIcon name="lost" /> {{ r }}</span>
          </button>
        </template>

        <!-- ETAPA -->
        <template v-else-if="view === 'stage'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Mudar etapa</button>
          <div :class="divider" />
          <button v-for="s in stages" :key="s.id" :class="item" @click="setStage(s.id)">
            <span class="flex items-center gap-2.5">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: s.color }"></span>
              {{ s.label }}
            </span>
            <span v-if="opp.stageId === s.id" class="text-brand">✓</span>
          </button>
        </template>

        <!-- RESPONSÁVEL -->
        <template v-else-if="view === 'assignee'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Responsável</button>
          <div :class="divider" />
          <button v-for="u in users" :key="u.id" :class="item" @click="toggleAssignee(u)">
            <span class="flex items-center gap-2.5 truncate"><MIcon name="user" /> {{ u.name }}</span>
            <span v-if="isAssigned(u.id)" class="text-brand">✓</span>
          </button>
          <div v-if="!users.length" class="px-3 py-2 text-[12px] text-slate-400">Nenhum usuário.</div>
        </template>

        <!-- TEMPERATURA -->
        <template v-else-if="view === 'temp'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Temperatura</button>
          <div :class="divider" />
          <button v-for="t in TEMPS" :key="t" :class="item" @click="setTemp(t)">
            <span class="flex items-center gap-2.5">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: tempHex(t) }"></span>
              {{ t }}
            </span>
            <span v-if="opp.temperature === t" class="text-brand">✓</span>
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>
