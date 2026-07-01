import { motion } from 'framer-motion'
import type { DamageEvent } from '../types'

type Props = {
  event: DamageEvent
}

export default function DamageNumber({ event }: Props) {
  const isCounter = event.scale === 'counter'
  const left = event.target === 'left' ? '30%' : '62%'
  return (
    <motion.div
      className={`pointer-events-none absolute top-[31%] z-50 -translate-x-1/2 whitespace-nowrap rounded-[1.4rem] px-3 py-1 text-center text-[clamp(3.6rem,18vw,6.8rem)] font-black leading-none drop-shadow-[0_9px_0_rgba(0,0,0,0.64)] sm:text-8xl ${
        isCounter ? 'bg-purple-950/55 text-yellow-200 ring-2 ring-yellow-200/80' : 'text-red-500'
      }`}
      style={{ left }}
      initial={{ y: 20, scale: 0.28, opacity: 0, rotate: -10 }}
      animate={{ y: [-2, -58, -70], scale: [0.82, 1.3, 1.08], opacity: [0, 1, 1, 0], rotate: 5 }}
      transition={{ duration: isCounter ? 1.75 : 1.6, ease: 'easeOut' }}
    >
      {event.label ?? `-${event.amount}`}
    </motion.div>
  )
}
