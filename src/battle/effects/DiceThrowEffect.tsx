import { motion } from 'framer-motion'

export type DiceThrowEffectData = {
  id: string
  side: 'left' | 'right'
  face: number | null
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function DiceFace({ face }: { face: number | null }) {
  return (
    <div className="grid h-20 w-20 grid-cols-3 grid-rows-3 gap-1.5 rounded-3xl bg-white p-4 shadow-[0_0_26px_rgba(255,255,255,.9)] ring-4 ring-yellow-200 sm:h-24 sm:w-24">
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className={`rounded-full ${face && PIPS[face].includes(index) ? 'bg-zinc-950' : 'bg-transparent'}`}
        />
      ))}
    </div>
  )
}

export default function DiceThrowEffect({ effect }: { effect: DiceThrowEffectData }) {
  const direction = effect.side === 'left' ? 1 : -1
  const startX = effect.side === 'left' ? '-58vw' : '58vw'
  const settleX = effect.side === 'left' ? '-17vw' : '17vw'

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
      <motion.div
        key={effect.id}
        initial={{ x: startX, y: 180, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 0.7 }}
        animate={{
          x: [startX, `${direction * -12}vw`, `${direction * 5}vw`, settleX],
          y: [190, -66, 44, -28, 0],
          rotateX: [0, 280, 540, 720, 900],
          rotateY: [0, direction * 240, direction * 520, direction * 780, direction * 960],
          rotateZ: [0, direction * -80, direction * 180, direction * 420, direction * 540],
          scale: [0.72, 1.1, 0.9, 1.05, 1],
        }}
        transition={{ duration: 1.08, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          animate={{ y: [0, -8, 0, -4, 0] }}
          transition={{ duration: 0.42, repeat: Infinity }}
        >
          <DiceFace face={effect.face} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
