<script setup lang="ts">
// Skeleton no formato de TABELA/LISTA (linhas pulsando). Use no carregamento
// inicial de páginas com tabela. `rows`/`cols` ajustam a densidade.
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 6, cols: 4 })
</script>

<template>
  <div class="w-full">
    <div
      v-for="r in rows"
      :key="r"
      class="flex items-center gap-4 px-4 sm:px-5 py-3.5 border-b border-slate-100 last:border-b-0"
    >
      <AppSkeleton
        v-for="c in cols"
        :key="c"
        class="h-3.5"
        :class="c === 1 ? 'w-40 max-w-[42%]' : 'flex-1 max-w-[130px]'"
      />
    </div>
  </div>
</template>
