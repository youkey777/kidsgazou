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
  objectPosition: string
}

const ATTRIBUTE_STYLES: Record<string, AttributeStyle> = {
  ほのお: { tokens: ['🔥', '💥', '✨'], glow: 'shadow-orange-300', burst: 'from-red-500 to-yellow-300', text: 'text-orange-100', shape: 'polygon(50% 0%,64% 28%,92% 16%,74% 50%,100% 78%,58% 68%,44% 100%,32% 64%,0% 74%,24% 46%,8% 18%,36% 30%)', objectPosition: '10% 18%' },
  みず: { tokens: ['💧', '🌊', '✨'], glow: 'shadow-sky-300', burst: 'from-sky-500 to-cyan-200', text: 'text-cyan-100', shape: 'ellipse(42% 50% at 50% 50%)', objectPosition: '30% 18%' },
  かぜ: { tokens: ['🌪️', '💨', '✨'], glow: 'shadow-emerald-200', burst: 'from-emerald-400 to-lime-100', text: 'text-emerald-100', shape: 'polygon(8% 42%,58% 10%,92% 24%,54% 48%,96% 68%,42% 90%,12% 74%,48% 58%)', objectPosition: '50% 18%' },
  つち: { tokens: ['🪨', '⛰️', '✨'], glow: 'shadow-amber-300', burst: 'from-amber-700 to-yellow-200', text: 'text-yellow-100', shape: 'polygon(22% 12%,72% 8%,96% 40%,82% 82%,34% 94%,8% 62%)', objectPosition: '70% 18%' },
  ひかり: { tokens: ['✨', '☀️', '🌟'], glow: 'shadow-yellow-200', burst: 'from-yellow-200 to-white', text: 'text-yellow-50', shape: 'polygon(50% 0%,62% 36%,100% 50%,62% 64%,50% 100%,38% 64%,0% 50%,38% 36%)', objectPosition: '90% 18%' },
  やみ: { tokens: ['🌑', '🕳️', '💫'], glow: 'shadow-violet-400', burst: 'from-violet-950 to-fuchsia-500', text: 'text-violet-100', shape: 'ellipse(48% 42% at 50% 50%)', objectPosition: '10% 50%' },
  でんき: { tokens: ['⚡', '💥', '✨'], glow: 'shadow-yellow-300', burst: 'from-yellow-300 to-indigo-300', text: 'text-yellow-100', shape: 'polygon(62% 0%,28% 42%,52% 42%,36% 100%,78% 36%,54% 36%)', objectPosition: '30% 50%' },
  こおり: { tokens: ['❄️', '🧊', '✨'], glow: 'shadow-cyan-200', burst: 'from-cyan-200 to-blue-500', text: 'text-cyan-50', shape: 'polygon(50% 0%,68% 30%,100% 50%,68% 70%,50% 100%,32% 70%,0% 50%,32% 30%)', objectPosition: '50% 50%' },
  くさ: { tokens: ['🌿', '🍀', '✨'], glow: 'shadow-green-300', burst: 'from-green-500 to-lime-200', text: 'text-green-50', shape: 'ellipse(34% 55% at 50% 50%)', objectPosition: '70% 50%' },
  はがね: { tokens: ['⚙️', '🔩', '✨'], glow: 'shadow-slate-300', burst: 'from-slate-500 to-zinc-200', text: 'text-zinc-50', shape: 'polygon(12% 28%,50% 4%,88% 28%,88% 72%,50% 96%,12% 72%)', objectPosition: '90% 50%' },
  まほう: { tokens: ['🔮', '🪄', '✨'], glow: 'shadow-fuchsia-300', burst: 'from-fuchsia-500 to-violet-200', text: 'text-fuchsia-50', shape: 'circle(48% at 50% 50%)', objectPosition: '10% 82%' },
  ドラゴン: { tokens: ['🐉', '🔥', '💫'], glow: 'shadow-red-400', burst: 'from-red-700 to-purple-300', text: 'text-red-50', shape: 'polygon(8% 50%,30% 14%,62% 28%,92% 8%,78% 48%,96% 88%,58% 70%,26% 92%)', objectPosition: '30% 82%' },
  ロボ: { tokens: ['🤖', '⚙️', '⚡'], glow: 'shadow-cyan-300', burst: 'from-cyan-500 to-slate-200', text: 'text-cyan-50', shape: 'polygon(18% 18%,82% 18%,82% 82%,18% 82%)', objectPosition: '50% 82%' },
  スター: { tokens: ['🌟', '⭐', '✨'], glow: 'shadow-yellow-200', burst: 'from-yellow-300 to-pink-200', text: 'text-yellow-50', shape: 'polygon(50% 0%,62% 35%,100% 35%,70% 56%,82% 100%,50% 72%,18% 100%,30% 56%,0% 35%,38% 35%)', objectPosition: '70% 82%' },
  ふしぎ: { tokens: ['🌀', '❔', '✨'], glow: 'shadow-purple-300', burst: 'from-purple-600 to-pink-300', text: 'text-purple-50', shape: 'ellipse(48% 48% at 50% 50%)', objectPosition: '90% 82%' },
}

const FALLBACK_STYLE = ATTRIBUTE_STYLES.ふしぎ

function getStyle(attribute: string) {
  return ATTRIBUTE_STYLES[attribute] ?? FALLBACK_STYLE
}

function variantMotion(variant: number, direction: number) {
  const reach = direction * 48
  const mid = direction * 24
  switch (variant) {
    case 1:
      return { x: ['0vw', `${reach}vw`], y: [0, 0], rotate: [0, direction * 360], scale: [1, 1.2, 1.45] }
    case 2:
      return { x: ['0vw', `${mid}vw`, `${reach}vw`], y: [0, -76, 0], rotate: [0, direction * 180, direction * 540], scale: [1, 1.35, 1.5] }
    case 3:
      return { x: ['0vw', `${mid * 0.75}vw`, `${mid * 1.25}vw`, `${reach}vw`], y: [0, 48, -36, 0], rotate: [0, direction * 160, direction * 320, direction * 640], scale: [1, 1.05, 1.35, 1.5] }
    case 4:
      return { x: ['0vw', `${mid * 0.55}vw`, `${mid * 1.1}vw`, `${reach}vw`], y: [0, -44, 42, 0], rotate: [0, direction * -120, direction * 240, direction * 720], scale: [1, 1.18, 1.18, 1.55] }
    case 5:
      return { x: ['0vw', `${mid * 0.45}vw`, `${mid * 1.25}vw`, `${reach}vw`], y: [0, 36, -72, 0], rotate: [0, direction * 360, direction * 720, direction * 900], scale: [1, 1.4, 0.95, 1.65] }
    default:
      return { x: ['0vw', `${mid * 0.8}vw`, `${reach}vw`], y: [0, -96, 0], rotate: [0, direction * 720, direction * 1080], scale: [1.15, 1.75, 2] }
  }
}

export default function AttackFlyEffect({ effect }: { effect: AttackEffectData }) {
  const style = getStyle(effect.attribute)
  const direction = effect.side === 'left' ? 1 : -1
  const start = effect.side === 'left' ? '24%' : '76%'
  const motionPath = variantMotion(effect.variant, direction)
  const tokenCount = Math.min(6, Math.max(3, effect.variant + 1))
  const imageUrl =
    effect.imageUrl ??
    (effect.variant >= 6
      ? '/battle/ultimate6-cg.png'
      : effect.variant >= 5
        ? '/battle/ultimate5-cg.png'
        : effect.variant >= 4
          ? '/battle/ultimate4-cg.png'
        : '/battle/attack-normal-cg.png')

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
        initial={{ x: '0vw', y: 0, scale: 0.7, rotate: 0 }}
        animate={motionPath}
        transition={{ duration: effect.kind === 'dice' ? 0.72 : 0.58, ease: 'easeInOut' }}
      >
        <div
          className={`relative grid h-20 w-20 place-items-center overflow-hidden bg-gradient-to-br ${style.burst} text-4xl shadow-2xl ${style.glow} ring-4 ring-white/70 sm:h-24 sm:w-24 sm:text-5xl`}
          style={{ clipPath: effect.imageUrl ? 'circle(50% at 50% 50%)' : style.shape }}
        >
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" style={{ objectPosition: effect.imageUrl ? 'center' : style.objectPosition }} />
          {effect.symbol && (
            <span className="relative z-10 rounded-full bg-black/45 px-3 py-1 text-yellow-100 shadow-lg">
              {effect.symbol}
            </span>
          )}
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-white/70"
            animate={{ scale: [0.72, 1.45, 1.05], opacity: [0.95, 0, 0.45] }}
            transition={{ duration: 0.62, repeat: 1 }}
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
