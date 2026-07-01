import { motion } from 'framer-motion'

export type DiceThrowEffectData = {
  id: string
  side: 'left' | 'right'
  face: number | null
}

function Pips({ face }: { face: number }) {
  const layouts: Record<number, string[]> = {
    1: ['col-start-2 row-start-2'],
    2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
    3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
    4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    6: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
  }
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1 p-4">
      {layouts[face].map((position, index) => (
        <span
          key={`${face}-${index}`}
          className={`${position} rounded-full bg-zinc-950 shadow-[inset_0_2px_3px_rgba(255,255,255,.25)]`}
        />
      ))}
    </div>
  )
}

function CubeFace({
  face,
  transform,
}: {
  face: number
  transform: string
}) {
  return (
    <div
      className="absolute inset-0 rounded-[1.4rem] border-2 border-yellow-100 bg-gradient-to-br from-white via-yellow-50 to-amber-200 shadow-inner"
      style={{ transform }}
    >
      <Pips face={face} />
    </div>
  )
}

function DiceCube({ face }: { face: number | null }) {
  const shown = face ?? 1
  return (
    <div className="relative h-24 w-24 sm:h-28 sm:w-28" style={{ transformStyle: 'preserve-3d' }}>
      <CubeFace face={shown} transform="translateZ(48px)" />
      <CubeFace face={6} transform="rotateY(180deg) translateZ(48px)" />
      <CubeFace face={3} transform="rotateY(90deg) translateZ(48px)" />
      <CubeFace face={4} transform="rotateY(-90deg) translateZ(48px)" />
      <CubeFace face={5} transform="rotateX(90deg) translateZ(48px)" />
      <CubeFace face={2} transform="rotateX(-90deg) translateZ(48px)" />
      <div className="absolute -inset-2 rounded-[1.8rem] bg-yellow-200/20 blur-xl" />
    </div>
  )
}

export default function DiceThrowEffect({ effect }: { effect: DiceThrowEffectData }) {
  const direction = effect.side === 'left' ? 1 : -1
  const startX = effect.side === 'left' ? '-58vw' : '58vw'
  const settleX = '0vw'

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-30 grid place-items-center" style={{ perspective: 720 }}>
      <motion.div
        key={effect.id}
        initial={{ x: startX, y: 180, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 0.7 }}
        animate={{
          x: [startX, `${direction * -12}vw`, `${direction * 5}vw`, settleX],
          y: [190, -66, 44, -28, 0],
          rotateX: [0, 280, 540, 720, 720],
          rotateY: [0, direction * 240, direction * 520, direction * 720, direction * 720],
          rotateZ: [0, direction * -80, direction * 180, direction * 260, 0],
          scale: [0.72, 1.12, 0.9, 1.08, 1],
        }}
        transition={{ duration: 1.08, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          animate={effect.face ? { y: [0, -5, 0], scale: [1, 1.06, 1] } : { y: [0, -10, 0, -5, 0] }}
          transition={{ duration: effect.face ? 0.62 : 0.5, repeat: effect.face ? 0 : Infinity }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <DiceCube face={effect.face} />
          {effect.face && (
            <motion.div
              className="absolute -inset-10 rounded-full bg-yellow-200/40 blur-2xl"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0.65], scale: [0.7, 1.55, 1.2] }}
              transition={{ duration: 0.9 }}
            />
          )}
        </motion.div>
        <motion.div
          className="mx-auto mt-8 h-4 w-24 rounded-full bg-black/45 blur-md"
          animate={{ scaleX: [0.5, 1.25, 0.7, 1.05, 0.9], opacity: [0.25, 0.45, 0.35, 0.5, 0.4] }}
          transition={{ duration: 1.08, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  )
}
