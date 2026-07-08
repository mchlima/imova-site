// Estágios do funil (status) vindos do backend (GET /stages), por tenant.
// Substitui as constantes de status hardcoded no front — o funil é dado.
export interface Stage {
  id: string
  key: string
  label: string
  color: string
  order: number
  inKanban: boolean
  isWon: boolean
  isLost: boolean
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
  // lookup por key (== Opportunity.status)
  const stageMap = computed<Record<string, Stage>>(() =>
    Object.fromEntries(stages.value.map((s) => [s.key, s])),
  )

  const stageColor = (key: string) => stageMap.value[key]?.color || FALLBACK_COLOR
  const stageLabel = (key: string) => stageMap.value[key]?.label || key

  // badge com cor derivada do dado: texto na cor forte, fundo num tom claro (~12%).
  const stageBadgeStyle = (key: string) => {
    const c = stageColor(key)
    return { color: c, backgroundColor: c + '1F' }
  }

  return {
    stages,
    loadStages,
    orderedStages,
    kanbanStages,
    stageMap,
    stageColor,
    stageLabel,
    stageBadgeStyle,
  }
}
