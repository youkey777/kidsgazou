import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import { calculateDiceDamage } from './character-rules'
import {
  RPS_HANDS as HANDS,
  RPS_HAND_IMAGES as HAND_IMAGES,
  judgeRps,
  randomRpsHand,
  rollBattleDie,
  rollDynamiteCount,
  rollDynamiteDamage,
  shouldDurianCounter,
  shouldKingKarubiFeast,
  shouldPlantDynamite,
  ultimateName,
} from './battle-logic'
import type { AttackEffectData } from './effects/AttackFlyEffect'
import BattleStage, { type DynamiteExplosion, type DynamiteMarker } from './effects/BattleStage'
import CinematicAttackOverlay, { type CinematicAttack } from './effects/CinematicAttackOverlay'
import { fireBattleConfetti } from './effects/Confetti'
import type { DiceThrowEffectData } from './effects/DiceThrowEffect'
import type { KingKarubiFeastEffectData } from './effects/KingKarubiFeastEffect'
import VictoryOverlay from './effects/VictoryOverlay'
import {
  playAttributeHit,
  playAttributeUltimate,
  playAttributeWhoosh,
  playDamage,
  playDiceLand,
  playDiceRoll,
  playDynamiteExplosion,
  playDynamiteFuse,
  playDynamiteSet,
  playKingKarubiFeast,
  playRpsReveal,
  playSelect,
  playSlotStop,
  playSlotTick,
  playUltimate,
  playVictory,
  playWhoosh,
  unlockAudio,
} from './sounds'
import {
  HAND_LABELS,
  type DamageEvent,
  type RpsHand,
  makeEventId,
  shortBattleName,
} from './types'

type Props = {
  left: ImageRecord
  right: ImageRecord
  onDone: () => Promise<void> | void
  onExit: () => void
  saveResult?: boolean
  initialLeftHp?: number
  initialRightHp?: number
  onBattleEnd?: (
    winner: ImageRecord,
    loser: ImageRecord,
    winnerSide: Side,
    finalHp: { left: number; right: number }
  ) => Promise<void> | void
}

type Side = 'left' | 'right'
type RoundResult = 'win' | 'lose' | 'draw' | null
type PlantedDynamite = DynamiteMarker & {
  explodeRound: number
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function ResultBadge({ result }: { result: RoundResult }) {
  const text = result === 'win' ? '勝(か)ち！' : result === 'lose' ? '負(ま)け...' : result === 'draw' ? 'あいこ！' : '勝負(しょうぶ)'
  const color =
    result === 'win'
      ? 'bg-yellow-300 text-zinc-950'
      : result === 'lose'
        ? 'bg-blue-200 text-blue-950'
        : result === 'draw'
          ? 'bg-white text-purple-800'
          : 'bg-black/45 text-white'
  return (
    <motion.div
      key={result ?? 'ready'}
      className={`grid min-h-16 w-24 place-items-center rounded-2xl px-2 text-center text-lg font-black shadow-lg ${color}`}
      initial={{ scale: 0.86, opacity: 0.65 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      {text}
    </motion.div>
  )
}

function HandSlot({ hand, cycling }: { hand: RpsHand; cycling: boolean }) {
  const reel = [...HANDS, ...HANDS, ...HANDS]
  if (!cycling) {
    return (
      <motion.div
        key={hand}
        className="grid h-28 w-full place-items-center"
        initial={{ scale: 0.92, opacity: 0.85 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <img src={HAND_IMAGES[hand]} alt="" className="h-24 w-full rounded-2xl object-contain shadow-lg" />
      </motion.div>
    )
  }

  return (
    <div className="mx-auto h-28 w-full overflow-hidden rounded-2xl bg-white/70 shadow-inner">
      <motion.div
        animate={{ y: [0, -336] }}
        transition={{ duration: 0.62, repeat: Infinity, ease: 'linear' }}
      >
        {reel.map((item, index) => (
          <div key={`${item}-${index}`} className="grid h-28 place-items-center">
            <img src={HAND_IMAGES[item]} alt="" className="h-24 w-full rounded-2xl object-contain" />
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default function ComboBattle({ left, right, onDone, onExit, saveResult = true, initialLeftHp, initialRightHp, onBattleEnd }: Props) {
  const startingLeftHp = initialLeftHp ?? left.hp
  const startingRightHp = initialRightHp ?? right.hp
  const [leftHp, setLeftHp] = useState(startingLeftHp)
  const [rightHp, setRightHp] = useState(startingRightHp)
  const leftHpRef = useRef(startingLeftHp)
  const rightHpRef = useRef(startingRightHp)
  const busyRef = useRef(false)
  const doneRef = useRef(false)
  const [round, setRound] = useState(1)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [message, setMessage] = useState('手(て)を選(えら)んで、じゃんけんしよう')
  const [playerHand, setPlayerHand] = useState<RpsHand | null>(null)
  const [cpuHand, setCpuHand] = useState<RpsHand | null>(null)
  const [cpuPreview, setCpuPreview] = useState<RpsHand>('rock')
  const [cycling, setCycling] = useState(true)
  const [roundResult, setRoundResult] = useState<RoundResult>(null)
  const [activeSide, setActiveSide] = useState<Side | undefined>()
  const [dodgeSide, setDodgeSide] = useState<Side | undefined>()
  const [confusedSide, setConfusedSide] = useState<Side | undefined>()
  const [hitSide, setHitSide] = useState<Side | undefined>()
  const [koSide, setKoSide] = useState<Side | undefined>()
  const [attackEffect, setAttackEffect] = useState<AttackEffectData | null>(null)
  const [diceThrowEffect, setDiceThrowEffect] = useState<DiceThrowEffectData | null>(null)
  const [cinematic, setCinematic] = useState<CinematicAttack | null>(null)
  const [specialTitle, setSpecialTitle] = useState<string | null>(null)
  const [plantedDynamites, setPlantedDynamites] = useState<PlantedDynamite[]>([])
  const dynamitesRef = useRef<PlantedDynamite[]>([])
  const [dynamiteExplosion, setDynamiteExplosion] = useState<DynamiteExplosion | null>(null)
  const [healingEffect, setHealingEffect] = useState<KingKarubiFeastEffectData | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [victory, setVictory] = useState<{ winner: ImageRecord; outcome: 'win' | 'lose' } | null>(null)
  const cpuPreviewRef = useRef(cpuPreview)
  const slotTickRef = useRef(0)

  const updateDynamites = (next: PlantedDynamite[] | ((current: PlantedDynamite[]) => PlantedDynamite[])) => {
    const resolved = typeof next === 'function' ? next(dynamitesRef.current) : next
    dynamitesRef.current = resolved
    setPlantedDynamites(resolved)
  }

  useEffect(() => {
    if (!cycling || doneRef.current) return
    const timer = window.setInterval(() => {
      const next = randomRpsHand()
      cpuPreviewRef.current = next
      setCpuPreview(next)
      const now = Date.now()
      if (now - slotTickRef.current > 180) {
        slotTickRef.current = now
        playSlotTick()
      }
    }, 112)
    return () => window.clearInterval(timer)
  }, [cycling])

  const finish = async (nextLeftHp: number, nextRightHp: number) => {
    if (doneRef.current) return
    doneRef.current = true
    const result =
      nextLeftHp >= nextRightHp ? { winner: left, loser: right } : { winner: right, loser: left }
    setKoSide(result.winner.id === left.id ? 'right' : 'left')
    setCycling(false)
    setMessage(`${shortBattleName(result.winner.name)} の勝(か)ち！`)
    playVictory()
    fireBattleConfetti()
    setVictory({ winner: result.winner, outcome: result.winner.id === left.id ? 'win' : 'lose' })
    if (saveResult) setSaveMessage(await saveBattleResult('combo', result))
    await onBattleEnd?.(result.winner, result.loser, result.winner.id === left.id ? 'left' : 'right', {
      left: nextLeftHp,
      right: nextRightHp,
    })
    await onDone()
  }

  const playKingKarubiFeastAnimation = async (target: Side, character: ImageRecord) => {
    const effect: KingKarubiFeastEffectData = { id: makeEventId(), side: target }
    setActiveSide(undefined)
    setHealingEffect(effect)
    setMessage(`${shortBattleName(character.name)} が焼(や)きカルビを食(た)べた！`)
    playKingKarubiFeast()
    await sleep(1820)

    if (target === 'left') {
      leftHpRef.current = character.hp
      setLeftHp(character.hp)
    } else {
      rightHpRef.current = character.hp
      setRightHp(character.hp)
    }
    setMessage('王(おう)のごちそう！ HPが全回復(ぜんかいふく)！')
    await sleep(1430)
    setHealingEffect(null)
  }

  const resetForNext = async (nextRound: number, delay = 880) => {
    const isNewRound = nextRound > round
    await sleep(delay)
    setPlayerHand(null)
    setCpuHand(null)
    setRoundResult(null)
    setAttackEffect(null)
    setDiceThrowEffect(null)
    setCinematic(null)
    setDodgeSide(undefined)
    setConfusedSide(undefined)
    setHitSide(undefined)
    setSpecialTitle(null)
    setDynamiteExplosion(null)
    setHealingEffect(null)
    setRound(nextRound)
    if (isNewRound && nextRound >= 2) {
      setMessage(`ラウンド ${nextRound}！ 王(おう)のごちそう抽選(ちゅうせん)！`)
      await sleep(320)
      if (shouldKingKarubiFeast(left)) {
        await playKingKarubiFeastAnimation('left', left)
      }
      if (shouldKingKarubiFeast(right)) {
        await playKingKarubiFeastAnimation('right', right)
      }
    }
    setMessage('次(つぎ)の手(て)を選(えら)んでね')
    const nextPreview = randomRpsHand()
    cpuPreviewRef.current = nextPreview
    setCpuPreview(nextPreview)
    setCycling(true)
    busyRef.current = false
  }

  const applyDamageToSide = (
    target: Side,
    amount: number,
    scale: 'normal' | 'counter' | 'ultimate' = 'normal'
  ) => {
    let nextLeftHp = leftHpRef.current
    let nextRightHp = rightHpRef.current
    if (target === 'left') {
      nextLeftHp = Math.max(0, nextLeftHp - amount)
      leftHpRef.current = nextLeftHp
      setLeftHp(nextLeftHp)
    } else {
      nextRightHp = Math.max(0, nextRightHp - amount)
      rightHpRef.current = nextRightHp
      setRightHp(nextRightHp)
    }
    setHitSide(target)
    window.setTimeout(() => setHitSide(undefined), scale === 'ultimate' ? 900 : 620)
    setEvents((prev) => [...prev, { id: makeEventId(), target, amount, scale }])
    return { nextLeftHp, nextRightHp }
  }

  const placeCaptainDynamites = async (winnerSide: Side, winner: ImageRecord, currentRound: number) => {
    if (!shouldPlantDynamite(winner)) return
    const target: Side = winnerSide === 'left' ? 'right' : 'left'
    const count = rollDynamiteCount()
    const newDynamites = Array.from({ length: count }, (_, index) => ({
      id: makeEventId(),
      target,
      explodeRound: currentRound + (index + 1) * 2,
    }))

    setSpecialTitle('ダイナマイト')
    setMessage(`${shortBattleName(winner.name)} のダイナマイト！`)
    playDynamiteSet()
    await sleep(720)
    setSpecialTitle(null)
    updateDynamites((current) => [...current, ...newDynamites])
    setMessage(`ダイナマイトを ${count}こ しかけた！`)
    await sleep(860)
  }

  const explodeDueDynamites = async (currentRound: number) => {
    const due = dynamitesRef.current
      .filter((item) => item.explodeRound <= currentRound)
      .sort((a, b) => a.explodeRound - b.explodeRound)

    for (const dynamite of due) {
      if (doneRef.current) return null
      setMessage('ダイナマイトのどうかせんに火(ひ)がついた！')
      playDynamiteFuse()
      await sleep(640)
      setDynamiteExplosion({ id: `${dynamite.id}-boom`, target: dynamite.target })
      setMessage('ダイナマイトがばくはつ！')
      playDynamiteExplosion()
      await sleep(420)
      const damage = rollDynamiteDamage()
      const result = applyDamageToSide(dynamite.target, damage, 'ultimate')
      playDamage()
      updateDynamites((current) => current.filter((item) => item.id !== dynamite.id))
      await sleep(1050)
      setDynamiteExplosion(null)
      if (result.nextLeftHp <= 0 || result.nextRightHp <= 0) return result
    }
    return { nextLeftHp: leftHpRef.current, nextRightHp: rightHpRef.current }
  }

  const tryDurianCounter = async (
    attackerSide: Side,
    attacker: ImageRecord,
    defender: ImageRecord
  ) => {
    if (!shouldDurianCounter(defender)) return false
    const defenderSide: Side = attackerSide === 'left' ? 'right' : 'left'
    let nextLeftHp = leftHpRef.current
    let nextRightHp = rightHpRef.current
    const applyDamage = (target: Side, amount: number, scale: 'normal' | 'counter' | 'ultimate' = 'normal') => {
      if (target === 'left') {
        nextLeftHp = Math.max(0, nextLeftHp - amount)
        leftHpRef.current = nextLeftHp
        setLeftHp(nextLeftHp)
      } else {
        nextRightHp = Math.max(0, nextRightHp - amount)
        rightHpRef.current = nextRightHp
        setRightHp(nextRightHp)
      }
      setHitSide(target)
      window.setTimeout(() => setHitSide(undefined), scale === 'ultimate' ? 760 : 560)
      setEvents((prev) => [...prev, { id: makeEventId(), target, amount, scale }])
    }

    setMessage('ブルーベリーハシニーニが後(うし)ろに下(さ)がってよけた！')
    setActiveSide(undefined)
    setDodgeSide(defenderSide)
    playWhoosh()
    await sleep(620)
    setDodgeSide(undefined)

    setSpecialTitle('ドリアン投(な)げ')
    setMessage('ドリアン投(な)げ！')
    await sleep(680)
    setSpecialTitle(null)
    await sleep(120)
    setAttackEffect({
      id: makeEventId(),
      side: defenderSide,
      kind: 'counter',
      attribute: 'くさ',
      variant: 4,
      imageUrl: '/battle/durian-3d.png',
      label: 'ドリアン投(な)げ',
    })
    playAttributeWhoosh('durian')
    await sleep(1840)

    playAttributeHit('durian')
    playDamage()
    applyDamage(attackerSide, 10, 'counter')
    setConfusedSide(attackerSide)
    setMessage('10ダメージ！相手(あいて)が混乱(こんらん)！')
    await sleep(720)
    nextLeftHp = leftHpRef.current
    nextRightHp = rightHpRef.current
    await sleep(330)
    setAttackEffect(null)

    if (nextLeftHp <= 0 || nextRightHp <= 0) {
      await finish(nextLeftHp, nextRightHp)
      return true
    }

    setAttackEffect({
      id: makeEventId(),
      side: defenderSide,
      kind: 'dice',
      attribute: defender.species,
      variant: 2,
      label: '通常攻撃(つうじょうこうげき)',
    })
    setMessage('さらに通常攻撃(つうじょうこうげき)！')
    playAttributeWhoosh(defender.species)
    await sleep(1620)
    const followDamage = calculateDiceDamage(defender, attacker, 2)
    playAttributeHit(defender.species)
    playDamage()
    applyDamage(attackerSide, followDamage)
    setMessage(`${followDamage}ダメージ！`)
    await sleep(720)
    nextLeftHp = leftHpRef.current
    nextRightHp = rightHpRef.current
    await sleep(380)
    setAttackEffect(null)
    setActiveSide(undefined)
    setConfusedSide(undefined)

    if (nextLeftHp <= 0 || nextRightHp <= 0) {
      await finish(nextLeftHp, nextRightHp)
      return true
    }

    const explosionResult = await explodeDueDynamites(round)
    if (!explosionResult) return true
    if (explosionResult.nextLeftHp <= 0 || explosionResult.nextRightHp <= 0) {
      await finish(explosionResult.nextLeftHp, explosionResult.nextRightHp)
      return true
    }
    await resetForNext(round + 1, 520)
    return true
  }

  const rollAndAttack = async (winnerSide: Side, winner: ImageRecord, loser: ImageRecord) => {
    const target: Side = winnerSide === 'left' ? 'right' : 'left'
    const throwId = makeEventId()
    setMessage(`${shortBattleName(winner.name)} がサイコロを振(ふ)るよ`)
    setDiceThrowEffect({ id: throwId, side: winnerSide, face: null })
    playDiceRoll()
    for (let i = 0; i < 10; i++) {
      setDiceThrowEffect({ id: throwId, side: winnerSide, face: rollBattleDie() })
      await sleep(48 + i * 5)
    }

    const die = rollBattleDie()
    setDiceThrowEffect({ id: throwId, side: winnerSide, face: die })
    playDiceLand()
    setMessage(`出目(でめ)は ${die}！`)
    await sleep(1050)

    const attackName = ultimateName(winner, die)
    const countered = await tryDurianCounter(winnerSide, winner, loser)
    if (countered) return

    await placeCaptainDynamites(winnerSide, winner, round)

    if (die >= 4) {
      const cinematicData = {
        id: makeEventId(),
        name: attackName,
        attribute: winner.species,
        die: die as 4 | 5 | 6,
      }
      setCinematic(cinematicData)
      playAttributeUltimate(winner.species, die as 4 | 5 | 6)
      playUltimate()
      await sleep(die === 4 ? 1700 : die === 5 ? 2200 : 2800)
      setCinematic(null)
      await sleep(180)
    }

    setActiveSide(winnerSide)
    setAttackEffect({
      id: makeEventId(),
      side: winnerSide,
      kind: 'dice',
      attribute: winner.species,
      variant: die,
      label: attackName,
    })
    setDiceThrowEffect(null)
    setMessage(die >= 4 ? `${attackName}！` : `${shortBattleName(winner.name)} の攻撃(こうげき)！`)
    playAttributeWhoosh(winner.species)
    await sleep(die >= 4 ? 1520 : 1620)

    const damage = die === 6 ? (target === 'right' ? rightHpRef.current : leftHpRef.current) : calculateDiceDamage(winner, loser, die)
    playAttributeHit(winner.species)
    playDamage()
    setHitSide(target)
    window.setTimeout(() => setHitSide(undefined), die >= 4 ? 820 : 560)
    let nextLeftHp = leftHpRef.current
    let nextRightHp = rightHpRef.current
    if (winnerSide === 'left') {
      nextRightHp = Math.max(0, nextRightHp - damage)
      rightHpRef.current = nextRightHp
      setRightHp(nextRightHp)
    } else {
      nextLeftHp = Math.max(0, nextLeftHp - damage)
      leftHpRef.current = nextLeftHp
      setLeftHp(nextLeftHp)
    }
    setEvents((prev) => [...prev, { id: makeEventId(), target, amount: damage, scale: die >= 4 ? 'ultimate' : 'normal' }])
    setMessage(die === 6 ? `一撃必殺(いちげきひっさつ)！ ${damage}ダメージ！` : `${damage}ダメージ！`)
    await sleep(die >= 4 ? 1800 : 1150)
    setActiveSide(undefined)
    setAttackEffect(null)
    setCinematic(null)

    nextLeftHp = leftHpRef.current
    nextRightHp = rightHpRef.current

    if (nextLeftHp <= 0 || nextRightHp <= 0) {
      await finish(nextLeftHp, nextRightHp)
      busyRef.current = false
      return
    }

    const explosionResult = await explodeDueDynamites(round)
    if (!explosionResult) return
    if (explosionResult.nextLeftHp <= 0 || explosionResult.nextRightHp <= 0) {
      await finish(explosionResult.nextLeftHp, explosionResult.nextRightHp)
      busyRef.current = false
      return
    }
    await resetForNext(round + 1, 620)
  }

  const choose = async (hand: RpsHand) => {
    if (busyRef.current || doneRef.current) return
    busyRef.current = true
    unlockAudio()
    playSelect()
    setAttackEffect(null)
    setDiceThrowEffect(null)
    setCinematic(null)
    const cpu = cpuPreviewRef.current
    setCycling(false)
    playSlotStop()
    setPlayerHand(hand)
    setCpuHand(cpu)
    setCpuPreview(cpu)
    setMessage('じゃんけん、ぽん！')
    await sleep(220)

    const result = judgeRps(hand, cpu)
    setRoundResult(result > 0 ? 'win' : result < 0 ? 'lose' : 'draw')
    playRpsReveal(result > 0 ? 'win' : result < 0 ? 'lose' : 'draw')
    setMessage(
      result === 0
        ? `${HAND_LABELS[hand]} と ${HAND_LABELS[cpu]}。あいこ！`
        : result > 0
          ? `${HAND_LABELS[hand]} の勝(か)ち！サイコロへ！`
          : `CPUの ${HAND_LABELS[cpu]} が勝(か)ち！`
    )
    await sleep(result === 0 ? 760 : 920)

    if (result === 0) {
      await resetForNext(round + 1, 260)
      return
    }

    const winnerSide: Side = result > 0 ? 'left' : 'right'
    const winner = result > 0 ? left : right
    const loser = result > 0 ? right : left
    await rollAndAttack(winnerSide, winner, loser)
  }

  const visibleCpuHand = cpuHand ?? cpuPreview

  return (
    <div className="space-y-3">
      <BattleStage
        left={left}
        right={right}
        leftHp={leftHp}
        rightHp={rightHp}
        damageEvents={events}
        activeSide={activeSide}
        dodgeSide={dodgeSide}
        confusedSide={confusedSide}
        hitSide={hitSide}
        koSide={koSide}
        message={message}
        specialTitle={specialTitle}
        attackEffect={attackEffect}
        diceThrowEffect={diceThrowEffect}
        dynamites={plantedDynamites}
        dynamiteExplosion={dynamiteExplosion}
        healingEffect={healingEffect}
      />

      <section className="rounded-3xl bg-white/92 p-3 shadow-lg">
        <p className="mb-2 text-center text-lg font-black text-purple-800">
          ラウンド {round}
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center gap-2">
          <div className="rounded-2xl bg-cyan-100 p-2 text-center">
            <p className="text-xs font-black text-cyan-950">じぶん</p>
            <motion.div
              key={playerHand ?? 'none'}
              className="grid h-28 place-items-center text-5xl"
              initial={{ y: 8, scale: 0.86 }}
              animate={{ y: 0, scale: 1 }}
            >
              {playerHand ? (
                <img src={HAND_IMAGES[playerHand]} alt="" className="mx-auto h-24 w-full rounded-2xl object-contain shadow-lg" />
              ) : (
                '？'
              )}
            </motion.div>
            <p className="text-sm font-black text-cyan-950">
              {playerHand ? HAND_LABELS[playerHand] : 'えらぶ'}
            </p>
          </div>
          <ResultBadge result={roundResult} />
          <div className="rounded-2xl bg-pink-100 p-2 text-center">
            <p className="text-xs font-black text-pink-950">CPU</p>
            <HandSlot hand={visibleCpuHand} cycling={cycling} />
            <p className="text-sm font-black text-pink-950">
              {cpuHand ? HAND_LABELS[cpuHand] : 'スロット'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {HANDS.map((hand) => (
            <button
              key={hand}
              disabled={busyRef.current || !!victory}
              onClick={() => void choose(hand)}
              className="min-h-14 rounded-2xl bg-purple-600 text-lg font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <img src={HAND_IMAGES[hand]} alt="" className="mx-auto mb-1 h-9 w-9 rounded-xl object-cover" />
              {HAND_LABELS[hand]}
            </button>
          ))}
        </div>
      </section>

      <CinematicAttackOverlay attack={cinematic} />
      {saveMessage && (
        <p className="fixed inset-x-4 bottom-24 z-[80] mx-auto max-w-md rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700 shadow-2xl ring-2 ring-red-300">
          {saveMessage}
        </p>
      )}
      {victory && <VictoryOverlay winner={victory.winner} outcome={victory.outcome} onNext={onExit} />}
    </div>
  )
}
