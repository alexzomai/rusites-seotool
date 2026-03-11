export function faviconSrc(slug: string): string {
  return `/api/favicon/${slug.replace(/\//g, "_")}`;
}
