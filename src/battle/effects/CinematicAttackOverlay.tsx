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
  ほのお: 'radial-gradient(circle at 50% 55%, rgba(251,146,60,.22), transparent 42%)',
  みず: 'radial-gradient(circle at 50% 55%, rgba(56,189,248,.2), transparent 42%)',
  かぜ: 'radial-gradient(circle at 50% 55%, rgba(134,239,172,.18), transparent 42%)',
  つち: 'radial-gradient(circle at 50% 55%, rgba(251,191,36,.16), transparent 42%)',
  ひかり: 'radial-gradient(circle at 50% 55%, rgba(254,240,138,.24), transparent 42%)',
  やみ: 'radial-gradient(circle at 50% 55%, rgba(168,85,247,.2), transparent 42%)',
  でんき: 'radial-gradient(circle at 50% 55%, rgba(250,204,21,.24), transparent 42%)',
  こおり: 'radial-gradient(circle at 50% 55%, rgba(165,243,252,.24), transparent 42%)',
  くさ: 'radial-gradient(circle at 50% 55%, rgba(74,222,128,.2), transparent 42%)',
  はがね: 'radial-gradient(circle at 50% 55%, rgba(203,213,225,.2), transparent 42%)',
  まほう: 'radial-gradient(circle at 50% 55%, rgba(240,171,252,.24), transparent 42%)',
  ドラゴン: 'radial-gradient(circle at 50% 55%, rgba(248,113,113,.22), transparent 42%)',
  ロボ: 'radial-gradient(circle at 50% 55%, rgba(34,211,238,.2), transparent 42%)',
  スター: 'radial-gradient(circle at 50% 55%, rgba(253,224,71,.24), transparent 42%)',
  ふしぎ: 'radial-gradient(circle at 50% 55%, rgba(196,181,253,.22), transparent 42%)',
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
          className="pointer-events-none fixed inset-0 z-[70] h-[100dvh] w-[100dvw] overflow-hidden bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${BG_BY_DIE[attack.die]})` }}
            initial={{ scale: attack.die === 6 ? 1.2 : 1.1, opacity: 0.16 }}
            animate={{
              scale: attack.die === 6 ? [1.2, 1.02, 1.12] : [1.1, 1.01, 1.04],
              opacity: [0.16, 0.6, 0.5],
            }}
            transition={{ duration: attack.die === 4 ? 0.9 : 1.18, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `${ATTRIBUTE_WASH[attack.attribute] ?? ATTRIBUTE_WASH.ふしぎ}, linear-gradient(rgba(0,0,0,.52),rgba(0,0,0,.46))`,
            }}
            animate={{ opacity: [0.58, 0.72, 0.62] }}
            transition={{ duration: 0.42, repeat: 3 }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              paddingLeft: 'max(0.9rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.9rem, env(safe-area-inset-right))',
              paddingTop: 'max(1rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            <motion.div
              className="w-full max-w-[520px] text-center"
              initial={{ y: -28, scale: 0.82, opacity: 0 }}
              animate={{ y: 0, scale: [0.82, 1.08, 1], opacity: 1 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
            >
              <p className="mx-auto inline-flex max-w-full items-center justify-center rounded-full bg-black/58 px-3 py-1 text-[clamp(0.75rem,3.4vw,1rem)] font-black leading-tight text-cyan-100 shadow-lg ring-1 ring-white/25">
                <span className="truncate">
                  {rankLabel(attack.die)} / {attributeMark(attack.attribute)} {attack.attribute}
                </span>
              </p>
              <p
                className="mx-auto mt-3 max-h-[38dvh] w-full overflow-hidden rounded-[1.4rem] bg-black/68 px-3 py-3 text-[clamp(1.1rem,7.4vw,2.15rem)] font-black leading-[1.12] text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,.45)] ring-2 ring-yellow-200/55 sm:px-5 sm:py-4"
                style={{
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                }}
              >
                {attack.name}
              </p>
            </motion.div>
          </div>
          <motion.div
            className="absolute inset-x-0 top-1/2 h-2 bg-white"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 0], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.72, delay: 0.62 }}
          />
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0] }}
            transition={{ duration: 1.25, times: [0, 0.74, 0.84, 1] }}
          >
            <div className="h-full w-full bg-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
