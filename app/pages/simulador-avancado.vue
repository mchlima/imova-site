<script setup lang="ts">
import { useSimulatorStore } from '~/stores/simulator'

definePageMeta({ layout: 'default' })

const sim = useSimulatorStore()

onMounted(() => {
  sim.hydrateFromStorage()
  sim.initLocations()
})

// Segmented button classes (SAC/Price, CPF/CNPJ)
const segBase =
  'h-9 rounded-md text-[13px] font-semibold cursor-pointer transition-all font-[inherit] border-none'
const segOn = 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.1)]'
const segOff = 'bg-transparent text-slate-500'

// Shared text input classes
const inputBase =
  'w-full px-[13px] text-[15px] text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15'

async function onSubmit() {
  const ok = await sim.submitOpportunity()
  if (ok) await navigateTo('/obrigado')
}
</script>

<template>
  <div class="w-full">
    <div
      class="max-w-[87.5rem] mx-auto px-6 pt-7 pb-20 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-7 items-start"
    >
      <!-- CONTROL PANEL -->
      <aside
        class="lg:sticky lg:top-[86px] bg-white border border-slate-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        <h2 class="text-[15px] font-bold tracking-[-0.01em] m-0 mb-1 text-slate-900">
          Seus números
        </h2>
        <p class="text-[12.5px] text-slate-400 m-0 mb-[22px]">
          Arraste ou digite. Tudo recalcula na hora.
        </p>

        <!-- Income -->
        <div class="mb-[22px]">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Renda familiar mensal</label
          >
          <div class="relative">
            <span
              class="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 font-medium"
              >R$</span
            >
            <input
              :value="sim.incomeInput"
              @input="sim.setIncome(($event.target as HTMLInputElement).value)"
              inputmode="numeric"
              placeholder="0"
              class="w-full h-[42px] pl-[38px] pr-3 text-[15px] font-semibold text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
        </div>

        <!-- Property value -->
        <div class="mb-[22px]">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Valor estimado do imóvel</label
          >
          <div class="relative">
            <span
              class="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 font-medium"
              >R$</span
            >
            <input
              :value="sim.propertyInput"
              @input="sim.setPropertyValue(($event.target as HTMLInputElement).value)"
              inputmode="numeric"
              placeholder="0"
              class="w-full h-[42px] pl-[38px] pr-3 text-[15px] font-semibold text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
        </div>

        <!-- Down payment -->
        <div class="mb-[22px]">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Valor de entrada</label
          >
          <div class="relative">
            <span
              class="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 font-medium"
              >R$</span
            >
            <input
              :value="sim.downPaymentInput"
              @input="sim.setDownPayment(($event.target as HTMLInputElement).value)"
              inputmode="numeric"
              placeholder="0"
              class="w-full h-[42px] pl-[38px] pr-3 text-[15px] font-semibold text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
          <div class="text-[11.5px] text-slate-400 mt-1.5">
            {{ sim.downPaymentPctText }}
          </div>
        </div>

        <!-- FGTS -->
        <div class="mb-6">
          <div class="flex justify-between items-baseline mb-[7px]">
            <label class="text-[13px] font-semibold text-slate-700"
              >Saldo de FGTS
              <span class="font-normal text-slate-400">(opcional)</span></label
            >
          </div>
          <div class="relative">
            <span
              class="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 font-medium"
              >R$</span
            >
            <input
              :value="sim.fgtsFmt"
              @input="sim.setFgts(($event.target as HTMLInputElement).value)"
              inputmode="numeric"
              placeholder="0"
              class="w-full h-[42px] pl-[38px] pr-3 text-[15px] font-semibold text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
          <div class="text-[11.5px] text-slate-400 mt-1.5">
            Abate direto do valor financiado. Não cobre ITBI nem cartório.
          </div>
        </div>

        <!-- Bank interest rate -->
        <div class="mb-6">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Taxa de juros do banco
            <span class="font-normal text-slate-400">(a.a.)</span></label
          >
          <div class="relative">
            <input
              :value="sim.rateInput"
              @input="sim.setRate(($event.target as HTMLInputElement).value)"
              inputmode="decimal"
              placeholder="0,0"
              class="w-full h-[42px] pl-[13px] pr-9 text-[15px] font-semibold text-slate-900 border border-slate-300 rounded-lg outline-none font-[inherit] transition-all focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
            <span
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 font-medium"
              >%</span
            >
          </div>
          <div class="text-[11.5px] text-slate-400 mt-1.5">
            Taxa anual efetiva. Consulte a proposta do seu banco.
          </div>
        </div>

        <div class="h-px bg-slate-100 mb-[22px]"></div>

        <!-- Amortization toggle -->
        <div class="mb-5">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Tabela de amortização</label
          >
          <div class="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              :class="[segBase, sim.amortization === 'SAC' ? segOn : segOff]"
              @click="sim.amortization = 'SAC'"
            >
              SAC
            </button>
            <button
              :class="[segBase, sim.amortization === 'Price' ? segOn : segOff]"
              @click="sim.amortization = 'Price'"
            >
              Price
            </button>
          </div>
          <div class="text-[11.5px] text-slate-400 mt-[7px]">{{ sim.amortizationHint }}</div>
        </div>

        <!-- Buyer type toggle -->
        <div class="mb-6">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Perfil do comprador</label
          >
          <div class="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              :class="[segBase, sim.buyerType === 'CPF' ? segOn : segOff]"
              @click="sim.buyerType = 'CPF'"
            >
              CPF · Pessoa física
            </button>
            <button
              :class="[segBase, sim.buyerType === 'CNPJ' ? segOn : segOff]"
              @click="sim.buyerType = 'CNPJ'"
            >
              CNPJ · Empresa
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-100 mb-[22px]"></div>

        <!-- Location -->
        <div class="mb-1.5">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Estado (UF)</label
          >
          <SearchableSelect
            :model-value="sim.uf"
            :options="sim.ufOptions"
            placeholder="Selecione o estado…"
            search-placeholder="Buscar estado…"
            @update:model-value="(v) => sim.setUf(String(v))"
          />
          <div class="text-[11.5px] text-slate-400 mt-1.5">
            Define as custas estaduais de registro e cartório.
          </div>
        </div>
        <div class="mt-4">
          <label class="block text-[13px] font-semibold text-slate-700 mb-[9px]"
            >Cidade / Município</label
          >
          <SearchableSelect
            v-model="sim.city"
            :options="sim.cityOptions"
            :disabled="!sim.uf"
            :placeholder="sim.uf ? 'Selecione a cidade…' : 'Escolha o estado primeiro'"
            search-placeholder="Buscar cidade…"
          />
          <div class="text-[11.5px] text-slate-400 mt-1.5">
            Aplica a alíquota estimada de ITBI da cidade.
          </div>
        </div>
      </aside>

      <!-- RESULTS PANEL -->
      <main class="min-w-0">
        <!-- dynamic heading -->
        <div class="mb-5">
          <h1
            class="text-[24px] font-extrabold tracking-[-0.025em] m-0 mb-1.5 text-slate-900 leading-[1.2]"
          >
            Resultado da simulação de crédito imobiliário {{ sim.locationTitle }}
          </h1>
          <p class="text-[14.5px] text-slate-500 m-0">
            Tabela {{ sim.amortizationName }} · {{ sim.termText }} · taxa estimada de
            {{ sim.rateText }} ao ano. Valores são estimativas para te ajudar a decidir.
          </p>
        </div>

        <!-- affordability alert -->
        <div
          v-if="sim.incomeAlert"
          class="flex gap-3 bg-[#FEF9F0] border border-[#F5E4C3] rounded-[10px] px-4 py-3.5 mb-5"
        >
          <span class="text-amber-700 font-bold text-[15px]">!</span>
          <p class="text-[13.5px] leading-[1.5] text-[#92600C] m-0">
            A primeira parcela ({{ sim.installmentFmt }}) passa de 30% da sua renda. Os
            bancos costumam recusar acima desse limite — considere aumentar a entrada ou
            buscar um imóvel mais econômico.
          </p>
        </div>

        <!-- standalone numeric cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div class="bg-white border border-slate-200 rounded-[11px] p-5">
            <div class="text-[12.5px] font-semibold text-slate-500 mb-2.5">
              Imóvel máximo recomendado
            </div>
            <div
              class="text-[25px] font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.1]"
            >
              {{ sim.maxPropertyFmt }}
            </div>
            <div class="text-[11.5px] text-slate-400 mt-2">
              Pela sua renda, parcela até 30%.
            </div>
          </div>
          <div class="bg-slate-900 border border-slate-900 rounded-[11px] p-5">
            <div class="text-[12.5px] font-semibold text-slate-400 mb-2.5">
              {{ sim.installmentLabel }}
            </div>
            <div
              class="text-[25px] font-extrabold tracking-[-0.02em] text-white leading-[1.1]"
            >
              {{ sim.installmentFmt }}
            </div>
            <div class="text-[11.5px] text-slate-500 mt-2">{{ sim.installmentSub }}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-[11px] p-5">
            <div class="text-[12.5px] font-semibold text-slate-500 mb-2.5">
              Total necessário à vista
            </div>
            <div
              class="text-[25px] font-extrabold tracking-[-0.02em] text-slate-900 leading-[1.1]"
            >
              {{ sim.totalUpfrontFmt }}
            </div>
            <div class="text-[11.5px] text-slate-400 mt-2">
              Entrada + impostos + cartório.
            </div>
          </div>
        </div>

        <!-- financed summary -->
        <div class="flex flex-wrap gap-2 mb-6">
          <div
            class="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-[10px] px-4 py-3.5 flex justify-between items-center"
          >
            <span class="text-[13px] text-slate-500">Valor financiado</span>
            <span class="text-[15px] font-bold text-slate-900">{{
              sim.financedFmt
            }}</span>
          </div>
          <div
            class="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-[10px] px-4 py-3.5 flex justify-between items-center"
          >
            <span class="text-[13px] text-slate-500">Total pago no fim</span>
            <span class="text-[15px] font-bold text-slate-900">{{
              sim.totalPaidFmt
            }}</span>
          </div>
          <div
            class="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-[10px] px-4 py-3.5 flex justify-between items-center"
          >
            <span class="text-[13px] text-slate-500">Total de juros</span>
            <span class="text-[15px] font-bold text-amber-700">{{ sim.interestFmt }}</span>
          </div>
        </div>

        <!-- hidden acquisition costs -->
        <div class="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-[17px] font-bold tracking-[-0.01em] m-0 text-slate-900">
              Os custos que ninguém te conta
            </h2>
          </div>
          <p class="text-[13.5px] text-slate-500 m-0 mb-5">
            Além da entrada, comprar um imóvel tem taxas obrigatórias. A gente separa
            cada uma pra você.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="border border-slate-200 rounded-[10px] p-[18px] bg-slate-50">
              <div class="flex justify-between items-baseline mb-2">
                <span class="text-[14px] font-bold text-slate-900"
                  >ITBI
                  <span
                    class="text-[11px] font-semibold text-brand bg-brand-soft px-[7px] py-0.5 rounded-[5px] ml-1"
                    >Municipal</span
                  ></span
                >
                <span class="text-[18px] font-extrabold text-slate-900">{{
                  sim.itbiFmt
                }}</span>
              </div>
              <div class="text-[12.5px] leading-[1.5] text-slate-500">
                {{ sim.itbiMicro }}
              </div>
            </div>
            <div class="border border-slate-200 rounded-[10px] p-[18px] bg-slate-50">
              <div class="flex justify-between items-baseline mb-2">
                <span class="text-[14px] font-bold text-slate-900"
                  >Cartório
                  <span
                    class="text-[11px] font-semibold text-[#1E40AF] bg-[#E4ECFB] px-[7px] py-0.5 rounded-[5px] ml-1"
                    >Estadual</span
                  ></span
                >
                <span class="text-[18px] font-extrabold text-slate-900">{{
                  sim.notaryFmt
                }}</span>
              </div>
              <div class="text-[12.5px] leading-[1.5] text-slate-500">
                {{ sim.notaryMicro }}
              </div>
            </div>
          </div>
          <div
            class="flex justify-between items-center mt-4 pt-4 border-t border-dashed border-slate-200"
          >
            <span class="text-[13.5px] font-semibold text-slate-600"
              >Total de custos de aquisição</span
            >
            <span class="text-[18px] font-extrabold text-brand">{{
              sim.totalFeesFmt
            }}</span>
          </div>
        </div>

        <!-- SAC x Price chart -->
        <div class="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 class="text-[17px] font-bold tracking-[-0.01em] m-0 mb-1 text-slate-900">
            SAC x Price: como a parcela se comporta
          </h2>
          <p class="text-[13.5px] text-slate-500 m-0 mb-5">
            No <b>SAC</b> a parcela começa alta e cai todo mês. Na <b>Price</b> ela é
            fixa do início ao fim. Veja a diferença ao longo dos anos:
          </p>
          <div
            class="flex items-end gap-2.5 h-[200px] px-1 border-b-[1.5px] border-slate-200"
          >
            <div
              v-for="(pt, idx) in sim.chart"
              :key="idx"
              class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
            >
              <div
                class="relative w-full flex justify-center gap-1 items-end h-full"
              >
                <div
                  class="w-[42%] flex flex-col justify-end items-center h-full"
                  :title="'SAC — ' + pt.sac"
                >
                  <span class="text-[9px] font-semibold text-brand leading-none mb-1 whitespace-nowrap">{{ pt.sacK }}</span>
                  <div class="w-full bg-brand rounded-t" :style="{ height: pt.sacH }"></div>
                </div>
                <div
                  class="w-[42%] flex flex-col justify-end items-center h-full"
                  :title="'Price — ' + pt.price"
                >
                  <span class="text-[9px] font-semibold text-slate-500 leading-none mb-1 whitespace-nowrap">{{ pt.priceK }}</span>
                  <div class="w-full bg-slate-300 rounded-t" :style="{ height: pt.priceH }"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="flex gap-2.5 mt-2 px-1">
            <div
              v-for="(pt, idx) in sim.chart"
              :key="idx"
              class="flex-1 text-center text-[11px] text-slate-400 font-medium"
            >
              {{ pt.label }}
            </div>
          </div>
          <div class="flex gap-5 mt-[18px]">
            <span
              class="inline-flex items-center gap-[7px] text-[12.5px] text-slate-600 font-medium"
              ><span class="block w-[11px] h-[11px] rounded-[3px] bg-brand"></span>SAC
              (decrescente)</span
            >
            <span
              class="inline-flex items-center gap-[7px] text-[12.5px] text-slate-600 font-medium"
              ><span class="block w-[11px] h-[11px] rounded-[3px] bg-slate-300"></span
              >Price (fixa)</span
            >
          </div>
        </div>

        <!-- OPPORTUNITY CAPTURE FORM -->
        <div
          id="captura"
          class="bg-slate-900 rounded-[14px] p-9 relative overflow-hidden"
        >
          <div
            class="absolute inset-0 pointer-events-none"
            style="
              background-image: linear-gradient(#ffffff08 1px, transparent 1px),
                linear-gradient(90deg, #ffffff08 1px, transparent 1px);
              background-size: 44px 44px;
            "
          ></div>
          <div
            class="relative grid grid-cols-1 lg:grid-cols-2 gap-9 items-center"
          >
            <div>
              <h2
                class="text-[23px] font-extrabold tracking-[-0.02em] m-0 mb-3.5 text-white leading-[1.2]"
              >
                Agora que você entende os números, o resto fica com a gente.
              </h2>
              <p class="text-[15px] leading-[1.6] text-slate-300 m-0 mb-[18px]">
                Uma especialista analisa seu perfil e te conecta a um corretor parceiro
                que cuida de toda a parte prática pra você: encontra os imóveis certos
                pro seu orçamento e gosto, marca as visitas e negocia a compra.
              </p>
              <div class="flex flex-col gap-2.5">
                <span class="inline-flex items-center gap-[9px] text-[14px] text-slate-200"
                  ><span class="text-emerald-400 font-bold">✓</span> Você sai com clareza
                  total do seu cenário, sem custo</span
                >
                <span class="inline-flex items-center gap-[9px] text-[14px] text-slate-200"
                  ><span class="text-emerald-400 font-bold">✓</span> Um corretor assume
                  todo o trabalho de corretagem por você</span
                >
                <span class="inline-flex items-center gap-[9px] text-[14px] text-slate-200"
                  ><span class="text-emerald-400 font-bold">✓</span> Seus dados do
                  simulador já vão junto, sem redigitar</span
                >
              </div>
            </div>
            <div class="bg-white rounded-xl p-6">
              <label class="block text-[13px] font-semibold text-slate-700 mb-[7px]"
                >Seu nome</label
              >
              <input
                v-model="sim.contactName"
                placeholder="Como podemos te chamar?"
                :class="[inputBase, 'h-11 mb-3.5']"
              />
              <label class="block text-[13px] font-semibold text-slate-700 mb-[7px]"
                >E-mail</label
              >
              <input
                v-model="sim.contactEmail"
                type="email"
                placeholder="voce@email.com"
                :class="[inputBase, 'h-11 mb-3.5']"
              />
              <label class="block text-[13px] font-semibold text-slate-700 mb-[7px]"
                >WhatsApp</label
              >
              <input
                v-model="sim.contactPhone"
                inputmode="tel"
                placeholder="(11) 90000-0000"
                :class="[inputBase, 'h-11 mb-4']"
              />
              <label class="flex gap-2.5 items-start cursor-pointer mb-4">
                <input
                  v-model="sim.contactConsent"
                  type="checkbox"
                  class="mt-0.5 w-4 h-4 accent-brand shrink-0 cursor-pointer"
                />
                <span class="text-[11.5px] leading-[1.5] text-slate-500"
                  >Autorizo o contato via WhatsApp/e-mail e o compartilhamento dos meus
                  dados com um corretor parceiro credenciado, conforme a
                  <NuxtLink
                    to="/politica-de-privacidade"
                    class="text-brand font-semibold underline"
                    >Política de Privacidade</NuxtLink
                  >.</span
                >
              </label>
              <div
                v-if="sim.contactError"
                class="text-[12.5px] text-red-700 mb-3 font-medium"
              >
                {{ sim.contactErrorMsg }}
              </div>
              <button
                @click="onSubmit"
                class="w-full h-[50px] bg-brand text-white text-[15px] font-bold border-none rounded-lg cursor-pointer transition-all font-[inherit] hover:bg-brand-dark"
              >
                Quero minha análise e um corretor pra me ajudar
              </button>
              <p class="text-[11px] text-slate-400 text-center mt-[11px] mb-0">
                Resposta em até 1 dia útil. Sem custo e sem compromisso.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
