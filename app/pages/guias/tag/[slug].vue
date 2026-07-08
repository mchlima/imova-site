<script setup lang="ts">
import { postToCard, type CmsTag, type CmsPost } from '~/composables/useCms'

const cms = useCms()
const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data } = await useAsyncData(
  () => `guia-tag-${slug.value}`,
  async () => {
    const [tags, posts] = await Promise.all([
      cms.tags().catch(() => [] as CmsTag[]),
      cms.posts({ tag: slug.value }).catch(() => [] as CmsPost[]),
    ])
    return { tags, posts }
  },
  { watch: [slug] },
)

const tags = computed(() => data.value?.tags ?? [])
const current = computed(() => tags.value.find((t) => t.slug === slug.value) ?? null)
const name = computed(() => current.value?.name ?? slug.value)
const cards = computed(() => (data.value?.posts ?? []).map(postToCard))
const countText = computed(() => {
  const n = cards.value.length
  return n + (n === 1 ? ' artigo' : ' artigos')
})
const faq = computed(() => current.value?.faq?.filter((f) => f.q && f.a) ?? [])

useHead(() => {
  const c = current.value
  const desc =
    c?.metaDescription ||
    c?.description ||
    c?.intro ||
    `Todos os guias marcados com a tag ${name.value}, explicados em português claro.`
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
    title: c?.metaTitle || `#${name.value} · Guias · Meu Revelar`,
    link: c?.canonicalUrl ? [{ rel: 'canonical', href: c.canonicalUrl }] : [],
    meta: [
      { name: 'description', content: desc },
      { property: 'og:title', content: c?.metaTitle || `#${name.value}` },
      { property: 'og:description', content: desc },
      ...(c?.ogImage ? [{ property: 'og:image', content: c.ogImage }] : []),
    ],
    script,
  }
})
</script>

<template>
  <div class="w-full bg-white">
    <section class="bg-slate-100 border-b border-slate-200">
      <div class="max-w-[87.5rem] mx-auto px-6 pt-8 pb-9">
        <nav class="flex items-center gap-2 text-[13px] text-slate-500 mb-[18px] flex-wrap">
          <NuxtLink to="/" class="text-slate-500 no-underline">Início</NuxtLink>
          <span class="text-slate-300">/</span>
          <NuxtLink to="/guias" class="text-slate-500 no-underline">Guias</NuxtLink>
          <span class="text-slate-300">/</span>
          <span class="text-slate-500">Tags</span>
          <span class="text-slate-300">/</span>
          <span class="text-slate-900 font-semibold">{{ name }}</span>
        </nav>
        <div
          class="inline-flex items-center h-[26px] px-[11px] bg-white border border-slate-200 rounded-md text-[11.5px] font-semibold text-brand uppercase tracking-[0.05em] mb-3.5"
        >
          Tag
        </div>
        <h1
          class="text-[34px] leading-[1.15] font-extrabold tracking-[-0.025em] m-0 mb-3 text-slate-900"
        >
          Artigos e guias selecionados sobre #{{ name }}
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
      <aside v-if="tags.length" class="hidden lg:block lg:sticky lg:top-[84px]">
        <div class="text-[12px] font-bold uppercase tracking-[0.06em] text-slate-400 mb-4">
          Tags relacionadas
        </div>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="t in tags"
            :key="t.id"
            :to="`/guias/tag/${t.slug}`"
            class="inline-flex items-center h-[30px] px-[13px] rounded-full text-[12.5px] font-medium no-underline transition-all"
            :class="
              t.slug === slug
                ? 'bg-brand text-white font-semibold'
                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-brand-soft hover:text-brand'
            "
            >#{{ t.name }}</NuxtLink
          >
        </div>
      </aside>

      <main class="min-w-0">
        <div class="flex items-baseline justify-between mb-5">
          <h2 class="text-[16px] font-bold text-slate-900 m-0">Artigos com esta tag</h2>
          <span class="text-[13px] text-slate-400">{{ countText }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <GuiaCard v-for="a in cards" :key="a.slug" :article="a" />
        </div>
        <div
          v-if="cards.length === 0"
          class="text-center py-16 px-5 text-slate-400 text-[15px]"
        >
          Nenhum artigo publicado com esta tag ainda.
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
