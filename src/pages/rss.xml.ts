import rss from '@astrojs/rss'
import type {APIRoute} from 'astro'
import type {PortableTextBlock} from '@portabletext/types'
import {sanityClient} from '../lib/sanity'
import {SITE_DESCRIPTION, SITE_TITLE} from '../consts'

type Article = {
  title: string
  slug: string
  createdAt: string
  body?: PortableTextBlock[]
}

function articleDescription(body: PortableTextBlock[] | undefined) {
  const text = (body ?? [])
    .flatMap((block) => 'children' in block && Array.isArray(block.children) ? block.children : [])
    .map((child) => 'text' in child && typeof child.text === 'string' ? child.text : '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return 'A practical chess article from ChessBadger.'
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text
}

export const GET: APIRoute = async (context) => {
  const articles = await sanityClient.fetch<Article[]>(`
    *[_type == "article" && defined(slug.current)] | order(_createdAt desc) {
      title,
      "slug": slug.current,
      "createdAt": _createdAt,
      body
    }
  `)

  return rss({
    title: `${SITE_TITLE} Articles`,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: articles.map((article) => ({
      title: article.title,
      description: articleDescription(article.body),
      pubDate: new Date(article.createdAt),
      link: `/articles/${article.slug}/`,
    })),
    customData: '<language>en-us</language>',
  })
}
