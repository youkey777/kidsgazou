import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { ImageRecord } from '../../db'
import { attributeMark } from '../character-rules'
import { playLevelUp, playVictory } from '../sounds'
import { shortBattleName } from '../types'

type Props = {
  winner: ImageRecord
  outcome: 'win' | 'lose' | 'team'
  teamName?: string
  onNext: () => void
}

function nextExp(character: ImageRecord) {
  const total = character.xp + 35
  const levelUps = Math.min(99 - character.level, Math.floor(total / 100))
  return {
    from: character.xp,
    to: total % 100,
    nextLevel: character.level + levelUps,
    levelUps,
  }
}

export default function VictoryOverlay({ winner, outcome, teamName, onNext }: Props) {
  const exp = nextExp(winner)

  useEffect(() => {
    playVictory()
    if (exp.levelUps > 0) window.setTimeout(playLevelUp, 900)
  }, [exp.levelUps])

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/78 p-4 text-white backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-[2.2rem] border-4 border-yellow-200 bg-gradient-to-br from-purple-950 via-fuchsia-900 to-indigo-950 p-4 text-center shadow-[0_0_60px_rgba(250,204,21,.75)]"
        initial={{ y: 80, scale: 0.68, rotate: -4 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 130, damping: 14 }}
      >
        <motion.div
          className="absolute -inset-20 bg-[conic-gradient(from_0deg,transparent,#fde047,transparent,#22d3ee,transparent,#f472b6,transparent)] opacity-65"
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative">
          <motion.p
            className={`text-5xl font-black tracking-wide drop-shadow-[0_5px_0_rgba(0,0,0,.45)] ${
              outcome === 'lose' ? 'text-sky-200' : 'text-yellow-200'
            }`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1.25, 0.95, 1], opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {outcome === 'lose' ? 'YOU LOSE' : 'YOU WIN'}
          </motion.p>
          {teamName && <p className="mt-1 text-xl font-black text-white">{teamName}</p>}
          <motion.img
            src={winner.url}
            alt={winner.name}
            className="mx-auto mt-4 h-52 w-52 rounded-[2rem] border-4 border-white bg-white object-contain shadow-[0_0_35px_rgba(255,255,255,.8)]"
            initial={{ y: 40, scale: 0.74 }}
            animate={{ y: [0, -8, 0], scale: 1 }}
            transition={{ duration: 1.4, repeat: Infinity, repeatType: 'reverse' }}
          />
          <h3 className="mt-3 truncate text-3xl font-black text-white">{shortBattleName(winner.name)}</h3>
          <p className="mt-1 text-base font-black text-yellow-100">
            Lv.{winner.level}
            {exp.levelUps > 0 ? ` → Lv.${exp.nextLevel}` : ''} / {attributeMark(winner.species)} {winner.species}
          </p>
          <div className="mt-4 rounded-2xl bg-black/55 p-3 ring-1 ring-white/20">
            <div className="mb-1 flex justify-between text-xs font-black text-cyan-100">
              <span>EXP</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                +35
              </motion.span>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-yellow-200 to-orange-400 shadow-[0_0_20px_rgba(250,204,21,.9)]"
                initial={{ width: `${exp.from}%` }}
                animate={{ width: `${exp.levelUps > 0 ? 100 : exp.to}%` }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
              />
            </div>
          </div>
          {exp.levelUps > 0 && (
            <motion.div
              className="mt-4 rounded-2xl bg-yellow-300 px-4 py-3 text-3xl font-black text-purple-950 shadow-[0_0_30px_rgba(250,204,21,.8)]"
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: [0, 1.18, 1], rotate: [0, 5, 0] }}
              transition={{ delay: 0.8, duration: 0.65 }}
            >
              LEVEL UP!
            </motion.div>
          )}
          <button
            type="button"
            onClick={onNext}
            className="mt-4 min-h-14 w-full rounded-2xl bg-white px-4 text-xl font-black text-purple-950 shadow-xl active:scale-95"
          >
            つぎへ
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
