import type { ImageRecord } from '../db'
import { calculateDiceDamage, effectiveUltimateName } from './character-rules'
import type { RpsHand } from './types'

export const RPS_HANDS: RpsHand[] = ['rock', 'scissors', 'paper']

export const RPS_HAND_IMAGES: Record<RpsHand, string> = {
  rock: '/battle/rps-rock.png',
  scissors: '/battle/rps-scissors.png',
  paper: '/battle/rps-paper.png',
}

export const KING_KARUBI_FEAST_CHANCE = 0.3
export const KING_KARUBI_ID = 'mr0pa9fv-ypib1x0'
export const RUI_PYONPYON_ID = 'mrkd1xgg-e5xdn80'
export const RUI_PYONPYON_TRIPLE_CHANCE = 0.28

export type CharacterAbilityInfo = {
  id: string
  icon: string
  name: string
  description: string
  color: string
}

export function judgeRps(leftHand: RpsHand, rightHand: RpsHand) {
  if (leftHand === rightHand) return 0
  if (
    (leftHand === 'rock' && rightHand === 'scissors') ||
    (leftHand === 'scissors' && rightHand === 'paper') ||
    (leftHand === 'paper' && rightHand === 'rock')
  ) {
    return 1
  }
  return -1
}

export function rollBattleDie() {
  const roll = Math.random()
  if (roll < 0.22) return 1
  if (roll < 0.44) return 2
  if (roll < 0.64) return 3
  if (roll < 0.8) return 4
  if (roll < 0.93) return 5
  return 6
}

export function randomRpsHand() {
  return RPS_HANDS[Math.floor(Math.random() * RPS_HANDS.length)]
}

export function isBlueberryHashinini(character: ImageRecord) {
  return character.id === 'mr0pa7o3-pkaaxx0' || character.name.includes('ブルーベリーハシニーニ')
}

export function isCaptainFrog(character: ImageRecord) {
  return (
    character.id === 'mr0pa92q-axyh3w0' ||
    character.name.includes('キャプテンフロッグ') ||
    character.name.includes('キャプテンフロック') ||
    character.name.includes('キャプテンフラッグ')
  )
}

export function isKingKarubi(character: ImageRecord) {
  const normalizedName = character.name.replace(/[\s_.・-]/g, '')
  return (
    character.id === KING_KARUBI_ID ||
    normalizedName.includes('キングカルビ') ||
    normalizedName.includes('キングガルビー') ||
    normalizedName.includes('キングカルビー')
  )
}

export function isRuiPyonPyon(character: ImageRecord) {
  const normalizedName = character.name
    .replace(/\.[^.]+$/, '')
    .replace(/[\s_.・ー-]/g, '')
    .replace(/ピョン/g, 'ぴょん')
  return character.id === RUI_PYONPYON_ID || normalizedName.includes('ルイぴょんぴょん')
}

export function characterAbilities(character: ImageRecord): CharacterAbilityInfo[] {
  const abilities: CharacterAbilityInfo[] = []
  if (isRuiPyonPyon(character)) {
    abilities.push({
      id: 'rui-triple',
      icon: '🐇',
      name: '3連続攻撃',
      description: 'じゃんけんに勝ってサイコロを振ったあと、28%の確率で1回ずつダメージが出る3連続攻撃！',
      color: 'from-yellow-300 via-orange-400 to-fuchsia-500',
    })
  }
  if (isBlueberryHashinini(character)) {
    abilities.push({
      id: 'durian-counter',
      icon: '🥭',
      name: 'ドリアン投げ',
      description: '攻撃を受ける時、50%の確率でドリアンを投げ返してカウンター攻撃！',
      color: 'from-lime-300 via-green-500 to-emerald-700',
    })
  }
  if (isCaptainFrog(character)) {
    abilities.push({
      id: 'captain-dynamite',
      icon: '🧨',
      name: 'ダイナマイト',
      description: '攻撃する時、50%の確率で1〜4個のダイナマイトを仕掛ける！',
      color: 'from-orange-300 via-red-500 to-zinc-900',
    })
  }
  if (isKingKarubi(character)) {
    abilities.push({
      id: 'king-feast',
      icon: '🍖',
      name: '王のごちそう',
      description: '2ターン目から毎ターン、30%の確率で焼きカルビを食べてHPが全回復！',
      color: 'from-yellow-300 via-amber-500 to-red-700',
    })
  }
  return abilities
}

export function shouldDurianCounter(defender: ImageRecord) {
  return isBlueberryHashinini(defender) && Math.random() < 0.5
}

export function shouldPlantDynamite(attacker: ImageRecord) {
  return isCaptainFrog(attacker) && Math.random() < 0.5
}

export function shouldKingKarubiFeast(
  defender: ImageRecord,
  random: () => number = Math.random
) {
  return isKingKarubi(defender) && random() < KING_KARUBI_FEAST_CHANCE
}

export function shouldRuiTripleAttack(
  attacker: ImageRecord,
  random: () => number = Math.random
) {
  return isRuiPyonPyon(attacker) && random() < RUI_PYONPYON_TRIPLE_CHANCE
}

function seededRandom(seed: string) {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

export function shouldKingKarubiFeastOnOnlineTurn(
  character: ImageRecord,
  roomId: string,
  turn: number,
  side: 'host' | 'guest'
) {
  if (turn < 2) return false
  return shouldKingKarubiFeast(character, () => seededRandom(`${roomId}:${turn}:${side}`))
}

export function rollDynamiteCount() {
  const roll = Math.random() * 110
  if (roll < 50) return 1
  if (roll < 80) return 2
  if (roll < 100) return 3
  return 4
}

export function rollDynamiteDamage() {
  return 50 + Math.floor(Math.random() * 11)
}

export function ultimateName(character: ImageRecord, die: number) {
  if (die === 4 || die === 5 || die === 6) return effectiveUltimateName(character, die)
  return 'エナジーアタック'
}

export function calculateBattleDamage(attacker: ImageRecord, defender: ImageRecord, die: number, defenderHp: number) {
  return die === 6 ? defenderHp : calculateDiceDamage(attacker, defender, die)
}
