<script setup lang="ts">
// Active menu item derived from the route (equivalent to the prototype's `active` prop).
const props = defineProps<{ active?: 'inicio' | 'imoveis' | 'guias' | 'sim' | '' }>()

const route = useRoute()
const active = computed(() => {
  if (props.active !== undefined) return props.active
  const p = route.path
  if (p === '/') return 'inicio'
  if (p.startsWith('/imoveis') || p.startsWith('/empreendimentos')) return 'imoveis'
  if (p.startsWith('/guias') || p.startsWith('/guia-')) return 'guias'
  if (p.startsWith('/simulador')) return 'sim'
  return ''
})

const linkBase =
  'inline-flex items-center h-[34px] px-3.5 text-[14px] no-underline rounded-md transition-all'
const linkOn = 'text-slate-900 bg-slate-100 font-semibold'
const linkOff = 'text-slate-600 font-medium bg-transparent'
const cls = (key: string) => [linkBase, active.value === key ? linkOn : linkOff]
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md backdrop-saturate-[1.8] border-b border-slate-200"
  >
    <div
      class="max-w-[87.5rem] mx-auto px-6 h-16 flex items-center justify-between gap-6"
    >
      <NuxtLink to="/" class="flex items-center gap-[9px] no-underline shrink-0">
        <span
          class="inline-flex items-center justify-center w-[30px] h-[30px] bg-brand rounded-[7px]"
        >
          <span
            class="block w-[11px] h-[11px] border-[2.5px] border-white rounded-[3px]"
          ></span>
        </span>
        <span class="text-[19px] font-extrabold tracking-[-0.02em] text-slate-900"
          >ReveLar</span
        >
      </NuxtLink>

      <nav class="hidden md:flex items-center gap-1">
        <NuxtLink to="/" :class="cls('inicio')">Início</NuxtLink>
        <NuxtLink to="/imoveis" :class="cls('imoveis')">Imóveis</NuxtLink>
        <NuxtLink to="/guias" :class="cls('guias')">Guias</NuxtLink>
        <NuxtLink to="/simulador-avancado" :class="cls('sim')">Simulador</NuxtLink>
      </nav>

      <div class="flex items-center gap-2.5 shrink-0">
        <NuxtLink
          to="/simulador-avancado"
          class="inline-flex items-center h-[38px] px-4 bg-brand text-white text-[14px] font-semibold no-underline rounded-md transition-all shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-brand-dark"
          >Simular agora</NuxtLink
        >
      </div>
    </div>
  </header>
</template>
