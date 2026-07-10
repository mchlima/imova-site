<script setup lang="ts">
// Simulador de financiamento embutido na LP do empreendimento (3 passos):
//  1) dados financeiros (valor reaproveitado do imóvel, taxa 11,5% a.a. padrão,
//     renda, entrada, FGTS) + estimativa de subsídio do MCMV;
//  2) dados de contato (LGPD) → vira lead no CRM;
//  3) resultado com comparação SAC × Price.
import {
  monthlyRate,
  sacFirst,
  sacLast,
  priceInstallment,
  sacTotalPaid,
  priceTotalPaid,
} from '~/utils/financing'
import { mcmvBracket } from '~/utils/mcmv'
import { fmtBRL } from '~/utils/opportunityModel'

const props = defineProps<{
  propertyValue: number
  slug: string
  city?: string
  uf?: string
}>()

const { submitCapture } = useCapture()

const step = ref<1 | 2 | 3>(1)

// ── passo 1: dados financeiros ──
const propertyValue = ref(props.propertyValue || 0)
const rate = ref(11.5) // % a.a. (padrão)
const income = ref(0)
const downPayment = ref(0)
const fgts = ref(0)
const termYears = ref(30)
const TERMS = [20, 25, 30, 35]

// máscara simples de moeda (dígitos → inteiro)
const digits = (s: string) => {
  const d = (s || '').replace(/\D/g, '')
  return d ? parseInt(d, 10) : 0
}
const brl = (n: number) => (n ? n.toLocaleString('pt-BR') : '')

// ── cálculos ──
const mcmv = computed(() => (income.value > 0 ? mcmvBracket(income.value) : null))
const subsidy = computed(() => mcmv.value?.subsidy ?? 0)
const i = computed(() => monthlyRate((rate.value || 0) / 100))
const n = computed(() => termYears.value * 12)
const financed = computed(() =>
  Math.max(0, propertyValue.value - downPayment.value - fgts.value - subsidy.value),
)
const sacFirstV = computed(() => sacFirst(financed.value, i.value, n.value))
const sacLastV = computed(() => sacLast(financed.value, i.value, n.value))
const priceV = computed(() => priceInstallment(financed.value, i.value, n.value))
const sacTotal = computed(() => sacTotalPaid(financed.value, i.value, n.value))
const priceTotal = computed(() => priceTotalPaid(financed.value, i.value, n.value))
const sacInterest = computed(() => Math.max(0, sacTotal.value - financed.value))
const priceInterest = computed(() => Math.max(0, priceTotal.value - financed.value))
const jurosEconomizados = computed(() => Math.max(0, priceInterest.value - sacInterest.value))

// comprometimento de renda (limite usual de 30%)
const maxInstallment = computed(() => income.value * 0.3)
const incomeAlert = computed(
  () => income.value > 0 && financed.value > 0 && sacFirstV.value > maxInstallment.value,
)

// ── navegação ──
const error = ref('')
const loading = ref(false)
const sent = ref(false)

function goStep2() {
  if (propertyValue.value <= 0) {
    error.value = 'Informe o valor do imóvel.'
    return
  }
  if (income.value <= 0) {
    error.value = 'Informe sua renda mensal.'
    return
  }
  error.value = ''
  step.value = 2
}

// ── passo 2: contato (LGPD) ──
const name = ref('')
const email = ref('')
const whatsapp = ref('')
const consent = ref(false)

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
      source: `lp:${props.slug}:simulador`,
      contact: {
        name: name.value.trim(),
        channels: [
          { type: 'email', value: email.value.trim() },
          { type: 'whatsapp', value: whatsapp.value.trim() },
        ],
      },
      fields: {
        simulador: {
          valorImovel: propertyValue.value,
          renda: income.value,
          entrada: downPayment.value,
          fgts: fgts.value,
          taxaAnual: rate.value,
          prazoAnos: termYears.value,
          faixaMcmv: mcmv.value?.faixaLabel ?? '—',
          subsidioEstimado: subsidy.value,
          valorFinanciado: Math.round(financed.value),
          primeiraParcelaSac: Math.round(sacFirstV.value),
          parcelaPrice: Math.round(priceV.value),
        },
      },
      city: props.city,
      uf: props.uf,
    })
    sent.value = true
  } catch {
    error.value = 'Não foi possível enviar. Tente novamente.'
  } finally {
    loading.value = false
  }
  if (sent.value) step.value = 3
}

const STEPS = [
  { n: 1, label: 'Dados' },
  { n: 2, label: 'Contato' },
  { n: 3, label: 'Resultado' },
] as const

const inputBase =
  'w-full h-12 px-3.5 text-[15px] text-slate-900 border border-slate-300 rounded-xl outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15'
</script>

<template>
  <div class="rounded-[24px] border border-slate-200 bg-white overflow-hidden shadow-[0_20px_56px_-34px_rgba(15,23,42,0.4)]">
    <!-- cabeçalho + progresso -->
    <div class="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
      <div class="flex items-center gap-2.5">
        <template v-for="(s, idx) in STEPS" :key="s.n">
          <div class="flex items-center gap-2">
            <span
              class="w-7 h-7 rounded-full inline-flex items-center justify-center text-[12.5px] font-bold border-2 transition-colors"
              :class="
                step > s.n
                  ? 'bg-brand border-brand text-white'
                  : step === s.n
                    ? 'bg-brand border-brand text-white'
                    : 'bg-white border-slate-200 text-slate-300'
              "
            >
              <svg v-if="step > s.n" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              <template v-else>{{ s.n }}</template>
            </span>
            <span class="text-[13px] font-bold hidden sm:inline" :class="step >= s.n ? 'text-slate-900' : 'text-slate-400'">{{ s.label }}</span>
          </div>
          <span v-if="idx < STEPS.length - 1" class="flex-1 h-[2px] rounded-full" :class="step > s.n ? 'bg-brand' : 'bg-slate-200'"></span>
        </template>
      </div>
    </div>

    <div class="p-6 sm:p-8">
      <!-- ══ PASSO 1 — dados financeiros ══ -->
      <div v-if="step === 1">
        <h3 class="text-[19px] font-extrabold tracking-[-0.02em] text-slate-900 m-0">Seus dados financeiros</h3>
        <p class="text-[13.5px] text-slate-500 mt-1 mb-6">Ajuste os valores para simular. Já preenchemos o valor do imóvel para você.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Valor do imóvel</label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">R$</span>
              <input :value="brl(propertyValue)" @input="propertyValue = digits(($event.target as HTMLInputElement).value)" inputmode="numeric" :class="[inputBase, 'pl-10']" />
            </div>
          </div>
          <div>
            <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Renda familiar mensal</label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">R$</span>
              <input :value="brl(income)" @input="income = digits(($event.target as HTMLInputElement).value)" inputmode="numeric" placeholder="0" :class="[inputBase, 'pl-10']" />
            </div>
          </div>
          <div>
            <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Entrada</label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">R$</span>
              <input :value="brl(downPayment)" @input="downPayment = digits(($event.target as HTMLInputElement).value)" inputmode="numeric" placeholder="0" :class="[inputBase, 'pl-10']" />
            </div>
          </div>
          <div>
            <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">FGTS <span class="font-normal text-slate-400">(opcional)</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">R$</span>
              <input :value="brl(fgts)" @input="fgts = digits(($event.target as HTMLInputElement).value)" inputmode="numeric" placeholder="0" :class="[inputBase, 'pl-10']" />
            </div>
          </div>
          <div>
            <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Juros (% a.a.)</label>
            <input :value="String(rate).replace('.', ',')" @input="rate = parseFloat(($event.target as HTMLInputElement).value.replace(',', '.').replace(/[^\d.]/g, '')) || 0" inputmode="decimal" :class="inputBase" />
          </div>
          <div>
            <label class="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Prazo</label>
            <div class="flex gap-2">
              <button
                v-for="t in TERMS"
                :key="t"
                type="button"
                class="flex-1 h-12 rounded-xl border text-[13.5px] font-bold cursor-pointer transition-colors"
                :class="termYears === t ? 'border-brand bg-brand-soft text-brand' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'"
                @click="termYears = t"
              >
                {{ t }}a
              </button>
            </div>
          </div>
        </div>

        <!-- estimativa de subsídio MCMV -->
        <div v-if="mcmv" class="mt-5 rounded-xl border p-4" :class="mcmv.subsidized ? 'border-brand/25 bg-brand-soft/40' : 'border-slate-200 bg-slate-50/60'">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center h-[24px] px-2.5 rounded-full text-[12px] font-bold" :class="mcmv.subsidized ? 'bg-brand text-white' : 'bg-slate-200 text-slate-600'">Minha Casa Minha Vida · {{ mcmv.faixaLabel }}</span>
            <span v-if="mcmv.subsidized" class="text-[13.5px] font-bold text-brand">Subsídio estimado: {{ fmtBRL(subsidy) }}</span>
          </div>
          <p class="text-[12.5px] text-slate-500 mt-1.5 m-0">{{ mcmv.note }} <span class="text-slate-400">Valor estimado — a Caixa define na análise.</span></p>
        </div>

        <!-- alerta de comprometimento de renda -->
        <p v-if="incomeAlert" class="mt-4 text-[12.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 m-0">
          A 1ª parcela ({{ fmtBRL(sacFirstV) }}) passa de 30% da sua renda. Os bancos costumam limitar aí — considere aumentar a entrada ou o prazo.
        </p>

        <p v-if="error" class="text-[13px] text-red-600 font-medium mt-4 m-0">{{ error }}</p>

        <button type="button" class="w-full sm:w-auto mt-6 inline-flex items-center justify-center gap-1.5 h-12 px-6 bg-brand text-white text-[15px] font-bold rounded-xl cursor-pointer border-none hover:bg-brand-dark transition-colors" @click="goStep2">
          Continuar
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      </div>

      <!-- ══ PASSO 2 — contato ══ -->
      <div v-else-if="step === 2">
        <h3 class="text-[19px] font-extrabold tracking-[-0.02em] text-slate-900 m-0">Quase lá — pra quem enviamos o resultado?</h3>
        <p class="text-[13.5px] text-slate-500 mt-1 mb-6">Um corretor parceiro pode refinar a simulação com você, sem custo.</p>

        <div class="flex flex-col gap-3 max-w-[460px]">
          <input v-model="name" :class="inputBase" placeholder="Seu nome" autocomplete="name" />
          <input v-model="email" :class="inputBase" type="email" placeholder="Seu e-mail" autocomplete="email" />
          <input v-model="whatsapp" :class="inputBase" placeholder="Seu WhatsApp" autocomplete="tel" />
          <label class="flex items-start gap-2 cursor-pointer text-[12.5px] text-slate-500 leading-snug">
            <input v-model="consent" type="checkbox" class="w-4 h-4 mt-0.5 accent-brand shrink-0" />
            <span>Autorizo o contato e o compartilhamento dos meus dados com um corretor parceiro, conforme a
              <NuxtLink to="/politica-de-privacidade" class="text-brand underline">Política de Privacidade</NuxtLink>.</span>
          </label>
        </div>

        <p v-if="error" class="text-[13px] text-red-600 font-medium mt-4 m-0">{{ error }}</p>

        <div class="flex items-center gap-3 mt-6">
          <button type="button" class="inline-flex items-center gap-1.5 h-12 px-5 bg-white border border-slate-300 text-slate-700 text-[14px] font-semibold rounded-xl cursor-pointer hover:bg-slate-50" @click="step = 1; error = ''">
            Voltar
          </button>
          <button type="button" class="inline-flex items-center justify-center gap-1.5 h-12 px-6 bg-brand text-white text-[15px] font-bold rounded-xl cursor-pointer border-none hover:bg-brand-dark transition-colors disabled:opacity-60" :disabled="loading" @click="submit">
            <AppSpinner v-if="loading" :size="15" />
            {{ loading ? 'Enviando…' : 'Ver resultado' }}
          </button>
        </div>
      </div>

      <!-- ══ PASSO 3 — resultado ══ -->
      <div v-else>
        <h3 class="text-[19px] font-extrabold tracking-[-0.02em] text-slate-900 m-0">Sua simulação</h3>
        <p class="text-[13.5px] text-slate-500 mt-1 mb-6">Comparação entre os dois sistemas de amortização para o valor financiado.</p>

        <!-- resumo -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div class="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
            <div class="text-[11.5px] font-semibold text-slate-400 uppercase tracking-[0.04em]">Imóvel</div>
            <div class="text-[15px] font-extrabold text-slate-900 mt-0.5">{{ fmtBRL(propertyValue) }}</div>
          </div>
          <div class="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
            <div class="text-[11.5px] font-semibold text-slate-400 uppercase tracking-[0.04em]">Entrada + FGTS</div>
            <div class="text-[15px] font-extrabold text-slate-900 mt-0.5">{{ fmtBRL(downPayment + fgts) }}</div>
          </div>
          <div class="rounded-xl border p-3.5" :class="subsidy > 0 ? 'bg-brand-soft/50 border-brand/20' : 'bg-slate-50 border-slate-100'">
            <div class="text-[11.5px] font-semibold uppercase tracking-[0.04em]" :class="subsidy > 0 ? 'text-brand' : 'text-slate-400'">Subsídio MCMV</div>
            <div class="text-[15px] font-extrabold mt-0.5" :class="subsidy > 0 ? 'text-brand' : 'text-slate-900'">{{ subsidy > 0 ? fmtBRL(subsidy) : '—' }}</div>
          </div>
          <div class="rounded-xl bg-slate-900 p-3.5">
            <div class="text-[11.5px] font-semibold text-white/60 uppercase tracking-[0.04em]">Financiado</div>
            <div class="text-[15px] font-extrabold text-white mt-0.5">{{ fmtBRL(financed) }}</div>
          </div>
        </div>

        <!-- SAC × Price -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- SAC -->
          <div class="rounded-2xl border-2 border-brand/40 bg-white p-5 relative">
            <span class="absolute -top-2.5 left-5 inline-flex items-center h-[22px] px-2.5 rounded-full bg-brand text-white text-[11px] font-bold uppercase tracking-[0.05em]">Menos juros</span>
            <div class="text-[16px] font-extrabold text-slate-900">SAC</div>
            <p class="text-[12px] text-slate-500 mt-0.5 mb-4">Parcela começa maior e diminui todo mês.</p>
            <div class="flex flex-col gap-2.5">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-[13px] text-slate-500">1ª parcela</span>
                <span class="text-[18px] font-extrabold text-slate-900">{{ fmtBRL(sacFirstV) }}</span>
              </div>
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-[13px] text-slate-500">Última parcela</span>
                <span class="text-[14px] font-bold text-slate-700">{{ fmtBRL(sacLastV) }}</span>
              </div>
            </div>
          </div>

          <!-- Price -->
          <div class="rounded-2xl border border-slate-200 bg-white p-5 relative">
            <span class="absolute -top-2.5 left-5 inline-flex items-center h-[22px] px-2.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-[0.05em]">Parcela fixa</span>
            <div class="text-[16px] font-extrabold text-slate-900">Price</div>
            <p class="text-[12px] text-slate-500 mt-0.5 mb-4">Mesma parcela do primeiro ao último mês.</p>
            <div class="flex flex-col gap-2.5">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-[13px] text-slate-500">Parcela fixa</span>
                <span class="text-[18px] font-extrabold text-slate-900">{{ fmtBRL(priceV) }}</span>
              </div>
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-[13px] text-slate-500">Do 1º ao último mês</span>
                <span class="text-[14px] font-bold text-slate-700">{{ termYears * 12 }}x</span>
              </div>
            </div>
          </div>
        </div>

        <!-- veredito -->
        <div v-if="jurosEconomizados > 0" class="mt-4 text-[13.5px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          No <span class="font-bold text-slate-900">SAC</span> você paga <span class="font-bold text-brand">{{ fmtBRL(jurosEconomizados) }}</span> a menos de juros — mas começa com parcela mais alta. No <span class="font-bold text-slate-900">Price</span>, a parcela é fixa e mais previsível.
        </div>

        <p class="text-[11px] text-slate-400 mt-4 leading-[1.6] m-0">
          Simulação para fins informativos, com juros de {{ String(rate).replace('.', ',') }}% a.a. e prazo de {{ termYears }} anos. Não é proposta de crédito; condições finais dependem de análise da instituição financeira.
        </p>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
          <a href="#contato" class="inline-flex items-center justify-center gap-1.5 h-12 px-6 bg-brand text-white text-[15px] font-bold rounded-xl no-underline hover:bg-brand-dark transition-colors">
            Falar com um corretor
          </a>
          <button type="button" class="inline-flex items-center justify-center gap-1.5 h-12 px-5 bg-white border border-slate-300 text-slate-700 text-[14px] font-semibold rounded-xl cursor-pointer hover:bg-slate-50" @click="step = 1">
            Refazer simulação
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
