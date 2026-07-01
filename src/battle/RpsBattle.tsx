import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import { calculateRpsDamage } from './character-rules'
import type { AttackEffectData } from './effects/AttackFlyEffect'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import { playDamage, playPunch, playSelect, playVictory, playWhoosh } from './sounds'
import {
  HAND_EMOJI,
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
}

type RoundResult = 'win' | 'lose' | 'draw' | null

const HANDS: RpsHand[] = ['rock', 'scissors', 'paper']
const HAND_VARIANT: Record<RpsHand, number> = {
  rock: 4,
  scissors: 2,
  paper: 5,
}
const HAND_IMAGES: Record<RpsHand, string> = {
  rock: '/battle/rps-rock.png',
  scissors: '/battle/rps-scissors.png',
  paper: '/battle/rps-paper.png',
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function judge(leftHand: RpsHand, rightHand: RpsHand) {
  if (leftHand === rightHand) return 0
  if (
    (leftHand === 'rock' && rightHand === 'scissors') ||
    (leftHand === 'scissors' && rightHand === 'paper') ||
    (leftHand === 'paper' && rightHand === 'rock')
  ) {
    return 1
  }
  return -1
}

function ResultBadge({ result }: { result: RoundResult }) {
  if (!result) return null
  const text = result === 'win' ? '勝（か）ち！' : result === 'lose' ? '負（ま）け...' : 'あいこ！'
  const color =
    result === 'win'
      ? 'bg-yellow-300 text-zinc-900'
      : result === 'lose'
        ? 'bg-blue-200 text-blue-950'
        : 'bg-white text-purple-800'
  return (
    <motion.div
      key={result}
      className={`rounded-2xl px-4 py-2 text-center text-xl font-black shadow-lg sm:text-2xl ${color}`}
      initial={{ scale: 0.7, rotate: -8 }}
      animate={{ scale: 1, rotate: 0 }}
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
        className="grid h-20 place-items-center"
        initial={{ y: -18, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
      >
        <img src={HAND_IMAGES[hand]} alt="" className="h-20 w-20 rounded-2xl object-cover shadow-lg" />
      </motion.div>
    )
  }

  return (
    <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl bg-white/70 shadow-inner">
      <motion.div
        animate={{ y: [0, -240] }}
        transition={{ duration: 0.62, repeat: Infinity, ease: 'linear' }}
      >
        {reel.map((item, index) => (
          <div key={`${item}-${index}`} className="grid h-20 place-items-center">
            <img src={HAND_IMAGES[item]} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default function RpsBattle({ left, right, onDone }: Props) {
  const [leftHp, setLeftHp] = useState(left.hp)
  const [rightHp, setRightHp] = useState(right.hp)
  const leftHpRef = useRef(left.hp)
  const rightHpRef = useRef(right.hp)
  const busyRef = useRef(false)
  const [round, setRound] = useState(1)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [message, setMessage] = useState('じゃんけんの手（て）をえらんでね')
  const [playerHand, setPlayerHand] = useState<RpsHand | null>(null)
  const [cpuHand, setCpuHand] = useState<RpsHand | null>(null)
  const [cpuPreview, setCpuPreview] = useState<RpsHand>('rock')
  const [cycling, setCycling] = useState(true)
  const [roundResult, setRoundResult] = useState<RoundResult>(null)
  const [log, setLog] = useState<string[]>(['5ラウンドじゃんけん！'])
  const [finished, setFinished] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [attackEffect, setAttackEffect] = useState<AttackEffectData | null>(null)

  useEffect(() => {
    if (!cycling || finished) return
    const timer = window.setInterval(() => {
      setCpuPreview((current) => HANDS[(HANDS.indexOf(current) + 1) % HANDS.length])
    }, 155)
    return () => window.clearInterval(timer)
  }, [cycling, finished])

  const finish = async (nextLeftHp: number, nextRightHp: number) => {
    const result =
      nextLeftHp >= nextRightHp ? { winner: left, loser: right } : { winner: right, loser: left }
    setFinished(true)
    setCycling(false)
    playVictory()
    fireBattleConfetti()
    setMessage(`${shortBattleName(result.winner.name)} の勝（か）ち！`)
    setLog((prev) => [`${shortBattleName(result.winner.name)} の勝（か）ち！`, ...prev])
    setSaveMessage(await saveBattleResult('rps', result))
    await onDone()
  }

  const prepareNextRound = async (nextRound: number) => {
    await sleep(900)
    setAttackEffect(null)
    setPlayerHand(null)
    setCpuHand(null)
    setRoundResult(null)
    setRound(nextRound)
    setMessage('次（つぎ）のじゃんけん！手（て）をえらんでね')
    setCycling(true)
    busyRef.current = false
  }

  const choose = async (hand: RpsHand) => {
    if (finished || busyRef.current) return
    busyRef.current = true
    playSelect()
    setCycling(false)
    setAttackEffect(null)
    setPlayerHand(hand)
    setMessage('じゃんけん...')
    await sleep(220)

    const cpu = HANDS[Math.floor(Math.random() * HANDS.length)]
    const result = judge(hand, cpu)
    setCpuHand(cpu)
    setCpuPreview(cpu)
    setRoundResult(result > 0 ? 'win' : result < 0 ? 'lose' : 'draw')
    setLog((prev) => [
      `R${round}: ${HAND_LABELS[hand]} vs ${HAND_LABELS[cpu]}`,
      ...prev.slice(0, 5),
    ])
    setMessage(
      result === 0
        ? `あいこ！ ${HAND_LABELS[hand]} vs ${HAND_LABELS[cpu]}`
        : result > 0
          ? `${HAND_LABELS[hand]} の勝（か）ち！`
          : `CPUの ${HAND_LABELS[cpu]} が勝（か）ち！`
    )

    if (result === 0) {
      setEvents((prev) => [...prev, { id: makeEventId(), target: 'left', amount: 0, label: 'あいこ' }])
      const nextRound = round + 1
      if (nextRound > 5) {
        await finish(leftHpRef.current, rightHpRef.current)
        return
      }
      await prepareNextRound(nextRound)
      return
    }

    const winnerSide = result > 0 ? 'left' : 'right'
    const target = result > 0 ? 'right' : 'left'
    const winner = result > 0 ? left : right
    const loser = result > 0 ? right : left
    const winningHand = result > 0 ? hand : cpu
    setAttackEffect({
      id: makeEventId(),
      side: winnerSide,
      kind: 'rps',
      attribute: winner.species,
      variant: HAND_VARIANT[winningHand],
      symbol: HAND_EMOJI[winningHand],
      imageUrl: HAND_IMAGES[winningHand],
      label: `${HAND_LABELS[winningHand]}アタック`,
    })
    playWhoosh()
    playPunch()
    await sleep(560)

    const damage = calculateRpsDamage(winner, loser)
    playDamage()
    let nextLeftHp = leftHpRef.current
    let nextRightHp = rightHpRef.current
    if (result > 0) {
      nextRightHp = Math.max(0, nextRightHp - damage)
      rightHpRef.current = nextRightHp
      setRightHp(nextRightHp)
    } else {
      nextLeftHp = Math.max(0, nextLeftHp - damage)
      leftHpRef.current = nextLeftHp
      setLeftHp(nextLeftHp)
    }
    setEvents((prev) => [...prev, { id: makeEventId(), target, amount: damage }])
    setMessage(`${HAND_LABELS[winningHand]} が飛（と）んで ${damage}ダメージ！`)

    const nextRound = round + 1
    if (nextRound > 5 || nextLeftHp <= 0 || nextRightHp <= 0) {
      await sleep(650)
      await finish(nextLeftHp, nextRightHp)
      return
    }
    await prepareNextRound(nextRound)
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
        koSide={finished ? (leftHp >= rightHp ? 'right' : 'left') : undefined}
        message={message}
        attackEffect={attackEffect}
      />

      <div className="rounded-3xl bg-white/90 p-3 shadow-lg">
        <p className="mb-2 text-center text-lg font-black text-purple-800">
          ラウンド {Math.min(round, 5)} / 5
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="rounded-2xl bg-cyan-100 p-2 text-center">
            <p className="text-xs font-black text-cyan-950">じぶん</p>
            <motion.div
              key={playerHand ?? 'none'}
              className="text-5xl"
              initial={{ y: 8, scale: 0.8 }}
              animate={{ y: 0, scale: 1 }}
            >
              {playerHand ? (
                <img src={HAND_IMAGES[playerHand]} alt="" className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-lg" />
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
              disabled={finished || busyRef.current}
              onClick={() => void choose(hand)}
              className="min-h-14 rounded-2xl bg-purple-600 text-lg font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <img src={HAND_IMAGES[hand]} alt="" className="mx-auto mb-1 h-9 w-9 rounded-xl object-cover" />
              {HAND_LABELS[hand]}
            </button>
          ))}
        </div>
      </div>

      {saveMessage && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{saveMessage}</p>}
      <div className="max-h-32 overflow-y-auto rounded-3xl bg-white/85 p-3">
        {log.map((item, index) => (
          <p key={`${item}-${index}`} className="text-sm font-bold text-zinc-800">{item}</p>
        ))}
      </div>
    </div>
  )
}
