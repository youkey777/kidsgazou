import { useMemo, useState } from 'react'
import { updateImageStats, type ImageRecord } from '../db'
import { clampStat, starsForLevel } from './types'

type Props = {
  character: ImageRecord
  onClose: () => void
  onSaved: () => Promise<void> | void
}

const SPECIES = ['ドラゴン', 'まほう', 'ロボ', 'けもの', 'みず', 'ひかり', 'やみ', 'ふしぎ']
const ULTIMATES = ['きらきらバースト', 'ぐるぐるアタック', 'スターキャノン', 'にじいろスラッシュ']

function randomStat() {
  return Math.floor(25 + Math.random() * 65)
}

export default function StatsEditor({ character, onClose, onSaved }: Props) {
  const [hp, setHp] = useState(character.hp)
  const [atk, setAtk] = useState(character.atk)
  const [def, setDef] = useState(character.def)
  const [spd, setSpd] = useState(character.spd)
  const [species, setSpecies] = useState(character.species)
  const [ultimateName, setUltimateName] = useState(character.ultimateName)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const stars = useMemo(() => '★'.repeat(starsForLevel(character.level)), [character.level])

  const randomize = () => {
    setHp(randomStat())
    setAtk(randomStat())
    setDef(randomStat())
    setSpd(randomStat())
    setSpecies(SPECIES[Math.floor(Math.random() * SPECIES.length)])
    setUltimateName(ULTIMATES[Math.floor(Math.random() * ULTIMATES.length)])
    setMessage('ランダムでつよさを作ったよ')
  }

  const autoGenerate = async () => {
    try {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = character.url
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('画像を読めませんでした'))
      })
      const canvas = document.createElement('canvas')
      const size = 16
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas が使えません')
      context.drawImage(image, 0, 0, size, size)
      const data = context.getImageData(0, 0, size, size).data
      let red = 0
      let green = 0
      let blue = 0
      for (let i = 0; i < data.length; i += 4) {
        red += data[i]
        green += data[i + 1]
        blue += data[i + 2]
      }
      const pixels = data.length / 4
      red /= pixels
      green /= pixels
      blue /= pixels
      setAtk(clampStat(20 + red / 3))
      setDef(clampStat(20 + blue / 3))
      setSpd(clampStat(20 + green / 3))
      setHp(clampStat(45 + (red + green + blue) / 12))
      setSpecies(red > blue && red > green ? 'ほのお' : blue > green ? 'みず' : 'しぜん')
      setUltimateName(red + blue > green * 2 ? 'レインボーフラッシュ' : 'ミラクルスパーク')
      setMessage('画像の色からつよさを作ったよ')
    } catch {
      randomize()
      setMessage('画像解析ができなかったのでランダム生成したよ')
    }
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await updateImageStats(character.id, {
        hp: clampStat(hp),
        atk: clampStat(atk),
        def: clampStat(def),
        spd: clampStat(spd),
        species: species.trim() || 'ふしぎ',
        ultimateName: ultimateName.trim() || 'ひっさつわざ',
      })
      await onSaved()
      onClose()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const statRows = [
    ['HP', hp, setHp],
    ['ATK', atk, setAtk],
    ['DEF', def, setDef],
    ['SPD', spd, setSpd],
  ] as const

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/75 p-4 safe-top safe-bottom">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <img src={character.url} alt="" className="h-24 w-24 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black text-zinc-900">
              つよさへんしゅう
            </h2>
            <p className="truncate text-sm font-bold text-purple-700">{character.name}</p>
            <p className="mt-1 text-sm font-black text-yellow-500">
              Lv.{character.level} {stars}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-11 w-11 rounded-full bg-zinc-900 text-xl font-black text-white"
            aria-label="とじる"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {statRows.map(([label, value, setter]) => (
            <label key={label} className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-black text-zinc-700">{label}</span>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-black text-purple-700">
                  {value}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="99"
                value={value}
                onChange={(event) => setter(Number(event.target.value))}
                className="h-10 w-full accent-purple-600"
              />
            </label>
          ))}

          <label className="block">
            <span className="text-sm font-black text-zinc-700">種族（しゅぞく）</span>
            <input
              value={species}
              onChange={(event) => setSpecies(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl border-2 border-purple-200 px-3 text-base font-bold outline-none focus:border-purple-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-zinc-700">必殺技（ひっさつわざ）</span>
            <input
              value={ultimateName}
              onChange={(event) => setUltimateName(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl border-2 border-purple-200 px-3 text-base font-bold outline-none focus:border-purple-500"
            />
          </label>
        </div>

        {message && (
          <p className="mt-3 rounded-2xl bg-yellow-100 px-3 py-2 text-sm font-bold text-zinc-800">
            {message}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={randomize}
            className="min-h-12 rounded-2xl bg-cyan-500 px-3 py-3 font-black text-white shadow-lg"
          >
            ランダム生成
          </button>
          <button
            onClick={autoGenerate}
            className="min-h-12 rounded-2xl bg-fuchsia-500 px-3 py-3 font-black text-white shadow-lg"
          >
            画像から自動生成
          </button>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-3 min-h-14 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-lg font-black text-yellow-300 shadow-xl disabled:opacity-50"
        >
          {saving ? 'ほぞん中...' : 'このつよさでほぞん'}
        </button>
      </div>
    </div>
  )
}
