// Faixas do Minha Casa Minha Vida (urbano) — condições vigentes desde 22/04/2026,
// operadas pela Caixa. Fonte: Ministério das Cidades / Caixa Econômica Federal.
//
// ⚠️ O valor do subsídio (subvenção) é ESTIMATIVA: varia conforme renda,
// localização do imóvel e disponibilidade orçamentária. Aqui interpolamos dentro
// da faixa (rendas menores → subsídio maior) apenas para dar uma ordem de grandeza
// na simulação. O valor real é definido pela Caixa na análise de crédito.

export interface McmvResult {
  faixa: 0 | 1 | 2 | 3 | 4
  faixaLabel: string
  rendaAte: number // teto de renda da faixa (0 = acima do programa)
  subsidy: number // subvenção estimada (R$)
  subsidized: boolean // recebe subsídio direto?
  note: string
}

// interpolação linear com clamp nas bordas
const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) => {
  if (x <= x0) return y0
  if (x >= x1) return y1
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
}

const round500 = (n: number) => Math.round(n / 500) * 500

/** Classifica a renda bruta mensal na faixa do MCMV e estima o subsídio. */
export function mcmvBracket(income: number): McmvResult {
  if (income > 0 && income <= 3200) {
    return {
      faixa: 1,
      faixaLabel: 'Faixa 1',
      rendaAte: 3200,
      subsidy: round500(lerp(income, 1800, 3200, 55000, 40000)),
      subsidized: true,
      note: 'Subsídio do governo e os menores juros do programa.',
    }
  }
  if (income <= 5000) {
    return {
      faixa: 2,
      faixaLabel: 'Faixa 2',
      rendaAte: 5000,
      subsidy: round500(lerp(income, 3200, 5000, 35000, 8000)),
      subsidized: true,
      note: 'Subsídio parcial e juros reduzidos.',
    }
  }
  if (income <= 9600) {
    return {
      faixa: 3,
      faixaLabel: 'Faixa 3',
      rendaAte: 9600,
      subsidy: 0,
      subsidized: false,
      note: 'Sem subsídio direto, mas com juros abaixo do mercado.',
    }
  }
  if (income <= 13000) {
    return {
      faixa: 4,
      faixaLabel: 'Faixa 4',
      rendaAte: 13000,
      subsidy: 0,
      subsidized: false,
      note: 'Faixa classe média: condições especiais de financiamento.',
    }
  }
  return {
    faixa: 0,
    faixaLabel: 'Acima do MCMV',
    rendaAte: 0,
    subsidy: 0,
    subsidized: false,
    note: 'Renda acima do teto do programa — financiamento pelo SBPE.',
  }
}
