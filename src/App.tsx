import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addImages,
  countImages,
  deleteImage,
  listImages,
  type ChildKey,
  type ImageRecord,
} from './db'

type Theme = {
  key: ChildKey
  name: string
  emoji: string
  gradient: string
  accent: string
  accentBg: string
  ring: string
  tabActive: string
  tabIdle: string
  saveBtn: string
  cardBorder: string
  countChip: string
}

const THEMES: Record<ChildKey, Theme> = {
  rui: {
    key: 'rui',
    name: 'ルイ',
    emoji: '🦖',
    gradient: 'from-zinc-900 via-zinc-800 to-neutral-900',
    accent: 'text-amber-300',
    accentBg: 'bg-zinc-800',
    ring: 'ring-amber-300',
    tabActive: 'bg-zinc-900 text-amber-300 shadow-lg shadow-zinc-900/40',
    tabIdle: 'bg-white/70 text-zinc-500',
    saveBtn:
      'bg-zinc-900 hover:bg-zinc-800 active:bg-black text-amber-300 shadow-lg shadow-zinc-900/30',
    cardBorder: 'border-zinc-800/40',
    countChip: 'bg-zinc-900 text-amber-300',
  },
  mio: {
    key: 'mio',
    name: 'ミオ',
    emoji: '🌸',
    gradient: 'from-pink-100 via-rose-100 to-pink-200',
    accent: 'text-pink-600',
    accentBg: 'bg-pink-100',
    ring: 'ring-pink-400',
    tabActive: 'bg-pink-500 text-white shadow-lg shadow-pink-400/40',
    tabIdle: 'bg-white/70 text-pink-400',
    saveBtn:
      'bg-pink-500 hover:bg-pink-400 active:bg-pink-600 text-white shadow-lg shadow-pink-400/40',
    cardBorder: 'border-pink-200',
    countChip: 'bg-pink-500 text-white',
  },
}

function useObjectUrls(images: ImageRecord[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    const next: Record<string, string> = {}
    images.forEach((img) => {
      next[img.id] = URL.createObjectURL(img.blob)
    })
    setUrls(next)
    return () => {
      Object.values(next).forEach((u) => URL.revokeObjectURL(u))
    }
  }, [images])
  return urls
}

export default function App() {
  const [active, setActive] = useState<ChildKey>('rui')
  const [images, setImages] = useState<ImageRecord[]>([])
  const [pending, setPending] = useState<File[]>([])
  const [counts, setCounts] = useState<{ rui: number; mio: number }>({ rui: 0, mio: 0 })
  const [viewer, setViewer] = useState<ImageRecord | null>(null)
  const [editing, setEditing] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const theme = THEMES[active]
  const urls = useObjectUrls(images)
  const pendingPreviews = useMemo(
    () => pending.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [pending]
  )

  useEffect(() => {
    return () => pendingPreviews.forEach((p) => URL.revokeObjectURL(p.url))
  }, [pendingPreviews])

  const refresh = useCallback(async (child: ChildKey) => {
    const [list, ruiCount, mioCount] = await Promise.all([
      listImages(child),
      countImages('rui'),
      countImages('mio'),
    ])
    setImages(list)
    setCounts({ rui: ruiCount, mio: mioCount })
  }, [])

  useEffect(() => {
    refresh(active)
  }, [active, refresh])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith('image/')
    )
    if (files.length > 0) {
      setPending((prev) => [...prev, ...files])
    }
    e.target.value = ''
  }

  const removePending = (idx: number) => {
    setPending((prev) => prev.filter((_, i) => i !== idx))
  }

  const onSave = async () => {
    if (pending.length === 0) return
    await addImages(active, pending)
    setPending([])
    await refresh(active)
  }

  const onDelete = async (id: string) => {
    if (!confirm('この画像を削除しますか？')) return
    await deleteImage(id)
    if (viewer?.id === id) setViewer(null)
    await refresh(active)
  }

  return (
    <div
      className={`min-h-full bg-gradient-to-br ${theme.gradient} transition-colors duration-500`}
    >
      <div className="safe-top" />

      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1
            className={`text-2xl font-bold tracking-tight ${
              active === 'rui' ? 'text-amber-200' : 'text-pink-700'
            }`}
          >
            {theme.emoji} {theme.name}のギャラリー
          </h1>
          {images.length > 0 && (
            <button
              onClick={() => setEditing((v) => !v)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                active === 'rui'
                  ? 'bg-zinc-800 text-amber-200'
                  : 'bg-white text-pink-600'
              } shadow`}
            >
              {editing ? '完了' : '編集'}
            </button>
          )}
        </div>
      </header>

      <nav className="px-4 mt-2">
        <div className="bg-white/40 backdrop-blur p-1.5 rounded-2xl flex gap-1.5 shadow-inner">
          {(['rui', 'mio'] as ChildKey[]).map((k) => {
            const t = THEMES[k]
            const isActive = k === active
            return (
              <button
                key={k}
                onClick={() => {
                  setActive(k)
                  setEditing(false)
                }}
                className={`flex-1 py-3 rounded-xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  isActive ? t.tabActive : t.tabIdle
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span>{t.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? t.countChip : 'bg-white/60'
                  }`}
                >
                  {counts[k]}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <main className="px-4 mt-4 pb-40">
        {pending.length > 0 && (
          <section
            className={`mb-4 p-3 rounded-2xl bg-white/60 backdrop-blur border-2 border-dashed ${
              active === 'rui' ? 'border-amber-300' : 'border-pink-300'
            } animate-pop-in`}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <p className={`text-sm font-bold ${theme.accent}`}>
                保存まちの がぞう（{pending.length}）
              </p>
              <button
                onClick={() => setPending([])}
                className="text-xs text-zinc-500 underline"
              >
                すべてキャンセル
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {pendingPreviews.map((p, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-white shadow"
                >
                  <img
                    src={p.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePending(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center"
                    aria-label="けす"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {images.length === 0 && pending.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="text-7xl mb-3 animate-wiggle inline-block">
              {theme.emoji}
            </div>
            <p
              className={`text-lg font-bold ${
                active === 'rui' ? 'text-amber-200' : 'text-pink-600'
              }`}
            >
              まだ がぞうが ないよ
            </p>
            <p
              className={`text-sm mt-1 ${
                active === 'rui' ? 'text-zinc-400' : 'text-pink-400'
              }`}
            >
              したの ボタンから ついかしてね
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className={`group relative aspect-square rounded-2xl overflow-hidden bg-white shadow-md border-2 ${theme.cardBorder} animate-pop-in ${
                  editing ? 'animate-wiggle' : ''
                }`}
                onClick={() => !editing && setViewer(img)}
              >
                {urls[img.id] && (
                  <img
                    src={urls[img.id]}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}
                {editing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(img.id)
                    }}
                    className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-red-500 text-white text-base font-bold flex items-center justify-center shadow-lg ring-2 ring-white"
                    aria-label="さくじょ"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 safe-bottom px-4 pb-4 pointer-events-none">
        <div className="max-w-md mx-auto flex gap-2 pointer-events-auto">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPick}
          />
          <button
            onClick={() => fileInput.current?.click()}
            className={`flex-1 py-4 rounded-2xl bg-white/90 backdrop-blur font-bold shadow-xl border-2 ${theme.cardBorder} ${
              active === 'rui' ? 'text-zinc-800' : 'text-pink-600'
            } active:scale-95 transition-transform`}
          >
            ＋ がぞうを えらぶ
          </button>
          {pending.length > 0 && (
            <button
              onClick={onSave}
              className={`flex-1 py-4 rounded-2xl font-bold ${theme.saveBtn} active:scale-95 transition-transform animate-pop-in`}
            >
              💾 ほぞん（{pending.length}）
            </button>
          )}
        </div>
      </div>

      {viewer && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col safe-top safe-bottom"
          onClick={() => setViewer(null)}
        >
          <div className="flex justify-end p-4">
            <button
              onClick={() => setViewer(null)}
              className="w-10 h-10 rounded-full bg-white/20 text-white text-xl"
              aria-label="とじる"
            >
              ×
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            {urls[viewer.id] && (
              <img
                src={urls[viewer.id]}
                alt={viewer.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          <div className="p-4 flex justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (urls[viewer.id]) {
                  const a = document.createElement('a')
                  a.href = urls[viewer.id]
                  a.download = viewer.name
                  a.click()
                }
              }}
              className="px-5 py-3 rounded-full bg-white/20 text-white font-bold"
            >
              ⬇ ほぞん
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(viewer.id)
              }}
              className="px-5 py-3 rounded-full bg-red-500/90 text-white font-bold"
            >
              🗑 さくじょ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
