import type { ImageRecord } from '../db'
import { isConfigured, supabase } from '../lib/supabase'
import type { RpsHand } from './types'

export type OnlineSide = 'host' | 'guest'
export type OnlinePhase = 'waiting' | 'selecting' | 'choose' | 'reveal' | 'rolling' | 'result' | 'finished'

export type OnlinePendingDynamite = {
  id: string
  owner: OnlineSide
  target: OnlineSide
  explodeRound: number
}

export type OnlineSequenceStep = {
  kind: string
  side?: OnlineSide
  target?: OnlineSide
  text?: string
  die?: number
  damage?: number
}

export type BattleRoom = {
  id: string
  code: string
  status: OnlinePhase
  hostPlayerId: string
  guestPlayerId: string | null
  hostCharacterId: string | null
  guestCharacterId: string | null
  hostHp: number | null
  guestHp: number | null
  round: number
  hostHand: RpsHand | null
  guestHand: RpsHand | null
  lastWinnerSide: OnlineSide | null
  lastDie: number | null
  lastDamage: number | null
  winnerSide: OnlineSide | null
  resultSaved: boolean
  pendingDynamites: OnlinePendingDynamite[]
  lastSequence: OnlineSequenceStep[]
  updatedAt: number
}

type RoomRow = {
  id: string
  code: string
  status: OnlinePhase
  host_player_id: string
  guest_player_id: string | null
  host_character_id: string | null
  guest_character_id: string | null
  host_hp: number | null
  guest_hp: number | null
  round: number | null
  host_hand: RpsHand | null
  guest_hand: RpsHand | null
  last_winner_side: OnlineSide | null
  last_die: number | null
  last_damage: number | null
  winner_side: OnlineSide | null
  result_saved: boolean | null
  pending_dynamites?: unknown
  last_sequence?: unknown
  updated_at: string
}

function ensure() {
  if (!isConfigured || !supabase) throw new Error('Supabase が未設定(みせってい)です')
  return supabase
}

function roomId() {
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function roomCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function normalize(row: RoomRow): BattleRoom {
  const pendingDynamites = Array.isArray(row.pending_dynamites)
    ? (row.pending_dynamites as OnlinePendingDynamite[])
    : []
  const lastSequence = Array.isArray(row.last_sequence)
    ? (row.last_sequence as OnlineSequenceStep[])
    : []
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    hostPlayerId: row.host_player_id,
    guestPlayerId: row.guest_player_id,
    hostCharacterId: row.host_character_id,
    guestCharacterId: row.guest_character_id,
    hostHp: row.host_hp,
    guestHp: row.guest_hp,
    round: row.round ?? 1,
    hostHand: row.host_hand,
    guestHand: row.guest_hand,
    lastWinnerSide: row.last_winner_side,
    lastDie: row.last_die,
    lastDamage: row.last_damage,
    winnerSide: row.winner_side,
    resultSaved: row.result_saved ?? false,
    pendingDynamites,
    lastSequence,
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

const BASE_SELECT =
  'id, code, status, host_player_id, guest_player_id, host_character_id, guest_character_id, host_hp, guest_hp, round, host_hand, guest_hand, last_winner_side, last_die, last_damage, winner_side, result_saved, updated_at'
const EXTENDED_SELECT = `${BASE_SELECT}, pending_dynamites, last_sequence`

let extendedRoomStateSupported: boolean | null = null

function isExtendedColumnError(error: { message?: string } | null) {
  return !!error?.message && /pending_dynamites|last_sequence/.test(error.message)
}

function withoutExtendedRoomState(payload: Record<string, unknown>) {
  const { pending_dynamites: _pendingDynamites, last_sequence: _lastSequence, ...legacyPayload } = payload
  return legacyPayload
}

async function insertRoomRow(payload: Record<string, unknown>) {
  const sb = ensure()
  const tryExtended = extendedRoomStateSupported !== false
  let result = await sb
    .from('battle_rooms')
    .insert(tryExtended ? payload : withoutExtendedRoomState(payload))
    .select(tryExtended ? EXTENDED_SELECT : BASE_SELECT)
    .single()
  if (tryExtended && isExtendedColumnError(result.error)) {
    extendedRoomStateSupported = false
    result = await sb
      .from('battle_rooms')
      .insert(withoutExtendedRoomState(payload))
      .select(BASE_SELECT)
      .single()
  } else if (!result.error && tryExtended) {
    extendedRoomStateSupported = true
  }
  return result
}

async function readRoomRow(field: 'id' | 'code', value: string) {
  const sb = ensure()
  const tryExtended = extendedRoomStateSupported !== false
  let result = await sb
    .from('battle_rooms')
    .select(tryExtended ? EXTENDED_SELECT : BASE_SELECT)
    .eq(field, value)
    .maybeSingle()
  if (tryExtended && isExtendedColumnError(result.error)) {
    extendedRoomStateSupported = false
    result = await sb.from('battle_rooms').select(BASE_SELECT).eq(field, value).maybeSingle()
  } else if (!result.error && tryExtended) {
    extendedRoomStateSupported = true
  }
  return result
}

async function updateRoomRow(id: string, payload: Record<string, unknown>) {
  const sb = ensure()
  const tryExtended = extendedRoomStateSupported !== false
  let result = await sb
    .from('battle_rooms')
    .update(tryExtended ? payload : withoutExtendedRoomState(payload))
    .eq('id', id)
    .select(tryExtended ? EXTENDED_SELECT : BASE_SELECT)
    .single()
  if (tryExtended && isExtendedColumnError(result.error)) {
    extendedRoomStateSupported = false
    result = await sb
      .from('battle_rooms')
      .update(withoutExtendedRoomState(payload))
      .eq('id', id)
      .select(BASE_SELECT)
      .single()
  } else if (!result.error && tryExtended) {
    extendedRoomStateSupported = true
  }
  return result
}

export function getOnlinePlayerId() {
  const key = 'kids_gallery_online_player_id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const next = `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem(key, next)
  return next
}

export async function createBattleRoom(playerId: string) {
  const payload = {
    id: roomId(),
    code: roomCode(),
    status: 'selecting',
    host_player_id: playerId,
    round: 1,
    result_saved: false,
    pending_dynamites: [],
    last_sequence: [],
  }
  const { data, error } = await insertRoomRow(payload)
  if (error) throw new Error(`部屋(へや)作成(さくせい)失敗(しっぱい): ${error.message}`)
  return normalize(data as unknown as RoomRow)
}

export async function joinBattleRoom(code: string, playerId: string) {
  const cleanCode = code.replace(/\D/g, '')
  const { data: current, error: getError } = await readRoomRow('code', cleanCode)
  if (getError) throw new Error(`部屋(へや)取得(しゅとく)失敗(しっぱい): ${getError.message}`)
  if (!current) throw new Error('部屋(へや)が見(み)つかりません')
  const room = normalize(current as unknown as RoomRow)
  if (room.hostPlayerId !== playerId && room.guestPlayerId && room.guestPlayerId !== playerId) {
    throw new Error('この部屋(へや)はすでに2人(ふたり)います')
  }
  if (room.hostPlayerId === playerId || room.guestPlayerId === playerId) return room

  const { data, error } = await updateRoomRow(room.id, {
    guest_player_id: playerId,
    status: 'selecting',
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`参加(さんか)失敗(しっぱい): ${error.message}`)
  return normalize(data as unknown as RoomRow)
}

export async function getBattleRoom(id: string) {
  const { data, error } = await readRoomRow('id', id)
  if (error) throw new Error(`部屋(へや)更新(こうしん)失敗(しっぱい): ${error.message}`)
  return data ? normalize(data as unknown as RoomRow) : null
}

export async function chooseOnlineCharacter(room: BattleRoom, side: OnlineSide, character: ImageRecord) {
  const payload =
    side === 'host'
      ? { host_character_id: character.id, host_hp: character.hp, updated_at: new Date().toISOString() }
      : { guest_character_id: character.id, guest_hp: character.hp, updated_at: new Date().toISOString() }
  const { data, error } = await updateRoomRow(room.id, payload)
  if (error) throw new Error(`キャラ選択(せんたく)失敗(しっぱい): ${error.message}`)
  return normalize(data as unknown as RoomRow)
}

export async function startOnlineBattle(room: BattleRoom) {
  const { data, error } = await updateRoomRow(room.id, {
    status: 'choose',
    round: 1,
    host_hand: null,
    guest_hand: null,
    last_winner_side: null,
    last_die: null,
    last_damage: null,
    winner_side: null,
    result_saved: false,
    pending_dynamites: [],
    last_sequence: [],
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`開始(かいし)失敗(しっぱい): ${error.message}`)
  return normalize(data as unknown as RoomRow)
}

export async function sendOnlineHand(room: BattleRoom, side: OnlineSide, hand: RpsHand) {
  const payload =
    side === 'host'
      ? { host_hand: hand, updated_at: new Date().toISOString() }
      : { guest_hand: hand, updated_at: new Date().toISOString() }
  const { data, error } = await updateRoomRow(room.id, payload)
  if (error) throw new Error(`手(て)の送信(そうしん)失敗(しっぱい): ${error.message}`)
  return normalize(data as unknown as RoomRow)
}

export async function updateOnlineBattle(room: BattleRoom, patch: Partial<BattleRoom>) {
  const payload = {
    status: patch.status,
    host_character_id: patch.hostCharacterId,
    guest_character_id: patch.guestCharacterId,
    host_hp: patch.hostHp,
    guest_hp: patch.guestHp,
    round: patch.round,
    host_hand: patch.hostHand,
    guest_hand: patch.guestHand,
    last_winner_side: patch.lastWinnerSide,
    last_die: patch.lastDie,
    last_damage: patch.lastDamage,
    winner_side: patch.winnerSide,
    result_saved: patch.resultSaved,
    pending_dynamites: patch.pendingDynamites,
    last_sequence: patch.lastSequence,
    updated_at: new Date().toISOString(),
  }
  const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
  const { data, error } = await updateRoomRow(room.id, cleanPayload)
  if (error) throw new Error(`対戦(たいせん)更新(こうしん)失敗(しっぱい): ${error.message}`)
  return normalize(data as unknown as RoomRow)
}
