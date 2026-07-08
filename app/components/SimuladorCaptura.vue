<script setup lang="ts">
import { fmtBRL } from '~/utils/opportunityModel'
import { monthlyRate, sacFirst, sacLast } from '~/utils/financing'

// Simulador em 3 passos para as LPs de empreendimento:
//   1) valores  →  2) dados de contato  →  3) resultado
// Ao confirmar para ver o resultado, o lead já é enviado ao CRM (POST /capture).
const props = withDefaults(
  defineProps<{
    source: string
    propertyValue: number
    city?: string
    uf?: string
    annualRate?: number
    term?: number
  }>(),
  { annualRate: 0.08, term: 360 },
)
const emit = defineEmits<{ sent: [] }>()

const { submitCapture } = useCapture()

const step = ref<1 | 2 | 3>(1)

// passo 1 — valores
const propertyValue = ref(props.propertyValue)
const downPayment = ref(Math.round(props.propertyValue * 0.1))
const income = ref(0)
const hasFgts = ref(false)
const fgts = ref(0)
const fgtsValue = computed(() => (hasFgts.value ? fgts.value : 0))

// passo 2 — dados
const name = ref('')
const email = ref('')
const whatsapp = ref('')
const consent = ref(false)

const loading = ref(false)
const error = ref('')
const sent = ref(false)

const financed = computed(() =>
  Math.max(0, propertyValue.value - downPayment.value - fgtsValue.value),
)
const i = computed(() => monthlyRate(props.annualRate))
// SAC: 1ª parcela (a maior) e última parcela (a menor) — mostra a queda ao longo do prazo.
const parcelaInicial = computed(() =>
  financed.value > 0 ? sacFirst(financed.value, i.value, props.term) : 0,
)
const parcelaFinal = computed(() =>
  financed.value > 0 ? sacLast(financed.value, i.value, props.term) : 0,
)

const simuladorFields = computed(() => ({
  simulador: {
    propertyValue: propertyValue.value,
    downPayment: downPayment.value,
    income: income.value,
    fgts: fgtsValue.value,
    uf: props.uf ?? '',
    city: props.city ?? '',
    interestRate: +(props.annualRate * 100).toFixed(2),
    amortization: 'SAC',
  },
}))

const digits = (v: string) => {
  const d = (v || '').replace(/\D/g, '')
  return d ? parseInt(d, 10) : 0
}
const pct = computed(() =>
  propertyValue.value > 0 ? Math.round((downPayment.value / propertyValue.value) * 100) : 0,
)

function goToDados() {
  if (propertyValue.value <= 0) {
    error.value = 'Informe o valor do imóvel.'
    return
  }
  if (hasFgts.value && fgts.value <= 0) {
    error.value = 'Informe o valor do seu FGTS.'
    return
  }
  error.value = ''
  step.value = 2
}

// contagem animada dos números do resultado (delícia visual)
const displayInicial = ref(0)
const displayFinal = ref(0)
function animateTo(target: number, set: (v: number) => void) {
  const start = performance.now()
  const from = 0
  const dur = 750
  function tick(now: number) {
    const t = Math.min(1, (now - start) / dur)
    const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
    set(from + (target - from) * eased)
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
watch(step, (s) => {
  if (s === 3) {
    animateTo(parcelaInicial.value, (v) => (displayInicial.value = v))
    animateTo(parcelaFinal.value, (v) => (displayFinal.value = v))
  }
})

// confirma os dados, envia ao CRM (uma única vez) e mostra o resultado
async function verResultado() {
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
  error.value = ''

  if (sent.value) {
    step.value = 3
    return
  }

  loading.value = true
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
      fields: simuladorFields.value,
      city: props.city,
      uf: props.uf,
    })
    sent.value = true
    emit('sent')
    step.value = 3
  } catch {
    error.value = 'Não foi possível enviar. Tente novamente.'
  } finally {
    loading.value = false
  }
}

const STEPS = [
  { n: 1, label: 'Valores' },
  { n: 2, label: 'Seus dados' },
  { n: 3, label: 'Resultado' },
]

const stepT = {
  enterActiveClass: 'transition-all duration-300 ease-out',
  enterFromClass: 'opacity-0 translate-x-5',
  leaveActiveClass: 'transition-all duration-200 ease-in',
  leaveToClass: 'opacity-0 -translate-x-5',
}

const money =
  'w-full h-[52px] pl-11 pr-3 text-[18px] font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10'
const field =
  'w-full h-[50px] px-4 text-[15px] text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10'
const lbl = 'block text-[12.5px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-2'
</script>

<template>
  <div class="rounded-[26px] overflow-hidden bg-white ring-1 ring-slate-200/80 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.4)] grid md:grid-cols-[280px_1fr]">
    <!-- PAINEL ESQUERDO: gradiente + passos verticais -->
    <div class="relative px-7 py-7 bg-gradient-to-br from-brand to-emerald-700 text-white overflow-hidden flex flex-col">
      <div class="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 blur-2xl"></div>
      <div class="absolute -bottom-20 -left-8 w-48 h-48 rounded-full bg-emerald-300/20 blur-2xl"></div>

      <div class="relative">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-[17px]">⚡</span>
          <span class="text-[11.5px] font-bold uppercase tracking-[0.12em] text-emerald-50/90">Simulador rápido</span>
        </div>
        <h3 class="text-[22px] font-extrabold tracking-[-0.02em] leading-[1.15] m-0">Descubra sua parcela em 3 passos</h3>
      </div>

      <!-- passos (verticais) -->
      <div class="relative mt-6">
        <template v-for="(s, idx) in STEPS" :key="s.n">
          <div class="flex items-center gap-3">
            <span
              class="inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-extrabold transition-all shrink-0"
              :class="step > s.n ? 'bg-white text-brand' : step === s.n ? 'bg-white text-brand ring-4 ring-white/30' : 'bg-white/20 text-white/70'"
              >{{ step > s.n ? '✓' : s.n }}</span
            >
            <span class="text-[13.5px] font-semibold" :class="step >= s.n ? 'text-white' : 'text-white/60'">{{ s.label }}</span>
          </div>
          <div v-if="idx < STEPS.length - 1" class="ml-[13px] w-[2px] h-4 my-1 transition-all" :class="step > s.n ? 'bg-white' : 'bg-white/25'"></div>
        </template>
      </div>

      <p class="relative mt-auto pt-6 text-[12px] leading-relaxed text-emerald-50/75">
        Estimativa no Minha Casa Minha Vida ({{ (props.annualRate * 100).toFixed(0) }}% a.a., {{ props.term / 12 }} anos). Taxa e subsídio dependem da sua faixa de renda.
      </p>
    </div>

    <!-- CORPO -->
    <div class="relative p-7">
      <Transition v-bind="stepT" mode="out-in">
        <div :key="step">
          <!-- PASSO 1: VALORES -->
          <div v-if="step === 1">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div>
                <label :class="lbl">Valor do imóvel</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 font-semibold">R$</span>
                  <input :value="propertyValue.toLocaleString('pt-BR')" :class="money" inputmode="numeric" @input="propertyValue = digits(($event.target as HTMLInputElement).value)" />
                </div>
              </div>
              <div>
                <label :class="lbl">Entrada</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 font-semibold">R$</span>
                  <input :value="downPayment.toLocaleString('pt-BR')" :class="money" inputmode="numeric" @input="downPayment = digits(($event.target as HTMLInputElement).value)" />
                </div>
                <span class="block text-[11.5px] text-slate-400 mt-1.5">{{ pct }}% do imóvel</span>
              </div>
              <div>
                <label :class="lbl">Renda familiar</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 font-semibold">R$</span>
                  <input :value="income ? income.toLocaleString('pt-BR') : ''" :class="money" inputmode="numeric" placeholder="0" @input="income = digits(($event.target as HTMLInputElement).value)" />
                </div>
              </div>
            </div>

            <!-- FGTS opcional -->
            <div class="mb-5">
              <label
                class="flex items-center gap-3 h-[52px] px-4 rounded-xl border cursor-pointer select-none transition-all"
                :class="hasFgts ? 'border-brand bg-brand-soft ring-4 ring-brand/10' : 'border-slate-200 bg-slate-50 hover:border-slate-300'"
              >
                <input v-model="hasFgts" type="checkbox" class="w-[18px] h-[18px] accent-brand shrink-0" />
                <span class="text-[14.5px] font-semibold text-slate-700 flex-1">Tenho FGTS para usar na entrada</span>
                <span class="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">opcional</span>
              </label>
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                leave-active-class="transition-all duration-150 ease-in"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div v-if="hasFgts" class="mt-3">
                  <label :class="lbl">Saldo de FGTS</label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 font-semibold">R$</span>
                    <input :value="fgts ? fgts.toLocaleString('pt-BR') : ''" :class="money" inputmode="numeric" placeholder="0" @input="fgts = digits(($event.target as HTMLInputElement).value)" />
                  </div>
                  <span class="block text-[11.5px] text-slate-400 mt-1.5">Abate direto do valor financiado.</span>
                </div>
              </Transition>
            </div>

            <div class="flex items-center justify-between gap-3 bg-brand-soft rounded-xl px-4 py-3 mb-5">
              <span class="text-[13px] font-semibold text-slate-600">Valor a financiar</span>
              <span class="text-[17px] font-extrabold text-brand">{{ fmtBRL(financed) }}</span>
            </div>

            <p v-if="error" class="text-[13px] text-red-600 font-medium mb-3">{{ error }}</p>
            <button class="group w-full h-[54px] bg-brand text-white text-[16px] font-bold rounded-xl cursor-pointer border-none hover:bg-brand-dark transition-all shadow-[0_10px_24px_-10px_rgba(20,108,78,0.7)]" @click="goToDados">
              Continuar
              <span class="inline-block ml-1.5 transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>

          <!-- PASSO 2: DADOS -->
          <div v-else-if="step === 2">
            <p class="text-[14px] text-slate-500 m-0 mb-5">Só falta você. Preencha para ver o resultado — e um corretor parceiro já recebe sua simulação.</p>
            <div class="flex flex-col gap-3 mb-4">
              <div>
                <label :class="lbl">Nome</label>
                <input v-model="name" :class="field" placeholder="Como podemos te chamar?" autocomplete="name" />
              </div>
              <div>
                <label :class="lbl">E-mail</label>
                <input v-model="email" :class="field" type="email" placeholder="seu@email.com" autocomplete="email" />
              </div>
              <div>
                <label :class="lbl">WhatsApp</label>
                <input v-model="whatsapp" :class="field" placeholder="(11) 90000-0000" autocomplete="tel" />
              </div>
              <label class="flex items-start gap-2.5 cursor-pointer text-[12.5px] text-slate-500 leading-snug mt-1">
                <input v-model="consent" type="checkbox" class="w-[18px] h-[18px] mt-0.5 accent-brand shrink-0" />
                <span>Autorizo o contato e o compartilhamento dos meus dados com um corretor parceiro, conforme a
                  <NuxtLink to="/politica-de-privacidade" class="text-brand underline">Política de Privacidade</NuxtLink>.</span>
              </label>
            </div>
            <p v-if="error" class="text-[13px] text-red-600 font-medium mb-3">{{ error }}</p>
            <div class="flex items-center gap-3">
              <button class="h-[54px] px-5 text-[15px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all" @click="step = 1">
                ← Voltar
              </button>
              <button class="flex-1 h-[54px] bg-brand text-white text-[16px] font-bold rounded-xl cursor-pointer border-none hover:bg-brand-dark transition-all shadow-[0_10px_24px_-10px_rgba(20,108,78,0.7)] disabled:opacity-60" :disabled="loading" @click="verResultado">
                {{ loading ? 'Enviando…' : 'Ver minha parcela ✨' }}
              </button>
            </div>
          </div>

          <!-- PASSO 3: RESULTADO -->
          <div v-else class="text-center">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-soft text-brand text-[26px] mb-3">🎉</div>
            <h4 class="text-[19px] font-extrabold text-slate-900 m-0 mb-1">Sua simulação está pronta!</h4>
            <p class="text-[13.5px] text-slate-500 m-0 mb-6">Um corretor parceiro já recebeu seus dados e vai falar com você.</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 text-left">
              <div class="relative rounded-2xl px-6 py-6 bg-gradient-to-br from-brand to-emerald-700 text-white overflow-hidden">
                <div class="absolute -top-10 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl"></div>
                <div class="relative">
                  <span class="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-emerald-50/90 mb-1.5">1ª parcela ↓</span>
                  <span class="block text-[34px] font-extrabold tracking-[-0.02em] leading-none">{{ fmtBRL(Math.round(displayInicial)) }}</span>
                  <span class="block text-[12px] text-emerald-50/80 mt-2">Como fica no início (SAC)</span>
                </div>
              </div>
              <div class="relative rounded-2xl px-6 py-6 bg-emerald-50 border border-brand/20 overflow-hidden">
                <div class="absolute -bottom-10 -right-6 w-28 h-28 rounded-full bg-brand/10 blur-xl"></div>
                <div class="relative">
                  <span class="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-brand mb-1.5">Última parcela ✓</span>
                  <span class="block text-[34px] font-extrabold tracking-[-0.02em] leading-none text-brand">{{ fmtBRL(Math.round(displayFinal)) }}</span>
                  <span class="block text-[12px] text-emerald-800/70 mt-2">Como termina, depois de cair todo mês</span>
                </div>
              </div>
            </div>

            <p class="text-[13px] font-semibold text-slate-600 mb-3">No SAC, a parcela vai de {{ fmtBRL(parcelaInicial) }} até {{ fmtBRL(parcelaFinal) }} ao longo de {{ props.term / 12 }} anos.</p>
            <p class="text-[12.5px] text-slate-400 mb-4">Financiando {{ fmtBRL(financed) }}. Valores estimados — as condições finais são confirmadas pelo banco.</p>
            <button class="h-11 px-5 text-[14px] font-semibold text-brand bg-white border border-brand/30 rounded-xl cursor-pointer hover:bg-brand-soft transition-all" @click="step = 1">
              Refazer simulação
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
