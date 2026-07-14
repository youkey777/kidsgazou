import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AttributeGuide from './AttributeGuide'

type Props = {
  open: boolean
  onClose: () => void
}

export default function BattleAffinityOverlay({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="属性相性表"
          data-testid="battle-affinity-overlay"
          className="fixed inset-0 z-[100] overflow-y-auto bg-purple-950"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="sticky top-0 z-20 border-b border-white/15 bg-purple-950/92 px-3 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-cyan-200">バトルはそのまま</p>
                <p className="text-lg font-black text-white">属性(ぞくせい)の相性(あいしょう)</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="min-h-12 rounded-2xl bg-white px-5 text-base font-black text-purple-900 shadow-lg outline-none ring-yellow-300 focus-visible:ring-4 active:scale-95"
              >
                閉(と)じる
              </button>
            </div>
          </div>
          <div className="mx-auto max-w-md">
            <AttributeGuide embedded />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
