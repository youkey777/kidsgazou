import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import { calculateDiceDamage } from './character-rules'
import type { AttackEffectData } from './effects/AttackFlyEffect'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import { playDamage, playPunch, playUltimate, playVictory } from './sounds'
import { type BattleResult, type DamageEvent, makeEventId, shortBattleName } from './types'

type Props = {
  left: ImageRecord
  right: ImageRecord
  onDone: () => Promise<void> | void
}

type DiceSide = 'left' | 'right'
type Phase = 'ready' | 'rolling' | 'attacking' | 'finished'

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const DICE_ATTACKS = [
  'ころころショット',
  'ジャンプスロー',
  'バウンドアタック',
  'ジグザグストライク',
  'ぐるぐるチャージ',
  'ミラクルスマッシュ',
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function rollDie() {
  return Math.floor(Math.random() * 6) + 1
}

function DicePanel({
  side,
  face,
  rolling,
  label,
}: {
  side: DiceSide
  face: number | null
  rolling: boolean
  label: string
}) {
  const pipMap: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }

  return (
    <div
      className={`rounded-3xl p-3 text-center shadow-lg ${
        side === 'left' ? 'bg-cyan-100 text-cyan-950' : 'bg-pink-100 text-pink-950'
      }`}
    >
      <p className="text-xs font-black">{label}</p>
      <motion.div
        className="mx-auto mt-1 grid h-20 w-20 grid-cols-3 grid-rows-3 gap-1 rounded-2xl bg-white p-3 shadow-inner"
        animate={
          rolling
            ? {
                rotate: [0, -28, 35, -24, 42, -12, 0],
                y: [0, -10, 8, -14, 6, 0],
                scale: [1, 1.16, 0.94, 1.2, 0.98, 1],
              }
            : { rotate: 0, y: 0, scale: 1 }
        }
        transition={{ duration: 0.75, ease: 'easeInOut' }}
      >
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className={`rounded-full ${face && pipMap[face].includes(index) ? 'bg-zinc-900' : 'bg-transparent'}`}
          />
        ))}
      </motion.div>
      <p className="mt-1 min-h-5 text-sm font-black">
        {rolling ? 'ころころ...' : face ? `${face} が出た！` : 'まち'}
      </p>
    </div>
  )
}

export default function DiceBattle({ left, right, onDone }: Props) {
  const firstSide: DiceSide = left.spd >= right.spd ? 'left' : 'right'
  const [leftHp, setLeftHp] = useState(left.hp)
  const [rightHp, setRightHp] = useState(right.hp)
  const leftHpRef = useRef(left.hp)
  const rightHpRef = useRef(right.hp)
  const busyRef = useRef(false)
  const doneRef = useRef(false)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [activeSide, setActiveSide] = useState<DiceSide | undefined>()
  const [koSide, setKoSide] = useState<DiceSide | undefined>()
  const [message, setMessage] = useState(
    firstSide === 'left'
      ? '自分（じぶん）の番（ばん）でサイコロをふってね！'
      : 'CPUの番（ばん）！サイコロをふるよ！'
  )
  const [leftDie, setLeftDie] = useState<number | null>(null)
  const [rightDie, setRightDie] = useState<number | null>(null)
  const [rollingSide, setRollingSide] = useState<DiceSide | null>(null)
  const [turnSide, setTurnSide] = useState<DiceSide>(firstSide)
  const [phase, setPhase] = useState<Phase>('ready')
  const [turnCount, setTurnCount] = useState(1)
  const [log, setLog] = useState<string[]>(['ダイスバトル開始（かいし）！'])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [attackEffect, setAttackEffect] = useState<AttackEffectData | null>(null)

  const finish = async (leftCurrent: number, rightCurrent: number) => {
    if (doneRef.current) return
    doneRef.current = true
    const result: BattleResult =
      leftCurrent >= rightCurrent ? { winner: left, loser: right } : { winner: right, loser: left }
    const loserSide = result.winner.id === left.id ? 'right' : 'left'
    setPhase('finished')
    setKoSide(loserSide)
    setMessage(`${shortBattleName(result.winner.name)} の勝（か）ち！`)
    setLog((prev) => [`${shortBattleName(result.winner.name)} の勝（か）ち！`, ...prev])
    playVictory()
    fireBattleConfetti()
    setSaveMessage(await saveBattleResult('dice', result))
    await onDone()
  }

  const runTurn = async (side: DiceSide) => {
    if (busyRef.current || doneRef.current || phase === 'finished') return
    busyRef.current = true
    setPhase('rolling')
    setActiveSide(undefined)
    setAttackEffect(null)
    const attacker = side === 'left' ? left : right
    const defender = side === 'left' ? right : left
    const target: DiceSide = side === 'left' ? 'right' : 'left'
    const attackerName = shortBattleName(attacker.name)

    setRollingSide(side)
    setMessage(`${attackerName} がサイコロをふるよ！`)
    for (let i = 0; i < 10; i++) {
      const preview = rollDie()
      if (side === 'left') setLeftDie(preview)
      else setRightDie(preview)
      await sleep(70 + i * 8)
    }

    const die = rollDie()
    if (side === 'left') setLeftDie(die)
    else setRightDie(die)
    setRollingSide(null)
    setMessage(`${attackerName} は ${die} を出した！`)
    await sleep(280)

    const attackName = die === 6 ? attacker.ultimateName : DICE_ATTACKS[die - 1]
    setPhase('attacking')
    setActiveSide(side)
    setAttackEffect({
      id: makeEventId(),
      side,
      kind: 'dice',
      attribute: attacker.species,
      variant: die,
      symbol: DICE_FACES[die - 1],
      label: `${attacker.species}・${attackName}`,
    })
    setMessage(`${attackName}！ サイコロが飛（と）んでいく！`)
    if (die === 6) playUltimate()
    else playPunch()
    await sleep(640)

    const damage = calculateDiceDamage(attacker, defender, die)
    playDamage()
    setEvents((prev) => [...prev, { id: makeEventId(), target, amount: damage }])

    let nextLeftHp = leftHpRef.current
    let nextRightHp = rightHpRef.current
    if (side === 'left') {
      nextRightHp = Math.max(0, nextRightHp - damage)
      rightHpRef.current = nextRightHp
      setRightHp(nextRightHp)
    } else {
      nextLeftHp = Math.max(0, nextLeftHp - damage)
      leftHpRef.current = nextLeftHp
      setLeftHp(nextLeftHp)
    }
    setLog((prev) => [
      `T${turnCount}: ${attackerName} サイコロ${die} → ${damage}ダメージ`,
      ...prev.slice(0, 5),
    ])
    setMessage(`${attackerName} の攻撃（こうげき）！ ${damage}ダメージ！`)
    await sleep(660)
    setAttackEffect(null)
    setActiveSide(undefined)

    if (nextLeftHp <= 0 || nextRightHp <= 0 || turnCount >= 10) {
      await finish(nextLeftHp, nextRightHp)
      busyRef.current = false
      return
    }

    const nextSide = side === 'left' ? 'right' : 'left'
    setTurnCount((value) => value + 1)
    setTurnSide(nextSide)
    setPhase('ready')
    setMessage(
      nextSide === 'left'
        ? '自分（じぶん）の番（ばん）！サイコロをふってね！'
        : 'CPUの番（ばん）！サイコロをふるよ！'
    )
    busyRef.current = false
  }

  useEffect(() => {
    if (turnSide !== 'right' || phase !== 'ready' || doneRef.current) return
    const timer = window.setTimeout(() => {
      void runTurn('right')
    }, 720)
    return () => window.clearTimeout(timer)
    // runTurn intentionally reads refs and current state through closures from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnSide, phase])

  return (
    <div className="space-y-3">
      <BattleStage
        left={left}
        right={right}
        leftHp={leftHp}
        rightHp={rightHp}
        damageEvents={events}
        activeSide={activeSide}
        koSide={koSide}
        message={message}
        attackEffect={attackEffect}
      />

      <div className="grid grid-cols-2 gap-2">
        <DicePanel
          side="left"
          face={leftDie}
          rolling={rollingSide === 'left'}
          label={`1P / ターン${turnCount}`}
        />
        <DicePanel
          side="right"
          face={rightDie}
          rolling={rollingSide === 'right'}
          label={`CPU / ターン${turnCount}`}
        />
      </div>

      <button
        type="button"
        disabled={phase !== 'ready' || turnSide !== 'left'}
        onClick={() => void runTurn('left')}
        className="min-h-14 w-full rounded-3xl bg-yellow-300 px-5 py-3 text-xl font-black text-zinc-950 shadow-xl transition active:scale-95 disabled:bg-white/45 disabled:text-white/70"
      >
        {phase === 'rolling'
          ? 'サイコロころころ...'
          : turnSide === 'left' && phase === 'ready'
            ? '🎲 サイコロをふる'
            : 'CPUがふっているよ'}
      </button>

      {koSide && (
        <div className="rounded-3xl bg-yellow-300 p-3 text-center text-2xl font-black text-zinc-900 shadow-xl">
          KO! YOU WIN!
        </div>
      )}
      {saveMessage && (
        <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">
          {saveMessage}
        </p>
      )}
      <div className="max-h-32 overflow-y-auto rounded-3xl bg-white/85 p-3">
        {log.map((item, index) => (
          <p key={`${item}-${index}`} className="text-sm font-bold text-zinc-800">
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}
