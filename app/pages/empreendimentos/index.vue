<script setup lang="ts">
import { empreendimentosPublicados, STATUS_STYLE } from '~/data/empreendimentos'
import { fmtBRL } from '~/utils/opportunityModel'

definePageMeta({ layout: 'default' })

const lista = empreendimentosPublicados()

useSeoMeta({
  title: 'Empreendimentos | Meu Revelar',
  description:
    'Lançamentos e empreendimentos com condições facilitadas na região de São Paulo. ' +
    'Simule o financiamento e fale com um corretor parceiro.',
})

const badge = (s: keyof typeof STATUS_STYLE) => {
  const st = STATUS_STYLE[s]
  return { color: st.color, backgroundColor: st.color + '1F' }
}
</script>

<template>
  <div class="w-full">
    <section class="max-w-[87.5rem] mx-auto px-6 pt-12 pb-6">
      <h1 class="text-[32px] font-extrabold tracking-[-0.025em] m-0 mb-2 text-slate-900">
        Empreendimentos
      </h1>
      <p class="text-[16px] text-slate-500 m-0 max-w-[640px]">
        Lançamentos com condições facilitadas na região de São Paulo. Simule o financiamento e
        fale com um corretor parceiro que cuida de tudo — do cálculo à chave na mão.
      </p>
    </section>

    <section class="max-w-[87.5rem] mx-auto px-6 pb-20">
      <div v-if="!lista.length" class="text-[15px] text-slate-400 py-16 text-center">
        Em breve, novos empreendimentos por aqui.
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="e in lista"
          :key="e.slug"
          :to="`/${e.slug}`"
          class="group block no-underline bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_30px_-14px_rgba(15,23,42,0.25)] hover:border-slate-300 transition-all"
        >
          <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">
            <img
              v-if="e.imagens.length"
              :src="e.imagens[0]"
              :alt="e.nome"
              class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-slate-300"
              style="background-image: linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%)"
            >
              <span class="text-[13px] font-semibold uppercase tracking-wider">{{ e.construtora }}</span>
            </div>
            <span
              class="absolute top-3 left-3 inline-flex items-center h-[24px] px-2.5 rounded-full text-[11.5px] font-bold"
              :style="badge(e.status)"
              >{{ STATUS_STYLE[e.status].label }}</span
            >
          </div>
          <div class="p-5">
            <h2 class="text-[18px] font-bold tracking-[-0.01em] m-0 mb-1 text-slate-900">{{ e.nome }}</h2>
            <p class="text-[13.5px] text-slate-500 m-0 mb-3">{{ e.bairro }} · {{ e.cidade }}/{{ e.uf }}</p>
            <div class="flex items-baseline gap-1.5">
              <span class="text-[12px] text-slate-400">a partir de</span>
              <span class="text-[17px] font-extrabold text-brand">{{ fmtBRL(e.precoAPartirDe) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
