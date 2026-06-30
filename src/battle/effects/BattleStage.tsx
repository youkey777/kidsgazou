import { AnimatePresence, motion } from 'framer-motion'
import type { BattleCharacter, DamageEvent } from '../types'
import { hpPercent, starsForLevel } from '../types'
import DamageNumber from './DamageNumber'

type Props = {
  left: BattleCharacter
  right: BattleCharacter
  leftHp: number
  rightHp: number
  damageEvents: DamageEvent[]
  activeSide?: 'left' | 'right'
  koSide?: 'left' | 'right'
  glowingSide?: 'left' | 'right'
}

function FighterCard({
  character,
  hp,
  side,
  active,
  ko,
  glowing,
}: {
  character: BattleCharacter
  hp: number
  side: 'left' | 'right'
  active: boolean
  ko: boolean
  glowing: boolean
}) {
  const stars = '★'.repeat(starsForLevel(character.level))

  return (
    <motion.div
      className={`relative flex-1 rounded-2xl border-4 bg-white/90 p-2 shadow-2xl ${
        side === 'left' ? 'border-cyan-300' : 'border-pink-300'
      } ${glowing ? 'shadow-yellow-300 ring-4 ring-yellow-300' : ''}`}
      animate={
        ko
          ? { x: side === 'left' ? -420 : 420, rotate: side === 'left' ? -80 : 80, opacity: 0 }
          : active
            ? { x: [0, side === 'left' ? 14 : -14, 0], scale: [1, 1.04, 1] }
            : { x: 0, scale: 1, rotate: 0, opacity: 1 }
      }
      transition={{ duration: ko ? 0.75 : 0.22 }}
    >
      {glowing && (
        <div className="absolute -inset-3 -z-10 rounded-3xl bg-yellow-300/70 blur-xl" />
      )}
      <img
        src={character.url}
        alt={character.name}
        className="aspect-square w-full rounded-xl object-cover"
        draggable={false}
      />
      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-black text-zinc-900">{character.name}</p>
          <span className="shrink-0 text-xs font-black text-yellow-500">{stars}</span>
        </div>
        <p className="text-xs font-bold text-purple-700">
          Lv.{character.level} / {character.species}
        </p>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-zinc-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500"
            animate={{ width: hpPercent(hp, character.hp) }}
          />
        </div>
        <p className="mt-1 text-center text-xs font-black text-zinc-700">
          HP {Math.max(0, Math.ceil(hp))}/{character.hp}
        </p>
      </div>
    </motion.div>
  )
}

export default function BattleStage({
  left,
  right,
  leftHp,
  rightHp,
  damageEvents,
  activeSide,
  koSide,
  glowingSide,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-fuchsia-600 to-indigo-900 p-3 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.35),transparent_34%)]" />
      <div className="relative z-10 flex items-center gap-3">
        <FighterCard
          character={left}
          hp={leftHp}
          side="left"
          active={activeSide === 'left'}
          ko={koSide === 'left'}
          glowing={glowingSide === 'left'}
        />
        <div className="shrink-0 rounded-full bg-black/45 px-3 py-2 text-xl font-black text-yellow-300 shadow-lg">
          VS
        </div>
        <FighterCard
          character={right}
          hp={rightHp}
          side="right"
          active={activeSide === 'right'}
          ko={koSide === 'right'}
          glowing={glowingSide === 'right'}
        />
      </div>
      <AnimatePresence>
        {damageEvents.map((event) => (
          <DamageNumber key={event.id} event={event} />
        ))}
      </AnimatePresence>
    </div>
  )
}
