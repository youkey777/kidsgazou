import { AnimatePresence, motion } from 'framer-motion'
import { attributeMark } from '../character-rules'
import type { BattleCharacter, DamageEvent } from '../types'
import { hpPercent, starsForLevel } from '../types'
import AttackFlyEffect, { type AttackEffectData } from './AttackFlyEffect'
import DamageNumber from './DamageNumber'
import DiceThrowEffect, { type DiceThrowEffectData } from './DiceThrowEffect'

type Props = {
  left: BattleCharacter
  right: BattleCharacter
  leftHp: number
  rightHp: number
  damageEvents: DamageEvent[]
  activeSide?: 'left' | 'right'
  koSide?: 'left' | 'right'
  glowingSide?: 'left' | 'right'
  message?: string
  attackEffect?: AttackEffectData | null
  diceThrowEffect?: DiceThrowEffectData | null
}

function shortName(name: string) {
  return name.replace(/\.[^.]+$/, '').slice(0, 10) || 'キャラ'
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
      className={`relative min-w-0 rounded-[1.35rem] border-4 bg-white/95 p-2 shadow-2xl ${
        side === 'left' ? 'border-cyan-300' : 'border-pink-300'
      } ${glowing ? 'shadow-yellow-300 ring-4 ring-yellow-300' : ''}`}
      animate={
        ko
          ? { x: side === 'left' ? -260 : 260, rotate: side === 'left' ? -45 : 45, opacity: 0 }
          : active
            ? { x: [0, side === 'left' ? 10 : -10, 0], scale: [1, 1.035, 1] }
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
        className="h-[clamp(150px,45vw,250px)] w-full rounded-xl bg-zinc-100 object-contain"
        draggable={false}
      />
      <div className="mt-2 min-w-0">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-black text-zinc-900">
            {shortName(character.name)}
          </p>
          <span className="shrink-0 text-xs font-black text-yellow-500">{stars}</span>
        </div>
        <p className="truncate text-xs font-black text-purple-700">
          Lv.{character.level} / {attributeMark(character.species)} {character.species}
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
  message,
  attackEffect,
  diceThrowEffect,
}: Props) {
  return (
    <div
      data-testid="battle-stage"
      className="relative min-h-[560px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-indigo-900 p-2 shadow-2xl sm:min-h-[680px] sm:p-3"
      style={{
        backgroundImage: 'linear-gradient(rgba(88,28,135,.35),rgba(49,46,129,.55)), url(/battle/rich-battle-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.35),transparent_34%)]" />
      {message && (
        <motion.div
          key={message}
          className="relative z-20 mb-2 rounded-2xl bg-black/60 px-3 py-2 text-center text-sm font-black text-yellow-200 shadow-lg sm:text-base"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {message}
        </motion.div>
      )}
      <div className="relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)] items-center gap-2">
        <FighterCard
          character={left}
          hp={leftHp}
          side="left"
          active={activeSide === 'left'}
          ko={koSide === 'left'}
          glowing={glowingSide === 'left'}
        />
        <div className="rounded-full bg-black/55 px-2 py-2 text-center text-sm font-black text-yellow-300 shadow-lg sm:text-xl">
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
        {diceThrowEffect && <DiceThrowEffect key={diceThrowEffect.id} effect={diceThrowEffect} />}
        {attackEffect && <AttackFlyEffect key={attackEffect.id} effect={attackEffect} />}
        {damageEvents.map((event) => (
          <DamageNumber key={event.id} event={event} />
        ))}
      </AnimatePresence>
    </div>
  )
}
