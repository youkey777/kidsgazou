import { motion } from 'framer-motion'
import type { DamageEvent } from '../types'

type Props = {
  event: DamageEvent
}

export default function DamageNumber({ event }: Props) {
  const isCounter = event.scale === 'counter'
  const anchorStyle =
    event.target === 'left'
      ? ({ left: '43%', textAlign: 'left' } as const)
      : ({ right: '43%', textAlign: 'right' } as const)

  return (
    <motion.div
      className={`pointer-events-none absolute top-[30%] z-50 max-w-[44vw] whitespace-nowrap rounded-[1.4rem] px-3 py-1 text-[clamp(3rem,14vw,5.8rem)] font-black leading-none drop-shadow-[0_9px_0_rgba(0,0,0,0.64)] sm:text-8xl ${
        isCounter ? 'bg-purple-950/55 text-yellow-200 ring-2 ring-yellow-200/80' : 'text-red-500'
      }`}
      style={anchorStyle}
      initial={{ y: 20, scale: 0.28, opacity: 0, rotate: -10 }}
      animate={{ y: [-2, -54, -68], scale: [0.82, 1.2, 1.02], opacity: [0, 1, 1, 0], rotate: 5 }}
      transition={{ duration: isCounter ? 1.75 : 1.6, ease: 'easeOut' }}
    >
      {event.label ?? `-${event.amount}`}
    </motion.div>
  )
}
