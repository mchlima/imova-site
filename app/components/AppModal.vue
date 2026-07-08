<script setup lang="ts">
// Reusable modal. v-model controls visibility. Closes on backdrop click and Esc.
const open = defineModel<boolean>({ default: false })
withDefaults(
  defineProps<{ title?: string; subtitle?: string; size?: 'sm' | 'md' | 'lg' }>(),
  { title: '', subtitle: '', size: 'md' },
)

const sizeCls = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
watch(open, (v) => {
  if (import.meta.client) {
    document.documentElement.style.overflow = v ? 'hidden' : ''
    if (v) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => {
  if (import.meta.client) {
    document.documentElement.style.overflow = ''
    window.removeEventListener('keydown', onKey)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-[2px] px-4 py-8"
        @click.self="open = false"
      >
        <div
          class="w-full bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] my-auto"
          :class="sizeCls[size]"
          @click.stop
        >
          <div
            v-if="title || $slots.header"
            class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100"
          >
            <slot name="header">
              <div>
                <h2 class="text-[18px] font-extrabold tracking-[-0.01em] text-slate-900 m-0">
                  {{ title }}
                </h2>
                <p v-if="subtitle" class="text-[13px] text-slate-500 mt-1 mb-0">{{ subtitle }}</p>
              </div>
            </slot>
            <button
              class="shrink-0 inline-flex items-center justify-center w-8 h-8 -mr-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer border-none bg-transparent"
              aria-label="Fechar"
              @click="open = false"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="px-6 py-5"><slot /></div>

          <div
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
