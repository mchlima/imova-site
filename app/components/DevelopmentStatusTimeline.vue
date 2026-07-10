<script setup lang="ts">
import {
  type DevelopmentStatus,
  STATUS_ORDER,
  STATUS_STEP_LABEL,
} from '~/utils/developmentModel'

// Linha do tempo do status da obra (Futuro → Breve → Lançamento → Em construção
// → Pronto). VERTICAL no mobile (empilhada) e HORIZONTAL no desktop (sm+), com
// círculos numerados/checados, linha conectora e um card por etapa. `entregaLabel`
// aparece sob "Pronto".
const props = defineProps<{ status: DevelopmentStatus; entregaLabel?: string }>()

const steps = STATUS_ORDER
const last = steps.length - 1
const currentIndex = computed(() => {
  const i = steps.indexOf(props.status)
  return i < 0 ? 0 : i
})

// descrição curta por etapa (dá corpo ao card)
const DESC: Record<DevelopmentStatus, string> = {
  futuro_lancamento: 'Em estudo, ainda sem data de lançamento definida.',
  breve_lancamento: 'Pré-lançamento — as melhores condições, antes de todos.',
  lancamento: 'Unidades disponíveis com as condições mais vantajosas.',
  em_construcao: 'Obras em andamento rumo à entrega das chaves.',
  imovel_pronto: 'Pronto para morar.',
}

// classes de estado reaproveitadas pelos dois layouts (mobile/desktop)
const circleClass = (i: number) =>
  i < currentIndex.value
    ? 'bg-brand border-brand text-white'
    : i === currentIndex.value
      ? 'bg-brand border-brand text-white ring-4 ring-brand/20'
      : 'bg-white border-slate-200 text-slate-300'

const cardClass = (i: number) =>
  i === currentIndex.value
    ? 'border-brand/30 bg-brand-soft/50'
    : i < currentIndex.value
      ? 'border-slate-200 bg-white'
      : 'border-slate-200/70 bg-slate-50/60'
</script>

<template>
  <div>
    <!-- MOBILE: linha do tempo VERTICAL -->
    <ol class="sm:hidden flex flex-col m-0 p-0 list-none">
      <li v-for="(s, i) in steps" :key="s" class="flex gap-3.5">
        <!-- trilho: círculo + linha conectora vertical -->
        <div class="relative flex flex-col items-center w-9 shrink-0 self-stretch">
          <span
            class="relative z-[1] w-9 h-9 rounded-full inline-flex items-center justify-center text-[13px] font-bold border-2 transition-colors"
            :class="circleClass(i)"
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
          <span
            v-if="i < last"
            class="w-[3px] grow rounded-full mt-1 mb-[-1.5rem]"
            :class="i < currentIndex ? 'bg-brand' : 'bg-slate-200'"
          ></span>
        </div>

        <!-- card da etapa -->
        <div
          class="flex-1 rounded-xl border px-4 pt-2.5 pb-3.5 transition-colors"
          :class="[cardClass(i), i === last ? 'mb-0' : 'mb-5']"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="text-[15px] font-extrabold leading-tight"
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

    <!-- DESKTOP: stepper HORIZONTAL -->
    <ol class="hidden sm:flex items-stretch m-0 p-0 list-none">
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
            :class="circleClass(i)"
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
          :class="cardClass(i)"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="text-[15px] font-extrabold leading-tight"
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
