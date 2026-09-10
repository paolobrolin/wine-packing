/**
 * CT bottle imagery sits on an open CDN — no session, no token needed. Two
 * namespaces exist: `labels/` (curated label scans shared across the site) and
 * `captures/` (photos taken through the CT app). The namespace is part of the
 * address and nothing in the app branches on it, so a ref is stored and passed
 * around as one opaque value: `labels/<uuid>` or `captures/<uuid>`.
 *
 * Two sizes exist: the original and a `_100x` thumbnail (~3 kB). Verified
 * 2026-09-10; `_200x` and `_400x` return 404, so only these two are safe.
 */
const CDN = 'https://cdn.ct-static.com'

export function labelThumbUrl(ref: string | null | undefined): string | null {
  return ref ? `${CDN}/${ref}_100x.jpg` : null
}

export function labelFullUrl(ref: string | null | undefined): string | null {
  return ref ? `${CDN}/${ref}.jpg` : null
}

const REF = /cdn\.ct-static\.com\/(labels|captures)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g

/**
 * Pull a bottle image ref out of a CT `editwine.asp` page — the only place the
 * ref is exposed (no CT export carries it). A curated label wins over an app
 * capture when a wine has both.
 */
export function parseLabelRef(html: string): string | null {
  const found = [...html.matchAll(REF)].map((m) => `${m[1]}/${m[2]}`)
  return found.find((r) => r.startsWith('labels/')) ?? found[0] ?? null
}

/**
 * Tell a real CT page apart from an access rejection, so the harvester aborts
 * instead of hammering the site. CT's WAF answers 403/405 and Kasada 429; an
 * expired `aws-waf-token` instead yields 200 with a near-empty body. A genuine
 * `editwine.asp` page is ~38–44 kB, so 10 kB is a wide margin.
 */
export function looksBlocked(status: number, bodyLength: number): boolean {
  return status !== 200 || bodyLength < 10_000
}
