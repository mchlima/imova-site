<script setup lang="ts">
import { empreendimentosPublicados, STATUS_STYLE } from '~/data/empreendimentos'
import { fmtBRL as fmtMoney } from '~/utils/opportunityModel'

// Vitrine de empreendimentos (novo modelo): a home leva às LPs. O primeiro é o
// destaque; demais entram em grade. As LPs "donas" dos nomes/termos (sem canibalizar SEO).
const empreendimentos = empreendimentosPublicados()
const destaque = empreendimentos[0]
const outros = empreendimentos.slice(1)

// Home mini-simulator: quick estimate persisted in localStorage('imova_sim')
// and read by the full simulator (store.hydrateFromStorage).
const income = ref(5000)
const downPayment = ref(40000)

onMounted(() => {
  try {
    const s = JSON.parse(localStorage.getItem('imova_sim') || '{}')
    if (s.income || s.downPayment) {
      income.value = s.income || 5000
      downPayment.value = s.downPayment || 40000
    }
  } catch {
    /* ignore */
  }
})

const parseNum = (v: string) => {
  const d = (v || '').replace(/\D/g, '')
  return d ? parseInt(d, 10) : 0
}
const fmtBRL = (n: number) => (n || n === 0 ? n.toLocaleString('pt-BR') : '')

const incomeFmt = computed(() => fmtBRL(income.value))
const downPaymentFmt = computed(() => fmtBRL(downPayment.value))

// Price estimate: installment <= 30% income, ~10.5% p.a., 420 months (35 years)
const maxPropertyFmt = computed(() => {
  const i = Math.pow(1.105, 1 / 12) - 1
  const n = 420
  const factor = (1 - Math.pow(1 + i, -n)) / i
  const maxFin = income.value * 0.3 * factor
  return 'R$ ' + Math.round(maxFin + downPayment.value).toLocaleString('pt-BR')
})

async function goToSimulator() {
  try {
    localStorage.setItem(
      'imova_sim',
      JSON.stringify({ income: income.value, downPayment: downPayment.value }),
    )
  } catch {
    /* ignore */
  }
  await navigateTo('/simulador-avancado')
}

// Latest published guides from the CMS (falls back to empty list on error).
const cms = useCms()
const { data: latestPosts } = await useAsyncData('home-guides', () =>
  cms.posts().catch(() => []),
)
const guides = computed(() =>
  (latestPosts.value ?? []).slice(0, 3).map((p) => {
    const path = p.category?.path ?? []
    return {
      slug: p.slug,
      cat: path.length ? path[path.length - 1]!.name : 'Guia',
      titulo: p.title,
      resumo: p.deck,
      cover: p.coverImageUrl || '',
    }
  }),
)

const miniInput =
  'w-full h-[46px] pl-10 pr-3.5 text-[16px] font-semibold text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15'
</script>

<template>
  <div class="w-full bg-white">
    <!-- HERO -->
    <section
      class="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50"
    >
      <div
        class="absolute inset-0 pointer-events-none"
        style="
          background-image: linear-gradient(#0f172a0a 1px, transparent 1px),
            linear-gradient(90deg, #0f172a0a 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%);
          -webkit-mask-image: radial-gradient(
            ellipse 80% 60% at 50% 0%,
            #000 40%,
            transparent 100%
          );
        "
      ></div>
      <div
        class="relative max-w-[87.5rem] mx-auto px-6 pt-[72px] pb-20 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center"
      >
        <div>
          <div
            class="inline-flex items-center gap-2 h-[30px] px-3 bg-white border border-slate-200 rounded-full text-[12.5px] font-semibold text-brand mb-6"
          >
            <span class="block w-[7px] h-[7px] rounded-full bg-brand"></span>
            Plataforma nacional e independente
          </div>
          <h1
            class="text-[45px] leading-[1.1] font-extrabold tracking-[-0.03em] m-0 mb-[22px] text-slate-900"
          >
            Entenda cada número do seu financiamento e deixe um corretor parceiro
            <span class="text-brand">encontrar e negociar</span> o seu imóvel.
          </h1>
          <p class="text-[18px] leading-[1.6] text-slate-600 m-0 mb-2 max-w-[39.5rem]">
            Você tem clareza total sobre juros reais, tabelas SAC e Price e os impostos
            da sua cidade — sem letras miúdas — pra decidir com segurança. E, a partir do
            seu perfil, um corretor parceiro assume todo o trabalho de corretagem: busca
            os imóveis certos, agenda as visitas e conduz a negociação por você.
          </p>
          <p
            class="text-[15px] leading-[1.5] text-brand font-semibold m-0 max-w-[39.5rem]"
          >
            A gente cuida do seu conhecimento. O corretor cuida do resto — da clareza à
            chave na mão.
          </p>
          <div class="flex flex-wrap items-center gap-x-[18px] gap-y-2 mt-[26px]">
            <span
              class="inline-flex items-center gap-[7px] text-[14px] font-medium text-slate-700"
              ><span class="text-brand font-bold">✓</span> 100% gratuito</span
            >
            <span class="block w-1 h-1 rounded-full bg-slate-300"></span>
            <span
              class="inline-flex items-center gap-[7px] text-[14px] font-medium text-slate-700"
              ><span class="text-brand font-bold">✓</span> Não somos banco</span
            >
            <span class="block w-1 h-1 rounded-full bg-slate-300"></span>
            <span
              class="inline-flex items-center gap-[7px] text-[14px] font-medium text-slate-700"
              ><span class="text-brand font-bold">✓</span> Jogamos do seu lado</span
            >
          </div>

          <!-- DOIS CAMINHOS -->
          <div class="mt-8">
            <span class="block text-[13px] font-semibold text-slate-500 mb-3">Comece por onde quiser:</span>
            <div class="flex flex-wrap items-center gap-3">
              <NuxtLink
                to="/simulador-avancado"
                class="inline-flex items-center gap-2 h-[52px] px-6 bg-brand text-white text-[15px] font-semibold no-underline rounded-lg hover:bg-brand-dark transition-all shadow-[0_10px_24px_-12px_rgba(20,108,78,0.7)]"
              >
                Simular meu cenário
              </NuxtLink>
              <a
                href="#empreendimentos"
                class="inline-flex items-center gap-2 h-[52px] px-6 bg-white text-slate-700 text-[15px] font-semibold no-underline rounded-lg border border-slate-300 hover:border-brand hover:text-brand transition-all"
              >
                🏢 Ver empreendimentos
              </a>
            </div>
          </div>
        </div>

        <!-- MINI SIMULATOR -->
        <div
          class="bg-white border border-slate-200 rounded-xl shadow-[0_10px_30px_-12px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.05)] p-7"
        >
          <div class="flex items-center gap-2 mb-1">
            <span
              class="text-[13px] font-bold uppercase tracking-[0.05em] text-brand"
              >Estimativa rápida</span
            >
          </div>
          <h2
            class="text-[20px] font-bold tracking-[-0.02em] m-0 mb-1 text-slate-900"
          >
            Quanto eu consigo financiar?
          </h2>
          <p class="text-[13.5px] leading-[1.5] text-slate-500 m-0 mb-[22px]">
            Dois campos e você já vê uma faixa. O cálculo completo vem na próxima tela.
          </p>

          <label class="block text-[13px] font-semibold text-slate-700 mb-[7px]"
            >Renda familiar mensal</label
          >
          <div class="relative mb-[18px]">
            <span
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 font-medium"
              >R$</span
            >
            <input
              :value="incomeFmt"
              @input="income = parseNum(($event.target as HTMLInputElement).value)"
              inputmode="numeric"
              placeholder="5.000"
              :class="miniInput"
            />
          </div>

          <label class="block text-[13px] font-semibold text-slate-700 mb-[7px]"
            >Valor de entrada disponível</label
          >
          <div class="relative mb-[22px]">
            <span
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 font-medium"
              >R$</span
            >
            <input
              :value="downPaymentFmt"
              @input="downPayment = parseNum(($event.target as HTMLInputElement).value)"
              inputmode="numeric"
              placeholder="40.000"
              :class="miniInput"
            />
          </div>

          <div
            class="bg-[#F0F5F2] border border-[#DCE9E3] rounded-lg px-[18px] py-4 mb-5"
          >
            <div class="text-[12.5px] font-semibold text-slate-600 mb-[3px]">
              Você pode buscar imóveis até cerca de
            </div>
            <div
              class="text-[28px] font-extrabold tracking-[-0.02em] text-brand leading-[1.1]"
            >
              {{ maxPropertyFmt }}
            </div>
            <div class="text-[12px] text-slate-500 mt-[5px]">
              Estimativa com Price em 35 anos. A conta exata, com impostos e FGTS, vem a
              seguir.
            </div>
          </div>

          <button
            @click="goToSimulator"
            class="flex items-center justify-center w-full h-[50px] bg-brand text-white text-[15px] font-semibold rounded-lg border-none cursor-pointer transition-all shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-brand-dark font-[inherit]"
          >
            Avançar para análise completa →
          </button>
          <p class="text-[11.5px] text-slate-400 text-center mt-3 mb-0">
            Sem cadastro para simular. Seus dados ficam só com você.
          </p>
        </div>
      </div>
    </section>

    <!-- VITRINE DE EMPREENDIMENTOS -->
    <section id="empreendimentos" class="scroll-mt-24 max-w-[87.5rem] mx-auto px-6 pt-[72px] pb-6">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div class="text-[13px] font-bold uppercase tracking-[0.06em] text-brand mb-3">Empreendimentos</div>
          <h2 class="text-[30px] leading-[1.15] font-extrabold tracking-[-0.025em] m-0 text-slate-900">
            Empreendimentos com condições de sair do aluguel
          </h2>
          <p class="text-[16px] text-slate-500 m-0 mt-2 max-w-[42rem]">
            Unidades selecionadas com subsídio, uso do FGTS e lazer completo. Simule a parcela e fale com um corretor parceiro.
          </p>
        </div>
        <NuxtLink to="/empreendimentos" class="inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand no-underline whitespace-nowrap">Ver todos →</NuxtLink>
      </div>

      <!-- destaque -->
      <NuxtLink
        v-if="destaque"
        :to="`/${destaque.slug}`"
        class="group grid grid-cols-1 md:grid-cols-2 bg-white border border-slate-200 rounded-2xl overflow-hidden no-underline transition-all hover:border-slate-300 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]"
      >
        <div class="relative min-h-[240px] md:min-h-[340px] overflow-hidden bg-slate-100">
          <img v-if="destaque.imagens.length" :src="destaque.imagens[0]" :alt="destaque.nome" loading="lazy" class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[600ms]" />
          <span
            class="absolute left-4 top-4 inline-flex items-center h-[28px] px-3.5 rounded-full text-[12px] font-bold"
            :style="{ backgroundColor: STATUS_STYLE[destaque.status].color, color: '#fff' }"
          >{{ STATUS_STYLE[destaque.status].label }}</span>
        </div>

        <div class="p-8 lg:p-10 flex flex-col justify-center">
          <div class="text-[13px] font-semibold text-slate-400 mb-1">{{ destaque.construtora }}</div>
          <h3 class="text-[28px] font-extrabold tracking-[-0.02em] text-slate-900 m-0 leading-tight">{{ destaque.nome }}</h3>
          <p class="text-[14px] text-slate-500 m-0 mt-1.5">
            <span v-if="destaque.condominio" class="text-brand font-semibold">Condomínio {{ destaque.condominio }}</span>
            <span v-if="destaque.condominio"> · </span>{{ destaque.bairro }}, {{ destaque.cidade }}/{{ destaque.uf }}
          </p>

          <div class="flex flex-wrap gap-2 mt-5">
            <span class="inline-flex items-center h-[28px] px-3 rounded-full bg-slate-100 text-slate-600 text-[12.5px] font-semibold">{{ destaque.tipologias[0]?.label }}</span>
            <span v-if="destaque.programa" class="inline-flex items-center h-[28px] px-3 rounded-full bg-brand-soft text-brand text-[12.5px] font-semibold">{{ destaque.programa }}</span>
            <span v-if="destaque.aceitaFgts" class="inline-flex items-center h-[28px] px-3 rounded-full bg-slate-100 text-slate-600 text-[12.5px] font-semibold">FGTS na entrada</span>
          </div>

          <div class="flex items-baseline gap-2 mt-6">
            <span class="text-[13px] text-slate-400">a partir de</span>
            <span class="text-[30px] font-extrabold text-brand tracking-[-0.02em]">{{ fmtMoney(destaque.precoAPartirDe) }}</span>
          </div>

          <span class="inline-flex items-center gap-1.5 mt-6 text-[15px] font-semibold text-brand">
            Conhecer o {{ destaque.nome }}
            <span class="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </NuxtLink>

      <!-- próximos empreendimentos -->
      <div v-if="outros.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <NuxtLink
          v-for="e in outros"
          :key="e.slug"
          :to="`/${e.slug}`"
          class="group block bg-white border border-slate-200 rounded-xl overflow-hidden no-underline transition-all hover:border-slate-300 hover:shadow-[0_12px_30px_-16px_rgba(15,23,42,0.25)]"
        >
          <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">
            <img v-if="e.imagens.length" :src="e.imagens[0]" :alt="e.nome" loading="lazy" class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[600ms]" />
            <span class="absolute left-3 top-3 inline-flex items-center h-[24px] px-3 rounded-full text-[11px] font-bold" :style="{ backgroundColor: STATUS_STYLE[e.status].color, color: '#fff' }">{{ STATUS_STYLE[e.status].label }}</span>
          </div>
          <div class="p-5">
            <div class="text-[12px] font-semibold text-slate-400">{{ e.construtora }}</div>
            <h3 class="text-[18px] font-extrabold text-slate-900 m-0 mt-0.5">{{ e.nome }}</h3>
            <p class="text-[13px] text-slate-500 m-0 mt-1">{{ e.bairro }}, {{ e.cidade }}/{{ e.uf }}</p>
            <div class="text-[19px] font-extrabold text-brand mt-3">{{ fmtMoney(e.precoAPartirDe) }}</div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- VALUE PROPOSITION · ROLE SPLIT -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-[88px] pb-6">
      <div class="max-w-[49.5rem] mb-11">
        <div
          class="text-[13px] font-bold uppercase tracking-[0.06em] text-brand mb-3.5"
        >
          A divisão de papéis
        </div>
        <h2
          class="text-[34px] leading-[1.15] font-extrabold tracking-[-0.025em] m-0 mb-4 text-slate-900"
        >
          A gente cuida do seu conhecimento. O corretor cuida do resto.
        </h2>
        <p class="text-[17px] leading-[1.6] text-slate-600 m-0">
          Da clareza à chave na mão: você sai entendendo cada número e decide com
          segurança — e um corretor parceiro assume toda a parte prática, sem você
          precisar caçar imóvel sozinho.
        </p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- PLATFORM SIDE -->
        <div class="bg-white border border-slate-200 rounded-xl p-8">
          <div
            class="inline-flex items-center h-[26px] px-3 bg-[#F0F5F2] rounded-full text-[11.5px] font-bold text-brand uppercase tracking-[0.05em] mb-3.5"
          >
            Seu conhecimento
          </div>
          <h3 class="text-[21px] font-extrabold tracking-[-0.02em] m-0 mb-1.5 text-slate-900">
            O que a plataforma entrega
          </h3>
          <p class="text-[14.5px] leading-[1.6] text-slate-500 m-0 mb-[26px]">
            Clareza total pra você entrar nessa decisão sabendo exatamente no que está
            entrando.
          </p>
          <div class="flex flex-col gap-5">
            <div
              v-for="(item, idx) in [
                {
                  t: 'Independentes',
                  d: 'Não somos banco e não vendemos crédito. Comparamos cenários do seu jeito, sem empurrar produto.',
                },
                {
                  t: 'Zero letra miúda',
                  d: 'Taxa, CET, seguros e tarifas na mesa. Nada de surpresa no fim do contrato.',
                },
                {
                  t: 'Custos reais por município',
                  d: 'ITBI da sua prefeitura e cartório do seu estado, na conta certa do seu bolso.',
                },
              ]"
              :key="idx"
              class="flex gap-3.5 items-start"
            >
              <div
                class="shrink-0 w-[38px] h-[38px] rounded-[9px] bg-[#F0F5F2] flex items-center justify-center"
              >
                <span class="block w-[13px] h-[13px] border-[2.5px] border-brand rounded-sm"></span>
              </div>
              <div>
                <h4 class="text-[15.5px] font-bold m-0 mb-[3px] text-slate-900">
                  {{ item.t }}
                </h4>
                <p class="text-[13.5px] leading-[1.55] text-slate-500 m-0">
                  {{ item.d }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- BROKER SIDE -->
        <div
          class="bg-slate-900 border border-slate-900 rounded-xl p-8 relative overflow-hidden"
        >
          <div
            class="absolute inset-0 pointer-events-none"
            style="
              background-image: linear-gradient(#ffffff08 1px, transparent 1px),
                linear-gradient(90deg, #ffffff08 1px, transparent 1px);
              background-size: 40px 40px;
            "
          ></div>
          <div class="relative">
            <div
              class="inline-flex items-center h-[26px] px-3 bg-brand rounded-full text-[11.5px] font-bold text-white uppercase tracking-[0.05em] mb-3.5"
            >
              O resto, a gente resolve
            </div>
            <h3 class="text-[21px] font-extrabold tracking-[-0.02em] m-0 mb-1.5 text-white">
              O que o corretor parceiro faz
            </h3>
            <p class="text-[14.5px] leading-[1.6] text-slate-300 m-0 mb-6">
              O diferencial central do Meu Revelar: você não caça imóvel sozinho. Ele assume
              toda a corretagem por você.
            </p>
            <div class="flex flex-col gap-3.5">
              <div
                v-for="(txt, idx) in [
                  'Entende o que você precisa e o seu orçamento',
                  'Busca os imóveis compatíveis com seu perfil e gosto',
                  'Agenda e acompanha as visitas com você',
                  'Negocia preço e condições no seu lugar',
                  'Dá suporte na documentação até a chave na mão',
                ]"
                :key="idx"
                class="flex gap-[11px] items-start"
              >
                <span class="text-emerald-400 font-bold text-[15px] shrink-0 leading-[1.4]"
                  >✓</span
                >
                <span class="text-[14.5px] leading-[1.45] text-slate-200">{{ txt }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FROM CALCULATION TO KEYS: 3 STEPS -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-16 pb-6">
      <div class="bg-slate-50 border border-slate-200 rounded-[14px] px-11 py-12">
        <h2 class="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-1.5 text-slate-900">
          Como funciona, em 3 passos
        </h2>
        <p class="text-[16px] text-slate-500 m-0 mb-10">
          Você cuida só do primeiro. O resto é com a gente.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(step, idx) in [
              {
                t: 'Você simula',
                d: 'Preenche renda, entrada, cidade e FGTS. Em segundos você vê parcela, impostos e o teto do seu imóvel.',
              },
              {
                t: 'A gente analisa',
                d: 'Uma especialista revisa seu perfil, tira suas dúvidas no WhatsApp e te conecta a um corretor parceiro.',
              },
              {
                t: 'O corretor conduz',
                d: 'Ele encontra os imóveis certos pro seu orçamento e gosto, agenda as visitas e negocia a compra por você.',
              },
            ]"
            :key="idx"
          >
            <div
              class="flex items-center justify-center w-[34px] h-[34px] rounded-full bg-brand text-white text-[15px] font-bold mb-[18px]"
            >
              {{ idx + 1 }}
            </div>
            <h3 class="text-[17px] font-bold m-0 mb-2 text-slate-900">{{ step.t }}</h3>
            <p class="text-[14px] leading-[1.6] text-slate-500 m-0">{{ step.d }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SEO CONTENT GRID -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-20 pb-6">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-9">
        <div>
          <div class="text-[13px] font-bold uppercase tracking-[0.06em] text-brand mb-3">
            Guias do Meu Revelar
          </div>
          <h2 class="text-[30px] font-extrabold tracking-[-0.025em] m-0 text-slate-900">
            Financiamento explicado sem termos difíceis
          </h2>
        </div>
        <NuxtLink
          to="/guias"
          class="inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand no-underline whitespace-nowrap"
          >Ver todos os guias →</NuxtLink
        >
      </div>
      <div v-if="guides.length" class="grid grid-cols-1 md:grid-cols-3 gap-[22px]">
        <NuxtLink
          v-for="(g, idx) in guides"
          :key="idx"
          :to="`/guias/${g.slug}`"
          class="group block bg-white border border-slate-200 rounded-[10px] overflow-hidden no-underline transition-all hover:border-slate-300 hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.22)] hover:-translate-y-0.5"
        >
          <div class="h-32 border-b border-slate-200 overflow-hidden">
            <img
              v-if="g.cover"
              :src="g.cover"
              :alt="g.titulo"
              loading="lazy"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center"
              style="
                background: repeating-linear-gradient(
                  135deg,
                  #f1f5f9,
                  #f1f5f9 10px,
                  #f8fafc 10px,
                  #f8fafc 20px
                );
              "
            >
              <span class="font-mono text-[11px] text-slate-400">{{ g.cat }}</span>
            </div>
          </div>
          <div class="p-[22px]">
            <span
              class="inline-block text-[11.5px] font-semibold text-brand uppercase tracking-[0.04em] mb-2.5"
              >{{ g.cat }}</span
            >
            <h3
              class="text-[17.5px] font-bold leading-[1.3] tracking-[-0.01em] m-0 mb-2 text-slate-900"
            >
              {{ g.titulo }}
            </h3>
            <p class="text-[14px] leading-[1.55] text-slate-500 m-0">{{ g.resumo }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-20 pb-24">
      <div
        class="bg-slate-900 rounded-2xl px-12 py-16 text-center relative overflow-hidden"
      >
        <div
          class="absolute inset-0 pointer-events-none"
          style="
            background-image: linear-gradient(#ffffff0a 1px, transparent 1px),
              linear-gradient(90deg, #ffffff0a 1px, transparent 1px);
            background-size: 48px 48px;
          "
        ></div>
        <div class="relative">
          <h2
            class="text-[32px] font-extrabold tracking-[-0.025em] m-0 mb-3.5 text-white max-w-[45rem] mx-auto leading-[1.2]"
          >
            Pronto pra ver os números reais do seu bolso?
          </h2>
          <p
            class="text-[17px] leading-[1.6] text-slate-300 m-0 mb-[30px] max-w-[38rem] mx-auto"
          >
            Escolha seu estado e cidade. A gente calcula parcelas, as taxas da sua
            prefeitura e o uso do seu FGTS — de forma simples.
          </p>
          <NuxtLink
            to="/simulador-avancado"
            class="inline-flex items-center justify-center h-[52px] px-7 bg-brand text-white text-[16px] font-semibold no-underline rounded-lg transition-all hover:bg-white hover:text-slate-900"
            >Simular meu cenário sem complicação</NuxtLink
          >
        </div>
      </div>
    </section>
  </div>
</template>
