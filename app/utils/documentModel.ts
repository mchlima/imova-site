// Documentos (arquivos) do lead — armazenados no R2 privado, acessíveis só via URL
// pré-assinada. O dono é o CONTATO (reutilizável); opportunityId (nullable) é a
// oportunidade que originou o envio.
export interface DocumentItem {
  id: string
  contactId: string
  opportunityId: string | null
  category: string
  categoryLabel: string
  fileName: string
  mimeType: string
  size: number
  uploadedBy: string
  createdAt: string
}

// Categorias curadas + "Outro" (texto livre em categoryLabel).
export const DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: 'rg_cpf', label: 'RG / CPF' },
  { value: 'comprovante_renda', label: 'Comprovante de renda' },
  { value: 'comprovante_residencia', label: 'Comprovante de residência' },
  { value: 'extrato_bancario', label: 'Extrato bancário' },
  { value: 'imposto_renda', label: 'Imposto de renda' },
  { value: 'certidao', label: 'Certidão' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'outro', label: 'Outro' },
]

const CATEGORY_MAP = Object.fromEntries(DOC_CATEGORIES.map((c) => [c.value, c.label]))

// Rótulo exibível: categoria curada, ou o texto livre quando 'outro'.
export function docCategoryLabel(d: DocumentItem): string {
  if (d.category === 'outro') return d.categoryLabel?.trim() || 'Outro'
  return CATEGORY_MAP[d.category] || d.categoryLabel || 'Documento'
}

export function fmtFileSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Ícone (emoji) simples por tipo de arquivo.
export function fileEmoji(mime: string): string {
  if (mime === 'application/pdf') return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  return '📎'
}

// Tipos aceitos no input (mantém em sincronia com o backend).
export const DOC_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,application/pdf,image/*'
export const DOC_MAX_BYTES = 25 * 1024 * 1024
