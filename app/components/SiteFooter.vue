<script setup lang="ts">
const linkCls = 'text-[14px] text-slate-400 no-underline hover:text-slate-200 transition-colors'
const headCls =
  'text-[12px] font-semibold uppercase tracking-[0.06em] text-white mb-3.5'
</script>

<template>
  <footer class="w-full bg-slate-900 text-slate-400">
    <div class="max-w-[87.5rem] mx-auto px-6 pt-14 pb-8">
      <div class="flex flex-wrap gap-12 justify-between">
        <div class="max-w-[300px]">
          <div class="flex items-center gap-[9px] mb-3.5">
            <span
              class="inline-flex items-center justify-center w-[30px] h-[30px] bg-brand rounded-[7px]"
            >
              <span
                class="block w-[11px] h-[11px] border-[2.5px] border-white rounded-[3px]"
              ></span>
            </span>
            <span class="text-[19px] font-extrabold tracking-[-0.02em] text-white"
              >ReveLar</span
            >
          </div>
          <p class="text-[14px] leading-[1.6] text-slate-400 m-0">
            Planejamento imobiliário e inteligência de crédito. A gente calcula os
            números reais e te conecta a um corretor parceiro que cuida de tudo — do
            cálculo à chave na mão.
          </p>
          <p class="text-[12.5px] leading-[1.6] text-slate-500 mt-[18px] mb-0">
            Não somos um banco e não vendemos crédito. Jogamos do seu lado.
          </p>
          <a
            href="https://instagram.com/meurevelar"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 mt-[18px] text-[13.5px] text-slate-400 no-underline hover:text-slate-200 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            @meurevelar
          </a>
        </div>

        <div class="flex flex-wrap gap-12">
          <div>
            <div :class="headCls">Produto</div>
            <div class="flex flex-col gap-[11px]">
              <NuxtLink to="/simulador-avancado" :class="linkCls">Simulador avançado</NuxtLink>
              <NuxtLink to="/" :class="linkCls">Como funciona</NuxtLink>
              <NuxtLink to="/guias" :class="linkCls">Guias</NuxtLink>
            </div>
          </div>
          <div>
            <div :class="headCls">Conteúdo</div>
            <div class="flex flex-col gap-[11px]">
              <NuxtLink to="/guias" :class="linkCls">Financiamento</NuxtLink>
              <NuxtLink to="/guias" :class="linkCls">Impostos e taxas</NuxtLink>
              <NuxtLink to="/guias" :class="linkCls">FGTS</NuxtLink>
            </div>
          </div>
          <div>
            <div :class="headCls">Legal</div>
            <div class="flex flex-col gap-[11px]">
              <NuxtLink to="/termos-de-uso" :class="linkCls">Termos de uso</NuxtLink>
              <NuxtLink to="/politica-de-privacidade" :class="linkCls"
                >Política de privacidade</NuxtLink
              >
              <NuxtLink to="/admin/login" :class="linkCls">Área restrita</NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div
        class="mt-12 pt-6 border-t border-slate-800 flex flex-wrap gap-3 justify-between items-center"
      >
        <span class="text-[13px] text-slate-500"
          >© 2026 ReveLar · Plataforma nacional e independente</span
        >
        <span class="text-[13px] text-slate-500"
          >As simulações são estimativas e não constituem oferta de crédito.</span
        >
      </div>
    </div>
  </footer>
</template>
