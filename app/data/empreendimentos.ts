// Registro de empreendimentos (Fase B — ADR 0003).
// Por ora os dados vivem no código (páginas geradas a partir daqui). O shape é
// estável de propósito: quando houver volume, isto vira tabela + CRUD no admin
// sem tocar nas LPs — elas só passam a ler do banco.

export interface PlantaVariante {
  label: string // rótulo curto, ex.: 'Planta 01'
  image: string // caminho da imagem da planta
  terraco?: boolean // possui terraço/varanda
}

export interface Tipologia {
  label: string // ex.: '2 dormitórios'
  bedrooms: number
  areaMin: number // m² — 0 = sob consulta
  areaMax: number // m² — 0 = sob consulta
  priceFrom: number // reais — 0 = sob consulta
  plantas?: PlantaVariante[] // variantes de planta desta tipologia
}

export interface Empreendimento {
  slug: string
  nome: string
  construtora: string
  // masterplan dividido em condomínios/fases: este é o condomínio em comercialização
  condominio?: string
  status: 'breve lançamento' | 'lançamento' | 'em obras' | 'pronto para morar'
  cidade: string
  bairro: string
  uf: string
  endereco: string
  precoAPartirDe: number // reais
  // programa habitacional e condições (ex.: Minha Casa Minha Vida / HIS)
  programa?: string
  subsidioAte?: number // subsídio máximo em reais (0/undefined = sem subsídio)
  aceitaFgts?: boolean
  tipologias: Tipologia[]
  diferenciais: string[]
  descricao: string
  // URLs de imagens (hospedar as nossas). Vazio = a LP mostra placeholder.
  imagens: string[]
  seo: { title: string; description: string }
  publicado: boolean
}

export const empreendimentos: Empreendimento[] = [
  {
    slug: 'ares-do-horto',
    nome: 'Ares do Horto',
    construtora: 'Plano&Plano',
    condominio: 'Pau Brasil',
    status: 'breve lançamento',
    cidade: 'São Paulo',
    bairro: 'Horto do Ipê',
    uf: 'SP',
    endereco: 'Estrada do Campo Limpo, 1501 — Horto do Ipê',
    precoAPartirDe: 234592,
    programa: 'Minha Casa Minha Vida (HIS)',
    subsidioAte: 55000,
    aceitaFgts: true,
    tipologias: [
      // metragens/vagas sob consulta na fonte — completar quando a construtora informar
      {
        label: '2 dormitórios',
        bedrooms: 2,
        areaMin: 0,
        areaMax: 0,
        priceFrom: 234592,
        plantas: [
          { label: 'Planta 01', image: '/img/empreendimentos/ares-do-horto/planta-2-dorms.webp' },
          { label: 'Planta 02', image: '/img/empreendimentos/ares-do-horto/planta-2-dorms-b.webp' },
          { label: 'Planta 03', image: '/img/empreendimentos/ares-do-horto/planta-2-dorms-terraco.webp', terraco: true },
          { label: 'Planta 04', image: '/img/empreendimentos/ares-do-horto/planta-2-dorms-terraco-b.webp', terraco: true },
        ],
      },
    ],
    diferenciais: [
      'Piscina adulto e infantil',
      'Fitness',
      'Churrasqueira',
      'Praça do fogo',
      'Playground',
      'Brinquedoteca',
      'Espaço pet',
      'Pet care',
      'Espaço bem-estar',
      'Coworking',
      'Delivery',
      'Mini mercado',
      'Bricolagem',
      'Salão de festas',
      'Salão de jogos',
      'Redário',
      'Espaço piquenique',
    ],
    descricao:
      'Ares do Horto, da Plano&Plano, é um bairro planejado no Horto do Ipê, zona sul de São Paulo, ' +
      'entregue em fases — cada condomínio com lazer, preço e prazo próprios. O Condomínio Pau Brasil ' +
      'é a fase em breve lançamento: apartamentos de 2 dormitórios enquadrados no Minha Casa Minha Vida ' +
      '(Habitação de Interesse Social), com subsídio de até R$ 55 mil e uso do FGTS na entrada — ' +
      'condições pensadas para quem quer sair do aluguel. Lazer completo com piscina, fitness, ' +
      'espaço bem-estar, brinquedoteca, espaço pet e mais, na Estrada do Campo Limpo.',
    imagens: [
      '/img/empreendimentos/ares-do-horto/piscina.webp',
      '/img/empreendimentos/ares-do-horto/praca-do-fogo.webp',
      '/img/empreendimentos/ares-do-horto/playground.webp',
      '/img/empreendimentos/ares-do-horto/pet.webp',
      '/img/empreendimentos/ares-do-horto/piquenique.webp',
      '/img/empreendimentos/ares-do-horto/churrasqueira.webp',
      '/img/empreendimentos/ares-do-horto/fitness.webp',
      '/img/empreendimentos/ares-do-horto/bem-estar.webp',
      '/img/empreendimentos/ares-do-horto/brinquedoteca.webp',
      '/img/empreendimentos/ares-do-horto/mini-mercado.webp',
      '/img/empreendimentos/ares-do-horto/pet-care.webp',
      '/img/empreendimentos/ares-do-horto/delivery.webp',
      '/img/empreendimentos/ares-do-horto/bricolagem.webp',
    ],
    seo: {
      title: 'Ares do Horto — Apartamentos 2 dormitórios no Horto do Ipê (SP) | Meu Revelar',
      description:
        'Ares do Horto (Plano&Plano): apartamentos de 2 dormitórios no Horto do Ipê, São Paulo, ' +
        'a partir de R$ 234.592. Simule o financiamento e fale com um corretor parceiro.',
    },
    publicado: true,
  },
]

export const empreendimentosPublicados = () => empreendimentos.filter((e) => e.publicado)
export const getEmpreendimento = (slug: string) =>
  empreendimentos.find((e) => e.slug === slug && e.publicado)

// Rótulo/cor do status para badges.
export const STATUS_STYLE: Record<Empreendimento['status'], { label: string; color: string }> = {
  'breve lançamento': { label: 'Breve Lançamento', color: '#C2410C' },
  lançamento: { label: 'Lançamento', color: '#146c4e' },
  'em obras': { label: 'Em obras', color: '#B45309' },
  'pronto para morar': { label: 'Pronto para morar', color: '#1D4ED8' },
}
