<script setup lang="ts">
// Menu de contexto (ações rápidas) para um card de oportunidade no kanban/lista.
// Abre pelo botão ⋯ ou pelo botão direito (o pai chama `openFor(opp, event)`).
// Reusa os endpoints existentes: PATCH /opportunities/:id (etapa/temperatura/responsáveis),
// POST /:id/move-pipeline (repasse) e DELETE /:id (excluir).
import type { Opportunity, RawOpportunity, Assignee } from '~/utils/opportunityModel'
import { mapOpportunity, TEMPS, TEMP_HEX } from '~/utils/opportunityModel'
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
const view = ref<'root' | 'stage' | 'assignee' | 'temp'>('root')
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

async function setStage(key: string) {
  await patch({ status: key }, { status: key })
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
  await patch({ status: wonStage.value.key }, { status: wonStage.value.key })
  close()
}
async function markLost() {
  if (!lostStage.value) return
  const reason = window.prompt('Motivo da perda (opcional):', '') ?? ''
  await patch({ status: lostStage.value.key, lossReason: reason }, { status: lostStage.value.key })
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
            <button v-for="b in otherBoards" :key="b.id" :class="item" :disabled="busy" @click="moveTo(b)">
              <span>Enviar p/ {{ b.label }}</span>
              <span :class="chev">→</span>
            </button>
            <div :class="divider" />
          </template>
          <button :class="item" @click="view = 'stage'">
            <span>Mudar etapa</span><span :class="chev">▸</span>
          </button>
          <button :class="item" @click="view = 'assignee'">
            <span>Responsável</span><span :class="chev">▸</span>
          </button>
          <button :class="item" @click="view = 'temp'">
            <span>Temperatura</span><span :class="chev">▸</span>
          </button>
          <div :class="divider" />
          <button v-if="wonStage" :class="item" @click="markWon">
            <span class="text-emerald-600 font-semibold">Marcar ganho</span>
          </button>
          <button v-if="lostStage" :class="item" @click="markLost">
            <span class="text-slate-600">Marcar perdido</span>
          </button>
          <div :class="divider" />
          <button :class="item" class="!text-red-600 hover:!bg-red-50" @click="removeOpp">
            <span>Excluir</span>
          </button>
        </template>

        <!-- ETAPA -->
        <template v-else-if="view === 'stage'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Mudar etapa</button>
          <div :class="divider" />
          <button v-for="s in stages" :key="s.key" :class="item" @click="setStage(s.key)">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: s.color }"></span>
              {{ s.label }}
            </span>
            <span v-if="opp.status === s.key" class="text-brand">✓</span>
          </button>
        </template>

        <!-- RESPONSÁVEL -->
        <template v-else-if="view === 'assignee'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Responsável</button>
          <div :class="divider" />
          <button v-for="u in users" :key="u.id" :class="item" @click="toggleAssignee(u)">
            <span class="truncate">{{ u.name }}</span>
            <span v-if="isAssigned(u.id)" class="text-brand">✓</span>
          </button>
          <div v-if="!users.length" class="px-3 py-2 text-[12px] text-slate-400">Nenhum usuário.</div>
        </template>

        <!-- TEMPERATURA -->
        <template v-else-if="view === 'temp'">
          <button :class="head" @click="view = 'root'"><span :class="chev">←</span> Temperatura</button>
          <div :class="divider" />
          <button v-for="t in TEMPS" :key="t" :class="item" @click="setTemp(t)">
            <span class="flex items-center gap-2">
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
