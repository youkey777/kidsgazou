import { useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import UltimateCutIn from './effects/UltimateCutIn'
import { playDamage, playPunch, playUltimate, playVictory } from './sounds'
import { type DamageEvent, type TurnAction, makeEventId } from './types'

type Props = {
  left: ImageRecord
  right: ImageRecord
  onDone: () => Promise<void> | void
}

function actionDamage(attacker: ImageRecord, defender: ImageRecord, multiplier: number) {
  return Math.max(1, Math.floor(attacker.atk * multiplier - defender.def / 2))
}

export default function TurnBattle({ left, right, onDone }: Props) {
  const [leftHp, setLeftHp] = useState(left.hp)
  const [rightHp, setRightHp] = useState(right.hp)
  const [turn, setTurn] = useState(1)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [log, setLog] = useState<string[]>(['ターン制バトル開始！'])
  const [finished, setFinished] = useState(false)
  const [ultimate, setUltimate] = useState<ImageRecord | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const finish = async (winner: ImageRecord, loser: ImageRecord) => {
    setFinished(true)
    playVictory()
    fireBattleConfetti()
    setLog((prev) => [`${winner.name} の勝ち！`, ...prev])
    setSaveMessage(await saveBattleResult('turn', { winner, loser }))
    await onDone()
  }

  const cpuAction = () => {
    const roll = Math.random()
    if (turn % 3 === 0 && roll < 0.35) return 'ultimate'
    if (roll < 0.72) return 'attack'
    if (roll < 0.92) return 'guard'
    return 'attack'
  }

  const performAction = async (action: TurnAction) => {
    if (finished) return
    if (action === 'run') {
      await finish(right, left)
      return
    }

    let nextLeftHp = leftHp
    let nextRightHp = rightHp
    const playerGuard = action === 'guard'
    if (action === 'attack' || action === 'ultimate') {
      const multiplier = action === 'ultimate' && turn % 3 === 0 ? 2.5 : 1
      const damage = actionDamage(left, right, multiplier)
      if (action === 'ultimate') {
        setUltimate(left)
        playUltimate()
        setTimeout(() => setUltimate(null), 950)
      } else {
        playPunch()
      }
      playDamage()
      nextRightHp = Math.max(0, rightHp - damage)
      setRightHp(nextRightHp)
      setEvents((prev) => [...prev, { id: makeEventId(), target: 'right', amount: damage }])
      setLog((prev) => [
        `${left.name} の${action === 'ultimate' ? left.ultimateName : 'こうげき'}！ ${damage} ダメージ`,
        ...prev.slice(0, 7),
      ])
    } else {
      setLog((prev) => [`${left.name} はまもりをかためた！`, ...prev.slice(0, 7)])
    }

    if (nextRightHp <= 0) {
      await finish(left, right)
      return
    }

    const enemy = cpuAction()
    if (enemy === 'guard') {
      setLog((prev) => [`${right.name} はまもった！`, ...prev.slice(0, 7)])
    } else {
      const multiplier = enemy === 'ultimate' ? 2.5 : 1
      const rawDamage = actionDamage(right, left, multiplier)
      const damage = playerGuard ? Math.max(1, Math.floor(rawDamage * 0.5)) : rawDamage
      if (enemy === 'ultimate') {
        setUltimate(right)
        playUltimate()
        setTimeout(() => setUltimate(null), 950)
      } else {
        playPunch()
      }
      playDamage()
      nextLeftHp = Math.max(0, nextLeftHp - damage)
      setLeftHp(nextLeftHp)
      setEvents((prev) => [...prev, { id: makeEventId(), target: 'left', amount: damage }])
      setLog((prev) => [
        `${right.name} の${enemy === 'ultimate' ? right.ultimateName : 'こうげき'}！ ${damage} ダメージ`,
        ...prev.slice(0, 7),
      ])
    }

    if (nextLeftHp <= 0) {
      await finish(right, left)
    } else {
      setTurn((value) => value + 1)
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
        koSide={finished ? (leftHp > 0 ? 'right' : 'left') : undefined}
        glowingSide={ultimate?.id === left.id ? 'left' : ultimate?.id === right.id ? 'right' : undefined}
      />
      <UltimateCutIn character={ultimate} />
      <div className="rounded-3xl bg-white/90 p-3 shadow-lg">
        <p className="mb-2 text-center text-lg font-black text-purple-800">
          ターン {turn} {turn % 3 === 0 ? ' / ひっさつOK!' : ''}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => void performAction('attack')} disabled={finished} className="min-h-14 rounded-2xl bg-red-500 font-black text-white shadow-lg disabled:opacity-50">たたかう</button>
          <button onClick={() => void performAction('ultimate')} disabled={finished || turn % 3 !== 0} className="min-h-14 rounded-2xl bg-yellow-400 font-black text-zinc-900 shadow-lg disabled:opacity-40">ひっさつわざ</button>
          <button onClick={() => void performAction('guard')} disabled={finished} className="min-h-14 rounded-2xl bg-cyan-500 font-black text-white shadow-lg disabled:opacity-50">まもる</button>
          <button onClick={() => void performAction('run')} disabled={finished} className="min-h-14 rounded-2xl bg-zinc-700 font-black text-white shadow-lg disabled:opacity-50">にげる</button>
        </div>
      </div>
      {saveMessage && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{saveMessage}</p>}
      <div className="max-h-48 overflow-y-auto rounded-3xl bg-white/85 p-3">
        {log.map((item, index) => (
          <p key={`${item}-${index}`} className="text-sm font-bold text-zinc-800">{item}</p>
        ))}
      </div>
    </div>
  )
}
