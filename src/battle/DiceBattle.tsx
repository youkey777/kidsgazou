import { useEffect, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import { playDamage, playPunch, playVictory } from './sounds'
import { type BattleResult, type DamageEvent, makeEventId, shortBattleName } from './types'

type Props = {
  left: ImageRecord
  right: ImageRecord
  onDone: () => Promise<void> | void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function calcDamage(attacker: ImageRecord, defender: ImageRecord) {
  const attack = Math.floor(attacker.atk * (0.75 + Math.random() * 0.5))
  return Math.max(1, Math.floor(attack - defender.def / 2))
}

export default function DiceBattle({ left, right, onDone }: Props) {
  const [leftHp, setLeftHp] = useState(left.hp)
  const [rightHp, setRightHp] = useState(right.hp)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [activeSide, setActiveSide] = useState<'left' | 'right' | undefined>()
  const [koSide, setKoSide] = useState<'left' | 'right' | undefined>()
  const [message, setMessage] = useState('すばやい方からスタート！')
  const [log, setLog] = useState<string[]>(['ダイスバトル開始！'])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let leftCurrent = left.hp
      let rightCurrent = right.hp
      let leftTurn = left.spd >= right.spd
      await sleep(700)

      while (!cancelled && leftCurrent > 0 && rightCurrent > 0) {
        const attacker = leftTurn ? left : right
        const defender = leftTurn ? right : left
        const damage = calcDamage(attacker, defender)
        const target = leftTurn ? 'right' : 'left'
        const attackerSide = leftTurn ? 'left' : 'right'
        const text = `${shortBattleName(attacker.name)}の攻撃！ ${damage}ダメージ`
        setActiveSide(attackerSide)
        setMessage(text)
        playPunch()
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
          `${shortBattleName(attacker.name)} → ${shortBattleName(defender.name)}: ${damage}ダメージ`,
          ...prev.slice(0, 4),
        ])
        await sleep(1000)
        leftTurn = !leftTurn
      }

      if (cancelled) return
      const result: BattleResult =
        leftCurrent > 0 ? { winner: left, loser: right } : { winner: right, loser: left }
      setKoSide(leftCurrent > 0 ? 'right' : 'left')
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
