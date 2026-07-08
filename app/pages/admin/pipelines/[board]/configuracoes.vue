<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase
const opts = { baseURL: apiBase, credentials: 'include' as const }

interface FieldDef {
  id: string
  sectionId: string
  key: string
  label: string
  type: string
  options: string[]
  order: number
  indexed: boolean
  archived: boolean
}
interface Section {
  id: string
  key: string
  label: string
  order: number
  fields: FieldDef[]
}
interface Stage {
  id: string
  key: string
  label: string
  color: string
  order: number
  inKanban: boolean
  isWon: boolean
  isLost: boolean
  pipelineId: string
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  textarea: 'Texto longo',
  number: 'Número',
  money: 'Moeda',
  select: 'Seleção',
  multiselect: 'Múltipla escolha',
  boolean: 'Sim/Não',
  date: 'Data',
}
const TYPES = Object.keys(TYPE_LABELS)

const route = useRoute()
const sections = ref<Section[]>([])
const stages = ref<Stage[]>([])
const loading = ref(true)
// página é a configuração do pipeline: abre no Funil por padrão (Campos = ?tab=fields)
const tab = ref<'fields' | 'funnel'>(route.query.tab === 'fields' ? 'fields' : 'funnel')

// caches compartilhados usados por pipelines/crm/drawer — mantê-los em dia
const { loadStages } = useStages()
const { loadFieldDefinitions } = useFieldDefinitions()
const { users, loadUsers } = useUsers()
// boards: o editor de funil trabalha um board por vez (padrão = Qualificação)
const { pipelines, loadPipelines, updatePipeline, defaultPipeline } = usePipelines()
const funnelBoardId = ref('')
// o board vem da ROTA (/admin/pipelines/<key>/configuracoes) — configuração é exclusiva dele.
const boardKey = computed(() => route.params.board as string)
// board selecionado no editor de funil (define dono + etapas)
const funnelBoard = computed(() => pipelines.value.find((p) => p.id === funnelBoardId.value) || null)
// estágios do board selecionado (o funil é por board)
const funnelStages = computed(() => stages.value.filter((s) => s.pipelineId === funnelBoardId.value))
// resolve o board da rota (por key); fallback no padrão se a key não existir
function pickFunnelBoard() {
  const byKey = pipelines.value.find((p) => p.key === boardKey.value)
  funnelBoardId.value = byKey?.id || defaultPipeline.value?.id || ''
}
watch([pipelines, defaultPipeline, boardKey], pickFunnelBoard)

// define/remove o dono do board (ownership leve)
async function setFunnelOwner(uid: string) {
  if (!funnelBoard.value) return
  await updatePipeline(funnelBoard.value.id, { ownerUserId: uid || null })
}

async function loadAll() {
  loading.value = true
  try {
    const [s, st] = await Promise.all([
      $fetch<Section[]>('/field-definitions/all', opts),
      $fetch<Stage[]>('/stages', opts),
      loadPipelines(true),
      loadUsers(),
    ])
    sections.value = s
    stages.value = st
    pickFunnelBoard()
    // invalida os caches globais para o resto do app refletir sem reload duro
    await Promise.all([loadStages(true), loadFieldDefinitions(true)])
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

// reordena trocando a ordem com o vizinho (envia só os dois alterados)
async function move(list: { id: string; order: number }[], endpoint: string, idx: number, dir: number) {
  const j = idx + dir
  if (j < 0 || j >= list.length) return
  const a = list[idx]
  const b = list[j]
  await $fetch(endpoint, {
    ...opts,
    method: 'PATCH',
    body: { items: [{ id: a.id, order: b.order }, { id: b.id, order: a.order }] },
  })
  await loadAll()
}

// ── modal de seção ──
const sm = reactive({ open: false, editing: '' as string, key: '', label: '' })
function newSection() {
  Object.assign(sm, { open: true, editing: '', key: '', label: '' })
}
function editSection(s: Section) {
  Object.assign(sm, { open: true, editing: s.id, key: s.key, label: s.label })
}
async function saveSection() {
  if (!sm.label.trim() || !sm.key.trim()) return
  const body = { key: sm.key, label: sm.label }
  if (sm.editing) {
    await $fetch(`/field-sections/${sm.editing}`, { ...opts, method: 'PATCH', body })
  } else {
    await $fetch('/field-sections', { ...opts, method: 'POST', body })
  }
  sm.open = false
  await loadAll()
}
async function deleteSection(s: Section) {
  if (!confirm(`Excluir a seção "${s.label}" e seus campos? Os valores já preenchidos permanecem.`)) return
  await $fetch(`/field-sections/${s.id}`, { ...opts, method: 'DELETE' })
  await loadAll()
}

// ── modal de campo ──
const fm = reactive({
  open: false,
  editing: '' as string,
  sectionId: '',
  key: '',
  label: '',
  type: 'text',
  optionsText: '',
  indexed: false,
  archived: false,
})
const fmNeedsOptions = computed(() => fm.type === 'select' || fm.type === 'multiselect')
function newField(sectionId: string) {
  Object.assign(fm, {
    open: true, editing: '', sectionId, key: '', label: '', type: 'text',
    optionsText: '', indexed: false, archived: false,
  })
}
function editField(f: FieldDef) {
  Object.assign(fm, {
    open: true, editing: f.id, sectionId: f.sectionId, key: f.key, label: f.label,
    type: f.type, optionsText: (f.options || []).join('\n'), indexed: f.indexed, archived: f.archived,
  })
}
async function saveField() {
  if (!fm.label.trim() || (!fm.editing && !fm.key.trim())) return
  const options = fmNeedsOptions.value
    ? fm.optionsText.split('\n').map((o) => o.trim()).filter(Boolean)
    : []
  const base = { sectionId: fm.sectionId, key: fm.key, label: fm.label, type: fm.type, options, indexed: fm.indexed, archived: fm.archived }
  if (fm.editing) {
    await $fetch(`/field-definitions/${fm.editing}`, { ...opts, method: 'PATCH', body: base })
  } else {
    await $fetch('/field-definitions', { ...opts, method: 'POST', body: base })
  }
  fm.open = false
  await loadAll()
}
async function deleteField(f: FieldDef) {
  if (!confirm(`Excluir o campo "${f.label}"? Os valores já preenchidos permanecem no histórico.`)) return
  await $fetch(`/field-definitions/${f.id}`, { ...opts, method: 'DELETE' })
  await loadAll()
}
async function toggleIndexed(f: FieldDef) {
  await $fetch(`/field-definitions/${f.id}`, { ...opts, method: 'PATCH', body: { indexed: !f.indexed } })
  await loadAll()
}

// ── modal de estágio ──
const stm = reactive({
  open: false, editing: '' as string, key: '', label: '', color: '#1E40AF',
  inKanban: true, isWon: false, isLost: false,
})
function newStage() {
  Object.assign(stm, { open: true, editing: '', key: '', label: '', color: '#1E40AF', inKanban: true, isWon: false, isLost: false })
}
function editStage(s: Stage) {
  Object.assign(stm, { open: true, editing: s.id, key: s.key, label: s.label, color: s.color || '#1E40AF', inKanban: s.inKanban, isWon: s.isWon, isLost: s.isLost })
}
async function saveStage() {
  if (!stm.label.trim() || (!stm.editing && !stm.key.trim())) return
  const base = { label: stm.label, color: stm.color, inKanban: stm.inKanban, isWon: stm.isWon, isLost: stm.isLost }
  if (stm.editing) {
    await $fetch(`/stages/${stm.editing}`, { ...opts, method: 'PATCH', body: base })
  } else {
    // cria no board selecionado do editor de funil
    await $fetch('/stages', { ...opts, method: 'POST', body: { ...base, key: stm.key, pipelineId: funnelBoardId.value || undefined } })
  }
  stm.open = false
  await loadAll()
}
async function deleteStage(s: Stage) {
  if (!confirm(`Excluir o estágio "${s.label}"? Oportunidades nele mantêm o status.`)) return
  await $fetch(`/stages/${s.id}`, { ...opts, method: 'DELETE' })
  await loadAll()
}

// utilitários de estilo
const card = 'bg-white border border-slate-200 rounded-[10px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
const input = 'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand'
const select = 'w-full h-[38px] pl-[11px] pr-7 text-[13px] text-slate-900 border border-slate-300 rounded-lg bg-white cursor-pointer outline-none'
const label = 'block text-[12.5px] font-semibold text-slate-700 mb-[6px]'
const ico = 'inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer bg-transparent border-none disabled:opacity-30 disabled:cursor-default'
const badgeStyle = (c: string) => ({ color: c, backgroundColor: c + '1F' })
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader
      :title="funnelBoard ? `Configurações · ${funnelBoard.label}` : 'Configurações'"
      subtitle="Dono e etapas do funil deste pipeline. Os campos personalizados valem para todo o CRM."
    >
      <template v-if="funnelBoard" #actions>
        <NuxtLink
          :to="`/admin/pipelines?board=${funnelBoard.key}`"
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg no-underline hover:bg-slate-100"
        >
          ← Voltar ao pipeline
        </NuxtLink>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-slate-400 text-[14px] py-12 text-center">Carregando…</div>

    <div v-else class="max-w-[840px]">
      <!-- ABAS -->
      <div class="flex items-center gap-1 border-b border-slate-200 mb-6">
        <button
          :class="['h-9 px-3.5 text-[13px] font-semibold border-none bg-transparent cursor-pointer -mb-px border-b-2', tab === 'fields' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600']"
          @click="tab = 'fields'"
        >Campos personalizados</button>
        <button
          :class="['h-9 px-3.5 text-[13px] font-semibold border-none bg-transparent cursor-pointer -mb-px border-b-2', tab === 'funnel' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600']"
          @click="tab = 'funnel'"
        >Funil</button>
      </div>

      <!-- CAMPOS -->
      <section v-show="tab === 'fields'">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-[15px] font-bold text-slate-900 m-0">Campos personalizados</h2>
            <p class="text-[12.5px] text-slate-400 m-0">Enriquecem a oportunidade. Promova (★) para filtrar/agregar.</p>
          </div>
          <button class="h-[36px] px-3.5 bg-slate-900 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-slate-800" @click="newSection">+ Nova seção</button>
        </div>

        <div class="flex flex-col gap-4">
          <div v-for="(sec, si) in sections" :key="sec.id" :class="card">
            <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <span class="text-[13.5px] font-bold text-slate-800">{{ sec.label }}</span>
              <span class="text-[11px] text-slate-400 font-mono">{{ sec.key }}</span>
              <div class="ml-auto flex items-center gap-0.5">
                <button :class="ico" :disabled="si === 0" title="Subir" @click="move(sections, '/field-sections/reorder', si, -1)"><AdminIcon name="chevron" :size="15" class="rotate-180" /></button>
                <button :class="ico" :disabled="si === sections.length - 1" title="Descer" @click="move(sections, '/field-sections/reorder', si, 1)"><AdminIcon name="chevron" :size="15" /></button>
                <button :class="ico" title="Editar seção" @click="editSection(sec)"><AdminIcon name="draft" :size="15" /></button>
                <button :class="ico" title="Excluir seção" @click="deleteSection(sec)"><AdminIcon name="trash" :size="15" /></button>
              </div>
            </div>

            <div class="divide-y divide-slate-50">
              <div v-for="(f, fi) in sec.fields" :key="f.id" class="flex items-center gap-2 px-4 py-2.5" :class="f.archived ? 'opacity-50' : ''">
                <button :class="ico" :title="f.indexed ? 'Promovido (indexado)' : 'Promover para filtro/agregação'" @click="toggleIndexed(f)">
                  <span :class="f.indexed ? 'text-amber-500' : ''">{{ f.indexed ? '★' : '☆' }}</span>
                </button>
                <div class="min-w-0">
                  <div class="text-[13.5px] font-semibold text-slate-800 truncate">
                    {{ f.label }}
                    <span v-if="f.archived" class="text-[10.5px] font-normal text-slate-400">(arquivado)</span>
                  </div>
                  <div class="text-[11.5px] text-slate-400">
                    <span class="font-mono">{{ f.key }}</span> · {{ TYPE_LABELS[f.type] || f.type }}
                  </div>
                </div>
                <div class="ml-auto flex items-center gap-0.5">
                  <button :class="ico" :disabled="fi === 0" title="Subir" @click="move(sec.fields, '/field-definitions/reorder', fi, -1)"><AdminIcon name="chevron" :size="15" class="rotate-180" /></button>
                  <button :class="ico" :disabled="fi === sec.fields.length - 1" title="Descer" @click="move(sec.fields, '/field-definitions/reorder', fi, 1)"><AdminIcon name="chevron" :size="15" /></button>
                  <button :class="ico" title="Editar campo" @click="editField(f)"><AdminIcon name="draft" :size="15" /></button>
                  <button :class="ico" title="Excluir campo" @click="deleteField(f)"><AdminIcon name="trash" :size="15" /></button>
                </div>
              </div>
              <div v-if="!sec.fields.length" class="px-4 py-3 text-[12.5px] text-slate-400">Nenhum campo nesta seção.</div>
            </div>

            <div class="px-4 py-2.5 border-t border-slate-100">
              <button class="text-[12.5px] font-semibold text-brand hover:underline bg-transparent border-none cursor-pointer p-0" @click="newField(sec.id)">+ Adicionar campo</button>
            </div>
          </div>
          <div v-if="!sections.length" class="text-[13px] text-slate-400">Nenhuma seção ainda.</div>
        </div>
      </section>

      <!-- FUNIL -->
      <section v-show="tab === 'funnel'">
        <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div>
            <h2 class="text-[15px] font-bold text-slate-900 m-0">Funil</h2>
            <p class="text-[12.5px] text-slate-400 m-0">Etapas do pipeline. "No kanban" aparece como coluna.</p>
          </div>
          <button class="h-[36px] px-3.5 bg-slate-900 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-slate-800" @click="newStage">+ Novo estágio</button>
        </div>

        <!-- DONO DO PIPELINE (ownership leve: abre no board da pessoa, sem bloquear os outros) -->
        <div v-if="funnelBoard" :class="card" class="flex items-center gap-3 px-4 py-3 mb-3 flex-wrap">
          <div class="flex-1 min-w-[200px]">
            <div class="text-[13px] font-semibold text-slate-800">Dono do pipeline</div>
            <div class="text-[12px] text-slate-400">Abre por padrão para esta pessoa. Não bloqueia o acesso dos demais.</div>
          </div>
          <select
            class="h-[36px] pl-3 pr-8 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-brand"
            :value="funnelBoard.ownerUserId || ''"
            @change="setFunnelOwner(($event.target as HTMLSelectElement).value)"
          >
            <option value="">Sem dono</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>

        <div :class="card" class="divide-y divide-slate-50">
          <div v-for="(s, i) in funnelStages" :key="s.id" class="flex items-center gap-2.5 px-4 py-3">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: s.color }"></span>
            <span class="inline-flex items-center h-[22px] px-2 rounded-md text-[12px] font-semibold" :style="badgeStyle(s.color)">{{ s.label }}</span>
            <div class="flex items-center gap-1">
              <span v-if="s.inKanban" class="text-[10.5px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">kanban</span>
              <span v-if="s.isWon" class="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">ganho</span>
              <span v-if="s.isLost" class="text-[10.5px] font-semibold text-red-700 bg-red-50 rounded px-1.5 py-0.5">perda</span>
            </div>
            <div class="ml-auto flex items-center gap-0.5">
              <button :class="ico" :disabled="i === 0" title="Subir" @click="move(funnelStages, '/stages/reorder', i, -1)"><AdminIcon name="chevron" :size="15" class="rotate-180" /></button>
              <button :class="ico" :disabled="i === funnelStages.length - 1" title="Descer" @click="move(funnelStages, '/stages/reorder', i, 1)"><AdminIcon name="chevron" :size="15" /></button>
              <button :class="ico" title="Editar estágio" @click="editStage(s)"><AdminIcon name="draft" :size="15" /></button>
              <button :class="ico" title="Excluir estágio" @click="deleteStage(s)"><AdminIcon name="trash" :size="15" /></button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- MODAL SEÇÃO -->
    <div v-if="sm.open" class="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-6" @click="sm.open = false">
      <div class="bg-white rounded-xl w-full max-w-[400px] p-5" @click.stop>
        <h3 class="text-[15px] font-bold text-slate-900 m-0 mb-4">{{ sm.editing ? 'Editar seção' : 'Nova seção' }}</h3>
        <div class="flex flex-col gap-3">
          <div>
            <label :class="label">Chave (key)</label>
            <input v-model="sm.key" :class="input" placeholder="ex: financeiro" />
            <p v-if="sm.editing" class="text-[11px] text-amber-600 mt-1">Mudar a key altera o caminho no ingest e nos valores salvos.</p>
          </div>
          <div>
            <label :class="label">Nome</label>
            <input v-model="sm.label" :class="input" placeholder="ex: Financeiro" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="h-9 px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer" @click="sm.open = false">Cancelar</button>
          <button class="h-9 px-4 text-[13px] font-semibold text-white bg-brand rounded-lg cursor-pointer border-none hover:bg-brand-dark" @click="saveSection">Salvar</button>
        </div>
      </div>
    </div>

    <!-- MODAL CAMPO -->
    <div v-if="fm.open" class="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-6" @click="fm.open = false">
      <div class="bg-white rounded-xl w-full max-w-[440px] p-5 max-h-[90vh] overflow-y-auto" @click.stop>
        <h3 class="text-[15px] font-bold text-slate-900 m-0 mb-4">{{ fm.editing ? 'Editar campo' : 'Novo campo' }}</h3>
        <div class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label :class="label">Seção</label>
              <select v-model="fm.sectionId" :class="select">
                <option v-for="s in sections" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
            </div>
            <div>
              <label :class="label">Tipo</label>
              <select v-model="fm.type" :class="select">
                <option v-for="t in TYPES" :key="t" :value="t">{{ TYPE_LABELS[t] }}</option>
              </select>
            </div>
          </div>
          <div>
            <label :class="label">Chave (key)</label>
            <input v-model="fm.key" :class="input" placeholder="ex: creditApproval" />
            <p class="text-[11px] mt-1" :class="fm.editing ? 'text-amber-600' : 'text-slate-400'">
              {{ fm.editing ? 'Mudar a key altera o caminho no ingest e nos valores salvos.' : 'Letras/números/_' }}
            </p>
          </div>
          <div>
            <label :class="label">Rótulo</label>
            <input v-model="fm.label" :class="input" placeholder="ex: Aprovação de crédito" />
          </div>
          <div v-if="fmNeedsOptions">
            <label :class="label">Opções (uma por linha)</label>
            <textarea v-model="fm.optionsText" class="w-full h-[90px] px-[11px] py-2 text-[13px] border border-slate-300 rounded-lg outline-none resize-y leading-[1.6]" placeholder="Sim&#10;Em análise&#10;Não"></textarea>
          </div>
          <label class="inline-flex items-center gap-2 cursor-pointer text-[13px] text-slate-700">
            <input v-model="fm.indexed" type="checkbox" class="w-4 h-4 accent-brand" /> Promover (indexar para filtro/agregação)
          </label>
          <label v-if="fm.editing" class="inline-flex items-center gap-2 cursor-pointer text-[13px] text-slate-700">
            <input v-model="fm.archived" type="checkbox" class="w-4 h-4 accent-brand" /> Arquivar (esconde da oportunidade)
          </label>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="h-9 px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer" @click="fm.open = false">Cancelar</button>
          <button class="h-9 px-4 text-[13px] font-semibold text-white bg-brand rounded-lg cursor-pointer border-none hover:bg-brand-dark" @click="saveField">Salvar</button>
        </div>
      </div>
    </div>

    <!-- MODAL ESTÁGIO -->
    <div v-if="stm.open" class="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-6" @click="stm.open = false">
      <div class="bg-white rounded-xl w-full max-w-[400px] p-5" @click.stop>
        <h3 class="text-[15px] font-bold text-slate-900 m-0 mb-4">{{ stm.editing ? 'Editar estágio' : 'Novo estágio' }}</h3>
        <div class="flex flex-col gap-3">
          <div v-if="!stm.editing">
            <label :class="label">Chave (key)</label>
            <input v-model="stm.key" :class="input" placeholder="ex: Negociando" />
          </div>
          <div class="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label :class="label">Nome</label>
              <input v-model="stm.label" :class="input" placeholder="ex: Negociando" />
            </div>
            <div>
              <label :class="label">Cor</label>
              <input v-model="stm.color" type="color" class="w-[46px] h-[38px] p-0.5 border border-slate-300 rounded-lg cursor-pointer bg-white" />
            </div>
          </div>
          <div class="flex flex-col gap-2 mt-1">
            <label class="inline-flex items-center gap-2 cursor-pointer text-[13px] text-slate-700"><input v-model="stm.inKanban" type="checkbox" class="w-4 h-4 accent-brand" /> Aparece no kanban</label>
            <label class="inline-flex items-center gap-2 cursor-pointer text-[13px] text-slate-700"><input v-model="stm.isWon" type="checkbox" class="w-4 h-4 accent-brand" /> Estágio de ganho</label>
            <label class="inline-flex items-center gap-2 cursor-pointer text-[13px] text-slate-700"><input v-model="stm.isLost" type="checkbox" class="w-4 h-4 accent-brand" /> Estágio de perda</label>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="h-9 px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer" @click="stm.open = false">Cancelar</button>
          <button class="h-9 px-4 text-[13px] font-semibold text-white bg-brand rounded-lg cursor-pointer border-none hover:bg-brand-dark" @click="saveStage">Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>
