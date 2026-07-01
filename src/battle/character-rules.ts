import type { ImageRecord } from '../db'

export type StatKey = 'atk' | 'def' | 'spd' | 'luck' | 'tech'

export const STAT_LABELS: Record<StatKey, string> = {
  atk: '攻撃力(こうげきりょく)',
  def: '防御力(ぼうぎょりょく)',
  spd: '素早(すばや)さ',
  luck: '運(うん)',
  tech: '技術力(ぎじゅつりょく)',
}

export const STAT_CHART_LABELS: Record<StatKey, string> = {
  atk: 'こうげき',
  def: 'ぼうぎょ',
  spd: 'すばやさ',
  luck: 'うん',
  tech: 'ぎじゅつ',
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

export const ATTRIBUTE_MARKS: Record<string, string> = {
  ほのお: '🔥',
  みず: '💧',
  かぜ: '🌪️',
  つち: '⛰️',
  ひかり: '✨',
  やみ: '🌑',
  でんき: '⚡',
  こおり: '❄️',
  くさ: '🌿',
  はがね: '⚙️',
  まほう: '🔮',
  ドラゴン: '🐉',
  ロボ: '🤖',
  スター: '🌟',
  ふしぎ: '🌀',
}

export type AttributeAffinityRank = -3 | -2 | -1 | 0 | 1 | 2 | 3

export type AttributeAffinity = {
  rank: AttributeAffinityRank
  label: string
  shortLabel: string
  multiplier: number
}

export const AFFINITY_LEVELS: Record<AttributeAffinityRank, AttributeAffinity> = {
  3: { rank: 3, label: 'かなり強(つよ)い', shortLabel: 'かなり強', multiplier: 1.34 },
  2: { rank: 2, label: 'やや強(つよ)い', shortLabel: 'やや強', multiplier: 1.2 },
  1: { rank: 1, label: 'ちょっと強(つよ)い', shortLabel: 'ちょい強', multiplier: 1.1 },
  0: { rank: 0, label: 'ふつう', shortLabel: 'ふつう', multiplier: 1 },
  [-1]: { rank: -1, label: 'ちょっと弱(よわ)い', shortLabel: 'ちょい弱', multiplier: 0.92 },
  [-2]: { rank: -2, label: 'やや弱(よわ)い', shortLabel: 'やや弱', multiplier: 0.82 },
  [-3]: { rank: -3, label: 'かなり弱(よわ)い', shortLabel: 'かなり弱', multiplier: 0.72 },
}

const AFFINITY_BY_DISTANCE: AttributeAffinityRank[] = [
  0,
  3,
  2,
  1,
  0,
  -1,
  -2,
  -3,
  3,
  2,
  1,
  0,
  -1,
  -2,
  -3,
]

export function attributeMark(attribute: string) {
  return ATTRIBUTE_MARKS[attribute] ?? ATTRIBUTE_MARKS.ふしぎ
}

export const ATTRIBUTE_ADVANTAGE: Record<string, string[]> = {
  ほのお: ['くさ', 'こおり', 'はがね'],
  みず: ['ほのお', 'つち', 'ロボ'],
  かぜ: ['くさ', 'みず', 'まほう'],
  つち: ['でんき', 'はがね', 'ほのお'],
  ひかり: ['やみ', 'ふしぎ', 'ドラゴン'],
  やみ: ['ひかり', 'まほう', 'スター'],
  でんき: ['みず', 'ロボ', 'かぜ'],
  こおり: ['かぜ', 'ドラゴン', 'くさ'],
  くさ: ['みず', 'つち', 'スター'],
  はがね: ['こおり', 'スター', 'ロボ'],
  まほう: ['ドラゴン', 'ふしぎ', 'つち'],
  ドラゴン: ['ロボ', 'ほのお', 'やみ'],
  ロボ: ['スター', 'まほう', 'はがね'],
  スター: ['ふしぎ', 'ひかり', 'でんき'],
  ふしぎ: ['ロボ', 'やみ', 'かぜ'],
}

export function strongAgainst(attribute: string) {
  return ATTRIBUTES.filter((target) => target !== attribute && attributeAffinity(attribute, target).rank > 0)
}

export function attributeAffinity(attackerAttribute: string, defenderAttribute: string): AttributeAffinity {
  const attackerIndex = Math.max(0, ATTRIBUTES.indexOf(attackerAttribute))
  const defenderIndex = Math.max(0, ATTRIBUTES.indexOf(defenderAttribute))
  if (attackerIndex === defenderIndex) return AFFINITY_LEVELS[0]
  const distance = (defenderIndex - attackerIndex + ATTRIBUTES.length) % ATTRIBUTES.length
  return AFFINITY_LEVELS[AFFINITY_BY_DISTANCE[distance] ?? 0]
}

export function attributeMultiplier(attackerAttribute: string, defenderAttribute: string) {
  return attributeAffinity(attackerAttribute, defenderAttribute).multiplier
}

export function randomStat() {
  const low = Math.floor(Math.random() * 30) + 1
  const mid = Math.floor(Math.random() * 20) + 31
  return Math.random() < 0.72 ? low : mid
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
  const diePower = [0, 0.58, 0.74, 0.92, 1.12, 1.36, 1.72][die] ?? 1
  const attackScore = attacker.atk * diePower
  const techScore = attacker.tech * (0.1 + die * 0.04)
  const luckVariance = 0.86 + (attacker.luck / 99) * 0.22 + Math.random() * 0.18
  const defenseScore = defender.def * (0.22 + defender.tech / 650)
  const raw = (defender.hp * (0.04 + die * 0.035) + attackScore + techScore - defenseScore) * luckVariance
  const critical = Math.random() < (attacker.luck + die * 4) / 460
  const boosted = (critical ? raw * 1.24 : raw) * attributeMultiplier(attacker.species, defender.species)
  const minimum = Math.max(8 + die * 5, Math.floor(defender.hp * (0.06 + die * 0.025)))
  const maximum = Math.max(24 + die * 11, Math.floor(defender.hp * (0.15 + die * 0.055)))
  return Math.max(minimum, Math.min(maximum, Math.floor(boosted)))
}

export function calculateRpsDamage(attacker: ImageRecord, defender: ImageRecord) {
  const attackScore = attacker.atk * 1.55
  const techScore = attacker.tech * 0.34
  const defenseScore = defender.def * 0.42
  const luckVariance = 0.84 + (attacker.luck / 99) * 0.28 + Math.random() * 0.2
  const critical = Math.random() < attacker.luck / 360
  const raw = (attackScore + techScore - defenseScore) * luckVariance
  const boosted = (critical ? raw * 1.28 : raw) * attributeMultiplier(attacker.species, defender.species)
  return Math.max(18, Math.min(Math.floor(defender.hp * 0.5), Math.floor(boosted)))
}

export function calculateTeamDamage(attacker: ImageRecord, defender: ImageRecord) {
  const attackScore = attacker.atk * (0.8 + Math.random() * 0.35)
  const techScore = attacker.tech * 0.22
  const luckScore = attacker.luck * (0.08 + Math.random() * 0.12)
  const defenseScore = defender.def * 0.48
  const raw = attackScore + techScore + luckScore - defenseScore
  return Math.max(8, Math.floor(raw * attributeMultiplier(attacker.species, defender.species)))
}
