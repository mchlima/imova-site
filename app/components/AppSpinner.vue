<script setup lang="ts">
// Spinner animado para AÇÕES inline (botões, refresh, salvar). Herda a cor via
// currentColor. Ex.: <AppSpinner :size="16" /> dentro de um botão.
withDefaults(defineProps<{ size?: number | string }>(), { size: 16 })
</script>

<template>
  <svg
    class="animate-spin shrink-0"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
  </svg>
</template>
