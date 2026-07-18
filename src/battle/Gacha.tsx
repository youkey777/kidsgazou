import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  sharedCrystalTotal,
  spendSharedCrystals,
  type ImageRecord,
  type ImageStatsUpdate,
} from '../db'
import { attributeMark, STAT_LABELS, type StatKey } from './character-rules'
import { attributeVisual } from './attribute-visuals'
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

type GachaStage = 1 | 2 | 3
type GachaMotion =
  | 'machine-enter'
  | 'ready'
  | 'lever'
  | 'mixing'
  | 'dropping'
  | 'opening'
  | 'revealed'
type GachaPhase = 'idle' | 'playing' | 'saving' | 'complete'

type StageTheme = {
  from: string
  to: string
  glow: string
  icon: string
  particle: string
  headline: string
  subtitle: string
}

const GACHA_MACHINE = '/battle/20260718_gacha-machine-lever.png'
const GACHA_BG = '/battle/training-slot-bg.png'
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const STAT_THEMES: Record<StatKey, StageTheme> = {
  atk: {
    from: '#fb7185',
    to: '#dc2626',
    glow: 'rgba(251,113,133,.82)',
    icon: '⚔️',
    particle: '💥',
    headline: '攻撃力',
    subtitle: '爆発するパワー！',
  },
  def: {
    from: '#67e8f9',
    to: '#2563eb',
    glow: 'rgba(103,232,249,.82)',
    icon: '🛡️',
    particle: '🔷',
    headline: '防御力',
    subtitle: '鉄壁のバリア！',
  },
  spd: {
    from: '#a7f3d0',
    to: '#0891b2',
    glow: 'rgba(167,243,208,.82)',
    icon: '💨',
    particle: '⚡',
    headline: '素早さ',
    subtitle: '風よりも速く！',
  },
  luck: {
    from: '#bef264',
    to: '#eab308',
    glow: 'rgba(190,242,100,.88)',
    icon: '🍀',
    particle: '🌈',
    headline: '運',
    subtitle: '幸運が舞い降りる！',
  },
  tech: {
    from: '#67e8f9',
    to: '#9333ea',
    glow: 'rgba(192,132,252,.88)',
    icon: '⚙️',
    particle: '🔹',
    headline: '技術力',
    subtitle: 'メカニカル・オーバードライブ！',
  },
}

function boostTheme(boost: number): StageTheme {
  if (boost >= 20) {
    return {
      from: '#fef08a',
      to: '#f97316',
      glow: 'rgba(253,224,71,.95)',
      icon: '👑',
      particle: '🌟',
      headline: 'LEGEND',
      subtitle: '最高クラスの大当たり！',
    }
  }
  if (boost >= 15) {
    return {
      from: '#f0abfc',
      to: '#db2777',
      glow: 'rgba(240,171,252,.9)',
      icon: '💎',
      particle: '✨',
      headline: 'SUPER',
      subtitle: 'すごいパワーアップ！',
    }
  }
  if (boost >= 10) {
    return {
      from: '#67e8f9',
      to: '#2563eb',
      glow: 'rgba(103,232,249,.85)',
      icon: '⭐',
      particle: '✦',
      headline: 'GREAT',
      subtitle: 'ナイスパワーアップ！',
    }
  }
  return {
    from: '#c4b5fd',
    to: '#7c3aed',
    glow: 'rgba(196,181,253,.78)',
    icon: '✨',
    particle: '✧',
    headline: 'GOOD',
    subtitle: 'しっかりパワーアップ！',
  }
}

function stageTheme(stage: GachaStage, result: GachaResult): StageTheme {
  if (stage === 1) {
    const visual = attributeVisual(result.character.species)
    return {
      from: visual.from,
      to: visual.to,
      glow: visual.glow,
      icon: attributeMark(result.character.species),
      particle: visual.particle,
      headline: `${result.character.species}属性`,
      subtitle: `${shortBattleName(result.character.name)}が登場！`,
    }
  }
  if (stage === 2) return STAT_THEMES[result.stat]
  return boostTheme(result.boost)
}

function stageLabel(stage: GachaStage) {
  if (stage === 1) return 'キャラクター'
  if (stage === 2) return '能力(のうりょく)'
  return '上昇値(じょうしょうち)'
}

function Capsule({ motionPhase, theme }: { motionPhase: GachaMotion; theme: StageTheme }) {
  const opening = motionPhase === 'opening' || motionPhase === 'revealed'
  const visible = motionPhase === 'dropping' || motionPhase === 'opening'
  if (!visible) return null
  return (
    <motion.div
      className="absolute bottom-4 left-1/2 z-30 h-28 w-28 -translate-x-1/2"
      initial={{ y: -330, rotate: -300, scale: 0.45, opacity: 0 }}
      animate={{ y: 0, rotate: 0, scale: [0.45, 1.18, 1], opacity: 1 }}
      transition={{ duration: 0.7, ease: 'backOut' }}
    >
      <motion.div
        className="absolute inset-x-0 top-0 h-14 rounded-t-full border-4 border-yellow-100"
        style={{ background: `radial-gradient(circle at 35% 20%, white, ${theme.from} 34%, ${theme.to})`, boxShadow: `0 0 30px ${theme.glow}` }}
        animate={opening ? { y: -46, rotate: -22, x: -18 } : { y: 0 }}
        transition={{ duration: 0.55, ease: 'backOut' }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-14 rounded-b-full border-4 border-yellow-100"
        style={{ background: `linear-gradient(145deg, ${theme.to}, #240750)`, boxShadow: `0 0 30px ${theme.glow}` }}
        animate={opening ? { y: 46, rotate: 18, x: 14 } : { y: 0 }}
        transition={{ duration: 0.55, ease: 'backOut' }}
      />
      <div className="absolute inset-x-0 top-[50%] z-10 h-3 -translate-y-1/2 bg-yellow-100 shadow-[0_0_16px_white]" />
    </motion.div>
  )
}

function ResultReveal({ stage, result, theme }: { stage: GachaStage; result: GachaResult; theme: StageTheme }) {
  return (
    <motion.div
      className="absolute inset-0 z-40 grid place-items-center p-4"
      initial={{ opacity: 0, scale: 0.4, y: 50, filter: 'brightness(4) blur(8px)' }}
      animate={{ opacity: 1, scale: [0.4, 1.12, 1], y: 0, filter: 'brightness(1) blur(0px)' }}
      transition={{ duration: 0.72, ease: 'backOut' }}
    >
      <motion.div
        className="absolute h-72 w-72 rounded-full opacity-80 blur-xl"
        style={{ background: `conic-gradient(from 0deg, transparent, ${theme.from}, white, ${theme.to}, transparent)`, boxShadow: `0 0 70px ${theme.glow}` }}
        animate={{ rotate: 360, scale: [0.8, 1.15, 0.8] }}
        transition={{ duration: stage === 3 && result.boost >= 20 ? 1.4 : 3.2, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative w-full text-center">
        {stage === 1 ? (
          <>
            <img
              src={result.character.url}
              alt={result.character.name}
              className="mx-auto h-52 w-52 rounded-[2rem] border-4 border-white bg-white object-contain shadow-[0_0_50px_white]"
            />
            <p className="mt-3 text-3xl font-black text-white [text-shadow:0_3px_0_#3b0764]">{shortBattleName(result.character.name)}</p>
            <p className="mt-1 text-lg font-black text-yellow-100">{theme.icon} {theme.headline}</p>
          </>
        ) : stage === 2 ? (
          <motion.div
            className="mx-auto grid h-56 w-56 place-items-center rounded-full border-4 border-white/90 p-5 text-white"
            style={{ background: `radial-gradient(circle at 30% 20%, white, ${theme.from} 24%, ${theme.to} 78%)`, boxShadow: `0 0 64px ${theme.glow}` }}
            animate={result.stat === 'tech' ? { rotate: [0, 4, -4, 0] } : result.stat === 'luck' ? { y: [0, -10, 0], rotate: [-2, 2, -2] } : { scale: [1, 1.06, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div>
              <p className="text-7xl">{theme.icon}</p>
              <p className="mt-2 text-3xl font-black leading-tight">{STAT_LABELS[result.stat]}</p>
              <p className="mt-2 text-sm font-black text-white/90">{theme.subtitle}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="mx-auto grid h-60 w-60 place-items-center rounded-[3rem] border-4 border-white/90 text-white"
            style={{ background: `radial-gradient(circle at 30% 20%, white, ${theme.from} 25%, ${theme.to} 82%)`, boxShadow: `0 0 ${result.boost >= 20 ? 90 : 58}px ${theme.glow}` }}
            animate={{ scale: result.boost >= 20 ? [1, 1.18, 1] : [1, 1.08, 1], rotate: result.boost >= 15 ? [-2, 2, -2] : 0 }}
            transition={{ duration: result.boost >= 20 ? 0.55 : 0.85, repeat: Infinity }}
          >
            <div>
              <p className="text-4xl">{theme.icon}</p>
              <p className="text-8xl font-black [text-shadow:0_7px_0_#4c1d95,0_0_22px_white]">+{result.boost}</p>
              <p className="mt-1 text-xl font-black tracking-[0.16em]">{theme.headline}</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function GachaCinematic({
  stage,
  motionPhase,
  result,
  onSpin,
  onNext,
  onCancel,
}: {
  stage: GachaStage
  motionPhase: GachaMotion
  result: GachaResult
  onSpin: () => void
  onNext: () => void
  onCancel: () => void
}) {
  const theme = stageTheme(stage, result)
  const machineBusy = ['lever', 'mixing', 'dropping', 'opening'].includes(motionPhase)
  const particleCount = stage === 3 ? 14 + result.boost : 22

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#060113] p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: `url(${GACHA_BG})` }} />
      <motion.div
        className="absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(circle at 50% 45%, ${theme.from}66, transparent 35%), linear-gradient(145deg, #09021f, ${theme.to}55, #02010a)` }}
        animate={{ opacity: machineBusy ? [0.45, 0.85, 0.45] : 0.62 }}
        transition={{ duration: 0.6, repeat: machineBusy ? Infinity : 0 }}
      />

      {Array.from({ length: particleCount }).map((_, index) => (
        <motion.span
          key={`${stage}-${motionPhase}-particle-${index}`}
          className="pointer-events-none absolute left-1/2 top-1/2 text-xl"
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{
            x: Math.cos((index / particleCount) * Math.PI * 2) * (120 + (index % 6) * 46),
            y: Math.sin((index / particleCount) * Math.PI * 2) * (160 + (index % 5) * 55),
            scale: [0, stage === 3 && result.boost >= 15 ? 1.7 : 1.1, 0],
            opacity: [0, 1, 0],
            rotate: index * 70,
          }}
          transition={{ duration: 1.5 + (index % 4) * 0.25, repeat: Infinity, delay: index * 0.045 }}
        >
          {theme.particle}
        </motion.span>
      ))}

      <div className="relative z-10 flex h-full w-full max-w-lg flex-col text-center text-white">
        <div className="flex shrink-0 items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={machineBusy}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/45 text-xl font-black ring-1 ring-white/30 disabled:opacity-0"
            aria-label="ガチャを閉じる"
          >
            ×
          </button>
          <div className="flex items-center justify-center gap-2">
            {([1, 2, 3] as const).map((item) => (
              <span
                key={item}
                className={`grid h-10 w-10 place-items-center rounded-full border-2 text-lg font-black ${
                  item === stage
                    ? 'border-white bg-yellow-300 text-purple-950 shadow-[0_0_24px_white]'
                    : item < stage
                      ? 'border-cyan-100 bg-cyan-400 text-purple-950'
                      : 'border-white/30 bg-black/35 text-white/60'
                }`}
              >
                {item < stage ? '✓' : item}
              </span>
            ))}
          </div>
          <div className="h-11 w-11" />
        </div>

        <div className="mt-1 shrink-0">
          <p className="text-xs font-black tracking-[0.24em] text-cyan-100">第{stage}ガチャ</p>
          <h2 className="text-2xl font-black text-yellow-100 [text-shadow:0_3px_0_#4c1d95]">{stageLabel(stage)}を決める！</h2>
        </div>

        <div className="relative mt-1 min-h-0 flex-1 overflow-hidden rounded-[2rem] border-2 border-white/45 bg-black/35 shadow-[inset_0_0_35px_rgba(255,255,255,.16)]">
          <motion.img
            src={GACHA_MACHINE}
            alt="大きなレバーが付いたクリスタルガチャ"
            className="absolute inset-0 h-full w-full object-contain p-1"
            initial={motionPhase === 'machine-enter' ? { y: -600, scale: 0.35, rotate: -8, opacity: 0 } : false}
            animate={
              motionPhase === 'machine-enter'
                ? { y: 0, scale: 1, rotate: 0, opacity: 1 }
                : motionPhase === 'lever'
                  ? { scale: [1, 1.05, 0.98, 1], rotate: [0, -1, 1, 0] }
                  : motionPhase === 'mixing'
                    ? { x: [0, -9, 10, -8, 7, 0], y: [0, 3, -4, 3, 0], rotate: [0, -1.5, 1.5, -1, 0] }
                    : { y: [0, -3, 0] }
            }
            transition={
              motionPhase === 'machine-enter'
                ? { duration: 0.65, ease: 'backOut' }
                : motionPhase === 'mixing'
                  ? { duration: 0.35, repeat: Infinity }
                  : { duration: 1.8, repeat: motionPhase === 'ready' ? Infinity : 0 }
            }
          />

          {motionPhase === 'mixing' && Array.from({ length: 9 }).map((_, index) => (
            <motion.span
              key={`mix-${index}`}
              className="absolute left-1/2 top-[35%] h-8 w-8 rounded-full border-2 border-yellow-100"
              style={{ background: `radial-gradient(circle at 30% 20%, white, ${index % 2 ? theme.from : '#67e8f9'}, ${theme.to})`, boxShadow: `0 0 18px ${theme.glow}` }}
              animate={{ x: [-90 + index * 20, 80 - index * 14, -70 + index * 12], y: [-55 + (index % 3) * 24, 60 - (index % 4) * 18, -35], rotate: 360 }}
              transition={{ duration: 0.65 + (index % 3) * 0.16, repeat: Infinity, ease: 'linear' }}
            />
          ))}

          {motionPhase === 'lever' && (
            <motion.div
              className="absolute right-[5%] top-[37%] h-28 w-8 origin-bottom rounded-full bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-800 shadow-[0_0_26px_white]"
              initial={{ rotate: -12 }}
              animate={{ rotate: [0, 145, 190] }}
              transition={{ duration: 0.65, ease: 'backInOut' }}
            >
              <div className="absolute -left-3 -top-5 h-14 w-14 rounded-full border-4 border-yellow-100 bg-fuchsia-400 shadow-[0_0_30px_white]" />
            </motion.div>
          )}

          <Capsule motionPhase={motionPhase} theme={theme} />
          {motionPhase === 'opening' && (
            <motion.div className="absolute inset-0 z-30 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.55 }} />
          )}
          {motionPhase === 'revealed' && <ResultReveal stage={stage} result={result} theme={theme} />}

          {motionPhase === 'ready' && (
            <motion.button
              type="button"
              onClick={onSpin}
              data-testid="gacha-lever-button"
              className="absolute bottom-3 right-3 z-50 flex min-h-20 items-center gap-2 rounded-3xl border-4 border-yellow-100 bg-gradient-to-br from-yellow-300 via-orange-400 to-fuchsia-600 px-4 text-left font-black text-purple-950 shadow-[0_0_34px_rgba(250,204,21,.9),0_7px_0_#7e22ce] active:translate-y-1 active:shadow-[0_0_20px_rgba(250,204,21,.8),0_2px_0_#7e22ce]"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 0.85, repeat: Infinity }}
            >
              <span className="text-4xl">👆</span>
              <span><span className="block text-xs">自分(じぶん)で</span>レバーを回(まわ)す！</span>
            </motion.button>
          )}
        </div>

        <div className="min-h-[5.5rem] shrink-0 pt-2">
          {motionPhase === 'machine-enter' && <p className="text-lg font-black text-cyan-100">ガチャ筐体(きょうたい)が登場(とうじょう)！</p>}
          {motionPhase === 'lever' && <p className="text-lg font-black text-yellow-100">ガチャン！ レバー回転(かいてん)！</p>}
          {motionPhase === 'mixing' && <p className="text-lg font-black text-cyan-100">ガチャガチャガチャ…！</p>}
          {motionPhase === 'dropping' && <p className="text-lg font-black text-fuchsia-100">カプセルが出(で)てきた！</p>}
          {motionPhase === 'opening' && <p className="text-lg font-black text-yellow-100">パカッ！</p>}
          {motionPhase === 'revealed' && (
            <motion.button
              type="button"
              onClick={onNext}
              data-testid="gacha-next-button"
              className="min-h-16 w-full rounded-2xl border-2 border-white/80 bg-gradient-to-r from-yellow-300 via-white to-cyan-200 px-4 text-xl font-black text-purple-950 shadow-[0_0_28px_white] active:scale-95"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {stage < 3 ? `結果(けっか)を決定(けってい) → 第${stage + 1}ガチャへ` : '3つの結果(けっか)でパワーアップ！'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Gacha({ characters, onChanged, onGoTraining }: Props) {
  const [localCharacters, setLocalCharacters] = useState(characters)
  const [phase, setPhase] = useState<GachaPhase>('idle')
  const [stage, setStage] = useState<GachaStage>(1)
  const [motionPhase, setMotionPhase] = useState<GachaMotion>('machine-enter')
  const [result, setResult] = useState<GachaResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const crystals = useMemo(() => sharedCrystalTotal(localCharacters), [localCharacters])
  const machineBusy = phase === 'playing' && !['ready', 'revealed'].includes(motionPhase)

  useEffect(() => {
    if (phase === 'idle') setLocalCharacters(characters)
  }, [characters, phase])

  useEffect(() => {
    if (phase !== 'playing' || motionPhase !== 'machine-enter') return
    const timer = window.setTimeout(() => setMotionPhase('ready'), 700)
    return () => window.clearTimeout(timer)
  }, [phase, motionPhase, stage])

  const startGacha = () => {
    if (phase === 'saving' || characters.length === 0 || crystals < GACHA_COST) return
    playSelect()
    setError(null)
    setResult(drawGacha(localCharacters))
    setStage(1)
    setMotionPhase('machine-enter')
    setPhase('playing')
  }

  const spinCurrentStage = async () => {
    if (!result || phase !== 'playing' || motionPhase !== 'ready') return
    playSelect()
    playGachaCharge(stage)
    setMotionPhase('lever')
    await sleep(700)
    setMotionPhase('mixing')
    await sleep(1100)
    playGachaDrop()
    setMotionPhase('dropping')
    await sleep(800)
    setMotionPhase('opening')
    await sleep(650)
    playGachaReveal(stage)
    setMotionPhase('revealed')
  }

  const saveResult = async () => {
    if (!result) return
    setPhase('saving')
    try {
      const updated = await spendSharedCrystals(
        localCharacters,
        GACHA_COST,
        result.character.id,
        { [result.stat]: result.after } as ImageStatsUpdate
      )
      setLocalCharacters(updated)
      await onChanged()
      setPhase('complete')
    } catch (saveError) {
      setError((saveError as Error).message)
      setPhase('idle')
    }
  }

  const advanceStage = () => {
    if (motionPhase !== 'revealed') return
    playSelect()
    if (stage < 3) {
      setStage((stage + 1) as GachaStage)
      setMotionPhase('machine-enter')
      return
    }
    void saveResult()
  }

  const reset = () => {
    if (machineBusy) return
    playSelect()
    setResult(null)
    setStage(1)
    setMotionPhase('machine-enter')
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
            src={GACHA_MACHINE}
            alt="レバー付きクリスタルガチャ"
            className="mx-auto h-52 w-52 rounded-[2rem] border-2 border-white/60 object-cover shadow-[0_0_34px_rgba(217,70,239,.8)]"
            animate={{ y: [0, -7, 0], rotate: [-1, 1, -1] }}
            transition={{ duration: 2.1, repeat: Infinity }}
          />
          <h2 className="mt-3 text-3xl font-black text-yellow-200 [text-shadow:0_3px_0_#581c87]">手回(てまわ)し3連ガチャ</h2>
          <p className="mt-1 text-sm font-bold text-cyan-100">3回とも自分でレバーを回して結果を決めよう！</p>
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
        <h3 className="text-xl font-black text-purple-900">毎回(まいかい)の流(なが)れ</h3>
        <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px] font-black text-purple-900">
          {[
            ['①', '筐体'],
            ['②', 'レバー'],
            ['③', 'ガチャガチャ'],
            ['④', 'パカッ'],
            ['⑤', '結果'],
          ].map(([number, label]) => (
            <div key={number} className="rounded-xl bg-gradient-to-b from-purple-100 to-cyan-50 p-2 ring-1 ring-purple-200">
              <span className="block text-lg">{number}</span>{label}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm font-bold text-zinc-700">キャラ → 能力 → 上昇値の順で、この流れを3回楽しめます。</p>
      </section>

      {error && <p className="rounded-2xl bg-red-100 p-3 text-sm font-black text-red-700">{error}</p>}

      {phase === 'complete' && result ? (
        <motion.section
          className="overflow-hidden rounded-[2rem] border-4 border-yellow-200 bg-gradient-to-br from-purple-950 via-fuchsia-800 to-indigo-950 p-4 text-center text-white shadow-[0_0_42px_rgba(250,204,21,.65)]"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
        >
          <p className="text-sm font-black tracking-[0.18em] text-yellow-200">3 GACHA COMPLETE</p>
          <img src={result.character.url} alt={result.character.name} className="mx-auto mt-3 h-36 w-36 rounded-3xl border-4 border-white bg-white object-contain shadow-2xl" />
          <h3 className="mt-3 text-2xl font-black">{shortBattleName(result.character.name)}</h3>
          <p className="mt-2 text-lg font-black text-cyan-100">{STAT_LABELS[result.stat]}</p>
          <div className="mt-2 flex items-center justify-center gap-3 text-3xl font-black">
            <span className="text-white/70">{result.before}</span>
            <span className="text-yellow-200">→</span>
            <span className="text-yellow-200">{result.after}</span>
          </div>
          <p className="mt-1 text-sm font-black text-white/80">ガチャ結果 +{result.boost}{result.after - result.before < result.boost ? '（最大99）' : ''}</p>
          <button
            type="button"
            onClick={crystals >= GACHA_COST ? startGacha : reset}
            className="mt-4 min-h-14 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 text-xl font-black text-purple-950 shadow-xl active:scale-95"
          >
            {crystals >= GACHA_COST ? 'もう一度3回まわす' : '結果をとじる'}
          </button>
        </motion.section>
      ) : (
        <button
          type="button"
          onClick={startGacha}
          disabled={phase !== 'idle' || characters.length === 0 || crystals < GACHA_COST}
          className="relative min-h-20 w-full overflow-hidden rounded-[2rem] border-4 border-yellow-100 bg-gradient-to-r from-fuchsia-600 via-purple-700 to-cyan-600 px-4 text-2xl font-black text-white shadow-[0_0_34px_rgba(217,70,239,.7),0_8px_0_#3b0764] active:translate-y-1 disabled:opacity-50"
        >
          <motion.span className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/35" animate={{ x: ['0%', '450%'] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.7 }} />
          <span className="relative flex items-center justify-center gap-3">
            <img src={GACHA_MACHINE} alt="" className="h-14 w-14 rounded-2xl border-2 border-white/70 object-cover" />
            <span>💎 {GACHA_COST}こで 3連ガチャ！</span>
          </span>
        </button>
      )}

      {crystals < GACHA_COST && phase !== 'complete' && (
        <button type="button" onClick={onGoTraining} className="min-h-14 w-full rounded-2xl bg-white/90 px-4 text-base font-black text-purple-800 shadow-lg">
          算数(さんすう)でクリスタルを集める →
        </button>
      )}

      <AnimatePresence>
        {phase === 'playing' && result && (
          <GachaCinematic
            stage={stage}
            motionPhase={motionPhase}
            result={result}
            onSpin={() => void spinCurrentStage()}
            onNext={advanceStage}
            onCancel={reset}
          />
        )}
        {phase === 'saving' && (
          <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-purple-950/95 p-5 text-center text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div>
              <motion.div className="mx-auto h-20 w-20 rounded-full border-8 border-white/20 border-t-yellow-300" animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
              <p className="mt-5 text-xl font-black">3つの結果を保存(ほぞん)中…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
