import { AnimatePresence, motion } from 'framer-motion'
import { isKingKarubi } from '../battle-logic'
import { attributeMark } from '../character-rules'
import type { BattleCharacter, DamageEvent } from '../types'
import { hpPercent, starsForLevel } from '../types'
import AttackFlyEffect, { type AttackEffectData } from './AttackFlyEffect'
import DamageBurstOverlay from './DamageBurstOverlay'
import DamageNumber from './DamageNumber'
import DiceThrowEffect, { type DiceThrowEffectData } from './DiceThrowEffect'
import KingKarubiFeastEffect, { type KingKarubiFeastEffectData } from './KingKarubiFeastEffect'

export type DynamiteMarker = {
  id: string
  target: 'left' | 'right'
}

export type DynamiteExplosion = {
  id: string
  target: 'left' | 'right'
}

type Props = {
  left: BattleCharacter
  right: BattleCharacter
  leftHp: number
  rightHp: number
  damageEvents: DamageEvent[]
  activeSide?: 'left' | 'right'
  dodgeSide?: 'left' | 'right'
  confusedSide?: 'left' | 'right'
  hitSide?: 'left' | 'right'
  koSide?: 'left' | 'right'
  glowingSide?: 'left' | 'right'
  message?: string
  specialTitle?: string | null
  attackEffect?: AttackEffectData | null
  diceThrowEffect?: DiceThrowEffectData | null
  dynamites?: DynamiteMarker[]
  dynamiteExplosion?: DynamiteExplosion | null
  healingEffect?: KingKarubiFeastEffectData | null
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
  hit,
  ko,
  glowing,
  healing,
  dynamiteCount,
}: {
  character: BattleCharacter
  hp: number
  side: 'left' | 'right'
  active: boolean
  dodging: boolean
  confused: boolean
  hit: boolean
  ko: boolean
  glowing: boolean
  healing: boolean
  dynamiteCount: number
}) {
  const stars = '★'.repeat(starsForLevel(character.level))
  const hasKingKarubiFeast = isKingKarubi(character)

  return (
    <motion.div
      className={`relative min-w-0 rounded-[1.35rem] border-4 bg-white/95 p-2 shadow-2xl ${
        side === 'left' ? 'border-cyan-300' : 'border-pink-300'
      } ${glowing ? 'shadow-yellow-300 ring-4 ring-yellow-300' : ''}`}
      animate={
        ko
          ? { x: side === 'left' ? -260 : 260, rotate: side === 'left' ? -45 : 45, opacity: 0 }
          : hit
            ? {
                x: side === 'left' ? [0, -18, 12, -8, 0] : [0, 18, -12, 8, 0],
                y: [0, -8, 5, -3, 0],
                rotate: side === 'left' ? [0, -4, 3, -2, 0] : [0, 4, -3, 2, 0],
                scale: [1, 0.94, 1.05, 0.98, 1],
              }
          : healing
            ? {
                y: [0, -10, 2, -7, 0],
                rotate: [0, -2, 2, -1, 0],
                scale: [1, 1.08, 0.98, 1.06, 1],
              }
          : dodging
            ? { x: side === 'left' ? [-8, -58, -36] : [8, 58, 36], y: [0, -12, 0], rotate: side === 'left' ? [-2, -10, -4] : [2, 10, 4], scale: [1, 0.9, 0.94] }
          : active
            ? { x: [0, side === 'left' ? 10 : -10, 0], scale: [1, 1.035, 1] }
            : { x: 0, scale: 1, rotate: 0, opacity: 1 }
      }
      transition={{ duration: ko ? 0.75 : hit ? 0.56 : healing ? 1.35 : dodging ? 0.62 : 0.22 }}
    >
      {glowing && <div className="absolute -inset-3 -z-10 rounded-3xl bg-yellow-300/45 blur-xl" />}
      <AnimatePresence>
        {dynamiteCount > 0 && (
          <motion.div
            className={`pointer-events-none absolute ${side === 'left' ? '-right-3' : '-left-3'} top-16 z-40 flex flex-col items-center gap-1 rounded-2xl bg-black/60 px-1.5 py-2 shadow-[0_0_24px_rgba(248,113,113,.75)] ring-2 ring-red-300/80`}
            initial={{ scale: 0.2, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.2, y: 16, opacity: 0 }}
          >
            {Array.from({ length: Math.min(4, dynamiteCount) }).map((_, index) => (
              <motion.img
                key={`${character.id}-dynamite-${index}`}
                src="/battle/dynamite-3d.png"
                alt=""
                className="h-9 w-9 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.55)]"
                animate={{ rotate: [-3, 3, -3], scale: [1, 1.08, 1] }}
                transition={{ duration: 0.72 + index * 0.08, repeat: Infinity }}
              />
            ))}
            {dynamiteCount > 4 && (
              <span className="rounded-full bg-red-600 px-1.5 text-xs font-black text-white">
                x{dynamiteCount}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {hit && (
          <>
            <motion.div
              className="pointer-events-none absolute inset-0 z-30 rounded-[1.2rem] bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.34 }}
            />
            <motion.div
              className="pointer-events-none absolute inset-1 z-30 rounded-[1.2rem] border-4 border-red-400"
              initial={{ scale: 0.78, opacity: 0 }}
              animate={{ scale: [0.78, 1.18, 1.42], opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200/80 blur-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 2.1], opacity: [0, 0.95, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </>
        )}
      </AnimatePresence>
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
      {hasKingKarubiFeast && (
        <motion.div
          className="pointer-events-none absolute left-2 top-2 z-20 rounded-full border-2 border-yellow-100 bg-gradient-to-r from-red-800 to-amber-500 px-2 py-1 text-[10px] font-black leading-none text-white shadow-[0_0_14px_rgba(251,191,36,.85)]"
          animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 10px rgba(251,191,36,.6)', '0 0 20px rgba(251,191,36,1)', '0 0 10px rgba(251,191,36,.6)'] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          🍖 25% 全回復
        </motion.div>
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
  dodgeSide,
  confusedSide,
  hitSide,
  koSide,
  glowingSide,
  message,
  specialTitle,
  attackEffect,
  diceThrowEffect,
  dynamites = [],
  dynamiteExplosion,
  healingEffect,
}: Props) {
  const leftDynamites = dynamites.filter((item) => item.target === 'left').length
  const rightDynamites = dynamites.filter((item) => item.target === 'right').length

  return (
    <div
      data-testid="battle-stage"
      className="relative min-h-[500px] overflow-hidden rounded-[2rem] bg-slate-950 p-2 shadow-2xl sm:min-h-[620px] sm:p-3"
      style={{
        backgroundImage: 'linear-gradient(rgba(2,6,23,.62),rgba(2,6,23,.78)), url(/battle/rich-battle-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.16),transparent_38%)]" />
      <motion.div
        key={message || 'empty-message'}
        className={`hidden ${
          message ? 'bg-white/92 text-zinc-950 ring-2 ring-zinc-900/15' : 'bg-zinc-900/20 text-transparent'
        }`}
        initial={{ scale: 0.98, opacity: 0.75 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <span className="max-h-[3.2rem] overflow-hidden">{message || '　'}</span>
      </motion.div>
      <div className="relative z-10 mt-4 rounded-[1.8rem] border border-white/18 bg-black/46 p-2 shadow-[inset_0_0_34px_rgba(255,255,255,.08),0_16px_38px_rgba(0,0,0,.35)] backdrop-blur-[2px] sm:mt-5 sm:p-3">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)] items-center gap-2">
          <FighterCard
            character={left}
            hp={leftHp}
            side="left"
            active={activeSide === 'left'}
            dodging={dodgeSide === 'left'}
            confused={confusedSide === 'left'}
            hit={hitSide === 'left'}
            ko={koSide === 'left'}
            glowing={glowingSide === 'left' || healingEffect?.side === 'left'}
            healing={healingEffect?.side === 'left'}
            dynamiteCount={leftDynamites}
          />
          <div className="rounded-full bg-zinc-950 px-2 py-2 text-center text-sm font-black text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,.32)] ring-2 ring-yellow-200/30 sm:text-xl">
            VS
          </div>
          <FighterCard
            character={right}
            hp={rightHp}
            side="right"
            active={activeSide === 'right'}
            dodging={dodgeSide === 'right'}
            confused={confusedSide === 'right'}
            hit={hitSide === 'right'}
            ko={koSide === 'right'}
            glowing={glowingSide === 'right' || healingEffect?.side === 'right'}
            healing={healingEffect?.side === 'right'}
            dynamiteCount={rightDynamites}
          />
        </div>
      </div>
      <motion.div
        key={`below-${message || 'empty-message'}`}
        className={`relative z-20 mt-3 flex min-h-[4.4rem] items-center justify-center rounded-2xl px-3 py-2 text-center text-base font-black leading-snug shadow-[0_12px_24px_rgba(0,0,0,.32)] sm:text-lg ${
          message ? 'bg-white text-zinc-950 ring-2 ring-yellow-200/55' : 'bg-zinc-950/80 text-transparent ring-2 ring-white/15'
        }`}
        initial={{ scale: 0.98, opacity: 0.75 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <span className="max-h-[4.2rem] overflow-hidden">{message || '　'}</span>
      </motion.div>
      <AnimatePresence>
        {specialTitle && (
          <motion.div
            key={specialTitle}
            className="pointer-events-none fixed inset-0 z-[76] flex items-center justify-center bg-black/58 px-4 pt-[12dvh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="relative w-[min(92vw,520px)] overflow-hidden rounded-[2rem] border-4 border-yellow-200 bg-gradient-to-br from-purple-950 via-red-900 to-yellow-500 px-5 py-5 text-center text-[clamp(2.2rem,11vw,5rem)] font-black leading-tight text-white shadow-[0_0_46px_rgba(250,204,21,.95),0_14px_0_rgba(0,0,0,.48)] ring-4 ring-white/55"
              initial={{ scale: 0.36, rotate: -6, y: 34 }}
              animate={{ scale: [0.36, 1.16, 1], rotate: [-6, 2, 0], y: [34, -8, 0] }}
              transition={{ duration: 0.42, ease: 'backOut' }}
            >
              <motion.span
                className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/35 blur-sm"
                animate={{ x: ['0%', '420%'] }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
              <span className="relative z-10 block [text-shadow:0_4px_0_rgba(0,0,0,.65),0_0_18px_rgba(255,255,255,.45)]">
                {specialTitle}
              </span>
            </motion.div>
          </motion.div>
        )}
        {diceThrowEffect && <DiceThrowEffect key={diceThrowEffect.id} effect={diceThrowEffect} />}
        {attackEffect && <AttackFlyEffect key={attackEffect.id} effect={attackEffect} />}
        {healingEffect && <KingKarubiFeastEffect key={healingEffect.id} effect={healingEffect} />}
        {dynamiteExplosion && (
          <motion.div
            key={dynamiteExplosion.id}
            className="pointer-events-none fixed inset-0 z-[82] flex items-center justify-center overflow-hidden bg-black/68 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.95),rgba(251,146,60,.5)_28%,rgba(127,29,29,.55)_56%,transparent_78%)]"
              initial={{ scale: 0.25, opacity: 0 }}
              animate={{ scale: [0.25, 1.15, 1.8], opacity: [0, 1, 0] }}
              transition={{ duration: 1.25, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute top-[14dvh] rounded-full border-4 border-yellow-200 bg-red-700 px-7 py-3 text-[clamp(2.2rem,11vw,5.2rem)] font-black leading-none text-yellow-100 shadow-[0_0_48px_rgba(250,204,21,.9),0_10px_0_rgba(0,0,0,.45)] ring-4 ring-white/50"
              initial={{ scale: 0.4, rotate: -7, y: 20 }}
              animate={{ scale: [0.4, 1.16, 1], rotate: [-7, 3, 0], y: [20, -6, 0] }}
              transition={{ duration: 0.42, ease: 'backOut' }}
            >
              ダイナマイト
            </motion.div>
            <motion.img
              src="/battle/dynamite-explosion.png"
              alt=""
              className="relative z-10 h-[min(84vw,560px)] w-[min(84vw,560px)] object-contain drop-shadow-[0_0_34px_rgba(253,186,116,.95)]"
              initial={{ scale: 0.08, rotate: -18, opacity: 0 }}
              animate={{ scale: [0.08, 1.05, 1.22, 1.04], rotate: [-18, 8, -3, 0], opacity: [0, 1, 1, 0.94] }}
              transition={{ duration: 1.25, ease: 'easeOut' }}
            />
            {Array.from({ length: 12 }).map((_, index) => (
              <motion.span
                key={`spark-${dynamiteExplosion.id}-${index}`}
                className="absolute left-1/2 top-1/2 h-3 w-10 rounded-full bg-yellow-200 shadow-[0_0_16px_rgba(250,204,21,.9)]"
                initial={{ x: 0, y: 0, rotate: index * 30, opacity: 0 }}
                animate={{
                  x: Math.cos((index / 12) * Math.PI * 2) * 220,
                  y: Math.sin((index / 12) * Math.PI * 2) * 220,
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.4, 0.2],
                }}
                transition={{ duration: 1.05, delay: 0.12, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
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
