import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ImageRecord } from '../db'
import { listBattleCharacters } from './battle-db'
import CharSelect from './CharSelect'
import DiceBattle from './DiceBattle'
import Ranking from './Ranking'
import RpsBattle from './RpsBattle'
import TeamBattle from './TeamBattle'
import Training from './Training'
import { MODE_LABELS, type BattleTab, type PlayableBattleMode } from './types'

const MODES: PlayableBattleMode[] = ['dice', 'rps', 'team']

export default function BattleHub() {
  const [tab, setTab] = useState<BattleTab>('battle')
  const [mode, setMode] = useState<PlayableBattleMode>('dice')
  const [characters, setCharacters] = useState<ImageRecord[]>([])
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)
  const [startedKey, setStartedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await listBattleCharacters()
      setCharacters(list)
      setLeftId((current) => current ?? list[0]?.id ?? null)
      setRightId((current) => current ?? list.find((item) => item.id !== list[0]?.id)?.id ?? null)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const left = useMemo(
    () => characters.find((character) => character.id === leftId) ?? null,
    [characters, leftId]
  )
  const right = useMemo(
    () => characters.find((character) => character.id === rightId && character.id !== leftId) ?? null,
    [characters, leftId, rightId]
  )

  const start = () => {
    if (mode === 'team') {
      setStartedKey(`team-${Date.now()}`)
      return
    }
    if (!left || !right) return
    setStartedKey(`${mode}-${left.id}-${right.id}-${Date.now()}`)
  }

  const battle = () => {
    if (!startedKey) return null
    if (mode === 'team') {
      return <TeamBattle key={startedKey} characters={characters} onDone={refresh} />
    }
    if (!left || !right) return null
    if (mode === 'dice') return <DiceBattle key={startedKey} left={left} right={right} onDone={refresh} />
    return <RpsBattle key={startedKey} left={left} right={right} onDone={refresh} />
  }

  return (
    <main className="px-3 pb-10 sm:px-4">
      <div className="mx-auto max-w-md">
        <div className="sticky top-0 z-20 -mx-3 bg-gradient-to-br from-violet-800 via-fuchsia-700 to-indigo-900 px-3 pb-3 pt-2 sm:-mx-4 sm:px-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/15 p-1.5">
            {(['battle', 'training', 'ranking'] as BattleTab[]).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setTab(item)
                  setStartedKey(null)
                }}
                className={`min-h-12 rounded-xl text-base font-black ${
                  tab === item ? 'bg-white text-purple-800' : 'text-white'
                }`}
              >
                {item === 'battle' ? 'バトル' : item === 'training' ? '育てる' : 'ランキング'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {tab === 'ranking' ? (
          <div className="mt-4">
            <Ranking />
          </div>
        ) : tab === 'training' ? (
          <div className="mt-4">
            <Training characters={characters} onChanged={refresh} />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {!startedKey && (
              <>
                <section className="rounded-3xl bg-white/85 p-3 shadow-lg">
                  <h2 className="mb-2 text-xl font-black text-purple-900">モードをえらぶ</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {MODES.map((item) => (
                      <button
                        key={item}
                        onClick={() => setMode(item)}
                        className={`min-h-14 rounded-2xl px-2 text-sm font-black shadow ${
                          mode === item ? 'bg-yellow-300 text-zinc-900' : 'bg-purple-600 text-white'
                        }`}
                      >
                        {MODE_LABELS[item]}
                      </button>
                    ))}
                  </div>
                </section>

                {loading ? (
                  <div className="rounded-3xl bg-white/85 p-6 text-center font-black text-purple-800">
                    キャラをよみこみ中...
                  </div>
                ) : mode !== 'team' ? (
                  <>
                    <CharSelect
                      title="1Pキャラ"
                      characters={characters}
                      selectedId={leftId}
                      onSelect={(character) => setLeftId(character.id)}
                    />
                    <CharSelect
                      title="CPUキャラ"
                      characters={characters.filter((character) => character.id !== leftId)}
                      selectedId={rightId}
                      onSelect={(character) => setRightId(character.id)}
                    />
                  </>
                ) : (
                  <div className="rounded-3xl bg-white/85 p-4 text-sm font-bold text-purple-900 shadow-lg">
                    ルイチームとミオチームから3キャラずつが自動で出るよ。
                  </div>
                )}

                <button
                  onClick={start}
                  disabled={loading || (mode !== 'team' && (!left || !right))}
                  className="min-h-16 w-full rounded-3xl bg-gradient-to-r from-yellow-300 to-orange-400 text-2xl font-black text-zinc-900 shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  バトルスタート！
                </button>
              </>
            )}

            {startedKey && (
              <button
                onClick={() => setStartedKey(null)}
                className="min-h-11 rounded-2xl bg-white/85 px-4 text-sm font-black text-purple-800 shadow"
              >
                ← えらびなおす
              </button>
            )}

            {battle()}
          </div>
        )}
      </div>
    </main>
  )
}
