// Tipos e helpers de Empreendimento (ADR 0010) — consumidos pelo catálogo
// público (/imoveis) e, futuramente, pela LP por template.

export interface DevelopmentTypology {
  id: string
  label: string
  bedrooms: number
  suites: number | null
  areaMin: number
  areaMax: number
  priceFrom: number | null
  parking: number | null
  terraco: boolean // exibido como "Varanda"
  order: number
  imageUrl: string // planta desta tipologia (1:1)
  imageStorageKey: string
}

export interface DevelopmentImage {
  id: string
  url: string
  kind: 'hero' | 'lazer' | 'planta'
  caption: string
  order: number
}

export type DevelopmentStatus =
  | 'breve_lancamento'
  | 'em_construcao'
  | 'futuro_lancamento'
  | 'imovel_pronto'
  | 'lancamento'

export type DevelopmentRegiao =
  | 'zona_leste'
  | 'zona_oeste'
  | 'zona_sul'
  | 'zona_norte'
  | 'centro'
  | 'interior'
  | 'grande_sp'

export interface Development {
  id: string
  slug: string
  name: string
  construtora: string
  tipo: string
  descricao: string
  masterplanName: string
  masterplanSlug: string
  uf: string
  cidade: string
  cidadeSlug: string
  bairro: string
  bairroSlug: string
  regiao: DevelopmentRegiao
  endereco: string
  standEndereco: string
  lat: number | null
  lng: number | null
  status: DevelopmentStatus
  obraEvolucaoPct: number | null
  entregaLabel: string
  priceFrom: number
  priceMax: number | null
  programa: string
  aceitaFgts: boolean
  subsidioAte: number | null
  rendaMinima: number | null
  tetoHis1: number | null
  tetoHis2: number | null
  tetoHmp: number | null
  totalUnidades: number | null
  torres: number | null
  pavimentos: string
  terrenoM2: number | null
  bedroomsMin: number
  bedroomsMax: number
  parkingMax: number
  areaMin: number
  areaMax: number
  suitesMax: number
  amenities: string[]
  incorporadora: string
  cnpj: string
  registroIncorporacao: string
  arquitetura: string
  paisagismo: string
  decoracao: string
  seoTitle: string
  seoDescription: string
  published: boolean
  publishedAt: string | null
  firstPublishedAt: string | null
  typologies: DevelopmentTypology[]
  images: DevelopmentImage[]
}

export interface AmenityDef {
  slug: string
  label: string
  category: string
}
export interface DevelopmentsMeta {
  amenities: AmenityDef[]
  regioes: DevelopmentRegiao[]
  statuses: DevelopmentStatus[]
}
export interface BairroOption {
  bairro: string
  bairroSlug: string
  regiao: DevelopmentRegiao
}

// rótulo + cor do badge de estágio (hex; o alpha compõe o fundo)
export const STATUS_META: Record<DevelopmentStatus, { label: string; color: string }> = {
  breve_lancamento: { label: 'Breve lançamento', color: '#C2410C' },
  lancamento: { label: 'Lançamento', color: '#146c4e' },
  em_construcao: { label: 'Em construção', color: '#B45309' },
  futuro_lancamento: { label: 'Futuro lançamento', color: '#6D28D9' },
  imovel_pronto: { label: 'Imóvel pronto', color: '#1D4ED8' },
}

export const REGIAO_LABELS: Record<DevelopmentRegiao, string> = {
  zona_leste: 'Zona Leste',
  zona_oeste: 'Zona Oeste',
  zona_sul: 'Zona Sul',
  zona_norte: 'Zona Norte',
  centro: 'Centro',
  interior: 'Interior',
  grande_sp: 'Grande SP',
}

// ordem do ciclo de vida da obra (para a linha do tempo de status)
export const STATUS_ORDER: DevelopmentStatus[] = [
  'futuro_lancamento',
  'breve_lancamento',
  'lancamento',
  'em_construcao',
  'imovel_pronto',
]
// rótulos curtos usados na linha do tempo
export const STATUS_STEP_LABEL: Record<DevelopmentStatus, string> = {
  futuro_lancamento: 'Futuro Lançamento',
  breve_lancamento: 'Breve Lançamento',
  lancamento: 'Lançamento',
  em_construcao: 'Em Construção',
  imovel_pronto: 'Pronto',
}

export const statusLabel = (s: DevelopmentStatus) => STATUS_META[s]?.label ?? s
export const statusBadgeStyle = (s: DevelopmentStatus) => {
  const c = STATUS_META[s]?.color ?? '#64748B'
  return { color: c, backgroundColor: c + '1F' }
}
export const regiaoLabel = (r: DevelopmentRegiao) => REGIAO_LABELS[r] ?? r

// imagem de capa: a hero, senão a primeira
export const heroImage = (d: Development) =>
  d.images.find((i) => i.kind === 'hero')?.url || d.images[0]?.url || ''

// URL canônica profunda (SEO) da LP: /imoveis/{uf}/{cidade}/{tipo}/{bairro}/{slug}
export const developmentUrl = (d: {
  uf: string
  cidadeSlug: string
  tipo: string
  bairroSlug: string
  slug: string
}) => `/imoveis/${d.uf.toLowerCase()}/${d.cidadeSlug}/${d.tipo}/${d.bairroSlug}/${d.slug}`

// rótulo de dormitórios a partir das facetas
export const dormsLabel = (d: Development) => {
  if (!d.bedroomsMax) return ''
  return d.bedroomsMin === d.bedroomsMax
    ? `${d.bedroomsMax} dorm.`
    : `${d.bedroomsMin}–${d.bedroomsMax} dorm.`
}
