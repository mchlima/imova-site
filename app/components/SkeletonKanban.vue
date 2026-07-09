<script setup lang="ts">
// Skeleton no formato do QUADRO (kanban): colunas com cards pulsando. Casa com a
// largura de coluna do board (w-[320px]).
withDefaults(defineProps<{ columns?: number; cards?: number }>(), { columns: 4, cards: 3 })
</script>

<template>
  <div class="flex gap-4 items-start overflow-hidden flex-1 min-h-0 px-4 sm:px-6 pb-4 sm:pb-6">
    <div
      v-for="col in columns"
      :key="col"
      class="w-[320px] shrink-0 bg-slate-100/70 rounded-xl p-2.5"
    >
      <div class="flex items-center justify-between mb-3 px-1">
        <AppSkeleton class="h-3.5 w-24" />
        <AppSkeleton class="h-[18px] w-6 rounded-full" />
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="n in cards"
          :key="n"
          class="bg-white border border-slate-200 rounded-[9px] p-3 flex flex-col gap-2"
        >
          <AppSkeleton class="h-3.5 w-3/4" />
          <AppSkeleton class="h-3 w-2/5" />
          <div class="flex items-center gap-2 pt-1">
            <AppSkeleton class="h-3 w-3 rounded-sm" />
            <AppSkeleton class="h-3 w-3 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
