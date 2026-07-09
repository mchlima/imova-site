<script setup lang="ts">
const props = defineProps<{ postId: string }>()
const { api } = useAdminApi()

interface Analytics {
  views: number
  estimatedReadingMinutes: number
  medianActiveSeconds: number
  avgActiveSeconds: number
  readRate: number
  bounceRate: number
  avgScrollDepth: number
  heatmap: number[]
}
const data = ref<Analytics | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    data.value = await api<Analytics>(`/admin/posts/${props.postId}/analytics`)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const fmt = (s: number) => {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}m ${r}s` : `${m}m`
}
const maxHeat = computed(() => Math.max(1, ...(data.value?.heatmap ?? [0])))
const cardTitle = 'text-[13px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-4'
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 :class="cardTitle" class="mb-0">Audiência</h3>
      <button
        class="text-[12px] font-semibold text-slate-400 hover:text-brand bg-transparent border-none cursor-pointer"
        @click="load"
      >
        atualizar
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-3 py-2">
      <div class="flex gap-3">
        <AppSkeleton class="h-16 flex-1 rounded-lg" />
        <AppSkeleton class="h-16 flex-1 rounded-lg" />
        <AppSkeleton class="h-16 flex-1 rounded-lg" />
      </div>
      <AppSkeleton class="h-3.5 w-40" />
    </div>

    <div v-else-if="data && data.views === 0" class="text-[13px] text-slate-400 py-4 text-center">
      Ainda sem visualizações. As métricas aparecem quando o guia começar a ser lido.
    </div>

    <div v-else-if="data" class="flex flex-col gap-5">
      <!-- métricas -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[20px] font-extrabold text-slate-900 leading-none">{{ data.views }}</div>
          <div class="text-[11.5px] text-slate-500 mt-1">Visualizações</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[20px] font-extrabold text-slate-900 leading-none">
            {{ fmt(data.medianActiveSeconds) }}
          </div>
          <div class="text-[11.5px] text-slate-500 mt-1">
            Tempo mediano
            <InfoTip>
              Tempo <b>ativo</b> de leitura (mediana, robusta a outliers). Estimado: ~{{
                data.estimatedReadingMinutes
              }}
              min.
            </InfoTip>
          </div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[20px] font-extrabold text-brand leading-none">{{ data.readRate }}%</div>
          <div class="text-[11.5px] text-slate-500 mt-1">
            Leitura efetiva
            <InfoTip>% de visitas que leram de verdade (tempo ativo ≥ 40% do tempo estimado).</InfoTip>
          </div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[20px] font-extrabold text-slate-900 leading-none">{{ data.bounceRate }}%</div>
          <div class="text-[11.5px] text-slate-500 mt-1">
            Rejeição
            <InfoTip>% que saiu em menos de 10s de leitura ativa.</InfoTip>
          </div>
        </div>
      </div>

      <!-- mapa de calor de atenção -->
      <div>
        <div class="flex items-center gap-1.5 mb-2">
          <span class="text-[12.5px] font-semibold text-slate-700">Mapa de calor de atenção</span>
          <InfoTip :width="260">
            Tempo médio de atenção por trecho do artigo (topo → fim). Verde forte = prendeu
            o leitor; claro = passou batido. A queda mostra onde a leitura é abandonada.
          </InfoTip>
        </div>
        <div class="flex items-stretch gap-3">
          <div class="flex flex-col justify-between text-[10px] text-slate-400 py-0.5">
            <span>Topo</span>
            <span>Meio</span>
            <span>Fim</span>
          </div>
          <div class="flex-1 flex flex-col gap-[2px]">
            <div
              v-for="(v, i) in data.heatmap"
              :key="i"
              class="h-3 rounded-[3px] relative group"
              :style="{
                backgroundColor: `rgba(20,108,78,${0.08 + 0.92 * (v / maxHeat)})`,
              }"
            >
              <span
                class="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-white/0 group-hover:text-white/90 transition-colors"
                >{{ fmt(Math.round(v)) }}</span
              >
            </div>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 mt-2">
          Profundidade média de scroll: <b class="text-slate-600">{{ data.avgScrollDepth }}%</b>
        </div>
      </div>
    </div>
  </div>
</template>
