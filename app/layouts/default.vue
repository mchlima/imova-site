<script setup lang="ts">
// JSON-LD do negócio + área de atuação (RMSP) em todas as páginas públicas — SEO/GEO.
const origin = useRuntimeConfig().public.siteUrl || useRequestURL().origin
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(realEstateAgentLd(origin)),
    },
  ],
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50">
    <SiteHeader />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
