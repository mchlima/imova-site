<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

import { type Opportunity, type RawOpportunity, mapOpportunity, oppCity, oppUf } from '~/utils/opportunityModel'

const apiBase = useRuntimeConfig().public.apiBase

// boards (pipelines) — para o "Enviar para" do menu de ações no drawer
const { pipelines, loadPipelines } = usePipelines()
loadPipelines()
const orderedBoards = computed(() => [...pipelines.value].sort((a, b) => a.order - b.order))

interface PendingActivity {
  id: string
  type: string
  title: string
  notes: string
  dueAt: string | null
  author: string
  createdAt: string
  opportunity: {
    id: string
    stageId: string | null
    temperature: string
    fields: Record<string, unknown>
    contact: { name: string; channels: { type: string; value: string }[] }
  }
}
type Bucket = 'overdue' | 'today' | 'upcoming' | 'undated'

const items = ref<PendingActivity[]>([])
const loading = ref(true)
const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    items.value = await $fetch<PendingActivity[]>('/opportunities/activities/pending', {
      baseURL: apiBase,
      credentials: 'include',
    })
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

const ACTIVITY_LABELS: Record<string, string> = {
  ligação: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  reunião: 'Reunião',
  visita: 'Visita',
  tarefa: 'Tarefa',
}
const activityLabel = (t: string) => ACTIVITY_LABELS[t] || t

const pad = (x: number) => String(x).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function bucketOf(a: PendingActivity): Bucket {
  if (!a.dueAt) return 'undated'
  const k = dayKey(new Date(a.dueAt))
  const today = dayKey(new Date())
  if (k < today) return 'overdue'
  if (k === today) return 'today'
  return 'upcoming'
}
const ORDER: Record<Bucket, number> = { overdue: 0, today: 1, upcoming: 2, undated: 3 }
const BUCKET_BADGE: Record<Bucket, { label: string; cls: string }> = {
  overdue: { label: 'Atrasada', cls: 'bg-red-50 text-red-700' },
  today: { label: 'Hoje', cls: 'bg-[#FEF6E7] text-amber-700' },
  upcoming: { label: 'Próxima', cls: 'bg-brand-soft text-brand' },
  undated: { label: 'Sem data', cls: 'bg-slate-100 text-slate-500' },
}

const counts = computed(() => {
  const c = { overdue: 0, today: 0, upcoming: 0, undated: 0 }
  for (const a of items.value) c[bucketOf(a)]++
  return c
})

// filtro por bucket
type Filter = 'all' | 'overdue' | 'today' | 'upcoming'
const filter = ref<Filter>('all')
const filterButtons = computed(() => [
  { key: 'all' as Filter, label: 'Todos', count: items.value.length },
  { key: 'overdue' as Filter, label: 'Atrasadas', count: counts.value.overdue },
  { key: 'today' as Filter, label: 'Hoje', count: counts.value.today },
  { key: 'upcoming' as Filter, label: 'Próximas', count: counts.value.upcoming },
])
const ACTIVE_CLS: Record<Filter, string> = {
  all: 'bg-slate-900 text-white border-slate-900',
  overdue: 'bg-red-600 text-white border-red-600',
  today: 'bg-amber-600 text-white border-amber-600',
  upcoming: 'bg-brand text-white border-brand',
}
const BADGE_CLS: Record<Filter, string> = {
  all: 'bg-slate-100 text-slate-500',
  overdue: 'bg-red-50 text-red-700',
  today: 'bg-[#FEF6E7] text-amber-700',
  upcoming: 'bg-brand-soft text-brand',
}

// tabela única ordenada por urgência (atrasadas → hoje → próximas → sem data)
const rows = computed(() =>
  items.value
    .map((a) => ({ a, bucket: bucketOf(a) }))
    .sort((x, y) => {
      if (ORDER[x.bucket] !== ORDER[y.bucket]) return ORDER[x.bucket] - ORDER[y.bucket]
      const tx = x.a.dueAt ? new Date(x.a.dueAt).getTime() : new Date(x.a.createdAt).getTime()
      const ty = y.a.dueAt ? new Date(y.a.dueAt).getTime() : new Date(y.a.createdAt).getTime()
      return tx - ty
    }),
)
const visibleRows = computed(() =>
  filter.value === 'all' ? rows.value : rows.value.filter((r) => r.bucket === filter.value),
)

// abre o drawer da oportunidade na própria página
const drawerOpen = ref(false)
const selectedOpportunity = ref<Opportunity | null>(null)
async function openOpportunity(a: PendingActivity) {
  selectedOpportunity.value = null
  drawerOpen.value = true
  try {
    const raw = await $fetch<RawOpportunity>(`/opportunities/${a.opportunity.id}`, {
      baseURL: apiBase,
      credentials: 'include',
    })
    selectedOpportunity.value = mapOpportunity(raw)
  } catch {
    drawerOpen.value = false
  }
}
// quando o drawer altera a oportunidade (ex.: concluir atividade), atualiza a lista de pendências
function onOpportunityUpdated(opportunity: Opportunity) {
  selectedOpportunity.value = opportunity
  load()
}
// oportunidade excluída ou repassada pelo menu de ações: fecha o drawer e recarrega
function onOpportunityDeleted() {
  drawerOpen.value = false
  selectedOpportunity.value = null
  load()
}
// concluir abre o modal para revisar/registrar o desfecho
const completeOpen = ref(false)
const toComplete = ref<PendingActivity | null>(null)
function askComplete(a: PendingActivity) {
  toComplete.value = a
  completeOpen.value = true
}
async function confirmComplete(patch: { type: string; title: string; notes: string }) {
  const a = toComplete.value
  if (!a) return
  try {
    await $fetch(`/opportunities/${a.opportunity.id}/activities/${a.id}`, {
      baseURL: apiBase,
      method: 'PATCH',
      credentials: 'include',
      body: { done: true, ...patch },
    })
    items.value = items.value.filter((x) => x.id !== a.id)
  } catch {
    await load()
  }
}
const waNumber = (a: PendingActivity) => {
  const chs = a.opportunity.contact.channels || []
  return (
    chs.find((c) => c.type === 'whatsapp')?.value ||
    chs.find((c) => c.type === 'telefone')?.value ||
    ''
  )
}
const waLink = (a: PendingActivity) => 'https://wa.me/55' + waNumber(a).replace(/\D/g, '')

const tempCls = (t: string) =>
  t === 'Quente'
    ? 'bg-brand-soft text-brand'
    : t === 'Morno'
      ? 'bg-[#FEF6E7] text-amber-700'
      : t === 'Frio'
        ? 'bg-slate-100 text-slate-500'
        : 'bg-slate-50 text-slate-400 border border-slate-200'

const th = 'py-3 px-3 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400'
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader title="Follow-up" subtitle="Atividades atrasadas, de hoje e próximas." />

    <!-- filtros -->
    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="b in filterButtons"
        :key="b.key"
        class="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold border cursor-pointer transition-all"
        :class="filter === b.key ? ACTIVE_CLS[b.key] : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
        @click="filter = b.key"
      >
        {{ b.label }}
        <span
          class="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full text-[11px] font-bold"
          :class="filter === b.key ? 'bg-white/25 text-white' : BADGE_CLS[b.key]"
          >{{ b.count }}</span
        >
      </button>
    </div>

    <!-- tabela -->
    <div class="bg-white border border-slate-200 rounded-[10px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div class="overflow-x-auto">
        <table class="w-full table-fixed border-collapse min-w-[860px]">
          <colgroup>
            <col class="w-[16%]" />
            <col class="w-[34%]" />
            <col class="w-[28%]" />
            <col class="w-[12%]" />
            <col class="w-[10%]" />
          </colgroup>
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th :class="th" class="!px-4">Quando</th>
              <th :class="th">Atividade</th>
              <th :class="th">Oportunidade</th>
              <th :class="th">Temp.</th>
              <th :class="th" class="!text-right !px-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="{ a, bucket } in visibleRows"
              :key="a.id"
              class="border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50"
              @click="openOpportunity(a)"
            >
              <td class="py-[13px] px-4">
                <span
                  class="inline-flex items-center h-[20px] px-1.5 rounded text-[11px] font-semibold"
                  :class="BUCKET_BADGE[bucket].cls"
                  >{{ BUCKET_BADGE[bucket].label }}</span
                >
                <div v-if="a.dueAt" class="text-[12px] text-slate-500 mt-1">{{ fmtDateTime(a.dueAt) }}</div>
              </td>
              <td class="py-[13px] px-3">
                <div class="flex items-center gap-2">
                  <span class="text-[10.5px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 shrink-0">{{ activityLabel(a.type) }}</span>
                  <span class="text-[14px] font-semibold text-slate-900 truncate">{{ a.title }}</span>
                </div>
                <div v-if="a.notes" class="text-[12px] text-slate-500 mt-0.5 truncate">{{ a.notes }}</div>
              </td>
              <td class="py-[13px] px-3">
                <div class="text-[13.5px] font-semibold text-slate-800 truncate">{{ a.opportunity.contact.name }}</div>
                <div v-if="oppCity(a.opportunity)" class="text-[12px] text-slate-400 truncate">{{ oppCity(a.opportunity) }}/{{ oppUf(a.opportunity) }}</div>
              </td>
              <td class="py-[13px] px-3">
                <span
                  class="inline-flex items-center h-[20px] px-1.5 rounded text-[11px] font-semibold"
                  :class="tempCls(a.opportunity.temperature)"
                  >{{ a.opportunity.temperature }}</span
                >
              </td>
              <td class="py-[13px] px-4">
                <div class="flex items-center justify-end gap-1" @click.stop>
                  <a
                    v-if="waNumber(a)"
                    :href="waLink(a)"
                    target="_blank"
                    title="WhatsApp"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand transition-colors"
                  >
                    <AdminIcon name="whatsapp" :size="16" />
                  </a>
                  <button
                    title="Concluir"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-brand-soft hover:text-brand cursor-pointer bg-transparent border-none transition-colors"
                    @click="askComplete(a)"
                  >
                    <AdminIcon name="check" :size="17" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SkeletonTable v-if="loading" :rows="8" :cols="4" />
      <div v-else-if="loadError" class="py-12 text-center text-red-500 text-[14px]">
        Erro ao carregar. <button class="underline" @click="load">Tentar de novo</button>
      </div>
      <div v-else-if="!rows.length" class="py-14 text-center text-slate-400">
        <div class="text-[15px] font-semibold text-slate-500">Tudo em dia 🎉</div>
        <p class="text-[13.5px] mt-1">Nenhuma atividade pendente. Agende follow-ups nas oportunidades.</p>
      </div>
      <div v-else-if="!visibleRows.length" class="py-14 text-center text-slate-400 text-[14px]">
        Nenhuma atividade nesta categoria.
      </div>
    </div>

    <OpportunityDrawer
      v-model="drawerOpen"
      :opportunity="selectedOpportunity"
      :boards="orderedBoards"
      @updated="onOpportunityUpdated"
      @moved="onOpportunityDeleted"
      @deleted="onOpportunityDeleted"
    />
    <ActivityCompleteModal v-model="completeOpen" :activity="toComplete" @confirm="confirmComplete" />
  </div>
</template>
