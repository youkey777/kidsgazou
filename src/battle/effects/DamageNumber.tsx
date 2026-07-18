import { motion } from 'framer-motion'
import type { DamageEvent } from '../types'

type Props = {
  event: DamageEvent
}

export default function DamageNumber({ event }: Props) {
  const isCounter = event.scale === 'counter'
  const isTriple = event.scale === 'triple'
  const anchorStyle =
    event.target === 'left'
      ? ({ left: '36%', textAlign: 'left', top: isTriple ? `${17 + (event.comboIndex ?? 1) * 12}%` : '30%' } as const)
      : ({ right: '36%', textAlign: 'right', top: isTriple ? `${17 + (event.comboIndex ?? 1) * 12}%` : '30%' } as const)

  return (
    <motion.div
      className={`pointer-events-none absolute z-50 max-w-[48vw] whitespace-nowrap rounded-[1.4rem] px-3 py-1 text-[clamp(2.5rem,12vw,5.3rem)] font-black leading-none drop-shadow-[0_9px_0_rgba(0,0,0,0.64)] sm:text-8xl ${
        isTriple
          ? 'border-2 border-white bg-gradient-to-r from-cyan-400 via-white to-yellow-300 text-purple-950 shadow-[0_0_30px_rgba(34,211,238,.95),0_0_56px_rgba(250,204,21,.75)]'
          : isCounter
            ? 'bg-purple-950/55 text-yellow-200 ring-2 ring-yellow-200/80'
            : 'text-red-500'
      }`}
      style={anchorStyle}
      initial={{ y: isTriple ? 0 : 20, x: isTriple ? (event.target === 'left' ? 55 : -55) : 0, scale: 0.28, opacity: 0, rotate: -10 }}
      animate={isTriple
        ? { y: [12, -16, -28], x: [event.target === 'left' ? 55 : -55, 0, event.target === 'left' ? -18 : 18], scale: [0.38, 1.32, 0.96], opacity: [0, 1, 1, 0], rotate: [-10, 4, 0] }
        : { y: [-2, -54, -68], scale: [0.82, 1.2, 1.02], opacity: [0, 1, 1, 0], rotate: 5 }}
      transition={{ duration: isTriple ? 0.9 : isCounter ? 1.75 : 1.6, ease: 'easeOut' }}
    >
      {isTriple && <span className="mb-1 block text-[0.24em] tracking-[0.16em]">{event.comboIndex} HIT!</span>}
      {event.label ?? `-${event.amount}`}
    </motion.div>
  )
}
