import { useEffect, useMemo, useRef, useState } from 'react'
import type { ImageRecord } from '../db'
import { saveBattleResult } from './battle-db'
import type { AttackEffectData } from './effects/AttackFlyEffect'
import BattleStage, { type DynamiteExplosion, type DynamiteMarker } from './effects/BattleStage'
import CinematicAttackOverlay, { type CinematicAttack } from './effects/CinematicAttackOverlay'
import type { DiceThrowEffectData } from './effects/DiceThrowEffect'
import type { KingKarubiFeastEffectData } from './effects/KingKarubiFeastEffect'
import VictoryOverlay from './effects/VictoryOverlay'
import {
  RPS_HANDS as HANDS,
  RPS_HAND_IMAGES as HAND_IMAGES,
  calculateBattleDamage,
  judgeRps,
  rollBattleDie,
  rollDynamiteCount,
  rollDynamiteDamage,
  shouldDurianCounter,
  shouldKingKarubiFeast,
  shouldPlantDynamite,
  ultimateName,
} from './battle-logic'
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
  type OnlinePendingDynamite,
  type OnlineSide,
} from './online-db'
import { playAttributeHit, playAttributeUltimate, playAttributeWhoosh, playDamage, playDiceLand, playDiceRoll, playDynamiteExplosion, playDynamiteFuse, playDynamiteSet, playKingKarubiFeast, playRpsReveal, playSelect, playUltimate, playWhoosh } from './sounds'
import { HAND_LABELS, type DamageEvent, type RpsHand, makeEventId, shortBattleName } from './types'

type Props = {
  characters: ImageRecord[]
  onDone: () => Promise<void> | void
  onExit: () => void
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

type StageSide = 'left' | 'right'

function toStageSide(side: OnlineSide): StageSide {
  return side === 'host' ? 'left' : 'right'
}

function onlineTargetToStage(side: OnlineSide): StageSide {
  return side === 'host' ? 'left' : 'right'
}

function toDynamiteMarkers(items: OnlinePendingDynamite[]): DynamiteMarker[] {
  return items.map((item) => ({
    id: item.id,
    target: onlineTargetToStage(item.target),
  }))
}

function resultText(hostHand: RpsHand | null, guestHand: RpsHand | null) {
  if (!hostHand || !guestHand) return '手(て)を待(ま)っているよ'
  const rps = judgeRps(hostHand, guestHand)
  if (rps === 0) return `${HAND_LABELS[hostHand]} と ${HAND_LABELS[guestHand]}。あいこ！`
  const winner = rps > 0 ? hostHand : guestHand
  const loser = rps > 0 ? guestHand : hostHand
  return `${HAND_LABELS[winner]} が ${HAND_LABELS[loser]} に勝(か)ち！`
}

function OnlineRpsReveal({
  hostHand,
  guestHand,
  status,
}: {
  hostHand: RpsHand | null
  guestHand: RpsHand | null
  status: string
}) {
  if (!hostHand || !guestHand) return null
  const rps = judgeRps(hostHand, guestHand)
  return (
    <section className="rounded-3xl bg-white p-3 shadow-lg">
      <p className="mb-2 text-center text-lg font-black text-zinc-950">
        {status === 'rolling' ? '勝(か)った方(ほう)がサイコロを振(ふ)るよ' : resultText(hostHand, guestHand)}
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-center gap-2">
        <div className={`rounded-2xl p-2 text-center ${rps > 0 ? 'bg-yellow-200 ring-4 ring-yellow-300' : 'bg-cyan-100'}`}>
          <p className="text-xs font-black text-cyan-950">ホスト</p>
          <img src={HAND_IMAGES[hostHand]} alt="" className="mx-auto h-24 w-full rounded-2xl object-contain shadow-lg" />
          <p className="text-base font-black text-zinc-950">{HAND_LABELS[hostHand]}</p>
        </div>
        <div className={`grid min-h-16 place-items-center rounded-2xl px-2 text-center text-base font-black shadow-lg ${rps === 0 ? 'bg-white text-purple-800' : 'bg-yellow-300 text-zinc-950'}`}>
          {rps === 0 ? 'あいこ' : '勝(か)ち'}
        </div>
        <div className={`rounded-2xl p-2 text-center ${rps < 0 ? 'bg-yellow-200 ring-4 ring-yellow-300' : 'bg-pink-100'}`}>
          <p className="text-xs font-black text-pink-950">ゲスト</p>
          <img src={HAND_IMAGES[guestHand]} alt="" className="mx-auto h-24 w-full rounded-2xl object-contain shadow-lg" />
          <p className="text-base font-black text-zinc-950">{HAND_LABELS[guestHand]}</p>
        </div>
      </div>
    </section>
  )
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
  const [diceThrowEffect, setDiceThrowEffect] = useState<DiceThrowEffectData | null>(null)
  const [cinematic, setCinematic] = useState<CinematicAttack | null>(null)
  const [activeSide, setActiveSide] = useState<StageSide | undefined>()
  const [dodgeSide, setDodgeSide] = useState<StageSide | undefined>()
  const [confusedSide, setConfusedSide] = useState<StageSide | undefined>()
  const [hitSide, setHitSide] = useState<'left' | 'right' | undefined>()
  const [specialTitle, setSpecialTitle] = useState<string | null>(null)
  const [dynamiteExplosion, setDynamiteExplosion] = useState<DynamiteExplosion | null>(null)
  const [healingEffect, setHealingEffect] = useState<KingKarubiFeastEffectData | null>(null)
  const [healingAppliedKey, setHealingAppliedKey] = useState<string | null>(null)
  const [showVictory, setShowVictory] = useState(false)
  const [scores, setScores] = useState({ host: 0, guest: 0 })
  const roomRef = useRef<BattleRoom | null>(null)
  const pendingDynamitesRef = useRef<OnlinePendingDynamite[]>([])
  const advanceResultKeyRef = useRef<string | null>(null)
  const rollKeyRef = useRef<string | null>(null)
  const resolveHandsKeyRef = useRef<string | null>(null)
  const revealAdvanceKeyRef = useRef<string | null>(null)
  const rollingAdvanceKeyRef = useRef<string | null>(null)
  const scoreCountedRef = useRef(false)
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
  const revealKey =
    room?.status === 'reveal' && room.hostHand && room.guestHand
      ? `${room.id}-${room.round}-${room.updatedAt}-${room.hostHand}-${room.guestHand}-${room.lastWinnerSide ?? 'draw'}`
      : null
  const rollingKey =
    room?.status === 'rolling' && room.lastWinnerSide && room.lastDie && room.lastDamage
      ? `${room.id}-${room.round}-${room.lastWinnerSide}-${room.lastDie}-${room.lastDamage}`
      : null
  const kingKarubiHealStep =
    room?.status === 'result'
      ? room.lastSequence.find((step) => step.kind === 'kingKarubiFeast')
      : undefined
  const displayedHostHp =
    kingKarubiHealStep?.target === 'host' && healingAppliedKey !== resultKey
      ? kingKarubiHealStep.damage ?? room?.hostHp ?? host?.hp ?? 0
      : room?.hostHp ?? host?.hp ?? 0
  const displayedGuestHp =
    kingKarubiHealStep?.target === 'guest' && healingAppliedKey !== resultKey
      ? kingKarubiHealStep.damage ?? room?.guestHp ?? guest?.hp ?? 0
      : room?.guestHp ?? guest?.hp ?? 0

  useEffect(() => {
    roomRef.current = room
    pendingDynamitesRef.current = room?.pendingDynamites ?? []
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
    if (!room || room.status !== 'reveal' || !room.hostHand || !room.guestHand) return
    const rps = judgeRps(room.hostHand, room.guestHand)
    playRpsReveal(rps === 0 ? 'draw' : room.lastWinnerSide === side ? 'win' : 'lose')
    setMessage(resultText(room.hostHand, room.guestHand))
  }, [room, side])

  useEffect(() => {
    if (!room || side !== 'host') return
    if (room.status !== 'choose' || !room.hostHand || !room.guestHand || !host || !guest) return
    const key = `${room.id}-${room.round}-${room.updatedAt}-${room.hostHand}-${room.guestHand}`
    if (resolveHandsKeyRef.current === key) return
    resolveHandsKeyRef.current = key
    ;(async () => {
      try {
        const rps = judgeRps(room.hostHand!, room.guestHand!)
        await updateOnlineBattle(room, {
          status: 'reveal',
          lastWinnerSide: rps > 0 ? 'host' : rps < 0 ? 'guest' : null,
          lastDie: null,
          lastDamage: null,
          winnerSide: null,
        })
      } catch (e) {
        setError((e as Error).message)
      }
    })()
  }, [guest, host, room, side])

  useEffect(() => {
    if (!revealKey || side !== 'host') return
    if (revealAdvanceKeyRef.current === revealKey) return
    revealAdvanceKeyRef.current = revealKey
    const currentWinnerSide = roomRef.current?.lastWinnerSide ?? null
    const timer = window.setTimeout(async () => {
      try {
        const currentRoom = roomRef.current
        if (!currentRoom || currentRoom.status !== 'reveal' || !host || !guest) return
        const currentDynamites = currentRoom.pendingDynamites ?? []
        const dueDynamite = currentDynamites
          .filter((item) => item.explodeRound <= currentRoom.round)
          .sort((a, b) => a.explodeRound - b.explodeRound)[0]
        if (dueDynamite) {
          const remainingDynamites = currentDynamites.filter((item) => item.id !== dueDynamite.id)
          pendingDynamitesRef.current = remainingDynamites
          const defender = dueDynamite.target === 'host' ? host : guest
          const currentTargetHp = dueDynamite.target === 'host' ? currentRoom.hostHp ?? defender.hp : currentRoom.guestHp ?? defender.hp
          await updateOnlineBattle(currentRoom, {
            status: 'rolling',
            lastWinnerSide: dueDynamite.owner,
            lastDie: -4,
            lastDamage: Math.min(currentTargetHp, rollDynamiteDamage()),
            pendingDynamites: remainingDynamites,
            lastSequence: [{ kind: 'dynamiteExplode', side: dueDynamite.owner, target: dueDynamite.target }],
          })
          return
        }
        if (!currentRoom.lastWinnerSide) {
          await updateOnlineBattle(currentRoom, {
            status: 'choose',
            hostHand: null,
            guestHand: null,
            lastDie: null,
            lastDamage: null,
            lastWinnerSide: null,
            lastSequence: [],
          })
          return
        }

        const winnerSide = currentRoom.lastWinnerSide
        const attacker = winnerSide === 'host' ? host : guest
        const defender = winnerSide === 'host' ? guest : host
        const target: OnlineSide = winnerSide === 'host' ? 'guest' : 'host'
        const currentTargetHp = target === 'guest' ? currentRoom.guestHp ?? defender.hp : currentRoom.hostHp ?? defender.hp
        if (shouldDurianCounter(defender)) {
          const counterSide: OnlineSide = target
          const attackerHp = winnerSide === 'host' ? currentRoom.hostHp ?? host.hp : currentRoom.guestHp ?? guest.hp
          const counterDamage = Math.min(attackerHp, 10 + calculateBattleDamage(defender, attacker, 2, attackerHp))
          await updateOnlineBattle(currentRoom, {
            status: 'rolling',
            lastWinnerSide: counterSide,
            lastDie: -2,
            lastDamage: counterDamage,
            lastSequence: [{ kind: 'durianCounter', side: counterSide, target: winnerSide }],
          })
          return
        }
        const die = rollBattleDie()
        const damage = calculateBattleDamage(attacker, defender, die, currentTargetHp)
        let nextDynamites = currentDynamites
        const nextSequence: BattleRoom['lastSequence'] = [{ kind: 'dice', side: winnerSide, target, die, damage }]
        if (shouldPlantDynamite(attacker)) {
          const count = rollDynamiteCount()
          nextDynamites = [
            ...currentDynamites,
            ...Array.from({ length: count }, (_, index) => ({
              id: makeEventId(),
              owner: winnerSide,
              target,
              explodeRound: currentRoom.round + (index + 1) * 2,
            })),
          ]
          pendingDynamitesRef.current = nextDynamites
          nextSequence.unshift({ kind: 'dynamiteSet', side: winnerSide, target, damage: count })
        }
        await updateOnlineBattle(currentRoom, {
          status: 'rolling',
          lastDie: die,
          lastDamage: damage,
          pendingDynamites: nextDynamites,
          lastSequence: nextSequence,
        })
      } catch (e) {
        setError((e as Error).message)
      }
    }, currentWinnerSide ? 1180 : 760)
    return () => window.clearTimeout(timer)
  }, [guest, host, revealKey, side])

  useEffect(() => {
    if (!rollingKey || side !== 'host') return
    if (rollingAdvanceKeyRef.current === rollingKey) return
    rollingAdvanceKeyRef.current = rollingKey
    const currentDie = roomRef.current?.lastDie ?? 1
    const delay = currentDie === -2 ? 5600 : currentDie === -4 ? 3300 : currentDie >= 4 ? 5200 : 2850
    const timer = window.setTimeout(async () => {
      try {
        const currentRoom = roomRef.current
        if (!currentRoom || currentRoom.status !== 'rolling' || !host || !guest || !currentRoom.lastWinnerSide || !currentRoom.lastDamage) return
        const target = currentRoom.lastWinnerSide === 'host' ? 'guest' : 'host'
        const currentTargetHp = target === 'guest' ? currentRoom.guestHp ?? guest.hp : currentRoom.hostHp ?? host.hp
        const damagedTargetHp = Math.max(0, currentTargetHp - currentRoom.lastDamage)
        const targetCharacter = target === 'host' ? host : guest
        const feastActivated =
          damagedTargetHp < targetCharacter.hp && shouldKingKarubiFeast(targetCharacter)
        const resolvedTargetHp = feastActivated ? targetCharacter.hp : damagedTargetHp
        const nextHostHp = target === 'host' ? resolvedTargetHp : currentRoom.hostHp ?? host.hp
        const nextGuestHp = target === 'guest' ? resolvedTargetHp : currentRoom.guestHp ?? guest.hp
        const nextSequence: BattleRoom['lastSequence'] = feastActivated
          ? [
              ...(currentRoom.lastSequence ?? []),
              { kind: 'kingKarubiFeast', target, damage: damagedTargetHp },
            ]
          : currentRoom.lastSequence
        await updateOnlineBattle(currentRoom, {
          status: 'result',
          hostHp: nextHostHp,
          guestHp: nextGuestHp,
          winnerSide: nextHostHp <= 0 ? 'guest' : nextGuestHp <= 0 ? 'host' : null,
          lastSequence: nextSequence,
        })
      } catch (e) {
        setError((e as Error).message)
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [guest, host, rollingKey, side])

  useEffect(() => {
    if (!rollingKey || !room || !host || !guest || !room.lastWinnerSide || !room.lastDie) return
    if (rollKeyRef.current === rollingKey) return
    rollKeyRef.current = rollingKey
    const lastDie = room.lastDie
    const attacker = room.lastWinnerSide === 'host' ? host : guest
    const defender = room.lastWinnerSide === 'host' ? guest : host
    const sideForDice = room.lastWinnerSide === 'host' ? 'left' : 'right'
    const targetSide: StageSide = room.lastWinnerSide === 'host' ? 'right' : 'left'
    const sequence = room.lastSequence ?? []
    const hasDynamiteSet = sequence.some((step) => step.kind === 'dynamiteSet')
    let cancelled = false

    const clearTransient = () => {
      setActiveSide(undefined)
      setDodgeSide(undefined)
      setConfusedSide(undefined)
      setSpecialTitle(null)
      setDynamiteExplosion(null)
    }

    if (room.lastDie === -2) {
      ;(async () => {
        setMessage(`${shortBattleName(defender.name)} が後(うし)ろに下(さ)がってよけた！`)
        setDodgeSide(sideForDice)
        playWhoosh()
        await sleep(620)
        if (cancelled) return
        setDodgeSide(undefined)
        setSpecialTitle('ドリアン投(な)げ')
        setMessage('ドリアン投(な)げ！')
        await sleep(680)
        if (cancelled) return
        setSpecialTitle(null)
        await sleep(120)
        if (cancelled) return
        setAttackEffect({
          id: makeEventId(),
          side: sideForDice,
          kind: 'counter',
          attribute: 'くさ',
          variant: 4,
          imageUrl: '/battle/durian-3d.png',
          label: 'ドリアン投(な)げ',
        })
        playAttributeWhoosh('durian')
        await sleep(1840)
        if (cancelled) return
        playAttributeHit('durian')
        playDamage()
        setHitSide(targetSide)
        setConfusedSide(targetSide)
        setDamageEvents((prev) => [...prev, { id: makeEventId(), target: targetSide, amount: 10, scale: 'counter' }])
        setMessage('10ダメージ！相手(あいて)が混乱(こんらん)！')
        window.setTimeout(() => setHitSide(undefined), 560)
        await sleep(1050)
        if (cancelled) return
        setAttackEffect(null)
        setAttackEffect({
          id: makeEventId(),
          side: sideForDice,
          kind: 'dice',
          attribute: defender.species,
          variant: 2,
          label: '通常攻撃(つうじょうこうげき)',
        })
        setMessage('さらに通常攻撃(つうじょうこうげき)！')
        playAttributeWhoosh(defender.species)
        await sleep(1620)
        if (cancelled) return
        playAttributeHit(defender.species)
        playDamage()
        setHitSide(targetSide)
        const followDamage = Math.max(0, (room.lastDamage ?? 10) - 10)
        if (followDamage > 0) {
          setDamageEvents((prev) => [...prev, { id: makeEventId(), target: targetSide, amount: followDamage, scale: 'normal' }])
          setMessage(`${followDamage}ダメージ！`)
        }
        window.setTimeout(() => setHitSide(undefined), 560)
        await sleep(900)
        if (cancelled) return
        setAttackEffect(null)
      })()
      return () => {
        cancelled = true
        clearTransient()
      }
    }
    if (room.lastDie === -4) {
      ;(async () => {
        setMessage('ダイナマイトのどうかせんに火(ひ)がついた！')
        playDynamiteFuse()
        await sleep(640)
        if (cancelled) return
        setDynamiteExplosion({ id: `${room.id}-${room.round}-boom`, target: targetSide })
        setMessage('ダイナマイトがばくはつ！')
        playDynamiteExplosion()
        await sleep(1450)
        if (cancelled) return
        setDynamiteExplosion(null)
      })()
      return () => {
        cancelled = true
        clearTransient()
      }
    }

    const timers: number[] = []
    const run = async () => {
      if (hasDynamiteSet) {
        const count = sequence.find((step) => step.kind === 'dynamiteSet')?.damage ?? 1
        setSpecialTitle('ダイナマイト')
        setMessage(`${shortBattleName(attacker.name)} のダイナマイト！`)
        playDynamiteSet()
        await sleep(720)
        if (cancelled) return
        setSpecialTitle(null)
        setMessage(`ダイナマイトを ${count}こ しかけた！`)
        await sleep(640)
        if (cancelled) return
      }
      const throwId = makeEventId()
      setMessage(`${shortBattleName(attacker.name)} がサイコロを振(ふ)るよ`)
      setDiceThrowEffect({ id: throwId, side: sideForDice, face: null })
      playDiceRoll()
      timers.push(window.setTimeout(() => {
        setDiceThrowEffect({ id: throwId, side: sideForDice, face: lastDie })
        playDiceLand()
        setMessage(`出目(でめ)は ${lastDie}！`)
      }, 760))
      timers.push(window.setTimeout(() => {
        if (lastDie >= 4) {
          setCinematic({
            id: makeEventId(),
            name: ultimateName(attacker, lastDie),
            attribute: attacker.species,
            die: lastDie as 4 | 5 | 6,
          })
          playAttributeUltimate(attacker.species, lastDie as 4 | 5 | 6)
          playUltimate()
        }
      }, 1950))
      timers.push(window.setTimeout(() => {
        setDiceThrowEffect(null)
        setCinematic(null)
      }, lastDie >= 4 ? 5000 : 2550))
    }
    void run()
    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      clearTransient()
    }
  }, [guest, host, rollingKey, room])

  useEffect(() => {
    const resultRoom = roomRef.current
    if (!resultKey || !resultRoom || resultRoom.status !== 'result' || !host || !guest || !resultRoom.lastDamage || !resultRoom.lastDie || !resultRoom.lastWinnerSide) return
    const key = `${resultRoom.round}-${resultRoom.lastWinnerSide}-${resultRoom.lastDie}-${resultRoom.lastDamage}-${resultRoom.status}`
    if (animatedKeyRef.current === key) return
    animatedKeyRef.current = key
    const attacker = resultRoom.lastWinnerSide === 'host' ? host : guest
    const attackerStageSide = toStageSide(resultRoom.lastWinnerSide)
    const targetSide = resultRoom.lastWinnerSide === 'host' ? 'right' : 'left'
    const specialLabel = resultRoom.lastDie === -2 ? 'ドリアン投(な)げ' : resultRoom.lastDie === -4 ? 'ダイナマイト' : null
    const attackAttribute = resultRoom.lastDie === -2 ? 'くさ' : resultRoom.lastDie === -4 ? 'ほのお' : attacker.species
    setDiceThrowEffect(null)
    setCinematic(null)
    setSpecialTitle(null)
    setMessage(specialLabel ? `${specialLabel}！` : resultRoom.lastDie >= 4 ? `${ultimateName(attacker, resultRoom.lastDie)}！` : `${shortBattleName(attacker.name)} の攻撃(こうげき)！`)
    if (resultRoom.lastDie === -2) {
      setConfusedSide(targetSide)
    } else if (resultRoom.lastDie > 0) {
      setActiveSide(attackerStageSide)
      setAttackEffect({
        id: makeEventId(),
        side: attackerStageSide,
        kind: 'dice',
        attribute: attackAttribute,
        variant: Math.max(1, resultRoom.lastDie),
        label: resultRoom.lastDie >= 4 ? ultimateName(attacker, resultRoom.lastDie) : 'オンライン攻撃(こうげき)',
      })
      playAttributeWhoosh(attackAttribute)
    }
    const timers: number[] = []
    timers.push(window.setTimeout(() => {
      if (resultRoom.lastDie !== -4) playAttributeHit(attackAttribute)
      playDamage()
      setHitSide(targetSide)
      setDamageEvents((prev) => [...prev, { id: makeEventId(), target: targetSide, amount: resultRoom.lastDamage!, scale: resultRoom.lastDie! >= 4 || resultRoom.lastDie === -4 ? 'ultimate' : resultRoom.lastDie === -2 ? 'counter' : 'normal' }])
      setMessage(resultRoom.lastDie === 6 ? `一撃必殺(いちげきひっさつ)！ ${resultRoom.lastDamage}ダメージ！` : `${resultRoom.lastDamage}ダメージ！`)
      timers.push(window.setTimeout(() => setHitSide(undefined), 760))
    }, 820))
    timers.push(window.setTimeout(() => {
      setAttackEffect(null)
      setActiveSide(undefined)
      if (resultRoom.lastDie === -2) setConfusedSide(undefined)
    }, 1800))

    const healStep = resultRoom.lastSequence.find((step) => step.kind === 'kingKarubiFeast')
    if (healStep?.target) {
      const healedCharacter = healStep.target === 'host' ? host : guest
      const healedSide = onlineTargetToStage(healStep.target)
      timers.push(window.setTimeout(() => {
        setHealingEffect({ id: `${key}-king-karubi-feast`, side: healedSide })
        setMessage(`${shortBattleName(healedCharacter.name)} が焼(や)きカルビを食(た)べた！`)
        playKingKarubiFeast()
      }, 1520))
      timers.push(window.setTimeout(() => {
        setHealingAppliedKey(resultKey)
        setMessage('王(おう)のごちそう！ HPが全回復(ぜんかいふく)！')
      }, 3340))
      timers.push(window.setTimeout(() => setHealingEffect(null), 4770))
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [guest, host, resultKey])

  useEffect(() => {
    if (!resultKey || side !== 'host' || advanceResultKeyRef.current === resultKey) return
    advanceResultKeyRef.current = resultKey
    const hasKingKarubiHeal = roomRef.current?.lastSequence.some((step) => step.kind === 'kingKarubiFeast')
    const timer = window.setTimeout(async () => {
      try {
        const currentRoom = roomRef.current
        if (!currentRoom || currentRoom.status !== 'result') return
        if (currentRoom.winnerSide) {
          await updateOnlineBattle(currentRoom, { status: 'finished' })
          return
        }
        setRoom(await updateOnlineBattle(currentRoom, {
          status: 'choose',
          round: currentRoom.round + 1,
          hostHand: null,
          guestHand: null,
          lastDie: null,
          lastDamage: null,
          lastWinnerSide: null,
          lastSequence: [],
        }))
      } catch (e) {
        setError((e as Error).message)
      }
    }, roomRef.current?.winnerSide ? 2500 : hasKingKarubiHeal ? 5200 : 1800)
    return () => window.clearTimeout(timer)
  }, [resultKey, side])

  useEffect(() => {
    if (room?.status !== 'finished') {
      setShowVictory(false)
      savedRef.current = false
      scoreCountedRef.current = false
      return
    }
    if (room.winnerSide && !scoreCountedRef.current) {
      scoreCountedRef.current = true
      setScores((current) => ({
        host: current.host + (room.winnerSide === 'host' ? 1 : 0),
        guest: current.guest + (room.winnerSide === 'guest' ? 1 : 0),
      }))
    }
    const timer = window.setTimeout(() => setShowVictory(true), 920)
    return () => window.clearTimeout(timer)
  }, [room?.status, room?.winnerSide])

  useEffect(() => {
    if (!room || room.status !== 'finished' || room.resultSaved || savedRef.current || side !== 'host' || !host || !guest || !room.winnerSide) return
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
    setAttackEffect(null)
    setDiceThrowEffect(null)
    setCinematic(null)
    setActiveSide(undefined)
    setDodgeSide(undefined)
    setConfusedSide(undefined)
    setHitSide(undefined)
    setSpecialTitle(null)
    setDynamiteExplosion(null)
    setHealingEffect(null)
    setHealingAppliedKey(null)
    setRoom(await sendOnlineHand(room, side, hand))
    setMessage('相手(あいて)の手(て)を待(ま)っているよ')
  }

  const rematch = async () => {
    if (!room || side !== 'host' || !host || !guest) return
    playSelect()
    setDamageEvents([])
    setAttackEffect(null)
    setDiceThrowEffect(null)
    setCinematic(null)
    setActiveSide(undefined)
    setDodgeSide(undefined)
    setConfusedSide(undefined)
    setHitSide(undefined)
    setSpecialTitle(null)
    setDynamiteExplosion(null)
    setHealingEffect(null)
    setHealingAppliedKey(null)
    setShowVictory(false)
    animatedKeyRef.current = null
    advanceResultKeyRef.current = null
    rollKeyRef.current = null
    resolveHandsKeyRef.current = null
    revealAdvanceKeyRef.current = null
    rollingAdvanceKeyRef.current = null
    savedRef.current = false
    setRoom(await updateOnlineBattle(room, {
      status: 'selecting',
      hostCharacterId: null,
      guestCharacterId: null,
      hostHp: null,
      guestHp: null,
      round: 1,
      hostHand: null,
      guestHand: null,
      lastWinnerSide: null,
      lastDie: null,
      lastDamage: null,
      winnerSide: null,
      resultSaved: false,
      pendingDynamites: [],
      lastSequence: [],
    }))
    setMessage('同(おな)じ部屋(へや)でもう一回(いっかい)！キャラを選(えら)んでね')
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
      {room.status === 'selecting' && (
        <section className="rounded-[1.8rem] border-4 border-yellow-300 bg-zinc-950 p-4 text-center shadow-[0_0_28px_rgba(250,204,21,.45)]">
          <p className="text-base font-black text-yellow-200">部屋(へや)コード</p>
          <p className="mt-1 rounded-2xl bg-white px-3 py-3 text-5xl font-black tracking-[0.22em] text-zinc-950 shadow-inner">{room.code}</p>
          <p className="mt-2 rounded-full bg-yellow-300 px-3 py-1 text-base font-black text-zinc-950">{side === 'host' ? 'あなたはホスト' : 'あなたはゲスト'}</p>
        </section>
      )}

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
          <section className="grid grid-cols-3 items-center gap-2 rounded-3xl bg-zinc-950/86 p-2 text-center text-white shadow-lg ring-2 ring-white/15">
            <div className="rounded-2xl bg-cyan-500/25 px-2 py-2">
              <p className="text-xs font-bold text-cyan-100">ホスト</p>
              <p className="text-xl font-black">{scores.host}勝(しょう)</p>
            </div>
            <div className="rounded-2xl bg-yellow-300 px-2 py-2 text-zinc-950">
              <p className="text-xs font-black">同(おな)じ部屋(へや)</p>
              <p className="text-sm font-black">連続対戦(れんぞくたいせん)</p>
            </div>
            <div className="rounded-2xl bg-pink-500/25 px-2 py-2">
              <p className="text-xs font-bold text-pink-100">ゲスト</p>
              <p className="text-xl font-black">{scores.guest}勝(しょう)</p>
            </div>
          </section>
          <BattleStage
            left={host}
            right={guest}
            leftHp={displayedHostHp}
            rightHp={displayedGuestHp}
            damageEvents={damageEvents}
            activeSide={activeSide}
            dodgeSide={dodgeSide}
            confusedSide={confusedSide}
            hitSide={hitSide}
            koSide={room.winnerSide === 'host' ? 'right' : room.winnerSide === 'guest' ? 'left' : undefined}
            message={message}
            specialTitle={specialTitle}
            attackEffect={attackEffect}
            diceThrowEffect={diceThrowEffect}
            dynamites={toDynamiteMarkers(room.pendingDynamites)}
            dynamiteExplosion={dynamiteExplosion}
            healingEffect={healingEffect}
          />
          {(room.status === 'reveal' || room.status === 'rolling' || room.status === 'result') && (
            <OnlineRpsReveal hostHand={room.hostHand} guestHand={room.guestHand} status={room.status} />
          )}
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
            <>
              {!showVictory && (
                <section className="rounded-3xl bg-white p-3 text-center shadow-lg">
                  <p className="text-lg font-black text-zinc-950">勝負(しょうぶ)が決(き)まったよ！</p>
                  <p className="mt-1 text-sm font-bold text-zinc-700">最後(さいご)の演出(えんしゅつ)を見(み)せているよ</p>
                </section>
              )}
              {showVictory && (
                <VictoryOverlay
                  winner={room.winnerSide === 'host' ? host : guest}
                  outcome={room.winnerSide === side ? 'win' : 'lose'}
                  onNext={side === 'host' ? rematch : onExit}
                  nextLabel={side === 'host' ? 'もう一回(いっかい)' : '戻(もど)る'}
                  onSecondary={side === 'host' ? onExit : undefined}
                  secondaryLabel={side === 'host' ? '戻(もど)る' : undefined}
                />
              )}
            </>
          )}
          <CinematicAttackOverlay attack={cinematic} />
        </>
      )}
      {error && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">{error}</p>}
      <button onClick={onExit} className="min-h-11 rounded-2xl bg-white/85 px-4 text-sm font-black text-purple-800 shadow">
        戻(もど)る
      </button>
    </div>
  )
}
