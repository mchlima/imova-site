// Matemática de financiamento imobiliário — funções puras, compartilhadas entre
// o simulador (store) e a calculadora embutida nas LPs de empreendimento.
// Mantê-las aqui evita duplicar a fórmula em dois lugares.

export type Amortization = 'SAC' | 'Price'

// Taxa mensal equivalente a partir da taxa anual efetiva (ex.: 0.11 a.a.).
export const monthlyRate = (annualRate: number) => Math.pow(1 + annualRate, 1 / 12) - 1

// Primeira parcela no SAC (amortização constante): maior no começo, cai a cada mês.
export const sacFirst = (principal: number, i: number, n: number) =>
  principal / n + principal * i

// Última parcela no SAC: só resta uma amortização em aberto → (P/n)·(1+i).
export const sacLast = (principal: number, i: number, n: number) =>
  (principal / n) * (1 + i)

// Parcela fixa da tabela Price.
export const priceInstallment = (principal: number, i: number, n: number) =>
  i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n))

// Primeira parcela conforme a tabela escolhida (SAC ou Price).
export const firstInstallment = (
  principal: number,
  annualRate: number,
  termMonths: number,
  amortization: Amortization,
) => {
  const i = monthlyRate(annualRate)
  return amortization === 'SAC'
    ? sacFirst(principal, i, termMonths)
    : priceInstallment(principal, i, termMonths)
}
