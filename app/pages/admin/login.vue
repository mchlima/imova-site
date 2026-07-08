<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const { login } = useAuth()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref(false)
const errorMsg = ref('')

async function signIn() {
  if (!/.+@.+\..+/.test(email.value)) {
    error.value = true
    errorMsg.value = 'Informe um e-mail válido.'
    return
  }
  if (!password.value) {
    error.value = true
    errorMsg.value = 'Informe sua senha.'
    return
  }
  loading.value = true
  error.value = false
  try {
    // POST /auth/login — o backend valida e devolve um cookie de sessão httpOnly.
    await login(email.value, password.value)
    await navigateTo('/admin/pipelines')
  } catch {
    error.value = true
    errorMsg.value = 'E-mail ou senha incorretos.'
    loading.value = false
  }
}

const inputCls =
  'w-full h-11 px-[13px] text-[14.5px] text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15'
</script>

<template>
  <div
    class="w-full min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background-image: linear-gradient(#0f172a08 1px, transparent 1px),
          linear-gradient(90deg, #0f172a08 1px, transparent 1px);
        background-size: 48px 48px;
        mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 100%);
        -webkit-mask-image: radial-gradient(
          ellipse 70% 60% at 50% 50%,
          #000 30%,
          transparent 100%
        );
      "
    ></div>

    <div class="relative w-full max-w-[29rem]">
      <div class="flex items-center justify-center gap-[9px] mb-7">
        <span
          class="inline-flex items-center justify-center w-[30px] h-[30px] bg-brand rounded-[7px]"
        >
          <span
            class="block w-[11px] h-[11px] border-[2.5px] border-white rounded-[3px]"
          ></span>
        </span>
        <span class="text-[20px] font-extrabold tracking-[-0.02em] text-slate-900"
          >Meu Revelar</span
        >
      </div>

      <div
        class="bg-white border border-slate-200 rounded-xl p-8 shadow-[0_10px_30px_-16px_rgba(15,23,42,0.18)]"
      >
        <h1 class="text-[21px] font-bold tracking-[-0.015em] m-0 mb-1 text-slate-900">
          Área restrita
        </h1>
        <p class="text-[13.5px] text-slate-500 m-0 mb-[26px]">
          Acesso da equipe de triagem de oportunidades.
        </p>

        <label class="block text-[13px] font-semibold text-slate-700 mb-[7px]"
          >E-mail</label
        >
        <input
          v-model="email"
          type="email"
          placeholder="voce@meurevelar.com.br"
          :class="[inputCls, 'mb-4']"
          @input="error = false"
        />

        <label class="block text-[13px] font-semibold text-slate-700 mb-[7px]"
          >Senha</label
        >
        <div class="relative mb-2">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            class="w-full h-11 pl-[13px] pr-11 text-[14.5px] text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            @input="error = false"
          />
          <button
            type="button"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 bg-transparent border-none text-[12px] font-semibold text-slate-500 cursor-pointer font-[inherit]"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Ocultar' : 'Mostrar' }}
          </button>
        </div>

        <div
          v-if="error"
          class="flex gap-2 items-center bg-red-50 border border-red-200 rounded-[7px] px-3 py-[9px] mb-4"
        >
          <span class="text-red-700 font-bold text-[13px]">!</span>
          <span class="text-[12.5px] text-red-700 font-medium">{{ errorMsg }}</span>
        </div>

        <button
          :disabled="loading"
          class="flex items-center justify-center gap-2 w-full h-12 text-white text-[15px] font-semibold border-none rounded-lg font-[inherit] transition-all"
          :class="loading ? 'bg-[#3F7D67] cursor-wait' : 'bg-brand cursor-pointer hover:bg-brand-dark'"
          @click="signIn"
        >
          <span
            v-if="loading"
            class="inline-block w-[15px] h-[15px] border-2 border-white/40 border-t-white rounded-full animate-spin"
          ></span>
          <span v-else>Entrar</span>
        </button>

        <p class="text-[11.5px] text-slate-400 text-center mt-[18px] mb-0 leading-[1.5]">
          A autenticação é validada no servidor. Esta tela não armazena senha no
          navegador.
        </p>
      </div>

      <div class="text-center mt-5">
        <NuxtLink to="/" class="text-[13px] text-slate-500 no-underline"
          >← Voltar ao site</NuxtLink
        >
      </div>
    </div>
  </div>
</template>
