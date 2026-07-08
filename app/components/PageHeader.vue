<script setup lang="ts">
// Cabeçalho padrão das páginas: título + subtítulo opcional, com slot de ações à direita.
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="flex items-start justify-between gap-4 flex-wrap mb-6">
    <div>
      <h1 class="text-[22px] font-extrabold tracking-[-0.02em] text-slate-900 m-0">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-[14px] text-slate-500 mt-1 m-0">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="shrink-0 flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
