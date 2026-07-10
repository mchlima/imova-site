<script setup lang="ts">
import type { MoneyRange } from '~/components/MoneyRangeInputs.vue'
import {
  type Development,
  type DevelopmentsMeta,
  type BairroOption,
  type AmenityDef,
  statusLabel,
  statusBadgeStyle,
  regiaoLabel,
  heroImage,
  dormsLabel,
} from '~/utils/developmentModel'
import { fmtBRL } from '~/utils/opportunityModel'

definePageMeta({ layout: 'default' })

const apiBase = useRuntimeConfig().public.apiBase

// ── dados (SSR) ──
const { data: devs } = await useFetch<Development[]>('/developments', {
  baseURL: apiBase,
  default: () => [],
})
const { data: meta } = await useFetch<DevelopmentsMeta>('/developments/meta', {
  baseURL: apiBase,
  default: () => ({ amenities: [], regioes: [], statuses: [] }),
})
const { data: bairros } = await useFetch<BairroOption[]>('/developments/bairros', {
  baseURL: apiBase,
  default: () => [],
})

useSeoMeta({
  title: 'Imóveis e empreendimentos | Meu Revelar',
  description:
    'Encontre lançamentos e empreendimentos na região de São Paulo por região, bairro, ' +
    'estágio da obra, preço, dormitórios e mais. Simule o financiamento e fale com um corretor.',
})

// ── estado dos filtros (lido da URL p/ links compartilháveis) ──
const route = useRoute()
const router = useRouter()
const qs = (v: unknown) => (typeof v === 'string' ? v : '')

const regiao = ref(qs(route.query.regiao))
const bairro = ref(qs(route.query.bairro))
const status = ref(qs(route.query.status))
const price = ref<MoneyRange>({
  min: route.query.pmin ? Number(route.query.pmin) : null,
  max: route.query.pmax ? Number(route.query.pmax) : null,
})
const dorms = ref(route.query.dorms ? Number(route.query.dorms) : 0)
const vagas = ref(route.query.vagas === '1')
const amenities = ref<string[]>(qs(route.query.amenities) ? qs(route.query.amenities).split(',') : [])
const sort = ref(qs(route.query.sort) || 'novidades')

// opções dos selects
const regiaoOptions = computed(() =>
  meta.value.regioes.map((r) => ({ value: r, label: regiaoLabel(r) })),
)
const statusOptions = computed(() =>
  meta.value.statuses.map((s) => ({ value: s, label: statusLabel(s) })),
)
const bairroOptions = computed(() =>
  bairros.value
    .filter((b) => !regiao.value || b.regiao === regiao.value)
    .map((b) => ({ value: b.bairroSlug, label: b.bairro })),
)
const sortOptions = [
  { value: 'novidades', label: 'Novidades' },
  { value: 'menor_preco', label: 'Menor preço' },
  { value: 'maior_preco', label: 'Maior preço' },
]

// bairro fora da região selecionada → limpa
watch(regiao, () => {
  if (bairro.value && !bairroOptions.value.some((o) => o.value === bairro.value)) bairro.value = ''
})

// ── características (dropdown agrupado) ──
const CAT_LABELS: Record<string, string> = {
  lazer: 'Lazer',
  esporte: 'Esporte',
  pet: 'Pet',
  conveniencia: 'Conveniência',
  bem_estar: 'Bem-estar',
  estrutura: 'Estrutura',
}
const amenityGroups = computed(() => {
  const g: Record<string, AmenityDef[]> = {}
  for (const a of meta.value.amenities) (g[a.category] ||= []).push(a)
  return Object.entries(g)
})
const amenitiesOpen = ref(false)
function toggleAmenity(slug: string) {
  const i = amenities.value.indexOf(slug)
  if (i >= 0) amenities.value.splice(i, 1)
  else amenities.value.push(slug)
}

const dormOptions = [
  { value: 0, label: 'Tanto faz' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
]

// ── resultado (filtro + ordenação, client-side) ──
const filtered = computed(() => {
  let list = devs.value.filter((d) => {
    if (regiao.value && d.regiao !== regiao.value) return false
    if (bairro.value && d.bairroSlug !== bairro.value) return false
    if (status.value && d.status !== status.value) return false
    if (dorms.value && d.bedroomsMax < dorms.value) return false
    if (vagas.value && d.parkingMax < 1) return false
    if (price.value.min != null && d.priceFrom > 0 && d.priceFrom < price.value.min) return false
    if (price.value.max != null && d.priceFrom > 0 && d.priceFrom > price.value.max) return false
    if (amenities.value.length && !amenities.value.every((a) => d.amenities.includes(a))) return false
    return true
  })
  if (sort.value === 'menor_preco') list = [...list].sort((a, b) => a.priceFrom - b.priceFrom)
  else if (sort.value === 'maior_preco') list = [...list].sort((a, b) => b.priceFrom - a.priceFrom)
  else list = [...list].sort((a, b) => (b.firstPublishedAt || '').localeCompare(a.firstPublishedAt || ''))
  return list
})

const activeFilters = computed(
  () =>
    (regiao.value ? 1 : 0) +
    (bairro.value ? 1 : 0) +
    (status.value ? 1 : 0) +
    (price.value.min != null || price.value.max != null ? 1 : 0) +
    (dorms.value ? 1 : 0) +
    (vagas.value ? 1 : 0) +
    amenities.value.length,
)
function clearFilters() {
  regiao.value = ''
  bairro.value = ''
  status.value = ''
  price.value = { min: null, max: null }
  dorms.value = 0
  vagas.value = false
  amenities.value = []
}

// sincroniza os filtros na URL (client)
watch(
  [regiao, bairro, status, price, dorms, vagas, amenities, sort],
  () => {
    const query: Record<string, string> = {}
    if (regiao.value) query.regiao = regiao.value
    if (bairro.value) query.bairro = bairro.value
    if (status.value) query.status = status.value
    if (price.value.min != null) query.pmin = String(price.value.min)
    if (price.value.max != null) query.pmax = String(price.value.max)
    if (dorms.value) query.dorms = String(dorms.value)
    if (vagas.value) query.vagas = '1'
    if (amenities.value.length) query.amenities = amenities.value.join(',')
    if (sort.value && sort.value !== 'novidades') query.sort = sort.value
    router.replace({ query })
  },
  { deep: true },
)
</script>

<template>
  <div class="w-full">
    <section class="max-w-[87.5rem] mx-auto px-6 pt-12 pb-5">
      <h1 class="text-[32px] font-extrabold tracking-[-0.025em] m-0 mb-2 text-slate-900">Imóveis</h1>
      <p class="text-[16px] text-slate-500 m-0 max-w-[640px]">
        Lançamentos e empreendimentos com condições facilitadas na região de São Paulo. Filtre e
        fale com um corretor parceiro que cuida de tudo — do cálculo à chave na mão.
      </p>
    </section>

    <!-- BARRA DE FILTROS -->
    <section class="max-w-[87.5rem] mx-auto px-6">
      <div
        class="bg-white border border-slate-200 rounded-[12px] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-wrap items-center gap-2.5"
      >
        <div class="w-[170px]">
          <SearchableSelect v-model="regiao" :options="regiaoOptions" placeholder="Todas as regiões" search-placeholder="Buscar região…" />
        </div>
        <div class="w-[190px]">
          <SearchableSelect v-model="bairro" :options="bairroOptions" placeholder="Todos os bairros" search-placeholder="Buscar bairro…" />
        </div>
        <div class="w-[180px]">
          <SearchableSelect v-model="status" :options="statusOptions" placeholder="Todas as fases" search-placeholder="Buscar fase…" />
        </div>

        <MoneyRangeFilter v-model="price" placeholder="Preço" />

        <!-- dormitórios (segmentado) -->
        <div class="inline-flex items-center bg-slate-100 rounded-[9px] p-0.5">
          <button
            v-for="o in dormOptions"
            :key="o.value"
            type="button"
            class="h-[34px] px-3 rounded-[7px] text-[12.5px] font-semibold cursor-pointer border-none transition-all"
            :class="dorms === o.value ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="dorms = o.value"
          >
            {{ o.value === 0 ? 'Dorm.' : o.label }}
          </button>
        </div>

        <!-- vagas -->
        <button
          type="button"
          class="h-[38px] px-3.5 inline-flex items-center gap-1.5 rounded-[7px] text-[13px] font-semibold cursor-pointer border transition-all"
          :class="vagas ? 'border-brand/40 text-brand bg-brand-soft' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'"
          @click="vagas = !vagas"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" /><circle cx="7.5" cy="16" r="1" /><circle cx="16.5" cy="16" r="1" />
          </svg>
          Com vaga
        </button>

        <!-- características (dropdown) -->
        <div class="relative">
          <button
            type="button"
            class="h-[38px] px-3.5 inline-flex items-center gap-2 rounded-[7px] text-[13px] font-semibold cursor-pointer border transition-all"
            :class="amenities.length ? 'border-brand/40 text-brand bg-brand-soft' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'"
            @click="amenitiesOpen = !amenitiesOpen"
          >
            Características
            <span v-if="amenities.length" class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-bold">{{ amenities.length }}</span>
            <svg v-else class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div v-if="amenitiesOpen" class="fixed inset-0 z-40" @click="amenitiesOpen = false"></div>
          <div
            v-if="amenitiesOpen"
            class="absolute left-0 mt-2 z-[41] w-[min(92vw,460px)] max-h-[60vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] p-4"
          >
            <div v-for="[cat, items] in amenityGroups" :key="cat" class="mb-3.5 last:mb-0">
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2">{{ CAT_LABELS[cat] || cat }}</div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="a in items"
                  :key="a.slug"
                  type="button"
                  class="h-[30px] px-3 rounded-full text-[12.5px] font-semibold cursor-pointer border transition-all"
                  :class="amenities.includes(a.slug) ? 'border-transparent bg-brand text-white' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'"
                  @click="toggleAmenity(a.slug)"
                >
                  {{ a.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          v-if="activeFilters > 0"
          type="button"
          class="text-[13px] font-semibold text-slate-500 hover:text-brand bg-transparent border-none cursor-pointer px-1"
          @click="clearFilters"
        >
          Limpar
        </button>

        <!-- ordenação à direita -->
        <div class="ml-auto w-[160px]">
          <SearchableSelect v-model="sort" :options="sortOptions" placeholder="Ordenar" />
        </div>
      </div>
    </section>

    <!-- RESULTADOS -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-5 pb-20">
      <div class="text-[13px] text-slate-400 mb-4">
        {{ filtered.length }} {{ filtered.length === 1 ? 'empreendimento' : 'empreendimentos' }}
      </div>

      <div v-if="!filtered.length" class="text-[15px] text-slate-400 py-16 text-center">
        Nenhum empreendimento com esses filtros. Ajuste a busca.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="d in filtered"
          :key="d.id"
          :to="`/${d.slug}`"
          class="group block no-underline bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_30px_-14px_rgba(15,23,42,0.25)] hover:border-slate-300 transition-all"
        >
          <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">
            <img
              v-if="heroImage(d)"
              :src="heroImage(d)"
              :alt="d.name"
              class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-slate-300"
              style="background-image: linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%)"
            >
              <span class="text-[13px] font-semibold uppercase tracking-wider">{{ d.construtora }}</span>
            </div>
            <span
              class="absolute top-3 left-3 inline-flex items-center h-[24px] px-2.5 rounded-full text-[11.5px] font-bold"
              :style="statusBadgeStyle(d.status)"
              >{{ statusLabel(d.status) }}</span
            >
          </div>
          <div class="p-5">
            <h2 class="text-[18px] font-bold tracking-[-0.01em] m-0 mb-1 text-slate-900">{{ d.name }}</h2>
            <p class="text-[13.5px] text-slate-500 m-0 mb-3">{{ d.bairro }} · {{ d.cidade }}/{{ d.uf }}</p>
            <div class="flex items-center gap-2 mb-3 text-[12px] font-semibold text-slate-500">
              <span v-if="dormsLabel(d)" class="inline-flex items-center h-[22px] px-2 rounded-md bg-slate-100">{{ dormsLabel(d) }}</span>
              <span v-if="d.parkingMax" class="inline-flex items-center h-[22px] px-2 rounded-md bg-slate-100">{{ d.parkingMax }} vaga{{ d.parkingMax > 1 ? 's' : '' }}</span>
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-[12px] text-slate-400">a partir de</span>
              <span class="text-[17px] font-extrabold text-brand">{{ d.priceFrom ? fmtBRL(d.priceFrom) : 'Sob consulta' }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
