<script setup lang="ts">
import {
  type Development,
  type DevelopmentsMeta,
  statusLabel,
  statusBadgeStyle,
  regiaoLabel,
  heroImage,
  dormsLabel,
  developmentUrl,
} from '~/utils/developmentModel'
import { fmtBRL } from '~/utils/opportunityModel'
import { SERVICE_AREA, realEstateAgentLd } from '~/utils/serviceArea'

// Home orientada a captar tráfego de compradores: destaca a BASE REAL de imóveis
// (/developments), oferece navegação por região (links internos p/ SEO), guias do
// CMS e CTAs para o catálogo. O simulador vira ferramenta de apoio (CTA secundário).

const apiBase = useRuntimeConfig().public.apiBase
const origin = useRuntimeConfig().public.siteUrl || useRequestURL().origin

// ── catálogo real (SSR) ──
const { data: devs } = await useFetch<Development[]>('/developments', {
  baseURL: apiBase,
  default: () => [],
})
const { data: meta } = await useFetch<DevelopmentsMeta>('/developments/meta', {
  baseURL: apiBase,
  default: () => ({ amenities: [], regioes: [], statuses: [] }),
})

const destaque = computed(() => devs.value[0] ?? null)
const outros = computed(() => devs.value.slice(1, 7))
const regioes = computed(() => meta.value.regioes)

const nfArea = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const absImg = (u: string) => (u ? (u.startsWith('http') ? u : origin + u) : '')

// ── guias mais recentes do CMS (fallback vazio em erro) ──
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

// ── SEO / GEO ──
const pageTitle = 'Imóveis e apartamentos na Grande São Paulo | ReveLar'
const pageDesc =
  'Encontre apartamentos e lançamentos na Região Metropolitana de São Paulo — Minha Casa Minha Vida, ' +
  'subsídio e uso do FGTS. Simule o financiamento com clareza e um corretor parceiro conduz a compra até a chave.'
const ogImage = computed(() => absImg(destaque.value ? heroImage(destaque.value) : ''))

useSeoMeta({
  title: pageTitle,
  description: pageDesc,
  ogType: 'website',
  ogUrl: `${origin}/`,
  ogTitle: pageTitle,
  ogSiteName: 'ReveLar',
  ogDescription: pageDesc,
  ogLocale: 'pt_BR',
  ogImage: () => ogImage.value || undefined,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDesc,
  twitterImage: () => ogImage.value || undefined,
})

// FAQ voltado ao comprador (GEO — respostas prontas para motores generativos)
const FAQ = [
  {
    q: 'Que tipo de imóvel o ReveLar oferece na região de São Paulo?',
    a:
      'Reunimos apartamentos e lançamentos na Região Metropolitana de São Paulo, com foco em unidades ' +
      'enquadradas no Minha Casa Minha Vida (Habitação de Interesse Social), com subsídio e uso do FGTS na entrada.',
  },
  {
    q: 'Posso usar o FGTS e o subsídio do Minha Casa Minha Vida?',
    a:
      'Sim. Os empreendimentos que reunimos aceitam FGTS na entrada e podem contar com subsídio do programa, ' +
      'conforme sua renda familiar. O simulador mostra a parcela estimada, os impostos da sua cidade e o teto do seu imóvel.',
  },
  {
    q: 'Preciso pagar algo para usar a plataforma?',
    a:
      'Não. A simulação e o atendimento são 100% gratuitos. Não somos banco e não vendemos crédito — ' +
      'a gente cuida da sua clareza e um corretor parceiro assume a busca e a negociação por você.',
  },
  {
    q: 'Como funciona o corretor parceiro?',
    a:
      'A partir do seu perfil, um corretor parceiro busca os imóveis compatíveis, agenda as visitas, ' +
      'negocia preço e condições e dá suporte na documentação até a entrega das chaves.',
  },
]

const jsonLd = computed(() => {
  const { '@context': _ctx, ...agent } = realEstateAgentLd(origin)
  const list = devs.value.slice(0, 12).map((d, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: origin + developmentUrl(d),
    name: d.name,
  }))
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: 'ReveLar',
        inLanguage: 'pt-BR',
        publisher: { '@id': `${origin}/#meurevelar` },
      },
      agent,
      {
        '@type': 'ItemList',
        '@id': `${origin}/#empreendimentos`,
        name: `Empreendimentos na ${SERVICE_AREA.region}`,
        numberOfItems: list.length,
        itemListElement: list,
      },
      {
        '@type': 'FAQPage',
        '@id': `${origin}/#faq`,
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }
})

useHead({
  link: [{ rel: 'canonical', href: `${origin}/` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(jsonLd.value)),
    },
  ],
})
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
            Imóveis na Região Metropolitana de São Paulo
          </div>
          <h1
            class="text-[45px] leading-[1.1] font-extrabold tracking-[-0.03em] m-0 mb-[22px] text-slate-900"
          >
            Encontre seu apartamento na Grande São Paulo — e deixe um corretor parceiro
            <span class="text-brand">cuidar do resto</span>.
          </h1>
          <p class="text-[18px] leading-[1.6] text-slate-600 m-0 mb-2 max-w-[39.5rem]">
            Lançamentos e empreendimentos com Minha Casa Minha Vida, subsídio e uso do FGTS
            na entrada. Você vê a parcela real, os impostos da sua cidade e o teto do seu
            imóvel — e um corretor parceiro busca, agenda as visitas e negocia por você.
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
              ><span class="text-brand font-bold">✓</span> Corretor parceiro</span
            >
          </div>

          <!-- CTAS -->
          <div class="flex flex-wrap items-center gap-3 mt-8">
            <NuxtLink
              to="/imoveis"
              class="inline-flex items-center gap-2 h-[52px] px-6 bg-brand text-white text-[15px] font-semibold no-underline rounded-lg hover:bg-brand-dark transition-all shadow-[0_10px_24px_-12px_rgba(20,108,78,0.7)]"
            >
              🏢 Ver imóveis disponíveis
            </NuxtLink>
            <NuxtLink
              to="/simulador-avancado"
              class="inline-flex items-center gap-2 h-[52px] px-6 bg-white text-slate-700 text-[15px] font-semibold no-underline rounded-lg border border-slate-300 hover:border-brand hover:text-brand transition-all"
            >
              Simular financiamento
            </NuxtLink>
          </div>
        </div>

        <!-- NAVEGAR POR REGIÃO -->
        <div
          class="bg-white border border-slate-200 rounded-xl shadow-[0_10px_30px_-12px_rgba(15,23,42,0.12),0_1px_2px_rgba(15,23,42,0.05)] p-7"
        >
          <span
            class="text-[13px] font-bold uppercase tracking-[0.05em] text-brand"
            >Explore por região</span
          >
          <h2
            class="text-[20px] font-bold tracking-[-0.02em] m-0 mt-1 mb-1.5 text-slate-900"
          >
            Onde você quer morar em São Paulo?
          </h2>
          <p class="text-[13.5px] leading-[1.5] text-slate-500 m-0 mb-5">
            Escolha uma região da RMSP e veja os empreendimentos disponíveis.
          </p>
          <div v-if="regioes.length" class="flex flex-wrap gap-2.5">
            <NuxtLink
              v-for="r in regioes"
              :key="r"
              :to="`/imoveis?regiao=${r}`"
              class="inline-flex items-center h-[42px] px-4 bg-slate-50 border border-slate-200 rounded-lg text-[14px] font-semibold text-slate-700 no-underline transition-all hover:border-brand hover:text-brand hover:bg-[#F0F5F2]"
            >
              {{ regiaoLabel(r) }}
            </NuxtLink>
          </div>
          <NuxtLink
            v-else
            to="/imoveis"
            class="inline-flex items-center h-[46px] px-5 bg-slate-50 border border-slate-200 rounded-lg text-[14px] font-semibold text-slate-700 no-underline hover:border-brand hover:text-brand transition-all"
          >
            Ver todos os imóveis
          </NuxtLink>
          <NuxtLink
            to="/imoveis"
            class="flex items-center justify-center w-full h-[48px] mt-5 bg-brand text-white text-[15px] font-semibold no-underline rounded-lg transition-all hover:bg-brand-dark"
          >
            Ver todos os empreendimentos →
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- VITRINE DE EMPREENDIMENTOS -->
    <section
      id="empreendimentos"
      class="scroll-mt-24 max-w-[87.5rem] mx-auto px-6 pt-[72px] pb-6"
    >
      <div class="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div class="text-[13px] font-bold uppercase tracking-[0.06em] text-brand mb-3">
            Empreendimentos
          </div>
          <h2
            class="text-[30px] leading-[1.15] font-extrabold tracking-[-0.025em] m-0 text-slate-900"
          >
            Apartamentos para sair do aluguel em São Paulo
          </h2>
          <p class="text-[16px] text-slate-500 m-0 mt-2 max-w-[42rem]">
            Unidades selecionadas com subsídio, uso do FGTS e lazer completo. Simule a
            parcela e fale com um corretor parceiro.
          </p>
        </div>
        <NuxtLink
          to="/imoveis"
          class="inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand no-underline whitespace-nowrap"
          >Ver todos →</NuxtLink
        >
      </div>

      <!-- destaque -->
      <NuxtLink
        v-if="destaque"
        :to="developmentUrl(destaque)"
        class="group grid grid-cols-1 md:grid-cols-2 bg-white border border-slate-200 rounded-2xl overflow-hidden no-underline transition-all hover:border-slate-300 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]"
      >
        <div class="relative min-h-[240px] md:min-h-[340px] overflow-hidden bg-slate-100">
          <img
            v-if="heroImage(destaque)"
            :src="heroImage(destaque)"
            :alt="destaque.name"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[600ms]"
          />
          <span
            class="absolute left-4 top-4 inline-flex items-center h-[28px] px-3.5 rounded-full text-[12px] font-bold"
            :style="statusBadgeStyle(destaque.status)"
            >{{ statusLabel(destaque.status) }}</span
          >
        </div>

        <div class="p-8 lg:p-10 flex flex-col justify-center">
          <div class="text-[13px] font-semibold text-slate-400 mb-1">
            {{ destaque.construtora }}
          </div>
          <h3
            class="text-[28px] font-extrabold tracking-[-0.02em] text-slate-900 m-0 leading-tight"
          >
            {{ destaque.name }}
          </h3>
          <p class="text-[14px] text-slate-500 m-0 mt-1.5">
            {{ destaque.bairro }}, {{ destaque.cidade }}/{{ destaque.uf }}
          </p>

          <div class="flex flex-wrap gap-2 mt-5">
            <span
              class="inline-flex items-center h-[28px] px-3 rounded-full bg-slate-100 text-slate-600 text-[12.5px] font-semibold"
              >{{ dormsLabel(destaque) }}</span
            >
            <span
              class="inline-flex items-center h-[28px] px-3 rounded-full bg-slate-100 text-slate-600 text-[12.5px] font-semibold"
              >a partir de {{ nfArea(destaque.areaMin) }} m²</span
            >
            <span
              v-if="destaque.programa"
              class="inline-flex items-center h-[28px] px-3 rounded-full bg-brand-soft text-brand text-[12.5px] font-semibold"
              >{{ destaque.programa }}</span
            >
            <span
              v-if="destaque.aceitaFgts"
              class="inline-flex items-center h-[28px] px-3 rounded-full bg-slate-100 text-slate-600 text-[12.5px] font-semibold"
              >FGTS na entrada</span
            >
          </div>

          <div v-if="destaque.priceFrom" class="flex items-baseline gap-2 mt-6">
            <span class="text-[13px] text-slate-400">a partir de</span>
            <span class="text-[30px] font-extrabold text-brand tracking-[-0.02em]">{{
              fmtBRL(destaque.priceFrom)
            }}</span>
          </div>

          <span
            class="inline-flex items-center gap-1.5 mt-6 text-[15px] font-semibold text-brand"
          >
            Conhecer o {{ destaque.name }}
            <span class="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </NuxtLink>

      <!-- estado vazio -->
      <div
        v-if="!destaque"
        class="border border-dashed border-slate-300 rounded-2xl px-8 py-16 text-center"
      >
        <p class="text-[16px] text-slate-500 m-0 mb-5">
          Novos empreendimentos chegando em breve na região de São Paulo.
        </p>
        <NuxtLink
          to="/simulador-avancado"
          class="inline-flex items-center h-[48px] px-6 bg-brand text-white text-[15px] font-semibold no-underline rounded-lg hover:bg-brand-dark transition-all"
          >Simular meu financiamento</NuxtLink
        >
      </div>

      <!-- próximos empreendimentos -->
      <div
        v-if="outros.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
      >
        <NuxtLink
          v-for="e in outros"
          :key="e.slug"
          :to="developmentUrl(e)"
          class="group block bg-white border border-slate-200 rounded-xl overflow-hidden no-underline transition-all hover:border-slate-300 hover:shadow-[0_12px_30px_-16px_rgba(15,23,42,0.25)]"
        >
          <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">
            <img
              v-if="heroImage(e)"
              :src="heroImage(e)"
              :alt="e.name"
              loading="lazy"
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[600ms]"
            />
            <span
              class="absolute left-3 top-3 inline-flex items-center h-[24px] px-3 rounded-full text-[11px] font-bold"
              :style="statusBadgeStyle(e.status)"
              >{{ statusLabel(e.status) }}</span
            >
          </div>
          <div class="p-5">
            <div class="text-[12px] font-semibold text-slate-400">{{ e.construtora }}</div>
            <h3 class="text-[18px] font-extrabold text-slate-900 m-0 mt-0.5">
              {{ e.name }}
            </h3>
            <p class="text-[13px] text-slate-500 m-0 mt-1">
              {{ e.bairro }}, {{ e.cidade }}/{{ e.uf }}
            </p>
            <div v-if="e.priceFrom" class="text-[19px] font-extrabold text-brand mt-3">
              {{ fmtBRL(e.priceFrom) }}
            </div>
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
              O diferencial central do ReveLar: você não caça imóvel sozinho. Ele assume
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

    <!-- COMO FUNCIONA: 3 PASSOS -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-16 pb-6">
      <div class="bg-slate-50 border border-slate-200 rounded-[14px] px-11 py-12">
        <h2 class="text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-1.5 text-slate-900">
          Como funciona, em 3 passos
        </h2>
        <p class="text-[16px] text-slate-500 m-0 mb-10">
          Do imóvel certo à chave na mão — a gente te acompanha em cada etapa.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(step, idx) in [
              {
                t: 'Você explora os imóveis',
                d: 'Navegue pelos empreendimentos por região, bairro e preço. Simule a parcela, os impostos e o teto do seu imóvel em segundos.',
              },
              {
                t: 'A gente analisa',
                d: 'Uma especialista revisa seu perfil, tira suas dúvidas no WhatsApp e te conecta a um corretor parceiro.',
              },
              {
                t: 'O corretor conduz',
                d: 'Ele agenda as visitas, negocia a compra por você e dá suporte na documentação até a entrega das chaves.',
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
            Guias do ReveLar
          </div>
          <h2 class="text-[30px] font-extrabold tracking-[-0.025em] m-0 text-slate-900">
            Comprar seu imóvel com segurança, sem termos difíceis
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
            Pronto pra encontrar seu imóvel na região de São Paulo?
          </h2>
          <p
            class="text-[17px] leading-[1.6] text-slate-300 m-0 mb-[30px] max-w-[38rem] mx-auto"
          >
            Navegue pelos empreendimentos disponíveis, simule sua parcela sem complicação e
            fale com um corretor parceiro — do primeiro clique à chave na mão.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <NuxtLink
              to="/imoveis"
              class="inline-flex items-center justify-center h-[52px] px-7 bg-brand text-white text-[16px] font-semibold no-underline rounded-lg transition-all hover:bg-white hover:text-slate-900"
              >Ver imóveis disponíveis</NuxtLink
            >
            <NuxtLink
              to="/simulador-avancado"
              class="inline-flex items-center justify-center h-[52px] px-7 bg-transparent text-white text-[16px] font-semibold no-underline rounded-lg border border-white/30 transition-all hover:border-white"
              >Simular financiamento</NuxtLink
            >
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
