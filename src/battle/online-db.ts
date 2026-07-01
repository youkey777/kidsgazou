import type { ImageRecord } from '../db'
import { isConfigured, supabase } from '../lib/supabase'
import type { RpsHand } from './types'

export type OnlineSide = 'host' | 'guest'
export type OnlinePhase = 'waiting' | 'selecting' | 'choose' | 'reveal' | 'rolling' | 'result' | 'finished'

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
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

const SELECT =
  'id, code, status, host_player_id, guest_player_id, host_character_id, guest_character_id, host_hp, guest_hp, round, host_hand, guest_hand, last_winner_side, last_die, last_damage, winner_side, result_saved, updated_at'

export function getOnlinePlayerId() {
  const key = 'kids_gallery_online_player_id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const next = `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem(key, next)
  return next
}

export async function createBattleRoom(playerId: string) {
  const sb = ensure()
  const payload = {
    id: roomId(),
    code: roomCode(),
    status: 'selecting',
    host_player_id: playerId,
    round: 1,
    result_saved: false,
  }
  const { data, error } = await sb.from('battle_rooms').insert(payload).select(SELECT).single()
  if (error) throw new Error(`部屋(へや)作成(さくせい)失敗(しっぱい): ${error.message}`)
  return normalize(data as RoomRow)
}

export async function joinBattleRoom(code: string, playerId: string) {
  const sb = ensure()
  const cleanCode = code.replace(/\D/g, '')
  const { data: current, error: getError } = await sb.from('battle_rooms').select(SELECT).eq('code', cleanCode).maybeSingle()
  if (getError) throw new Error(`部屋(へや)取得(しゅとく)失敗(しっぱい): ${getError.message}`)
  if (!current) throw new Error('部屋(へや)が見(み)つかりません')
  const room = normalize(current as RoomRow)
  if (room.hostPlayerId !== playerId && room.guestPlayerId && room.guestPlayerId !== playerId) {
    throw new Error('この部屋(へや)はすでに2人(ふたり)います')
  }
  if (room.hostPlayerId === playerId || room.guestPlayerId === playerId) return room

  const { data, error } = await sb
    .from('battle_rooms')
    .update({ guest_player_id: playerId, status: 'selecting', updated_at: new Date().toISOString() })
    .eq('id', room.id)
    .select(SELECT)
    .single()
  if (error) throw new Error(`参加(さんか)失敗(しっぱい): ${error.message}`)
  return normalize(data as RoomRow)
}

export async function getBattleRoom(id: string) {
  const sb = ensure()
  const { data, error } = await sb.from('battle_rooms').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(`部屋(へや)更新(こうしん)失敗(しっぱい): ${error.message}`)
  return data ? normalize(data as RoomRow) : null
}

export async function chooseOnlineCharacter(room: BattleRoom, side: OnlineSide, character: ImageRecord) {
  const sb = ensure()
  const payload =
    side === 'host'
      ? { host_character_id: character.id, host_hp: character.hp, updated_at: new Date().toISOString() }
      : { guest_character_id: character.id, guest_hp: character.hp, updated_at: new Date().toISOString() }
  const { data, error } = await sb.from('battle_rooms').update(payload).eq('id', room.id).select(SELECT).single()
  if (error) throw new Error(`キャラ選択(せんたく)失敗(しっぱい): ${error.message}`)
  return normalize(data as RoomRow)
}

export async function startOnlineBattle(room: BattleRoom) {
  const sb = ensure()
  const { data, error } = await sb
    .from('battle_rooms')
    .update({
      status: 'choose',
      round: 1,
      host_hand: null,
      guest_hand: null,
      last_winner_side: null,
      last_die: null,
      last_damage: null,
      winner_side: null,
      result_saved: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', room.id)
    .select(SELECT)
    .single()
  if (error) throw new Error(`開始(かいし)失敗(しっぱい): ${error.message}`)
  return normalize(data as RoomRow)
}

export async function sendOnlineHand(room: BattleRoom, side: OnlineSide, hand: RpsHand) {
  const sb = ensure()
  const payload =
    side === 'host'
      ? { host_hand: hand, updated_at: new Date().toISOString() }
      : { guest_hand: hand, updated_at: new Date().toISOString() }
  const { data, error } = await sb.from('battle_rooms').update(payload).eq('id', room.id).select(SELECT).single()
  if (error) throw new Error(`手(て)の送信(そうしん)失敗(しっぱい): ${error.message}`)
  return normalize(data as RoomRow)
}

export async function updateOnlineBattle(room: BattleRoom, patch: Partial<BattleRoom>) {
  const sb = ensure()
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
    updated_at: new Date().toISOString(),
  }
  const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
  const { data, error } = await sb.from('battle_rooms').update(cleanPayload).eq('id', room.id).select(SELECT).single()
  if (error) throw new Error(`対戦(たいせん)更新(こうしん)失敗(しっぱい): ${error.message}`)
  return normalize(data as RoomRow)
}
