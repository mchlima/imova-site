<script setup lang="ts">
// Seletor em formato de chip: fechado mostra um chip colorido; aberto lista as
// opções também como chips coloridos. Substitui o <select> nativo (que não
// estiliza opções e duplica o chevron).
interface Opt {
  value: string
  label: string
  color: string // hex
}
const props = defineProps<{ modelValue: string; options: Opt[] }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const openList = ref(false)
const current = computed(() => props.options.find((o) => o.value === props.modelValue))
const chipStyle = (color: string) => ({ color, backgroundColor: color + '1F' })

function pick(v: string) {
  openList.value = false
  if (v !== props.modelValue) emit('update:modelValue', v)
}
</script>

<template>
  <div class="relative inline-block">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 h-[30px] pl-3 pr-2.5 rounded-full text-[12.5px] font-semibold cursor-pointer border-none"
      :style="chipStyle(current?.color || '#94A3B8')"
      @click="openList = !openList"
    >
      <span>{{ current?.label || modelValue || '—' }}</span>
      <AdminIcon name="chevron" :size="13" class="opacity-70 shrink-0" />
    </button>

    <template v-if="openList">
      <div class="fixed inset-0 z-[45]" @click="openList = false"></div>
      <div
        class="absolute left-0 top-[34px] z-[46] min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] p-1.5 flex flex-col gap-1"
      >
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          class="inline-flex items-center justify-between gap-2 h-[30px] px-2.5 rounded-full text-[12.5px] font-semibold cursor-pointer border-none text-left"
          :style="chipStyle(o.color)"
          @click="pick(o.value)"
        >
          <span>{{ o.label }}</span>
          <span v-if="o.value === modelValue" class="text-[11px] leading-none">✓</span>
        </button>
      </div>
    </template>
  </div>
</template>
