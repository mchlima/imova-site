<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase

interface StateRow {
  uf: string
  name: string
  region: string
  notaryRate: number
}
interface CityRow {
  id: number
  name: string
  itbiRate: number
  isCapital: boolean
}

const states = ref<StateRow[]>([])
const selectedUf = ref('')
const cities = ref<CityRow[]>([])
const loadingCities = ref(false)

const ufOptions = computed(() =>
  states.value.map((s) => ({ value: s.uf, label: `${s.name} (${s.uf})` })),
)
const selectedState = computed(() => states.value.find((s) => s.uf === selectedUf.value))

const pct = (rate: number) => Math.round(rate * 1000) / 10 // 0.027 -> 2.7
const parsePct = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n / 100 : null
}

async function loadStates() {
  states.value = await $fetch<StateRow[]>('/locations/states', { baseURL: apiBase })
}
async function loadCities(uf: string) {
  if (!uf) {
    cities.value = []
    return
  }
  loadingCities.value = true
  try {
    cities.value = await $fetch<CityRow[]>('/locations/cities', {
      baseURL: apiBase,
      params: { uf },
    })
  } finally {
    loadingCities.value = false
  }
}
onMounted(loadStates)
watch(selectedUf, (uf) => {
  citySearch.value = ''
  page.value = 1
  loadCities(uf)
})

// ── edição cartório (estado) ──
const savedNotary = ref(false)
async function saveNotary(value: string) {
  const rate = parsePct(value)
  if (rate == null || !selectedState.value) return
  const updated = await $fetch<StateRow>(`/locations/states/${selectedState.value.uf}`, {
    baseURL: apiBase,
    method: 'PATCH',
    credentials: 'include',
    body: { notaryRate: rate },
  })
  const i = states.value.findIndex((s) => s.uf === updated.uf)
  if (i >= 0) states.value[i] = updated
  savedNotary.value = true
  setTimeout(() => (savedNotary.value = false), 1500)
}

// ── edição ITBI (cidade) ──
const savedCityId = ref<number | null>(null)
async function saveCity(c: CityRow, value: string) {
  const rate = parsePct(value)
  if (rate == null) return
  const updated = await $fetch<CityRow>(`/locations/cities/${c.id}`, {
    baseURL: apiBase,
    method: 'PATCH',
    credentials: 'include',
    body: { itbiRate: rate },
  })
  const i = cities.value.findIndex((x) => x.id === updated.id)
  if (i >= 0) cities.value[i] = updated
  savedCityId.value = updated.id
  setTimeout(() => (savedCityId.value = null), 1500)
}

// ── busca + paginação da lista de cidades ──
const citySearch = ref('')
const page = ref(1)
const pageSize = 12
const filteredCities = computed(() => {
  const q = citySearch.value.trim().toLowerCase()
  return q ? cities.value.filter((c) => c.name.toLowerCase().includes(q)) : cities.value
})
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredCities.value.length / pageSize)),
)
const pagedCities = computed(() =>
  filteredCities.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
watch(filteredCities, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

const rateInput =
  'w-[88px] h-[34px] pl-2.5 pr-6 text-[13px] font-semibold text-slate-900 border border-slate-300 rounded-md outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/10'
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader
      title="Taxas"
      subtitle="Ajuste as alíquotas estimadas de ITBI (por cidade) e cartório (por estado)."
    />

    <div
      class="bg-[#FEF9F0] border border-[#F5E4C3] rounded-[10px] px-4 py-3 mb-5 text-[12.5px] leading-[1.5] text-[#92600C] max-w-3xl"
    >
      Os valores são <b>estimativas</b>. ITBI é definido por lei de cada prefeitura e o
      cartório segue tabela estadual progressiva — ajuste aqui conforme a fonte oficial
      que você validar.
    </div>

    <!-- seletor de estado -->
    <div class="max-w-sm mb-6">
      <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5"
        >Estado</label
      >
      <SearchableSelect
        v-model="selectedUf"
        :options="ufOptions"
        placeholder="Selecione um estado…"
        search-placeholder="Buscar estado…"
      />
    </div>

    <div v-if="!selectedState" class="text-[14px] text-slate-400">
      Escolha um estado para editar as taxas.
    </div>

    <template v-else>
      <!-- cartório (estado) -->
      <div
        class="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <div class="text-[15px] font-bold text-slate-900">
            Cartório — {{ selectedState.name }}
          </div>
          <div class="text-[12.5px] text-slate-500 mt-0.5">
            Alíquota efetiva estimada de escritura + registro (estadual).
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              :value="pct(selectedState.notaryRate)"
              class="w-[100px] h-[38px] pl-3 pr-7 text-[14px] font-semibold text-slate-900 border border-slate-300 rounded-lg outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/10"
              @change="saveNotary(($event.target as HTMLInputElement).value)"
            />
            <span
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400"
              >%</span
            >
          </div>
          <span
            v-if="savedNotary"
            class="text-[12.5px] font-semibold text-brand inline-flex items-center gap-1"
            >✓ salvo</span
          >
        </div>
      </div>

      <!-- cidades (ITBI) -->
      <div
        class="bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden"
      >
        <div
          class="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-b border-slate-200"
        >
          <h2 class="text-[15px] font-bold text-slate-900 m-0">
            ITBI por cidade
            <span class="text-slate-400 font-medium">({{ filteredCities.length }})</span>
          </h2>
          <div class="relative w-[220px] max-w-full">
            <span
              class="absolute left-[11px] top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"
              >⌕</span
            >
            <input
              v-model="citySearch"
              placeholder="Buscar cidade…"
              class="w-full h-[36px] pl-8 pr-3 text-[13px] text-slate-900 border border-slate-300 rounded-[7px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/10"
            />
          </div>
        </div>

        <div v-if="loadingCities" class="px-5 py-10 text-center text-slate-400 text-[14px]">
          Carregando cidades…
        </div>
        <table v-else class="w-full border-collapse">
          <tbody>
            <tr
              v-for="c in pagedCities"
              :key="c.id"
              class="border-b border-slate-100 last:border-0"
            >
              <td class="px-5 py-2.5 text-[14px] text-slate-900">
                {{ c.name }}
                <span
                  v-if="c.isCapital"
                  class="ml-2 inline-flex items-center h-[18px] px-2 rounded-full bg-brand-soft text-brand text-[10.5px] font-semibold"
                  >capital</span
                >
              </td>
              <td class="px-5 py-2.5 text-right whitespace-nowrap">
                <span
                  v-if="savedCityId === c.id"
                  class="text-[12px] font-semibold text-brand mr-2"
                  >✓ salvo</span
                >
                <span class="relative inline-block">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    :value="pct(c.itbiRate)"
                    :class="rateInput"
                    @change="saveCity(c, ($event.target as HTMLInputElement).value)"
                  />
                  <span
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400"
                    >%</span
                  >
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- paginação -->
        <div
          v-if="!loadingCities && totalPages > 1"
          class="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200"
        >
          <span class="text-[12.5px] text-slate-500">Página {{ page }} de {{ totalPages }}</span>
          <div class="flex items-center gap-1">
            <button
              class="h-8 px-3 text-[13px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 cursor-pointer transition-all enabled:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page <= 1"
              @click="page--"
            >
              Anterior
            </button>
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
    </template>
  </div>
</template>
