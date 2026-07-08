<script setup lang="ts">
interface Opportunity {
  name?: string
  email?: string
  whatsapp?: string
  income?: number
  downPayment?: number
  propertyValue?: number
  fgts?: number
  uf?: string
  city?: string
  amortization?: string
  buyerType?: string
}

const opportunity = ref<Opportunity | null>(null)
const fmt = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')

onMounted(() => {
  try {
    const l = JSON.parse(localStorage.getItem('imova_opportunity') || 'null')
    if (l) opportunity.value = l
  } catch {
    /* ignore */
  }
})

const nameGreeting = computed(() =>
  opportunity.value?.name ? ', ' + opportunity.value.name.split(' ')[0] : '',
)

// Fora da área = tem cidade informada e ela não está na RMSP. Sem dado → trata
// como dentro da área (mensagem padrão), evitando mensagem errada por falta de info.
const outOfArea = computed(
  () =>
    !!opportunity.value?.city &&
    !isInServiceArea(opportunity.value.city, opportunity.value.uf),
)

const summaryText = computed(() => {
  const l = opportunity.value
  if (!l) return ''
  const parts: string[] = []
  if (l.city && l.uf) parts.push(l.city + '/' + l.uf)
  if (l.income) parts.push('renda ' + fmt(l.income))
  if (l.propertyValue) parts.push('imóvel ' + fmt(l.propertyValue))
  if (l.downPayment) parts.push('entrada ' + fmt(l.downPayment))
  if (l.amortization) parts.push('tabela ' + l.amortization)
  return parts.join(' · ')
})

// Etapas (somente para quem está na área atendida).
const steps = [
  { t: 'Análise do seu perfil', d: 'Nossa especialista revisa o que você simulou.' },
  { t: 'Contato no WhatsApp', d: 'Em até 1 dia útil, sem custo e sem compromisso.' },
  {
    t: 'Seu corretor parceiro',
    d: 'Encontra os imóveis certos, tira suas dúvidas sobre a compra e o financiamento e faz as simulações do imóvel que você escolher.',
  },
]
</script>

<template>
  <div class="w-full flex flex-col">
    <main class="flex-1 flex items-center justify-center px-6 pt-12 pb-[72px]">
      <div class="max-w-[41rem] w-full text-center">
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-brand-soft rounded-full mb-6"
        >
          <span
            class="inline-flex items-center justify-center w-10 h-10 bg-brand rounded-full text-white text-[20px] font-bold"
            >✓</span
          >
        </div>
        <h1
          class="text-[34px] leading-[1.15] font-extrabold tracking-[-0.03em] m-0 mb-4 text-slate-900"
        >
          Recebemos seus dados{{ nameGreeting }}!
        </h1>

        <!-- FORA DA ÁREA ATENDIDA (RMSP) — mensagem honesta, sem prometer corretor -->
        <template v-if="outOfArea">
          <p class="text-[17.5px] leading-[1.6] text-slate-600 m-0 mb-8">
            No momento, nossos corretores acompanham compras apenas na
            <b class="text-slate-800">Região Metropolitana de São Paulo</b>. Como o imóvel que
            você procura fica em outra região, ainda não conseguimos te acompanhar nessa
            compra. Guardamos seu contato e avisamos assim que ampliarmos a cobertura.
          </p>
          <p class="text-[15px] leading-[1.6] text-slate-500 m-0 mb-8">
            Enquanto isso, você já tem o resultado da sua simulação e pode usar nossos guias
            gratuitos pra se preparar com calma para a compra.
          </p>
        </template>

        <!-- DENTRO DA ÁREA — corretor cuida da corretagem -->
        <template v-else>
          <p class="text-[17.5px] leading-[1.6] text-slate-600 m-0 mb-8">
            Você já saiu com clareza sobre os números. Agora uma especialista analisa seu
            perfil e te apresenta a um corretor parceiro, que cuida de toda a parte prática:
            encontrar os imóveis certos pro seu orçamento, tirar suas dúvidas sobre a compra
            e o financiamento e fazer as simulações do imóvel que você escolher.
          </p>

          <div
            class="bg-white border border-slate-200 rounded-xl p-7 text-left mb-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div
              class="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-[18px]"
            >
              O que acontece agora
            </div>
            <div class="flex flex-col gap-[18px]">
              <div v-for="(p, i) in steps" :key="i" class="flex gap-3.5 items-start">
                <span
                  class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand text-white text-[13px] font-bold shrink-0"
                  >{{ i + 1 }}</span
                >
                <div>
                  <div class="text-[15px] font-semibold text-slate-900 mb-0.5">{{ p.t }}</div>
                  <div class="text-[13.5px] leading-[1.5] text-slate-500">{{ p.d }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- recap do cenário simulado (dado do próprio usuário) -->
        <div
          v-if="summaryText"
          class="bg-white border border-dashed border-slate-300 rounded-[10px] px-5 py-[18px] text-left mb-7"
        >
          <div class="text-[12px] font-semibold text-slate-400 mb-2">Seu cenário simulado:</div>
          <div class="text-[13.5px] leading-[1.6] text-slate-600">{{ summaryText }}</div>
        </div>

        <div class="flex gap-3 justify-center flex-wrap">
          <NuxtLink
            to="/guias"
            class="inline-flex items-center justify-center h-[46px] px-[22px] bg-white text-slate-900 border border-slate-300 text-[14.5px] font-semibold no-underline rounded-lg transition-all hover:bg-slate-100"
            >{{ outOfArea ? 'Ver os guias' : 'Enquanto isso, ler os guias' }}</NuxtLink
          >
          <NuxtLink
            to="/"
            class="inline-flex items-center justify-center h-[46px] px-[22px] bg-brand text-white text-[14.5px] font-semibold no-underline rounded-lg transition-all hover:bg-brand-dark"
            >Voltar ao início</NuxtLink
          >
        </div>
      </div>
    </main>
  </div>
</template>
