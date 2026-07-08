// Sitemap dinâmico para o Google Search Console.
// Inclui rotas públicas estáticas + posts/categorias/tags publicados do CMS.
interface SnapshotPost {
  slug: string
  publishedAt?: string
}
interface CatNode {
  slug: string
  children?: CatNode[]
}
interface TagItem {
  slug: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function flattenCats(nodes: CatNode[], out: string[] = []): string[] {
  for (const n of nodes) {
    out.push(n.slug)
    if (n.children?.length) flattenCats(n.children, out)
  }
  return out
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string
  const base = (
    (config.public.siteUrl as string) || getRequestURL(event).origin
  ).replace(/\/+$/, '')

  const [posts, cats, tags] = await Promise.all([
    $fetch<SnapshotPost[]>('/content/posts', { baseURL: apiBase }).catch(() => []),
    $fetch<CatNode[]>('/content/categories', { baseURL: apiBase }).catch(() => []),
    $fetch<TagItem[]>('/content/tags', { baseURL: apiBase }).catch(() => []),
  ])

  type Entry = { loc: string; lastmod?: string; changefreq: string; priority: string }
  const entries: Entry[] = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/simulador-avancado', changefreq: 'monthly', priority: '0.9' },
    { loc: '/guias', changefreq: 'daily', priority: '0.8' },
    { loc: '/politica-de-privacidade', changefreq: 'yearly', priority: '0.3' },
    { loc: '/termos-de-uso', changefreq: 'yearly', priority: '0.3' },
  ]

  for (const p of posts) {
    entries.push({
      loc: `/guias/${p.slug}`,
      lastmod: p.publishedAt ? new Date(p.publishedAt).toISOString() : undefined,
      changefreq: 'monthly',
      priority: '0.7',
    })
  }
  for (const slug of flattenCats(cats)) {
    entries.push({ loc: `/guias/categoria/${slug}`, changefreq: 'weekly', priority: '0.5' })
  }
  for (const t of tags) {
    entries.push({ loc: `/guias/tag/${t.slug}`, changefreq: 'weekly', priority: '0.4' })
  }

  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''
      return `  <url>
    <loc>${esc(base + e.loc)}</loc>${lastmod}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
    })
    .join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
})
