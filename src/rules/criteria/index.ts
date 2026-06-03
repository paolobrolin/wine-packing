import type { Rule } from '../types'
import { midpointRule } from './midpoint'
import { verticalRule } from './vertical'
import { owcRule } from './owc'
import { sqnWhitesRule } from './sqn-whites'

export const defaultRules: Rule[] = [
  midpointRule,
  verticalRule,
  owcRule,
  sqnWhitesRule,
]
