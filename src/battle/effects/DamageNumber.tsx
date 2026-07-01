import { motion } from 'framer-motion'
import type { DamageEvent } from '../types'

type Props = {
  event: DamageEvent
}

export default function DamageNumber({ event }: Props) {
  return (
    <motion.div
      className={`pointer-events-none absolute top-[34%] z-40 -translate-x-1/2 text-7xl font-black drop-shadow-[0_8px_0_rgba(0,0,0,0.58)] sm:text-8xl ${
        event.target === 'left' ? 'left-[24%]' : 'left-[76%]'
      } ${event.label ? 'text-yellow-300' : 'text-red-500'}`}
      initial={{ y: 28, scale: 0.35, opacity: 0, rotate: -10 }}
      animate={{ y: [-4, -72, -92], scale: [0.9, 1.55, 1.22], opacity: [0, 1, 1, 0], rotate: 8 }}
      transition={{ duration: 1.55, ease: 'easeOut' }}
    >
      {event.label ?? `-${event.amount}`}
    </motion.div>
  )
}
