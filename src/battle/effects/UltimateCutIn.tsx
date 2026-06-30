import { motion, AnimatePresence } from 'framer-motion'
import type { BattleCharacter } from '../types'

type Props = {
  character: BattleCharacter | null
}

export default function UltimateCutIn({ character }: Props) {
  return (
    <AnimatePresence>
      {character && (
        <motion.div
          className="fixed inset-0 z-[70] overflow-hidden bg-black/88 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,#fff3_0deg,#fff3_4deg,transparent_5deg,transparent_10deg)]" />
          <motion.img
            src={character.url}
            alt=""
            className="absolute left-4 h-44 w-44 rounded-full object-cover border-4 border-yellow-300 shadow-[0_0_50px_rgba(250,204,21,0.9)]"
            initial={{ x: -220, rotate: -12 }}
            animate={{ x: 0, rotate: 0 }}
            exit={{ x: -260, opacity: 0 }}
          />
          <motion.div
            className="relative z-10 px-5 text-center"
            initial={{ scale: 0.25, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0 }}
          >
            <p className="text-white text-lg font-black">ひっさつ！</p>
            <h2 className="text-5xl font-black text-yellow-300 drop-shadow-[0_5px_0_rgba(220,38,38,0.9)]">
              {character.ultimateName}
            </h2>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
