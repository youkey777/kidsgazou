import { useEffect, useMemo, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import { calculateDiceDamage, calculateRpsDamage } from './character-rules'
import BattleStage from './effects/BattleStage'
import { fireBattleConfetti } from './effects/Confetti'
import VictoryOverlay from './effects/VictoryOverlay'
import { playDamage, playPunch, playVictory, playWhoosh } from './sounds'
import { type DamageEvent, makeEventId, shortBattleName } from './types'

type Props = {
  characters: ImageRecord[]
  ruiTeam?: ImageRecord[]
  mioTeam?: ImageRecord[]
  teamMode?: 'dice' | 'rps'
  onDone: () => Promise<void> | void
  onExit: () => void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function TeamBattle({ characters, ruiTeam: selectedRuiTeam, mioTeam: selectedMioTeam, teamMode = 'dice', onDone, onExit }: Props) {
  const ruiTeam = useMemo(
    () => selectedRuiTeam?.slice(0, 3) ?? characters.filter((character) => character.child === 'rui').slice(0, 3),
    [characters, selectedRuiTeam]
  )
  const mioTeam = useMemo(
    () => selectedMioTeam?.slice(0, 3) ?? characters.filter((character) => character.child === 'mio').slice(0, 3),
    [characters, selectedMioTeam]
  )
  const [leftIndex, setLeftIndex] = useState(0)
  const [rightIndex, setRightIndex] = useState(0)
  const [leftHp, setLeftHp] = useState(ruiTeam[0]?.hp ?? 1)
  const [rightHp, setRightHp] = useState(mioTeam[0]?.hp ?? 1)
  const [events, setEvents] = useState<DamageEvent[]>([])
  const [message, setMessage] = useState('3vs3 勝ち抜きスタート！')
  const [log, setLog] = useState<string[]>(['3vs3 勝ち抜きバトル！'])
  const [winnerTeam, setWinnerTeam] = useState<'rui' | 'mio' | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [winnerCharacter, setWinnerCharacter] = useState<ImageRecord | null>(null)

  const left = ruiTeam[leftIndex]
  const right = mioTeam[rightIndex]

  useEffect(() => {
    if (!left || !right || winnerTeam) return
    let cancelled = false
    ;(async () => {
      let currentLeftIndex = leftIndex
      let currentRightIndex = rightIndex
      let currentLeft = ruiTeam[currentLeftIndex]
      let currentRight = mioTeam[currentRightIndex]
      let currentLeftHp = currentLeft.hp
      let currentRightHp = currentRight.hp
      let leftTurn = currentLeft.spd >= currentRight.spd
      setLeftHp(currentLeftHp)
      setRightHp(currentRightHp)

      while (!cancelled && currentLeft && currentRight) {
        await sleep(800)
        const attacker = leftTurn ? currentLeft : currentRight
        const defender = leftTurn ? currentRight : currentLeft
        const hit =
          teamMode === 'dice'
            ? calculateDiceDamage(attacker, defender, Math.floor(Math.random() * 6) + 1)
            : Math.max(10, Math.floor(calculateRpsDamage(attacker, defender) * 0.82))
        playWhoosh()
        playPunch()
        playDamage()
        setMessage(`${shortBattleName(attacker.name)}の攻撃！ ${hit}ダメージ`)
        setEvents((prev) => [
          ...prev,
          { id: makeEventId(), target: leftTurn ? 'right' : 'left', amount: hit },
        ])

        if (leftTurn) {
          currentRightHp = Math.max(0, currentRightHp - hit)
          setRightHp(currentRightHp)
        } else {
          currentLeftHp = Math.max(0, currentLeftHp - hit)
          setLeftHp(currentLeftHp)
        }
        setLog((prev) => [`${shortBattleName(attacker.name)}: ${hit}ダメージ`, ...prev.slice(0, 6)])

        if (currentRightHp <= 0) {
          currentRightIndex += 1
          if (currentRightIndex >= mioTeam.length) {
            setWinnerTeam('rui')
            setWinnerCharacter(currentLeft)
            setMessage('ルイチーム勝利！')
            playVictory()
            fireBattleConfetti()
            setSaveMessage(
              await saveBattleResult('team', {
                winner: currentLeft,
                loser: currentRight,
                winnerTeam: 'rui',
              })
            )
            await onDone()
            return
          }
          currentRight = mioTeam[currentRightIndex]
          currentRightHp = currentRight.hp
          setRightIndex(currentRightIndex)
          setRightHp(currentRightHp)
          setMessage('ミオチーム次のキャラ登場！')
          setLog((prev) => ['ミオチーム次のキャラ登場！', ...prev.slice(0, 6)])
        }

        if (currentLeftHp <= 0) {
          currentLeftIndex += 1
          if (currentLeftIndex >= ruiTeam.length) {
            setWinnerTeam('mio')
            setWinnerCharacter(currentRight)
            setMessage('ミオチーム勝利！')
            playVictory()
            fireBattleConfetti()
            setSaveMessage(
              await saveBattleResult('team', {
                winner: currentRight,
                loser: currentLeft,
                winnerTeam: 'mio',
              })
            )
            await onDone()
            return
          }
          currentLeft = ruiTeam[currentLeftIndex]
          currentLeftHp = currentLeft.hp
          setLeftIndex(currentLeftIndex)
          setLeftHp(currentLeftHp)
          setMessage('ルイチーム次のキャラ登場！')
          setLog((prev) => ['ルイチーム次のキャラ登場！', ...prev.slice(0, 6)])
        }
        leftTurn = !leftTurn
      }
    })()
    return () => {
      cancelled = true
    }
  }, [left, leftIndex, mioTeam, onDone, right, rightIndex, ruiTeam, teamMode, winnerTeam])

  if (ruiTeam.length < 3 || mioTeam.length < 3) {
    return (
      <div className="rounded-3xl bg-white/90 p-5 text-center shadow-lg">
        <p className="text-xl font-black text-purple-800">3vs3には各チーム3キャラ必要だよ</p>
        <p className="mt-2 text-sm font-bold text-zinc-700">
          ルイ: {ruiTeam.length}/3、ミオ: {mioTeam.length}/3
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-zinc-900 p-2 text-center text-sm font-black text-amber-200">
          🦖 ルイ {leftIndex + 1}/3
        </div>
        <div className="rounded-2xl bg-pink-500 p-2 text-center text-sm font-black text-white">
          🌸 ミオ {rightIndex + 1}/3
        </div>
      </div>
      <BattleStage
        left={left}
        right={right}
        leftHp={leftHp}
        rightHp={rightHp}
        damageEvents={events}
        koSide={winnerTeam === 'rui' ? 'right' : winnerTeam === 'mio' ? 'left' : undefined}
        message={message}
      />
      {winnerTeam && winnerCharacter && (
        <VictoryOverlay
          winner={winnerCharacter}
          outcome="team"
          teamName={winnerTeam === 'rui' ? 'ルイチーム' : 'ミオチーム'}
          onNext={onExit}
        />
      )}
      {saveMessage && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{saveMessage}</p>}
      <div className="max-h-36 overflow-y-auto rounded-3xl bg-white/85 p-3">
        {log.map((item, index) => (
          <p key={`${item}-${index}`} className="text-sm font-bold text-zinc-800">{item}</p>
        ))}
      </div>
    </div>
  )
}
