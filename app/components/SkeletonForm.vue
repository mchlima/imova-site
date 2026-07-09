<script setup lang="ts">
// Skeleton no formato de FORMULÁRIO (páginas de configurações): título de seção +
// campos (rótulo + input) pulsando. `rows` = quantidade de campos.
withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>

<template>
  <div class="max-w-[840px] flex flex-col gap-5">
    <AppSkeleton class="h-5 w-44" />
    <div v-for="r in rows" :key="r" class="flex flex-col gap-2">
      <AppSkeleton class="h-3.5 w-28" />
      <AppSkeleton class="h-10 w-full rounded-lg" />
    </div>
  </div>
</template>
