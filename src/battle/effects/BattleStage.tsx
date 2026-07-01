import { AnimatePresence, motion } from 'framer-motion'
import { attributeMark } from '../character-rules'
import type { BattleCharacter, DamageEvent } from '../types'
import { hpPercent, starsForLevel } from '../types'
import AttackFlyEffect, { type AttackEffectData } from './AttackFlyEffect'
import DamageBurstOverlay from './DamageBurstOverlay'
import DamageNumber from './DamageNumber'
import DiceThrowEffect, { type DiceThrowEffectData } from './DiceThrowEffect'

type Props = {
  left: BattleCharacter
  right: BattleCharacter
  leftHp: number
  rightHp: number
  damageEvents: DamageEvent[]
  activeSide?: 'left' | 'right'
  dodgeSide?: 'left' | 'right'
  confusedSide?: 'left' | 'right'
  koSide?: 'left' | 'right'
  glowingSide?: 'left' | 'right'
  message?: string
  specialTitle?: string | null
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
  dodging,
  confused,
  ko,
  glowing,
}: {
  character: BattleCharacter
  hp: number
  side: 'left' | 'right'
  active: boolean
  dodging: boolean
  confused: boolean
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
          : dodging
            ? { x: side === 'left' ? [-8, -58, -36] : [8, 58, 36], y: [0, -12, 0], rotate: side === 'left' ? [-2, -10, -4] : [2, 10, 4], scale: [1, 0.9, 0.94] }
          : active
            ? { x: [0, side === 'left' ? 10 : -10, 0], scale: [1, 1.035, 1] }
            : { x: 0, scale: 1, rotate: 0, opacity: 1 }
      }
      transition={{ duration: ko ? 0.75 : dodging ? 0.62 : 0.22 }}
    >
      {glowing && <div className="absolute -inset-3 -z-10 rounded-3xl bg-yellow-300/45 blur-xl" />}
      <AnimatePresence>
        {confused && (
          <motion.div
            className="pointer-events-none absolute -right-5 -top-7 z-20 h-24 w-24"
            initial={{ scale: 0.2, rotate: -45, opacity: 0 }}
            animate={{ scale: [0.2, 1.12, 1], rotate: [0, 12, -8, 0], opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.img
              src="/battle/attribute-attacks/confusion.png"
              alt=""
              className="h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(88,28,135,.7)]"
              animate={{ rotate: [0, 360], scale: [1, 1.12, 1] }}
              transition={{ duration: 1.0, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
  dodgeSide,
  confusedSide,
  koSide,
  glowingSide,
  message,
  specialTitle,
  attackEffect,
  diceThrowEffect,
}: Props) {
  return (
    <div
      data-testid="battle-stage"
      className="relative min-h-[560px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-100 via-white to-indigo-100 p-2 shadow-2xl sm:min-h-[680px] sm:p-3"
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.72),rgba(15,23,42,.32)), url(/battle/rich-battle-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.62),transparent_40%)]" />
      <motion.div
        key={message || 'empty-message'}
        className={`relative z-20 mb-2 flex min-h-[4.4rem] items-center justify-center rounded-2xl px-3 py-2 text-center text-base font-black leading-snug shadow-lg sm:text-lg ${
          message ? 'bg-white/92 text-zinc-950 ring-2 ring-zinc-900/15' : 'bg-zinc-900/20 text-transparent'
        }`}
        initial={{ scale: 0.98, opacity: 0.75 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <span className="max-h-[3.2rem] overflow-hidden">{message || '　'}</span>
      </motion.div>
      <div className="relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)] items-center gap-2">
        <FighterCard
          character={left}
          hp={leftHp}
          side="left"
          active={activeSide === 'left'}
          dodging={dodgeSide === 'left'}
          confused={confusedSide === 'left'}
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
          dodging={dodgeSide === 'right'}
          confused={confusedSide === 'right'}
          ko={koSide === 'right'}
          glowing={glowingSide === 'right'}
        />
      </div>
      <AnimatePresence>
        {specialTitle && (
          <motion.div
            key={specialTitle}
            className="pointer-events-none fixed inset-0 z-[76] grid h-[100dvh] w-[100dvw] place-items-center bg-black/42 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="grid aspect-square w-[min(82vw,420px)] place-items-center rounded-full bg-gradient-to-br from-yellow-200 via-orange-300 to-red-500 px-6 text-center text-[clamp(2.2rem,12vw,5.8rem)] font-black leading-tight text-zinc-950 shadow-[0_0_44px_rgba(250,204,21,.85)] ring-8 ring-white"
              initial={{ scale: 0.18, rotate: -7, y: 40 }}
              animate={{ scale: [0.18, 1.2, 1], rotate: [-7, 3, 0], y: [40, -6, 0] }}
              transition={{ duration: 0.42, ease: 'backOut' }}
            >
              <span className="rounded-[1.2rem] bg-white/82 px-3 py-2 shadow-xl">{specialTitle}</span>
            </motion.div>
          </motion.div>
        )}
        {diceThrowEffect && <DiceThrowEffect key={diceThrowEffect.id} effect={diceThrowEffect} />}
        {attackEffect && <AttackFlyEffect key={attackEffect.id} effect={attackEffect} />}
        {damageEvents
          .filter((event) => event.scale !== 'ultimate')
          .map((event) => (
            <DamageNumber key={event.id} event={event} />
          ))}
        {damageEvents
          .filter((event) => event.scale === 'ultimate')
          .map((event) => (
            <DamageBurstOverlay key={event.id} event={event} />
          ))}
      </AnimatePresence>
    </div>
  )
}
