import { useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import { playDamage, playPunch, playVictory } from './sounds'
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
}

const HANDS: RpsHand[] = ['rock', 'scissors', 'paper']

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

export default function RpsBattle({ left, right, onDone }: Props) {
  const [leftHp, setLeftHp] = useState(left.hp)
  const [rightHp, setRightHp] = useState(right.hp)
  const [round, setRound] = useState(1)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [message, setMessage] = useState('じゃんけんを選んでね')
  const [log, setLog] = useState<string[]>(['5ラウンドじゃんけん！'])
  const [finished, setFinished] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const finish = async (nextLeftHp: number, nextRightHp: number) => {
    const result =
      nextLeftHp >= nextRightHp ? { winner: left, loser: right } : { winner: right, loser: left }
    setFinished(true)
    playVictory()
    fireBattleConfetti()
    setMessage(`${shortBattleName(result.winner.name)}の勝ち！`)
    setLog((prev) => [`${shortBattleName(result.winner.name)}の勝ち！`, ...prev])
    setSaveMessage(await saveBattleResult('rps', result))
    await onDone()
  }

  const choose = async (hand: RpsHand) => {
    if (finished) return
    const cpu = HANDS[Math.floor(Math.random() * HANDS.length)]
    const result = judge(hand, cpu)
    setLog((prev) => [
      `R${round}: ${HAND_LABELS[hand]} vs ${HAND_LABELS[cpu]}`,
      ...prev.slice(0, 5),
    ])
    if (result === 0) {
      setMessage(`あいこ！ ${HAND_LABELS[hand]} vs ${HAND_LABELS[cpu]}`)
      setEvents((prev) => [...prev, { id: makeEventId(), target: 'left', amount: 0, label: 'あいこ' }])
      return
    }

    playPunch()
    playDamage()
    let nextLeftHp = leftHp
    let nextRightHp = rightHp
    if (result > 0) {
      const damage = left.atk * 2
      nextRightHp = Math.max(0, rightHp - damage)
      setRightHp(nextRightHp)
      setMessage(`${HAND_LABELS[hand]}の勝ち！ ${damage}ダメージ`)
      setEvents((prev) => [...prev, { id: makeEventId(), target: 'right', amount: damage }])
    } else {
      const damage = right.atk * 2
      nextLeftHp = Math.max(0, leftHp - damage)
      setLeftHp(nextLeftHp)
      setMessage(`CPUの勝ち！ ${damage}ダメージ`)
      setEvents((prev) => [...prev, { id: makeEventId(), target: 'left', amount: damage }])
    }

    const nextRound = round + 1
    setRound(nextRound)
    if (nextRound > 5 || nextLeftHp <= 0 || nextRightHp <= 0) {
      await finish(nextLeftHp, nextRightHp)
    }
  }

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
      />
      <div className="rounded-3xl bg-white/90 p-3 shadow-lg">
        <p className="mb-2 text-center text-lg font-black text-purple-800">
          ラウンド {Math.min(round, 5)} / 5
        </p>
        <div className="grid grid-cols-3 gap-2">
          {HANDS.map((hand) => (
            <button
              key={hand}
              disabled={finished}
              onClick={() => void choose(hand)}
              className="min-h-14 rounded-2xl bg-purple-600 text-lg font-black text-white shadow-lg disabled:opacity-50"
            >
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
