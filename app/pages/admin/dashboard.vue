<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

import { oppCity, oppUf, oppPropertyValue } from '~/utils/opportunityModel'

const apiBase = useRuntimeConfig().public.apiBase

interface Opportunity {
  id: string
  contact: { name: string }
  stageId: string | null
  temperature: string
  fields: Record<string, unknown>
  createdAt: string
}

const { loadStages, stages } = useStages()
loadStages()

const opportunities = ref<Opportunity[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    opportunities.value = await $fetch<Opportunity[]>('/opportunities', {
      baseURL: apiBase,
      credentials: 'include',
    })
  } catch {
    /* o middleware de auth já cobre o não-autenticado */
  } finally {
    loading.value = false
  }
})

const count = (fn: (l: Opportunity) => boolean) => opportunities.value.filter(fn).length
// resolve estágios por rótulo (o funil é dado; não há mais key fixa)
const stageIds = (re: RegExp) =>
  new Set(stages.value.filter((s) => re.test(s.label)).map((s) => s.id))
const novoIds = computed(() => stageIds(/lead|novo/i))
const qualIds = computed(() => stageIds(/qualific/i))
const inStages = (l: Opportunity, ids: Set<string>) => !!l.stageId && ids.has(l.stageId)

const cards = computed(() => [
  { label: 'Total de oportunidades', value: opportunities.value.length, accent: 'text-slate-900' },
  { label: 'Novos', value: count((l) => inStages(l, novoIds.value)), accent: 'text-[#1E40AF]' },
  {
    label: 'Em qualificação',
    value: count((l) => inStages(l, qualIds.value)),
    accent: 'text-amber-700',
  },
  { label: 'Quentes', value: count((l) => l.temperature === 'Quente'), accent: 'text-brand' },
])

const fmt = (n: number) => (n ? 'R$ ' + Math.round(n).toLocaleString('pt-BR') : '—')
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
const recent = computed(() => opportunities.value.slice(0, 5))
</script>

<template>
  <div class="p-4 sm:p-6">
    <PageHeader title="Dashboard" subtitle="Visão geral da triagem de oportunidades." />

    <!-- CARDS -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div
        v-for="c in cards"
        :key="c.label"
        class="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        <div class="text-[12.5px] font-semibold text-slate-500 mb-2">{{ c.label }}</div>
        <div class="text-[28px] font-extrabold tracking-[-0.02em]" :class="c.accent">
          {{ loading ? '—' : c.value }}
        </div>
      </div>
    </div>

    <!-- ÚLTIMAS OPORTUNIDADES -->
    <div
      class="bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden"
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="text-[15px] font-bold text-slate-900 m-0">Últimas oportunidades</h2>
        <NuxtLink
          to="/admin/pipelines"
          class="text-[13px] font-semibold text-brand no-underline"
          >Ver todos →</NuxtLink
        >
      </div>

      <div v-if="loading" class="px-5 py-10 text-center text-slate-400 text-[14px]">
        Carregando…
      </div>
      <div
        v-else-if="recent.length === 0"
        class="px-5 py-10 text-center text-slate-400 text-[14px]"
      >
        Nenhuma oportunidade ainda. Elas aparecem aqui assim que alguém usa o simulador.
      </div>
      <table v-else class="w-full border-collapse">
        <tbody>
          <tr
            v-for="l in recent"
            :key="l.id"
            class="border-b border-slate-100 last:border-0"
          >
            <td class="px-5 py-3 text-[14px] font-semibold text-slate-900">{{ l.contact.name }}</td>
            <td class="px-3 py-3 text-[13px] text-slate-500">{{ oppCity(l) || '—' }}{{ oppUf(l) ? '/' + oppUf(l) : '' }}</td>
            <td class="px-3 py-3 text-right text-[13px] font-semibold text-slate-700">
              {{ fmt(oppPropertyValue(l)) }}
            </td>
            <td class="px-5 py-3 text-right text-[12.5px] text-slate-400 whitespace-nowrap">
              {{ fmtDate(l.createdAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
