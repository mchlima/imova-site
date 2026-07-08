// Boards (pipelines) do CRM vindos do backend (GET /pipelines), por tenant.
// Cada board tem seus próprios estágios (ver useStages, que filtra por pipelineId).
export interface Pipeline {
  id: string
  key: string
  label: string
  order: number
  ownerUserId: string | null
}

export function usePipelines() {
  const apiBase = useRuntimeConfig().public.apiBase
  const pipelines = useState<Pipeline[]>('crm-pipelines', () => [])
  const loaded = useState<boolean>('crm-pipelines-loaded', () => false)

  async function loadPipelines(force = false) {
    if (loaded.value && !force) return pipelines.value
    try {
      pipelines.value = await $fetch<Pipeline[]>('/pipelines', {
        baseURL: apiBase,
        credentials: 'include',
      })
      loaded.value = true
    } catch {
      /* mantém o que tiver */
    }
    return pipelines.value
  }

  // Atualiza um board (rótulo/ordem/dono). Devolve a lista atualizada.
  async function updatePipeline(id: string, patch: Partial<Pick<Pipeline, 'label' | 'order' | 'ownerUserId'>>) {
    pipelines.value = await $fetch<Pipeline[]>(`/pipelines/${id}`, {
      baseURL: apiBase,
      method: 'PATCH',
      credentials: 'include',
      body: patch,
    })
    return pipelines.value
  }

  // board padrão (primeiro por ordem) — destino de novas oportunidades / fallback.
  const defaultPipeline = computed(() => [...pipelines.value].sort((a, b) => a.order - b.order)[0] ?? null)

  return { pipelines, loadPipelines, updatePipeline, defaultPipeline }
}
