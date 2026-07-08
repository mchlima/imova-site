<script setup lang="ts">
// LP FIXA do empreendimento "Ares do Horto" — identidade visual própria.
// Fatos vêm do registro; design é livre aqui.
import { getEmpreendimento, STATUS_STYLE } from '~/data/empreendimentos'
import { fmtBRL } from '~/utils/opportunityModel'

definePageMeta({ layout: 'default' })

const e = getEmpreendimento('ares-do-horto')!
const tipologia = e.tipologias[0]
const plantas = tipologia.plantas ?? []

const origin = useRuntimeConfig().public.siteUrl || useRequestURL().origin
useSeoMeta({ title: e.seo.title, description: e.seo.description, ogImage: origin + e.imagens[0] })
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Residence',
        name: e.nome,
        description: e.descricao,
        url: `${origin}/${e.slug}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: e.endereco,
          addressLocality: e.cidade,
          addressRegion: e.uf,
          addressCountry: 'BR',
        },
        image: e.imagens.map((i) => origin + i),
      }),
    },
  ],
})

// chip sólido (texto branco) — usado sobre fundos escuros (hero, seção masterplan)
const statusStyle = computed(() => {
  const st = STATUS_STYLE[e.status]
  return { backgroundColor: st.color, color: '#fff' }
})

const ANNUAL_RATE = 0.08
const TERM = 360

const base = '/img/empreendimentos/ares-do-horto'
const aboutImage = `${base}/praca-do-fogo.webp`

// perspectivas do Condomínio Pau Brasil (design bespoke desta LP)
const galeria = [
  { src: `${base}/piscina.webp`, label: 'Piscina adulto e infantil', span: true },
  { src: `${base}/playground.webp`, label: 'Playground' },
  { src: `${base}/churrasqueira.webp`, label: 'Churrasqueira gourmet' },
  { src: `${base}/fitness.webp`, label: 'Fitness' },
  { src: `${base}/brinquedoteca.webp`, label: 'Brinquedoteca' },
  { src: `${base}/bem-estar.webp`, label: 'Espaço bem-estar' },
  { src: `${base}/pet.webp`, label: 'Espaço pet' },
  { src: `${base}/pet-care.webp`, label: 'Pet care' },
  { src: `${base}/piquenique.webp`, label: 'Piquenique & redário' },
  { src: `${base}/mini-mercado.webp`, label: 'Mini mercado' },
  { src: `${base}/delivery.webp`, label: 'Espaço delivery' },
  { src: `${base}/bricolagem.webp`, label: 'Bricolagem' },
]

// destaques de venda (apelo)
const destaques = [
  { icon: '💰', titulo: `Subsídio de até ${fmtBRL(e.subsidioAte ?? 0)}`, texto: 'Ajuda do governo abatida direto no valor do imóvel.' },
  { icon: '🏦', titulo: 'Use o seu FGTS', texto: 'Some o saldo do fundo de garantia à sua entrada.' },
  { icon: '🏊', titulo: 'Lazer de clube', texto: `${e.diferenciais.length} itens de lazer sem sair de casa.` },
  { icon: '📍', titulo: 'Zona sul de SP', texto: `${e.bairro}, na Estrada do Campo Limpo.` },
]

// estrutura agrupada por categoria (curadoria de apresentação dos diferenciais)
const estrutura = [
  { icon: '🏊', titulo: 'Lazer & convívio', itens: ['Piscina adulto e infantil', 'Churrasqueira', 'Praça do fogo', 'Salão de festas', 'Salão de jogos', 'Espaço piquenique', 'Redário'] },
  { icon: '💪', titulo: 'Bem-estar & trabalho', itens: ['Fitness', 'Espaço bem-estar', 'Coworking', 'Bricolagem'] },
  { icon: '🧸', titulo: 'Kids & Pet', itens: ['Playground', 'Brinquedoteca', 'Espaço pet', 'Pet care'] },
  { icon: '🛎️', titulo: 'Conveniência', itens: ['Delivery', 'Mini mercado'] },
]

// planta ativa (abas) + lightbox compartilhado
const plantaAtiva = ref(0)
const lightbox = ref<string | null>(null)
const openLightbox = (src: string) => (lightbox.value = src)

// carrossel de perspectivas
const track = ref<HTMLElement | null>(null)
const activeSlide = ref(0)
const slide = (dir: number) => {
  const el = track.value
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
}
// bolinha ativa = card cujo centro está mais próximo do centro visível
const onTrackScroll = () => {
  const el = track.value
  if (!el) return
  const center = el.scrollLeft + el.clientWidth / 2
  let best = 0
  let bestDist = Infinity
  Array.from(el.children).forEach((c, i) => {
    const child = c as HTMLElement
    const dist = Math.abs(child.offsetLeft + child.offsetWidth / 2 - center)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  activeSlide.value = best
}
const goToSlide = (i: number) => {
  const el = track.value
  const child = el?.children[i] as HTMLElement | undefined
  child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

function onKey(ev: KeyboardEvent) {
  if (ev.key === 'Escape') lightbox.value = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="w-full bg-white">
    <!-- HERO full-bleed -->
    <section class="relative min-h-[600px] flex items-end overflow-hidden">
      <img :src="e.imagens[0]" :alt="`${e.nome} — piscina`" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/20"></div>

      <div class="relative w-full max-w-[87.5rem] mx-auto px-6 pb-14 pt-28 text-white">
        <div class="flex items-center gap-2.5 mb-4">
          <span class="inline-flex items-center h-[28px] px-3.5 rounded-full text-[12.5px] font-bold" :style="statusStyle">{{ STATUS_STYLE[e.status].label }}</span>
          <span class="text-[19px] font-extrabold tracking-[-0.01em] text-white">
            <template v-for="(part, i) in e.construtora.split('&')" :key="i"><span v-if="i > 0" class="text-red-500">&</span>{{ part }}</template>
          </span>
        </div>
        <h1 class="text-[clamp(36px,6vw,60px)] leading-[1.02] font-extrabold tracking-[-0.03em] m-0 mb-3 max-w-[720px]">{{ e.nome }}</h1>
        <p v-if="e.condominio" class="text-[15px] font-semibold text-emerald-300 m-0 mb-3">Condomínio {{ e.condominio }} · a fase em lançamento</p>
        <p class="text-[16px] text-white/85 m-0 mb-6 max-w-[560px]">Apartamentos de 2 dormitórios no Horto do Ipê, zona sul de São Paulo — com lazer de clube e condições do Minha Casa Minha Vida.</p>

        <div v-if="e.programa" class="flex flex-wrap gap-2 mb-8">
          <span class="inline-flex items-center h-[30px] px-4 rounded-full text-[12.5px] font-semibold bg-brand text-white">{{ e.programa }}</span>
          <span v-if="e.subsidioAte" class="inline-flex items-center h-[30px] px-4 rounded-full text-[12.5px] font-semibold bg-white/15 text-white backdrop-blur-sm">Subsídio de até {{ fmtBRL(e.subsidioAte) }}</span>
          <span v-if="e.aceitaFgts" class="inline-flex items-center h-[30px] px-4 rounded-full text-[12.5px] font-semibold bg-white/15 text-white backdrop-blur-sm">FGTS na entrada</span>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <a href="#simular" class="inline-flex items-center h-[54px] px-7 bg-brand text-white text-[16px] font-bold no-underline rounded-xl hover:bg-brand-dark transition-all shadow-[0_14px_34px_-12px_rgba(20,108,78,0.9)]">
            Simular minha parcela
          </a>
          <a href="#lazer" class="inline-flex items-center h-[54px] px-6 text-white/90 text-[15px] font-semibold no-underline rounded-xl border border-white/25 hover:bg-white/10 transition-all">
            Ver o empreendimento
          </a>
        </div>
      </div>
    </section>

    <!-- BARRA DE DESTAQUES -->
    <section class="bg-slate-900 text-white">
      <div class="max-w-[87.5rem] mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div class="text-[12px] text-slate-400 mb-1">A partir de</div>
          <div class="text-[22px] font-extrabold tracking-[-0.02em]">{{ fmtBRL(e.precoAPartirDe) }}</div>
        </div>
        <div>
          <div class="text-[12px] text-slate-400 mb-1">Tipologia</div>
          <div class="text-[22px] font-extrabold tracking-[-0.02em]">2 dormitórios</div>
        </div>
        <div>
          <div class="text-[12px] text-slate-400 mb-1">Bairro</div>
          <div class="text-[22px] font-extrabold tracking-[-0.02em]">{{ e.bairro }}</div>
        </div>
        <div>
          <div class="text-[12px] text-slate-400 mb-1">Situação</div>
          <div class="text-[22px] font-extrabold tracking-[-0.02em]">{{ STATUS_STYLE[e.status].label }}</div>
        </div>
      </div>
    </section>

    <!-- SOBRE — 2 colunas com apelo -->
    <section class="max-w-[87.5rem] mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
      <div>
        <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Sobre o empreendimento</span>
        <h2 class="text-[clamp(28px,4vw,42px)] leading-[1.08] font-extrabold tracking-[-0.025em] text-slate-900 m-0 mt-3 mb-5">
          Do tamanho do seu sonho de<br class="hidden sm:block" /> sair do aluguel
        </h2>
        <p class="text-[16.5px] leading-[1.65] text-slate-600 m-0 mb-8">
          O <b class="text-slate-800">{{ e.nome }}</b>, da {{ e.construtora }}, reúne apartamentos de <b class="text-slate-800">2 dormitórios</b> no {{ e.bairro }}, zona sul de São Paulo. Dentro do <b class="text-slate-800">Minha Casa Minha Vida</b>, você conta com subsídio, uso do FGTS na entrada e a estrutura de lazer de um clube — pertinho de tudo.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="(d, i) in destaques" :key="i" class="flex gap-3.5">
            <span class="grid place-items-center w-11 h-11 rounded-xl bg-brand-soft text-[20px] shrink-0">{{ d.icon }}</span>
            <div>
              <div class="text-[15px] font-bold text-slate-900 leading-tight">{{ d.titulo }}</div>
              <div class="text-[13.5px] text-slate-500 mt-0.5 leading-snug">{{ d.texto }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative">
        <div class="rounded-[24px] overflow-hidden shadow-[0_30px_70px_-30px_rgba(15,23,42,0.5)]">
          <img :src="aboutImage" alt="Área de convívio do Ares do Horto" class="w-full h-[420px] object-cover" />
        </div>
        <div class="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl px-6 py-4 border border-slate-100">
          <div class="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide">A partir de</div>
          <div class="text-[26px] font-extrabold text-brand tracking-[-0.02em] leading-tight">{{ fmtBRL(e.precoAPartirDe) }}</div>
        </div>
      </div>
    </section>

    <!-- SOLICITAR CONTATO -->
    <section id="contato" class="scroll-mt-24 bg-brand-soft/40 border-y border-brand/10">
      <div class="max-w-[87.5rem] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Fale com um corretor</span>
          <h2 class="text-[clamp(26px,3.6vw,38px)] font-extrabold tracking-[-0.025em] text-slate-900 m-0 mt-3 mb-4">
            Quer saber mais sobre o {{ e.nome }}?
          </h2>
          <p class="text-[16.5px] leading-[1.6] text-slate-600 m-0 mb-6">
            Deixe seus dados que um corretor parceiro entra em contato com valores, condições e disponibilidade — sem compromisso.
          </p>
          <ul class="m-0 p-0 list-none space-y-2.5">
            <li class="flex items-center gap-2.5 text-[15px] text-slate-700"><span class="text-brand shrink-0">✓</span>Atendimento humano e rápido</li>
            <li class="flex items-center gap-2.5 text-[15px] text-slate-700"><span class="text-brand shrink-0">✓</span>Tira dúvidas sobre subsídio e uso do FGTS</li>
            <li class="flex items-center gap-2.5 text-[15px] text-slate-700"><span class="text-brand shrink-0">✓</span>Sem custo e sem compromisso</li>
          </ul>
        </div>

        <div class="rounded-2xl bg-white border border-slate-200 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.3)] p-6 sm:p-8">
          <h3 class="text-[19px] font-extrabold text-slate-900 m-0 mb-1">Solicitar contato</h3>
          <p class="text-[13.5px] text-slate-500 m-0 mb-5">Respondemos pelo WhatsApp ou e-mail.</p>
          <LeadForm :source="`lp:${e.slug}:contato`" :city="e.cidade" :uf="e.uf" cta-label="Quero saber mais" />
        </div>
      </div>
    </section>

    <!-- MASTERPLAN → CONDOMÍNIOS -->
    <section v-if="e.condominio" class="bg-slate-900 text-white">
      <div class="max-w-[87.5rem] mx-auto px-6 py-20">
        <div class="max-w-[660px] mb-10">
          <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-300">Como funciona</span>
          <h2 class="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-0.025em] m-0 mt-3 mb-4">Um bairro planejado, entregue em fases</h2>
          <p class="text-[16.5px] text-slate-300 m-0 leading-relaxed">
            O <b class="text-white">{{ e.nome }}</b> é um masterplan dividido em condomínios — cada um com lazer, preço e prazo de entrega próprios. A fase que está sendo lançada agora é o <b class="text-white">Condomínio {{ e.condominio }}</b>.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-5">
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <div class="text-[12px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Masterplan</div>
            <h3 class="text-[24px] font-extrabold m-0 mb-2">{{ e.nome }}</h3>
            <p class="text-[14.5px] text-slate-400 m-0 leading-relaxed">Bairro planejado no {{ e.bairro }}, com vários condomínios entregues em etapas ao longo do tempo.</p>
          </div>

          <div class="relative rounded-2xl border-2 border-brand bg-brand/10 p-7">
            <span class="inline-flex items-center h-[26px] px-3 rounded-full text-[11.5px] font-bold mb-3" :style="statusStyle">{{ STATUS_STYLE[e.status].label }}</span>
            <h3 class="text-[24px] font-extrabold m-0 mb-2">Condomínio {{ e.condominio }}</h3>
            <p class="text-[14.5px] text-slate-200 m-0 mb-5 leading-relaxed">2 dormitórios · lazer completo · a partir de <b class="text-white">{{ fmtBRL(e.precoAPartirDe) }}</b>. É esta a fase que você conhece e simula nesta página.</p>
            <a href="#simular" class="inline-flex items-center h-11 px-5 bg-brand text-white text-[14.5px] font-semibold no-underline rounded-xl hover:bg-brand-dark transition-all">
              Simular o {{ e.condominio }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- LAZER / GALERIA -->
    <section id="lazer" class="scroll-mt-24 bg-slate-50 border-y border-slate-100">
      <div class="max-w-[87.5rem] mx-auto px-6 py-20">
        <div class="flex items-end justify-between gap-6 mb-8">
          <div class="max-w-[640px]">
            <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Perspectivas · Condomínio {{ e.condominio }}</span>
            <h2 class="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-0.025em] m-0 mt-3 text-slate-900">Um lazer que parece clube</h2>
            <p class="text-[16.5px] text-slate-500 m-0 mt-3 leading-relaxed">São {{ galeria.length }} ambientes de lazer projetados para todas as idades — do mergulho na piscina ao fim de tarde na praça do fogo. Clique para ampliar.</p>
          </div>
          <div class="hidden sm:flex gap-2 shrink-0 pb-1">
            <button type="button" aria-label="Anterior" class="grid place-items-center w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 text-[20px] hover:border-brand hover:text-brand transition-colors" @click="slide(-1)">‹</button>
            <button type="button" aria-label="Próximo" class="grid place-items-center w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 text-[20px] hover:border-brand hover:text-brand transition-colors" @click="slide(1)">›</button>
          </div>
        </div>

        <div ref="track" class="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-6 px-6 pb-2" @scroll.passive="onTrackScroll">
          <button
            v-for="(g, i) in galeria"
            :key="i"
            type="button"
            class="group relative shrink-0 snap-start w-[78vw] sm:w-[340px] h-[240px] sm:h-[280px] rounded-2xl overflow-hidden bg-slate-100 text-left cursor-zoom-in focus:outline-none focus:ring-4 focus:ring-brand/30"
            @click="openLightbox(g.src)"
          >
            <img :src="g.src" :alt="g.label" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[600ms]" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent"></div>
            <span class="absolute right-3 top-3 grid place-items-center w-9 h-9 rounded-full bg-white/85 text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity text-[15px]">⤢</span>
            <span class="absolute left-4 bottom-4 text-white text-[15px] font-bold drop-shadow">{{ g.label }}</span>
          </button>
        </div>

        <!-- indicadores de posição -->
        <div class="flex justify-center gap-2 mt-6">
          <button
            v-for="(g, i) in galeria"
            :key="i"
            type="button"
            :aria-label="`Ir para ${g.label}`"
            class="h-2 rounded-full transition-all"
            :class="activeSlide === i ? 'w-6 bg-brand' : 'w-2 bg-slate-300 hover:bg-slate-400'"
            @click="goToSlide(i)"
          ></button>
        </div>
      </div>
    </section>

    <!-- ESTRUTURA / CARACTERÍSTICAS agrupadas -->
    <section class="max-w-[87.5rem] mx-auto px-6 py-20">
      <div class="max-w-[640px] mb-10">
        <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Estrutura completa</span>
        <h2 class="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-0.025em] m-0 mt-3 text-slate-900">Tudo o que o dia a dia pede, dentro do condomínio</h2>
        <p class="text-[16.5px] text-slate-500 m-0 mt-3 leading-relaxed">São {{ e.diferenciais.length }} itens organizados para trabalho, bem-estar, crianças e convívio.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="(cat, i) in estrutura" :key="i" class="rounded-2xl border border-slate-200 p-6 hover:border-brand/40 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] transition-all">
          <span class="grid place-items-center w-12 h-12 rounded-xl bg-brand-soft text-[24px] mb-4">{{ cat.icon }}</span>
          <h3 class="text-[16px] font-extrabold text-slate-900 m-0 mb-3">{{ cat.titulo }}</h3>
          <ul class="m-0 p-0 list-none space-y-2">
            <li v-for="(item, j) in cat.itens" :key="j" class="flex items-center gap-2 text-[14px] text-slate-600">
              <span class="text-brand text-[13px] shrink-0">✓</span>{{ item }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- PLANTAS (4 variantes com abas + zoom) -->
    <section class="bg-slate-50 border-y border-slate-100">
      <div class="max-w-[87.5rem] mx-auto px-6 py-20">
        <div class="max-w-[640px] mb-8">
          <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Plantas · Condomínio {{ e.condominio }}</span>
          <h2 class="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-0.025em] m-0 mt-3 text-slate-900">Escolha a planta que combina com você</h2>
          <p class="text-[16.5px] text-slate-500 m-0 mt-3 leading-relaxed">{{ plantas.length }} opções de {{ tipologia.bedrooms }} dormitórios — com e sem terraço. Metragens exatas sob consulta.</p>
        </div>

        <!-- preview emoldurado + painel -->
        <div class="rounded-2xl bg-white border border-slate-200 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.3)] p-5 sm:p-7">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 items-center">
            <button
              type="button"
              class="group relative rounded-xl bg-slate-50 border border-slate-100 p-4 cursor-zoom-in focus:outline-none focus:ring-4 focus:ring-brand/30"
              @click="openLightbox(plantas[plantaAtiva].image)"
            >
              <img :src="plantas[plantaAtiva].image" :alt="`Planta — ${plantas[plantaAtiva].label}`" class="w-full h-auto max-h-[480px] object-contain mx-auto" />
              <span class="absolute right-3 top-3 inline-flex items-center h-8 px-3 rounded-full bg-white/90 border border-slate-200 text-slate-600 text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">⤢ Ampliar</span>
            </button>

            <div>
              <div class="text-[12px] text-slate-400 font-semibold uppercase tracking-wide">Planta selecionada</div>
              <h3 class="text-[24px] font-extrabold text-slate-900 m-0 mt-1 mb-3">{{ plantas[plantaAtiva].label }}</h3>
              <div class="flex flex-wrap gap-2 mb-5">
                <span class="inline-flex items-center h-7 px-3 rounded-full bg-brand-soft text-brand text-[12.5px] font-semibold">{{ tipologia.bedrooms }} dormitórios</span>
                <span
                  class="inline-flex items-center h-7 px-3 rounded-full text-[12.5px] font-semibold"
                  :class="plantas[plantaAtiva].terraco ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'"
                >
                  {{ plantas[plantaAtiva].terraco ? 'Com terraço' : 'Sem terraço' }}
                </span>
              </div>
              <div class="flex items-baseline gap-2 mb-1.5">
                <span class="text-[13px] text-slate-400">a partir de</span>
                <span class="text-[26px] font-extrabold text-brand tracking-[-0.02em]">{{ fmtBRL(tipologia.priceFrom) }}</span>
              </div>
              <p class="text-[12.5px] text-slate-400 m-0 mb-6">Metragens exatas sob consulta.</p>
              <a href="#simular" class="inline-flex items-center h-12 px-6 bg-brand text-white text-[15px] font-semibold no-underline rounded-xl hover:bg-brand-dark transition-all">
                Simular esta planta
              </a>
            </div>
          </div>
        </div>

        <!-- miniaturas seletoras -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <button
            v-for="(p, i) in plantas"
            :key="i"
            type="button"
            class="relative rounded-xl overflow-hidden border-2 bg-white p-2 transition-all"
            :class="plantaAtiva === i ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200 hover:border-slate-300'"
            @click="plantaAtiva = i"
          >
            <img :src="p.image" :alt="p.label" class="w-full h-[120px] object-contain" />
            <span v-if="p.terraco" class="absolute right-2 top-2 inline-flex items-center h-5 px-2 rounded-full bg-amber-500 text-white text-[10px] font-bold">terraço</span>
            <div class="text-center text-[12.5px] font-semibold mt-1" :class="plantaAtiva === i ? 'text-brand' : 'text-slate-500'">{{ p.label }}</div>
          </button>
        </div>
      </div>
    </section>

    <!-- SIMULADOR -->
    <section id="simular" class="scroll-mt-24 bg-gradient-to-b from-white to-brand-soft/40">
      <div class="max-w-[1040px] mx-auto px-6 py-16">
        <div class="text-center mb-8">
          <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Simulação</span>
          <h2 class="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-0.025em] m-0 mt-3 text-slate-900">Quanto fica pra você?</h2>
        </div>
        <SimuladorCaptura
          :source="`lp:${e.slug}`"
          :property-value="e.precoAPartirDe"
          :city="e.cidade"
          :uf="e.uf"
          :annual-rate="ANNUAL_RATE"
          :term="TERM"
        />
      </div>
    </section>

    <!-- LOCALIZAÇÃO -->
    <section class="bg-slate-900 text-white">
      <div class="max-w-[87.5rem] mx-auto px-6 py-14">
        <span class="text-[13px] font-bold uppercase tracking-[0.14em] text-emerald-300">Localização</span>
        <h2 class="text-[26px] font-extrabold tracking-[-0.02em] m-0 mt-2 mb-1.5">{{ e.bairro }}, zona sul de São Paulo</h2>
        <p class="text-[15.5px] text-slate-300 m-0">{{ e.endereco }} — {{ e.cidade }}/{{ e.uf }}</p>
      </div>
    </section>

    <!-- LIGHTBOX -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="lightbox"
        class="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
        @click="lightbox = null"
      >
        <button
          type="button"
          class="absolute top-5 right-5 grid place-items-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-[22px] leading-none transition-colors"
          aria-label="Fechar"
          @click.stop="lightbox = null"
        >
          ×
        </button>
        <img :src="lightbox" alt="" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" @click.stop />
      </div>
    </Transition>
  </div>
</template>
