import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  addCharacterCrystals,
  rerollCharacterAttribute,
  rerollCharacterStat,
  type ImageRecord,
} from '../db'
import {
  ATTRIBUTES,
  randomAttribute,
  randomStat,
  STAT_LABELS,
  type StatKey,
} from './character-rules'
import { shortBattleName } from './types'

type Props = {
  characters: ImageRecord[]
  onChanged: () => Promise<void> | void
}

type MathQuestion = {
  left: number
  right: number
  op: '+' | '-'
  answer: number
  options: number[]
}

const STAT_KEYS: StatKey[] = ['atk', 'def', 'spd', 'luck', 'tech']

function makeQuestion(): MathQuestion {
  const op: '+' | '-' = Math.random() > 0.45 ? '+' : '-'
  const a = Math.floor(Math.random() * 10)
  const b = Math.floor(Math.random() * 10)
  const left = op === '-' ? Math.max(a, b) : a
  const right = op === '-' ? Math.min(a, b) : b
  const answer = op === '+' ? left + right : left - right
  const options = new Set<number>([answer])
  while (options.size < 3) {
    options.add(Math.max(0, answer + Math.floor(Math.random() * 7) - 3))
  }
  return {
    left,
    right,
    op,
    answer,
    options: [...options].sort(() => Math.random() - 0.5),
  }
}

function makeQuiz() {
  return Array.from({ length: 5 }, makeQuestion)
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/85 p-2 text-center shadow">
      <p className="text-[11px] font-black text-purple-700">{label}</p>
      <p className="text-xl font-black text-zinc-900">{value}</p>
    </div>
  )
}

export default function Training({ characters, onChanged }: Props) {
  const [selectedId, setSelectedId] = useState(characters[0]?.id ?? '')
  const selected = useMemo(
    () => characters.find((character) => character.id === selectedId) ?? characters[0] ?? null,
    [characters, selectedId]
  )
  const [quiz, setQuiz] = useState<MathQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [earned, setEarned] = useState(0)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('キャラを選んで育てよう！')
  const [roulette, setRoulette] = useState<StatKey | 'attribute' | null>(null)
  const [rouletteValue, setRouletteValue] = useState<number | string | null>(null)
  const [consumeFlash, setConsumeFlash] = useState(0)

  const currentQuestion = quiz[index]
  const inQuiz = quiz.length > 0 && index < quiz.length

  const startQuiz = () => {
    if (!selected) return
    setQuiz(makeQuiz())
    setIndex(0)
    setEarned(0)
    setAnswerState('idle')
    setMessage(`${shortBattleName(selected.name)}を育てるよ！`)
  }

  const answer = async (value: number) => {
    if (!selected || !currentQuestion || busy) return
    setBusy(true)
    const correct = value === currentQuestion.answer
    setAnswerState(correct ? 'correct' : 'wrong')
    if (correct) {
      const nextEarned = earned + 1
      setEarned(nextEarned)
      setMessage('正解！クリスタルを1こゲット！')
      await addCharacterCrystals({ ...selected, crystals: selected.crystals + earned }, 1)
    } else {
      setMessage(`おしい！こたえは ${currentQuestion.answer}`)
    }
    window.setTimeout(async () => {
      const nextIndex = index + 1
      setAnswerState('idle')
      setIndex(nextIndex)
      setBusy(false)
      if (nextIndex >= quiz.length) {
        setMessage(`育成おわり！クリスタル ${correct ? earned + 1 : earned}こゲット！`)
        setQuiz([])
        setIndex(0)
        await onChanged()
      }
    }, 850)
  }

  const runStatRoulette = async (stat: StatKey) => {
    if (!selected || selected.crystals <= 0 || busy) return
    setBusy(true)
    setRoulette(stat)
    setConsumeFlash((value) => value + 1)
    for (let i = 0; i < 16; i++) {
      setRouletteValue(randomStat())
      await new Promise((resolve) => window.setTimeout(resolve, 45 + i * 5))
    }
    const nextValue = randomStat()
    setRouletteValue(nextValue)
    await rerollCharacterStat(selected, stat, nextValue)
    setMessage(`${STAT_LABELS[stat]}が ${nextValue} になった！`)
    await onChanged()
    window.setTimeout(() => {
      setRoulette(null)
      setRouletteValue(null)
      setBusy(false)
    }, 500)
  }

  const runAttributeRoulette = async () => {
    if (!selected || selected.crystals <= 0 || busy) return
    setBusy(true)
    setRoulette('attribute')
    setConsumeFlash((value) => value + 1)
    for (let i = 0; i < 12; i++) {
      setRouletteValue(randomAttribute())
      await new Promise((resolve) => window.setTimeout(resolve, 60 + i * 8))
    }
    const nextAttribute = randomAttribute()
    setRouletteValue(nextAttribute)
    await rerollCharacterAttribute(selected, nextAttribute)
    setMessage(`属性が「${nextAttribute}」になった！`)
    await onChanged()
    window.setTimeout(() => {
      setRoulette(null)
      setRouletteValue(null)
      setBusy(false)
    }, 500)
  }

  if (!selected) {
    return (
      <div className="rounded-3xl bg-white/85 p-6 text-center font-black text-purple-800">
        まだキャラがいないよ。画像を追加してね。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <section className="rounded-3xl bg-white/85 p-3 shadow-lg">
        <h2 className="mb-2 text-xl font-black text-purple-900">育てるキャラ</h2>
        <div className="grid grid-cols-3 gap-2">
          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => {
                setSelectedId(character.id)
                setQuiz([])
                setMessage(`${shortBattleName(character.name)}を選んだよ`)
              }}
              className={`rounded-2xl border-4 bg-white p-1 text-left shadow ${
                selected.id === character.id ? 'border-yellow-300' : 'border-white'
              }`}
            >
              <img src={character.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <p className="truncate text-xs font-black text-zinc-900">{shortBattleName(character.name)}</p>
              <p className="text-[11px] font-black text-cyan-700">💎 {character.crystals}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-100 via-white to-pink-100 p-3 shadow-lg">
        <AnimatePresence>
          {consumeFlash > 0 && (
            <motion.div
              key={consumeFlash}
              className="pointer-events-none absolute right-6 top-4 text-4xl"
              initial={{ scale: 1.4, opacity: 1, y: 0 }}
              animate={{ scale: 0.2, opacity: 0, y: 40, rotate: 180 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              💎
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          <img src={selected.url} alt="" className="h-24 w-24 rounded-2xl object-cover shadow" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-zinc-900">{shortBattleName(selected.name)}</p>
            <p className="text-sm font-black text-purple-700">属性: {selected.species}</p>
            <p className="text-lg font-black text-cyan-700">💎 {selected.crystals}こ</p>
            <p className="text-sm font-bold text-zinc-700">{message}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1">
          {STAT_KEYS.map((key) => (
            <StatBadge key={key} label={STAT_LABELS[key]} value={selected[key]} />
          ))}
        </div>

        <button
          onClick={startQuiz}
          disabled={busy || inQuiz}
          className="mt-3 min-h-14 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 text-xl font-black text-zinc-900 shadow-xl disabled:opacity-50"
        >
          算数で育てる
        </button>
      </section>

      <AnimatePresence>
        {inQuiz && currentQuestion && (
          <motion.section
            key={index}
            className={`rounded-3xl p-4 shadow-2xl ${
              answerState === 'correct'
                ? 'bg-yellow-200'
                : answerState === 'wrong'
                  ? 'bg-red-100'
                  : 'bg-white'
            }`}
            initial={{ scale: 0.82, y: 24, opacity: 0, rotate: -3 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <p className="text-center text-sm font-black text-purple-700">もんだい {index + 1} / 5</p>
            <div className="my-4 text-center text-5xl font-black text-zinc-900">
              {currentQuestion.left} {currentQuestion.op} {currentQuestion.right} = ?
            </div>
            <div className="grid grid-cols-3 gap-2">
              {currentQuestion.options.map((option) => (
                <motion.button
                  key={option}
                  onClick={() => void answer(option)}
                  disabled={busy}
                  className="min-h-16 rounded-2xl bg-purple-600 text-2xl font-black text-white shadow-lg disabled:opacity-60"
                  whileTap={{ scale: 0.92 }}
                >
                  {option}
                </motion.button>
              ))}
            </div>
            {answerState === 'correct' && (
              <motion.div
                className="mt-3 text-center text-4xl"
                initial={{ y: 20, opacity: 0, scale: 0.5 }}
                animate={{ y: -12, opacity: 1, scale: 1.2, rotate: [0, -8, 8, 0] }}
              >
                💎 ゲット！
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <section className="rounded-3xl bg-zinc-900 p-3 text-white shadow-lg">
        <h3 className="mb-2 text-lg font-black text-yellow-300">クリスタルで再抽選</h3>
        <div className="grid grid-cols-2 gap-2">
          {STAT_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => void runStatRoulette(key)}
              disabled={busy || selected.crystals <= 0}
              className="min-h-14 rounded-2xl bg-white/10 px-2 text-sm font-black text-white shadow disabled:opacity-40"
            >
              {STAT_LABELS[key]}を回す
            </button>
          ))}
          <button
            onClick={() => void runAttributeRoulette()}
            disabled={busy || selected.crystals <= 0}
            className="min-h-14 rounded-2xl bg-pink-500 px-2 text-sm font-black text-white shadow disabled:opacity-40"
          >
            属性チェンジ
          </button>
        </div>

        <AnimatePresence>
          {roulette && (
            <motion.div
              key={roulette}
              className="mt-3 rounded-3xl bg-white p-4 text-center text-zinc-900"
              initial={roulette === 'attribute' ? { rotateY: 90, opacity: 0 } : { y: 20, opacity: 0 }}
              animate={
                roulette === 'attribute'
                  ? { rotateY: 0, opacity: 1 }
                  : { y: 0, opacity: 1, scale: [1, 1.08, 1] }
              }
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <p className="text-sm font-black text-purple-700">
                {roulette === 'attribute' ? '属性ルーレット' : `${STAT_LABELS[roulette]}ルーレット`}
              </p>
              <p className="text-4xl font-black text-zinc-900">{rouletteValue}</p>
              <div className="mx-auto mt-2 h-2 w-32 overflow-hidden rounded-full bg-zinc-200">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 via-yellow-300 to-pink-400"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 0.45, repeat: Infinity }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px] font-bold text-white/80">
          {ATTRIBUTES.map((attribute) => (
            <span key={attribute} className="rounded-full bg-white/10 px-2 py-1">
              {attribute}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
