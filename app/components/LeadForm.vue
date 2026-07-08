<script setup lang="ts">
// Formulário de captação reutilizável. Posta em POST /capture via useCapture.
// `source` identifica a origem (ex.: 'lp:ares-do-horto'); `fields` são os campos
// personalizados a anexar (ex.: seção 'simulador'); city/uf definem o estágio
// inicial via regra de área do site (dentro da RMSP → Lead; fora → Nutrição).
const props = withDefaults(
  defineProps<{
    source: string
    fields?: Record<string, Record<string, unknown>>
    city?: string
    uf?: string
    ctaLabel?: string
  }>(),
  { ctaLabel: 'Quero falar com um corretor' },
)
const emit = defineEmits<{ sent: [] }>()

const { submitCapture } = useCapture()

const name = ref('')
const email = ref('')
const whatsapp = ref('')
const consent = ref(false)
const loading = ref(false)
const done = ref(false)
const error = ref('')

async function submit() {
  if (!name.value.trim() || !email.value.trim() || !whatsapp.value.trim()) {
    error.value = 'Preencha nome, e-mail e WhatsApp.'
    return
  }
  if (!/.+@.+\..+/.test(email.value)) {
    error.value = 'Confira o formato do seu e-mail.'
    return
  }
  if (!consent.value) {
    error.value = 'É preciso autorizar o contato para continuar.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await submitCapture({
      source: props.source,
      contact: {
        name: name.value.trim(),
        channels: [
          { type: 'email', value: email.value.trim() },
          { type: 'whatsapp', value: whatsapp.value.trim() },
        ],
      },
      fields: props.fields,
      city: props.city,
      uf: props.uf,
    })
    done.value = true
    emit('sent')
  } catch {
    error.value = 'Não foi possível enviar. Tente novamente.'
  } finally {
    loading.value = false
  }
}

const input =
  'w-full h-11 px-[13px] text-[15px] text-slate-900 border border-slate-300 rounded-lg outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15'
</script>

<template>
  <div v-if="done" class="text-center py-6">
    <div class="text-[17px] font-bold text-slate-900 mb-1">Recebemos seu contato! 🎉</div>
    <p class="text-[14px] text-slate-500 m-0">Um corretor parceiro vai falar com você em breve.</p>
  </div>
  <form v-else class="flex flex-col gap-3" @submit.prevent="submit">
    <input v-model="name" :class="input" placeholder="Seu nome" autocomplete="name" />
    <input v-model="email" :class="input" type="email" placeholder="Seu e-mail" autocomplete="email" />
    <input v-model="whatsapp" :class="input" placeholder="Seu WhatsApp" autocomplete="tel" />

    <label class="flex items-start gap-2 cursor-pointer text-[12.5px] text-slate-500 leading-snug">
      <input v-model="consent" type="checkbox" class="w-4 h-4 mt-0.5 accent-brand shrink-0" />
      <span>Autorizo o contato e o compartilhamento dos meus dados com um corretor parceiro, conforme a
        <NuxtLink to="/politica-de-privacidade" class="text-brand underline">Política de Privacidade</NuxtLink>.</span>
    </label>

    <p v-if="error" class="text-[12.5px] text-red-600 font-medium m-0">{{ error }}</p>

    <button
      type="submit"
      class="h-12 bg-brand text-white text-[15px] font-semibold rounded-lg cursor-pointer border-none hover:bg-brand-dark transition-all disabled:opacity-60"
      :disabled="loading"
    >
      {{ loading ? 'Enviando…' : ctaLabel }}
    </button>
  </form>
</template>
