import type { ImageRecord } from '../db'
import { calculateDiceDamage, effectiveUltimateName } from './character-rules'
import type { RpsHand } from './types'

export const RPS_HANDS: RpsHand[] = ['rock', 'scissors', 'paper']

export const RPS_HAND_IMAGES: Record<RpsHand, string> = {
  rock: '/battle/rps-rock.png',
  scissors: '/battle/rps-scissors.png',
  paper: '/battle/rps-paper.png',
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

export function shouldDurianCounter(defender: ImageRecord) {
  return isBlueberryHashinini(defender) && Math.random() < 0.5
}

export function shouldPlantDynamite(attacker: ImageRecord) {
  return isCaptainFrog(attacker) && Math.random() < 0.5
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
