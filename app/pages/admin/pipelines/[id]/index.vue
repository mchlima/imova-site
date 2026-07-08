<script setup lang="ts">
import type { DateRange } from '~/components/DateRangePicker.vue'
import VueDraggable from 'vuedraggable'
import { type Opportunity, type RawOpportunity, mapOpportunity, sourceLabel, TEMPS, TEMP_HEX, tempBadgeStyle, fmtDateTime, dueState } from '~/utils/opportunityModel'

// vuedraggable expõe um build UMD no campo "module"; normaliza o default export
// para funcionar tanto no SSR quanto no bundle do client (evita componente undefined).
const draggable = ((VueDraggable as unknown as { default?: unknown }).default ??
  VueDraggable) as typeof VueDraggable

definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase
const route = useRoute()

// funil como dado (GET /stages) — nada de status hardcoded. Com 2+ boards, cada um
// tem seus estágios: filtramos por board ativo (kanbanStagesFor / stagesFor).
const { loadStages, kanbanStagesFor, stagesFor, stageBadgeStyle } = useStages()

// pipelines — a navegação entre eles é pelo menu (CRM › Pipelines). Ownership leve:
// abre no pipeline do usuário (dono), mas ninguém fica bloqueado de ver os outros.
const { pipelines, loadPipelines } = usePipelines()

// usuários (responsáveis) — usados no menu de ações rápidas do card
const { users, loadUsers } = useUsers()
loadUsers()

const activePipelineId = ref<string>('')
const orderedBoards = computed(() => [...pipelines.value].sort((a, b) => a.order - b.order))
const activeBoard = computed(() => pipelines.value.find((p) => p.id === activePipelineId.value) || null)
// estágios do board ativo (colunas do kanban e chips de status do filtro)
const activeKanbanStages = computed(() => kanbanStagesFor(activePipelineId.value))
const activeStages = computed(() => stagesFor(activePipelineId.value))

// o pipeline vem da ROTA (/admin/pipelines/<id>). O usuário troca pelo menu.
const boardId = computed(() => route.params.id as string)
function pickInitialBoard() {
  const byId = pipelines.value.find((p) => p.id === boardId.value)
  activePipelineId.value = byId?.id || orderedBoards.value[0]?.id || ''
}
// navegação pelo menu troca o param da rota — reflete no board ativo
watch([pipelines, boardId], pickInitialBoard)

const opportunities = ref<Opportunity[]>([])
const loading = ref(true)
const loadError = ref(false)

async function loadOpportunities() {
  loading.value = true
  loadError.value = false
  try {
    const data = await $fetch<RawOpportunity[]>('/opportunities', { baseURL: apiBase, credentials: 'include' })
    opportunities.value = data.map(mapOpportunity)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// filters — sem acoplamento com campos do simulador.
// Localização filtra pelo ENDEREÇO do contato (residência), não pelo interesse.
const fSearch = ref('')
const fStatus = ref('')
const fTemperature = ref('')
const fUf = ref('')
const fCity = ref('')
const fRange = ref<DateRange>({ start: '', end: '' })

// cor de realce da temperatura (usada na borda do card do kanban)
const tempColor = (t: string) => TEMP_HEX[t] || '#94A3B8'

// drawer
const selId = ref<string | null>(null)
const drawerOpen = ref(false)
const sel = computed(() => opportunities.value.find((l) => l.id === selId.value) || null)
function open(id: string) {
  selId.value = id
  drawerOpen.value = true
}
// recebe a oportunidade atualizada pelo OpportunityDrawer e reflete na lista
function onOpportunityUpdated(opportunity: Opportunity) {
  opportunities.value = opportunities.value.map((l) => (l.id === opportunity.id ? opportunity : l))
}
// oportunidade repassada para outro board: atualiza a lista e fecha o detalhe
// (ela deixa o board atual). Uma nota do que aconteceu fica no card via drawer.
function onOpportunityMoved(opportunity: Opportunity) {
  onOpportunityUpdated(opportunity)
  drawerOpen.value = false
}
// oportunidade excluída (via menu de ações rápidas): tira da lista.
function onOpportunityDeleted(id: string) {
  opportunities.value = opportunities.value.filter((l) => l.id !== id)
}

// menu de ações rápidas do card (⋯ / botão direito)
const cardMenu = ref<{ openFor: (o: Opportunity, e: MouseEvent) => void } | null>(null)
function openCardMenu(o: Opportunity, e: MouseEvent) {
  cardMenu.value?.openFor(o, e)
}

// link para as configurações do pipeline ativo (dono + etapas), na rota do próprio pipeline
const settingsLink = computed(() =>
  activeBoard.value ? `/admin/pipelines/${activeBoard.value.id}/configuracoes` : '/admin/pipelines',
)

// criação manual (NewOpportunityDrawer)
const newOppOpen = ref(false)
function onOpportunityCreated(opportunity: Opportunity) {
  opportunities.value = [opportunity, ...opportunities.value]
  open(opportunity.id) // abre o detalhe da recém-criada
}

const badgeBase =
  'inline-flex items-center h-[22px] px-[9px] rounded-md text-[11.5px] font-semibold whitespace-nowrap'

// Localidades (backend /locations) para os filtros de UF / Cidade.
const statesData = ref<{ uf: string; name: string }[]>([])
const citiesData = ref<{ name: string }[]>([])
const ufOptions = computed(() =>
  statesData.value.map((s) => ({ value: s.uf, label: `${s.name} (${s.uf})` })),
)
const cityOptions = computed(() =>
  citiesData.value.map((c) => ({ value: c.name, label: c.name })),
)
async function loadStates() {
  try {
    statesData.value = await $fetch('/locations/states', { baseURL: apiBase })
  } catch {
    /* ignore */
  }
}
async function loadCities(uf: string) {
  if (!uf) {
    citiesData.value = []
    return
  }
  try {
    citiesData.value = await $fetch('/locations/cities', { baseURL: apiBase, params: { uf } })
  } catch {
    citiesData.value = []
  }
}
watch(fUf, (uf) => {
  fCity.value = ''
  loadCities(uf)
})

onMounted(async () => {
  loadStates()
  loadStages()
  await loadPipelines()
  pickInitialBoard()
  await loadOpportunities()
  // deep-link ?oportunidade=<id> (o resolver /admin/pipelines já roteou pro board certo).
  const wanted = route.query.oportunidade as string | undefined
  const target = wanted ? opportunities.value.find((l) => l.id === wanted) : null
  if (target) {
    selId.value = target.id
    drawerOpen.value = true
  }
})

// troca de board: volta pra 1ª página e reconstrói o kanban
watch(activePipelineId, () => {
  page.value = 1
  if (view.value === 'kanban') rebuildBoard()
})

const filtered = computed(() => {
  const q = fSearch.value.trim().toLowerCase()
  return opportunities.value.filter((l) => {
    // toda a tela é escopada ao board ativo
    if (activePipelineId.value && l.pipelineId !== activePipelineId.value) return false
    if (q && !(l.contact.name + ' ' + l.contact.channels.map((c) => c.value).join(' ')).toLowerCase().includes(q)) return false
    if (fStatus.value && l.status !== fStatus.value) return false
    if (fTemperature.value && l.temperature !== fTemperature.value) return false
    if (fUf.value && l.contact.residenceUf !== fUf.value) return false
    if (fCity.value && l.contact.residenceCity !== fCity.value) return false
    if (fRange.value.start || fRange.value.end) {
      const day = l.createdAt.slice(0, 10) // 'YYYY-MM-DD'
      if (fRange.value.start && day < fRange.value.start) return false
      if (fRange.value.end && day > fRange.value.end) return false
    }
    return true
  })
})
// Paginação (client-side, sobre o resultado filtrado).
const pageSize = 10
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
const rangeStart = computed(() =>
  filtered.value.length === 0 ? 0 : (page.value - 1) * pageSize + 1,
)
const rangeEnd = computed(() => Math.min(page.value * pageSize, filtered.value.length))
watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

// Painel de filtros suspenso.
function clearFilters() {
  fStatus.value = fTemperature.value = fUf.value = fCity.value = ''
}
const filtersOpen = ref(false)
const activeFilters = computed(
  () => [fStatus.value, fTemperature.value, fUf.value, fCity.value].filter((v) => v !== '').length,
)
// chips de filtro no mesmo padrão dos chips do drawer (hex+alpha quando ativo)
const chipBase =
  'inline-flex items-center h-[30px] px-3 rounded-full text-[12.5px] font-semibold cursor-pointer transition-all border'
const chipInactive = 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
const toggleStatus = (v: string) => (fStatus.value = fStatus.value === v ? '' : v)
const toggleTemp = (v: string) => (fTemperature.value = fTemperature.value === v ? '' : v)

// indicador da próxima atividade pendente (na tabela)
function nextActivity(l: Opportunity) {
  const pend = (l.activities ?? [])
    .filter((a) => !a.done && a.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
  const a = pend[0]
  if (!a) {
    return (l.activities ?? []).some((x) => !x.done)
      ? { label: 'Tarefa pendente', cls: 'bg-slate-100 text-slate-500' }
      : null
  }
  const when = fmtDateTime(a.dueAt!)
  const st = dueState(a.dueAt)
  if (st === 'overdue') return { label: 'Atrasada · ' + when, cls: 'bg-red-50 text-red-700' }
  if (st === 'today') return { label: 'Hoje · ' + when, cls: 'bg-[#FEF6E7] text-amber-700' }
  return { label: when, cls: 'bg-brand-soft text-brand' }
}

const th =
  'text-left py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400'

// ── visualização: lista | kanban (persistida no navegador) ──
const view = ref<'list' | 'kanban'>('list')
onMounted(() => {
  const saved = localStorage.getItem('imova_opp_view')
  if (saved === 'kanban' || saved === 'list') view.value = saved
})
watch(view, (v) => {
  try {
    localStorage.setItem('imova_opp_view', v)
  } catch {
    /* ignore */
  }
})

// Kanban: só os estágios marcados como inKanban no funil do tenant (os finais,
// como Repassado/Perdido/Nutrição, ficam de fora — inKanban=false no dado).
// Colunas reativas para o vuedraggable (cada uma com sua lista de cards).
// As listas guardam REFERÊNCIAS aos objetos de `opportunities`, então mexer no
// status/boardOrder de um card reflete na lista também.
const boardCols = ref<{ status: string; label: string; color: string; items: Opportunity[] }[]>([])
let suppressRebuild = false

function rebuildBoard() {
  boardCols.value = activeKanbanStages.value.map((col) => ({
    status: col.key,
    label: col.label,
    color: col.color,
    items: filtered.value
      .filter((o) => o.status === col.key)
      .sort(
        (a, b) =>
          a.boardOrder - b.boardOrder ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
  }))
}

// rebuild ao mudar filtros, dados, estágios do board ativo ou ao entrar no kanban
watch([filtered, view, activeKanbanStages], () => {
  if (suppressRebuild) return
  if (view.value === 'kanban') rebuildBoard()
})

// após arrastar (reordenar ou trocar de coluna): renumera as colunas pela posição
// atual e persiste em lote (status + boardOrder) os cards que mudaram.
async function persistBoard() {
  suppressRebuild = true
  const updates: { id: string; status: string; boardOrder: number }[] = []
  for (const col of boardCols.value) {
    col.items.forEach((o, idx) => {
      if (o.status !== col.status || o.boardOrder !== idx) {
        o.status = col.status
        o.boardOrder = idx
        updates.push({ id: o.id, status: col.status, boardOrder: idx })
      }
    })
  }
  await nextTick()
  suppressRebuild = false
  if (!updates.length) return
  try {
    await $fetch('/opportunities/reorder', {
      baseURL: apiBase,
      method: 'PATCH',
      credentials: 'include',
      body: { items: updates },
    })
  } catch {
    await loadOpportunities()
    if (view.value === 'kanban') rebuildBoard()
  }
}
</script>

<template>
  <div :class="view === 'kanban' ? 'h-full flex flex-col' : ''">
    <div class="p-4 sm:p-6" :class="view === 'kanban' ? 'flex-1 min-h-0 flex flex-col' : ''">
      <PageHeader
        :title="activeBoard ? `Pipeline · ${activeBoard.label}` : 'Pipelines'"
        subtitle="Receba, qualifique e mova as oportunidades pelas etapas do funil."
      />

      <!-- Navegação entre pipelines fica no menu (CRM › Pipelines › …). -->

      <!-- BARRA: busca + data (fora) + botão de filtros (painel) -->
      <div class="flex gap-2.5 items-center flex-wrap mb-[18px]">
        <div class="relative flex-1 min-w-[200px]">
          <span
            class="absolute left-[11px] top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"
            >⌕</span
          >
          <input
            v-model="fSearch"
            placeholder="Buscar por nome, e-mail ou WhatsApp…"
            class="w-full h-[38px] pl-8 pr-3 text-[13.5px] text-slate-900 border border-slate-300 rounded-[7px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/10"
          />
        </div>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-3.5 bg-brand text-white text-[13px] font-semibold rounded-[7px] cursor-pointer border-none hover:bg-brand-dark shrink-0"
          @click="newOppOpen = true"
        >
          <span class="text-[15px] leading-none">+</span> Nova oportunidade
        </button>

        <DateRangePicker v-model="fRange" icon-only />

        <!-- FILTROS (só ícone + painel suspenso) -->
        <div class="relative">
          <button
            class="relative inline-flex items-center justify-center w-[38px] h-[38px] bg-white border rounded-[7px] cursor-pointer transition-all"
            :class="
              activeFilters > 0
                ? 'border-brand/40 text-brand hover:bg-brand-soft'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            "
            title="Filtros"
            @click="filtersOpen = !filtersOpen"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span
              v-if="activeFilters > 0"
              class="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-bold"
              >{{ activeFilters }}</span
            >
          </button>

          <!-- overlay para fechar ao clicar fora -->
          <div
            v-if="filtersOpen"
            class="fixed inset-0 z-30"
            @click="filtersOpen = false"
          ></div>

          <!-- PAINEL -->
          <div
            v-if="filtersOpen"
            class="absolute right-0 mt-2 z-40 w-[min(92vw,420px)] bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)]"
          >
            <!-- header -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-slate-100"
            >
              <span class="text-[13px] font-bold text-slate-900">Filtros</span>
              <button
                v-if="activeFilters > 0"
                type="button"
                class="text-[12.5px] font-semibold text-brand hover:underline cursor-pointer bg-transparent border-none p-0"
                @click="clearFilters"
              >
                Limpar tudo
              </button>
            </div>

            <!-- corpo -->
            <div class="p-4 flex flex-col gap-4">
              <div>
                <div
                  class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2"
                >
                  Status
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="s in activeStages"
                    :key="s.key"
                    type="button"
                    :class="[chipBase, fStatus === s.key ? 'border-transparent shadow-sm' : chipInactive]"
                    :style="fStatus === s.key ? stageBadgeStyle(s.key) : undefined"
                    @click="toggleStatus(s.key)"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>

              <div>
                <div
                  class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2"
                >
                  Temperatura
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="t in TEMPS"
                    :key="t"
                    type="button"
                    :class="[chipBase, fTemperature === t ? 'border-transparent shadow-sm' : chipInactive]"
                    :style="fTemperature === t ? tempBadgeStyle(t) : undefined"
                    @click="toggleTemp(t)"
                  >
                    {{ t }}
                  </button>
                </div>
              </div>

              <div>
                <div
                  class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2"
                >
                  Endereço do contato
                </div>
                <div class="grid grid-cols-2 gap-2.5">
                  <SearchableSelect
                    v-model="fUf"
                    :options="ufOptions"
                    placeholder="UF"
                    search-placeholder="Buscar estado…"
                  />
                  <SearchableSelect
                    v-model="fCity"
                    :options="cityOptions"
                    :disabled="!fUf"
                    :placeholder="fUf ? 'Cidade' : 'Escolha a UF'"
                    search-placeholder="Buscar cidade…"
                  />
                </div>
              </div>
            </div>

            <!-- footer -->
            <div
              class="flex justify-end px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl"
            >
              <button
                type="button"
                class="h-[36px] px-4 bg-brand text-white text-[13px] font-semibold rounded-[7px] cursor-pointer transition-all hover:bg-brand-dark border-none"
                @click="filtersOpen = false"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>

        <!-- área à direita: toggle lista/kanban + configurar pipeline por último (ícones) -->
        <div class="ml-auto flex items-center gap-2.5">
          <!-- configurações do pipeline ativo (dono + etapas do funil) — por último -->
          <NuxtLink
            v-if="activeBoard"
            :to="settingsLink"
            class="order-last inline-flex items-center justify-center w-[38px] h-[38px] bg-white border border-slate-200 text-slate-600 rounded-[7px] no-underline transition-all hover:bg-slate-50 hover:text-slate-800"
            :title="'Configurar ' + activeBoard.label + ' (dono e etapas)'"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </NuxtLink>

          <div class="inline-flex items-center bg-slate-100 rounded-[9px] p-0.5">
            <button
              type="button"
              class="inline-flex items-center justify-center w-[34px] h-[34px] rounded-[7px] transition-all cursor-pointer border-none"
              :class="
                view === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
              "
              title="Lista"
              @click="view = 'list'"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center w-[34px] h-[34px] rounded-[7px] transition-all cursor-pointer border-none"
              :class="
                view === 'kanban'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
              "
              title="Kanban"
              @click="view = 'kanban'"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="6" height="18" rx="1" />
                <rect x="10" y="3" width="6" height="12" rx="1" />
                <rect x="17" y="3" width="6" height="9" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- TABLE (visão lista) -->
      <div
        v-if="view === 'list'"
        class="bg-white border border-slate-200 rounded-[10px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        <div class="overflow-x-auto">
          <table class="w-full table-fixed border-collapse min-w-[820px]">
            <colgroup>
              <col class="w-[26%]" />
              <col class="w-[18%]" />
              <col class="w-[15%]" />
              <col class="w-[12%]" />
              <col class="w-[15%]" />
              <col class="w-[14%]" />
            </colgroup>
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th :class="th" class="!px-4">Nome</th>
                <th :class="th">Responsáveis</th>
                <th :class="th">Origem</th>
                <th :class="th">Temp.</th>
                <th :class="th">Status</th>
                <th :class="th" class="!px-4">Data</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="l in paged"
                :key="l.id"
                class="group border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50"
                @click="open(l.id)"
                @contextmenu.prevent="openCardMenu(l, $event)"
              >
                <td class="py-[13px] px-4">
                  <div class="text-[14px] font-semibold text-slate-900 truncate">{{ l.contact.name }}</div>
                  <span
                    v-if="nextActivity(l)"
                    class="inline-flex items-center mt-1 h-[18px] px-1.5 rounded text-[10.5px] font-semibold"
                    :class="nextActivity(l)!.cls"
                    >{{ nextActivity(l)!.label }}</span
                  >
                </td>
                <td class="py-[13px] px-3">
                  <AvatarStack v-if="l.assignees?.length" :users="l.assignees" :size="26" :max="4" />
                  <span v-else class="text-[12.5px] text-slate-300">—</span>
                </td>
                <td class="py-[13px] px-3">
                  <span class="inline-flex items-center h-[22px] px-2 rounded-md text-[11.5px] font-semibold bg-slate-100 text-slate-600">{{ sourceLabel(l.source) }}</span>
                </td>
                <td class="py-[13px] px-3">
                  <span :class="badgeBase" :style="tempBadgeStyle(l.temperature)">{{ l.temperature }}</span>
                </td>
                <td class="py-[13px] px-3">
                  <span :class="badgeBase" :style="stageBadgeStyle(l.status)">{{ l.status }}</span>
                </td>
                <td class="py-[13px] px-4 text-[12.5px] text-slate-400 whitespace-nowrap">
                  <div class="flex items-center justify-between gap-2">
                    <span>{{ l.date }}</span>
                    <button
                      class="w-6 h-6 inline-flex items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200/70 hover:text-slate-700 transition-all cursor-pointer border-none bg-transparent shrink-0"
                      title="Ações rápidas"
                      @click.stop.prevent="openCardMenu(l, $event)"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.6" />
                        <circle cx="12" cy="12" r="1.6" />
                        <circle cx="12" cy="19" r="1.6" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="loading"
          class="text-center py-12 px-5 text-slate-400 text-[14px]"
        >
          Carregando oportunidades…
        </div>
        <div
          v-else-if="loadError"
          class="text-center py-12 px-5 text-red-600 text-[14px]"
        >
          Não foi possível carregar as oportunidades.
          <button class="ml-2 font-semibold underline" @click="loadOpportunities">
            Tentar de novo
          </button>
        </div>
        <div
          v-else-if="filtered.length === 0"
          class="text-center py-12 px-5 text-slate-400 text-[14px]"
        >
          Nenhuma oportunidade corresponde aos filtros.
        </div>

        <!-- PAGINAÇÃO -->
        <div
          v-if="!loading && !loadError && filtered.length > 0"
          class="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-t border-slate-200"
        >
          <span class="text-[12.5px] text-slate-500">
            Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ filtered.length }}
          </span>
          <div class="flex items-center gap-1">
            <button
              class="h-8 px-3 text-[13px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 cursor-pointer transition-all enabled:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page <= 1"
              @click="page--"
            >
              Anterior
            </button>
            <span class="text-[12.5px] text-slate-500 px-2"
              >Página {{ page }} de {{ totalPages }}</span
            >
            <button
              class="h-8 px-3 text-[13px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 cursor-pointer transition-all enabled:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page >= totalPages"
              @click="page++"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <!-- KANBAN (visão quadro) — colunas sempre lado a lado, com scroll lateral -->
      <div v-else class="flex-1 min-h-0 flex flex-col">
        <div v-if="loading" class="text-center py-12 text-slate-400 text-[14px]">
          Carregando oportunidades…
        </div>
        <div v-else-if="loadError" class="text-center py-12 text-red-600 text-[14px]">
          Não foi possível carregar as oportunidades.
          <button class="ml-2 font-semibold underline" @click="loadOpportunities">
            Tentar de novo
          </button>
        </div>
        <div v-else class="flex gap-4 items-stretch overflow-x-auto flex-1 min-h-0">
          <div
            v-for="col in boardCols"
            :key="col.status"
            class="w-[296px] shrink-0 bg-slate-100/70 rounded-xl p-2.5 flex flex-col overflow-hidden"
          >
            <!-- header da coluna -->
            <div class="flex items-center gap-2 px-2 py-2">
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: col.color }"></span>
              <span class="text-[12.5px] font-bold text-slate-700">{{ col.label }}</span>
              <span
                class="ml-auto inline-flex items-center justify-center min-w-[20px] h-[19px] px-1.5 rounded-full bg-white text-slate-500 text-[11px] font-bold"
                >{{ col.items.length }}</span
              >
            </div>

            <!-- cards (arraste para reordenar ou mover entre colunas) -->
            <draggable
              v-model="col.items"
              :group="{ name: 'opps' }"
              item-key="id"
              class="flex flex-col gap-2 min-h-[120px] px-0.5 pb-1 flex-1 overflow-y-auto"
              ghost-class="kanban-ghost"
              drag-class="kanban-drag"
              :animation="160"
              @change="persistBoard"
            >
              <template #item="{ element: o }">
                <div
                  class="group relative bg-white border border-slate-200 border-l-[3px] rounded-[9px] p-3 cursor-grab active:cursor-grabbing shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 transition-colors"
                  :style="{ borderLeftColor: tempColor(o.temperature) }"
                  :title="'Temperatura: ' + o.temperature"
                  @click="open(o.id)"
                  @contextmenu.prevent="openCardMenu(o, $event)"
                >
                  <div class="flex items-start gap-2">
                    <span class="text-[13.5px] font-semibold text-slate-900 truncate">{{ o.contact.name }}</span>
                  </div>
                  <!-- ações rápidas (⋯) — aparece no hover; não abre o drawer nem arrasta -->
                  <button
                    class="absolute top-1.5 right-1.5 w-6 h-6 inline-flex items-center justify-center rounded-md text-slate-400 bg-white/80 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer border-none"
                    title="Ações rápidas"
                    @click.stop.prevent="openCardMenu(o, $event)"
                    @mousedown.stop
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="12" cy="19" r="1.6" />
                    </svg>
                  </button>
                  <div class="flex items-center justify-between gap-2 mt-2">
                    <span class="inline-flex items-center h-[18px] px-1.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-500">{{ sourceLabel(o.source) }}</span>
                    <span
                      v-if="nextActivity(o)"
                      class="inline-flex items-center h-[18px] px-1.5 rounded text-[10.5px] font-semibold"
                      :class="nextActivity(o)!.cls"
                      >{{ nextActivity(o)!.label }}</span
                    >
                  </div>
                  <div v-if="o.assignees?.length" class="flex justify-end mt-2.5">
                    <AvatarStack :users="o.assignees" :size="24" :max="4" />
                  </div>
                </div>
              </template>
              <template #footer>
                <div
                  v-if="!col.items.length"
                  class="text-center text-[12px] text-slate-300 py-6 border border-dashed border-slate-200 rounded-lg"
                >
                  Arraste oportunidades para cá
                </div>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </div>

    <!-- DETAIL DRAWER (componente reutilizável) -->
    <OpportunityDrawer
      v-model="drawerOpen"
      :opportunity="sel"
      :boards="orderedBoards"
      @updated="onOpportunityUpdated"
      @moved="onOpportunityMoved"
      @deleted="onOpportunityDeleted"
    />

    <!-- MENU de ações rápidas do card (⋯ / botão direito) -->
    <CardActionsMenu
      ref="cardMenu"
      :stages="activeStages"
      :boards="orderedBoards"
      :users="users"
      @updated="onOpportunityUpdated"
      @moved="onOpportunityMoved"
      @deleted="onOpportunityDeleted"
    />

    <!-- CRIAÇÃO manual (no board ativo) -->
    <NewOpportunityDrawer
      v-model="newOppOpen"
      :pipeline-id="activePipelineId"
      @created="onOpportunityCreated"
    />
  </div>
</template>

<style scoped>
/* placeholder do card sendo arrastado (vuedraggable/SortableJS) */
.kanban-ghost {
  opacity: 0.4;
}
.kanban-drag {
  cursor: grabbing;
}
</style>
