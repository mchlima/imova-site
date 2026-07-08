<script setup lang="ts">
// Entrada de /admin/pipelines: redireciona para o pipeline certo (route param).
// - board do usuário logado (dono) ou o primeiro;
// - deep-link ?oportunidade=<id> (vindo de Follow-up/Contatos): resolve o pipeline
//   da oportunidade e encaminha o param + a query.
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase
const route = useRoute()
const { pipelines, loadPipelines } = usePipelines()
const { user } = useAuth()

onMounted(async () => {
  await loadPipelines()
  const ordered = [...pipelines.value].sort((a, b) => a.order - b.order)

  let targetKey = ''
  const oppId = route.query.oportunidade as string | undefined
  if (oppId) {
    try {
      const opp = await $fetch<{ pipelineId: string | null }>(`/opportunities/${oppId}`, {
        baseURL: apiBase,
        credentials: 'include',
      })
      targetKey = pipelines.value.find((p) => p.id === opp.pipelineId)?.key || ''
    } catch {
      /* cai no board padrão abaixo */
    }
  }
  if (!targetKey) {
    const mine = user.value ? ordered.find((p) => p.ownerUserId === user.value!.id) : null
    targetKey = mine?.key || ordered[0]?.key || ''
  }
  if (targetKey) {
    const q = oppId ? `?oportunidade=${oppId}` : ''
    await navigateTo(`/admin/pipelines/${targetKey}${q}`, { replace: true })
  }
})
</script>

<template>
  <div class="p-6 text-slate-400 text-[14px]">Abrindo pipeline…</div>
</template>
