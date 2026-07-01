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
  3: { rank: 3, label: 'かなり強(つよ)い', shortLabel: 'かなり強(つよ)い', multiplier: 1.34 },
  2: { rank: 2, label: 'やや強(つよ)い', shortLabel: 'やや強(つよ)い', multiplier: 1.2 },
  1: { rank: 1, label: 'ちょっと強(つよ)い', shortLabel: 'ちょい強(つよ)い', multiplier: 1.1 },
  0: { rank: 0, label: 'ふつう', shortLabel: 'ふつう', multiplier: 1 },
  [-1]: { rank: -1, label: 'ちょっと弱(よわ)い', shortLabel: 'ちょい弱(よわ)い', multiplier: 0.92 },
  [-2]: { rank: -2, label: 'やや弱(よわ)い', shortLabel: 'やや弱(よわ)い', multiplier: 0.82 },
  [-3]: { rank: -3, label: 'かなり弱(よわ)い', shortLabel: 'かなり弱(よわ)い', multiplier: 0.72 },
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
    ultimate4Name: 'ひっさつわざ4',
    ultimate5Name: 'ひっさつわざ5',
    ultimate6Name: 'ひっさつわざ6',
  }
}

const ULTIMATE_NAME_SETS: Record<string, [string, string, string]> = {
  ほのお: ['フレアバースト', 'メテオブレイズ', '太陽(たいよう)の一撃(いちげき)'],
  みず: ['アクアスプラッシュ', 'オーシャンキャノン', '大海流(だいかいりゅう)ブレイク'],
  かぜ: ['ウインドカッター', 'ストームダイブ', '天空(てんくう)ハリケーン'],
  つち: ['ロッククラッシュ', 'アースハンマー', '大地(だいち)のメガインパクト'],
  ひかり: ['ライトアロー', 'シャインブレード', '聖光(せいこう)スターライト'],
  やみ: ['シャドウクロー', 'ナイトメアゲート', '暗黒(あんこく)ブラックホール'],
  でんき: ['スパークショット', 'サンダーボルト', '雷神(らいじん)フルチャージ'],
  こおり: ['アイスニードル', 'ブリザードカノン', '絶対零度(ぜったいれいど)ブレイク'],
  くさ: ['リーフスラッシュ', 'ジャングルバインド', '森(もり)のグランドバースト'],
  はがね: ['メタルパンチ', 'ギアスマッシュ', '鋼鉄(こうてつ)メガドリル'],
  まほう: ['マジックボール', 'クリスタルスペル', '奇跡(きせき)のミラクルノヴァ'],
  ドラゴン: ['ドラゴンクロー', 'ドラゴンフレア', '竜王(りゅうおう)ファイナルブレス'],
  ロボ: ['レーザーショット', 'ロケットドライブ', '超合体(ちょうがったい)メカバースト'],
  スター: ['スターシュート', 'コメットストライク', '銀河(ぎんが)スーパーノヴァ'],
  ふしぎ: ['ミステリーボール', 'ワンダースパイラル', '不思議(ふしぎ)ギャラクシー'],
}

function isDefaultUltimateName(name: string | undefined, die: 4 | 5 | 6) {
  const trimmed = (name ?? '').trim()
  return !trimmed || trimmed === `ひっさつわざ${die}` || trimmed === 'ひっさつわざ'
}

export function effectiveUltimateName(character: ImageRecord, die: 4 | 5 | 6) {
  const current =
    die === 4
      ? character.ultimate4Name
      : die === 5
        ? character.ultimate5Name
        : character.ultimate6Name
  if (!isDefaultUltimateName(current, die)) return current
  const set = ULTIMATE_NAME_SETS[character.species] ?? ULTIMATE_NAME_SETS.ふしぎ
  return set[die - 4]
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
  if (die === 6) return defender.hp
  const diePower = [0, 0.42, 0.56, 0.72, 0.9, 1.08, 1.32][die] ?? 1
  const attackScore = attacker.atk * diePower * 0.58
  const techScore = attacker.tech * (0.06 + die * 0.025)
  const luckVariance = 0.86 + (attacker.luck / 99) * 0.22 + Math.random() * 0.18
  const defenseScore = defender.def * (0.16 + defender.tech / 850)
  const raw = (defender.hp * (0.025 + die * 0.021) + attackScore + techScore - defenseScore) * luckVariance
  const critical = Math.random() < (attacker.luck + die * 4) / 460
  const boosted = (critical ? raw * 1.24 : raw) * attributeMultiplier(attacker.species, defender.species)
  const minimum = Math.max(5 + die * 3, Math.floor(defender.hp * (0.035 + die * 0.014)))
  const maximum = Math.max(12 + die * 6, Math.floor(defender.hp * (0.075 + die * 0.032)))
  return Math.max(minimum, Math.min(maximum, Math.floor(boosted)))
}

export function calculateRpsDamage(attacker: ImageRecord, defender: ImageRecord) {
  const attackScore = attacker.atk * 0.88
  const techScore = attacker.tech * 0.22
  const defenseScore = defender.def * 0.3
  const luckVariance = 0.84 + (attacker.luck / 99) * 0.28 + Math.random() * 0.2
  const critical = Math.random() < attacker.luck / 360
  const raw = (attackScore + techScore - defenseScore) * luckVariance
  const boosted = (critical ? raw * 1.28 : raw) * attributeMultiplier(attacker.species, defender.species)
  return Math.max(14, Math.min(Math.floor(defender.hp * 0.34), Math.floor(boosted)))
}

export function calculateTeamDamage(attacker: ImageRecord, defender: ImageRecord) {
  const attackScore = attacker.atk * (0.8 + Math.random() * 0.35)
  const techScore = attacker.tech * 0.22
  const luckScore = attacker.luck * (0.08 + Math.random() * 0.12)
  const defenseScore = defender.def * 0.48
  const raw = attackScore + techScore + luckScore - defenseScore
  return Math.max(8, Math.floor(raw * attributeMultiplier(attacker.species, defender.species)))
}
