<script setup lang="ts">
// Configurações exclusivas de UM pipeline (vem da rota): dono + etapas do funil.
// Campos personalizados são globais do CRM → /admin/configuracoes.
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase
const opts = { baseURL: apiBase, credentials: 'include' as const }

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

const route = useRoute()
const stages = ref<Stage[]>([])
const loading = ref(true)

// caches compartilhados usados por pipelines/crm/drawer — mantê-los em dia
const { loadStages } = useStages()
const { users, loadUsers } = useUsers()
const { pipelines, loadPipelines, updatePipeline, defaultPipeline } = usePipelines()

const funnelBoardId = ref('')
// o board vem da ROTA (/admin/pipelines/<key>/configuracoes) — config exclusiva dele.
const boardKey = computed(() => route.params.board as string)
const funnelBoard = computed(() => pipelines.value.find((p) => p.id === funnelBoardId.value) || null)
const funnelStages = computed(() => stages.value.filter((s) => s.pipelineId === funnelBoardId.value))
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
    // cria no pipeline desta página
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
          :to="`/admin/pipelines/${funnelBoard.key}`"
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg no-underline hover:bg-slate-100"
        >
          ← Voltar ao pipeline
        </NuxtLink>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-slate-400 text-[14px] py-12 text-center">Carregando…</div>

    <div v-else class="max-w-[840px]">
      <!-- DONO DO PIPELINE (ownership leve: abre no board da pessoa, sem bloquear os outros) -->
      <div v-if="funnelBoard" :class="card" class="flex items-center gap-3 px-4 py-3 mb-4 flex-wrap">
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
