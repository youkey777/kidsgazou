import { supabase, BUCKET, isConfigured } from './lib/supabase'

export type ChildKey = 'rui' | 'mio'

export interface ImageRecord {
  id: string
  child: ChildKey
  path: string
  name: string
  url: string
  createdAt: number
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function ensure() {
  if (!isConfigured || !supabase) {
    throw new Error(
      'Supabase 未設定: VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください'
    )
  }
  return supabase
}

function publicUrl(path: string) {
  const sb = ensure()
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function addImages(
  child: ChildKey,
  files: File[]
): Promise<ImageRecord[]> {
  const sb = ensure()
  const now = Date.now()
  const records: ImageRecord[] = []

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const id = uid() + i
    const ext = (f.name.split('.').pop() || 'png').toLowerCase().slice(0, 5)
    const path = `${child}/${id}.${ext}`

    const up = await sb.storage.from(BUCKET).upload(path, f, {
      cacheControl: '3600',
      contentType: f.type || 'image/png',
      upsert: false,
    })
    if (up.error) throw new Error(`アップロード失敗: ${up.error.message}`)

    const createdAt = now + i
    const ins = await sb.from('images').insert({
      id,
      child,
      path,
      name: f.name || 'image',
      created_at: new Date(createdAt).toISOString(),
    })
    if (ins.error) {
      await sb.storage.from(BUCKET).remove([path])
      throw new Error(`DB保存失敗: ${ins.error.message}`)
    }

    records.push({
      id,
      child,
      path,
      name: f.name || 'image',
      url: publicUrl(path),
      createdAt,
    })
  }
  return records
}

export async function listImages(child: ChildKey): Promise<ImageRecord[]> {
  const sb = ensure()
  const { data, error } = await sb
    .from('images')
    .select('id, child, path, name, created_at')
    .eq('child', child)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`一覧取得失敗: ${error.message}`)
  return (data || []).map((row) => ({
    id: row.id,
    child: row.child as ChildKey,
    path: row.path,
    name: row.name,
    url: publicUrl(row.path),
    createdAt: new Date(row.created_at).getTime(),
  }))
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
