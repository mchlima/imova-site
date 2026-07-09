// Tipos e helpers de Oportunidade compartilhados entre a página de Oportunidades,
// o Follow-up e o componente OpportunityDrawer.

export interface Activity {
  id: string
  type: string
  title: string
  notes: string
  dueAt: string | null
  done: boolean
  doneAt: string | null
  author: string
  createdAt: string
}
// Evento do histórico (log imutável de alterações/movimentações).
// type: created | stage_changed | won | lost | pipeline_changed
//     | assignees_changed | temperature_changed | fields_updated
export interface OpportunityEvent {
  id: string
  type: string
  // payload por tipo (from/to, rótulos congelados, etc.)
  data: Record<string, unknown>
  author: string
  createdAt: string
}
// Comentário interno da equipe (aba "Comentários").
export interface OpportunityComment {
  id: string
  body: string
  authorId: string
  author: string
  createdAt: string
  updatedAt: string
}
// Forma de contato (vários por pessoa): email | whatsapp | telefone | outro.
export interface ContactChannel {
  id: string
  type: string
  value: string
}
// Forma de contato ainda não persistida (sem id) — usada em forms de criação.
export interface DraftChannel {
  type: string
  value: string
}

// Pessoa dona da oportunidade. Residência = onde MORA (≠ interesse de compra).
export interface Contact {
  id: string
  name: string
  channels: ContactChannel[]
  residenceUf: string
  residenceCity: string
  residenceStreetType: string
  residenceStreet: string
  residenceNumber: string
  residenceComplement: string
  residenceNeighborhood: string
  residencePostalCode: string
}

export const CHANNEL_LABELS: Record<string, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  outro: 'Outro',
}
// Ícone (AdminIcon) de cada forma de contato.
export const CHANNEL_ICONS: Record<string, string> = {
  email: 'mail',
  whatsapp: 'whatsapp',
  telefone: 'phone',
  outro: 'message',
}
// primeiro canal de um tipo (ex.: e-mail/whatsapp principal para exibição)
export const firstChannel = (c: Contact | null | undefined, type: string) =>
  c?.channels?.find((ch) => ch.type === type)?.value || ''
export const contactEmail = (c: Contact | null | undefined) => firstChannel(c, 'email')
// número para WhatsApp: prioriza canal whatsapp, cai para telefone
export const contactWhatsapp = (c: Contact | null | undefined) =>
  firstChannel(c, 'whatsapp') || firstChannel(c, 'telefone')

// Endereço de residência em uma linha (vazio se não preenchido).
export const formatResidence = (c: Contact | null | undefined) => {
  if (!c) return ''
  const line1 = [c.residenceStreetType, c.residenceStreet, c.residenceNumber]
    .filter(Boolean)
    .join(' ')
  return [
    line1,
    c.residenceComplement,
    c.residenceNeighborhood,
    [c.residenceCity, c.residenceUf].filter(Boolean).join('/'),
    c.residencePostalCode,
  ]
    .filter(Boolean)
    .join(', ')
}

// Responsável pela oportunidade (usuário do CRM). Exibido como avatar no card.
export interface Assignee {
  id: string
  name: string
}

export interface Opportunity {
  id: string
  contact: Contact
  source: string
  // título opcional (vazio = usa o nome do contato p/ exibição — ver oppTitle)
  title: string
  // descrição livre (markdown) da oportunidade
  description: string
  // estágio atual do funil (id interno). Pode vir null em bases antigas.
  stageId: string | null
  // board (pipeline) onde a oportunidade vive. Pode vir null em bases antigas.
  pipelineId: string | null
  boardOrder: number
  lossReason: string
  temperature: string
  date: string
  // valores dos campos personalizados (qualificação, preferências, etc.) — ADR 0001
  fields: Record<string, unknown>
  createdAt: string
  activities: Activity[]
  // histórico de alterações/movimentações (mais recente primeiro)
  events: OpportunityEvent[]
  // comentários internos (mais antigo primeiro)
  comments: OpportunityComment[]
  // nº de documentos anexados A ESTA oportunidade (indicador no card)
  documentsCount: number
  // responsáveis (0..N) — vêm do backend como { id, name }
  assignees: Assignee[]
}

// Nome de exibição da oportunidade: título quando definido, senão o nome do contato.
export const oppTitle = (
  o: { title?: string; contact?: { name?: string } } | null | undefined,
) => (o?.title || '').trim() || o?.contact?.name || ''

// Iniciais para o avatar: primeira letra do primeiro e do último nome.
export const initials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// Paleta de cores dos avatares (fundo forte / texto claro), escolhida de forma
// determinística a partir de uma semente (id do usuário) para ficar estável.
const AVATAR_COLORS = [
  '#146c4e', '#B45309', '#4338CA', '#0E7490', '#9333EA',
  '#BE123C', '#0F766E', '#C2410C', '#1D4ED8', '#7C3AED',
]
export const avatarColor = (seed: string) => {
  let h = 0
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export type RawOpportunity = Omit<Opportunity, 'date' | 'documentsCount'> & {
  createdAt: string
  activities: Activity[]
  // contagem de relações vinda do Prisma (_count)
  _count?: { documents?: number }
}

// Dados de INTERESSE vêm do simulador (seção 'simulador' em fields). O backend é
// genérico e não conhece esses campos — o conhecimento do domínio fica aqui, no site.
type WithFields = { fields?: Record<string, unknown> }
const sim = (o: WithFields | null | undefined) =>
  ((o?.fields as Record<string, Record<string, unknown>> | undefined)?.simulador ?? {}) as Record<
    string,
    unknown
  >
export const oppUf = (o: WithFields | null | undefined) => String(sim(o).uf ?? '')
export const oppCity = (o: WithFields | null | undefined) => String(sim(o).city ?? '')
export const oppPropertyValue = (o: WithFields | null | undefined) => Number(sim(o).propertyValue ?? 0)
export const oppIncome = (o: WithFields | null | undefined) => Number(sim(o).income ?? 0)

// Origem do lead (genérico). Rótulos amigáveis por fonte conhecida.
export const SOURCE_LABELS: Record<string, string> = {
  simulador: 'Simulador',
  capture: 'Captura',
  manual: 'Manual',
  import: 'Importação',
}
export const sourceLabel = (s: string | null | undefined) =>
  s ? SOURCE_LABELS[s] || s : '—'

// Motivos de perda (lista curada) — usados ao marcar uma oportunidade como perdida.
export const LOSS_REASONS = ['Sem retorno', 'Fora do perfil', 'Comprou com outro', 'Sem interesse', 'Outro']

// Temperatura: opções + cor do chip (hex + alpha), no mesmo padrão do status.
export const TEMPS = ['Quente', 'Morno', 'Frio', 'Sem classificação']
export const TEMP_HEX: Record<string, string> = {
  Quente: '#146c4e',
  Morno: '#B45309',
  Frio: '#64748B',
  'Sem classificação': '#94A3B8',
}
export const tempBadgeStyle = (t: string) => {
  const c = TEMP_HEX[t] || '#94A3B8'
  return { color: c, backgroundColor: c + '1F' }
}

export const padNum = (x: number) => String(x).padStart(2, '0')

export const fmtOpportunityDate = (iso: string) => {
  const d = new Date(iso)
  return `${padNum(d.getDate())}/${padNum(d.getMonth() + 1)}/${d.getFullYear()}`
}
export const fmtNoteDate = (iso: string) => {
  const d = new Date(iso)
  return `${padNum(d.getDate())}/${padNum(d.getMonth() + 1)} ${padNum(d.getHours())}:${padNum(d.getMinutes())}`
}
export const fmtDateTime = fmtNoteDate
export const fmtBRL = (n: number) => (n ? 'R$ ' + Math.round(n).toLocaleString('pt-BR') : '—')

export function mapOpportunity(r: RawOpportunity): Opportunity {
  return {
    ...r,
    date: fmtOpportunityDate(r.createdAt),
    documentsCount: r._count?.documents ?? 0,
  }
}

export function dueState(iso: string | null) {
  if (!iso) return 'none'
  const d = new Date(iso)
  const now = new Date()
  if (d.getTime() < now.getTime()) return 'overdue'
  return d.toDateString() === now.toDateString() ? 'today' : 'future'
}
