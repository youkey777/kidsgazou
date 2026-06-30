import type { ImageRecord } from '../db'

export type StatKey = 'atk' | 'def' | 'spd' | 'luck' | 'tech'

export const STAT_LABELS: Record<StatKey, string> = {
  atk: '攻撃力',
  def: '防御力',
  spd: '素早さ',
  luck: '運',
  tech: '技術力',
}

export const ATTRIBUTES = [
  'ほのお',
  'みず',
  'かぜ',
  'つち',
  'ひかり',
  'やみ',
  'でんき',
  'こおり',
  'くさ',
  'はがね',
  'まほう',
  'ドラゴン',
  'ロボ',
  'スター',
  'ふしぎ',
]

export function randomStat() {
  return Math.floor(Math.random() * 99) + 1
}

export function randomAttribute() {
  return ATTRIBUTES[Math.floor(Math.random() * ATTRIBUTES.length)]
}

export function clampStat(value: number) {
  return Math.max(1, Math.min(99, Math.round(value)))
}

export function randomBattleStats() {
  return {
    hp: 100,
    atk: randomStat(),
    def: randomStat(),
    spd: randomStat(),
    luck: randomStat(),
    tech: randomStat(),
    species: randomAttribute(),
    ultimateName: 'ひっさつわざ',
  }
}

export function growWinnerStats(character: ImageRecord) {
  const grow = (value: number) => clampStat(value * (1.03 + Math.random() * 0.02))
  return {
    atk: grow(character.atk),
    def: grow(character.def),
    spd: grow(character.spd),
    luck: grow(character.luck),
    tech: grow(character.tech),
  }
}

export function calculateDiceDamage(attacker: ImageRecord, defender: ImageRecord, die: number) {
  const attackScore = attacker.atk * (0.42 + die * 0.05)
  const techScore = attacker.tech * (0.08 + die * 0.015)
  const luckVariance = 0.9 + (attacker.luck / 99) * 0.24 + Math.random() * 0.16
  const defenseScore = defender.def * (0.22 + defender.tech / 650)
  const raw = (defender.hp * (0.1 + die * 0.022) + attackScore + techScore - defenseScore) * luckVariance
  const critical = Math.random() < attacker.luck / 420
  const boosted = critical ? raw * 1.22 : raw
  const minimum = Math.max(16, Math.floor(defender.hp * 0.16))
  const maximum = Math.max(34, Math.floor(defender.hp * 0.42))
  return Math.max(minimum, Math.min(maximum, Math.floor(boosted)))
}

export function calculateRpsDamage(attacker: ImageRecord, defender: ImageRecord) {
  const attackScore = attacker.atk * 1.55
  const techScore = attacker.tech * 0.34
  const defenseScore = defender.def * 0.42
  const luckVariance = 0.84 + (attacker.luck / 99) * 0.28 + Math.random() * 0.2
  const critical = Math.random() < attacker.luck / 360
  const raw = (attackScore + techScore - defenseScore) * luckVariance
  const boosted = critical ? raw * 1.28 : raw
  return Math.max(18, Math.min(Math.floor(defender.hp * 0.5), Math.floor(boosted)))
}

export function calculateTeamDamage(attacker: ImageRecord, defender: ImageRecord) {
  const attackScore = attacker.atk * (0.8 + Math.random() * 0.35)
  const techScore = attacker.tech * 0.22
  const luckScore = attacker.luck * (0.08 + Math.random() * 0.12)
  const defenseScore = defender.def * 0.48
  return Math.max(8, Math.floor(attackScore + techScore + luckScore - defenseScore))
}
