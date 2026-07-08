<script setup lang="ts">
import { type RawOpportunity, mapOpportunity, type Opportunity, oppCity, oppUf } from '~/utils/opportunityModel'

definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase

// funil como dado (GET /stages) — o funil do gráfico é escopado a um board
const { loadStages, stagesFor, stageColor, stageBadgeStyle } = useStages()
// boards: o gráfico de funil mostra um board por vez (padrão = Captação)
const { pipelines, loadPipelines, defaultPipeline } = usePipelines()
const funnelBoardId = ref('')
const funnelStages = computed(() => stagesFor(funnelBoardId.value))
watch(defaultPipeline, (p) => {
  if (!funnelBoardId.value && p) funnelBoardId.value = p.id
})

interface PendingActivity {
  id: string
  dueAt: string | null
}

const opportunities = ref<Opportunity[]>([])
const pending = ref<PendingActivity[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  loadStages()
  loadPipelines()
  try {
    const [l, p] = await Promise.all([
      $fetch<RawOpportunity[]>('/opportunities', { baseURL: apiBase, credentials: 'include' }),
      $fetch<PendingActivity[]>('/opportunities/activities/pending', {
        baseURL: apiBase,
        credentials: 'include',
      }).catch(() => [] as PendingActivity[]),
    ])
    opportunities.value = l.map(mapOpportunity)
    pending.value = p
  } finally {
    loading.value = false
  }
}
onMounted(load)

const pad = (x: number) => String(x).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const followups = computed(() => {
  const today = dayKey(new Date())
  let overdue = 0
  let todayC = 0
  let upcoming = 0
  for (const a of pending.value) {
    if (!a.dueAt) continue
    const k = dayKey(new Date(a.dueAt))
    if (k < today) overdue++
    else if (k === today) todayC++
    else upcoming++
  }
  return { overdue, today: todayC, upcoming, total: pending.value.length }
})

const statusCount = (s: string) => opportunities.value.filter((l) => l.status === s).length

const TEMPS = ['Quente', 'Morno', 'Frio', 'Sem classificação']
const tempCount = (t: string) => opportunities.value.filter((l) => l.temperature === t).length
const tempCls: Record<string, string> = {
  Quente: 'bg-brand-soft text-brand',
  Morno: 'bg-[#FEF6E7] text-amber-700',
  Frio: 'bg-slate-100 text-slate-500',
  'Sem classificação': 'bg-slate-50 text-slate-400 border border-slate-200',
}

const recent = computed(() => opportunities.value.slice(0, 6))

const stats = computed(() => [
  { label: 'Oportunidades', value: opportunities.value.length, icon: 'opportunities', accent: true },
  { label: 'Novos (Lead)', value: statusCount('Lead'), icon: 'opportunities' },
  { label: 'Quentes', value: tempCount('Quente'), icon: 'opportunities' },
  { label: 'Atrasadas', value: followups.value.overdue, icon: 'followup', to: '/admin/follow-up', danger: followups.value.overdue > 0 },
  { label: 'Hoje', value: followups.value.today, icon: 'followup', to: '/admin/follow-up' },
  { label: 'Próximas', value: followups.value.upcoming, icon: 'followup', to: '/admin/follow-up' },
])

// ── gráficos (ApexCharts) ──
const oppFmt = (v: number) => `${v} oportunidade${v === 1 ? '' : 's'}`

// funil por status (barras horizontais, na ordem do funil) — cores/labels do dado,
// escopado ao board selecionado (as keys são únicas entre boards).
const statusSeries = computed(() => [
  { name: 'Oportunidades', data: funnelStages.value.map((s) => statusCount(s.key)) },
])
const statusOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { speed: 400 } },
  plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6, barHeight: '60%' } },
  colors: funnelStages.value.map((s) => stageColor(s.key)),
  dataLabels: { enabled: true, style: { fontWeight: 700, colors: ['#fff'], fontSize: '12px' } },
  xaxis: { categories: funnelStages.value.map((s) => s.label), labels: { style: { colors: '#94a3b8', fontSize: '12px' } } },
  yaxis: { labels: { style: { colors: '#475569', fontSize: '12.5px', fontWeight: 600 } } },
  legend: { show: false },
  grid: { borderColor: '#f1f5f9', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  tooltip: { y: { formatter: oppFmt } },
}))

// distribuição por temperatura (donut)
const tempHex: Record<string, string> = {
  Quente: '#146c4e',
  Morno: '#D97706',
  Frio: '#64748B',
  'Sem classificação': '#CBD5E1',
}
const tempSeries = computed(() => TEMPS.map(tempCount))
const tempOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' },
  labels: [...TEMPS],
  colors: TEMPS.map((t) => tempHex[t]),
  legend: { position: 'bottom', fontSize: '12.5px', labels: { colors: '#475569' }, markers: { width: 9, height: 9 } },
  dataLabels: { enabled: false },
  stroke: { width: 2, colors: ['#fff'] },
  plotOptions: {
    pie: {
      donut: {
        size: '66%',
        labels: {
          show: true,
          value: { fontSize: '22px', fontWeight: 800, color: '#0f172a' },
          total: { show: true, label: 'Total', fontSize: '12px', color: '#94a3b8' },
        },
      },
    },
  },
  tooltip: { y: { formatter: oppFmt } },
}))
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader title="CRM" subtitle="Visão geral das oportunidades e follow-ups.">
      <template #actions>
        <NuxtLink
          to="/admin/pipelines"
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg no-underline hover:bg-slate-100"
        >
          <AdminIcon name="opportunities" :size="16" /> Ver oportunidades
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- alerta de atrasadas -->
    <NuxtLink
      v-if="followups.overdue > 0"
      to="/admin/follow-up"
      class="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 no-underline"
    >
      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 shrink-0">
        <AdminIcon name="followup" :size="16" />
      </span>
      <span class="text-[13.5px] text-red-800">
        <b>{{ followups.overdue }}</b> {{ followups.overdue === 1 ? 'atividade atrasada' : 'atividades atrasadas' }} esperando follow-up.
      </span>
      <span class="ml-auto text-[13px] font-semibold text-red-800">Resolver →</span>
    </NuxtLink>

    <!-- stat cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <component
        :is="s.to ? 'NuxtLink' : 'div'"
        v-for="s in stats"
        :key="s.label"
        :to="s.to"
        class="bg-white border rounded-xl p-4 no-underline transition-all"
        :class="[
          s.danger ? 'border-red-200' : s.accent ? 'border-[#C9E0D5]' : 'border-slate-200',
          s.to ? 'hover:border-slate-300 hover:shadow-[0_8px_20px_-14px_rgba(15,23,42,0.2)]' : '',
        ]"
      >
        <span
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg"
          :class="s.danger ? 'bg-red-50 text-red-600' : s.accent ? 'bg-brand-soft text-brand' : 'bg-slate-100 text-slate-500'"
        >
          <AdminIcon :name="s.icon" :size="18" />
        </span>
        <div
          class="text-[28px] font-extrabold tracking-[-0.02em] mt-3 leading-none"
          :class="s.danger ? 'text-red-600' : 'text-slate-900'"
        >
          {{ s.value }}
        </div>
        <div class="text-[12.5px] text-slate-500 mt-1">{{ s.label }}</div>
      </component>
    </div>

    <!-- gráficos -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
      <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-[14px] font-bold text-slate-900 m-0 mb-0.5">Oportunidades por status</h2>
            <p class="text-[12.5px] text-slate-400 m-0 mb-1">Quantidade em cada etapa do funil.</p>
          </div>
          <select
            v-if="pipelines.length > 1"
            v-model="funnelBoardId"
            class="h-[32px] pl-2.5 pr-7 text-[12.5px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-[7px] outline-none cursor-pointer focus:border-brand"
          >
            <option v-for="p in pipelines" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </div>
        <ClientOnly>
          <apexchart type="bar" height="270" :options="statusOptions" :series="statusSeries" />
          <template #fallback>
            <div class="h-[270px] flex items-center justify-center text-slate-300 text-[13px]">
              Carregando gráfico…
            </div>
          </template>
        </ClientOnly>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <h2 class="text-[14px] font-bold text-slate-900 m-0 mb-0.5">Por temperatura</h2>
        <p class="text-[12.5px] text-slate-400 m-0 mb-1">Distribuição do interesse.</p>
        <ClientOnly>
          <apexchart type="donut" height="270" :options="tempOptions" :series="tempSeries" />
          <template #fallback>
            <div class="h-[270px] flex items-center justify-center text-slate-300 text-[13px]">
              Carregando gráfico…
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>

    <div>
      <!-- oportunidades recentes -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 class="text-[14px] font-bold text-slate-900 m-0">Oportunidades recentes</h2>
          <NuxtLink to="/admin/pipelines" class="text-[13px] font-semibold text-brand no-underline">Ver todos →</NuxtLink>
        </div>
        <table class="w-full border-collapse">
          <tbody>
            <tr
              v-for="l in recent"
              :key="l.id"
              class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
              @click="navigateTo(`/admin/pipelines?oportunidade=${l.id}`)"
            >
              <td class="py-3 px-4">
                <div class="text-[14px] font-semibold text-slate-900">{{ l.contact.name }}</div>
                <div class="text-[12px] text-slate-400">{{ oppCity(l) || '—' }}{{ oppUf(l) ? '/' + oppUf(l) : '' }}</div>
              </td>
              <td class="py-3 px-3">
                <span class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold" :class="tempCls[l.temperature]">{{ l.temperature }}</span>
              </td>
              <td class="py-3 px-3">
                <span class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold" :style="stageBadgeStyle(l.status)">{{ l.status }}</span>
              </td>
              <td class="py-3 px-4 text-[12.5px] text-slate-400 whitespace-nowrap text-right">{{ l.date }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="py-10 text-center text-slate-400 text-[14px]">Carregando…</div>
        <div v-else-if="!recent.length" class="py-10 text-center text-slate-400 text-[14px]">Nenhuma oportunidade ainda.</div>
      </div>
    </div>
  </div>
</template>
