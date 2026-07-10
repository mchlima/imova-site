<script setup lang="ts">
import { postToCard, type CmsCategoryNode, type CmsPost } from '~/composables/useCms'

const cms = useCms()
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const search = ref('')

// Walk the tree to find a node and its ancestor path (root → node).
function findPath(
  nodes: CmsCategoryNode[],
  target: string,
  trail: CmsCategoryNode[] = [],
): CmsCategoryNode[] | null {
  for (const n of nodes) {
    const next = [...trail, n]
    if (n.slug === target) return next
    const deep = findPath(n.children, target, next)
    if (deep) return deep
  }
  return null
}

const { data } = await useAsyncData(
  () => `guia-cat-${slug.value}`,
  async () => {
    const [tree, posts] = await Promise.all([
      cms.categories().catch(() => [] as CmsCategoryNode[]),
      cms.posts({ category: slug.value }).catch(() => [] as CmsPost[]),
    ])
    return { tree, posts }
  },
  { watch: [slug] },
)

const tree = computed(() => data.value?.tree ?? [])
const trail = computed(() => findPath(tree.value, slug.value) ?? [])
const current = computed(() => trail.value[trail.value.length - 1] ?? null)

if (!current.value && data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categoria não encontrada', fatal: true })
}

const cards = computed(() => (data.value?.posts ?? []).map(postToCard))
const filteredArticles = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return cards.value
  return cards.value.filter((a) =>
    (a.title + ' ' + a.summary + ' ' + a.tags.join(' ')).toLowerCase().includes(q),
  )
})
const countText = computed(() => {
  const n = filteredArticles.value.length
  return n + (n === 1 ? ' artigo' : ' artigos')
})
const name = computed(() => current.value?.name ?? '')
const faq = computed(() => current.value?.faq?.filter((f) => f.q && f.a) ?? [])

useHead(() => {
  const c = current.value
  const desc =
    c?.metaDescription ||
    c?.description ||
    c?.intro ||
    `Artigos e guias selecionados sobre ${name.value}, em português claro.`
  const script = faq.value.length
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.value.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        },
      ]
    : []
  return {
    title: c?.metaTitle || `${name.value} · Guias · ReveLar`,
    link: c?.canonicalUrl ? [{ rel: 'canonical', href: c.canonicalUrl }] : [],
    meta: [
      { name: 'description', content: desc },
      { property: 'og:title', content: c?.metaTitle || name.value },
      { property: 'og:description', content: desc },
      ...(c?.ogImage ? [{ property: 'og:image', content: c.ogImage }] : []),
    ],
    script,
  }
})
</script>

<template>
  <div class="w-full bg-white">
    <!-- HEADER + BREADCRUMB -->
    <section class="bg-slate-100 border-b border-slate-200">
      <div class="max-w-[87.5rem] mx-auto px-6 pt-8 pb-9">
        <nav class="flex items-center gap-2 text-[13px] text-slate-500 mb-[18px] flex-wrap">
          <NuxtLink to="/" class="text-slate-500 no-underline">Início</NuxtLink>
          <span class="text-slate-300">/</span>
          <NuxtLink to="/guias" class="text-slate-500 no-underline">Guias</NuxtLink>
          <template v-for="(c, i) in trail" :key="c.slug">
            <span class="text-slate-300">/</span>
            <NuxtLink
              v-if="i < trail.length - 1"
              :to="`/guias/categoria/${c.slug}`"
              class="text-slate-500 no-underline"
              >{{ c.name }}</NuxtLink
            >
            <span v-else class="text-slate-900 font-semibold">{{ c.name }}</span>
          </template>
        </nav>
        <div
          class="inline-flex items-center h-[26px] px-[11px] bg-white border border-slate-200 rounded-md text-[11.5px] font-semibold text-brand uppercase tracking-[0.05em] mb-3.5"
        >
          Categoria
        </div>
        <h1
          class="text-[34px] leading-[1.15] font-extrabold tracking-[-0.025em] m-0 mb-3 text-slate-900"
        >
          Artigos e guias selecionados sobre {{ name }}
        </h1>
        <p
          v-if="current?.intro || current?.description"
          class="text-[16.5px] leading-[1.6] text-slate-600 m-0 max-w-[46.5rem]"
        >
          {{ current?.intro || current?.description }}
        </p>
      </div>
    </section>

    <div
      class="max-w-[87.5rem] mx-auto px-6 pt-9 pb-20 grid grid-cols-1 lg:grid-cols-[248px_1fr] gap-11 items-start"
    >
      <!-- SIDE MENU -->
      <aside class="hidden lg:block lg:sticky lg:top-[84px]">
        <div class="relative mb-6">
          <span
            class="absolute left-[13px] top-1/2 -translate-y-1/2 text-slate-400 text-[15px]"
            >⌕</span
          >
          <input
            v-model="search"
            placeholder="Buscar nesta categoria…"
            class="w-full h-[42px] pl-9 pr-[13px] text-[13.5px] text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
        <div class="text-[12px] font-bold uppercase tracking-[0.06em] text-slate-400 mb-4">
          Categorias
        </div>
        <nav class="flex flex-col gap-2">
          <NuxtLink
            v-for="c in tree"
            :key="c.id"
            :to="`/guias/categoria/${c.slug}`"
            class="text-[14px] font-medium no-underline px-3 py-2 rounded-[7px] transition-all"
            :class="
              trail[0]?.id === c.id
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            "
            >{{ c.name }}</NuxtLink
          >
        </nav>
      </aside>

      <!-- FILTERED GRID -->
      <main class="min-w-0">
        <div class="flex items-baseline justify-between mb-5">
          <h2 class="text-[16px] font-bold text-slate-900 m-0">Artigos nesta categoria</h2>
          <span class="text-[13px] text-slate-400">{{ countText }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <GuiaCard v-for="a in filteredArticles" :key="a.slug" :article="a" />
        </div>
        <div
          v-if="filteredArticles.length === 0"
          class="text-center py-16 px-5 text-slate-400 text-[15px]"
        >
          Nenhum artigo publicado nesta categoria ainda.
        </div>

        <!-- FAQ (GEO) -->
        <section v-if="faq.length" class="mt-14 max-w-[46.5rem]">
          <h2 class="text-[22px] font-extrabold tracking-[-0.02em] text-slate-900 m-0 mb-5">
            Perguntas frequentes
          </h2>
          <div class="flex flex-col gap-3">
            <details
              v-for="(f, i) in faq"
              :key="i"
              class="group border border-slate-200 rounded-[10px] px-5 py-4 [&[open]]:bg-slate-50"
            >
              <summary
                class="flex items-center justify-between gap-3 cursor-pointer list-none text-[16px] font-bold text-slate-900"
              >
                {{ f.q }}
                <span
                  class="text-slate-400 text-[20px] leading-none transition-transform group-open:rotate-45"
                  >+</span
                >
              </summary>
              <p class="text-[15px] leading-[1.6] text-slate-600 mt-3 mb-0">{{ f.a }}</p>
            </details>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
