import { defineStore } from 'pinia'
import { isInServiceArea } from '~/utils/serviceArea'
import { monthlyRate, sacFirst, priceInstallment } from '~/utils/financing'

// ── Localidades (vindas do backend /locations) ────────────────────────────
// notaryRate: alíquota efetiva estimada de cartório (por estado).
// itbiRate: ITBI estimado por cidade.
export interface StateOpt {
  uf: string
  name: string
  region: string
  notaryRate: number
}
export interface CityOpt {
  id: number
  name: string
  itbiRate: number
  isCapital: boolean
}

// ── Formatting / math helpers ─────────────────────────────────────────────
const fmt = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')
// Formato compacto para rótulos do gráfico (ex.: R$ 2,3 mil / R$ 950).
const fmtK = (n: number) =>
  n >= 1000
    ? 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + ' mil'
    : 'R$ ' + Math.round(n)

// Extrai os dígitos de uma string ("R$ 350.000" → 350000).
const digitsToInt = (raw: string) => {
  const d = (raw || '').replace(/\D/g, '')
  return d ? parseInt(d, 10) : 0
}

export type Amortization = 'SAC' | 'Price'
export type BuyerType = 'CPF' | 'CNPJ'

interface SimulatorState {
  income: number
  propertyValue: number
  downPayment: number
  fgts: number
  amortization: Amortization
  buyerType: BuyerType
  termMonths: number
  annualRate: number
  uf: string
  city: string
  // localidades carregadas da API
  states: StateOpt[]
  cities: CityOpt[]
  // contato
  contactName: string
  contactEmail: string
  contactPhone: string
  contactConsent: boolean
  contactError: boolean
  contactErrorMsg: string
}

export const useSimulatorStore = defineStore('simulator', {
  state: (): SimulatorState => ({
    income: 6000,
    propertyValue: 350000,
    downPayment: 70000,
    fgts: 0,
    amortization: 'SAC',
    buyerType: 'CPF',
    termMonths: 360,
    annualRate: 0.11,
    uf: 'SP',
    city: 'São Paulo',
    states: [],
    cities: [],
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactConsent: false,
    contactError: false,
    contactErrorMsg: '',
  }),

  getters: {
    currentState(s): StateOpt | undefined {
      return s.states.find((st) => st.uf === s.uf)
    },

    // Opções no formato { value, label } para o SearchableSelect.
    ufOptions: (s) => s.states.map((st) => ({ value: st.uf, label: st.name })),
    cityOptions: (s) => s.cities.map((c) => ({ value: c.name, label: c.name })),

    itbiRate(): number {
      const c = this.cities.find((c) => c.name === this.city)
      return c ? c.itbiRate : 0.02
    },
    notaryRate(): number {
      return this.currentState?.notaryRate ?? 0.013
    },

    // taxa mensal equivalente (via util compartilhado)
    monthlyRate: (s) => monthlyRate(s.annualRate),

    financedAmount: (s) => Math.max(0, s.propertyValue - s.downPayment - s.fgts),

    firstInstallment(s): number {
      const i = this.monthlyRate
      const n = s.termMonths
      const P = this.financedAmount
      return s.amortization === 'SAC' ? sacFirst(P, i, n) : priceInstallment(P, i, n)
    },

    totalPaid(s): number {
      const i = this.monthlyRate
      const n = s.termMonths
      const P = this.financedAmount
      if (s.amortization === 'SAC') {
        const interest = (P * i * (n + 1)) / 2
        return P + interest
      }
      return priceInstallment(P, i, n) * n
    },

    totalInterest(): number {
      return Math.max(0, this.totalPaid - this.financedAmount)
    },

    itbi(s): number {
      return s.propertyValue * this.itbiRate
    },
    notary(s): number {
      return s.propertyValue * this.notaryRate
    },
    totalFees(): number {
      return this.itbi + this.notary
    },
    totalUpfront(s): number {
      return s.downPayment + this.totalFees
    },

    maxInstallment: (s) => s.income * 0.3,

    maxProperty(s): number {
      const i = this.monthlyRate
      const n = s.termMonths
      const maxFin =
        s.amortization === 'SAC'
          ? this.maxInstallment / (1 / n + i)
          : (this.maxInstallment * (1 - Math.pow(1 + i, -n))) / i
      return maxFin + s.downPayment + s.fgts
    },

    incomeAlert(): boolean {
      return this.firstInstallment > this.maxInstallment && this.financedAmount > 0
    },

    // year sampling for the SAC x Price chart
    chart(s) {
      const i = this.monthlyRate
      const n = s.termMonths
      const P = this.financedAmount
      const years = n / 12
      const marks = [1, 5, 10, 15, 20, 25, 30].filter((a) => a <= years)
      if (marks[marks.length - 1] !== years) marks.push(Math.round(years))

      const amort = P / n
      const priceFixed = priceInstallment(P, i, n)
      const vals = marks.map((a) => {
        const month = Math.min(n, Math.round(a * 12))
        const prevBalance = P - amort * (month - 1)
        const sacP = amort + Math.max(0, prevBalance) * i
        return { a, sac: sacP, price: priceFixed }
      })
      const maxV = Math.max(...vals.map((v) => Math.max(v.sac, v.price)), 1)
      return vals.map((v) => ({
        label: 'Ano ' + v.a,
        sacH: Math.max(4, (v.sac / maxV) * 100) + '%',
        priceH: Math.max(4, (v.price / maxV) * 100) + '%',
        sac: fmt(v.sac), // valor cheio (tooltip)
        price: fmt(v.price),
        sacK: fmtK(v.sac), // valor compacto (rótulo acima da barra)
        priceK: fmtK(v.price),
      }))
    },

    // ── Derived texts ──
    locationTitle(s): string {
      if (s.uf && s.city) return 'para ' + s.city + ' - ' + s.uf
      if (s.uf) return 'para ' + (this.currentState ? this.currentState.name : s.uf)
      return 'no Brasil'
    },
    termText: (s) => s.termMonths / 12 + ' anos',
    rateText: (s) => (s.annualRate * 100).toFixed(2).replace('.', ',') + '%',
    downPaymentPctText: (s) =>
      (s.propertyValue > 0 ? Math.round((s.downPayment / s.propertyValue) * 100) : 0) +
      '% do valor do imóvel',
    amortizationHint: (s) =>
      s.amortization === 'SAC'
        ? 'SAC: parcela maior no começo, mas cai todo mês e paga menos juros no total.'
        : 'Price: parcela fixa do início ao fim — previsível, porém com mais juros no total.',
    installmentLabel: (s) =>
      s.amortization === 'SAC' ? '1ª parcela (vai diminuindo)' : 'Parcela fixa mensal',
    installmentSub: (s) =>
      s.amortization === 'SAC'
        ? 'A última fica bem menor.'
        : 'Igual do 1º ao último mês.',
    itbiMicro(s): string {
      return (
        'Imposto da prefeitura de ' +
        (s.city || 'sua cidade') +
        ' para passar o imóvel pro seu nome. Estimativa: ' +
        (this.itbiRate * 100).toLocaleString('pt-BR') +
        '% do valor.'
      )
    },
    notaryMicro(): string {
      return (
        'Escritura e registro no cartório de imóveis — estimativa pela tabela de ' +
        (this.currentState ? this.currentState.name : 'seu estado') +
        '.'
      )
    },

    // ── Formatted values (R$) ──
    incomeFmt: (s) => fmt(s.income),
    propertyFmt: (s) => fmt(s.propertyValue),
    downPaymentFmt: (s) => fmt(s.downPayment),
    fgtsFmt: (s) => (s.fgts ? s.fgts.toLocaleString('pt-BR') : ''),
    // Valores para os inputs (separador de milhar, sem "R$" — o prefixo fica no campo).
    incomeInput: (s) => (s.income ? s.income.toLocaleString('pt-BR') : ''),
    propertyInput: (s) => (s.propertyValue ? s.propertyValue.toLocaleString('pt-BR') : ''),
    downPaymentInput: (s) => (s.downPayment ? s.downPayment.toLocaleString('pt-BR') : ''),
    rateInput: (s) => (s.annualRate * 100).toFixed(1).replace('.', ','),
    maxPropertyFmt(): string {
      return fmt(this.maxProperty)
    },
    installmentFmt(): string {
      return fmt(this.firstInstallment)
    },
    totalUpfrontFmt(): string {
      return fmt(this.totalUpfront)
    },
    financedFmt(): string {
      return fmt(this.financedAmount)
    },
    totalPaidFmt(): string {
      return fmt(this.totalPaid)
    },
    interestFmt(): string {
      return fmt(this.totalInterest)
    },
    itbiFmt(): string {
      return fmt(this.itbi)
    },
    notaryFmt(): string {
      return fmt(this.notary)
    },
    totalFeesFmt(): string {
      return fmt(this.totalFees)
    },
    amortizationName: (s) => s.amortization,
  },

  actions: {
    setIncome(raw: string) {
      this.income = digitsToInt(raw)
    },
    setPropertyValue(v: number | string) {
      this.propertyValue = typeof v === 'number' ? v : digitsToInt(v)
      this.downPayment = Math.min(this.downPayment, this.propertyValue)
    },
    setDownPayment(raw: string) {
      this.downPayment = Math.min(digitsToInt(raw), this.propertyValue)
    },
    setFgts(raw: string) {
      this.fgts = digitsToInt(raw)
    },
    // Taxa de juros: input em % (ex.: "11" ou "11,5"); armazenada como fração.
    setRate(raw: string) {
      const n = parseFloat((raw || '').replace(',', '.').replace(/[^\d.]/g, ''))
      const pct = isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
      this.annualRate = pct / 100
    },

    // ── Localidades (backend /locations) ──
    async loadStates() {
      if (this.states.length) return
      const apiBase = useRuntimeConfig().public.apiBase
      try {
        this.states = await $fetch<StateOpt[]>('/locations/states', { baseURL: apiBase })
      } catch {
        /* mantém vazio; getters caem nos defaults */
      }
    },
    async loadCities(uf: string) {
      const apiBase = useRuntimeConfig().public.apiBase
      if (!uf) {
        this.cities = []
        return
      }
      try {
        this.cities = await $fetch<CityOpt[]>('/locations/cities', {
          baseURL: apiBase,
          params: { uf },
        })
      } catch {
        this.cities = []
      }
    },
    /** Carrega estados e as cidades da UF atual (chamar no mount do simulador). */
    async initLocations() {
      await this.loadStates()
      if (this.uf) await this.loadCities(this.uf)
    },
    async setUf(uf: string) {
      this.uf = uf
      await this.loadCities(uf)
      // mantém a cidade se ainda existir; senão usa a capital ou a primeira.
      if (!this.cities.some((c) => c.name === this.city)) {
        this.city = this.cities.find((c) => c.isCapital)?.name ?? this.cities[0]?.name ?? ''
      }
    },

    // Restores income/downPayment saved from a previous session (design parity)
    hydrateFromStorage() {
      if (!import.meta.client) return
      try {
        const s = JSON.parse(localStorage.getItem('imova_sim') || '{}')
        if (s.income) this.income = s.income
        if (s.downPayment) this.downPayment = s.downPayment
      } catch {
        /* ignore */
      }
    },

    /** Validates and submits the opportunity. Returns true on success. */
    async submitOpportunity(): Promise<boolean> {
      if (!this.contactName.trim() || !this.contactEmail.trim() || !this.contactPhone.trim()) {
        this.contactError = true
        this.contactErrorMsg = 'Preencha nome, e-mail e WhatsApp para continuar.'
        return false
      }
      if (!/.+@.+\..+/.test(this.contactEmail)) {
        this.contactError = true
        this.contactErrorMsg = 'Confira o formato do seu e-mail.'
        return false
      }
      if (!this.contactConsent) {
        this.contactError = true
        this.contactErrorMsg = 'Precisamos da sua autorização para entrar em contato.'
        return false
      }
      this.contactError = false

      const payload = {
        name: this.contactName,
        email: this.contactEmail,
        whatsapp: this.contactPhone,
        income: this.income,
        downPayment: this.downPayment,
        propertyValue: this.propertyValue,
        fgts: this.fgts,
        uf: this.uf,
        city: this.city,
        amortization: this.amortization,
        buyerType: this.buyerType,
      }

      if (import.meta.client) {
        try {
          localStorage.setItem('imova_opportunity', JSON.stringify(payload))
        } catch {
          /* ignore */
        }
      }

      // Captura no CRM (POST /capture). O CRM é genérico: mandamos contato + os
      // campos do simulador (seção 'simulador') e o ESTÁGIO já decidido aqui.
      // Roteamento de área (RMSP) é regra do site, não do CRM: fora da área →
      // 'Nutrição'; dentro → fluxo inicial 'Lead'.
      const apiBase = useRuntimeConfig().public.apiBase
      if (apiBase) {
        const stageKey = isInServiceArea(this.city, this.uf) ? 'Lead' : 'Nutrição'
        const body = {
          source: 'simulador',
          contact: {
            name: this.contactName,
            channels: [
              { type: 'email', value: this.contactEmail },
              ...(this.contactPhone ? [{ type: 'whatsapp', value: this.contactPhone }] : []),
            ],
          },
          fields: {
            simulador: {
              uf: this.uf,
              city: this.city,
              propertyValue: this.propertyValue,
              income: this.income,
              downPayment: this.downPayment,
              fgts: this.fgts,
              interestRate: +(this.annualRate * 100).toFixed(2), // % a.a.
              amortization: this.amortization,
              buyerType: this.buyerType,
            },
          },
          stageKey,
        }
        try {
          await $fetch('/capture', { baseURL: apiBase, method: 'POST', body })
        } catch {
          // A network failure does not block conversion; the opportunity is already in localStorage.
        }
      }

      return true
    },
  },
})
