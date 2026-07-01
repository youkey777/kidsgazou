import { AnimatePresence, motion } from 'framer-motion'
import { attributeMark } from '../character-rules'

export type CinematicAttack = {
  id: string
  name: string
  attribute: string
  die: 4 | 5 | 6
}

const BG_BY_DIE: Record<4 | 5 | 6, string> = {
  4: '/battle/ultimate4-cg.png',
  5: '/battle/ultimate5-cg.png',
  6: '/battle/ultimate6-cg.png',
}

const ATTRIBUTE_WASH: Record<string, string> = {
  ほのお: 'radial-gradient(circle at 50% 55%, rgba(251,146,60,.32), transparent 42%)',
  みず: 'radial-gradient(circle at 50% 55%, rgba(56,189,248,.28), transparent 42%)',
  かぜ: 'radial-gradient(circle at 50% 55%, rgba(134,239,172,.24), transparent 42%)',
  つち: 'radial-gradient(circle at 50% 55%, rgba(251,191,36,.22), transparent 42%)',
  ひかり: 'radial-gradient(circle at 50% 55%, rgba(254,240,138,.34), transparent 42%)',
  やみ: 'radial-gradient(circle at 50% 55%, rgba(168,85,247,.28), transparent 42%)',
  でんき: 'radial-gradient(circle at 50% 55%, rgba(250,204,21,.34), transparent 42%)',
  こおり: 'radial-gradient(circle at 50% 55%, rgba(165,243,252,.34), transparent 42%)',
  くさ: 'radial-gradient(circle at 50% 55%, rgba(74,222,128,.28), transparent 42%)',
  はがね: 'radial-gradient(circle at 50% 55%, rgba(203,213,225,.28), transparent 42%)',
  まほう: 'radial-gradient(circle at 50% 55%, rgba(240,171,252,.32), transparent 42%)',
  ドラゴン: 'radial-gradient(circle at 50% 55%, rgba(248,113,113,.3), transparent 42%)',
  ロボ: 'radial-gradient(circle at 50% 55%, rgba(34,211,238,.28), transparent 42%)',
  スター: 'radial-gradient(circle at 50% 55%, rgba(253,224,71,.34), transparent 42%)',
  ふしぎ: 'radial-gradient(circle at 50% 55%, rgba(196,181,253,.3), transparent 42%)',
}

function rankLabel(die: 4 | 5 | 6) {
  if (die === 6) return '一撃必殺(いちげきひっさつ)'
  if (die === 5) return '超必殺(ちょうひっさつ)'
  return '必殺(ひっさつ)'
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
            initial={{ scale: attack.die === 6 ? 1.28 : 1.14, opacity: 0.18 }}
            animate={{ scale: attack.die === 6 ? [1.28, 1.02, 1.16] : [1.14, 1.01, 1.06], opacity: [0.18, 0.72, 0.62] }}
            transition={{ duration: attack.die === 4 ? 0.95 : 1.24, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `${ATTRIBUTE_WASH[attack.attribute] ?? ATTRIBUTE_WASH.ふしぎ}, linear-gradient(rgba(0,0,0,.46),rgba(0,0,0,.42))`,
            }}
            animate={{ opacity: [0.52, 0.76, 0.6] }}
            transition={{ duration: 0.42, repeat: 3 }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 w-[min(88vw,520px)] -translate-x-1/2 -translate-y-1/2 text-center"
            initial={{ y: -36, scale: 0.82, opacity: 0 }}
            animate={{ y: 0, scale: [0.82, 1.12, 1], opacity: 1 }}
            transition={{ duration: 0.52, ease: 'backOut' }}
          >
            <p className="mx-auto inline-flex rounded-full bg-black/50 px-4 py-1 text-base font-black text-cyan-100 shadow-lg ring-1 ring-white/25">
              {rankLabel(attack.die)} / {attributeMark(attack.attribute)} {attack.attribute}
            </p>
            <p
              className="mt-3 max-h-[42vh] overflow-hidden rounded-[2rem] bg-black/64 px-4 py-4 text-[clamp(1.15rem,6.2vw,2.35rem)] font-black leading-[1.14] text-yellow-100 shadow-[0_0_26px_rgba(250,204,21,.55)] ring-2 ring-yellow-200/60"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-all', lineBreak: 'anywhere' }}
            >
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
