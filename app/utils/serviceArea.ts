// Área de atuação do ReveLar: Região Metropolitana de São Paulo (RMSP).
// Fonte única usada para SEO/GEO (areaServed no JSON-LD), roteamento de
// oportunidades por cidade e conteúdo/landing pages localizados.
// A estrutura é genérica de propósito — para expandir, basta trocar/estender.

export const SERVICE_AREA = {
  region: 'Região Metropolitana de São Paulo',
  uf: 'SP',
  primary: 'São Paulo',
  // 39 municípios da RMSP (São Paulo primeiro; os demais em ordem alfabética).
  cities: [
    'São Paulo',
    'Arujá',
    'Barueri',
    'Biritiba Mirim',
    'Caieiras',
    'Cajamar',
    'Carapicuíba',
    'Cotia',
    'Diadema',
    'Embu das Artes',
    'Embu-Guaçu',
    'Ferraz de Vasconcelos',
    'Francisco Morato',
    'Franco da Rocha',
    'Guararema',
    'Guarulhos',
    'Itapecerica da Serra',
    'Itapevi',
    'Itaquaquecetuba',
    'Jandira',
    'Juquitiba',
    'Mairiporã',
    'Mauá',
    'Mogi das Cruzes',
    'Osasco',
    'Pirapora do Bom Jesus',
    'Poá',
    'Ribeirão Pires',
    'Rio Grande da Serra',
    'Salesópolis',
    'Santa Isabel',
    'Santana de Parnaíba',
    'Santo André',
    'São Bernardo do Campo',
    'São Caetano do Sul',
    'São Lourenço da Serra',
    'Suzano',
    'Taboão da Serra',
    'Vargem Grande Paulista',
  ],
} as const

// Normaliza para comparação (sem acento, caixa baixa, sem espaços nas pontas).
const norm = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// true se a cidade (UF opcional) está na área atendida — base para o
// roteamento de oportunidades (na área → atende; fora → nutrição).
export function isInServiceArea(city: string, uf?: string): boolean {
  if (uf && uf.toUpperCase() !== SERVICE_AREA.uf) return false
  return SERVICE_AREA.cities.some((c) => norm(c) === norm(city))
}

// JSON-LD do negócio com a área de atuação (RMSP) — para SEO/GEO.
// origin = origem absoluta do site (ex.: https://meurevelar.com.br).
export function realEstateAgentLd(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${origin}/#meurevelar`,
    name: 'ReveLar',
    ...(origin ? { url: origin } : {}),
    sameAs: ['https://instagram.com/meurevelar'],
    areaServed: {
      '@type': 'AdministrativeArea',
      name: SERVICE_AREA.region,
      containedInPlace: { '@type': 'State', name: 'São Paulo', alternateName: 'SP' },
    },
    knowsLanguage: 'pt-BR',
  }
}
