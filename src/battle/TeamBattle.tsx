import { useMemo, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import ComboBattle from './ComboBattle'
import VictoryOverlay from './effects/VictoryOverlay'

type Props = {
  characters: ImageRecord[]
  ruiTeam?: ImageRecord[]
  mioTeam?: ImageRecord[]
  onDone: () => Promise<void> | void
  onExit: () => void
}

export default function TeamBattle({ characters, ruiTeam: selectedRuiTeam, mioTeam: selectedMioTeam, onDone, onExit }: Props) {
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
  const [leftCarryHp, setLeftCarryHp] = useState<number | undefined>()
  const [rightCarryHp, setRightCarryHp] = useState<number | undefined>()
  const [matchKey, setMatchKey] = useState(1)
  const [winnerTeam, setWinnerTeam] = useState<'rui' | 'mio' | null>(null)
  const [winnerCharacter, setWinnerCharacter] = useState<ImageRecord | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const left = ruiTeam[leftIndex]
  const right = mioTeam[rightIndex]

  if (ruiTeam.length < 3 || mioTeam.length < 3) {
    return (
      <div className="rounded-3xl bg-white/90 p-5 text-center shadow-lg">
        <p className="text-xl font-black text-purple-800">3vs3には各(かく)チーム3キャラ必要(ひつよう)だよ</p>
        <p className="mt-2 text-sm font-bold text-zinc-700">
          ルイ: {ruiTeam.length}/3、ミオ: {mioTeam.length}/3
        </p>
      </div>
    )
  }

  if (winnerTeam && winnerCharacter) {
    return (
      <div className="space-y-3">
        <VictoryOverlay
          winner={winnerCharacter}
          outcome="team"
          teamName={winnerTeam === 'rui' ? 'ルイチーム' : 'ミオチーム'}
          onNext={onExit}
        />
        {saveMessage && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{saveMessage}</p>}
      </div>
    )
  }

  const finishRound = async (
    winner: ImageRecord,
    loser: ImageRecord,
    winnerSide: 'left' | 'right',
    finalHp: { left: number; right: number }
  ) => {
    const nextRightIndex = winnerSide === 'left' ? rightIndex + 1 : rightIndex
    const nextLeftIndex = winnerSide === 'right' ? leftIndex + 1 : leftIndex
    const ruiWon = winnerSide === 'left' && nextRightIndex >= mioTeam.length
    const mioWon = winnerSide === 'right' && nextLeftIndex >= ruiTeam.length

    if (ruiWon || mioWon) {
      const team = ruiWon ? 'rui' : 'mio'
      setWinnerTeam(team)
      setWinnerCharacter(winner)
      setSaveMessage(await saveBattleResult('team', { winner, loser, winnerTeam: team }))
      return
    }

    setSaveMessage(await saveBattleResult('combo', { winner, loser }))
    if (winnerSide === 'left') {
      setRightIndex(nextRightIndex)
      setLeftCarryHp(Math.max(1, finalHp.left))
      setRightCarryHp(undefined)
    } else {
      setLeftIndex(nextLeftIndex)
      setRightCarryHp(Math.max(1, finalHp.right))
      setLeftCarryHp(undefined)
    }
    setMatchKey((current) => current + 1)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-zinc-900 p-2 text-center text-sm font-black text-amber-200">
          ルイチーム {leftIndex + 1}/3
        </div>
        <div className="rounded-2xl bg-pink-500 p-2 text-center text-sm font-black text-white">
          ミオチーム {rightIndex + 1}/3
        </div>
      </div>
      <div className="rounded-2xl bg-white/92 p-3 text-center text-sm font-black text-purple-900 shadow">
        3vs3勝(か)ち抜(ぬ)き。今(いま)のキャラが倒(たお)れるまで戦(たたか)うよ。
      </div>
      <ComboBattle
        key={`${left.id}-${right.id}-${matchKey}`}
        left={left}
        right={right}
        initialLeftHp={leftCarryHp}
        initialRightHp={rightCarryHp}
        saveResult={false}
        onBattleEnd={finishRound}
        onDone={onDone}
        onExit={onExit}
      />
      {saveMessage && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{saveMessage}</p>}
    </div>
  )
}
