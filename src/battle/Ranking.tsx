import { useEffect, useState } from 'react'
import { listBattleCharacters, listBattleRecords } from './battle-db'
import { buildRankingData, type RankingData } from './rank-data'
import type { ImageRecord } from '../db'
import XpBar from './effects/XpBar'

function RankCard({
  character,
  label,
}: {
  character: ImageRecord
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow">
      <img src={character.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-zinc-900">{character.name}</p>
        <p className="text-xs font-bold text-purple-700">
          {character.species} / Lv.{character.level}
        </p>
        <XpBar xp={character.xp} compact />
      </div>
      <span className="rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-zinc-900">
        {label}
      </span>
    </div>
  )
}

export default function Ranking() {
  const [data, setData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [characters, records] = await Promise.all([
        listBattleCharacters(),
        listBattleRecords(),
      ])
      if (!cancelled) {
        setData(buildRankingData(characters, records))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="rounded-3xl bg-white/85 p-6 text-center font-black text-purple-800">
        ランキングをよみこみ中(ちゅう)...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-purple-100 p-3 shadow-lg">
        <h3 className="mb-2 text-lg font-black text-purple-900">通算勝利(つうさんしょうり) Top10</h3>
        <div className="space-y-2">
          {data.totalWins.map((character) => (
            <RankCard key={character.id} character={character} label={`${character.wins}勝(しょう)`} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-pink-100 p-3 shadow-lg">
        <h3 className="mb-2 text-lg font-black text-pink-900">連勝中(れんしょうちゅう) Top5</h3>
        <div className="space-y-2">
          {data.streaks.map((character) => (
            <RankCard
              key={character.id}
              character={character}
              label={`${character.streak}連勝(れんしょう)`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-yellow-100 p-3 shadow-lg">
        <h3 className="mb-2 text-lg font-black text-yellow-900">今日(きょう)のMVP</h3>
        {data.todayMvp ? (
          <RankCard character={data.todayMvp} label="MVP" />
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm font-bold text-zinc-700">
            今日(きょう)はまだバトル記録(きろく)がないよ。
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-cyan-100 p-3 shadow-lg">
        <h3 className="mb-2 text-lg font-black text-cyan-900">属性別(ぞくせいべつ) 最強(さいきょう)</h3>
        <div className="space-y-2">
          {data.speciesChampions.map((character) => (
            <RankCard
              key={`${character.species}-${character.id}`}
              character={character}
              label={`${character.species}`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-zinc-900 p-3 shadow-lg">
        <h3 className="mb-2 text-lg font-black text-white">チーム戦(せん) 直近(ちょっきん)10件(けん)</h3>
        {data.recentTeamRecords.length === 0 ? (
          <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-white">
            まだチーム戦(せん)の記録(きろく)がないよ。
          </p>
        ) : (
          <div className="space-y-2">
            {data.recentTeamRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl bg-white/10 p-3 text-sm font-black text-white"
              >
                {record.winnerTeam === 'rui' ? '🦖 ルイチーム' : '🌸 ミオチーム'} 勝利(しょうり)
                <span className="ml-2 text-xs text-white/70">
                  {new Date(record.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
