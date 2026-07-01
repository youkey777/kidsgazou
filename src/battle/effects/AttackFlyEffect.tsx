import { motion } from 'framer-motion'

export type AttackEffectData = {
  id: string
  side: 'left' | 'right'
  kind: 'dice' | 'rps' | 'counter'
  attribute: string
  variant: number
  symbol?: string
  imageUrl?: string
  label?: string
}

type AttributeStyle = {
  tokens: string[]
  glow: string
  burst: string
  text: string
  shape: string
  asset: string
  motion: 'direct' | 'arc' | 'beam' | 'slash' | 'drop' | 'spiral'
}

const ATTRIBUTE_STYLES: Record<string, AttributeStyle> = {
  ほのお: { tokens: ['🔥', '💥', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(251,146,60,.95)]', burst: 'from-red-500 to-yellow-300', text: 'text-orange-100', shape: 'polygon(50% 0%,64% 28%,92% 16%,74% 50%,100% 78%,58% 68%,44% 100%,32% 64%,0% 74%,24% 46%,8% 18%,36% 30%)', asset: 'fire', motion: 'direct' },
  みず: { tokens: ['💧', '🌊', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(56,189,248,.9)]', burst: 'from-sky-500 to-cyan-200', text: 'text-cyan-100', shape: 'ellipse(42% 50% at 50% 50%)', asset: 'water', motion: 'arc' },
  かぜ: { tokens: ['🌪️', '💨', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(110,231,183,.9)]', burst: 'from-emerald-400 to-lime-100', text: 'text-emerald-100', shape: 'polygon(8% 42%,58% 10%,92% 24%,54% 48%,96% 68%,42% 90%,12% 74%,48% 58%)', asset: 'wind', motion: 'spiral' },
  つち: { tokens: ['🪨', '⛰️', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(180,83,9,.85)]', burst: 'from-amber-700 to-yellow-200', text: 'text-yellow-100', shape: 'polygon(22% 12%,72% 8%,96% 40%,82% 82%,34% 94%,8% 62%)', asset: 'earth', motion: 'drop' },
  ひかり: { tokens: ['✨', '☀️', '🌟'], glow: 'drop-shadow-[0_0_20px_rgba(254,240,138,.95)]', burst: 'from-yellow-200 to-white', text: 'text-yellow-50', shape: 'polygon(50% 0%,62% 36%,100% 50%,62% 64%,50% 100%,38% 64%,0% 50%,38% 36%)', asset: 'light', motion: 'beam' },
  やみ: { tokens: ['🌑', '🕳️', '💫'], glow: 'drop-shadow-[0_0_18px_rgba(168,85,247,.95)]', burst: 'from-violet-950 to-fuchsia-500', text: 'text-violet-100', shape: 'ellipse(48% 42% at 50% 50%)', asset: 'dark', motion: 'slash' },
  でんき: { tokens: ['⚡', '💥', '✨'], glow: 'drop-shadow-[0_0_20px_rgba(250,204,21,.95)]', burst: 'from-yellow-300 to-indigo-300', text: 'text-yellow-100', shape: 'polygon(62% 0%,28% 42%,52% 42%,36% 100%,78% 36%,54% 36%)', asset: 'electric', motion: 'beam' },
  こおり: { tokens: ['❄️', '🧊', '✨'], glow: 'drop-shadow-[0_0_20px_rgba(165,243,252,.95)]', burst: 'from-cyan-200 to-blue-500', text: 'text-cyan-50', shape: 'polygon(50% 0%,68% 30%,100% 50%,68% 70%,50% 100%,32% 70%,0% 50%,32% 30%)', asset: 'ice', motion: 'direct' },
  くさ: { tokens: ['🌿', '🍀', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(74,222,128,.9)]', burst: 'from-green-500 to-lime-200', text: 'text-green-50', shape: 'ellipse(34% 55% at 50% 50%)', asset: 'grass', motion: 'arc' },
  はがね: { tokens: ['⚙️', '🔩', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(203,213,225,.9)]', burst: 'from-slate-500 to-zinc-200', text: 'text-zinc-50', shape: 'polygon(12% 28%,50% 4%,88% 28%,88% 72%,50% 96%,12% 72%)', asset: 'steel', motion: 'direct' },
  まほう: { tokens: ['🔮', '🪄', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(240,171,252,.95)]', burst: 'from-fuchsia-500 to-violet-200', text: 'text-fuchsia-50', shape: 'circle(48% at 50% 50%)', asset: 'magic', motion: 'spiral' },
  ドラゴン: { tokens: ['🐉', '🔥', '💫'], glow: 'drop-shadow-[0_0_20px_rgba(248,113,113,.95)]', burst: 'from-red-700 to-purple-300', text: 'text-red-50', shape: 'polygon(8% 50%,30% 14%,62% 28%,92% 8%,78% 48%,96% 88%,58% 70%,26% 92%)', asset: 'dragon', motion: 'slash' },
  ロボ: { tokens: ['🤖', '⚙️', '⚡'], glow: 'drop-shadow-[0_0_18px_rgba(34,211,238,.9)]', burst: 'from-cyan-500 to-slate-200', text: 'text-cyan-50', shape: 'polygon(18% 18%,82% 18%,82% 82%,18% 82%)', asset: 'robot', motion: 'beam' },
  スター: { tokens: ['🌟', '⭐', '✨'], glow: 'drop-shadow-[0_0_20px_rgba(253,224,71,.95)]', burst: 'from-yellow-300 to-pink-200', text: 'text-yellow-50', shape: 'polygon(50% 0%,62% 35%,100% 35%,70% 56%,82% 100%,50% 72%,18% 100%,30% 56%,0% 35%,38% 35%)', asset: 'star', motion: 'arc' },
  ふしぎ: { tokens: ['🌀', '❔', '✨'], glow: 'drop-shadow-[0_0_18px_rgba(196,181,253,.95)]', burst: 'from-purple-600 to-pink-300', text: 'text-purple-50', shape: 'ellipse(48% 48% at 50% 50%)', asset: 'mystery', motion: 'spiral' },
}

const FALLBACK_STYLE = ATTRIBUTE_STYLES.ふしぎ

function getStyle(attribute: string) {
  return ATTRIBUTE_STYLES[attribute] ?? FALLBACK_STYLE
}

function variantMotion(direction: number, style: AttributeStyle) {
  const reach = direction * 42
  const mid = direction * 24
  switch (style.motion) {
    case 'beam':
      return { x: ['0vw', `${reach}vw`, `${reach}vw`], y: [0, 0, 0], rotate: 0, scale: [0.72, 1.55, 0.18], opacity: [0, 1, 0] }
    case 'slash':
      return { x: ['0vw', `${mid * 0.45}vw`, `${reach}vw`, `${reach}vw`], y: [-80, 18, 0, 0], rotate: [direction * -18, direction * -18, direction * -18, direction * -18], scale: [1.05, 1.34, 1.46, 0.2], opacity: [0, 1, 1, 0] }
    case 'drop':
      return { x: ['0vw', `${mid * 0.6}vw`, `${reach}vw`, `${reach}vw`], y: [-120, -52, 0, 0], rotate: [0, direction * 8, direction * 10, direction * 10], scale: [0.88, 1.24, 1.48, 0.24], opacity: [0, 1, 1, 0] }
    case 'arc':
      return { x: ['0vw', `${mid * 0.75}vw`, `${reach}vw`, `${reach}vw`], y: [0, -58, 0, 0], rotate: [0, direction * 8, direction * 8, direction * 8], scale: [0.86, 1.24, 1.44, 0.2], opacity: [0, 1, 1, 0] }
    case 'spiral':
      return { x: ['0vw', `${mid * 0.55}vw`, `${mid * 1.15}vw`, `${reach}vw`, `${reach}vw`], y: [0, -36, 34, 0, 0], rotate: [0, direction * 18, direction * -16, 0, 0], scale: [0.82, 1.18, 1.18, 1.48, 0.2], opacity: [0, 1, 1, 1, 0] }
    default:
      return { x: ['0vw', `${reach}vw`, `${reach}vw`], y: [0, 0, 0], rotate: 0, scale: [0.82, 1.46, 0.22], opacity: [0, 1, 0] }
  }
}

export default function AttackFlyEffect({ effect }: { effect: AttackEffectData }) {
  const style = getStyle(effect.attribute)
  const direction = effect.side === 'left' ? 1 : -1
  const start = effect.side === 'left' ? '24%' : '76%'
  const motionPath = variantMotion(direction, style)
  const tokenCount = Math.min(6, Math.max(3, effect.variant + 1))
  const imageUrl =
    effect.imageUrl ??
    `/battle/attribute-attacks/${style.asset}.png`

  return (
    <motion.div
      key={effect.id}
      className="pointer-events-none absolute inset-0 z-30"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute top-[46%]"
        style={{ left: start }}
        initial={{ x: '0vw', y: 0, scale: 0.7, rotate: 0, opacity: 0 }}
        animate={motionPath}
        transition={{ duration: effect.kind === 'dice' ? 0.72 : 0.58, ease: 'easeInOut' }}
      >
        <div className={`relative grid h-24 w-24 place-items-center text-4xl sm:h-32 sm:w-32 sm:text-5xl ${style.glow}`}>
          <motion.div
            className={`absolute inset-4 rounded-full bg-gradient-to-br ${style.burst} opacity-40 blur-xl`}
            animate={{ scale: [0.8, 1.5, 1], opacity: [0.25, 0.55, 0.15] }}
            transition={{ duration: 0.62 }}
          />
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain opacity-95"
            style={{ clipPath: effect.imageUrl ? 'none' : style.shape }}
          />
          {effect.symbol && (
            <span className="relative z-10 rounded-full bg-black/45 px-3 py-1 text-yellow-100 shadow-lg">
              {effect.symbol}
            </span>
          )}
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-white/70"
            animate={{ scale: [0.72, 1.45, 1.05], opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.62 }}
          />
          <motion.span
            className="absolute inset-5 rounded-full bg-white/80 blur-xl"
            animate={{ scale: [0, 1.7, 0], opacity: [0, 0, 0.95, 0] }}
            transition={{ duration: 0.72, times: [0, 0.72, 0.84, 1] }}
          />
          {Array.from({ length: tokenCount }).map((_, index) => (
            <motion.span
              key={`${effect.id}-trail-${index}`}
              className="absolute text-xl sm:text-2xl"
              initial={{ x: 0, y: 0, opacity: 0.95, scale: 0.7 }}
              animate={{
                x: direction * (-18 - index * 8),
                y: (index % 2 === 0 ? -1 : 1) * (12 + index * 5),
                opacity: 0,
                scale: 1.15,
              }}
              transition={{ duration: 0.55, delay: index * 0.035 }}
            >
              {style.tokens[index % style.tokens.length]}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
