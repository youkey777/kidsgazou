import {
  listAllImages,
  updateBattleResultStats,
  updateImageProfile,
  type ChildKey,
  type ImageRecord,
  type ImageStatsUpdate,
} from '../db'
import { supabase, isConfigured } from '../lib/supabase'
import type { BattleMode, BattleRecord, BattleResult } from './types'

function uid() {
  return `battle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const KNOWN_CHARACTER_NAMES: Record<string, string> = {
  'mrkd1xgg-e5xdn80': 'ルイぴょんぴょん',
  'mr1szm1e-16ga0k0': 'クラブキュート',
  'mr3go0rs-2rwsh70': 'サークルクロス',
  'mr3hory6-frpkfd0': 'ゴールドトレインフロッグ',
  'mrkkjv3r-kj83580': 'ルイスクール',
  'mrm0x4iv-8xykh60': 'デビルサン',
  'mrpyo870-wr2bm10': 'オクトパスゴッド',
  'mr1fcffa-zpl3900': 'ミオぴょんぴょん',
  'mr1eqopu-2w31550': 'オクトパスフロッグ',
  'mr0panc5-qvnlm10': 'タオルケットもふもふしかちゃん',
  'mr0pa9q7-lmq4pn0': 'ストロベリーピョン',
  'mr0pa9fv-ypib1x0': 'キングカルビ',
  'mr0pa92q-axyh3w0': 'キャプテンフロッグ',
  'mr0pa7o3-pkaaxx0': 'ブルーベリーハシニーニ',
}

export function knownCharacterName(id: string) {
  return KNOWN_CHARACTER_NAMES[id]
}

function isPlaceholderName(name: string) {
  return /^(file[_-]?0+|file_\d+|ファイル\d+)/i.test(name.replace(/\.[^.]+$/, ''))
}

async function autoRepairCharacters(characters: ImageRecord[]) {
  return Promise.all(
    characters.map(async (character) => {
      const patch: ImageStatsUpdate = {}
      const knownName = KNOWN_CHARACTER_NAMES[character.id]
      if (knownName && isPlaceholderName(character.name)) patch.name = knownName
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
