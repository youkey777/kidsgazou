import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BattleHub from './battle/BattleHub'
import XpBar from './battle/effects/XpBar'
import StatsEditor from './battle/StatsEditor'
import {
  addImages,
  countImages,
  deleteImage,
  listImages,
  type ChildKey,
  type ImageRecord,
} from './db'
import { isConfigured } from './lib/supabase'
import Lock, { isUnlocked, lock } from './Lock'
import { migrateFromIndexedDB } from './migrate'

type ActiveTab = ChildKey | 'battle'

type Theme = {
  key: ChildKey
  name: string
  emoji: string
  image: string
  gradient: string
  accent: string
  tabActive: string
  tabIdle: string
  saveBtn: string
  cardBorder: string
  countChip: string
}

const APP_VERSION = 'v2026.07.01-ocr-xp'

const THEMES: Record<ChildKey, Theme> = {
  rui: {
    key: 'rui',
    name: 'ルイ',
    emoji: '🦖',
    image: '/battle/rich-rui-bg.png',
    gradient: 'from-zinc-950 via-zinc-900 to-neutral-900',
    accent: 'text-amber-300',
    tabActive: 'bg-zinc-900 text-amber-300 shadow-lg shadow-zinc-900/40',
    tabIdle: 'bg-white/70 text-zinc-600',
    saveBtn:
      'bg-zinc-900 hover:bg-zinc-800 active:bg-black text-amber-300 shadow-lg shadow-zinc-900/30',
    cardBorder: 'border-zinc-800/40',
    countChip: 'bg-zinc-900 text-amber-300',
  },
  mio: {
    key: 'mio',
    name: 'ミオ',
    emoji: '🌸',
    image: '/battle/rich-mio-bg.png',
    gradient: 'from-pink-100 via-rose-100 to-pink-200',
    accent: 'text-pink-600',
    tabActive: 'bg-pink-500 text-white shadow-lg shadow-pink-400/40',
    tabIdle: 'bg-white/70 text-pink-500',
    saveBtn:
      'bg-pink-500 hover:bg-pink-400 active:bg-pink-600 text-white shadow-lg shadow-pink-400/40',
    cardBorder: 'border-pink-200',
    countChip: 'bg-pink-500 text-white',
  },
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked())
  const [migrating, setMigrating] = useState<{ done: number; total: number } | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [active, setActive] = useState<ActiveTab>('rui')
  const [activeChild, setActiveChild] = useState<ChildKey>('rui')
  const [images, setImages] = useState<ImageRecord[]>([])
  const [pending, setPending] = useState<File[]>([])
  const [counts, setCounts] = useState<{ rui: number; mio: number }>({ rui: 0, mio: 0 })
  const [viewer, setViewer] = useState<ImageRecord | null>(null)
  const [statsTarget, setStatsTarget] = useState<ImageRecord | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const longPressTimer = useRef<number | null>(null)

  const theme = THEMES[activeChild]
  const isBattle = active === 'battle'
  const pageBackground = isBattle ? '/battle/rich-battle-bg.png' : theme.image

  const pendingPreviews = useMemo(
    () => pending.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [pending]
  )

  useEffect(() => {
    return () => pendingPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
  }, [pendingPreviews])

  const refresh = useCallback(async (child: ChildKey) => {
    setLoading(true)
    try {
      const [list, ruiCount, mioCount] = await Promise.all([
        listImages(child),
        countImages('rui'),
        countImages('mio'),
      ])
      setImages(list)
      setCounts({ rui: ruiCount, mio: mioCount })
    } catch (e) {
      setGlobalError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!unlocked || !isConfigured || initialized) return
    let cancelled = false
    ;(async () => {
      try {
        const result = await migrateFromIndexedDB((done, total) => {
          if (!cancelled) setMigrating({ done, total })
        })
        if (cancelled) return
        setMigrating(null)
        if (result.migrated > 0) {
          console.log(`migrated ${result.migrated} images`)
        }
        setInitialized(true)
      } catch (e) {
        if (!cancelled) {
          setGlobalError(`移行失敗: ${(e as Error).message}`)
          setMigrating(null)
          setInitialized(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [unlocked, initialized])

  useEffect(() => {
    if (initialized && unlocked && isConfigured && active !== 'battle') {
      void refresh(activeChild)
    }
  }, [active, activeChild, refresh, initialized, unlocked])

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/')
    )
    if (files.length > 0) {
      setPending((prev) => [...prev, ...files])
    }
    event.target.value = ''
  }

  const removePending = (index: number) => {
    setPending((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const onSave = async () => {
    if (pending.length === 0 || saving) return
    setSaving(true)
    try {
      await addImages(activeChild, pending)
      setPending([])
      await refresh(activeChild)
    } catch (e) {
      alert(`保存失敗: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('この画像を削除しますか？')) return
    try {
      await deleteImage(id)
      if (viewer?.id === id) setViewer(null)
      await refresh(activeChild)
    } catch (e) {
      alert(`削除失敗: ${(e as Error).message}`)
    }
  }

  const onLogout = () => {
    if (!confirm('ロックしますか？次回はパスコードが必要です。')) return
    lock()
    setUnlocked(false)
  }

  const openChildTab = (child: ChildKey) => {
    setActive(child)
    setActiveChild(child)
    setEditing(false)
    setPending([])
  }

  const startLongPress = (image: ImageRecord) => {
    if (!editing) return
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      setStatsTarget(image)
    }, 600)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  if (!isConfigured) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-900 p-6 text-white">
        <div className="max-w-sm text-center">
          <div className="mb-3 text-5xl">⚠️</div>
          <h1 className="mb-2 text-xl font-bold">Supabase 未設定</h1>
          <p className="text-sm text-zinc-300">
            Vercel に必要な環境変数を設定してください。
          </p>
          <ul className="mt-3 space-y-1 rounded-lg bg-zinc-800 p-3 text-left font-mono text-xs">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li>VITE_GALLERY_PASSCODE</li>
          </ul>
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return <Lock onUnlock={() => setUnlocked(true)} />
  }

  if (migrating) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-zinc-900 to-pink-900 p-6 text-white">
        <div className="text-center">
          <div className="mb-3 inline-block animate-wiggle text-5xl">☁️</div>
          <h1 className="mb-2 text-xl font-bold">クラウドへ移行中...</h1>
          <p className="text-sm text-pink-200">
            {migrating.done} / {migrating.total} まい
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative min-h-full overflow-hidden bg-gradient-to-br ${
        isBattle ? 'from-violet-800 via-fuchsia-700 to-indigo-950' : theme.gradient
      } transition-colors duration-500`}
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,.28),rgba(0,0,0,.48)), url(${pageBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="pointer-events-none fixed inset-0 animate-[pulse_5s_ease-in-out_infinite] bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.24),transparent_32%)]" />
      <div className="safe-top" />

      <header className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1
            className={`min-w-0 truncate text-2xl font-black tracking-tight ${
              isBattle ? 'text-yellow-200' : activeChild === 'rui' ? 'text-amber-200' : 'text-pink-700'
            }`}
          >
            {isBattle ? 'キャラクターバトル' : `${theme.name}のギャラリー`}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-black/45 px-2 py-1 text-[10px] font-black text-white/85 shadow ring-1 ring-white/20">
              {APP_VERSION}
            </span>
            {!isBattle && images.length > 0 && (
              <button
                onClick={() => setEditing((value) => !value)}
                className={`min-h-10 rounded-full px-3 text-xs font-black shadow ${
                  activeChild === 'rui'
                    ? 'bg-zinc-800 text-amber-200'
                    : 'bg-white text-pink-600'
                }`}
              >
                {editing ? '完了' : '編集'}
              </button>
            )}
            <button
              onClick={onLogout}
              className={`min-h-10 rounded-full px-3 text-xs font-black shadow ${
                isBattle || activeChild === 'rui'
                  ? 'bg-zinc-800/70 text-amber-200'
                  : 'bg-white/80 text-pink-500'
              }`}
              aria-label="ロック"
            >
              🔒
            </button>
          </div>
        </div>
      </header>

      {globalError && (
        <div className="mx-4 mb-2 rounded-lg bg-red-500/90 px-3 py-2 text-xs text-white">
          {globalError}
          <button onClick={() => setGlobalError(null)} className="ml-2 underline">
            閉じる
          </button>
        </div>
      )}

      <nav className="mt-2 px-4">
        <div className="flex gap-1.5 rounded-2xl bg-white/40 p-1.5 shadow-inner backdrop-blur">
          {(['rui', 'mio'] as ChildKey[]).map((key) => {
            const itemTheme = THEMES[key]
            const selected = active === key
            return (
              <button
                key={key}
                onClick={() => openChildTab(key)}
                className={`flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-black transition-all ${
                  selected ? itemTheme.tabActive : itemTheme.tabIdle
                }`}
              >
                <span
                  className="h-8 w-8 rounded-lg bg-cover bg-center shadow-inner ring-1 ring-white/60"
                  style={{ backgroundImage: `url(${itemTheme.image})` }}
                />
                <span>{itemTheme.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? itemTheme.countChip : 'bg-white/60'}`}>
                  {counts[key]}
                </span>
              </button>
            )
          })}
          <button
            onClick={() => {
              setActive('battle')
              setEditing(false)
              setPending([])
            }}
            className={`flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-black transition-all ${
              isBattle
                ? 'bg-purple-700 text-yellow-200 shadow-lg shadow-purple-900/40'
                : 'bg-white/70 text-purple-600'
            }`}
          >
            <span
              className="h-8 w-8 rounded-lg bg-cover bg-center shadow-inner ring-1 ring-white/60"
              style={{ backgroundImage: 'url(/battle/rich-battle-bg.png)' }}
            />
            <span>バトル</span>
          </button>
        </div>
      </nav>

      {isBattle ? (
        <BattleHub />
      ) : (
        <>
          <main className="mt-4 px-4 pb-40">
            {editing && (
              <p className="mb-3 rounded-2xl bg-yellow-200 px-3 py-2 text-sm font-black text-zinc-900">
                画像を長押しすると、つよさを編集できるよ。
              </p>
            )}

            {pending.length > 0 && (
              <section
                className={`mb-4 animate-pop-in rounded-2xl border-2 border-dashed bg-white/60 p-3 backdrop-blur ${
                  activeChild === 'rui' ? 'border-amber-300' : 'border-pink-300'
                }`}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className={`text-sm font-black ${theme.accent}`}>
                    保存まちの画像 {pending.length} まい
                  </p>
                  <button
                    onClick={() => setPending([])}
                    disabled={saving}
                    className="text-xs text-zinc-500 underline disabled:opacity-30"
                  >
                    すべてキャンセル
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {pendingPreviews.map((preview, index) => (
                    <div
                      key={`${preview.file.name}-${index}`}
                      className="relative aspect-square overflow-hidden rounded-xl bg-white shadow"
                    >
                      <img src={preview.url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removePending(index)}
                        disabled={saving}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm font-black text-white disabled:opacity-30"
                        aria-label="けす"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {loading && images.length === 0 ? (
              <div className="mt-16 text-center">
                <div className="mb-3 inline-block animate-wiggle text-6xl">🔍</div>
                <p className={`text-base font-black ${activeChild === 'rui' ? 'text-amber-200' : 'text-pink-600'}`}>
                  よみこみ中...
                </p>
              </div>
            ) : images.length === 0 && pending.length === 0 ? (
              <div className="mt-16 text-center">
                <div className="mb-3 inline-block animate-wiggle text-7xl">{theme.emoji}</div>
                <p className={`text-lg font-black ${activeChild === 'rui' ? 'text-amber-200' : 'text-pink-600'}`}>
                  まだ画像がないよ
                </p>
                <p className={`mt-1 text-sm ${activeChild === 'rui' ? 'text-zinc-400' : 'text-pink-500'}`}>
                  下のボタンから追加してね
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`group relative aspect-square animate-pop-in overflow-hidden rounded-2xl border-2 bg-white shadow-md ${theme.cardBorder} ${
                      editing ? 'animate-wiggle' : ''
                    }`}
                    onPointerDown={() => startLongPress(image)}
                    onPointerUp={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onClick={() => !editing && setViewer(image)}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="truncate text-xs font-black text-white">
                        Lv.{image.level} / {image.species}
                      </p>
                      <XpBar xp={image.xp} compact />
                    </div>
                    {editing && (
                      <>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            void onDelete(image.id)
                          }}
                          className="absolute -left-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-base font-black text-white shadow-lg ring-2 ring-white"
                          aria-label="削除"
                        >
                          −
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            setStatsTarget(image)
                          }}
                          className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300 text-base font-black text-zinc-900 shadow-lg ring-2 ring-white"
                          aria-label="つよさ"
                        >
                          ★
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>

          <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 px-4 pb-4">
            <div className="pointer-events-auto mx-auto flex max-w-md gap-2">
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
                disabled={saving}
                className={`flex-1 rounded-2xl border-2 bg-white/90 py-4 font-black shadow-xl backdrop-blur ${theme.cardBorder} ${
                  activeChild === 'rui' ? 'text-zinc-800' : 'text-pink-600'
                } transition-transform active:scale-95 disabled:opacity-50`}
              >
                📷 画像をえらぶ
              </button>
              {pending.length > 0 && (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className={`flex-1 animate-pop-in rounded-2xl py-4 font-black ${theme.saveBtn} transition-transform active:scale-95 disabled:opacity-70`}
                >
                  {saving ? '保存中...' : `💾 保存 ${pending.length}まい`}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {viewer && (
        <div
          className="safe-bottom safe-top fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setViewer(null)}
        >
          <div className="flex justify-end p-4">
            <button
              onClick={() => setViewer(null)}
              className="h-11 w-11 rounded-full bg-white/20 text-xl text-white"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4">
            <img src={viewer.url} alt={viewer.name} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex justify-center gap-3 p-4">
            <a
              href={viewer.url}
              download={viewer.name}
              onClick={(event) => event.stopPropagation()}
              className="rounded-full bg-white/20 px-5 py-3 font-black text-white no-underline"
            >
              保存
            </a>
            <button
              onClick={(event) => {
                event.stopPropagation()
                void onDelete(viewer.id)
              }}
              className="rounded-full bg-red-500/90 px-5 py-3 font-black text-white"
            >
              削除
            </button>
          </div>
        </div>
      )}

      {statsTarget && (
        <StatsEditor
          character={statsTarget}
          onClose={() => setStatsTarget(null)}
          onSaved={() => refresh(activeChild)}
        />
      )}
    </div>
  )
}
