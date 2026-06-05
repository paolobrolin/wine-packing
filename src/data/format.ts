export function displayVintage(vintage: string | null): string {
  if (!vintage || vintage === '1001') return 'NV'
  return vintage
}

export function displayCost(cost: number | null, currency: string | null): string | null {
  if (cost == null) return null
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'kr'
  return `${cost.toLocaleString()} ${symbol}`
}
