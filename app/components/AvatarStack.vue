<script setup lang="ts">
import { type Assignee, initials, avatarColor } from '~/utils/opportunityModel'

// Avatares empilhados dos responsáveis. Sobrepõe com um anel branco; acima de
// `max`, mostra um "+N". Tamanho configurável.
const props = withDefaults(
  defineProps<{ users: Assignee[]; size?: number; max?: number }>(),
  { size: 26, max: 4 },
)

const shown = computed(() => props.users.slice(0, props.max))
const extra = computed(() => Math.max(0, props.users.length - props.max))
// deslocamento da sobreposição proporcional ao tamanho
const overlap = computed(() => Math.round(props.size * 0.32))
const fontSize = computed(() => Math.round(props.size * 0.42))
</script>

<template>
  <div v-if="users.length" class="flex items-center">
    <div
      v-for="(u, i) in shown"
      :key="u.id"
      class="inline-flex items-center justify-center rounded-full text-white font-bold ring-2 ring-white shrink-0"
      :style="{
        width: size + 'px',
        height: size + 'px',
        fontSize: fontSize + 'px',
        backgroundColor: avatarColor(u.id),
        marginLeft: i === 0 ? '0' : `-${overlap}px`,
        zIndex: shown.length - i,
      }"
      :title="u.name"
    >
      {{ initials(u.name) }}
    </div>
    <div
      v-if="extra"
      class="inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold ring-2 ring-white shrink-0"
      :style="{
        width: size + 'px',
        height: size + 'px',
        fontSize: fontSize + 'px',
        marginLeft: `-${overlap}px`,
      }"
      :title="users.slice(max).map((u) => u.name).join(', ')"
    >
      +{{ extra }}
    </div>
  </div>
</template>
