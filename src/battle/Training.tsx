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

type TrainingView = 'select' | 'detail'
type AnswerState = 'idle' | 'correct' | 'wrong'

const STAT_KEYS: StatKey[] = ['atk', 'def', 'spd', 'luck', 'tech']
const ARENA_BG = '/battle/training-arena-bg.png'
const SLOT_BG = '/battle/training-slot-bg.png'

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

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

function RadarChart({ character }: { character: ImageRecord }) {
  const center = 112
  const maxRadius = 82
  const axisPoints = STAT_KEYS.map((key, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STAT_KEYS.length
    const radius = (character[key] / 99) * maxRadius
    return {
      key,
      label: STAT_LABELS[key],
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      lx: center + Math.cos(angle) * 103,
      ly: center + Math.sin(angle) * 103,
      ax: center + Math.cos(angle) * maxRadius,
      ay: center + Math.sin(angle) * maxRadius,
    }
  })
  const polygon = axisPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const rings = [0.25, 0.5, 0.75, 1].map((ratio) =>
    STAT_KEYS.map((_, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STAT_KEYS.length
      return `${center + Math.cos(angle) * maxRadius * ratio},${center + Math.sin(angle) * maxRadius * ratio}`
    }).join(' ')
  )

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 224 224" className="drop-shadow-[0_0_18px_rgba(103,232,249,0.7)]">
        {rings.map((points) => (
          <polygon key={points} points={points} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
        ))}
        {axisPoints.map((point) => (
          <line
            key={point.key}
            x1={center}
            y1={center}
            x2={point.ax}
            y2={point.ay}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.5"
          />
        ))}
        <motion.polygon
          points={polygon}
          fill="rgba(250,204,21,0.45)"
          stroke="#facc15"
          strokeWidth="4"
          initial={{ scale: 0.72, opacity: 0, transformOrigin: '112px 112px' }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
        {axisPoints.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="4" fill="#22d3ee" />
            <text
              x={point.lx}
              y={point.ly}
              fill="white"
              fontSize="10"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function CharacterCard({
  character,
  selected,
  onClick,
}: {
  character: ImageRecord
  selected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl p-2 text-left shadow-2xl ${
        selected ? 'bg-yellow-300' : 'bg-white/90'
      }`}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-purple-500/20" />
      <img
        src={character.url}
        alt={character.name}
        className="relative aspect-square w-full rounded-2xl bg-zinc-100 object-cover shadow-lg"
      />
      <div className="relative mt-2">
        <p className="truncate text-sm font-black text-zinc-950">{shortBattleName(character.name)}</p>
        <p className="text-xs font-black text-purple-700">
          Lv.{character.level} / {character.species}
        </p>
        <p className="text-xs font-black text-cyan-700">💎 {character.crystals}</p>
      </div>
    </motion.button>
  )
}

function StatRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number | string
  disabled: boolean
  onChange: () => void
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl bg-white/12 px-3 py-2 ring-1 ring-white/15">
      <p className="font-black text-white">{label}</p>
      <p className="min-w-12 text-right text-2xl font-black text-yellow-200">{value}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className="min-h-11 rounded-xl bg-white px-3 text-sm font-black text-purple-800 shadow-lg disabled:bg-white/25 disabled:text-white/50"
      >
        変更
      </button>
    </div>
  )
}

function QuizOverlay({
  question,
  index,
  earned,
  answerState,
  busy,
  onAnswer,
}: {
  question: MathQuestion
  index: number
  earned: number
  answerState: AnswerState
  busy: boolean
  onAnswer: (value: number) => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/95 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        key={index}
        className={`w-full max-w-md overflow-hidden rounded-[2rem] border-4 p-5 text-center shadow-2xl ${
          answerState === 'correct'
            ? 'border-yellow-200 bg-yellow-100'
            : answerState === 'wrong'
              ? 'border-red-200 bg-red-100'
              : 'border-white/50 bg-white'
        }`}
        initial={{ y: 34, scale: 0.86, rotate: -2 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 28, scale: 0.8, opacity: 0 }}
      >
        <p className="text-sm font-black text-purple-700">もんだい {index + 1} / 5</p>
        <p className="mt-1 text-sm font-black text-cyan-700">💎 {earned}こ</p>
        <motion.div
          className="my-6 rounded-3xl bg-gradient-to-br from-purple-700 to-fuchsia-600 p-6 text-6xl font-black text-white shadow-inner"
          animate={{ y: [0, -4, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          {question.left} {question.op} {question.right}
        </motion.div>
        <div className="grid grid-cols-3 gap-2">
          {question.options.map((option) => (
            <motion.button
              key={option}
              type="button"
              onClick={() => onAnswer(option)}
              disabled={busy}
              className="min-h-16 rounded-2xl bg-yellow-300 text-3xl font-black text-zinc-950 shadow-xl disabled:opacity-60"
              whileTap={{ scale: 0.9 }}
            >
              {option}
            </motion.button>
          ))}
        </div>
        <AnimatePresence>
          {answerState !== 'idle' && (
            <motion.div
              className="mt-4 text-3xl font-black text-purple-800"
              initial={{ scale: 0.5, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
            >
              {answerState === 'correct' ? '正解！クリスタルゲット！' : 'おしい！'}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

function SlotOverlay({
  label,
  value,
  rolling,
}: {
  label: string
  value: number | string | null
  rolling: boolean
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950 p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(38,7,77,.2),rgba(20,3,43,.55)), url(${SLOT_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-sm text-center"
        initial={{ y: 48, scale: 0.82 }}
        animate={{ y: 0, scale: 1 }}
      >
        <p className="rounded-full bg-black/55 px-4 py-2 text-lg font-black text-yellow-200 shadow-xl">
          {label}
        </p>
        <div className="relative mx-auto mt-8 h-40 max-w-[260px] overflow-hidden rounded-[2rem] border-4 border-yellow-200 bg-white/15 shadow-[0_0_40px_rgba(250,204,21,.75)] backdrop-blur">
          <motion.div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,.9)]"
            animate={rolling ? { y: [-84, 84, -84] } : { y: 0, scale: [1.2, 1, 1.08, 1] }}
            transition={rolling ? { duration: 0.28, repeat: Infinity, ease: 'linear' } : { duration: 0.65 }}
          >
            {value ?? '？'}
          </motion.div>
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-yellow-200/80 shadow-[0_0_18px_rgba(250,204,21,.9)]" />
        </div>
        <motion.div
          className="mx-auto mt-6 h-3 w-48 rounded-full bg-gradient-to-r from-cyan-300 via-yellow-200 to-pink-300"
          animate={{ scaleX: rolling ? [0.45, 1, 0.45] : 1 }}
          transition={{ duration: 0.5, repeat: rolling ? Infinity : 0 }}
        />
      </motion.div>
    </motion.div>
  )
}

export default function Training({ characters, onChanged }: Props) {
  const [view, setView] = useState<TrainingView>('select')
  const [selectedId, setSelectedId] = useState(characters[0]?.id ?? '')
  const selected = useMemo(
    () => characters.find((character) => character.id === selectedId) ?? characters[0] ?? null,
    [characters, selectedId]
  )
  const [quiz, setQuiz] = useState<MathQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [earned, setEarned] = useState(0)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('キャラを選んで育てよう！')
  const [slot, setSlot] = useState<{ label: string; value: number | string | null; rolling: boolean } | null>(null)
  const [consumeFlash, setConsumeFlash] = useState(0)

  const currentQuestion = quiz[index]
  const inQuiz = quiz.length > 0 && index < quiz.length

  const openCharacter = (character: ImageRecord) => {
    setSelectedId(character.id)
    setQuiz([])
    setIndex(0)
    setEarned(0)
    setAnswerState('idle')
    setMessage(`${shortBattleName(character.name)}を育てよう！`)
    setView('detail')
  }

  const startQuiz = () => {
    if (!selected || busy) return
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
    const nextEarned = earned + (correct ? 1 : 0)
    setAnswerState(correct ? 'correct' : 'wrong')
    if (correct) {
      setEarned(nextEarned)
      setMessage('正解！クリスタルを1こゲット！')
      try {
        await addCharacterCrystals(selected, 1)
      } catch (error) {
        setMessage(`クリスタル保存に失敗しました: ${(error as Error).message}`)
      }
    } else {
      setMessage(`おしい！こたえは ${currentQuestion.answer}`)
    }

    await sleep(850)
    const nextIndex = index + 1
    setAnswerState('idle')
    if (nextIndex >= quiz.length) {
      setQuiz([])
      setIndex(0)
      setMessage(`育成おわり！クリスタル ${nextEarned}こゲット！`)
      await onChanged()
    } else {
      setIndex(nextIndex)
    }
    setBusy(false)
  }

  const runStatRoulette = async (stat: StatKey) => {
    if (!selected || selected.crystals <= 0 || busy) return
    setBusy(true)
    setConsumeFlash((value) => value + 1)
    setSlot({ label: `${STAT_LABELS[stat]}を変更中`, value: null, rolling: true })
    for (let i = 0; i < 20; i++) {
      setSlot({ label: `${STAT_LABELS[stat]}を変更中`, value: randomStat(), rolling: true })
      await sleep(38 + i * 7)
    }
    const nextValue = randomStat()
    setSlot({ label: `${STAT_LABELS[stat]}が決定！`, value: nextValue, rolling: false })
    try {
      await rerollCharacterStat(selected, stat, nextValue)
      setMessage(`${STAT_LABELS[stat]}が ${nextValue} になった！`)
      await onChanged()
    } catch (error) {
      setMessage((error as Error).message)
    }
    await sleep(900)
    setSlot(null)
    setBusy(false)
  }

  const runAttributeRoulette = async () => {
    if (!selected || selected.crystals <= 0 || busy) return
    setBusy(true)
    setConsumeFlash((value) => value + 1)
    setSlot({ label: '属性を変更中', value: null, rolling: true })
    for (let i = 0; i < 16; i++) {
      setSlot({ label: '属性を変更中', value: randomAttribute(), rolling: true })
      await sleep(52 + i * 8)
    }
    const nextAttribute = randomAttribute()
    setSlot({ label: '属性が決定！', value: nextAttribute, rolling: false })
    try {
      await rerollCharacterAttribute(selected, nextAttribute)
      setMessage(`属性が「${nextAttribute}」になった！`)
      await onChanged()
    } catch (error) {
      setMessage((error as Error).message)
    }
    await sleep(900)
    setSlot(null)
    setBusy(false)
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
      <AnimatePresence mode="wait">
        {view === 'select' ? (
          <motion.section
            key="select"
            className="space-y-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
          >
            <div className="rounded-3xl bg-white/90 p-4 shadow-xl">
              <h2 className="text-2xl font-black text-purple-900">育てるキャラ</h2>
              <p className="mt-1 text-sm font-bold text-zinc-700">キャラを押すと、くわしい画面に進むよ。</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  selected={selected.id === character.id}
                  onClick={() => openCharacter(character)}
                />
              ))}
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="detail"
            className="-mx-3 -mt-4 min-h-[calc(100vh-96px)] overflow-hidden bg-purple-950 pb-6 text-white shadow-2xl sm:-mx-4"
            style={{
              backgroundImage: `linear-gradient(rgba(27,9,58,.04),rgba(21,5,45,.72)), url(${ARENA_BG})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="p-3">
              <button
                type="button"
                onClick={() => setView('select')}
                className="min-h-11 rounded-full bg-white/20 px-4 text-sm font-black text-white shadow-lg backdrop-blur"
              >
                ← もどる
              </button>
            </div>

            <motion.div
              className="px-4 text-center"
              initial={{ y: 28, opacity: 0, scale: 0.88 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            >
              <img
                src={selected.url}
                alt={selected.name}
                className="mx-auto h-56 w-56 rounded-[2rem] border-4 border-white/80 bg-white object-contain shadow-[0_0_42px_rgba(255,255,255,.65)]"
              />
              <h2 className="mt-3 truncate text-3xl font-black drop-shadow">{shortBattleName(selected.name)}</h2>
              <p className="text-sm font-black text-yellow-200">
                Lv.{selected.level} / {selected.species} / 💎 {selected.crystals}
              </p>
            </motion.div>

            <div className="mt-4 px-4">
              <RadarChart character={selected} />
            </div>

            <div className="mx-4 mt-4 rounded-[2rem] bg-black/42 p-3 shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-xl font-black text-yellow-200">能力を変更する</h3>
                <AnimatePresence>
                  {consumeFlash > 0 && (
                    <motion.span
                      key={consumeFlash}
                      className="text-3xl"
                      initial={{ scale: 1.8, opacity: 1, rotate: 0 }}
                      animate={{ scale: 0, opacity: 0, rotate: 240, y: 26 }}
                      exit={{ opacity: 0 }}
                    >
                      💎
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2">
                {STAT_KEYS.map((key) => (
                  <StatRow
                    key={key}
                    label={STAT_LABELS[key]}
                    value={selected[key]}
                    disabled={busy || selected.crystals <= 0}
                    onChange={() => void runStatRoulette(key)}
                  />
                ))}
                <StatRow
                  label="属性"
                  value={selected.species}
                  disabled={busy || selected.crystals <= 0}
                  onChange={() => void runAttributeRoulette()}
                />
              </div>
              <p className="mt-3 rounded-2xl bg-white/12 p-3 text-sm font-bold text-white">{message}</p>
              <button
                type="button"
                onClick={startQuiz}
                disabled={busy || inQuiz}
                className="mt-3 min-h-14 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 text-2xl font-black text-zinc-950 shadow-xl disabled:opacity-50"
              >
                育てる
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inQuiz && currentQuestion && (
          <QuizOverlay
            question={currentQuestion}
            index={index}
            earned={earned}
            answerState={answerState}
            busy={busy}
            onAnswer={(value) => void answer(value)}
          />
        )}
        {slot && <SlotOverlay label={slot.label} value={slot.value} rolling={slot.rolling} />}
      </AnimatePresence>

      {view === 'detail' && (
        <div className="hidden">
          {ATTRIBUTES.map((attribute) => (
            <span key={attribute}>{attribute}</span>
          ))}
        </div>
      )}
    </div>
  )
}
