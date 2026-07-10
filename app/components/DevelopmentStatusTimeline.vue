<script setup lang="ts">
import {
  type DevelopmentStatus,
  STATUS_ORDER,
  STATUS_STEP_LABEL,
} from '~/utils/developmentModel'

// Stepper HORIZONTAL do status da obra (Futuro → Breve → Lançamento →
// Em construção → Pronto). Círculos com linha conectora no topo e, abaixo,
// um card por etapa com rótulo + descrição. `entregaLabel` sob "Pronto".
const props = defineProps<{ status: DevelopmentStatus; entregaLabel?: string }>()

const steps = STATUS_ORDER
const last = steps.length - 1
const currentIndex = computed(() => {
  const i = steps.indexOf(props.status)
  return i < 0 ? 0 : i
})

// descrição curta por etapa (dá corpo ao card e ocupa a altura)
const DESC: Record<DevelopmentStatus, string> = {
  futuro_lancamento: 'Em estudo, ainda sem data de lançamento definida.',
  breve_lancamento: 'Pré-lançamento — as melhores condições, antes de todos.',
  lancamento: 'Unidades disponíveis com as condições mais vantajosas.',
  em_construcao: 'Obras em andamento rumo à entrega das chaves.',
  imovel_pronto: 'Pronto para morar.',
}
</script>

<template>
  <div class="overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0" style="scrollbar-width: none">
    <ol class="flex items-stretch min-w-[660px] sm:min-w-0 m-0 p-0 list-none">
      <li v-for="(s, i) in steps" :key="s" class="flex-1 flex flex-col">
        <!-- trilho: linha conectora + círculo -->
        <div class="relative flex items-center justify-center h-9 mb-4">
          <span
            v-if="i > 0"
            class="absolute left-0 right-1/2 top-1/2 -translate-y-1/2 h-[3px] rounded-full"
            :class="i <= currentIndex ? 'bg-brand' : 'bg-slate-200'"
          ></span>
          <span
            v-if="i < last"
            class="absolute left-1/2 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full"
            :class="i < currentIndex ? 'bg-brand' : 'bg-slate-200'"
          ></span>
          <span
            class="relative z-[1] w-9 h-9 rounded-full inline-flex items-center justify-center text-[13px] font-bold border-2 transition-colors"
            :class="
              i < currentIndex
                ? 'bg-brand border-brand text-white'
                : i === currentIndex
                  ? 'bg-brand border-brand text-white ring-4 ring-brand/20'
                  : 'bg-white border-slate-200 text-slate-300'
            "
          >
            <svg
              v-if="i < currentIndex"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
        </div>

        <!-- card da etapa -->
        <div
          class="mx-1.5 flex-1 rounded-xl border px-4 pt-3 pb-3.5 transition-colors"
          :class="
            i === currentIndex
              ? 'border-brand/30 bg-brand-soft/50'
              : i < currentIndex
                ? 'border-slate-200 bg-white'
                : 'border-slate-200/70 bg-slate-50/60'
          "
        >
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="text-[14.5px] sm:text-[15px] font-extrabold leading-tight"
              :class="i <= currentIndex ? 'text-slate-900' : 'text-slate-400'"
            >
              {{ STATUS_STEP_LABEL[s] }}
            </span>
            <span
              v-if="i === currentIndex"
              class="inline-flex items-center h-[20px] px-1.5 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-[0.05em]"
            >
              Atual
            </span>
          </div>
          <p
            class="text-[12.5px] leading-[1.55] mt-1.5 m-0"
            :class="i <= currentIndex ? 'text-slate-500' : 'text-slate-400'"
          >
            {{ DESC[s] }}
          </p>
          <p
            v-if="s === 'imovel_pronto' && entregaLabel"
            class="text-[12px] font-semibold text-brand mt-1.5 m-0"
          >
            Entrega: {{ entregaLabel }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
