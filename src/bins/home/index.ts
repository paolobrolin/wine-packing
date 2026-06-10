import type { BinRule } from '../types'
import { homeItalyRule, homeFranceRule, homeSpainRule, homeUsaRule, homeGermanyRule, homeFallbackRule } from './regions'
import { homeBubbelRule } from './bubbel'
import { homeVitaRule } from './vita'

export const homeBinRules: BinRule[] = [
  homeBubbelRule,
  homeVitaRule,
  homeItalyRule,
  homeFranceRule,
  homeSpainRule,
  homeUsaRule,
  homeGermanyRule,
  homeFallbackRule,
]
