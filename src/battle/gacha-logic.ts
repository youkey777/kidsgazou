import type { ImageRecord } from '../db'
import { clampStat, type StatKey } from './character-rules'

export const GACHA_COST = 5
export const GACHA_STAT_KEYS: StatKey[] = ['atk', 'def', 'spd', 'luck', 'tech']
export const GACHA_BOOST_POOL = [5, 5, 5, 10, 10, 15, 15, 20] as const

export type GachaResult = {
  character: ImageRecord
  stat: StatKey
  boost: number
  before: number
  after: number
}

function pick<T>(items: readonly T[], random: () => number): T {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length))
  return items[Math.max(0, index)]
}

export function drawGacha(
  characters: ImageRecord[],
  random: () => number = Math.random
): GachaResult {
  if (characters.length === 0) {
    throw new Error('ガチャの対象(たいしょう)キャラクターがいません')
  }

  const character = pick(characters, random)
  const upgradableStats = GACHA_STAT_KEYS.filter((stat) => character[stat] < 99)
  const stat = pick(upgradableStats.length > 0 ? upgradableStats : GACHA_STAT_KEYS, random)
  const boost = pick(GACHA_BOOST_POOL, random)
  const before = character[stat]
  const after = clampStat(before + boost)

  return { character, stat, boost, before, after }
}
