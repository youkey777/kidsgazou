import type { ChildKey, ImageRecord } from '../db'
export { clampStat } from './character-rules'

export type BattleMode = 'combo' | 'dice' | 'rps' | 'turn' | 'tap' | 'team'
export type PlayableBattleMode = 'combo' | 'team'
export type BattleTab = 'battle' | 'training' | 'attribute' | 'ranking'
export type RpsHand = 'rock' | 'scissors' | 'paper'
export type TurnAction = 'attack' | 'ultimate' | 'guard' | 'run'

export type BattleCharacter = ImageRecord

export type BattleRecord = {
  id: string
  mode: string
  winnerId: string | null
  loserId: string | null
  winnerTeam: ChildKey | null
  createdAt: number
}

export type BattleResult = {
  winner: BattleCharacter
  loser: BattleCharacter
  winnerTeam?: ChildKey
}

export type DamageEvent = {
  id: string
  target: 'left' | 'right'
  amount: number
  label?: string
}

export type FighterState = {
  hp: number
  maxHp: number
  guarding: boolean
}

export const MODE_LABELS: Record<BattleMode, string> = {
  combo: 'じゃんけん＋サイコロ',
  dice: '🎲 ダイス',
  rps: '✊ じゃんけん',
  turn: '⚔️ ターン',
  tap: '👆 タップ',
  team: '🏆 3vs3',
}

export const HAND_LABELS: Record<RpsHand, string> = {
  rock: 'グー',
  scissors: 'チョキ',
  paper: 'パー',
}

export const HAND_EMOJI: Record<RpsHand, string> = {
  rock: '✊',
  scissors: '✌️',
  paper: '✋',
}

export function starsForLevel(level: number) {
  return Math.max(1, Math.min(5, Math.ceil(level / 10)))
}

export function hpPercent(current: number, max: number) {
  return `${Math.max(0, Math.min(100, (current / max) * 100))}%`
}

export function makeEventId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function shortBattleName(name: string) {
  return name.replace(/\.[^.]+$/, '').slice(0, 10) || 'キャラ'
}
