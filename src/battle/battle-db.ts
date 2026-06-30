import { listAllImages, updateBattleResultStats, type ChildKey, type ImageRecord } from '../db'
import { supabase, isConfigured } from '../lib/supabase'
import type { BattleMode, BattleRecord, BattleResult } from './types'

function uid() {
  return `battle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function listBattleCharacters(child?: ChildKey): Promise<ImageRecord[]> {
  const all = await listAllImages()
  return child ? all.filter((image) => image.child === child) : all
}

export async function saveBattleResult(
  mode: BattleMode,
  result: BattleResult
): Promise<string | null> {
  if (!isConfigured || !supabase) return null

  const recordId = uid()
  const { error } = await supabase.from('battle_records').insert({
    id: recordId,
    mode,
    winner_id: result.winner.id,
    loser_id: result.loser.id,
    winner_team: result.winnerTeam ?? null,
  })

  if (error) {
    return `バトル記録の保存に失敗しました。SETUP.md の追加SQLを実行してください: ${error.message}`
  }

  try {
    await updateBattleResultStats(result.winner, result.loser)
  } catch (e) {
    return (e as Error).message
  }

  return null
}

export async function listBattleRecords(): Promise<BattleRecord[]> {
  if (!isConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('battle_records')
    .select('id, mode, winner_id, loser_id, winner_team, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return []
  return (data || []).map((row) => ({
    id: row.id,
    mode: row.mode,
    winnerId: row.winner_id,
    loserId: row.loser_id,
    winnerTeam: row.winner_team as ChildKey | null,
    createdAt: new Date(row.created_at).getTime(),
  }))
}
