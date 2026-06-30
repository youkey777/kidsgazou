import { useCallback, useEffect, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import { playDamage, playPunch, playVictory } from './sounds'
import { type DamageEvent, makeEventId, shortBattleName } from './types'

type Props = {
  left: ImageRecord
  right: ImageRecord
  onDone: () => Promise<void> | void
}

export default function TapBattle({ left, right, onDone }: Props) {
  const [leftHp, setLeftHp] = useState(left.hp)
  const [rightHp, setRightHp] = useState(right.hp)
  const [leftGauge, setLeftGauge] = useState(0)
  const [rightGauge, setRightGauge] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [message, setMessage] = useState('タップでゲージをためよう！')
  const [finished, setFinished] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const finish = useCallback(async (nextLeftHp: number, nextRightHp: number) => {
    if (finished) return
    const result =
      nextLeftHp >= nextRightHp ? { winner: left, loser: right } : { winner: right, loser: left }
    setFinished(true)
    setMessage(`${shortBattleName(result.winner.name)}の勝ち！`)
    playVictory()
    fireBattleConfetti()
    setSaveMessage(await saveBattleResult('tap', result))
    await onDone()
  }, [finished, left, onDone, right])

  const playerAttack = () => {
    if (finished) return
    setLeftGauge((value) => {
      const next = value + 1
      if (next >= 20) {
        const damage = Math.floor(left.atk * 1.5)
        const nextRightHp = Math.max(0, rightHp - damage)
        setRightHp(nextRightHp)
        setMessage(`${shortBattleName(left.name)}のタップ攻撃！ ${damage}ダメージ`)
        setEvents((prev) => [...prev, { id: makeEventId(), target: 'right', amount: damage }])
        playPunch()
        playDamage()
        if (nextRightHp <= 0) void finish(leftHp, nextRightHp)
        return 0
      }
      setMessage(`ゲージ ${next}/20`)
      return next
    })
  }

  useEffect(() => {
    if (finished) return
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          void finish(leftHp, rightHp)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [finish, finished, leftHp, rightHp])

  useEffect(() => {
    if (finished) return
    const cpuSpeed = Math.max(180, 900 - right.spd * 6)
    const timer = window.setInterval(() => {
      setRightGauge((value) => {
        const next = value + 1
        if (next >= 20) {
          const damage = Math.floor(right.atk * 1.5)
          const nextLeftHp = Math.max(0, leftHp - damage)
          setLeftHp(nextLeftHp)
          setMessage(`CPUの攻撃！ ${damage}ダメージ`)
          setEvents((prev) => [...prev, { id: makeEventId(), target: 'left', amount: damage }])
          playPunch()
          playDamage()
          if (nextLeftHp <= 0) void finish(nextLeftHp, rightHp)
          return 0
        }
        return next
      })
    }, cpuSpeed)
    return () => window.clearInterval(timer)
  }, [finish, finished, leftHp, right.atk, right.spd, rightHp])

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
        <p className="text-center text-2xl font-black text-purple-800">のこり {timeLeft}秒</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-black">
          <div>
            こちらゲージ
            <div className="mt-1 h-4 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full bg-cyan-500" style={{ width: `${(leftGauge / 20) * 100}%` }} />
            </div>
          </div>
          <div>
            CPUゲージ
            <div className="mt-1 h-4 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full bg-pink-500" style={{ width: `${(rightGauge / 20) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={playerAttack}
        disabled={finished}
        className="min-h-[28vh] w-full rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-500 text-4xl font-black text-zinc-900 shadow-2xl active:scale-95 disabled:opacity-50 sm:min-h-[260px]"
      >
        タップ！
      </button>
      {finished && <div className="rounded-3xl bg-yellow-300 p-3 text-center text-2xl font-black text-zinc-900">YOU WIN!</div>}
      {saveMessage && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{saveMessage}</p>}
    </div>
  )
}
