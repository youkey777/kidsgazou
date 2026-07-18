import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  sharedCrystalTotal,
  spendSharedCrystals,
  type ImageRecord,
  type ImageStatsUpdate,
} from '../db'
import { STAT_LABELS } from './character-rules'
import { GACHA_COST, drawGacha, type GachaResult } from './gacha-logic'
import {
  playGachaCharge,
  playGachaDrop,
  playGachaReveal,
  playSelect,
} from './sounds'
import { shortBattleName } from './types'

type Props = {
  characters: ImageRecord[]
  onChanged: () => Promise<void> | void
  onGoTraining: () => void
}

type GachaPhase =
  | 'idle'
  | 'character-charge'
  | 'character-reveal'
  | 'stat-charge'
  | 'stat-reveal'
  | 'boost-charge'
  | 'boost-reveal'
  | 'saving'
  | 'complete'

const GACHA_ICON = '/battle/20260718_gacha-machine-icon.png'
const GACHA_BG = '/battle/training-slot-bg.png'
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function stageNumber(phase: GachaPhase) {
  if (phase.startsWith('character')) return 1
  if (phase.startsWith('stat')) return 2
  if (phase.startsWith('boost')) return 3
  return 3
}

function GachaCinematic({ phase, result }: { phase: GachaPhase; result: GachaResult }) {
  const stage = stageNumber(phase)
  const charging = phase.endsWith('charge')
  const title = stage === 1 ? 'キャラクター' : stage === 2 ? '能力(のうりょく)' : '上昇値(じょうしょうち)'

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#09031d] p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${GACHA_BG})` }}
        animate={{ scale: charging ? [1.02, 1.12, 1.05] : [1.08, 1.18], rotate: charging ? [0, 0.5, -0.5, 0] : 0 }}
        transition={{ duration: charging ? 0.72 : 1.3, repeat: charging ? Infinity : 0 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(4,1,17,.76)_72%)]" />
      {Array.from({ length: 18 }).map((_, index) => (
        <motion.span
          key={`${phase}-spark-${index}`}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_14px_5px_rgba(192,132,252,.8)]"
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{
            x: Math.cos((index / 18) * Math.PI * 2) * (120 + (index % 4) * 42),
            y: Math.sin((index / 18) * Math.PI * 2) * (170 + (index % 3) * 45),
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 1.15, repeat: Infinity, delay: index * 0.045 }}
        />
      ))}

      <div className="relative z-10 w-full max-w-md text-center text-white">
        <div className="mb-3 flex items-center justify-center gap-2">
          {[1, 2, 3].map((item) => (
            <motion.span
              key={item}
              className={`grid h-10 w-10 place-items-center rounded-full border-2 text-lg font-black ${
                item === stage
                  ? 'border-white bg-gradient-to-br from-yellow-300 to-fuchsia-500 text-purple-950 shadow-[0_0_26px_rgba(250,204,21,.9)]'
                  : item < stage
                    ? 'border-cyan-200 bg-cyan-400 text-purple-950'
                    : 'border-white/35 bg-black/35 text-white/65'
              }`}
              animate={item === stage ? { scale: [1, 1.18, 1] } : undefined}
              transition={{ duration: 0.72, repeat: Infinity }}
            >
              {item}
            </motion.span>
          ))}
        </div>
        <p className="text-sm font-black tracking-[0.2em] text-cyan-100">第(だい){stage}ガチャ</p>
        <h2 className="mt-1 text-3xl font-black text-yellow-200 [text-shadow:0_3px_0_#4c1d95,0_0_22px_rgba(250,204,21,.75)]">
          {title}を決定(けってい)！
        </h2>

        <div className="relative mx-auto mt-4 grid min-h-[20rem] place-items-center overflow-hidden rounded-[2.4rem] border-4 border-yellow-200/80 bg-black/50 p-4 shadow-[0_0_54px_rgba(217,70,239,.85),inset_0_0_36px_rgba(255,255,255,.18)]">
          <AnimatePresence mode="wait">
            {charging ? (
              <motion.div
                key={`${phase}-capsule`}
                className="relative"
                initial={{ y: -280, rotate: -180, scale: 0.45 }}
                animate={{ y: [0, -22, 0], rotate: [0, 16, -14, 0], scale: [0.9, 1.08, 1] }}
                exit={{ scale: 2.8, opacity: 0, filter: 'brightness(3)' }}
                transition={{ duration: 0.72, ease: 'backOut' }}
              >
                <img src={GACHA_ICON} alt="ガチャ" className="h-64 w-64 rounded-[2rem] object-cover shadow-2xl" />
                <motion.div
                  className="absolute inset-0 rounded-[2rem] bg-white/30 mix-blend-screen"
                  animate={{ opacity: [0, 0.8, 0], scale: [0.7, 1.18, 0.88] }}
                  transition={{ duration: 0.45, repeat: Infinity }}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`${phase}-reveal`}
                className="relative w-full"
                initial={{ scale: 0.1, rotate: -12, opacity: 0, filter: 'brightness(4)' }}
                animate={{ scale: [0.1, 1.18, 1], rotate: [-12, 3, 0], opacity: 1, filter: 'brightness(1)' }}
                transition={{ duration: 0.55, ease: 'backOut' }}
              >
                <motion.div
                  className="absolute -inset-20 -z-10 rounded-full bg-[conic-gradient(from_0deg,transparent,#fff,transparent,#22d3ee,transparent,#f0abfc,transparent)] opacity-70 blur-md"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                {stage === 1 ? (
                  <>
                    <img
                      src={result.character.url}
                      alt={result.character.name}
                      className="mx-auto h-56 w-56 rounded-[2rem] border-4 border-white bg-white object-contain shadow-[0_0_42px_rgba(255,255,255,.9)]"
                    />
                    <p className="mt-3 text-3xl font-black text-white">{shortBattleName(result.character.name)}</p>
                  </>
                ) : stage === 2 ? (
                  <div className="mx-auto grid h-60 w-60 place-items-center rounded-full border-4 border-cyan-100 bg-gradient-to-br from-cyan-400 via-blue-600 to-purple-900 p-5 shadow-[0_0_50px_rgba(34,211,238,.9)]">
                    <div>
                      <p className="text-6xl">⚡</p>
                      <p className="mt-2 text-3xl font-black leading-tight">{STAT_LABELS[result.stat]}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto grid h-60 w-60 place-items-center rounded-[3rem] border-4 border-yellow-100 bg-gradient-to-br from-yellow-200 via-orange-400 to-fuchsia-600 shadow-[0_0_64px_rgba(250,204,21,.95)]">
                    <motion.p
                      className="text-8xl font-black text-white [text-shadow:0_7px_0_#7e22ce,0_0_24px_#fff]"
                      animate={{ scale: [1, 1.14, 1], y: [0, -7, 0] }}
                      transition={{ duration: 0.7, repeat: Infinity }}
                    >
                      +{result.boost}
                    </motion.p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-3 text-sm font-black text-white/85">
          {charging ? 'クリスタルパワーをチャージ中(ちゅう)…' : 'カプセルオープン！'}
        </p>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 bg-white"
        animate={{ opacity: charging ? [0, 0.18, 0] : [0.95, 0] }}
        transition={{ duration: charging ? 0.5 : 0.32, repeat: charging ? Infinity : 0 }}
      />
    </motion.div>
  )
}

export default function Gacha({ characters, onChanged, onGoTraining }: Props) {
  const [localCharacters, setLocalCharacters] = useState(characters)
  const [phase, setPhase] = useState<GachaPhase>('idle')
  const [result, setResult] = useState<GachaResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const crystals = useMemo(() => sharedCrystalTotal(localCharacters), [localCharacters])
  const busy = phase !== 'idle' && phase !== 'complete'

  useEffect(() => {
    if (phase === 'idle') setLocalCharacters(characters)
  }, [characters, phase])

  const runGacha = async () => {
    if (busy || characters.length === 0 || crystals < GACHA_COST) return
    playSelect()
    setError(null)
    const nextResult = drawGacha(localCharacters)
    setResult(nextResult)

    setPhase('character-charge')
    playGachaCharge(1)
    playGachaDrop()
    await sleep(1050)
    setPhase('character-reveal')
    playGachaReveal(1)
    await sleep(1500)

    setPhase('stat-charge')
    playGachaCharge(2)
    playGachaDrop()
    await sleep(980)
    setPhase('stat-reveal')
    playGachaReveal(2)
    await sleep(1450)

    setPhase('boost-charge')
    playGachaCharge(3)
    playGachaDrop()
    await sleep(1050)
    setPhase('boost-reveal')
    playGachaReveal(3)
    await sleep(1550)

    setPhase('saving')
    try {
      const updated = await spendSharedCrystals(
        localCharacters,
        GACHA_COST,
        nextResult.character.id,
        { [nextResult.stat]: nextResult.after } as ImageStatsUpdate
      )
      setLocalCharacters(updated)
      await onChanged()
      setPhase('complete')
    } catch (saveError) {
      setError((saveError as Error).message)
      setPhase('idle')
    }
  }

  const reset = () => {
    playSelect()
    setResult(null)
    setPhase('idle')
  }

  return (
    <div className="space-y-4 pb-10">
      <section
        className="relative overflow-hidden rounded-[2rem] border-2 border-yellow-200/70 bg-purple-950 p-4 text-white shadow-2xl"
        style={{
          backgroundImage: `linear-gradient(rgba(20,4,50,.5),rgba(8,2,28,.92)), url(${GACHA_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.2),transparent_35%)]" />
        <div className="relative text-center">
          <motion.img
            src={GACHA_ICON}
            alt="クリスタルガチャ"
            className="mx-auto h-44 w-44 rounded-[2rem] border-2 border-white/60 object-cover shadow-[0_0_34px_rgba(217,70,239,.8)]"
            animate={{ y: [0, -7, 0], rotate: [-1, 1, -1] }}
            transition={{ duration: 2.1, repeat: Infinity }}
          />
          <h2 className="mt-3 text-3xl font-black text-yellow-200 [text-shadow:0_3px_0_#581c87]">クリスタルガチャ</h2>
          <p className="mt-1 text-sm font-bold text-cyan-100">キャラ → 能力 → 上昇値の3連続ガチャ！</p>
          <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 rounded-2xl bg-black/45 px-4 py-3 ring-2 ring-cyan-200/40">
            <span className="text-4xl">💎</span>
            <div className="text-left">
              <p className="text-xs font-black text-cyan-100">共通(きょうつう)ガチャクリスタル</p>
              <p className="text-3xl font-black text-white">{crystals}こ</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white/92 p-4 shadow-xl">
        <h3 className="text-xl font-black text-purple-900">ガチャの流(なが)れ</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['1', 'キャラ', '誰(だれ)を育てる？'],
            ['2', '能力', '何(なに)が上がる？'],
            ['3', '上昇値', 'いくつ上がる？'],
          ].map(([number, label, description]) => (
            <div key={number} className="rounded-2xl bg-gradient-to-b from-purple-100 to-cyan-50 p-2 ring-1 ring-purple-200">
              <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-purple-700 font-black text-white">{number}</span>
              <p className="mt-1 text-sm font-black text-purple-900">{label}</p>
              <p className="text-[10px] font-bold text-zinc-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="rounded-2xl bg-red-100 p-3 text-sm font-black text-red-700">{error}</p>}

      {phase === 'complete' && result ? (
        <motion.section
          className="overflow-hidden rounded-[2rem] border-4 border-yellow-200 bg-gradient-to-br from-purple-950 via-fuchsia-800 to-indigo-950 p-4 text-center text-white shadow-[0_0_42px_rgba(250,204,21,.65)]"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
        >
          <p className="text-sm font-black tracking-[0.18em] text-yellow-200">GACHA COMPLETE</p>
          <img src={result.character.url} alt={result.character.name} className="mx-auto mt-3 h-36 w-36 rounded-3xl border-4 border-white bg-white object-contain shadow-2xl" />
          <h3 className="mt-3 text-2xl font-black">{shortBattleName(result.character.name)}</h3>
          <p className="mt-2 text-lg font-black text-cyan-100">{STAT_LABELS[result.stat]}</p>
          <div className="mt-2 flex items-center justify-center gap-3 text-3xl font-black">
            <span className="text-white/70">{result.before}</span>
            <span className="text-yellow-200">→</span>
            <span className="text-yellow-200">{result.after}</span>
          </div>
          <p className="mt-1 text-sm font-black text-white/80">ガチャ結果(けっか) +{result.boost}{result.after - result.before < result.boost ? '（最大(さいだい)99）' : ''}</p>
          <button
            type="button"
            onClick={crystals >= GACHA_COST ? () => void runGacha() : reset}
            className="mt-4 min-h-14 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 text-xl font-black text-purple-950 shadow-xl active:scale-95"
          >
            {crystals >= GACHA_COST ? 'もう一度(いちど)まわす' : '結果(けっか)をとじる'}
          </button>
        </motion.section>
      ) : (
        <button
          type="button"
          onClick={() => void runGacha()}
          disabled={busy || characters.length === 0 || crystals < GACHA_COST}
          className="relative min-h-20 w-full overflow-hidden rounded-[2rem] border-4 border-yellow-100 bg-gradient-to-r from-fuchsia-600 via-purple-700 to-cyan-600 px-4 text-2xl font-black text-white shadow-[0_0_34px_rgba(217,70,239,.7),0_8px_0_#3b0764] active:translate-y-1 active:shadow-[0_0_24px_rgba(217,70,239,.5),0_3px_0_#3b0764] disabled:opacity-50"
        >
          <motion.span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/35" animate={{ x: ['0%', '450%'] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.7 }} />
          <span className="relative flex items-center justify-center gap-3">
            <img src={GACHA_ICON} alt="" className="h-14 w-14 rounded-2xl border-2 border-white/70 object-cover" />
            <span>💎 {GACHA_COST}こで ガチャ！</span>
          </span>
        </button>
      )}

      {crystals < GACHA_COST && phase !== 'complete' && (
        <button type="button" onClick={onGoTraining} className="min-h-14 w-full rounded-2xl bg-white/90 px-4 text-base font-black text-purple-800 shadow-lg">
          算数(さんすう)でクリスタルを集(あつ)める →
        </button>
      )}

      <AnimatePresence>
        {result && phase !== 'idle' && phase !== 'saving' && phase !== 'complete' && (
          <GachaCinematic key={phase} phase={phase} result={result} />
        )}
        {phase === 'saving' && (
          <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-purple-950/95 p-5 text-center text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div>
              <motion.div className="mx-auto h-20 w-20 rounded-full border-8 border-white/20 border-t-yellow-300" animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
              <p className="mt-5 text-xl font-black">パワーアップを保存(ほぞん)中(ちゅう)…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
