<script setup lang="ts">
// Configurações exclusivas de UM pipeline (vem da rota): dono + etapas do funil.
// Campos personalizados são globais do CRM → /admin/configuracoes.
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase
const opts = { baseURL: apiBase, credentials: 'include' as const }

interface Stage {
  id: string
  externalId: string
  label: string
  color: string
  order: number
  inKanban: boolean
  isWon: boolean
  isLost: boolean
  pipelineId: string
  oppCount?: number
}

const route = useRoute()
const stages = ref<Stage[]>([])
const loading = ref(true)

// caches compartilhados usados por pipelines/crm/drawer — mantê-los em dia
const { loadStages } = useStages()
const { users, loadUsers } = useUsers()
const { pipelines, loadPipelines, updatePipeline, defaultPipeline } = usePipelines()

const funnelBoardId = ref('')
// o board vem da ROTA (/admin/pipelines/<id>/configuracoes) — config exclusiva dele.
const boardId = computed(() => route.params.id as string)
const funnelBoard = computed(() => pipelines.value.find((p) => p.id === funnelBoardId.value) || null)
const funnelStages = computed(() => stages.value.filter((s) => s.pipelineId === funnelBoardId.value))
function pickFunnelBoard() {
  const byId = pipelines.value.find((p) => p.id === boardId.value)
  funnelBoardId.value = byId?.id || defaultPipeline.value?.id || ''
}
watch([pipelines, defaultPipeline, boardId], pickFunnelBoard)

// define/remove o dono do board (ownership leve)
async function setFunnelOwner(uid: string) {
  if (!funnelBoard.value) return
  await updatePipeline(funnelBoard.value.id, { ownerUserId: uid || null })
}

// nome (label) e cor editáveis — a identidade é o id (interno) + externalId (integrações).
const editName = ref('')
const savingMeta = ref(false)
const metaError = ref('')
watch(
  funnelBoard,
  (b) => {
    editName.value = b?.label || ''
  },
  { immediate: true },
)
const metaDirty = computed(
  () => !!funnelBoard.value && editName.value.trim() !== funnelBoard.value.label,
)
async function saveMeta() {
  if (!funnelBoard.value || !metaDirty.value) return
  const name = editName.value.trim()
  if (!name) {
    metaError.value = 'O nome é obrigatório.'
    return
  }
  savingMeta.value = true
  metaError.value = ''
  try {
    await updatePipeline(funnelBoard.value.id, { label: name })
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string | string[] } })?.data?.message
    metaError.value = (Array.isArray(msg) ? msg[0] : msg) || 'Não foi possível salvar.'
  } finally {
    savingMeta.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [st] = await Promise.all([
      $fetch<Stage[]>('/stages', opts),
      loadPipelines(true),
      loadUsers(),
    ])
    stages.value = st
    pickFunnelBoard()
    await loadStages(true) // invalida o cache global (kanban/badges)
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

// ── modal de estágio ──
const stm = reactive({
  open: false, editing: '' as string, externalId: '', label: '', color: '#1E40AF',
  inKanban: true, isWon: false, isLost: false,
})
function newStage() {
  Object.assign(stm, { open: true, editing: '', externalId: '', label: '', color: '#1E40AF', inKanban: true, isWon: false, isLost: false })
}
function editStage(s: Stage) {
  Object.assign(stm, { open: true, editing: s.id, externalId: s.externalId, label: s.label, color: s.color || '#1E40AF', inKanban: s.inKanban, isWon: s.isWon, isLost: s.isLost })
}
async function saveStage() {
  if (!stm.label.trim()) return
  const base = { label: stm.label, color: stm.color, inKanban: stm.inKanban, isWon: stm.isWon, isLost: stm.isLost }
  if (stm.editing) {
    await $fetch(`/stages/${stm.editing}`, { ...opts, method: 'PATCH', body: base })
  } else {
    // cria no pipeline desta página (id/externalId gerados no backend)
    await $fetch('/stages', { ...opts, method: 'POST', body: { ...base, pipelineId: funnelBoardId.value || undefined } })
  }
  stm.open = false
  await loadAll()
}
// ── excluir estágio (com migração das oportunidades) ──
const dlm = reactive({ open: false, stage: null as Stage | null, moveTo: '', saving: false, error: '' })
// destinos possíveis: outros estágios do mesmo pipeline
const deleteTargets = computed(() =>
  dlm.stage ? funnelStages.value.filter((s) => s.id !== dlm.stage!.id) : [],
)
function deleteStage(s: Stage) {
  if (s.oppCount && s.oppCount > 0) {
    // tem oportunidades → precisa migrar antes; abre o modal
    const targets = funnelStages.value.filter((t) => t.id !== s.id)
    if (!targets.length) {
      alert('Este é o único estágio do pipeline. Crie outro estágio antes de excluir para onde mover as oportunidades.')
      return
    }
    Object.assign(dlm, { open: true, stage: s, moveTo: targets[0]!.id, saving: false, error: '' })
    return
  }
  // vazio → exclui direto
  if (!confirm(`Excluir o estágio "${s.label}"?`)) return
  $fetch(`/stages/${s.id}`, { ...opts, method: 'DELETE' }).then(loadAll)
}
async function confirmDeleteStage() {
  if (!dlm.stage || !dlm.moveTo) return
  dlm.saving = true
  dlm.error = ''
  try {
    await $fetch(`/stages/${dlm.stage.id}`, { ...opts, method: 'DELETE', query: { moveTo: dlm.moveTo } })
    dlm.open = false
    await loadAll()
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string | string[] } })?.data?.message
    dlm.error = (Array.isArray(msg) ? msg[0] : msg) || 'Não foi possível excluir.'
  } finally {
    dlm.saving = false
  }
}

// utilitários de estilo
const card = 'bg-white border border-slate-200 rounded-[10px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
const input = 'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand'
const label = 'block text-[12.5px] font-semibold text-slate-700 mb-[6px]'
const ico = 'inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer bg-transparent border-none disabled:opacity-30 disabled:cursor-default'
const badgeStyle = (c: string) => ({ color: c, backgroundColor: c + '1F' })
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader
      :title="funnelBoard ? `Pipeline · ${funnelBoard.label}` : 'Configurações do pipeline'"
      subtitle="Dono e etapas do funil deste pipeline."
    >
      <template v-if="funnelBoard" #actions>
        <NuxtLink
          :to="`/admin/pipelines/${funnelBoard.id}`"
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg no-underline hover:bg-slate-100"
        >
          ← Voltar ao pipeline
        </NuxtLink>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-slate-400 text-[14px] py-12 text-center">Carregando…</div>

    <div v-else class="max-w-[840px]">
      <!-- DADOS DO PIPELINE: nome + key (Salvar) e dono (auto-salva) -->
      <div v-if="funnelBoard" :class="card" class="p-4 mb-4">
        <div class="text-[13px] font-bold text-slate-800 mb-3">Pipeline</div>

        <div class="mb-3">
          <label :class="label">Nome</label>
          <input v-model="editName" :class="input" class="!max-w-[360px]" placeholder="ex: Corretagem" />
        </div>

        <div class="flex items-end gap-3 flex-wrap pt-3 border-t border-slate-100">
          <div class="flex-1 min-w-[200px]">
            <label :class="label">Dono do pipeline</label>
            <select
              class="w-full h-[38px] pl-3 pr-8 text-[13px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg outline-none cursor-pointer focus:border-brand"
              :value="funnelBoard.ownerUserId || ''"
              @change="setFunnelOwner(($event.target as HTMLSelectElement).value)"
            >
              <option value="">Sem dono</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
            <div class="text-[11.5px] text-slate-400 mt-1">Abre por padrão pra esta pessoa; não bloqueia os demais.</div>
          </div>
          <div class="flex items-center gap-2.5 ml-auto">
            <span v-if="metaError" class="text-[12px] text-red-600 font-medium">{{ metaError }}</span>
            <button
              class="h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-brand-dark disabled:opacity-50 disabled:cursor-default"
              :disabled="!metaDirty || savingMeta"
              @click="saveMeta"
            >
              {{ savingMeta ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- FUNIL -->
      <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 class="text-[15px] font-bold text-slate-900 m-0">Funil</h2>
          <p class="text-[12.5px] text-slate-400 m-0">Etapas do pipeline. "No kanban" aparece como coluna.</p>
        </div>
        <button class="h-[36px] px-3.5 bg-slate-900 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-slate-800" @click="newStage">+ Novo estágio</button>
      </div>

      <div :class="card" class="divide-y divide-slate-50">
        <div v-for="(s, i) in funnelStages" :key="s.id" class="flex items-center gap-2.5 px-4 py-3">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: s.color }"></span>
          <span class="inline-flex items-center h-[22px] px-2 rounded-md text-[12px] font-semibold" :style="badgeStyle(s.color)">{{ s.label }}</span>
          <div class="flex items-center gap-1">
            <span v-if="s.inKanban" class="text-[10.5px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">kanban</span>
            <span v-if="s.isWon" class="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">ganho</span>
            <span v-if="s.isLost" class="text-[10.5px] font-semibold text-red-700 bg-red-50 rounded px-1.5 py-0.5">perda</span>
            <span v-if="s.oppCount" class="text-[10.5px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5" :title="s.oppCount + ' oportunidade(s) neste estágio'">{{ s.oppCount }} opp</span>
          </div>
          <div class="ml-auto flex items-center gap-0.5">
            <button :class="ico" :disabled="i === 0" title="Subir" @click="move(funnelStages, '/stages/reorder', i, -1)"><AdminIcon name="chevron" :size="15" class="rotate-180" /></button>
            <button :class="ico" :disabled="i === funnelStages.length - 1" title="Descer" @click="move(funnelStages, '/stages/reorder', i, 1)"><AdminIcon name="chevron" :size="15" /></button>
            <button :class="ico" title="Editar estágio" @click="editStage(s)"><AdminIcon name="draft" :size="15" /></button>
            <button :class="ico" title="Excluir estágio" @click="deleteStage(s)"><AdminIcon name="trash" :size="15" /></button>
          </div>
        </div>
        <div v-if="!funnelStages.length" class="px-4 py-3 text-[12.5px] text-slate-400">Nenhuma etapa neste pipeline.</div>
      </div>
    </div>

    <!-- MODAL ESTÁGIO -->
    <div v-if="stm.open" class="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-6" @click="stm.open = false">
      <div class="bg-white rounded-xl w-full max-w-[400px] p-5" @click.stop>
        <h3 class="text-[15px] font-bold text-slate-900 m-0 mb-4">{{ stm.editing ? 'Editar estágio' : 'Novo estágio' }}</h3>
        <div class="flex flex-col gap-3">
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
          <div v-if="stm.editing" class="mt-1">
            <label :class="label">ID externo (integrações)</label>
            <input
              :value="stm.externalId"
              readonly
              class="w-full h-9 px-3 text-[12px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-lg cursor-text select-all"
              @focus="(e) => (e.target as HTMLInputElement).select()"
            />
            <p class="text-[11px] text-slate-400 mt-1">Estável — use este id para referenciar o estágio em integrações.</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="h-9 px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer" @click="stm.open = false">Cancelar</button>
          <button class="h-9 px-4 text-[13px] font-semibold text-white bg-brand rounded-lg cursor-pointer border-none hover:bg-brand-dark" @click="saveStage">Salvar</button>
        </div>
      </div>
    </div>

    <!-- MODAL EXCLUIR ESTÁGIO (com migração das oportunidades) -->
    <div v-if="dlm.open && dlm.stage" class="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-6" @click="dlm.open = false">
      <div class="bg-white rounded-xl w-full max-w-[420px] p-5" @click.stop>
        <h3 class="text-[15px] font-bold text-slate-900 m-0 mb-1.5">Excluir "{{ dlm.stage.label }}"</h3>
        <p class="text-[13px] text-slate-500 m-0 mb-4 leading-[1.5]">
          Há <strong class="text-slate-700">{{ dlm.stage.oppCount }}</strong> oportunidade(s) neste estágio.
          Para onde movê-las antes de excluir?
        </p>
        <label :class="label">Mover para</label>
        <select v-model="dlm.moveTo" :class="input">
          <option v-for="t in deleteTargets" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
        <p v-if="dlm.error" class="text-[12px] text-red-600 mt-2">{{ dlm.error }}</p>
        <div class="flex justify-end gap-2 mt-5">
          <button class="h-9 px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer" @click="dlm.open = false">Cancelar</button>
          <button
            class="h-9 px-4 text-[13px] font-semibold text-white bg-red-600 rounded-lg cursor-pointer border-none hover:bg-red-700 disabled:opacity-50"
            :disabled="dlm.saving || !dlm.moveTo"
            @click="confirmDeleteStage"
          >
            {{ dlm.saving ? 'Excluindo…' : 'Mover e excluir' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
