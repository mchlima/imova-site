<script setup lang="ts" generic="T extends string | number">
// Select pesquisável (combobox) reutilizável. Opções { value, label }.
export interface Option<V> {
  value: V
  label: string
}

const props = withDefaults(
  defineProps<{
    options: Option<T>[]
    placeholder?: string
    searchPlaceholder?: string
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    placeholder: 'Selecione…',
    searchPlaceholder: 'Buscar…',
    disabled: false,
    loading: false,
  },
)

const model = defineModel<T | ''>({ default: '' })

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const searchEl = ref<HTMLInputElement | null>(null)

const selectedLabel = computed(
  () => props.options.find((o) => o.value === model.value)?.label ?? '',
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter((o) => o.label.toLowerCase().includes(q))
})

watch(filtered, () => (activeIndex.value = 0))

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    query.value = ''
    await nextTick()
    searchEl.value?.focus()
  }
}
function close() {
  open.value = false
}
function select(value: T) {
  model.value = value
  close()
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = filtered.value[activeIndex.value]
    if (opt) select(opt.value)
  } else if (e.key === 'Escape') {
    close()
  }
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      :disabled="disabled"
      class="w-full h-[38px] pl-[11px] pr-9 text-[13.5px] font-medium rounded-[7px] outline-none text-left flex items-center transition-all relative"
      :class="
        disabled
          ? 'text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed'
          : 'text-slate-900 border border-slate-300 bg-white cursor-pointer hover:border-slate-400'
      "
      @click="toggle"
    >
      <span :class="{ 'text-slate-400': !selectedLabel }" class="truncate">
        {{ loading ? 'Carregando…' : selectedLabel || placeholder }}
      </span>
      <svg
        class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 transition-transform"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div v-if="open" class="fixed inset-0 z-40" @click="close"></div>

    <div
      v-if="open"
      class="absolute left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-lg shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] overflow-hidden"
    >
      <div class="p-2 border-b border-slate-100">
        <input
          ref="searchEl"
          v-model="query"
          :placeholder="searchPlaceholder"
          class="w-full h-[34px] px-2.5 text-[13px] text-slate-900 border border-slate-200 rounded-md outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10"
          @keydown="onKeydown"
        />
      </div>
      <ul
        class="max-h-[260px] overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <li
          v-for="(o, i) in filtered"
          :key="o.value"
          class="px-3 py-2 text-[13.5px] cursor-pointer flex items-center justify-between"
          :class="[
            o.value === model ? 'text-brand font-semibold' : 'text-slate-700',
            i === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50',
          ]"
          @mouseenter="activeIndex = i"
          @click="select(o.value)"
        >
          <span class="truncate">{{ o.label }}</span>
          <svg
            v-if="o.value === model"
            class="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </li>
        <li
          v-if="filtered.length === 0"
          class="px-3 py-3 text-[13px] text-slate-400 text-center"
        >
          Nada encontrado.
        </li>
      </ul>
    </div>
  </div>
</template>
