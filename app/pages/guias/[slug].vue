<script setup lang="ts">
import { inlineMd, postToCard, type CmsPost } from '~/composables/useCms'

const cms = useCms()
const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data } = await useAsyncData(
  () => `guia-${slug.value}`,
  async () => {
    const post = await cms.post(slug.value).catch(() => null)
    if (!post) return { post: null, related: [] }
    // related: same leaf category, excluding the current post
    const leaf = post.category?.path?.[post.category.path.length - 1]?.slug
    let related: CmsPost[] = []
    if (leaf) {
      related = (await cms.posts({ category: leaf }).catch(() => []))
        .filter((p) => p.slug !== post.slug)
        .slice(0, 2)
    }
    return { post, related }
  },
  { watch: [slug] },
)

if (!data.value?.post) {
  throw createError({ statusCode: 404, statusMessage: 'Guia não encontrado', fatal: true })
}

const post = computed(() => data.value!.post as CmsPost)
const related = computed(() => (data.value?.related ?? []).map(postToCard))

// rastreamento de leitura (visualizações, tempo ativo, mapa de calor)
const articleEl = ref<HTMLElement | null>(null)
usePostTracking(slug, articleEl)
const path = computed(() => post.value.category?.path ?? [])
const leafCategory = computed(() => path.value[path.value.length - 1]?.name ?? '')

useHead(() => {
  const p = post.value
  const seo = p.seo
  const image = seo.ogImage || p.coverImageUrl || ''
  const ld: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.title,
      description: seo.metaDescription,
      author: { '@type': 'Person', name: p.author?.name },
      datePublished: p.publishedAt,
      ...(p.updatedAt ? { dateModified: p.updatedAt } : {}),
      ...(image ? { image } : {}),
      ...(seo.canonicalUrl ? { mainEntityOfPage: seo.canonicalUrl } : {}),
    },
  ]
  if (p.faq?.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  return {
    title: seo.metaTitle || p.title,
    link: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap',
      },
      ...(seo.canonicalUrl ? [{ rel: 'canonical', href: seo.canonicalUrl }] : []),
    ],
    meta: [
      { name: 'description', content: seo.metaDescription },
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: seo.metaTitle || p.title },
      { property: 'og:description', content: seo.metaDescription },
      ...(image ? [{ property: 'og:image', content: image }] : []),
    ],
    script: ld.map((obj) => ({ type: 'application/ld+json', innerHTML: JSON.stringify(obj) })),
  }
})
</script>

<template>
  <div class="w-full bg-white">
    <article ref="articleEl" class="max-w-[42rem] mx-auto px-6 pt-10 pb-6">
      <!-- breadcrumb (category path) -->
      <nav class="flex items-center gap-2 text-[13px] text-slate-500 mb-6 flex-wrap">
        <NuxtLink to="/guias" class="text-slate-500 no-underline">Guias</NuxtLink>
        <template v-for="(c, i) in path" :key="c.slug">
          <span class="text-slate-300">/</span>
          <NuxtLink
            :to="`/guias/categoria/${c.slug}`"
            class="text-slate-500 no-underline"
            >{{ c.name }}</NuxtLink
          >
        </template>
        <span class="text-slate-300">/</span>
        <span class="text-slate-900 font-semibold">{{ post.title }}</span>
      </nav>

      <span
        v-if="leafCategory"
        class="inline-block text-[12px] font-semibold text-brand uppercase tracking-[0.05em] mb-3.5"
        >{{ leafCategory }}</span
      >
      <h1
        class="text-[38px] leading-[1.15] font-extrabold tracking-[-0.03em] m-0 mb-[18px] text-slate-900"
      >
        {{ post.title }}
      </h1>
      <p
        v-if="post.deck"
        class="text-[19px] leading-[1.6] text-slate-500 m-0 mb-[22px] font-serif-prose"
      >
        {{ post.deck }}
      </p>

      <!-- top tags + reading time -->
      <div class="flex gap-2 flex-wrap pb-6 mb-2 border-b border-slate-100">
        <NuxtLink
          v-for="t in post.tags"
          :key="t.slug"
          :to="`/guias/tag/${t.slug}`"
          class="inline-flex items-center h-7 px-3 bg-white border border-slate-200 rounded-full text-[12px] font-medium text-slate-600 no-underline"
          >#{{ t.name }}</NuxtLink
        >
        <span class="inline-flex items-center text-[12.5px] text-slate-400 ml-1"
          >· {{ post.readingTime }} min de leitura</span
        >
      </div>

      <!-- COVER -->
      <img
        v-if="post.coverImageUrl"
        :src="post.coverImageUrl"
        :alt="post.title"
        class="w-full rounded-xl border border-slate-100 my-2 aspect-[16/9] object-cover"
      />

      <!-- DIRECT SUMMARY (Resumo em 1 minuto / AI snippet) -->
      <div
        v-if="post.bullets?.length"
        class="bg-slate-50 border border-slate-200 rounded-[10px] px-[26px] py-6 my-7 mb-9"
      >
        <div class="flex items-center gap-2 mb-4">
          <span
            class="inline-flex items-center justify-center w-6 h-6 bg-brand rounded-md text-white text-[13px] font-bold"
            >✓</span
          >
          <span class="text-[13px] font-bold uppercase tracking-[0.05em] text-slate-900"
            >Resumo direto em 1 minuto</span
          >
        </div>
        <ul class="m-0 p-0 list-none flex flex-col gap-3">
          <li
            v-for="(b, i) in post.bullets"
            :key="i"
            class="flex gap-[11px] text-[15px] leading-[1.55] text-slate-700"
          >
            <span class="text-brand font-bold shrink-0">{{ i + 1 }}.</span>
            <span v-html="inlineMd(b)"></span>
          </li>
        </ul>
      </div>

      <!-- BODY -->
      <div class="prose" v-html="post.bodyHtml"></div>

      <!-- MID-ARTICLE CTA -->
      <div class="bg-slate-900 rounded-[14px] p-9 my-10 relative overflow-hidden">
        <div
          class="absolute inset-0 pointer-events-none"
          style="
            background-image: linear-gradient(#ffffff08 1px, transparent 1px),
              linear-gradient(90deg, #ffffff08 1px, transparent 1px);
            background-size: 40px 40px;
          "
        ></div>
        <div class="relative">
          <h3
            class="text-[21px] font-extrabold tracking-[-0.02em] m-0 mb-3 text-white leading-[1.3]"
          >
            Fazer contas de cabeça só gera mais dúvidas.
          </h3>
          <p class="text-[15.5px] leading-[1.6] text-slate-300 m-0 mb-[22px]">
            Que tal ver os números reais do seu bolso agora? Escolha seu estado e cidade e
            nós calculamos suas parcelas, as taxas da sua prefeitura e o uso do seu FGTS —
            de forma simples.
          </p>
          <NuxtLink
            to="/simulador-avancado"
            class="inline-flex items-center justify-center h-12 px-6 bg-brand text-white text-[15px] font-semibold no-underline rounded-lg transition-all hover:bg-white hover:text-slate-900"
            >Simular meu cenário sem complicação →</NuxtLink
          >
        </div>
      </div>

      <!-- FAQ (GEO) -->
      <section v-if="post.faq?.length" class="mt-2">
        <h2 class="text-[22px] font-extrabold tracking-[-0.02em] text-slate-900 m-0 mb-5">
          Perguntas frequentes
        </h2>
        <div class="flex flex-col gap-3">
          <details
            v-for="(f, i) in post.faq"
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

      <!-- footer tags -->
      <div
        v-if="post.tags?.length"
        class="flex gap-2 flex-wrap pt-7 mt-9 border-t border-slate-100"
      >
        <span class="text-[13px] font-semibold text-slate-600 mr-1 self-center">Tags:</span>
        <NuxtLink
          v-for="t in post.tags"
          :key="t.slug"
          :to="`/guias/tag/${t.slug}`"
          class="inline-flex items-center h-7 px-3 bg-slate-100 border border-slate-200 rounded-full text-[12px] font-medium text-slate-600 no-underline"
          >#{{ t.name }}</NuxtLink
        >
      </div>
    </article>

    <!-- related articles -->
    <section
      v-if="related.length"
      class="max-w-[42rem] mx-auto px-6 pt-6 pb-[72px]"
    >
      <h2 class="text-[17px] font-bold text-slate-900 m-0 mb-[18px]">Continue lendo</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NuxtLink
          v-for="r in related"
          :key="r.slug"
          :to="`/guias/${r.slug}`"
          class="block bg-white border border-slate-100 rounded-[10px] p-5 no-underline shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 hover:shadow-[0_8px_20px_-14px_rgba(15,23,42,0.2)]"
        >
          <span class="text-[11px] font-semibold text-brand uppercase tracking-[0.04em]"
            >{{ r.category }}</span
          >
          <h3 class="text-[15.5px] font-bold leading-[1.3] mt-2 mb-0 text-slate-900">
            {{ r.title }}
          </h3>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.font-serif-prose {
  font-family: 'Source Serif 4', Georgia, serif;
}
.prose :deep(p) {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 18.5px;
  line-height: 1.75;
  color: #334155;
  margin: 0 0 22px;
}
.prose :deep(h2) {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin: 44px 0 16px;
  line-height: 1.25;
}
.prose :deep(h3) {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #0f172a;
  margin: 32px 0 12px;
}
.prose :deep(b),
.prose :deep(strong) {
  font-weight: 700;
  color: #0f172a;
}
.prose :deep(a) {
  color: #146c4e;
  text-decoration: underline;
}
.prose :deep(ul) {
  margin: 0 0 22px;
  padding-left: 4px;
  list-style: none;
}
.prose :deep(li) {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 18.5px;
  line-height: 1.7;
  color: #334155;
  margin: 0 0 12px;
  padding-left: 28px;
  position: relative;
}
.prose :deep(li)::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 11px;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #146c4e;
}
</style>
