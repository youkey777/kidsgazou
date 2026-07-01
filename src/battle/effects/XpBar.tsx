import { motion } from 'framer-motion'

type Props = {
  xp: number
  compact?: boolean
}

export default function XpBar({ xp, compact = false }: Props) {
  const value = Math.max(0, Math.min(99, Math.floor(xp)))

  return (
    <div className={compact ? 'mt-1' : 'mt-2'}>
      <div className="mb-1 flex items-center justify-between rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white shadow-sm ring-1 ring-white/15">
        <span>EXP</span>
        <span>{value}/100</span>
      </div>
      <div className={`${compact ? 'h-2' : 'h-3'} overflow-hidden rounded-full bg-white/30 ring-1 ring-black/20`}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-lime-200 to-orange-400 shadow-[0_0_14px_rgba(34,211,238,.85)]"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
