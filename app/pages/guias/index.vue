<script setup lang="ts">
import { postToCard, type CmsCategoryNode, type CmsTag, type CmsPost } from '~/composables/useCms'

const cms = useCms()
const search = ref('')

const { data } = await useAsyncData('guias-index', async () => {
  const [categories, tags, posts] = await Promise.all([
    cms.categories().catch(() => [] as CmsCategoryNode[]),
    cms.tags().catch(() => [] as CmsTag[]),
    cms.posts().catch(() => [] as CmsPost[]),
  ])
  return { categories, tags, posts }
})

const categories = computed(() => data.value?.categories ?? [])
const tags = computed(() => data.value?.tags ?? [])
const cards = computed(() => (data.value?.posts ?? []).map(postToCard))

const filteredArticles = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return cards.value
  return cards.value.filter((a) =>
    (a.title + ' ' + a.summary + ' ' + a.category + ' ' + a.tags.join(' '))
      .toLowerCase()
      .includes(q),
  )
})
const resultLabel = computed(() =>
  search.value.trim() ? 'Resultados da busca' : 'Todos os guias',
)
const countText = computed(() => {
  const n = filteredArticles.value.length
  return n + (n === 1 ? ' guia' : ' guias')
})

useHead({
  title: 'Guias · Meu Revelar',
  meta: [
    {
      name: 'description',
      content:
        'Guias de financiamento imobiliário em português claro: SAC, Price, ITBI, FGTS, entrada e mais.',
    },
  ],
})
</script>

<template>
  <div class="w-full bg-white">
    <!-- HEADER + SEARCH -->
    <section class="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
      <div class="max-w-[87.5rem] mx-auto px-6 pt-14 pb-12">
        <div class="max-w-[52.5rem]">
          <h1
            class="text-[38px] leading-[1.12] font-extrabold tracking-[-0.03em] m-0 mb-4 text-slate-900"
          >
            Financiamento imobiliário sem termos difíceis.
          </h1>
          <p class="text-[18px] leading-[1.6] text-slate-600 m-0 mb-7">
            Respostas diretas para você decidir com segurança. Sem juridiquês, sem frieza
            de banco.
          </p>
          <div class="relative max-w-[38rem]">
            <span
              class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]"
              >⌕</span
            >
            <input
              v-model="search"
              placeholder="Buscar: ITBI, SAC, FGTS, entrada…"
              class="w-full h-[50px] pl-[42px] pr-4 text-[15px] text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] bg-white transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
        </div>
      </div>
    </section>

    <div
      class="max-w-[87.5rem] mx-auto px-6 pt-10 pb-20 grid grid-cols-1 lg:grid-cols-[248px_1fr] gap-11 items-start"
    >
      <!-- CATEGORY MENU (3 levels) -->
      <aside v-if="categories.length" class="hidden lg:block lg:sticky lg:top-[84px]">
        <div
          class="text-[12px] font-bold uppercase tracking-[0.06em] text-slate-400 mb-4"
        >
          Categorias
        </div>
        <nav class="flex flex-col gap-1">
          <div v-for="cat in categories" :key="cat.id" class="mb-2">
            <NuxtLink
              :to="`/guias/categoria/${cat.slug}`"
              class="block text-[14.5px] font-bold text-slate-900 no-underline py-1.5 tracking-[-0.01em]"
              >{{ cat.name }}</NuxtLink
            >
            <div
              v-if="cat.children.length"
              class="flex flex-col border-l-[1.5px] border-slate-100 ml-0.5 pl-3.5 mt-0.5"
            >
              <template v-for="sub in cat.children" :key="sub.id">
                <NuxtLink
                  :to="`/guias/categoria/${sub.slug}`"
                  class="text-[13.5px] font-medium text-slate-600 no-underline py-[5px]"
                  >{{ sub.name }}</NuxtLink
                >
                <NuxtLink
                  v-for="top in sub.children"
                  :key="top.id"
                  :to="`/guias/categoria/${top.slug}`"
                  class="text-[12.5px] text-slate-400 no-underline py-[3px] pl-3"
                  >{{ top.name }}</NuxtLink
                >
              </template>
            </div>
          </div>
        </nav>
      </aside>

      <!-- ARTICLE GRID -->
      <main class="min-w-0 lg:col-span-1" :class="{ 'lg:col-span-2': !categories.length }">
        <!-- tag cloud -->
        <div
          v-if="tags.length"
          class="flex gap-2 overflow-x-auto pb-3.5 mb-6 border-b border-slate-100 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          <NuxtLink
            v-for="t in tags"
            :key="t.id"
            :to="`/guias/tag/${t.slug}`"
            class="shrink-0 inline-flex items-center h-[30px] px-[13px] bg-slate-100 border border-slate-200 rounded-full text-[12.5px] font-medium text-slate-600 no-underline whitespace-nowrap transition-all hover:bg-brand-soft hover:border-[#C9E0D5] hover:text-brand"
            >#{{ t.name }}</NuxtLink
          >
        </div>

        <div class="flex items-baseline justify-between mb-5">
          <h2 class="text-[16px] font-bold text-slate-900 m-0">{{ resultLabel }}</h2>
          <span class="text-[13px] text-slate-400">{{ countText }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <GuiaCard v-for="a in filteredArticles" :key="a.slug" :article="a" />
        </div>

        <div
          v-if="filteredArticles.length === 0"
          class="text-center py-16 px-5 text-slate-400"
        >
          <p v-if="search.trim()" class="text-[15px] m-0">
            Nenhum guia encontrado para "<b class="text-slate-600">{{ search }}</b>".
          </p>
          <p v-else class="text-[15px] m-0">Nenhum guia publicado ainda.</p>
        </div>
      </main>
    </div>
  </div>
</template>
