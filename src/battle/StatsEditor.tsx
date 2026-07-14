import { useMemo, useState } from 'react'
import { updateImageStats, type ImageRecord } from '../db'
import { isKingKarubi } from './battle-logic'
import {
  ATTRIBUTES,
  attributeMark,
  randomAttribute,
  randomStat,
  STAT_LABELS,
  type StatKey,
} from './character-rules'
import XpBar from './effects/XpBar'
import { clampStat, starsForLevel } from './types'

type Props = {
  character: ImageRecord
  onClose: () => void
  onSaved: () => Promise<void> | void
}

const ULTIMATES = ['きらきらバースト', 'ぐるぐるアタック', 'スターキャノン', 'にじいろスラッシュ']
const STAT_KEYS: StatKey[] = ['atk', 'def', 'spd', 'luck', 'tech']

export default function StatsEditor({ character, onClose, onSaved }: Props) {
  const [stats, setStats] = useState<Record<StatKey, number>>({
    atk: character.atk,
    def: character.def,
    spd: character.spd,
    luck: character.luck,
    tech: character.tech,
  })
  const [attribute, setAttribute] = useState(character.species)
  const [ultimateName, setUltimateName] = useState(character.ultimateName)
  const [ultimate4Name, setUltimate4Name] = useState(character.ultimate4Name || 'ひっさつわざ4')
  const [ultimate5Name, setUltimate5Name] = useState(character.ultimate5Name || 'ひっさつわざ5')
  const [ultimate6Name, setUltimate6Name] = useState(character.ultimate6Name || 'ひっさつわざ6')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const stars = useMemo(() => '★'.repeat(starsForLevel(character.level)), [character.level])

  const randomize = () => {
    setStats({
      atk: randomStat(),
      def: randomStat(),
      spd: randomStat(),
      luck: randomStat(),
      tech: randomStat(),
    })
    setAttribute(randomAttribute())
    setUltimateName(ULTIMATES[Math.floor(Math.random() * ULTIMATES.length)])
    setUltimate4Name(ULTIMATES[Math.floor(Math.random() * ULTIMATES.length)])
    setUltimate5Name(ULTIMATES[Math.floor(Math.random() * ULTIMATES.length)])
    setUltimate6Name(ULTIMATES[Math.floor(Math.random() * ULTIMATES.length)])
    setMessage('ランダムでパラメータを作(つく)ったよ')
  }

  const autoGenerate = async () => {
    try {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = character.url
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('画像(がぞう)を読(よ)めませんでした'))
      })
      const canvas = document.createElement('canvas')
      const size = 16
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas が使(つか)えません')
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
      setStats({
        atk: clampStat(15 + red / 3),
        def: clampStat(15 + blue / 3),
        spd: clampStat(15 + green / 3),
        luck: clampStat(10 + (red + blue) / 5),
        tech: clampStat(10 + (green + blue) / 5),
      })
      setAttribute(red > blue && red > green ? 'ほのお' : blue > green ? 'みず' : 'くさ')
      setUltimateName(red + blue > green * 2 ? 'レインボーフラッシュ' : 'ミラクルスパーク')
      setUltimate4Name(red > green ? 'スパークスラッシュ' : 'フルーツスピン')
      setUltimate5Name(red + blue > green * 2 ? 'レインボーフラッシュ' : 'ミラクルスパーク')
      setUltimate6Name(red > blue ? 'ゴールデンバースト' : 'スターライトキャノン')
      setMessage('画像(がぞう)の色(いろ)からパラメータを作(つく)ったよ')
    } catch {
      randomize()
      setMessage('画像解析(がぞうかいせき)ができなかったのでランダム生成(せいせい)したよ')
    }
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await updateImageStats(character.id, {
        atk: clampStat(stats.atk),
        def: clampStat(stats.def),
        spd: clampStat(stats.spd),
        luck: clampStat(stats.luck),
        tech: clampStat(stats.tech),
        species: attribute.trim() || 'ふしぎ',
        ultimateName: ultimateName.trim() || 'ひっさつわざ',
        ultimate4Name: ultimate4Name.trim() || 'ひっさつわざ4',
        ultimate5Name: ultimate5Name.trim() || 'ひっさつわざ5',
        ultimate6Name: ultimate6Name.trim() || 'ひっさつわざ6',
      })
      await onSaved()
      onClose()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/75 p-4 safe-top safe-bottom">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <img src={character.url} alt="" className="h-24 w-24 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black text-zinc-900">パラメータ編集(へんしゅう)</h2>
            <p className="truncate text-sm font-bold text-purple-700">{character.name}</p>
            <p className="mt-1 text-sm font-black text-yellow-500">
              Lv.{character.level} {stars} / 💎 {character.crystals}
            </p>
            <XpBar xp={character.xp} compact />
          </div>
          <button
            onClick={onClose}
            className="h-11 w-11 rounded-full bg-zinc-900 text-xl font-black text-white"
            aria-label="閉(と)じる"
          >
            ×
          </button>
        </div>

        {isKingKarubi(character) && (
          <section className="mt-4 overflow-hidden rounded-3xl border-4 border-yellow-200 bg-gradient-to-br from-red-950 via-amber-800 to-yellow-500 p-3 text-white shadow-[0_0_24px_rgba(251,191,36,.45)]">
            <div className="flex items-center gap-3">
              <img
                src="/battle/king-karubi-feast-20260714.png"
                alt="王冠(おうかん)つきの焼(や)きカルビ"
                className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_0_14px_rgba(253,224,71,.9)]"
              />
              <div className="min-w-0">
                <p className="text-xs font-black text-yellow-100">固有能力(こゆうのうりょく)</p>
                <h3 className="text-xl font-black">王(おう)のごちそう</h3>
                <p className="mt-1 text-sm font-bold leading-snug">
                  ダメージを受(う)けたとき、25%の確率(かくりつ)で焼(や)きカルビを食(た)べてHPが全回復(ぜんかいふく)！
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="mt-4 space-y-4">
          {STAT_KEYS.map((key) => (
            <label key={key} className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-black text-zinc-700">{STAT_LABELS[key]}</span>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-black text-purple-700">
                  {stats[key]}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="99"
                value={stats[key]}
                onChange={(event) =>
                  setStats((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
                className="h-10 w-full accent-purple-600"
              />
            </label>
          ))}

          <label className="block">
            <span className="text-sm font-black text-zinc-700">属性(ぞくせい)</span>
            <select
              value={attribute}
              onChange={(event) => setAttribute(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl border-2 border-purple-200 px-3 text-base font-bold outline-none focus:border-purple-500"
            >
              {ATTRIBUTES.map((item) => (
                <option key={item} value={item}>
                  {attributeMark(item)} {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-black text-zinc-700">必殺技(ひっさつわざ)</span>
            <input
              value={ultimateName}
              onChange={(event) => setUltimateName(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl border-2 border-purple-200 px-3 text-base font-bold outline-none focus:border-purple-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-zinc-700">4の必殺技(ひっさつわざ)</span>
            <input
              value={ultimate4Name}
              onChange={(event) => setUltimate4Name(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl border-2 border-purple-200 px-3 text-base font-bold outline-none focus:border-purple-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-zinc-700">5の必殺技(ひっさつわざ)</span>
            <input
              value={ultimate5Name}
              onChange={(event) => setUltimate5Name(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl border-2 border-purple-200 px-3 text-base font-bold outline-none focus:border-purple-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-zinc-700">6の必殺技(ひっさつわざ)</span>
            <input
              value={ultimate6Name}
              onChange={(event) => setUltimate6Name(event.target.value)}
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
            ランダム生成(せいせい)
          </button>
          <button
            onClick={autoGenerate}
            className="min-h-12 rounded-2xl bg-fuchsia-500 px-3 py-3 font-black text-white shadow-lg"
          >
            画像(がぞう)から自動生成(じどうせいせい)
          </button>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="mt-3 min-h-14 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-lg font-black text-yellow-300 shadow-xl disabled:opacity-50"
        >
          {saving ? '保存(ほぞん)中(ちゅう)...' : 'このパラメータで保存(ほぞん)'}
        </button>
      </div>
    </div>
  )
}
