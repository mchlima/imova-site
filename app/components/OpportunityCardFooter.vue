<script setup lang="ts">
import { type Assignee, dueState } from '~/utils/opportunityModel'

// Rodapé de indicadores do card de oportunidade (kanban + drawer de contato).
// Só ícone quando não há contagem relevante; com contagem, mostra o número.
const props = defineProps<{
  hasDescription?: boolean
  tasks?: { done: boolean }[]
  commentsCount?: number
  documentsCount?: number
  activities?: { done: boolean; dueAt: string | null }[]
  assignees?: Assignee[]
}>()

const tasksTotal = computed(() => props.tasks?.length ?? 0)
const tasksDone = computed(() => props.tasks?.filter((t) => t.done).length ?? 0)
const tasksAllDone = computed(() => tasksTotal.value > 0 && tasksDone.value === tasksTotal.value)

// estado da atividade pendente mais próxima (por vencimento)
const activityState = computed<'overdue' | 'today' | 'future' | 'pending' | null>(() => {
  const pend = (props.activities ?? []).filter((a) => !a.done)
  if (!pend.length) return null
  const withDue = pend
    .filter((a) => a.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
  if (!withDue.length) return 'pending' // pendente sem data marcada
  return dueState(withDue[0].dueAt) as 'overdue' | 'today' | 'future'
})
const activityColor = computed(() => {
  switch (activityState.value) {
    case 'overdue':
      return 'text-red-600'
    case 'today':
      return 'text-amber-500'
    case 'future':
      return 'text-blue-500'
    default:
      return 'text-slate-400'
  }
})
const activityTitle = computed(() => {
  switch (activityState.value) {
    case 'overdue':
      return 'Atividade atrasada'
    case 'today':
      return 'Atividade para hoje'
    case 'future':
      return 'Próxima atividade agendada'
    default:
      return 'Atividade pendente'
  }
})

const hasAny = computed(
  () =>
    props.hasDescription ||
    tasksTotal.value ||
    props.commentsCount ||
    props.documentsCount ||
    activityState.value ||
    props.assignees?.length,
)
</script>

<template>
  <div
    v-if="hasAny"
    class="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-100 text-slate-400 text-[11px] font-semibold"
  >
    <!-- descrição -->
    <span v-if="hasDescription" class="inline-flex" title="Tem descrição">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    </span>

    <!-- tarefas: concluídas/total (verde quando todas concluídas) -->
    <span
      v-if="tasksTotal"
      class="inline-flex items-center gap-1"
      :class="tasksAllDone ? 'text-emerald-600' : ''"
      :title="`Tarefas: ${tasksDone}/${tasksTotal} concluídas`"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      {{ tasksDone }}/{{ tasksTotal }}
    </span>

    <!-- atividades: cor conforme próxima / hoje / atrasada -->
    <span v-if="activityState" class="inline-flex" :class="activityColor" :title="activityTitle">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 1.5M9 2h6" />
      </svg>
    </span>

    <!-- anexos: quantidade -->
    <span v-if="documentsCount" class="inline-flex items-center gap-1" :title="`${documentsCount} documento(s) anexado(s)`">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.19 9.19a1 1 0 0 1-1.41-1.41l8.48-8.49" />
      </svg>
      {{ documentsCount }}
    </span>

    <!-- comentários: quantidade -->
    <span v-if="commentsCount" class="inline-flex items-center gap-1" :title="`${commentsCount} comentário(s)`">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {{ commentsCount }}
    </span>

    <!-- responsáveis à direita -->
    <AvatarStack v-if="assignees?.length" :users="assignees" :size="20" :max="3" class="ml-auto" />
  </div>
</template>
