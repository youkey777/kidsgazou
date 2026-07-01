import { motion } from 'framer-motion'

type Props = {
  xp: number
  compact?: boolean
}

export default function XpBar({ xp, compact = false }: Props) {
  const value = Math.max(0, Math.min(99, Math.floor(xp)))

  return (
    <div className={compact ? 'mt-1' : 'mt-2'}>
      <div className="flex items-center justify-between text-[10px] font-black text-yellow-100">
        <span>EXP</span>
        <span>{value}/100</span>
      </div>
      <div className={`${compact ? 'h-2' : 'h-3'} overflow-hidden rounded-full bg-black/35 ring-1 ring-white/20`}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-yellow-200 to-orange-400 shadow-[0_0_14px_rgba(250,204,21,.85)]"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
