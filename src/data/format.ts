export function displayVintage(vintage: string | null): string {
  if (!vintage || vintage === '1001') return 'NV'
  return vintage
}
