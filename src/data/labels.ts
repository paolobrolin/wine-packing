/**
 * CT label images sit on an open CDN — no session, no token needed. Two sizes
 * exist: the original and a `_100x` thumbnail (~2.6 kB). Verified 2026-09-09;
 * `_200x` and `_400x` return 404, so only these two are safe to build.
 */
const CDN = 'https://cdn.ct-static.com/labels'

export function labelThumbUrl(uuid: string | null | undefined): string | null {
  return uuid ? `${CDN}/${uuid}_100x.jpg` : null
}

export function labelFullUrl(uuid: string | null | undefined): string | null {
  return uuid ? `${CDN}/${uuid}.jpg` : null
}
