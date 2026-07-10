<script setup lang="ts">
// Selo dinâmico da Prefeitura de São Paulo (HIS/HMP), montado a partir dos tetos
// do empreendimento — exibe apenas os tipos de unidade que se aplicam
// (ex.: um empreendimento só-HIS não mostra a linha de HMP).
defineProps<{
  tetoHis1?: number | null
  tetoHis2?: number | null
  tetoHmp?: number | null
}>()

const brl = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')
</script>

<template>
  <div class="rounded-xl bg-white/95 backdrop-blur-md border border-white/60 shadow-[0_14px_34px_-14px_rgba(15,23,42,0.55)] p-3.5">
    <div class="flex items-center gap-2.5">
      <img
        src="/img/brasao-sp.webp"
        alt="Brasão da Prefeitura de São Paulo"
        class="w-9 h-9 object-contain shrink-0"
      />
      <div class="leading-tight min-w-0">
        <div class="text-[8.5px] font-bold uppercase tracking-[0.08em] text-slate-400">Prefeitura de São Paulo</div>
        <div class="text-[11px] font-extrabold text-slate-800 leading-tight">Habitação de Interesse Social</div>
      </div>
    </div>
    <div class="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
      <div v-if="tetoHis1" class="flex items-baseline justify-between gap-2">
        <span class="text-[10.5px] font-bold text-slate-600">HIS-1</span>
        <span class="text-[10.5px] text-slate-500">até <span class="font-bold text-slate-800">{{ brl(tetoHis1) }}</span></span>
      </div>
      <div v-if="tetoHis2" class="flex items-baseline justify-between gap-2">
        <span class="text-[10.5px] font-bold text-slate-600">HIS-2</span>
        <span class="text-[10.5px] text-slate-500">até <span class="font-bold text-slate-800">{{ brl(tetoHis2) }}</span></span>
      </div>
      <div v-if="tetoHmp" class="flex items-baseline justify-between gap-2">
        <span class="text-[10.5px] font-bold text-slate-600">HMP</span>
        <span class="text-[10.5px] text-slate-500">até <span class="font-bold text-slate-800">{{ brl(tetoHmp) }}</span></span>
      </div>
    </div>
  </div>
</template>
