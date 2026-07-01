import { useEffect, useRef, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import { calculateDiceDamage } from './character-rules'
import type { AttackEffectData } from './effects/AttackFlyEffect'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import type { DiceThrowEffectData } from './effects/DiceThrowEffect'
import VictoryOverlay from './effects/VictoryOverlay'
import { playDamage, playDiceLand, playDiceRoll, playPunch, playUltimate, playVictory, playWhoosh } from './sounds'
import { type BattleResult, type DamageEvent, makeEventId, shortBattleName } from './types'

type Props = {
  left: ImageRecord
  right: ImageRecord
  onDone: () => Promise<void> | void
  onExit: () => void
}

type DiceSide = 'left' | 'right'
type Phase = 'ready' | 'rolling' | 'attacking' | 'finished'

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

export default function DiceBattle({ left, right, onDone, onExit }: Props) {
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
      ? ''
      : ''
  )
  const [turnSide, setTurnSide] = useState<DiceSide>(firstSide)
  const [phase, setPhase] = useState<Phase>('ready')
  const [turnCount, setTurnCount] = useState(1)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [attackEffect, setAttackEffect] = useState<AttackEffectData | null>(null)
  const [diceThrowEffect, setDiceThrowEffect] = useState<DiceThrowEffectData | null>(null)
  const [victory, setVictory] = useState<BattleResult | null>(null)

  const finish = async (leftCurrent: number, rightCurrent: number) => {
    if (doneRef.current) return
    doneRef.current = true
    const result: BattleResult =
      leftCurrent >= rightCurrent ? { winner: left, loser: right } : { winner: right, loser: left }
    const loserSide = result.winner.id === left.id ? 'right' : 'left'
    setPhase('finished')
    setKoSide(loserSide)
    setMessage(`${shortBattleName(result.winner.name)} の勝（か）ち！`)
    playVictory()
    fireBattleConfetti()
    setVictory(result)
    setSaveMessage(await saveBattleResult('dice', result))
    await onDone()
  }

  const runTurn = async (side: DiceSide) => {
    if (busyRef.current || doneRef.current || phase === 'finished') return
    busyRef.current = true
    setPhase('rolling')
    setActiveSide(undefined)
    setAttackEffect(null)
    const throwId = makeEventId()
    setDiceThrowEffect({ id: throwId, side, face: null })
    const attacker = side === 'left' ? left : right
    const defender = side === 'left' ? right : left
    const target: DiceSide = side === 'left' ? 'right' : 'left'
    const attackerName = shortBattleName(attacker.name)

    setMessage('')
    playDiceRoll()
    for (let i = 0; i < 10; i++) {
      const preview = rollDie()
      setDiceThrowEffect({ id: throwId, side, face: preview })
      await sleep(70 + i * 8)
    }

    const die = rollDie()
    setDiceThrowEffect({ id: throwId, side, face: die })
    playDiceLand()
    setMessage(`出目(でめ) ${die}`)
    await sleep(1800)

    const attackName = die === 6 ? attacker.ultimateName : DICE_ATTACKS[die - 1]
    setPhase('attacking')
    setActiveSide(side)
    setAttackEffect({
      id: makeEventId(),
      side,
      kind: 'dice',
      attribute: attacker.species,
      variant: die,
      symbol: String(die),
      label: `${attacker.species}・${attackName}`,
    })
    setDiceThrowEffect(null)
    setMessage(`${attackName}`)
    playWhoosh()
    if (die === 6) playUltimate()
    else playPunch()
    await sleep(1200)

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
    setMessage(`${attackerName} の攻撃（こうげき）！ ${damage}ダメージ！`)
    await sleep(1500)
    setAttackEffect(null)
    setDiceThrowEffect(null)
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
        ? ''
        : ''
    )
    busyRef.current = false
  }

  useEffect(() => {
    if (turnSide !== 'right' || phase !== 'ready' || doneRef.current) return
    const timer = window.setTimeout(() => {
      void runTurn('right')
    }, 1200)
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
        diceThrowEffect={diceThrowEffect}
      />

      <button
        type="button"
        disabled={phase !== 'ready' || turnSide !== 'left'}
        onClick={() => void runTurn('left')}
        className="min-h-14 w-full rounded-3xl bg-yellow-300 px-5 py-3 text-xl font-black text-zinc-950 shadow-xl transition active:scale-95 disabled:bg-white/45 disabled:text-white/70"
      >
        サイコロをふる
      </button>

      {victory && <VictoryOverlay winner={victory.winner} outcome={victory.winner.id === left.id ? 'win' : 'lose'} onNext={onExit} />}
      {saveMessage && (
        <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">
          {saveMessage}
        </p>
      )}
    </div>
  )
}
