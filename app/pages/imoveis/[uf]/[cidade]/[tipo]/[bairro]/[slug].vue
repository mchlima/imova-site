<script setup lang="ts">
import {
  type Development,
  type DevelopmentImage,
  type DevelopmentsMeta,
  statusLabel,
  statusBadgeStyle,
  regiaoLabel,
  heroImage,
} from '~/utils/developmentModel'
import { fmtBRL } from '~/utils/opportunityModel'
import { realEstateAgentLd } from '~/utils/serviceArea'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = route.params.slug as string
const apiBase = useRuntimeConfig().public.apiBase

const { data: d } = await useFetch<Development>(`/developments/${slug}`, { baseURL: apiBase })
if (!d.value) throw createError({ statusCode: 404, statusMessage: 'Empreendimento não encontrado', fatal: true })
const dev = d.value

const { data: metaData } = await useFetch<DevelopmentsMeta>('/developments/meta', {
  baseURL: apiBase,
  default: () => ({ amenities: [], regioes: [], statuses: [] }),
})

const origin = useRuntimeConfig().public.siteUrl || useRequestURL().origin
// URL canônica profunda (segmentos derivados do registro)
const canonicalPath = `/imoveis/${dev.uf.toLowerCase()}/${dev.cidadeSlug}/${dev.tipo}/${dev.bairroSlug}/${dev.slug}`
const canonical = origin + canonicalPath
const hero = computed(() => heroImage(dev))

// selo HIS/HMP da Prefeitura de São Paulo — empreendimentos MCMV em SP
const showSeloSP = computed(
  () =>
    dev.uf === 'SP' &&
    (!!dev.tetoHis1 || !!dev.tetoHmp || /his|hmp/i.test(dev.programa || '')),
)

// ── dados derivados p/ SEO/GEO ──
const absImg = (u: string) => (u.startsWith('http') ? u : origin + u)
const allImages = computed(() => dev.images.map((i) => absImg(i.url)))
const amenityNames = computed(() => {
  const map = new Map(metaData.value.amenities.map((a) => [a.slug, a.label]))
  return dev.amenities.map((s) => map.get(s) || s)
})
const areaText = computed(() =>
  dev.areaMax ? (dev.areaMin && dev.areaMin !== dev.areaMax ? `${dev.areaMin} a ${dev.areaMax}` : `${dev.areaMax}`) : '',
)
const dormsText = computed(() =>
  dev.bedroomsMax ? (dev.bedroomsMin && dev.bedroomsMin !== dev.bedroomsMax ? `${dev.bedroomsMin} a ${dev.bedroomsMax}` : `${dev.bedroomsMax}`) : '',
)
const seoTitle = computed(() => dev.seoTitle || `${dev.name} — ${dev.bairro}, ${dev.cidade}/${dev.uf}`)
const seoDesc = computed(() => dev.seoDescription || dev.descricao)
const ogImg = computed(() => (hero.value ? absImg(hero.value) : undefined))

// Perguntas frequentes (Q&A) — alimenta o FAQPage (forte p/ GEO/IA) e reflete o
// conteúdo visível da página (Sobre, fatos, estrutura, localização, simulador).
const faqItems = computed(() => {
  const q: { q: string; a: string }[] = []
  q.push({
    q: `Onde fica o ${dev.name}?`,
    a: `O ${dev.name} fica em ${dev.endereco || dev.bairro}, ${dev.cidade}/${dev.uf}${dev.regiao ? `, ${regiaoLabel(dev.regiao)}` : ''}.`,
  })
  if (dormsText.value)
    q.push({
      q: `Quantos dormitórios e qual a metragem dos apartamentos do ${dev.name}?`,
      a: `São apartamentos de ${dormsText.value} dormitório(s)${areaText.value ? ` com ${areaText.value} m²` : ''}.`,
    })
  if (dev.programa || dev.subsidioAte || dev.aceitaFgts) {
    const parts: string[] = []
    if (dev.programa) parts.push(`faz parte do ${dev.programa}`)
    if (dev.subsidioAte) parts.push(`tem subsídio de até ${fmtBRL(dev.subsidioAte)}`)
    if (dev.aceitaFgts) parts.push('permite usar o FGTS na entrada')
    q.push({ q: `O ${dev.name} faz parte do Minha Casa Minha Vida?`, a: `Sim — o ${dev.name} ${parts.join(', ')}.` })
  }
  if (dev.priceFrom)
    q.push({
      q: `Qual o preço do ${dev.name}?`,
      a: `Os apartamentos do ${dev.name} partem de ${fmtBRL(dev.priceFrom)}. Valores sujeitos a alteração; simule as condições com um corretor parceiro.`,
    })
  q.push({
    q: `Qual o status de obra do ${dev.name}?`,
    a: `${statusLabel(dev.status)}${dev.entregaLabel ? ` — previsão de entrega em ${dev.entregaLabel}` : ''}.`,
  })
  if (amenityNames.value.length)
    q.push({ q: `Quais são os itens de lazer do ${dev.name}?`, a: `O ${dev.name} conta com ${amenityNames.value.join(', ')}.` })
  return q
})

// Grafo JSON-LD: negócio (RealEstateAgent + areaServed RMSP), o empreendimento
// (ApartmentComplex com geo, tipologias, amenities e oferta), breadcrumb e FAQ.
const jsonLd = computed(() => {
  const { '@context': _ctx, ...agent } = realEstateAgentLd(origin)
  const residence: Record<string, unknown> = {
    '@type': 'ApartmentComplex',
    '@id': `${canonical}#empreendimento`,
    name: dev.name,
    description: dev.descricao,
    url: canonical,
    address: {
      '@type': 'PostalAddress',
      ...(dev.endereco ? { streetAddress: dev.endereco } : {}),
      addressLocality: dev.cidade,
      addressRegion: dev.uf,
      addressCountry: 'BR',
    },
    ...(allImages.value.length ? { image: allImages.value } : {}),
    ...(dev.lat != null && dev.lng != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: dev.lat, longitude: dev.lng } }
      : {}),
    ...(dev.bairro
      ? { containedInPlace: { '@type': 'Place', name: `${dev.bairro}, ${dev.cidade} - ${dev.uf}` } }
      : {}),
    ...(dev.totalUnidades ? { numberOfAccommodationUnits: dev.totalUnidades } : {}),
    ...(dev.construtora ? { provider: { '@type': 'Organization', name: dev.construtora } } : {}),
    ...(amenityNames.value.length
      ? { amenityFeature: amenityNames.value.map((n) => ({ '@type': 'LocationFeatureSpecification', name: n, value: true })) }
      : {}),
    ...(dev.typologies.length
      ? {
          containsPlace: dev.typologies.map((t) => ({
            '@type': 'Apartment',
            name: t.label,
            ...(t.bedrooms ? { numberOfBedrooms: t.bedrooms } : {}),
            ...(t.areaMax
              ? {
                  floorSize: {
                    '@type': 'QuantitativeValue',
                    unitCode: 'MTK',
                    ...(t.areaMin && t.areaMin !== t.areaMax ? { minValue: t.areaMin, maxValue: t.areaMax } : { value: t.areaMax }),
                  },
                }
              : {}),
          })),
        }
      : {}),
    ...(dev.priceFrom
      ? {
          makesOffer: {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: dev.priceFrom,
            availability: 'https://schema.org/InStock',
            url: canonical,
            seller: { '@id': `${origin}/#meurevelar` },
          },
        }
      : {}),
  }
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Imóveis', item: `${origin}/imoveis` },
      { '@type': 'ListItem', position: 3, name: dev.name, item: canonical },
    ],
  }
  const faq = {
    '@type': 'FAQPage',
    mainEntity: faqItems.value.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  return { '@context': 'https://schema.org', '@graph': [agent, residence, breadcrumb, faq] }
})

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDesc.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDesc.value,
  ogType: 'website',
  ogUrl: canonical,
  ogSiteName: 'Meu Revelar',
  ogLocale: 'pt_BR',
  ogImage: () => ogImg.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDesc.value,
  twitterImage: () => ogImg.value,
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd.value) }],
})

// imagens por tipo
const lazerImgs = computed(() => dev.images.filter((i) => i.kind !== 'planta'))
// plantas agora vivem nas tipologias (1 por tipologia) — lightbox derivado delas
const typoPlantas = computed(() =>
  dev.typologies
    .filter((t) => t.imageUrl)
    .map((t, idx) => ({ id: t.id, url: t.imageUrl, kind: 'planta' as const, caption: t.label, order: idx })),
)
function openTypoLb(id: string) {
  const i = typoPlantas.value.findIndex((p) => p.id === id)
  if (i >= 0) openLb(typoPlantas.value, i)
}

// características agrupadas (com rótulos do meta)
const CAT_LABELS: Record<string, string> = {
  lazer: 'Lazer', esporte: 'Esporte', pet: 'Pet', conveniencia: 'Conveniência', bem_estar: 'Bem-estar', estrutura: 'Estrutura',
}
const CAT_ICON: Record<string, string> = {
  lazer: '🏊', esporte: '🏋️', pet: '🐾', conveniencia: '🛎️', bem_estar: '🧖', estrutura: '🏢',
}
const CAT_COLOR: Record<string, string> = {
  lazer: '#146c4e', esporte: '#B45309', pet: '#9333EA', conveniencia: '#0E7490', bem_estar: '#BE123C', estrutura: '#4338CA',
}
const catColor = (c: string) => CAT_COLOR[c] || '#64748B'

// mapa (Google embed sem chave — usa coordenadas se houver, senão o endereço)
const mapQuery = computed(() =>
  dev.lat != null && dev.lng != null
    ? `${dev.lat},${dev.lng}`
    : [dev.endereco, dev.bairro, dev.cidade, dev.uf].filter(Boolean).join(', '),
)
const mapSrc = computed(
  () => `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery.value)}&z=15&output=embed`,
)
const mapsLink = computed(
  () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery.value)}`,
)
const amenityGroups = computed(() => {
  const map = new Map(metaData.value.amenities.map((a) => [a.slug, a]))
  const groups: Record<string, string[]> = {}
  for (const slug of dev.amenities) {
    const a = map.get(slug)
    const cat = a?.category || 'outros'
    ;(groups[cat] ||= []).push(a?.label || slug)
  }
  return Object.entries(groups)
})

// fatos rápidos
const dormsFato = computed(() => {
  if (!dev.bedroomsMax) return ''
  return dev.bedroomsMin === dev.bedroomsMax ? `${dev.bedroomsMax}` : `${dev.bedroomsMin}–${dev.bedroomsMax}`
})
const areaFato = computed(() => {
  if (!dev.areaMax) return ''
  return dev.areaMin && dev.areaMin !== dev.areaMax ? `${dev.areaMin}–${dev.areaMax}` : `${dev.areaMax}`
})

const statusStyle = computed(() => ({ backgroundColor: '#0f172a', color: '#fff' }))

// carrosséis com scroll lateral (lazer e plantas)
const galTrack = ref<HTMLElement | null>(null)
function scrollTrack(el: HTMLElement | null, dir: number) {
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
}

// lightbox com navegação entre as imagens (sem fechar)
const lbImgs = ref<DevelopmentImage[]>([])
const lbIndex = ref(0)
const lbDir = ref(1) // direção da última troca (p/ animar o slide)
const lbCurrent = computed(() => lbImgs.value[lbIndex.value] || null)
function openLb(imgs: DevelopmentImage[], i: number) {
  lbImgs.value = imgs
  lbDir.value = 1
  lbIndex.value = i
}
function closeLb() {
  lbImgs.value = []
}
function stepLb(dir: number) {
  const n = lbImgs.value.length
  if (!n) return
  lbDir.value = dir
  lbIndex.value = (lbIndex.value + dir + n) % n
}
function jumpLb(i: number) {
  lbDir.value = i >= lbIndex.value ? 1 : -1
  lbIndex.value = i
}
function onKey(ev: KeyboardEvent) {
  if (!lbImgs.value.length) return
  if (ev.key === 'Escape') closeLb()
  else if (ev.key === 'ArrowRight') stepLb(1)
  else if (ev.key === 'ArrowLeft') stepLb(-1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="w-full">
    <!-- HERO -->
    <section class="relative">
      <div class="relative h-[62vh] min-h-[420px] max-h-[640px] bg-slate-900 overflow-hidden">
        <img v-if="hero" :src="hero" :alt="dev.name" class="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div class="absolute inset-0" style="background: linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.55) 55%, rgba(15,23,42,0.85) 100%)"></div>
        <!-- selo HIS/HMP (Prefeitura de SP), discreto no canto -->
        <img
          v-if="showSeloSP"
          src="/img/selo-his-hmp-sp.webp"
          alt="Empreendimento com unidades HIS-1, HIS-2 e HMP — Prefeitura de São Paulo"
          class="absolute top-4 right-4 sm:top-6 sm:right-6 z-[2] w-[150px] sm:w-[210px] rounded-lg shadow-[0_10px_28px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/20"
        />
        <div class="relative z-[1] max-w-[87.5rem] mx-auto px-6 h-full flex flex-col justify-end pb-10">
          <span class="inline-flex items-center h-[26px] px-3 rounded-full text-[12px] font-bold w-max mb-3" :style="statusStyle">{{ statusLabel(dev.status) }}</span>
          <h1 class="text-[34px] sm:text-[44px] font-extrabold tracking-[-0.03em] text-white m-0 leading-[1.05]">{{ dev.name }}</h1>
          <p class="text-[16px] text-white/85 mt-2 mb-0">{{ dev.bairro }} · {{ dev.cidade }}/{{ dev.uf }} · {{ regiaoLabel(dev.regiao) }}</p>
          <div v-if="dev.priceFrom" class="text-white mt-5">
            <span class="block text-[12px] text-white/70">a partir de</span>
            <span class="text-[26px] font-extrabold">{{ fmtBRL(dev.priceFrom) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FATOS RÁPIDOS -->
    <section class="max-w-[87.5rem] mx-auto px-6 -mt-8 relative z-[2]">
      <div class="bg-white border border-slate-200 rounded-[14px] shadow-[0_12px_30px_-18px_rgba(15,23,42,0.3)] grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
        <div class="p-5">
          <div class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Dormitórios</div>
          <div class="text-[20px] font-extrabold text-slate-900 mt-1">{{ dormsFato || '—' }}</div>
        </div>
        <div class="p-5">
          <div class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Área (m²)</div>
          <div class="text-[20px] font-extrabold text-slate-900 mt-1">{{ areaFato || 'Sob consulta' }}</div>
        </div>
        <div class="p-5">
          <div class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Construtora</div>
          <div class="text-[20px] font-extrabold text-slate-900 mt-1 truncate">{{ dev.construtora || '—' }}</div>
        </div>
        <div class="p-5">
          <div class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">Entrega</div>
          <div class="text-[20px] font-extrabold text-slate-900 mt-1">{{ dev.entregaLabel || statusLabel(dev.status) }}</div>
        </div>
      </div>
    </section>

    <!-- SOBRE + CAPTAÇÃO (texto à esquerda, formulário à direita) -->
    <section id="contato" class="max-w-[87.5rem] mx-auto px-6 pt-16 scroll-mt-20">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <!-- ESQUERDA: texto -->
        <div class="lg:pt-2">
          <h2 class="text-[26px] sm:text-[32px] font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.12] m-0">
            Sobre o {{ dev.name }}
          </h2>
          <p class="text-[15px] sm:text-[15.5px] leading-[1.8] text-slate-600 mt-4 whitespace-pre-line m-0">
            {{ dev.descricao }}
          </p>
          <div class="flex flex-wrap gap-2 mt-6">
            <span v-if="dev.subsidioAte" class="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-full bg-brand-soft text-brand text-[13px] font-semibold">Subsídio de até {{ fmtBRL(dev.subsidioAte) }}</span>
            <span v-if="dev.aceitaFgts" class="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold">Use seu FGTS</span>
            <span v-if="dev.amenities.length" class="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold">{{ dev.amenities.length }} itens de lazer</span>
          </div>
        </div>
        <!-- DIREITA: formulário -->
        <div class="rounded-[18px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.25)]">
          <span class="text-[12px] font-bold uppercase tracking-[0.12em] text-brand">Fale com um corretor</span>
          <h3 class="text-[21px] sm:text-[23px] font-extrabold tracking-[-0.02em] text-slate-900 mt-1 mb-1.5">Simule sem compromisso</h3>
          <p class="text-[13.5px] text-slate-500 mb-5 leading-[1.55]">Um corretor parceiro cuida de tudo — do cálculo à documentação. Sem custo para você.</p>
          <LeadForm :source="`lp:${dev.slug}`" :city="dev.cidade" :uf="dev.uf" cta-label="Quero falar com um corretor" />
        </div>
      </div>
    </section>

    <!-- STATUS DA OBRA (stepper horizontal) -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-16">
      <div class="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <span class="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">Andamento da obra</span>
          <h2 class="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-slate-900 mt-1.5 mb-0 leading-[1.12]">Status do {{ dev.name }}</h2>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="inline-flex items-center gap-2 h-[38px] px-4 rounded-full text-[14px] font-bold" :style="statusBadgeStyle(dev.status)">
            <span class="w-2 h-2 rounded-full bg-current"></span>{{ statusLabel(dev.status) }}
          </div>
          <span v-if="dev.entregaLabel" class="text-[13.5px] text-slate-500">
            Entrega: <span class="font-bold text-slate-700">{{ dev.entregaLabel }}</span>
          </span>
        </div>
      </div>
      <DevelopmentStatusTimeline :status="dev.status" :entrega-label="dev.entregaLabel" />
    </section>

    <!-- GALERIA (scroll lateral) -->
    <section v-if="lazerImgs.length" class="max-w-[87.5rem] mx-auto px-6 pt-14">
      <div class="flex items-end justify-between mb-5">
        <h2 class="text-[26px] font-extrabold tracking-[-0.02em] text-slate-900 m-0">Lazer & estrutura</h2>
        <div v-if="lazerImgs.length > 3" class="hidden sm:flex items-center gap-2">
          <button type="button" class="w-10 h-10 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer" aria-label="Anterior" @click="scrollTrack(galTrack, -1)">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" class="w-10 h-10 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer" aria-label="Próxima" @click="scrollTrack(galTrack, 1)">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
      <div
        ref="galTrack"
        class="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3"
        style="scrollbar-width: none"
      >
        <button
          v-for="(img, i) in lazerImgs"
          :key="img.id"
          type="button"
          class="snap-start shrink-0 w-[75vw] sm:w-[30%] group relative aspect-[4/3] rounded-[14px] overflow-hidden bg-slate-100 cursor-pointer border-none p-0"
          @click="openLb(lazerImgs, i)"
        >
          <img :src="img.url" :alt="img.caption" loading="lazy" class="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500" />
          <span v-if="img.caption" class="absolute bottom-0 left-0 right-0 px-3.5 py-2.5 text-[13px] font-semibold text-white text-left" style="background: linear-gradient(180deg, transparent, rgba(15,23,42,0.78))">{{ img.caption }}</span>
        </button>
      </div>
    </section>

    <!-- ESTRUTURA & LAZER (faixa tingida, colunas tipo checklist) -->
    <section v-if="amenityGroups.length" class="pt-16">
      <div class="bg-gradient-to-b from-[#f4f9f6] to-white border-y border-slate-200/70">
        <div class="max-w-[87.5rem] mx-auto px-6 py-14">
          <!-- header editorial -->
          <div class="flex items-end justify-between gap-6 flex-wrap mb-10">
            <div class="max-w-xl">
              <span class="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">Estrutura completa</span>
              <h2 class="text-[26px] sm:text-[32px] font-extrabold tracking-[-0.02em] text-slate-900 mt-1.5 mb-0 leading-[1.12]">
                Tudo para viver bem
              </h2>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[44px] sm:text-[56px] font-extrabold tracking-[-0.03em] text-brand leading-none">{{ dev.amenities.length }}</span>
              <span class="text-[13.5px] font-semibold text-slate-500 leading-[1.35]">itens de lazer<br />e conveniência</span>
            </div>
          </div>

          <!-- categorias em colunas abertas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            <div v-for="[cat, items] in amenityGroups" :key="cat">
              <div class="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-200/80">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[16px] shrink-0" :style="{ backgroundColor: catColor(cat) + '16' }">{{ CAT_ICON[cat] || '✦' }}</span>
                <span class="text-[15.5px] font-extrabold text-slate-900">{{ CAT_LABELS[cat] || cat }}</span>
                <span class="ml-auto text-[12px] font-bold tabular-nums" :style="{ color: catColor(cat) }">{{ items.length }}</span>
              </div>
              <ul class="flex flex-col gap-2.5 m-0 p-0 list-none">
                <li v-for="label in items" :key="label" class="flex items-center gap-2.5 text-[14px] text-slate-700 leading-snug">
                  <svg class="w-[15px] h-[15px] shrink-0" :style="{ color: catColor(cat) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {{ label }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TIPOLOGIAS (cada planta com suas características) -->
    <section v-if="dev.typologies.length" class="max-w-[87.5rem] mx-auto px-6 pt-16">
      <div class="mb-6">
        <span class="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">Plantas & tipologias</span>
        <h2 class="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-slate-900 mt-1.5 mb-0 leading-[1.12]">Escolha a sua planta</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="t in dev.typologies"
          :key="t.id"
          class="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-[0_18px_44px_-24px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <!-- planta (clicável → lightbox) -->
          <button
            v-if="t.imageUrl"
            type="button"
            class="block w-full aspect-[4/3] bg-slate-50 overflow-hidden cursor-pointer border-none p-0"
            :aria-label="`Ver planta — ${t.label}`"
            @click="openTypoLb(t.id)"
          >
            <img :src="t.imageUrl" :alt="`Planta — ${t.label}`" loading="lazy" class="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
          </button>
          <div v-else class="aspect-[4/3] bg-slate-50 flex items-center justify-center text-[13px] text-slate-400">Planta em breve</div>

          <!-- características desta planta -->
          <div class="p-5">
            <div class="text-[17px] font-extrabold text-slate-900 leading-tight">{{ t.label }}</div>
            <div class="flex flex-wrap items-center gap-x-3.5 gap-y-2 mt-3">
              <span v-if="t.bedrooms" class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 14h18M7 10V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" /></svg>
                {{ t.bedrooms }} dorm.
              </span>
              <span v-if="t.suites" class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                {{ t.suites }} suíte{{ t.suites > 1 ? 's' : '' }}
              </span>
              <span v-if="t.areaMax" class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3zM3 9h18M9 21V9" /></svg>
                {{ t.areaMin && t.areaMin !== t.areaMax ? `${t.areaMin}–${t.areaMax}` : t.areaMax }} m²
              </span>
              <span v-if="t.terraco" class="inline-flex items-center h-[26px] px-2.5 rounded-full bg-brand-soft text-brand text-[12px] font-bold">Varanda</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- LOCALIZAÇÃO (mapa full-bleed) -->
    <section class="pt-16">
      <div class="max-w-[87.5rem] mx-auto px-6 mb-6">
        <span class="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">Onde fica</span>
        <h2 class="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-slate-900 mt-1.5 mb-0 leading-[1.12]">Localização</h2>
        <p class="text-[14.5px] text-slate-500 mt-2 m-0">{{ dev.bairro }} · {{ dev.cidade }}/{{ dev.uf }} — {{ regiaoLabel(dev.regiao) }}</p>
      </div>
      <div class="relative">
        <iframe
          :src="mapSrc"
          class="w-full h-[460px] sm:h-[560px] block border-0 grayscale-[0.15]"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          title="Mapa da localização"
        ></iframe>
        <!-- véu lateral p/ legibilidade do card em telas largas -->
        <div class="absolute inset-0 pointer-events-none hidden sm:block" style="background: linear-gradient(90deg, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0) 46%)"></div>
        <!-- card flutuante -->
        <div class="absolute inset-0 pointer-events-none">
          <div class="max-w-[87.5rem] mx-auto px-6 h-full flex items-end sm:items-center pb-6 sm:pb-0">
            <div class="pointer-events-auto bg-white/95 backdrop-blur-md rounded-[20px] shadow-[0_30px_70px_-30px_rgba(15,23,42,0.55)] border border-white/70 p-6 sm:p-7 w-full max-w-[400px]">
              <div class="flex items-start gap-3.5">
                <span class="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-brand text-white shrink-0 shadow-[0_8px_20px_-8px_rgba(20,108,78,0.7)]">
                  <svg class="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                </span>
                <div class="min-w-0">
                  <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-brand">{{ regiaoLabel(dev.regiao) }}</div>
                  <div class="text-[17px] font-extrabold text-slate-900 leading-snug mt-0.5">{{ dev.endereco || `${dev.bairro}, ${dev.cidade}/${dev.uf}` }}</div>
                  <div class="text-[13.5px] text-slate-500 mt-1">{{ dev.bairro }} · {{ dev.cidade }}/{{ dev.uf }}</div>
                </div>
              </div>
              <div v-if="dev.standEndereco" class="mt-5 pt-4 border-t border-slate-100">
                <div class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 mb-1">Stand de vendas</div>
                <div class="text-[13px] text-slate-600 leading-[1.5]">{{ dev.standEndereco }}</div>
              </div>
              <a :href="mapsLink" target="_blank" rel="noopener" class="flex items-center justify-center gap-1.5 mt-5 h-[44px] px-4 bg-brand text-white text-[14px] font-bold rounded-xl no-underline hover:bg-brand-dark transition-colors">
                <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20l-5.5 2.5V6L9 3.5m0 16.5l6-3m-6 3V3.5m6 13.5l5.5-2.5V1L15 3.5m0 13V3.5m0 0L9 6" /></svg>
                Como chegar
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SIMULADOR DE FINANCIAMENTO -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-16">
      <div class="mb-6">
        <span class="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">Simulador</span>
        <h2 class="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-slate-900 mt-1.5 mb-0 leading-[1.12]">Simule seu financiamento</h2>
        <p class="text-[14.5px] leading-[1.7] text-slate-500 mt-2 m-0">Em 3 passos: seus números, seu contato e a comparação entre SAC e Price — já com a estimativa do subsídio do Minha Casa Minha Vida.</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <!-- painel de diferenciais do programa -->
        <aside class="order-2 lg:order-1 rounded-[24px] bg-slate-50 border border-slate-200/70 p-7 sm:p-8 flex flex-col">
          <div class="flex items-start gap-2">
            <h3 class="text-[22px] font-extrabold tracking-[-0.02em] text-slate-900 m-0 leading-tight">Aqui você pode</h3>
            <svg class="w-5 h-5 text-brand shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 3v4M3 5h4M6 17v2M5 18h2" /><path d="M13 4l2.5 6L22 12l-6.5 2L13 20l-2.5-6L4 12l6.5-2L13 4z" /></svg>
          </div>
          <p class="text-[14px] font-bold text-slate-500 leading-snug mt-2 mb-0">Condições especiais para você sair do aluguel.</p>

          <div class="mt-6 flex flex-col divide-y divide-slate-200">
            <div v-if="dev.subsidioAte" class="flex items-start gap-3.5 py-4 first:pt-0">
              <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-soft text-brand shrink-0">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.3 5 3.9 0 1.1-1.1 1.9-2.5 1.9-1.1 0-2.1-.6-2.5-1.5M12 6.5v11" /></svg>
              </span>
              <div class="text-[15px] text-slate-700 leading-snug pt-1">Subsídio de até <span class="font-extrabold text-brand">{{ fmtBRL(dev.subsidioAte) }}</span><sup class="text-slate-400">*</sup></div>
            </div>
            <div v-if="dev.aceitaFgts" class="flex items-start gap-3.5 py-4 first:pt-0">
              <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-soft text-brand shrink-0">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2" /><circle cx="16.5" cy="13" r="1.3" /></svg>
              </span>
              <div class="text-[15px] text-slate-700 leading-snug pt-1">Entrada facilitada <span class="font-extrabold text-slate-900">utilizando seu FGTS</span><sup class="text-slate-400">*</sup></div>
            </div>
            <div class="flex items-start gap-3.5 py-4 first:pt-0">
              <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-soft text-brand shrink-0">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3" /><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15 5.2a3 3 0 0 1 0 5.6" /></svg>
              </span>
              <div class="text-[15px] text-slate-700 leading-snug pt-1">Junte sua renda com <span class="font-extrabold text-slate-900">mais 2 pessoas</span></div>
            </div>
          </div>

          <a href="#contato" class="mt-auto pt-6 inline-flex items-center gap-2 text-[14px] font-bold text-slate-900 no-underline hover:text-brand transition-colors">
            Conhecer o programa
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </a>
          <p class="text-[11px] text-slate-400 leading-[1.5] mt-4 mb-0">* Estimativas do Minha Casa Minha Vida; condições sujeitas a análise da instituição financeira.</p>
        </aside>

        <!-- simulador -->
        <div class="order-1 lg:order-2">
          <FinancingSimulator :property-value="dev.priceFrom" :slug="dev.slug" :city="dev.cidade" :uf="dev.uf" />
        </div>
      </div>
    </section>

    <!-- FAQ (perguntas frequentes) — visível e casado com o FAQPage JSON-LD -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-20">
      <div class="mb-7">
        <span class="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">Perguntas frequentes</span>
        <h2 class="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-slate-900 mt-1.5 mb-0 leading-[1.12]">Tudo sobre o {{ dev.name }}</h2>
      </div>
      <div class="max-w-[760px] mx-auto divide-y divide-slate-200">
        <div v-for="(f, idx) in faqItems" :key="idx" class="py-6">
          <h3 class="text-[16.5px] sm:text-[17.5px] font-extrabold text-slate-900 m-0 leading-snug">{{ f.q }}</h3>
          <p class="text-[14.5px] leading-[1.7] text-slate-600 mt-2 mb-0">{{ f.a }}</p>
        </div>
      </div>
    </section>

    <!-- REGISTRO LEGAL -->
    <section class="max-w-[87.5rem] mx-auto px-6 pt-14 pb-20">
      <p class="text-[11px] text-slate-400 leading-[1.6] m-0">
        <span v-if="dev.incorporadora">Incorporação: {{ dev.incorporadora }}<span v-if="dev.cnpj"> — CNPJ {{ dev.cnpj }}</span>. </span>
        <span v-if="dev.registroIncorporacao">Registro: {{ dev.registroIncorporacao }}. </span>
        Imagens meramente ilustrativas. Condições sujeitas a alteração e aprovação de crédito.
      </p>
    </section>

    <!-- LIGHTBOX com navegação -->
    <Teleport to="body">
      <div v-if="lbCurrent" class="fixed inset-0 z-[80] bg-slate-900/92 flex flex-col p-4 sm:p-6" @click="closeLb">
        <!-- topo: legenda + contador + fechar -->
        <div class="flex items-center gap-3 text-white shrink-0 mb-3" @click.stop>
          <span class="text-[14px] font-semibold truncate">{{ lbCurrent.caption }}</span>
          <span class="text-[13px] text-white/60 ml-auto shrink-0">{{ lbIndex + 1 }} / {{ lbImgs.length }}</span>
          <button class="w-9 h-9 inline-flex items-center justify-center text-white bg-white/15 hover:bg-white/25 rounded-full cursor-pointer border-none text-[16px]" aria-label="Fechar" @click="closeLb">✕</button>
        </div>
        <!-- imagem + setas -->
        <div class="flex-1 min-h-0 flex items-center justify-center relative" @click.stop>
          <button
            v-if="lbImgs.length > 1"
            class="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center text-white bg-white/15 hover:bg-white/30 rounded-full cursor-pointer border-none"
            aria-label="Anterior"
            @click="stepLb(-1)"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <Transition :name="lbDir >= 0 ? 'lb-next' : 'lb-prev'" mode="out-in">
            <img :key="lbCurrent.id" :src="lbCurrent.url" :alt="lbCurrent.caption" class="max-w-full max-h-full object-contain rounded-lg" />
          </Transition>
          <button
            v-if="lbImgs.length > 1"
            class="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center text-white bg-white/15 hover:bg-white/30 rounded-full cursor-pointer border-none"
            aria-label="Próxima"
            @click="stepLb(1)"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <!-- miniaturas -->
        <div v-if="lbImgs.length > 1" class="shrink-0 flex gap-2 justify-center mt-3 overflow-x-auto pb-1" @click.stop style="scrollbar-width: none">
          <button
            v-for="(img, i) in lbImgs"
            :key="img.id"
            type="button"
            class="w-16 h-12 rounded-md overflow-hidden shrink-0 border-2 cursor-pointer p-0 transition-all"
            :class="i === lbIndex ? 'border-white' : 'border-transparent opacity-55 hover:opacity-90'"
            @click="jumpLb(i)"
          >
            <img :src="img.url" :alt="img.caption" class="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
/* Slide direcional da imagem no lightbox (não-scoped por causa do Teleport) */
.lb-next-enter-active,
.lb-next-leave-active,
.lb-prev-enter-active,
.lb-prev-leave-active {
  transition:
    transform 0.24s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.24s ease;
}
.lb-next-enter-from {
  transform: translateX(48px);
  opacity: 0;
}
.lb-next-leave-to {
  transform: translateX(-48px);
  opacity: 0;
}
.lb-prev-enter-from {
  transform: translateX(-48px);
  opacity: 0;
}
.lb-prev-leave-to {
  transform: translateX(48px);
  opacity: 0;
}
</style>
