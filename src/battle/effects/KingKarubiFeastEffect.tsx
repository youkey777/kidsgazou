import { motion } from 'framer-motion'

export type KingKarubiFeastEffectData = {
  id: string
  side: 'left' | 'right'
}

type Props = {
  effect: KingKarubiFeastEffectData
}

export default function KingKarubiFeastEffect({ effect }: Props) {
  const targetX = effect.side === 'left' ? '-24vw' : '24vw'

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[88] flex items-center justify-center overflow-hidden bg-amber-950/48"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3.25, times: [0, 0.08, 0.88, 1] }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,240,138,.78),rgba(249,115,22,.3)_34%,transparent_70%)]"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.2, 1.75], opacity: [0, 0.9, 0] }}
        transition={{ duration: 3.05, times: [0, 0.42, 1], ease: 'easeOut' }}
      />

      <motion.div
        className="absolute top-[10dvh] rounded-full border-4 border-amber-100 bg-gradient-to-r from-red-800 via-amber-600 to-yellow-400 px-6 py-3 text-center text-[clamp(2rem,10vw,4.8rem)] font-black leading-none text-white shadow-[0_0_46px_rgba(251,191,36,.95),0_10px_0_rgba(69,26,3,.7)] ring-4 ring-white/60"
        initial={{ scale: 0.28, rotate: -7, y: 26, opacity: 0 }}
        animate={{ scale: [0.28, 1.14, 1], rotate: [-7, 3, 0], y: [26, -8, 0], opacity: 1 }}
        transition={{ duration: 0.46, ease: 'backOut' }}
      >
        王(おう)のごちそう！
      </motion.div>

      <motion.img
        src="/battle/king-karubi-feast-20260714.png"
        alt="王冠(おうかん)つきの焼(や)きカルビ"
        className="relative z-10 h-[min(78vw,520px)] w-[min(78vw,520px)] object-contain drop-shadow-[0_0_30px_rgba(251,191,36,.96)]"
        initial={{ x: 0, y: '36vh', scale: 0.18, rotate: -18, opacity: 0 }}
        animate={{
          x: [0, 0, 0, targetX, targetX],
          y: ['36vh', '2vh', '2vh', '9vh', '9vh'],
          scale: [0.18, 1.02, 0.92, 0.27, 0.08],
          rotate: [-18, 4, -3, effect.side === 'left' ? -11 : 11, 0],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{ duration: 2.35, times: [0, 0.24, 0.58, 0.84, 1], ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute left-4 right-4 top-[48%] z-20 rounded-full border-4 border-white bg-gradient-to-r from-emerald-500 to-lime-300 px-3 py-3 text-center text-[clamp(1.35rem,7vw,3.4rem)] font-black leading-tight text-white shadow-[0_0_42px_rgba(163,230,53,.95),0_8px_0_rgba(20,83,45,.7)] [text-shadow:0_3px_0_rgba(20,83,45,.65)]"
        initial={{ y: 60, scale: 0.15, opacity: 0 }}
        animate={{ y: 0, scale: [0.15, 1.14, 1], opacity: 1 }}
        transition={{ duration: 0.48, delay: 1.52, ease: 'backOut' }}
      >
        HP 全回復(ぜんかいふく)！
      </motion.div>

      {Array.from({ length: 14 }).map((_, index) => {
        const angle = (index / 14) * Math.PI * 2
        return (
          <motion.span
            key={`${effect.id}-heal-spark-${index}`}
            className="absolute left-1/2 top-1/2 z-10 h-3 w-3 rounded-full bg-yellow-200 shadow-[0_0_16px_rgba(253,224,71,1)]"
            initial={{ x: targetX, y: 42, scale: 0, opacity: 0 }}
            animate={{
              x: `calc(${targetX} + ${Math.cos(angle) * 150}px)`,
              y: 42 + Math.sin(angle) * 150,
              scale: [0, 1.8, 0],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 1.25, delay: 1.58 + (index % 3) * 0.04, ease: 'easeOut' }}
          />
        )
      })}
    </motion.div>
  )
}
