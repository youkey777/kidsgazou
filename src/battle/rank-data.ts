import type { ImageRecord } from '../db'
import type { BattleRecord } from './types'

export type RankingData = {
  totalWins: ImageRecord[]
  streaks: ImageRecord[]
  todayMvp: ImageRecord | null
  speciesChampions: ImageRecord[]
  recentTeamRecords: BattleRecord[]
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function buildRankingData(
  characters: ImageRecord[],
  records: BattleRecord[]
): RankingData {
  const byId = new Map(characters.map((character) => [character.id, character]))
  const totalWins = [...characters].sort((a, b) => b.wins - a.wins).slice(0, 10)
  const streaks = [...characters].sort((a, b) => b.streak - a.streak).slice(0, 5)

  const todayWins = new Map<string, { wins: number; battles: number }>()
  const today = records.filter((record) => record.createdAt >= startOfToday())
  for (const record of today) {
    if (record.winnerId) {
      const current = todayWins.get(record.winnerId) ?? { wins: 0, battles: 0 }
      current.wins += 1
      current.battles += 1
      todayWins.set(record.winnerId, current)
    }
    if (record.loserId) {
      const current = todayWins.get(record.loserId) ?? { wins: 0, battles: 0 }
      current.battles += 1
      todayWins.set(record.loserId, current)
    }
  }

  const todayMvpId = [...todayWins.entries()]
    .sort((a, b) => {
      const aRate = a[1].wins / Math.max(1, a[1].battles)
      const bRate = b[1].wins / Math.max(1, b[1].battles)
      return bRate - aRate || b[1].wins - a[1].wins
    })
    .at(0)?.[0]

  const speciesMap = new Map<string, ImageRecord>()
  for (const character of characters) {
    const species = character.species || 'ふしぎ'
    const current = speciesMap.get(species)
    if (!current || character.wins > current.wins) {
      speciesMap.set(species, character)
    }
  }

  return {
    totalWins,
    streaks,
    todayMvp: todayMvpId ? byId.get(todayMvpId) ?? null : null,
    speciesChampions: [...speciesMap.values()].sort((a, b) => b.wins - a.wins),
    recentTeamRecords: records.filter((record) => record.mode === 'team').slice(0, 10),
  }
}
