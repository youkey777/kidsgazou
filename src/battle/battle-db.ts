import {
  listAllImages,
  updateBattleResultStats,
  updateImageProfile,
  type ChildKey,
  type ImageRecord,
  type ImageStatsUpdate,
} from '../db'
import { supabase, isConfigured } from '../lib/supabase'
import { randomAttribute, randomStat } from './character-rules'
import type { BattleMode, BattleRecord, BattleResult } from './types'

function uid() {
  return `battle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const KNOWN_CHARACTER_NAMES: Record<string, string> = {
  'mr1fcffa-zpl3900': 'ミオぴょんぴょん',
  'mr1eqopu-2w31550': 'オクトパスフロッグ',
  'mr0panc5-qvnlm10': 'タオルケットもふもふしかちゃん',
  'mr0pa9q7-lmq4pn0': 'ストロベリーピョン',
  'mr0pa9fv-ypib1x0': 'キングガルビー',
  'mr0pa92q-axyh3w0': 'キャプテンフロッグ',
  'mr0pa7o3-pkaaxx0': 'ブルーベリーハシニーニ',
}

function isPlaceholderName(name: string) {
  return /^(file[_-]?0+|file_\d+|ファイル\d+)/i.test(name.replace(/\.[^.]+$/, ''))
}

function needsStatRepair(character: ImageRecord) {
  const defaultStats =
    character.atk === 10 &&
    character.def === 10 &&
    character.spd === 10 &&
    character.luck === 50 &&
    character.tech === 50 &&
    character.species === 'ふしぎ'
  const tooHighAtStart =
    character.level <= 1 &&
    [character.atk, character.def, character.spd, character.luck, character.tech].some((value) => value > 50)
  return defaultStats || tooHighAtStart
}

async function autoRepairCharacters(characters: ImageRecord[]) {
  const resetBlanketCrystals =
    characters.length > 1 && characters.every((character) => character.crystals === 3)

  return Promise.all(
    characters.map(async (character) => {
      const patch: ImageStatsUpdate = {}
      const knownName = KNOWN_CHARACTER_NAMES[character.id]
      if (knownName && isPlaceholderName(character.name)) patch.name = knownName
      if (needsStatRepair(character)) {
        patch.atk = randomStat()
        patch.def = randomStat()
        patch.spd = randomStat()
        patch.luck = randomStat()
        patch.tech = randomStat()
        patch.species = randomAttribute()
      }
      if (resetBlanketCrystals) patch.crystals = 0
      if (Object.keys(patch).length === 0) return character

      const repaired = { ...character, ...patch }
      try {
        await updateImageProfile(character.id, patch)
      } catch {
        // SQL未実行(みじっこう)時(じ)でも、画面上(がめんじょう)は補正(ほせい)した値(あたい)で遊(あそ)べるようにする。
      }
      return repaired
    })
  )
}

export async function listBattleCharacters(child?: ChildKey): Promise<ImageRecord[]> {
  const all = await autoRepairCharacters(await listAllImages())
  return child ? all.filter((image) => image.child === child) : all
}

export async function saveBattleResult(
  mode: BattleMode,
  result: BattleResult
): Promise<string | null> {
  if (!isConfigured || !supabase) return null

  try {
    await updateBattleResultStats(result.winner, result.loser)
  } catch (e) {
    return (e as Error).message
  }

  const recordId = uid()
  const { error } = await supabase.from('battle_records').insert({
    id: recordId,
    mode,
    winner_id: result.winner.id,
    loser_id: result.loser.id,
    winner_team: result.winnerTeam ?? null,
  })

  if (error) {
    return `経験値(けいけんち)は保存(ほぞん)しました。バトル記録(きろく)だけ保存(ほぞん)に失敗(しっぱい)しました。SETUP.md の追加SQL(ついかえすきゅーえる)を確認(かくにん)してください: ${error.message}`
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
