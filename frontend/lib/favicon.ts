export function faviconSrc(slug: string): string {
  return `/favicons/${slug.replace(/\//g, "_")}.webp`;
}
