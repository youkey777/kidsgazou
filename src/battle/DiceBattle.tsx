import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
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

const ATTACKS = [
  'たいあたり',
  'ぐるぐるアタック',
  'きらきらパンチ',
  'ジャンプこうげき',
  'スピードアタック',
  'ミラクルヒット',
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function rollDie() {
  return Math.floor(Math.random() * 6) + 1
}

function calcDamage(attacker: ImageRecord, defender: ImageRecord, die: number) {
  const baseByHp = defender.hp * (0.11 + die * 0.025)
  const statBonus = attacker.atk * (0.45 + die * 0.04) - defender.def * 0.2
  const speedBonus = Math.max(0, attacker.spd - defender.spd) * 0.18
  const raw = baseByHp + statBonus + speedBonus
  const minimum = Math.max(18, Math.floor(defender.hp * 0.18))
  const maximum = Math.max(34, Math.floor(defender.hp * 0.42))
  return Math.max(minimum, Math.min(maximum, Math.floor(raw)))
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
            ? { rotate: [0, -18, 20, -12, 18, 0], scale: [1, 1.12, 0.96, 1.08, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className={`rounded-full ${face && pipMap[face].includes(index) ? 'bg-zinc-900' : 'bg-transparent'}`}
          />
        ))}
      </motion.div>
      <p className="mt-1 min-h-5 text-sm font-black">
        {rolling ? 'ころころ...' : face ? `${face} が出た！` : '待機中'}
      </p>
    </div>
  )
}

export default function DiceBattle({ left, right, onDone }: Props) {
  const [leftHp, setLeftHp] = useState(left.hp)
  const [rightHp, setRightHp] = useState(right.hp)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [activeSide, setActiveSide] = useState<DiceSide | undefined>()
  const [koSide, setKoSide] = useState<DiceSide | undefined>()
  const [message, setMessage] = useState('すばやい方からサイコロを振るよ！')
  const [leftDie, setLeftDie] = useState<number | null>(null)
  const [rightDie, setRightDie] = useState<number | null>(null)
  const [rollingSide, setRollingSide] = useState<DiceSide | null>(null)
  const [turnCount, setTurnCount] = useState(1)
  const [log, setLog] = useState<string[]>(['ダイスバトル開始！'])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let leftCurrent = left.hp
      let rightCurrent = right.hp
      let leftTurn = left.spd >= right.spd
      let localTurn = 1
      await sleep(650)

      while (!cancelled && leftCurrent > 0 && rightCurrent > 0 && localTurn <= 9) {
        const attacker = leftTurn ? left : right
        const defender = leftTurn ? right : left
        const attackerSide: DiceSide = leftTurn ? 'left' : 'right'
        const target: DiceSide = leftTurn ? 'right' : 'left'
        const attackerName = shortBattleName(attacker.name)

        setTurnCount(localTurn)
        setActiveSide(undefined)
        setRollingSide(attackerSide)
        setMessage(`${attackerName}がサイコロを振るよ...`)
        for (let i = 0; i < 7; i++) {
          const preview = rollDie()
          if (attackerSide === 'left') setLeftDie(preview)
          else setRightDie(preview)
          await sleep(90)
        }

        const die = rollDie()
        if (attackerSide === 'left') setLeftDie(die)
        else setRightDie(die)
        setRollingSide(null)
        setMessage(`${attackerName}は ${die} を出した！`)
        await sleep(520)

        const attackName = die === 6 ? attacker.ultimateName : ATTACKS[(localTurn + die) % ATTACKS.length]
        const damage = calcDamage(attacker, defender, die)
        const attackText = `${attackerName}の${attackName}！ ${damage}ダメージ`
        setActiveSide(attackerSide)
        setMessage(attackText)
        if (die === 6) playUltimate()
        else playPunch()
        playDamage()
        setEvents((prev) => [...prev, { id: makeEventId(), target, amount: damage }])

        if (leftTurn) {
          rightCurrent = Math.max(0, rightCurrent - damage)
          setRightHp(rightCurrent)
        } else {
          leftCurrent = Math.max(0, leftCurrent - damage)
          setLeftHp(leftCurrent)
        }
        setLog((prev) => [
          `T${localTurn}: ${attackerName} サイコロ${die} → ${damage}ダメージ`,
          ...prev.slice(0, 5),
        ])

        await sleep(1000)
        leftTurn = !leftTurn
        localTurn += 1
      }

      if (cancelled) return
      const result: BattleResult =
        leftCurrent >= rightCurrent ? { winner: left, loser: right } : { winner: right, loser: left }
      setKoSide(result.winner.id === left.id ? 'right' : 'left')
      setMessage(`${shortBattleName(result.winner.name)}の勝ち！`)
      setLog((prev) => [`${shortBattleName(result.winner.name)}の勝ち！`, ...prev])
      playVictory()
      fireBattleConfetti()
      const saveError = await saveBattleResult('dice', result)
      setSaveMessage(saveError)
      await onDone()
    })()
    return () => {
      cancelled = true
    }
  }, [left, onDone, right])

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
