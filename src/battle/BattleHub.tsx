import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ImageRecord } from '../db'
import { listBattleCharacters } from './battle-db'
import AttributeGuide from './AttributeGuide'
import BattleAffinityOverlay from './BattleAffinityOverlay'
import CharSelect from './CharSelect'
import ComboBattle from './ComboBattle'
import Gacha from './Gacha'
import OnlineBattle from './OnlineBattle'
import Ranking from './Ranking'
import TeamBattle from './TeamBattle'
import Training from './Training'
import { playBgm, playSelect } from './sounds'
import { MODE_LABELS, type BattleTab, type PlayableBattleMode } from './types'

const MODES: PlayableBattleMode[] = ['combo', 'team', 'online']

export default function BattleHub() {
  const [tab, setTab] = useState<BattleTab>('battle')
  const [mode, setMode] = useState<PlayableBattleMode>('combo')
  const [characters, setCharacters] = useState<ImageRecord[]>([])
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)
  const [ruiTeamIds, setRuiTeamIds] = useState<string[]>([])
  const [mioTeamIds, setMioTeamIds] = useState<string[]>([])
  const [startedKey, setStartedKey] = useState<string | null>(null)
  const [showBattleAffinity, setShowBattleAffinity] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const closeBattleAffinity = useCallback(() => setShowBattleAffinity(false), [])

  const refresh = useCallback(async () => {
    try {
      const list = await listBattleCharacters()
      setCharacters(list)
      setLeftId((current) => current ?? list[0]?.id ?? null)
      setRightId((current) => current ?? list.find((item) => item.id !== list[0]?.id)?.id ?? null)
      setRuiTeamIds((current) => (current.length > 0 ? current : list.filter((item) => item.child === 'rui').slice(0, 3).map((item) => item.id)))
      setMioTeamIds((current) => (current.length > 0 ? current : list.filter((item) => item.child === 'mio').slice(0, 3).map((item) => item.id)))
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
    playSelect()
    playBgm()
    if (mode === 'team' || mode === 'online') {
      setStartedKey(`${mode}-${Date.now()}`)
      return
    }
    if (!left || !right) return
    setStartedKey(`${mode}-${left.id}-${right.id}-${Date.now()}`)
  }

  const battle = () => {
    if (!startedKey) return null
    if (mode === 'online') {
      return <OnlineBattle key={startedKey} characters={characters} onDone={refresh} onExit={() => setStartedKey(null)} />
    }
    if (mode === 'team') {
      return (
        <TeamBattle
          key={startedKey}
          characters={characters}
          ruiTeam={ruiTeamIds.map((id) => characters.find((item) => item.id === id)).filter(Boolean) as ImageRecord[]}
          mioTeam={mioTeamIds.map((id) => characters.find((item) => item.id === id)).filter(Boolean) as ImageRecord[]}
          onDone={refresh}
          onExit={() => setStartedKey(null)}
        />
      )
    }
    if (!left || !right) return null
    return <ComboBattle key={startedKey} left={left} right={right} onDone={refresh} onExit={() => setStartedKey(null)} />
  }

  const toggleTeam = (id: string, side: 'rui' | 'mio') => {
    const setter = side === 'rui' ? setRuiTeamIds : setMioTeamIds
    setter((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      return current.length >= 3 ? [...current.slice(1), id] : [...current, id]
    })
  }

  const teamSelector = (side: 'rui' | 'mio') => {
    const ids = side === 'rui' ? ruiTeamIds : mioTeamIds
    const list = characters.filter((character) => character.child === side)
    return (
      <section className="rounded-3xl bg-white/85 p-3 shadow-lg">
        <h3 className="mb-2 text-base font-black text-purple-900">
          {side === 'rui' ? 'ルイチーム' : 'ミオチーム'} {ids.length}/3
        </h3>
        <div className="-mx-1 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
          {Array.from({ length: Math.ceil(list.length / 9) }, (_, page) => list.slice(page * 9, page * 9 + 9)).map((page, pageIndex) => (
            <div key={pageIndex} className="grid min-w-full snap-start auto-rows-max grid-cols-3 content-start gap-2">
              {page.map((character) => {
                const selected = ids.includes(character.id)
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => toggleTeam(character.id, side)}
                    className={`rounded-2xl border-4 bg-white p-1 text-left shadow active:scale-95 ${
                      selected ? 'border-yellow-400 ring-4 ring-yellow-200' : 'border-white'
                    }`}
                  >
                    <img src={character.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                    <p className="mt-1 truncate text-xs font-black text-zinc-900">{character.name}</p>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <main className="px-3 pb-10 sm:px-4">
      <div className="mx-auto max-w-md">
        <div className="sticky top-0 z-20 -mx-3 bg-gradient-to-br from-violet-800 via-fuchsia-700 to-indigo-900 px-3 pb-3 pt-2 sm:-mx-4 sm:px-4">
          <div className="grid grid-cols-5 gap-1 rounded-2xl bg-white/15 p-1.5">
            {(['training', 'gacha', 'battle', 'attribute', 'ranking'] as BattleTab[]).map((item) => (
              <button
                key={item}
                data-testid={item === 'gacha' ? 'gacha-tab-button' : undefined}
                onClick={() => {
                  playSelect()
                  if (startedKey && item === 'attribute') {
                    setShowBattleAffinity(true)
                    return
                  }
                  setTab(item)
                  setStartedKey(null)
                }}
                className={`relative min-h-14 overflow-hidden rounded-xl px-0.5 text-[10px] font-black leading-tight sm:text-xs ${
                  tab === item
                    ? item === 'gacha'
                      ? 'bg-gradient-to-br from-yellow-200 via-fuchsia-200 to-cyan-200 text-purple-950 shadow-[0_0_18px_rgba(250,204,21,.7)]'
                      : 'bg-white text-purple-800'
                    : 'text-white'
                }`}
              >
                {item === 'gacha' && (
                  <img
                    src="/battle/20260718_gacha-machine-icon.png"
                    alt=""
                    className="mx-auto mb-0.5 h-7 w-7 rounded-lg border border-white/60 object-cover shadow"
                  />
                )}
                <span className="block">
                  {item === 'battle'
                    ? 'バトル'
                    : item === 'training'
                      ? '育(そだ)てる'
                      : item === 'gacha'
                        ? 'ガチャ'
                        : item === 'attribute'
                          ? '属性(ぞくせい)'
                          : 'ランキング'}
                </span>
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
        ) : tab === 'attribute' ? (
          <div className="mt-4">
            <AttributeGuide />
          </div>
        ) : tab === 'training' ? (
          <div className="mt-4">
            <Training characters={characters} onChanged={refresh} />
          </div>
        ) : tab === 'gacha' ? (
          <div className="mt-4">
            <Gacha characters={characters} onChanged={refresh} onGoTraining={() => setTab('training')} />
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
                        onClick={() => {
                          playSelect()
                          setMode(item)
                        }}
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
                    キャラをよみこみ中(ちゅう)...
                  </div>
                ) : mode === 'online' ? (
                  <section className="rounded-3xl bg-white/85 p-3 shadow-lg">
                    <h3 className="text-base font-black text-purple-900">
                      スマホとiPadで同(おな)じ部屋(へや)に入(はい)って対戦(たいせん)します
                    </h3>
                  </section>
                ) : mode !== 'team' ? (
                  <>
                    <CharSelect
                      title="1Pキャラ"
                      characters={characters}
                      selectedId={leftId}
                      onSelect={(character) => {
                        playSelect()
                        setLeftId(character.id)
                      }}
                    />
                    <CharSelect
                      title="CPUキャラ"
                      characters={characters.filter((character) => character.id !== leftId)}
                      selectedId={rightId}
                      onSelect={(character) => {
                        playSelect()
                        setRightId(character.id)
                      }}
                    />
                  </>
                ) : (
                  <>
                    <section className="rounded-3xl bg-white/85 p-3 shadow-lg">
                      <h3 className="text-base font-black text-purple-900">
                        3vs3は、1対1ごとに「じゃんけん＋サイコロ」で勝負(しょうぶ)します
                      </h3>
                    </section>
                    {teamSelector('rui')}
                    {teamSelector('mio')}
                  </>
                )}

                <button
                  onClick={start}
                  disabled={loading || (mode === 'combo' && (!left || !right)) || (mode === 'team' && (ruiTeamIds.length < 3 || mioTeamIds.length < 3))}
                  className="min-h-16 w-full rounded-3xl bg-gradient-to-r from-yellow-300 to-orange-400 text-2xl font-black text-zinc-900 shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  バトルスタート！
                </button>
              </>
            )}

            {startedKey && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStartedKey(null)}
                  className="min-h-12 rounded-2xl bg-white/90 px-3 text-sm font-black text-purple-800 shadow outline-none ring-yellow-300 focus-visible:ring-4 active:scale-95"
                >
                  ← えらびなおす
                </button>
                <button
                  type="button"
                  onClick={() => setShowBattleAffinity(true)}
                  data-testid="battle-affinity-button"
                  className="min-h-12 rounded-2xl bg-gradient-to-r from-cyan-300 to-yellow-200 px-3 text-sm font-black text-purple-950 shadow-lg outline-none ring-white focus-visible:ring-4 active:scale-95"
                >
                  🧭 相性(あいしょう)を見る
                </button>
              </div>
            )}

            {battle()}
          </div>
        )}
      </div>
      <BattleAffinityOverlay open={showBattleAffinity} onClose={closeBattleAffinity} />
    </main>
  )
}
