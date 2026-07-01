import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  updateImageProfile,
  type ImageStatsUpdate,
  type ImageRecord,
} from '../db'
import {
  ATTRIBUTES,
  attributeMark,
  randomAttribute,
  randomStat,
  STAT_CHART_LABELS,
  STAT_LABELS,
  type StatKey,
} from './character-rules'
import XpBar from './effects/XpBar'
import {
  playCrystal,
  playRouletteStart,
  playRouletteStop,
  playRouletteTick,
  playSelect,
} from './sounds'
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
type BulkCandidate = {
  id: string
  url: string
  currentName: string
  name: string
  species: string
  atk: number
  def: number
  spd: number
  luck: number
  tech: number
  status: 'waiting' | 'reading' | 'ready' | 'error'
}

const STAT_KEYS: StatKey[] = ['atk', 'def', 'spd', 'luck', 'tech']
const ARENA_BG = '/battle/training-arena-bg.png'
const SLOT_BG = '/battle/roulette-frame-bg.png'

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function makeQuestion(): MathQuestion {
  const op: '+' | '-' = Math.random() > 0.45 ? '+' : '-'
  const twoDigit = () => Math.floor(Math.random() * 10) + 10
  const oneDigit = () => Math.floor(Math.random() * 9) + 1
  const twoDigitFirst = Math.random() < 0.62
  const a = twoDigitFirst ? twoDigit() : oneDigit()
  const b = twoDigitFirst ? oneDigit() : twoDigit()
  const left = op === '-' ? Math.max(a, b) : a
  const right = op === '-' ? Math.min(a, b) : b
  const answer = op === '+' ? left + right : left - right
  const options = new Set<number>([answer])
  while (options.size < 3) {
    options.add(Math.max(0, answer + Math.floor(Math.random() * 17) - 8))
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

function cleanOcrName(text: string, fallback: string) {
  const candidates = text
    .split(/\r?\n/)
    .map((line, index) => ({
      index,
      value: line
        .replace(/[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}a-zA-Z0-9ー・ぁ-んァ-ン一-龠]/gu, '')
        .trim()
        .replace(/ゴツド/g, 'ゴッド')
        .replace(/ゴ一ルド/g, 'ゴールド')
        .replace(/マネ一/g, 'マネー'),
    }))
    .filter((item) => item.value.length >= 2 && item.value.length <= 18)
    .filter((item) => !/^(file|png|jpg|jpeg|Lv|HP|ATK|DEF|SPD)$/i.test(item.value))

  const joined = candidates.map((item) => item.value).join('')
  if (/ゴ.{0,3}ド.*ゴ.{0,3}ルド.*マネ/.test(joined) || /ゴッド|ゴールド|マネー/.test(joined)) {
    return 'ゴッドゴールドマネー'
  }

  const scored = candidates
    .map((item) => {
      const hasJapanese = /[ぁ-んァ-ン一-龠]/.test(item.value)
      const katakanaCount = item.value.match(/[ァ-ンー]/g)?.length ?? 0
      const bottomBonus = item.index * 0.18
      const score = item.value.length + katakanaCount * 1.8 + (hasJapanese ? 8 : 0) + bottomBonus
      return { ...item, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored[0]?.value ?? fallback
}

function makeRandomCandidate(character: ImageRecord): BulkCandidate {
  return {
    id: character.id,
    url: character.url,
    currentName: character.name,
    name: character.name,
    species: randomAttribute(),
    atk: randomStat(),
    def: randomStat(),
    spd: randomStat(),
    luck: randomStat(),
    tech: randomStat(),
    status: 'waiting',
  }
}

function RadarChart({ character }: { character: ImageRecord }) {
  const center = 112
  const maxRadius = 82
  const axisPoints = STAT_KEYS.map((key, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STAT_KEYS.length
    const radius = (character[key] / 99) * maxRadius
    return {
      key,
      label: STAT_CHART_LABELS[key],
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
          key={polygon}
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
          Lv.{character.level} / 属性(ぞくせい): {attributeMark(character.species)} {character.species}
        </p>
        <p className="text-xs font-black text-cyan-700">💎 {character.crystals}こ</p>
        <XpBar xp={character.xp} compact />
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
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(3rem,auto)_5.7rem] items-center gap-2 rounded-2xl bg-white/12 px-3 py-2 ring-1 ring-white/15">
      <p className="min-w-0 whitespace-normal break-keep text-sm font-black leading-tight text-white sm:text-base">{label}</p>
      <p className="min-w-12 break-words text-right text-2xl font-black leading-tight text-yellow-200">{value}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className="min-h-11 w-[5.7rem] rounded-xl bg-white px-2 text-xs font-black leading-tight text-purple-800 shadow-lg disabled:bg-white/25 disabled:text-white/50"
      >
        変更(へんこう)
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
              {answerState === 'correct' ? '正解(せいかい)！クリスタルゲット！' : `おしい！こたえは ${question.answer}`}
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
  const displayValue =
    typeof value === 'string' && value !== '？' ? `${attributeMark(value)} ${value}` : (value ?? '？')
  const reelItems = Array.from({ length: 10 }, (_, index) => {
    if (typeof value === 'number') return Math.max(1, Math.min(99, value + index - 5))
    return displayValue
  })

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
        <motion.p
          className="rounded-full bg-black/65 px-4 py-2 text-lg font-black text-yellow-200 shadow-xl ring-1 ring-yellow-200/50"
          animate={{ boxShadow: ['0 0 12px rgba(250,204,21,.35)', '0 0 34px rgba(250,204,21,.9)', '0 0 12px rgba(250,204,21,.35)'] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          {label}
        </motion.p>
        <div
          className="relative mx-auto mt-5 h-[420px] max-w-[320px] overflow-hidden rounded-[2.4rem] bg-center bg-cover shadow-[0_0_55px_rgba(250,204,21,.8)]"
          style={{ backgroundImage: `url(${SLOT_BG})` }}
          data-current={String(displayValue)}
          data-reel-count={reelItems.length}
        >
          <motion.div
            className="absolute -inset-14 rounded-full bg-[conic-gradient(from_0deg,#fde047,#22d3ee,#f0abfc,#fb7185,#fde047)] opacity-55 blur-sm"
            animate={{ rotate: rolling ? 360 : 720, scale: rolling ? [1, 1.08, 1] : [1.16, 1, 1.08] }}
            transition={{ duration: rolling ? 1.1 : 0.75, repeat: rolling ? Infinity : 0, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-x-12 top-[37%] h-28 rounded-[2rem] border border-white/35 bg-black/55 shadow-inner"
            animate={{ scale: rolling ? [0.96, 1, 0.96] : 1 }}
            transition={{ duration: 0.42, repeat: rolling ? Infinity : 0 }}
          />
          {Array.from({ length: 12 }).map((_, index) => (
            <motion.span
              key={index}
              className="absolute h-2 w-2 rounded-full bg-yellow-200 shadow-[0_0_12px_rgba(250,204,21,.9)]"
              style={{ left: `${12 + ((index * 31) % 76)}%`, top: `${10 + ((index * 47) % 78)}%` }}
              animate={{ y: rolling ? [0, -18, 0] : [0, -32], opacity: rolling ? [0.45, 1, 0.45] : [1, 0] }}
              transition={{ duration: 0.8 + index * 0.04, repeat: rolling ? Infinity : 0, delay: index * 0.03 }}
            />
          ))}
          <motion.div
            className={`absolute inset-x-0 top-[50%] -translate-y-1/2 text-center font-black text-white drop-shadow-[0_0_24px_rgba(255,255,255,.95)] ${
              typeof value === 'string' ? 'text-4xl' : 'text-7xl'
            }`}
            animate={rolling ? { y: [-180, -90, 0, 90, 180], opacity: [0, 1, 1, 1, 0], filter: ['blur(3px)', 'blur(1px)', 'blur(0px)', 'blur(1px)', 'blur(3px)'] } : { y: 0, scale: [0.6, 1.32, 1], rotateX: [0, 18, 0] }}
            transition={rolling ? { duration: 0.46, repeat: Infinity, ease: 'linear' } : { duration: 0.72, ease: 'backOut' }}
          >
            {typeof value === 'string' && value !== '？' ? `${attributeMark(value)} ${value}` : (value ?? '？')}
          </motion.div>
          <div className="absolute inset-x-14 top-[50%] h-1 -translate-y-1/2 rounded-full bg-yellow-200/90 shadow-[0_0_18px_rgba(250,204,21,.9)]" />
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

function BulkUpdateOverlay({
  candidates,
  busy,
  onNameChange,
  onClose,
  onSave,
}: {
  candidates: BulkCandidate[]
  busy: boolean
  onNameChange: (id: string, name: string) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/95 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="mx-auto max-w-md space-y-3 pb-10">
        <div className="sticky top-0 z-10 rounded-3xl bg-black/65 p-4 shadow-2xl backdrop-blur">
          <h3 className="text-xl font-black text-yellow-200">キャラ設定(せってい)をまとめて更新(こうしん)</h3>
          <p className="mt-1 text-sm font-bold text-white/80">
            読(よ)み取(と)った名前(なまえ)を確認(かくにん)して、違(ちが)っていたら直(なお)してね。
          </p>
        </div>
        {candidates.map((candidate) => (
          <div key={candidate.id} className="rounded-3xl bg-white/12 p-3 shadow-xl ring-1 ring-white/20">
            <div className="flex gap-3">
              <img src={candidate.url} alt="" className="h-20 w-20 rounded-2xl bg-white object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white/60">現在(げんざい): {candidate.currentName}</p>
                <input
                  value={candidate.name}
                  onChange={(event) => onNameChange(candidate.id, event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-2xl bg-white px-3 text-base font-black text-zinc-950"
                  disabled={busy}
                />
                <p className="mt-1 text-xs font-black text-cyan-200">
                  {candidate.status === 'reading'
                    ? '読(よ)み取(と)り中(ちゅう)...'
                    : candidate.status === 'error'
                      ? '読(よ)み取(と)り失敗(しっぱい)。手(て)で直(なお)せます。'
                      : '確認(かくにん)OK'}
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs font-black">
              <span className="rounded-full bg-yellow-300 px-2 py-1 text-zinc-900">属性(ぞくせい) {attributeMark(candidate.species)} {candidate.species}</span>
              <span className="rounded-full bg-white/15 px-2 py-1">攻(こう) {candidate.atk}</span>
              <span className="rounded-full bg-white/15 px-2 py-1">防(ぼう) {candidate.def}</span>
              <span className="rounded-full bg-white/15 px-2 py-1">速(そく) {candidate.spd}</span>
              <span className="rounded-full bg-white/15 px-2 py-1">運(うん) {candidate.luck}</span>
              <span className="rounded-full bg-white/15 px-2 py-1">技(わざ) {candidate.tech}</span>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-13 rounded-2xl bg-white/20 font-black text-white disabled:opacity-50"
          >
            やめる
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy || candidates.length === 0}
            className="min-h-13 rounded-2xl bg-yellow-300 font-black text-zinc-950 shadow-xl disabled:opacity-50"
          >
            保存(ほぞん)する
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Training({ characters, onChanged }: Props) {
  const [localCharacters, setLocalCharacters] = useState<ImageRecord[]>(characters)
  const [view, setView] = useState<TrainingView>('select')
  const [selectedId, setSelectedId] = useState(characters[0]?.id ?? '')
  const selected = useMemo(
    () => localCharacters.find((character) => character.id === selectedId) ?? localCharacters[0] ?? null,
    [localCharacters, selectedId]
  )
  const [quiz, setQuiz] = useState<MathQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [earned, setEarned] = useState(0)
  const quizBaseCrystalsRef = useRef(0)
  const crystalFloorRef = useRef<Record<string, number>>({})
  const [quizSaveError, setQuizSaveError] = useState<string | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('キャラを選(えら)んで育(そだ)てよう！')
  const [slot, setSlot] = useState<{ label: string; value: number | string | null; rolling: boolean } | null>(null)
  const [consumeFlash, setConsumeFlash] = useState(0)
  const [bulkCandidates, setBulkCandidates] = useState<BulkCandidate[] | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [profileDraft, setProfileDraft] = useState({
    name: selected?.name ?? '',
    ultimate4Name: selected?.ultimate4Name ?? 'ひっさつわざ4',
    ultimate5Name: selected?.ultimate5Name ?? 'ひっさつわざ5',
    ultimate6Name: selected?.ultimate6Name ?? 'ひっさつわざ6',
  })
  const [profileSaving, setProfileSaving] = useState(false)

  const currentQuestion = quiz[index]
  const inQuiz = quiz.length > 0 && index < quiz.length

  useEffect(() => {
    setLocalCharacters(
      characters.map((character) => {
        const crystalFloor = crystalFloorRef.current[character.id]
        return crystalFloor !== undefined && character.crystals < crystalFloor
          ? { ...character, crystals: crystalFloor }
          : character
      })
    )
    if (!characters.some((character) => character.id === selectedId)) {
      setSelectedId(characters[0]?.id ?? '')
    }
  }, [characters, selectedId])

  useEffect(() => {
    if (!selected) return
    setProfileDraft({
      name: selected.name,
      ultimate4Name: selected.ultimate4Name || selected.ultimateName || 'ひっさつわざ4',
      ultimate5Name: selected.ultimate5Name || selected.ultimateName || 'ひっさつわざ5',
      ultimate6Name: selected.ultimate6Name || selected.ultimateName || 'ひっさつわざ6',
    })
  }, [selected])

  const patchLocalCharacter = (id: string, patch: Partial<ImageRecord>) => {
    setLocalCharacters((current) =>
      current.map((character) => (character.id === id ? { ...character, ...patch } : character))
    )
  }

  const openCharacter = (character: ImageRecord) => {
    playSelect()
    setSelectedId(character.id)
    setQuiz([])
    setIndex(0)
    setEarned(0)
    setQuizSaveError(null)
    setAnswerState('idle')
    setMessage(`${shortBattleName(character.name)}を育(そだ)てよう！`)
    setView('detail')
  }

  const saveProfileDraft = async () => {
    if (!selected || profileSaving) return
    setProfileSaving(true)
    const namePatch = { name: profileDraft.name.trim() || selected.name }
    const ultimatePatch = {
      ultimate4Name: profileDraft.ultimate4Name.trim() || 'ひっさつわざ4',
      ultimate5Name: profileDraft.ultimate5Name.trim() || 'ひっさつわざ5',
      ultimate6Name: profileDraft.ultimate6Name.trim() || 'ひっさつわざ6',
    }
    try {
      await updateImageProfile(selected.id, namePatch)
      patchLocalCharacter(selected.id, namePatch)
      await onChanged()
      patchLocalCharacter(selected.id, namePatch)
      try {
        await updateImageProfile(selected.id, ultimatePatch)
        patchLocalCharacter(selected.id, ultimatePatch)
        setMessage('名前(なまえ)と必殺技(ひっさつわざ)を保存(ほぞん)しました！')
        await onChanged()
        patchLocalCharacter(selected.id, { ...namePatch, ...ultimatePatch })
      } catch (ultimateError) {
        setMessage(`名前(なまえ)は保存(ほぞん)しました。必殺技(ひっさつわざ)は追加SQLが必要(ひつよう)です: ${(ultimateError as Error).message}`)
      }
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setProfileSaving(false)
    }
  }

  const startQuiz = () => {
    if (!selected || busy) return
    playSelect()
    quizBaseCrystalsRef.current = selected.crystals
    setQuiz(makeQuiz())
    setIndex(0)
    setEarned(0)
    setQuizSaveError(null)
    setAnswerState('idle')
    setMessage(`${shortBattleName(selected.name)}を育(そだ)てるよ！`)
  }

  const answer = async (value: number) => {
    if (!selected || !currentQuestion || busy) return
    setBusy(true)
    const correct = value === currentQuestion.answer
    const nextEarned = earned + (correct ? 1 : 0)
    const currentCrystals = localCharacters.find((character) => character.id === selected.id)?.crystals ?? selected.crystals
    let saveError: string | null = null
    setAnswerState(correct ? 'correct' : 'wrong')
    if (correct) {
      playCrystal()
      setEarned(nextEarned)
      const nextCrystals = currentCrystals + 1
      setMessage('正解(せいかい)！クリスタルを1こゲット！')
      patchLocalCharacter(selected.id, { crystals: nextCrystals })
      try {
        await updateImageProfile(selected.id, { crystals: nextCrystals })
      } catch (error) {
        saveError = (error as Error).message
        setQuizSaveError(saveError)
        patchLocalCharacter(selected.id, { crystals: currentCrystals })
        setMessage(`クリスタル保存(ほぞん)に失敗(しっぱい)しました: ${saveError}`)
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
      const finalSaveError = saveError || quizSaveError
      if (finalSaveError) {
        setMessage(`保存(ほぞん)できていません。Supabase SQL を先(さき)に実行(じっこう)してください: ${finalSaveError}`)
      } else {
        setMessage(`育成(いくせい)おわり！クリスタル ${nextEarned}こゲット！`)
        const finalCrystals = quizBaseCrystalsRef.current + nextEarned
        try {
          if (nextEarned > 0) {
            await updateImageProfile(selected.id, { crystals: finalCrystals })
            crystalFloorRef.current[selected.id] = finalCrystals
            patchLocalCharacter(selected.id, { crystals: finalCrystals })
          }
          await onChanged()
          if (nextEarned > 0) patchLocalCharacter(selected.id, { crystals: finalCrystals })
        } catch (error) {
          const saveError = (error as Error).message
          setQuizSaveError(saveError)
          patchLocalCharacter(selected.id, { crystals: quizBaseCrystalsRef.current })
          setMessage(`繧ｯ繝ｪ繧ｹ繧ｿ繝ｫ菫晏ｭ・縺ｻ縺槭ｓ)縺ｫ螟ｱ謨・縺励∪縺励◆: ${saveError}`)
        }
      }
    } else {
      setIndex(nextIndex)
    }
    setBusy(false)
  }

  const runStatRoulette = async (stat: StatKey) => {
    if (!selected || selected.crystals <= 0 || busy) return
    setBusy(true)
    playRouletteStart()
    const nextCrystals = Math.max(0, selected.crystals - 1)
    setConsumeFlash((value) => value + 1)
    setSlot({ label: `${STAT_LABELS[stat]}を変更(へんこう)中(ちゅう)`, value: null, rolling: true })
    for (let i = 0; i < 20; i++) {
      setSlot({ label: `${STAT_LABELS[stat]}を変更(へんこう)中(ちゅう)`, value: randomStat(), rolling: true })
      playRouletteTick()
      await sleep(38 + i * 7)
    }
    const nextValue = randomStat()
    playRouletteStop()
    setSlot({ label: `${STAT_LABELS[stat]}が決定(けってい)！`, value: nextValue, rolling: false })
    try {
      await updateImageProfile(selected.id, {
        [stat]: nextValue,
        crystals: nextCrystals,
      } as ImageStatsUpdate)
      crystalFloorRef.current[selected.id] = nextCrystals
      patchLocalCharacter(selected.id, {
        [stat]: nextValue,
        crystals: nextCrystals,
      } as Partial<ImageRecord>)
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
    playRouletteStart()
    const nextCrystals = Math.max(0, selected.crystals - 1)
    setConsumeFlash((value) => value + 1)
    setSlot({ label: '属性(ぞくせい)を変更(へんこう)中(ちゅう)', value: null, rolling: true })
    for (let i = 0; i < 16; i++) {
      setSlot({ label: '属性(ぞくせい)を変更(へんこう)中(ちゅう)', value: randomAttribute(), rolling: true })
      playRouletteTick()
      await sleep(52 + i * 8)
    }
    const nextAttribute = randomAttribute()
    playRouletteStop()
    setSlot({ label: '属性(ぞくせい)が決定(けってい)！', value: nextAttribute, rolling: false })
    try {
      await updateImageProfile(selected.id, {
        species: nextAttribute,
        crystals: nextCrystals,
      })
      crystalFloorRef.current[selected.id] = nextCrystals
      patchLocalCharacter(selected.id, {
        species: nextAttribute,
        crystals: nextCrystals,
      })
      setMessage(`属性(ぞくせい)が「${nextAttribute}」になった！`)
      await onChanged()
    } catch (error) {
      setMessage((error as Error).message)
    }
    await sleep(900)
    setSlot(null)
    setBusy(false)
  }

  const startBulkUpdate = async () => {
    if (bulkBusy || localCharacters.length === 0) return
    setBulkBusy(true)
    const initial = localCharacters.map(makeRandomCandidate)
    setBulkCandidates(initial)

    let recognize: ((url: string, languages: string) => Promise<{ data: { text: string } }>) | null = null
    try {
      recognize = (await import('tesseract.js')).recognize
    } catch {
      recognize = null
    }

    for (const character of localCharacters) {
      setBulkCandidates((current) =>
        (current ?? initial).map((item) =>
          item.id === character.id ? { ...item, status: 'reading' } : item
        )
      )

      try {
        if (!recognize) throw new Error('OCR unavailable')
        const result = await recognize(character.url, 'jpn+eng')
        const name = cleanOcrName(result.data.text, character.name)
        setBulkCandidates((current) =>
          (current ?? initial).map((item) =>
            item.id === character.id ? { ...item, name, status: 'ready' } : item
          )
        )
      } catch {
        setBulkCandidates((current) =>
          (current ?? initial).map((item) =>
            item.id === character.id ? { ...item, status: 'error' } : item
          )
        )
      }
    }
    setBulkBusy(false)
  }

  const updateBulkName = (id: string, name: string) => {
    setBulkCandidates((current) =>
      current?.map((item) => (item.id === id ? { ...item, name } : item)) ?? null
    )
  }

  const saveBulkUpdate = async () => {
    if (!bulkCandidates || bulkBusy) return
    setBulkBusy(true)
    try {
      for (const candidate of bulkCandidates) {
        const name = candidate.name.trim() || candidate.currentName
        await updateImageProfile(candidate.id, {
          name,
          species: candidate.species,
          atk: candidate.atk,
          def: candidate.def,
          spd: candidate.spd,
          luck: candidate.luck,
          tech: candidate.tech,
        })
        patchLocalCharacter(candidate.id, {
          name,
          species: candidate.species,
          atk: candidate.atk,
          def: candidate.def,
          spd: candidate.spd,
          luck: candidate.luck,
          tech: candidate.tech,
        })
      }
      setBulkCandidates(null)
      setMessage('キャラ設定(せってい)をまとめて更新(こうしん)しました！')
      await onChanged()
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBulkBusy(false)
    }
  }

  if (!selected) {
    return (
      <div className="rounded-3xl bg-white/85 p-6 text-center font-black text-purple-800">
        まだキャラがいないよ。画像(がぞう)を追加(ついか)してね。
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
              <h2 className="text-2xl font-black text-purple-900">育(そだ)てるキャラ</h2>
              <p className="mt-1 text-sm font-bold text-zinc-700">キャラを押(お)すと、くわしい画面(がめん)に進(すす)むよ。</p>
              <button
                type="button"
                onClick={() => void startBulkUpdate()}
                disabled={bulkBusy || localCharacters.length === 0}
                className="mt-3 min-h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-yellow-300 px-3 text-sm font-black text-zinc-950 shadow-lg disabled:opacity-50"
              >
                全員(ぜんいん)の名前(なまえ)・能力(のうりょく)・属性(ぞくせい)を更新(こうしん)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {localCharacters.map((character) => (
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
            className="-mx-3 -mt-4 flex min-h-[calc(100vh-96px)] flex-col overflow-hidden bg-purple-950 pb-6 text-white shadow-2xl sm:-mx-4"
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
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-black/55 px-3 py-1 text-sm font-black text-white shadow-lg">
                  Lv.{selected.level}
                </span>
                <span className="rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-purple-950 shadow-[0_0_20px_rgba(250,204,21,.65)]">
                  属性(ぞくせい): {attributeMark(selected.species)} {selected.species}
                </span>
                <span className="rounded-full bg-cyan-200 px-3 py-1 text-sm font-black text-purple-950 shadow-[0_0_20px_rgba(34,211,238,.55)]">
                  所持(しょじ) 💎 {selected.crystals}こ
                </span>
              </div>
              <div className="mx-auto max-w-56">
                <XpBar xp={selected.xp} />
              </div>
            </motion.div>

            <div className="order-last mx-4 mt-4 rounded-[2rem] bg-black/42 p-3 shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
              <h3 className="mb-3 text-left text-xl font-black text-yellow-200">
                名前(なまえ)を編集(へんしゅう)
              </h3>
              <div className="space-y-2">
                <label className="block text-left">
                  <span className="text-sm font-black text-cyan-100">名前(なまえ)</span>
                  <input
                    value={profileDraft.name}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                    className="mt-1 min-h-12 w-full rounded-2xl bg-white px-3 text-base font-black text-zinc-950"
                  />
                </label>
                <label className="block text-left">
                  <span className="text-sm font-black text-cyan-100">4の必殺技(ひっさつわざ)</span>
                  <input
                    value={profileDraft.ultimate4Name}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, ultimate4Name: event.target.value }))}
                    className="mt-1 min-h-12 w-full rounded-2xl bg-white px-3 text-base font-black text-zinc-950"
                  />
                </label>
                <label className="block text-left">
                  <span className="text-sm font-black text-cyan-100">5の必殺技(ひっさつわざ)</span>
                  <input
                    value={profileDraft.ultimate5Name}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, ultimate5Name: event.target.value }))}
                    className="mt-1 min-h-12 w-full rounded-2xl bg-white px-3 text-base font-black text-zinc-950"
                  />
                </label>
                <label className="block text-left">
                  <span className="text-sm font-black text-cyan-100">6の必殺技(ひっさつわざ)</span>
                  <input
                    value={profileDraft.ultimate6Name}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, ultimate6Name: event.target.value }))}
                    className="mt-1 min-h-12 w-full rounded-2xl bg-white px-3 text-base font-black text-zinc-950"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveProfileDraft()}
                  disabled={profileSaving}
                  className="min-h-13 w-full rounded-2xl bg-cyan-300 text-base font-black text-purple-950 shadow-xl disabled:opacity-50"
                >
                  {profileSaving ? '保存(ほぞん)中(ちゅう)...' : '保存(ほぞん)する'}
                </button>
              </div>
            </div>

            <div className="mt-4 px-4">
              <RadarChart character={selected} />
            </div>

            <div className="mx-4 mt-4 rounded-[2rem] bg-white/14 p-3 text-center shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
              <p className="text-sm font-black text-cyan-100">
                クリスタル: <span className="text-2xl text-white">💎 {selected.crystals}</span> こ
              </p>
              <button
                type="button"
                onClick={startQuiz}
                disabled={busy || inQuiz}
                className="mt-2 min-h-14 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 text-2xl font-black text-zinc-950 shadow-xl disabled:opacity-50"
              >
                育(そだ)てる
              </button>
              <p className="mt-3 rounded-2xl bg-black/35 p-3 text-sm font-bold text-white">{message}</p>
            </div>

            <div className="mx-4 mt-4 rounded-[2rem] bg-black/42 p-3 shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-xl font-black text-yellow-200">能力(のうりょく)を変更(へんこう)する</h3>
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
                  label="属性(ぞくせい)"
                  value={`${attributeMark(selected.species)} ${selected.species}`}
                  disabled={busy || selected.crystals <= 0}
                  onChange={() => void runAttributeRoulette()}
                />
              </div>
              {selected.crystals <= 0 && (
                <p className="mt-3 rounded-2xl bg-white/12 p-3 text-sm font-bold text-white">
                  能力(のうりょく)を変更(へんこう)するには、先(さき)に育(そだ)ててクリスタルを集(あつ)めてね。
                </p>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkCandidates && (
          <BulkUpdateOverlay
            candidates={bulkCandidates}
            busy={bulkBusy}
            onNameChange={updateBulkName}
            onClose={() => !bulkBusy && setBulkCandidates(null)}
            onSave={() => void saveBulkUpdate()}
          />
        )}
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
