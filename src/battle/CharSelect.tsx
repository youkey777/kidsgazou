import type { ImageRecord } from '../db'
import { attributeMark } from './character-rules'
import XpBar from './effects/XpBar'
import { starsForLevel } from './types'

type Props = {
  title: string
  characters: ImageRecord[]
  selectedId: string | null
  onSelect: (character: ImageRecord) => void
}

export default function CharSelect({ title, characters, selectedId, onSelect }: Props) {
  const pages = Array.from({ length: Math.ceil(characters.length / 9) }, (_, index) =>
    characters.slice(index * 9, index * 9 + 9)
  )

  return (
    <section className="rounded-3xl bg-white/85 p-3 shadow-lg">
      <h3 className="mb-2 text-base font-black text-zinc-900">{title}</h3>
      {characters.length === 0 ? (
        <p className="rounded-2xl bg-purple-100 p-4 text-sm font-bold text-purple-800">
          まだキャラがいないよ。ルイかミオのタブで画像(がぞう)を追加(ついか)してね。
        </p>
      ) : (
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
          {pages.map((page, pageIndex) => (
            <div key={pageIndex} className="grid min-w-full snap-start grid-cols-3 gap-2">
              {page.map((character) => {
                const selected = character.id === selectedId
                return (
                  <button
                    key={character.id}
                    onClick={() => onSelect(character)}
                    className={`min-h-28 rounded-2xl border-4 bg-white p-1 text-left shadow active:scale-95 ${
                      selected ? 'border-yellow-400 ring-4 ring-yellow-200' : 'border-white'
                    }`}
                  >
                    <img
                      src={character.url}
                      alt=""
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                    <p className="mt-1 truncate text-xs font-black text-zinc-900">
                      {character.name}
                    </p>
                    <p className="truncate text-[11px] font-bold text-purple-700">
                      Lv.{character.level} {'★'.repeat(starsForLevel(character.level))}
                    </p>
                    <p className="truncate text-[11px] font-black text-yellow-700">
                      {attributeMark(character.species)} {character.species}
                    </p>
                    <XpBar xp={character.xp} compact />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
