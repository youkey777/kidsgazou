import { AnimatePresence, motion } from 'framer-motion'
import { attributeMark } from '../character-rules'

export type CinematicAttack = {
  id: string
  name: string
  attribute: string
  die: 4 | 5 | 6
}

const ATTRIBUTE_ASSET: Record<string, string> = {
  ほのお: 'fire',
  みず: 'water',
  かぜ: 'wind',
  つち: 'earth',
  ひかり: 'light',
  やみ: 'dark',
  でんき: 'electric',
  こおり: 'ice',
  くさ: 'grass',
  はがね: 'steel',
  まほう: 'magic',
  ドラゴン: 'dragon',
  ロボ: 'robot',
  スター: 'star',
  ふしぎ: 'mystery',
}

function backgroundFor(attribute: string, die: 4 | 5 | 6) {
  return `/battle/ultimate-backgrounds/${ATTRIBUTE_ASSET[attribute] ?? ATTRIBUTE_ASSET.ふしぎ}-${die}.jpg`
}

function attackAssetFor(attribute: string) {
  return `/battle/attribute-attacks/${ATTRIBUTE_ASSET[attribute] ?? ATTRIBUTE_ASSET.ふしぎ}.png`
}

const ATTRIBUTE_WASH: Record<string, string> = {
  ほのお: 'radial-gradient(circle at 50% 55%, rgba(251,146,60,.16), transparent 42%)',
  みず: 'radial-gradient(circle at 50% 55%, rgba(56,189,248,.14), transparent 42%)',
  かぜ: 'radial-gradient(circle at 50% 55%, rgba(134,239,172,.13), transparent 42%)',
  つち: 'radial-gradient(circle at 50% 55%, rgba(251,191,36,.12), transparent 42%)',
  ひかり: 'radial-gradient(circle at 50% 55%, rgba(254,240,138,.18), transparent 42%)',
  やみ: 'radial-gradient(circle at 50% 55%, rgba(168,85,247,.16), transparent 42%)',
  でんき: 'radial-gradient(circle at 50% 55%, rgba(250,204,21,.18), transparent 42%)',
  こおり: 'radial-gradient(circle at 50% 55%, rgba(165,243,252,.18), transparent 42%)',
  くさ: 'radial-gradient(circle at 50% 55%, rgba(74,222,128,.14), transparent 42%)',
  はがね: 'radial-gradient(circle at 50% 55%, rgba(203,213,225,.16), transparent 42%)',
  まほう: 'radial-gradient(circle at 50% 55%, rgba(240,171,252,.18), transparent 42%)',
  ドラゴン: 'radial-gradient(circle at 50% 55%, rgba(248,113,113,.17), transparent 42%)',
  ロボ: 'radial-gradient(circle at 50% 55%, rgba(34,211,238,.16), transparent 42%)',
  スター: 'radial-gradient(circle at 50% 55%, rgba(253,224,71,.18), transparent 42%)',
  ふしぎ: 'radial-gradient(circle at 50% 55%, rgba(196,181,253,.16), transparent 42%)',
}

const ATTRIBUTE_PARTICLES: Record<string, string[]> = {
  ほのお: ['🔥', '💥', '✦'],
  みず: ['💧', '🌊', '✦'],
  かぜ: ['🌪️', '💨', '✦'],
  つち: ['🪨', '◆', '✦'],
  ひかり: ['✨', '☀️', '✦'],
  やみ: ['●', '🌑', '✦'],
  でんき: ['⚡', '✦', '◆'],
  こおり: ['❄️', '◆', '✦'],
  くさ: ['🌿', '🍃', '✦'],
  はがね: ['⚙️', '◆', '✦'],
  まほう: ['🔮', '✦', '◇'],
  ドラゴン: ['🔥', '🐉', '✦'],
  ロボ: ['⚙️', '⚡', '✦'],
  スター: ['⭐', '🌟', '✦'],
  ふしぎ: ['🌀', '◇', '✦'],
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
            style={{ backgroundImage: `url(${backgroundFor(attack.attribute, attack.die)})` }}
            initial={{ scale: attack.die === 6 ? 1.14 : 1.06, opacity: 0.12 }}
            animate={{
              scale: attack.die === 6 ? [1.14, 1.02, 1.08] : [1.06, 1.01, 1.03],
              opacity: [0.12, 0.48, 0.4],
            }}
            transition={{ duration: attack.die === 4 ? 1.5 : attack.die === 5 ? 1.9 : 2.45, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `${ATTRIBUTE_WASH[attack.attribute] ?? ATTRIBUTE_WASH.ふしぎ}, linear-gradient(rgba(0,0,0,.62),rgba(0,0,0,.56))`,
            }}
            animate={{ opacity: [0.54, 0.78, 0.68, 0.82, 0.66] }}
            transition={{ duration: attack.die === 4 ? 1.4 : attack.die === 5 ? 1.8 : 2.35 }}
          />
          {(ATTRIBUTE_PARTICLES[attack.attribute] ?? ATTRIBUTE_PARTICLES.ふしぎ).flatMap((item, groupIndex) =>
            Array.from({ length: attack.die * 3 }, (_, index) => (
              <motion.span
                key={`${item}-${groupIndex}-${index}`}
                className="absolute z-[1] text-[clamp(1.4rem,7vw,4rem)] drop-shadow-[0_0_12px_rgba(255,255,255,.55)]"
                style={{
                  left: `${12 + ((index * 23 + groupIndex * 17) % 78)}%`,
                  top: `${16 + ((index * 19 + groupIndex * 13) % 68)}%`,
                }}
                initial={{ opacity: 0, scale: 0.35, y: 34, rotate: -40 }}
                animate={{
                  opacity: [0, 0.95, 0.95, 0],
                  scale: [0.35, attack.die === 6 ? 1.8 : 1.3, attack.die === 6 ? 2.4 : 1.65, 0.7],
                  y: [34, -58 - index * 4, -92 - index * 5],
                  rotate: [-40, 35 + index * 18],
                }}
                transition={{ duration: attack.die === 4 ? 1.45 : attack.die === 5 ? 1.85 : 2.35, delay: 0.45 + index * 0.03 }}
              >
                {item}
              </motion.span>
            ))
          )}
          <motion.img
            src={attackAssetFor(attack.attribute)}
            alt=""
            className="absolute left-1/2 top-1/2 z-[2] h-[min(82vw,520px)] w-[min(82vw,520px)] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_0_46px_rgba(255,255,255,.86)]"
            initial={{ scale: 0.18, opacity: 0, y: 80, rotate: attack.die === 6 ? -14 : 0 }}
            animate={{
              scale: attack.die === 6 ? [0.18, 1.18, 1.04, 1.42, 1.72] : [0.18, 1.05, 1.16, 0.98],
              opacity: attack.die === 6 ? [0, 1, 1, 1, 0] : [0, 1, 1, 0.95, 0],
              y: attack.die === 6 ? [80, -16, 0, -24, -52] : [70, -6, -10, -26],
              rotate: attack.die === 6 ? [-14, 8, -4, 10, -6] : [0, 4, -4, 2],
              filter: ['brightness(1)', 'brightness(1.75)', 'brightness(1.2)', 'brightness(2.2)'],
            }}
            transition={{ duration: attack.die === 4 ? 1.55 : attack.die === 5 ? 2.0 : 2.55, delay: 0.7, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0 z-[3] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: attack.die === 6 ? [0, 0.55, 0, 0.9, 0, 0.95, 0] : [0, 0.36, 0, 0.52, 0] }}
            transition={{ duration: attack.die === 6 ? 2.25 : attack.die === 5 ? 1.65 : 1.35, delay: 1.0 }}
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
              transition={{ duration: 0.72, delay: 0.32, ease: 'backOut' }}
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
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0] }}
            transition={{ duration: attack.die === 6 ? 2.3 : attack.die === 5 ? 1.9 : 1.55, times: [0, 0.78, 0.9, 1] }}
          >
            <div className="h-full w-full bg-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
