import { randomBattleStats, growWinnerStats, type StatKey } from './battle/character-rules'
import { supabase, BUCKET, isConfigured } from './lib/supabase'

export type ChildKey = 'rui' | 'mio'

export interface ImageRecord {
  id: string
  child: ChildKey
  path: string
  name: string
  url: string
  createdAt: number
  hp: number
  atk: number
  def: number
  spd: number
  luck: number
  tech: number
  species: string
  ultimateName: string
  level: number
  wins: number
  losses: number
  streak: number
  crystals: number
}

export type ImageStatsUpdate = Partial<
  Pick<
    ImageRecord,
    'hp' | 'atk' | 'def' | 'spd' | 'luck' | 'tech' | 'species' | 'ultimateName' | 'crystals'
  >
>

type ImageRow = {
  id: string
  child: string
  path: string
  name: string
  created_at: string
  hp?: number | null
  atk?: number | null
  def?: number | null
  spd?: number | null
  luck?: number | null
  tech?: number | null
  species?: string | null
  ultimate_name?: string | null
  level?: number | null
  wins?: number | null
  losses?: number | null
  streak?: number | null
  crystals?: number | null
}

const BASE_SELECT = 'id, child, path, name, created_at'
const OLD_BATTLE_SELECT =
  'id, child, path, name, created_at, hp, atk, def, spd, species, ultimate_name, level, wins, losses, streak'
const BATTLE_SELECT =
  'id, child, path, name, created_at, hp, atk, def, spd, luck, tech, species, ultimate_name, level, wins, losses, streak, crystals'

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function ensure() {
  if (!isConfigured || !supabase) {
    throw new Error(
      'Supabase が未設定です。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください'
    )
  }
  return supabase
}

export function publicUrl(path: string) {
  const sb = ensure()
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function normalizeImageRow(row: ImageRow): ImageRecord {
  return {
    id: row.id,
    child: row.child as ChildKey,
    path: row.path,
    name: row.name,
    url: publicUrl(row.path),
    createdAt: new Date(row.created_at).getTime(),
    hp: row.hp ?? 100,
    atk: row.atk ?? 50,
    def: row.def ?? 50,
    spd: row.spd ?? 50,
    luck: row.luck ?? 50,
    tech: row.tech ?? 50,
    species: row.species ?? 'ふしぎ',
    ultimateName: row.ultimate_name ?? 'ひっさつわざ',
    level: row.level ?? 1,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    streak: row.streak ?? 0,
    crystals: row.crystals ?? 0,
  }
}

export async function addImages(
  child: ChildKey,
  files: File[]
): Promise<ImageRecord[]> {
  const sb = ensure()
  const now = Date.now()
  const records: ImageRecord[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const id = uid() + i
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 5)
    const path = `${child}/${id}.${ext}`

    const upload = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/png',
      upsert: false,
    })
    if (upload.error) throw new Error(`アップロード失敗: ${upload.error.message}`)

    const createdAt = now + i
    const stats = randomBattleStats()
    const basePayload = {
      id,
      child,
      path,
      name: file.name || 'image',
      created_at: new Date(createdAt).toISOString(),
    }
    const fullPayload = {
      ...basePayload,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      luck: stats.luck,
      tech: stats.tech,
      species: stats.species,
      ultimate_name: stats.ultimateName,
      level: 1,
      wins: 0,
      losses: 0,
      streak: 0,
      crystals: 0,
    }

    let insert = await sb.from('images').insert(fullPayload)
    if (insert.error && /column|schema|cache/i.test(insert.error.message)) {
      insert = await sb.from('images').insert(basePayload)
    }
    if (insert.error) {
      await sb.storage.from(BUCKET).remove([path])
      throw new Error(`DB保存失敗: ${insert.error.message}`)
    }

    records.push(
      normalizeImageRow({
        ...basePayload,
        ...fullPayload,
      })
    )
  }
  return records
}

async function selectWithColumns(select: string, child?: ChildKey) {
  const sb = ensure()
  let query = sb.from('images').select(select)
  if (child) query = query.eq('child', child)
  return query.order('created_at', { ascending: false })
}

async function selectImages(child?: ChildKey): Promise<ImageRow[]> {
  const battleResult = await selectWithColumns(BATTLE_SELECT, child)
  if (!battleResult.error) return (battleResult.data || []) as unknown as ImageRow[]

  const oldBattleResult = await selectWithColumns(OLD_BATTLE_SELECT, child)
  if (!oldBattleResult.error) return (oldBattleResult.data || []) as unknown as ImageRow[]

  const baseResult = await selectWithColumns(BASE_SELECT, child)
  if (baseResult.error) throw new Error(`一覧取得失敗: ${baseResult.error.message}`)
  return (baseResult.data || []) as unknown as ImageRow[]
}

export async function listImages(child: ChildKey): Promise<ImageRecord[]> {
  const rows = await selectImages(child)
  return rows.map(normalizeImageRow)
}

export async function listAllImages(): Promise<ImageRecord[]> {
  const rows = await selectImages()
  return rows.map(normalizeImageRow)
}

export async function updateImageStats(
  id: string,
  stats: ImageStatsUpdate
): Promise<void> {
  const sb = ensure()
  const payload = {
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    luck: stats.luck,
    tech: stats.tech,
    species: stats.species,
    ultimate_name: stats.ultimateName,
    crystals: stats.crystals,
  }
  const { error } = await sb.from('images').update(payload).eq('id', id)
  if (error) {
    throw new Error(
      `ステータス保存失敗: ${error.message}。SETUP.md の追加SQLを実行してください`
    )
  }
}

export async function addCharacterCrystals(
  character: ImageRecord,
  amount: number
): Promise<number> {
  const next = Math.max(0, character.crystals + amount)
  await updateImageStats(character.id, { crystals: next })
  return next
}

export async function rerollCharacterStat(
  character: ImageRecord,
  stat: StatKey,
  nextValue: number
): Promise<void> {
  if (character.crystals <= 0) throw new Error('クリスタルが足りません')
  await updateImageStats(character.id, {
    [stat]: nextValue,
    crystals: character.crystals - 1,
  } as ImageStatsUpdate)
}

export async function rerollCharacterAttribute(
  character: ImageRecord,
  attribute: string
): Promise<void> {
  if (character.crystals <= 0) throw new Error('クリスタルが足りません')
  await updateImageStats(character.id, {
    species: attribute,
    crystals: character.crystals - 1,
  })
}

export async function updateBattleResultStats(
  winner: ImageRecord,
  loser: ImageRecord
): Promise<void> {
  const sb = ensure()
  const winnerLevel = Math.min(99, winner.level + 1)
  const growth = growWinnerStats(winner)
  const winnerUpdate = sb
    .from('images')
    .update({
      wins: winner.wins + 1,
      streak: winner.streak + 1,
      level: winnerLevel,
      ...growth,
    })
    .eq('id', winner.id)

  const loserUpdate = sb
    .from('images')
    .update({
      losses: loser.losses + 1,
      streak: 0,
    })
    .eq('id', loser.id)

  const [winnerResult, loserResult] = await Promise.all([winnerUpdate, loserUpdate])
  if (winnerResult.error || loserResult.error) {
    throw new Error('バトル結果の保存に失敗しました。追加SQLの実行を確認してください')
  }
}

export async function deleteImage(id: string): Promise<void> {
  const sb = ensure()
  const { data: row, error: getErr } = await sb
    .from('images')
    .select('path')
    .eq('id', id)
    .maybeSingle()
  if (getErr) throw new Error(`削除前取得失敗: ${getErr.message}`)
  if (!row) return

  const { error: delErr } = await sb.from('images').delete().eq('id', id)
  if (delErr) throw new Error(`DB削除失敗: ${delErr.message}`)
  await sb.storage.from(BUCKET).remove([row.path])
}

export async function countImages(child: ChildKey): Promise<number> {
  const sb = ensure()
  const { count, error } = await sb
    .from('images')
    .select('id', { count: 'exact', head: true })
    .eq('child', child)
  if (error) throw new Error(`カウント失敗: ${error.message}`)
  return count || 0
}
