import { AnimatePresence, motion } from 'framer-motion'

export type RuiTripleAttackEffectData = {
  id: string
  side: 'left' | 'right'
  attackerUrl: string
  attackerName: string
  hit: 0 | 1 | 2 | 3
  totalDamage: number
}

type Props = {
  effect: RuiTripleAttackEffectData
}

const EMBLEM = '/battle/20260718_triple-strike-emblem.png'

export default function RuiTripleAttackOverlay({ effect }: Props) {
  const direction = effect.side === 'left' ? 1 : -1
  const hitText = effect.hit === 0 ? 'READY' : `${effect.hit} HIT`

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[84] overflow-hidden bg-[#050014]/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="absolute inset-[-20%] bg-[conic-gradient(from_90deg_at_50%_50%,#09001f,#0e7490,#f0abfc,#facc15,#09001f)] opacity-45 blur-2xl"
        animate={{ rotate: [0, 18, -12, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 0.55, repeat: Infinity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.32),transparent_19%,rgba(8,1,35,.84)_63%)]" />

      {Array.from({ length: 14 }).map((_, index) => (
        <motion.span
          key={`${effect.id}-speed-${index}`}
          className="absolute left-1/2 top-1/2 h-1 rounded-full bg-gradient-to-r from-transparent via-white to-cyan-300 shadow-[0_0_14px_rgba(34,211,238,.95)]"
          style={{ width: `${120 + (index % 5) * 42}px`, rotate: `${index * 25.7}deg`, transformOrigin: '0 50%' }}
          initial={{ x: 0, scaleX: 0, opacity: 0 }}
          animate={{ x: (index % 2 === 0 ? 1 : -1) * 100, scaleX: [0, 1.7, 0.2], opacity: [0, 1, 0] }}
          transition={{ duration: 0.45, repeat: Infinity, delay: index * 0.025 }}
        />
      ))}

      <div className="absolute inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-20 text-center">
        <motion.img
          src={EMBLEM}
          alt=""
          className="mx-auto h-24 w-24 rounded-3xl border-2 border-white/80 object-cover shadow-[0_0_34px_rgba(250,204,21,.9)]"
          animate={{ rotate: [-3, 3, -3], scale: [1, 1.07, 1] }}
          transition={{ duration: 0.42, repeat: Infinity }}
        />
        <motion.p
          className="mt-2 text-[clamp(2rem,9vw,4.8rem)] font-black leading-none text-white [text-shadow:0_5px_0_#7e22ce,0_0_28px_#22d3ee,0_0_48px_#facc15]"
          initial={{ scale: 0.25, letterSpacing: '0.5em', opacity: 0 }}
          animate={{ scale: [0.25, 1.14, 1], letterSpacing: ['0.5em', '0.04em', '0.04em'], opacity: 1 }}
          transition={{ duration: 0.48, ease: 'backOut' }}
        >
          ガシガシガシ！
        </motion.p>
        <p className="mt-1 text-sm font-black tracking-[0.12em] text-yellow-200">ルイぴょんぴょん・3連続攻撃(れんぞくこうげき)</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${effect.id}-hit-${effect.hit}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[0.34, 0.22, 0.12].map((opacity, index) => (
            <motion.img
              key={`${effect.hit}-after-${index}`}
              src={effect.attackerUrl}
              alt=""
              className="absolute top-[39%] h-[min(46vw,250px)] w-[min(46vw,250px)] rounded-[2rem] border-2 border-white/60 bg-white/90 object-contain shadow-[0_0_42px_rgba(255,255,255,.9)]"
              style={{ [effect.side]: `${4 + index * 7}%`, opacity }}
              initial={{ x: -direction * (60 + index * 38), y: 100, rotate: -direction * 16, scale: 0.72 }}
              animate={{ x: direction * (90 + index * 34), y: [100, -48, 10], rotate: direction * 8, scale: [0.72, 1.12, 0.88] }}
              transition={{ duration: 0.42, delay: index * 0.035, ease: 'easeOut' }}
            />
          ))}
          <motion.img
            src={effect.attackerUrl}
            alt={effect.attackerName}
            className="absolute top-[38%] h-[min(50vw,280px)] w-[min(50vw,280px)] rounded-[2rem] border-4 border-yellow-100 bg-white object-contain shadow-[0_0_58px_rgba(250,204,21,.95),0_0_92px_rgba(34,211,238,.75)]"
            style={{ [effect.side]: '5%' }}
            initial={{ x: -direction * 160, y: 120, rotate: -direction * 22, scale: 0.6 }}
            animate={{ x: direction * (effect.hit === 0 ? 30 : 185), y: effect.hit === 0 ? [120, -72, 10] : [80, -85, 5], rotate: direction * 9, scale: [0.6, 1.18, 0.92] }}
            transition={{ duration: effect.hit === 0 ? 0.72 : 0.38, ease: 'backOut' }}
          />
          {effect.hit > 0 && (
            <motion.div
              className="absolute left-1/2 top-[56%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-[12px] border-white shadow-[0_0_36px_18px_rgba(250,204,21,.95),0_0_70px_32px_rgba(34,211,238,.72)]"
              initial={{ scale: 0.05, opacity: 1 }}
              animate={{ scale: [0.05, 1.2, 2.8], opacity: [1, 0.8, 0] }}
              transition={{ duration: 0.48, ease: 'easeOut' }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div
        key={`${effect.id}-badge-${effect.hit}`}
        className="absolute inset-x-0 bottom-[9dvh] z-30 text-center"
        initial={{ scale: 0.2, y: 30, opacity: 0, rotate: -6 }}
        animate={{ scale: [0.2, 1.25, 1], y: [30, -7, 0], opacity: 1, rotate: [-6, 2, 0] }}
        transition={{ duration: 0.36, ease: 'backOut' }}
      >
        <span className="inline-block rounded-full border-4 border-white bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-300 px-8 py-3 text-[clamp(2.4rem,13vw,6rem)] font-black leading-none text-white shadow-[0_0_42px_rgba(255,255,255,.92),0_9px_0_#4c1d95] [text-shadow:0_5px_0_#4c1d95]">
          {hitText}
        </span>
        {effect.totalDamage > 0 && <p className="mt-3 text-xl font-black text-yellow-100">合計(ごうけい) {effect.totalDamage} ダメージ</p>}
      </motion.div>

      <motion.div
        className="absolute inset-0 bg-white"
        key={`${effect.id}-flash-${effect.hit}`}
        animate={{ opacity: effect.hit === 0 ? [0, 0.22, 0] : [0.86, 0] }}
        transition={{ duration: effect.hit === 0 ? 0.52 : 0.24 }}
      />
    </motion.div>
  )
}
