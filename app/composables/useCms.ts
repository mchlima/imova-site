// Public CMS access (SSR-friendly). Reads the published snapshots served by the
// NestJS backend at /content/*. No credentials needed — this is the public site.

export interface CmsSeoGeo {
  description: string
  intro: string
  faq: { q: string; a: string }[]
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  ogImage: string
}

export interface CmsCategoryNode extends CmsSeoGeo {
  id: string
  name: string
  slug: string
  level: number
  parentId: string | null
  order: number
  children: CmsCategoryNode[]
}

export interface CmsTag extends CmsSeoGeo {
  id: string
  name: string
  slug: string
}

export interface CmsPathItem {
  name: string
  slug: string
}

// Published snapshot served by /content/posts and /content/posts/:slug.
export interface CmsPost {
  slug: string
  title: string
  deck: string
  coverImageUrl?: string
  bodyHtml: string
  bullets: string[]
  faq: { q: string; a: string }[]
  seo: {
    metaTitle: string
    metaDescription: string
    canonicalUrl: string
    ogImage: string
  }
  category: { path: CmsPathItem[] }
  tags: CmsPathItem[]
  author: { name: string }
  readingTime: number
  publishedAt: string
  updatedAt?: string
}

export function useCms() {
  const apiBase = useRuntimeConfig().public.apiBase
  const get = <T>(path: string, query?: Record<string, string | undefined>) =>
    $fetch<T>(path, { baseURL: apiBase, query })

  return {
    categories: () => get<CmsCategoryNode[]>('/content/categories'),
    tags: () => get<CmsTag[]>('/content/tags'),
    posts: (query?: { category?: string; tag?: string; q?: string }) =>
      get<CmsPost[]>('/content/posts', query),
    post: (slug: string) => get<CmsPost>(`/content/posts/${slug}`),
  }
}

// Card shape consumed by GuiaCard, derived from a published snapshot.
export interface GuiaCardArticle {
  slug: string
  category: string
  title: string
  summary: string
  cover?: string
  tags: string[]
}

export function postToCard(p: CmsPost): GuiaCardArticle {
  const path = p.category?.path ?? []
  return {
    slug: p.slug,
    category: path.length ? path[path.length - 1]!.name : 'Guia',
    title: p.title,
    summary: p.deck,
    cover: p.coverImageUrl || '',
    tags: (p.tags ?? []).map((t) => t.name),
  }
}

// Minimal inline markdown for résumé bullets (bold + italics only).
export function inlineMd(text: string): string {
  const esc = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
}
