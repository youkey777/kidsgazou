import { useEffect, useMemo, useRef, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import { calculateDiceDamage } from './character-rules'
import type { AttackEffectData } from './effects/AttackFlyEffect'
import BattleStage from './effects/BattleStage'
import VictoryOverlay from './effects/VictoryOverlay'
import {
  createBattleRoom,
  chooseOnlineCharacter,
  getBattleRoom,
  getOnlinePlayerId,
  joinBattleRoom,
  sendOnlineHand,
  startOnlineBattle,
  updateOnlineBattle,
  type BattleRoom,
  type OnlineSide,
} from './online-db'
import { playAttributeHit, playAttributeWhoosh, playDamage, playDiceLand, playDiceRoll, playRpsReveal, playSelect } from './sounds'
import { HAND_LABELS, type DamageEvent, type RpsHand, makeEventId, shortBattleName } from './types'

type Props = {
  characters: ImageRecord[]
  onDone: () => Promise<void> | void
  onExit: () => void
}

const HANDS: RpsHand[] = ['rock', 'scissors', 'paper']
const HAND_IMAGES: Record<RpsHand, string> = {
  rock: '/battle/rps-rock.png',
  scissors: '/battle/rps-scissors.png',
  paper: '/battle/rps-paper.png',
}

function judge(hostHand: RpsHand, guestHand: RpsHand) {
  if (hostHand === guestHand) return 0
  if (
    (hostHand === 'rock' && guestHand === 'scissors') ||
    (hostHand === 'scissors' && guestHand === 'paper') ||
    (hostHand === 'paper' && guestHand === 'rock')
  ) {
    return 1
  }
  return -1
}

function rollDie() {
  const roll = Math.random()
  if (roll < 0.22) return 1
  if (roll < 0.44) return 2
  if (roll < 0.64) return 3
  if (roll < 0.8) return 4
  if (roll < 0.93) return 5
  return 6
}

export default function OnlineBattle({ characters, onDone, onExit }: Props) {
  const playerId = useMemo(() => getOnlinePlayerId(), [])
  const [room, setRoom] = useState<BattleRoom | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('部屋(へや)を作(つく)るか、コードで参加(さんか)してね')
  const [damageEvents, setDamageEvents] = useState<DamageEvent[]>([])
  const [attackEffect, setAttackEffect] = useState<AttackEffectData | null>(null)
  const [hitSide, setHitSide] = useState<'left' | 'right' | undefined>()
  const roomRef = useRef<BattleRoom | null>(null)
  const advanceResultKeyRef = useRef<string | null>(null)
  const resolvingRef = useRef(false)
  const animatedKeyRef = useRef<string | null>(null)
  const savedRef = useRef(false)

  const side: OnlineSide | null = room?.hostPlayerId === playerId ? 'host' : room?.guestPlayerId === playerId ? 'guest' : null
  const host = characters.find((character) => character.id === room?.hostCharacterId) ?? null
  const guest = characters.find((character) => character.id === room?.guestCharacterId) ?? null
  const bothReady = !!(room?.hostCharacterId && room.guestCharacterId)
  const ownCharacterId = side === 'host' ? room?.hostCharacterId : room?.guestCharacterId
  const ownHand = side === 'host' ? room?.hostHand : room?.guestHand
  const roomId = room?.id
  const resultKey =
    room?.status === 'result' && room.lastWinnerSide && room.lastDie && room.lastDamage
      ? `${room.id}-${room.round}-${room.lastWinnerSide}-${room.lastDie}-${room.lastDamage}`
      : null

  useEffect(() => {
    roomRef.current = room
  }, [room])

  useEffect(() => {
    if (!roomId) return
    const timer = window.setInterval(async () => {
      try {
        const next = await getBattleRoom(roomId)
        if (next) setRoom(next)
      } catch (e) {
        setError((e as Error).message)
      }
    }, 900)
    return () => window.clearInterval(timer)
  }, [roomId])

  useEffect(() => {
    if (!room || side !== 'host' || resolvingRef.current) return
    if (room.status !== 'choose' || !room.hostHand || !room.guestHand || !host || !guest) return
    resolvingRef.current = true
    ;(async () => {
      try {
        const rps = judge(room.hostHand!, room.guestHand!)
        if (rps === 0) {
          playRpsReveal('draw')
          setMessage('あいこ！もう一回(いっかい)')
          await updateOnlineBattle(room, { hostHand: null, guestHand: null, lastDie: null, lastDamage: null })
          return
        }

        const winnerSide: OnlineSide = rps > 0 ? 'host' : 'guest'
        const attacker = winnerSide === 'host' ? host : guest
        const defender = winnerSide === 'host' ? guest : host
        const target = winnerSide === 'host' ? 'guest' : 'host'
        playRpsReveal(winnerSide === side ? 'win' : 'lose')
        playDiceRoll()
        const die = rollDie()
        await new Promise((resolve) => window.setTimeout(resolve, 720))
        playDiceLand()
        const currentTargetHp = target === 'guest' ? room.guestHp ?? defender.hp : room.hostHp ?? defender.hp
        const damage = die === 6 ? currentTargetHp : calculateDiceDamage(attacker, defender, die)
        const nextHostHp = target === 'host' ? Math.max(0, currentTargetHp - damage) : room.hostHp ?? host.hp
        const nextGuestHp = target === 'guest' ? Math.max(0, currentTargetHp - damage) : room.guestHp ?? guest.hp
        await updateOnlineBattle(room, {
          status: nextHostHp <= 0 || nextGuestHp <= 0 ? 'finished' : 'result',
          hostHp: nextHostHp,
          guestHp: nextGuestHp,
          lastWinnerSide: winnerSide,
          lastDie: die,
          lastDamage: damage,
          winnerSide: nextHostHp <= 0 ? 'guest' : nextGuestHp <= 0 ? 'host' : null,
        })
      } catch (e) {
        setError((e as Error).message)
      } finally {
        resolvingRef.current = false
      }
    })()
  }, [guest, host, room, side])

  useEffect(() => {
    if (!room || !host || !guest || !room.lastDamage || !room.lastDie || !room.lastWinnerSide) return
    const key = `${room.round}-${room.lastWinnerSide}-${room.lastDie}-${room.lastDamage}-${room.status}`
    if (animatedKeyRef.current === key) return
    animatedKeyRef.current = key
    const attacker = room.lastWinnerSide === 'host' ? host : guest
    const targetSide = room.lastWinnerSide === 'host' ? 'right' : 'left'
    setMessage(`${shortBattleName(attacker.name)} の攻撃(こうげき)！ ${room.lastDamage}ダメージ！`)
    setAttackEffect({
      id: makeEventId(),
      side: room.lastWinnerSide === 'host' ? 'left' : 'right',
      kind: 'dice',
      attribute: attacker.species,
      variant: room.lastDie,
      label: 'オンライン攻撃(こうげき)',
    })
    playAttributeWhoosh(attacker.species)
    window.setTimeout(() => {
      playAttributeHit(attacker.species)
      playDamage()
      setHitSide(targetSide)
      setDamageEvents((prev) => [...prev, { id: makeEventId(), target: targetSide, amount: room.lastDamage!, scale: room.lastDie! >= 4 ? 'ultimate' : 'normal' }])
      window.setTimeout(() => setHitSide(undefined), 760)
    }, 820)
    window.setTimeout(() => setAttackEffect(null), 1800)
  }, [guest, host, room])

  useEffect(() => {
    if (!resultKey || side !== 'host' || advanceResultKeyRef.current === resultKey) return
    advanceResultKeyRef.current = resultKey
    const timer = window.setTimeout(async () => {
      try {
        const currentRoom = roomRef.current
        if (!currentRoom || currentRoom.status !== 'result') return
        setRoom(await updateOnlineBattle(currentRoom, {
          status: 'choose',
          round: currentRoom.round + 1,
          hostHand: null,
          guestHand: null,
          lastDie: null,
          lastDamage: null,
          lastWinnerSide: null,
        }))
      } catch (e) {
        setError((e as Error).message)
      }
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [resultKey, side])

  useEffect(() => {
    if (!room || room.status !== 'finished' || savedRef.current || side !== 'host' || !host || !guest || !room.winnerSide) return
    savedRef.current = true
    ;(async () => {
      const winner = room.winnerSide === 'host' ? host : guest
      const loser = room.winnerSide === 'host' ? guest : host
      setError(await saveBattleResult('online', { winner, loser }))
      await updateOnlineBattle(room, { resultSaved: true })
      await onDone()
    })()
  }, [guest, host, onDone, room, side])

  const createRoom = async () => {
    setBusy(true)
    setError(null)
    try {
      setRoom(await createBattleRoom(playerId))
      setMessage('部屋(へや)を作(つく)ったよ。コードを相手(あいて)に教(おし)えてね')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const joinRoom = async () => {
    setBusy(true)
    setError(null)
    try {
      setRoom(await joinBattleRoom(joinCode, playerId))
      setMessage('部屋(へや)に参加(さんか)したよ')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const chooseCharacter = async (character: ImageRecord) => {
    if (!room || !side) return
    playSelect()
    setRoom(await chooseOnlineCharacter(room, side, character))
  }

  const start = async () => {
    if (!room || side !== 'host' || !bothReady) return
    playSelect()
    setRoom(await startOnlineBattle(room))
    setMessage('対戦(たいせん)スタート！手(て)を選(えら)んでね')
  }

  const sendHand = async (hand: RpsHand) => {
    if (!room || !side || room.status !== 'choose' || ownHand) return
    playSelect()
    setRoom(await sendOnlineHand(room, side, hand))
    setMessage('相手(あいて)の手(て)を待(ま)っているよ')
  }

  if (!room) {
    return (
      <section className="space-y-3 rounded-3xl bg-white/90 p-4 shadow-lg">
        <h2 className="text-xl font-black text-purple-900">ふたりで対戦(たいせん)</h2>
        <button disabled={busy} onClick={createRoom} className="min-h-14 w-full rounded-2xl bg-yellow-300 text-lg font-black text-zinc-950 shadow disabled:opacity-50">
          部屋(へや)を作(つく)る
        </button>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            inputMode="numeric"
            placeholder="コード"
            className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-purple-200 px-3 text-lg font-black"
          />
          <button disabled={busy || joinCode.length < 4} onClick={joinRoom} className="min-h-14 rounded-2xl bg-purple-600 px-4 font-black text-white disabled:opacity-50">
            参加(さんか)
          </button>
        </div>
        {error && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{error}</p>}
      </section>
    )
  }

  return (
    <div className="space-y-3">
      <section className="rounded-[1.8rem] border-4 border-yellow-300 bg-zinc-950 p-4 text-center shadow-[0_0_28px_rgba(250,204,21,.45)]">
        <p className="text-base font-black text-yellow-200">部屋(へや)コード</p>
        <p className="mt-1 rounded-2xl bg-white px-3 py-3 text-5xl font-black tracking-[0.22em] text-zinc-950 shadow-inner">{room.code}</p>
        <p className="mt-2 rounded-full bg-yellow-300 px-3 py-1 text-base font-black text-zinc-950">{side === 'host' ? 'あなたはホスト' : 'あなたはゲスト'}</p>
      </section>

      {room.status === 'selecting' && (
        <section className="rounded-3xl bg-white/90 p-3 shadow-lg">
          <h3 className="text-lg font-black text-purple-900">自分(じぶん)のキャラを選(えら)ぶ</h3>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {characters.slice(0, 12).map((character) => (
              <button
                key={character.id}
                onClick={() => void chooseCharacter(character)}
                className={`rounded-2xl border-4 bg-white p-1 text-left shadow active:scale-95 ${ownCharacterId === character.id ? 'border-yellow-400' : 'border-white'}`}
              >
                <img src={character.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                <p className="mt-1 truncate text-xs font-black text-zinc-900">{character.name}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-2xl bg-purple-100 p-2 text-center text-sm font-black text-purple-900">
            {bothReady ? 'ふたりとも準備(じゅんび)OK！' : '相手(あいて)の準備(じゅんび)を待(ま)っているよ'}
          </p>
          {side === 'host' && (
            <button disabled={!bothReady} onClick={start} className="mt-3 min-h-14 w-full rounded-2xl bg-yellow-300 text-lg font-black text-zinc-950 shadow disabled:opacity-50">
              対戦(たいせん)開始(かいし)
            </button>
          )}
        </section>
      )}

      {host && guest && room.status !== 'selecting' && (
        <>
          <BattleStage
            left={host}
            right={guest}
            leftHp={room.hostHp ?? host.hp}
            rightHp={room.guestHp ?? guest.hp}
            damageEvents={damageEvents}
            hitSide={hitSide}
            koSide={room.winnerSide === 'host' ? 'right' : room.winnerSide === 'guest' ? 'left' : undefined}
            message={message}
            attackEffect={attackEffect}
          />
          {room.status === 'choose' && (
            <section className="rounded-3xl bg-white p-3 shadow-lg">
              <p className="mb-2 text-center text-lg font-black text-purple-900">
                ラウンド {room.round} / 手(て)を選(えら)んでね
              </p>
              <div className="grid grid-cols-3 gap-2">
                {HANDS.map((hand) => (
                  <button
                    key={hand}
                    disabled={!!ownHand}
                    onClick={() => void sendHand(hand)}
                    className="min-h-14 rounded-2xl bg-purple-600 text-lg font-black text-white shadow disabled:opacity-50"
                  >
                    <img src={HAND_IMAGES[hand]} alt="" className="mx-auto mb-1 h-9 w-9 rounded-xl object-cover" />
                    {HAND_LABELS[hand]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-sm font-black text-zinc-700">
                {ownHand ? '送信(そうしん)したよ。相手(あいて)を待(ま)っているよ' : 'まだ送信(そうしん)していません'}
              </p>
            </section>
          )}
          {room.status === 'result' && (
            <section className="rounded-3xl bg-white p-3 text-center shadow-lg">
              <p className="text-lg font-black text-zinc-950">次(つぎ)のラウンドへ進(すす)んでいるよ...</p>
              <p className="mt-1 text-sm font-bold text-zinc-700">少(すこ)し待(ま)ってね</p>
            </section>
          )}
          {room.status === 'finished' && room.winnerSide && (
            <VictoryOverlay
              winner={room.winnerSide === 'host' ? host : guest}
              outcome={room.winnerSide === side ? 'win' : 'lose'}
              onNext={onExit}
            />
          )}
        </>
      )}
      {error && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{error}</p>}
      <button onClick={onExit} className="min-h-11 rounded-2xl bg-white/85 px-4 text-sm font-black text-purple-800 shadow">
        戻(もど)る
      </button>
    </div>
  )
}
