<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

type Status = 'draft' | 'published' | 'changed' | 'archived'
interface PostRow {
  id: string
  title: string
  slug: string
  status: Status
  category: string | null
  author: string
  updatedAt: string
}

const { api } = useAdminApi()
const posts = ref<PostRow[]>([])
const catCount = ref(0)
const tagCount = ref(0)
const totalViews = ref(0)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [p, c, t, ov] = await Promise.all([
      api<PostRow[]>('/admin/posts'),
      api<unknown[]>('/admin/categories'),
      api<unknown[]>('/admin/tags'),
      api<{ totalViews: number }>('/admin/posts/analytics/overview').catch(() => ({
        totalViews: 0,
      })),
    ])
    posts.value = p
    catCount.value = c.length
    tagCount.value = t.length
    totalViews.value = ov.totalViews
  } finally {
    loading.value = false
  }
}
onMounted(load)

const count = (s: Status) => posts.value.filter((p) => p.status === s).length
const live = computed(() => count('published') + count('changed')) // no ar
const pending = computed(() => count('changed'))
const recent = computed(() => posts.value.slice(0, 6))

const stats = computed(() => [
  { label: 'Visualizações', value: totalViews.value, icon: 'eye', accent: true },
  { label: 'Posts no ar', value: live.value, icon: 'publish' },
  { label: 'Rascunhos', value: count('draft'), icon: 'draft' },
  { label: 'Categorias', value: catCount.value, icon: 'categorias', to: '/admin/categorias' },
  { label: 'Tags', value: tagCount.value, icon: 'tags', to: '/admin/tags' },
])

const statusInfo: Record<Status, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-600' },
  published: { label: 'Publicado', cls: 'bg-brand-soft text-brand' },
  changed: { label: 'Alterações não publicadas', cls: 'bg-[#FEF6E7] text-amber-700' },
  archived: { label: 'Arquivado', cls: 'bg-slate-200 text-slate-500' },
}
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader title="CMS" subtitle="Visão geral do conteúdo dos guias.">
      <template #actions>
        <NuxtLink
          to="/admin/posts"
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg no-underline hover:bg-slate-100"
        >
          <AdminIcon name="posts" :size="16" /> Ver posts
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- alerta de pendências -->
    <NuxtLink
      v-if="pending > 0"
      to="/admin/posts"
      class="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl bg-[#FEF6E7] border border-[#F5E0B8] no-underline"
    >
      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/30 text-amber-700 shrink-0">
        <AdminIcon name="publish" :size="16" />
      </span>
      <span class="text-[13.5px] text-amber-800">
        <b>{{ pending }}</b> {{ pending === 1 ? 'post tem' : 'posts têm' }} alterações não
        publicadas.
      </span>
      <span class="ml-auto text-[13px] font-semibold text-amber-800">Revisar →</span>
    </NuxtLink>

    <!-- stat cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <component
        :is="s.to ? 'NuxtLink' : 'div'"
        v-for="s in stats"
        :key="s.label"
        :to="s.to"
        class="bg-white border rounded-xl p-4 no-underline transition-all"
        :class="[
          s.accent ? 'border-[#C9E0D5]' : 'border-slate-200',
          s.to ? 'hover:border-slate-300 hover:shadow-[0_8px_20px_-14px_rgba(15,23,42,0.2)]' : '',
        ]"
      >
        <div class="flex items-center justify-between">
          <span
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg"
            :class="s.accent ? 'bg-brand-soft text-brand' : 'bg-slate-100 text-slate-500'"
          >
            <AdminIcon :name="s.icon" :size="18" />
          </span>
        </div>
        <div class="text-[28px] font-extrabold tracking-[-0.02em] text-slate-900 mt-3 leading-none">
          {{ s.value }}
        </div>
        <div class="text-[12.5px] text-slate-500 mt-1">{{ s.label }}</div>
      </component>
    </div>

    <div>
      <!-- posts recentes -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 class="text-[14px] font-bold text-slate-900 m-0">Posts recentes</h2>
          <NuxtLink to="/admin/posts" class="text-[13px] font-semibold text-brand no-underline"
            >Ver todos →</NuxtLink
          >
        </div>
        <table class="w-full border-collapse">
          <tbody>
            <tr
              v-for="p in recent"
              :key="p.id"
              class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
            >
              <td class="py-3 px-4">
                <NuxtLink
                  :to="`/admin/posts/${p.id}`"
                  class="text-[14px] font-semibold text-slate-900 no-underline hover:text-brand"
                  >{{ p.title }}</NuxtLink
                >
                <div class="text-[12px] text-slate-400">{{ p.category || 'Sem categoria' }}</div>
              </td>
              <td class="py-3 px-3">
                <span
                  class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold whitespace-nowrap"
                  :class="statusInfo[p.status].cls"
                  >{{ statusInfo[p.status].label }}</span
                >
              </td>
              <td class="py-3 px-4 text-[12.5px] text-slate-400 whitespace-nowrap text-right">
                {{ fmtDate(p.updatedAt) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="loading" class="py-10 text-center text-slate-400 text-[14px]">Carregando…</div>
        <div
          v-else-if="recent.length === 0"
          class="py-10 text-center text-slate-400 text-[14px]"
        >
          Nenhum post ainda.
        </div>
      </div>
    </div>
  </div>
</template>
