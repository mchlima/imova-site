<script setup lang="ts">
import { type Assignee, initials, avatarColor } from '~/utils/opportunityModel'

// Seletor de responsáveis. v-model é a lista de Assignee[] selecionados (objetos
// { id, name }), para o pai poder atualizar avatares de forma otimista. A lista
// de candidatos vem do GET /users (cache compartilhado).
const props = defineProps<{ modelValue: Assignee[] }>()
const emit = defineEmits<{ 'update:modelValue': [Assignee[]] }>()

const { users, loadUsers } = useUsers()
loadUsers()

const openList = ref(false)
const selectedIds = computed(() => new Set(props.modelValue.map((a) => a.id)))

function toggle(id: string) {
  const set = new Set(selectedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  // reconstrói a lista de Assignee a partir dos usuários conhecidos
  const next = users.value.filter((u) => set.has(u.id)).map((u) => ({ id: u.id, name: u.name }))
  emit('update:modelValue', next)
}

// fecha ao clicar fora
const root = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (openList.value && root.value && !root.value.contains(e.target as Node)) openList.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative inline-flex items-center gap-2">
    <AvatarStack v-if="modelValue.length" :users="modelValue" :size="28" :max="5" />
    <button
      type="button"
      class="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-slate-300 text-slate-400 text-[15px] leading-none cursor-pointer bg-white hover:border-slate-400 hover:text-slate-600"
      title="Atribuir responsável"
      @click="openList = !openList"
    >
      +
    </button>

    <div
      v-if="openList"
      class="absolute top-full right-0 mt-1.5 z-[10] w-[240px] max-h-[280px] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-[0_8px_28px_-8px_rgba(15,23,42,0.25)] p-1.5"
    >
      <div v-if="!users.length" class="px-2 py-2 text-[12.5px] text-slate-400">Nenhum usuário.</div>
      <button
        v-for="u in users"
        :key="u.id"
        type="button"
        class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
        @click="toggle(u.id)"
      >
        <span
          class="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full text-white text-[11px] font-bold shrink-0"
          :style="{ backgroundColor: avatarColor(u.id) }"
        >
          {{ initials(u.name) }}
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-[13px] font-medium text-slate-800 truncate">{{ u.name }}</span>
        </span>
        <span
          class="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[5px] shrink-0 text-[11px]"
          :class="selectedIds.has(u.id) ? 'bg-brand text-white' : 'border border-slate-300 text-transparent'"
        >
          ✓
        </span>
      </button>
    </div>
  </div>
</template>
