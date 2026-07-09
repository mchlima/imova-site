// Documentos (arquivos) do lead — armazenados no R2 privado, acessíveis só via URL
// pré-assinada. O dono é o CONTATO (reutilizável); opportunityId (nullable) é a
// oportunidade que originou o envio.
export interface DocumentItem {
  id: string
  contactId: string
  opportunityId: string | null
  fileName: string
  mimeType: string
  size: number
  uploadedBy: string
  createdAt: string
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
