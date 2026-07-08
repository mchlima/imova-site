// Estágios do funil (status) vindos do backend (GET /stages), por tenant.
// Substitui as constantes de status hardcoded no front — o funil é dado.
export interface Stage {
  id: string
  // id estável para integrações externas referenciarem o estágio
  externalId: string
  label: string
  color: string
  order: number
  inKanban: boolean
  isWon: boolean
  isLost: boolean
  // board (pipeline) ao qual o estágio pertence — usado p/ agrupar colunas por board
  pipelineId: string
  // nº de oportunidades atualmente neste estágio (para a config: excluir com migração)
  oppCount?: number
}

const FALLBACK_COLOR = '#64748b' // slate-500 para status desconhecido

export function useStages() {
  const apiBase = useRuntimeConfig().public.apiBase
  // cache compartilhado entre páginas (SSR-safe)
  const stages = useState<Stage[]>('crm-stages', () => [])
  const loaded = useState<boolean>('crm-stages-loaded', () => false)

  async function loadStages(force = false) {
    if (loaded.value && !force) return stages.value
    try {
      stages.value = await $fetch<Stage[]>('/stages', {
        baseURL: apiBase,
        credentials: 'include',
      })
      loaded.value = true
    } catch {
      /* mantém o que tiver */
    }
    return stages.value
  }

  // estágios na ordem do funil
  const orderedStages = computed(() => [...stages.value].sort((a, b) => a.order - b.order))
  // só os que aparecem como coluna no kanban
  const kanbanStages = computed(() => orderedStages.value.filter((s) => s.inKanban))

  // ── por board (pipeline) ── com 2+ boards, cada tela filtra pelos estágios do seu board
  const stagesFor = (pipelineId: string | null | undefined) =>
    orderedStages.value.filter((s) => s.pipelineId === pipelineId)
  const kanbanStagesFor = (pipelineId: string | null | undefined) =>
    stagesFor(pipelineId).filter((s) => s.inKanban)
  const firstStageIdFor = (pipelineId: string | null | undefined) => stagesFor(pipelineId)[0]?.id || ''
  // lookup por id (== Opportunity.stageId)
  const stageMap = computed<Record<string, Stage>>(() =>
    Object.fromEntries(stages.value.map((s) => [s.id, s])),
  )

  const stageColor = (id: string | null | undefined) => (id && stageMap.value[id]?.color) || FALLBACK_COLOR
  const stageLabel = (id: string | null | undefined) => (id && stageMap.value[id]?.label) || '—'

  // badge com cor derivada do dado: texto na cor forte, fundo num tom claro (~12%).
  const stageBadgeStyle = (id: string | null | undefined) => {
    const c = stageColor(id)
    return { color: c, backgroundColor: c + '1F' }
  }

  return {
    stages,
    loadStages,
    orderedStages,
    kanbanStages,
    stagesFor,
    kanbanStagesFor,
    firstStageIdFor,
    stageMap,
    stageColor,
    stageLabel,
    stageBadgeStyle,
  }
}
