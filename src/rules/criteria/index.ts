import type { Rule } from '../types'
import { midpointRule } from './midpoint'
import { notYetDrinkableRule } from './not-yet-drinkable'
import { verticalRule } from './vertical'
import { owcRule } from './owc'
import { sqnWhitesRule } from './sqn-whites'
import { sweetWinesRule } from './sweet-wines'
import { kitchenRule } from './kitchen'

export const defaultRules: Rule[] = [
  midpointRule,
  notYetDrinkableRule,
  verticalRule,
  kitchenRule,
  owcRule,
  sweetWinesRule,
  sqnWhitesRule,
]
