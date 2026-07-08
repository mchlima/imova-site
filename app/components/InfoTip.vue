<script setup lang="ts">
// Small "?" affordance that reveals an explanatory popover on hover/focus/click.
// Use to explain SEO/GEO fields without cluttering the form.
withDefaults(defineProps<{ width?: number }>(), { width: 260 })
const open = ref(false)
</script>

<template>
  <span
    class="relative inline-flex align-middle"
    @mouseenter="open = true"
    @mouseleave="open = false"
  >
    <button
      type="button"
      class="inline-flex items-center justify-center w-[16px] h-[16px] rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold cursor-help border-none hover:bg-slate-300 transition-all"
      aria-label="Ajuda"
      @click.stop="open = !open"
      @focus="open = true"
      @blur="open = false"
    >
      ?
    </button>
    <Transition
      enter-active-class="transition-all duration-100"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition-all duration-100"
      leave-to-class="opacity-0 translate-y-1"
    >
      <span
        v-if="open"
        class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 block rounded-lg bg-slate-900 text-white text-[12px] leading-[1.5] font-normal px-3 py-2 shadow-lg normal-case tracking-normal text-left"
        :style="{ width: width + 'px' }"
      >
        <slot />
        <span
          class="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-900 rotate-45 -mt-1"
        ></span>
      </span>
    </Transition>
  </span>
</template>
