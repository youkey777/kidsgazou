import { AnimatePresence, motion } from 'framer-motion'
import { attributeMark } from '../character-rules'

export type CinematicAttack = {
  id: string
  name: string
  attribute: string
  die: 5 | 6
}

const BG_BY_DIE: Record<5 | 6, string> = {
  5: '/battle/ultimate5-cg.png',
  6: '/battle/ultimate6-cg.png',
}

export default function CinematicAttackOverlay({
  attack,
}: {
  attack: CinematicAttack | null
}) {
  return (
    <AnimatePresence>
      {attack && (
        <motion.div
          key={attack.id}
          className="pointer-events-none fixed inset-0 z-[70] overflow-hidden bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${BG_BY_DIE[attack.die]})` }}
            initial={{ scale: 1.18, opacity: 0.2 }}
            animate={{ scale: [1.18, 1.02, 1.08], opacity: [0.2, 1, 0.92] }}
            transition={{ duration: 1.35, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,255,255,.15),transparent_32%),linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.25))]"
            animate={{ opacity: [0.35, 0.7, 0.45] }}
            transition={{ duration: 0.42, repeat: 3 }}
          />
          <motion.div
            className="absolute left-1/2 top-[16%] w-[92vw] -translate-x-1/2 text-center"
            initial={{ y: -36, scale: 0.82, opacity: 0 }}
            animate={{ y: 0, scale: [0.82, 1.12, 1], opacity: 1 }}
            transition={{ duration: 0.52, ease: 'backOut' }}
          >
            <p className="text-lg font-black text-cyan-100 drop-shadow-[0_0_16px_rgba(34,211,238,.95)]">
              {attributeMark(attack.attribute)} {attack.attribute}
            </p>
            <p className="mt-2 rounded-[2rem] bg-black/55 px-4 py-3 text-4xl font-black leading-tight text-yellow-200 shadow-[0_0_36px_rgba(250,204,21,.75)] ring-2 ring-yellow-200/70 sm:text-5xl">
              {attack.name}
            </p>
          </motion.div>
          <motion.div
            className="absolute inset-x-0 top-1/2 h-2 bg-white"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 0], opacity: [0, 0.95, 0] }}
            transition={{ duration: 0.72, delay: 0.68 }}
          />
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0] }}
            transition={{ duration: 1.35, times: [0, 0.74, 0.84, 1] }}
          >
            <div className="h-full w-full bg-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
