import type { BinRule } from '../types'
import { homeItalyRule, homeFranceRule, homeSpainRule, homeUsaRule, homeGermanyRule, homeFallbackRule } from './regions'
import { homeBubbelRule } from './bubbel'
import { homeVitaRule } from './vita'
import { homeSweetFortifiedRule } from './sweet-fortified'

export const homeBinRules: BinRule[] = [
  homeSweetFortifiedRule,
  homeBubbelRule,
  homeVitaRule,
  homeItalyRule,
  homeFranceRule,
  homeSpainRule,
  homeUsaRule,
  homeGermanyRule,
  homeFallbackRule,
]
