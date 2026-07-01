import { motion } from 'framer-motion'
import type { DamageEvent } from '../types'

type Props = {
  event: DamageEvent
}

export default function DamageBurstOverlay({ event }: Props) {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[82] grid h-[100dvh] w-[100dvw] place-items-center overflow-hidden bg-black/28 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.75, times: [0, 0.12, 0.78, 1] }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,.42),transparent_34%),radial-gradient(circle_at_35%_40%,rgba(255,255,255,.38),transparent_18%)]"
        animate={{ scale: [0.8, 1.25], rotate: [0, 8], opacity: [0.2, 0.8, 0] }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />
      <motion.div
        className="relative max-w-[94vw] text-center font-black leading-none text-yellow-100 drop-shadow-[0_12px_0_rgba(0,0,0,.7)]"
        initial={{ scale: 0.18, y: 60, rotate: -8 }}
        animate={{ scale: [0.18, 1.2, 0.98], y: [60, -8, 0], rotate: [-8, 3, 0] }}
        transition={{ duration: 0.5, ease: 'backOut' }}
      >
        <div className="text-[clamp(5rem,30vw,13rem)] tracking-tight">
          {event.amount}
        </div>
        <div className="mt-1 rounded-full bg-black/70 px-5 py-2 text-[clamp(1rem,6vw,2.2rem)] text-white ring-2 ring-yellow-200/80">
          DAMAGE!
        </div>
      </motion.div>
    </motion.div>
  )
}
