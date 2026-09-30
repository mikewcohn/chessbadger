export function playerProgressUrl(origin: string, slug: string) {
  return `${origin.replace(/\/$/, '')}/players/${encodeURIComponent(slug)}`
}
