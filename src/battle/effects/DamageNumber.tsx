import { motion } from 'framer-motion'
import type { DamageEvent } from '../types'

type Props = {
  event: DamageEvent
}

export default function DamageNumber({ event }: Props) {
  return (
    <motion.div
      className={`pointer-events-none absolute top-24 z-30 text-4xl font-black drop-shadow-[0_4px_0_rgba(0,0,0,0.45)] ${
        event.target === 'left' ? 'left-10' : 'right-10'
      } ${event.label ? 'text-yellow-300' : 'text-red-500'}`}
      initial={{ y: 16, scale: 0.5, opacity: 0, rotate: -8 }}
      animate={{ y: -70, scale: 1.35, opacity: [0, 1, 1, 0], rotate: 8 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
    >
      {event.label ?? `-${event.amount}`}
    </motion.div>
  )
}
