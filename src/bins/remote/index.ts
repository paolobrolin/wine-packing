import type { BinRule } from '../types'
import { owcRule } from './owc'
import { sqnOwcRule, sqnRegularRule, nokRegularRule } from './sqn'
import { napaRule } from './napa'
import { californiaRule } from './california'
import { piemontePrestigeRule } from './piemonte-prestige'
import { bdxLbRule, bdxRbRule } from './bdx'
import { rhoneNorthRule, rhoneSouthRule } from './rhone'
import { champagneRule } from './champagne'
import { bourgogneRule } from './bourgogne'
import { deMoselRule } from './de-mosel'
import { baroloModernRule, baroloClassicRule, baroloFallbackRule } from './barolo'
import { barbarescoRule } from './barbaresco'
import { toscanaRule } from './toscana'
import { siciliaRule } from './sicilia'
import { spMainRule } from './sp-main'
import { newWorldCatchallRule, frCatchallRule, deCatchallRule, itCatchallRule, spCatchallRule, globalFallbackRule } from './catchalls'

export const remoteBinRules: BinRule[] = [
  owcRule,
  sqnOwcRule, sqnRegularRule, nokRegularRule,
  napaRule,
  piemontePrestigeRule,
  bdxLbRule, bdxRbRule,
  rhoneNorthRule, rhoneSouthRule,
  champagneRule,
  bourgogneRule,
  deMoselRule,
  baroloModernRule, baroloClassicRule, baroloFallbackRule,
  barbarescoRule,
  toscanaRule, siciliaRule,
  spMainRule,
  californiaRule,
  newWorldCatchallRule, frCatchallRule, deCatchallRule, itCatchallRule, spCatchallRule,
  globalFallbackRule,
]
