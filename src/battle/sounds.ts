let audioContext: AudioContext | null = null
let bgm: HTMLAudioElement | null = null
const BGM_PREF_KEY = 'kids_gallery_bgm_enabled_v2'
let bgmEnabled = readBgmPreference()
let bgmGesturePrimed = false

function readBgmPreference() {
  try {
    return localStorage.getItem(BGM_PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

function saveBgmPreference(enabled: boolean) {
  bgmEnabled = enabled
  try {
    localStorage.setItem(BGM_PREF_KEY, enabled ? 'on' : 'off')
  } catch {
    // localStorage is optional in some browser modes.
  }
}

function isPageVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

function setMediaSessionState(state: 'playing' | 'paused') {
  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state
    }
  } catch {
    // Media Session API is optional.
  }
}

function ensureBgm() {
  if (!bgm) {
    bgm = new Audio('/audio/lion-switch.mp3')
    bgm.loop = true
    bgm.volume = 0.28
    bgm.preload = 'auto'
    bgm.addEventListener('pause', () => setMediaSessionState('paused'))
    bgm.addEventListener('play', () => setMediaSessionState('playing'))
    try {
      if ('mediaSession' in navigator && 'MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'ルイとミオ',
          artist: 'Kids Gallery',
          album: 'Character Battle',
        })
      }
    } catch {
      // Media metadata is best-effort only.
    }
  }
  return bgm
}

function getContext() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function tone(frequency: number, duration: number, type: OscillatorType, gain = 0.08) {
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const volume = ctx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    volume.gain.setValueAtTime(gain, ctx.currentTime)
    volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(volume)
    volume.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Sound effects are optional when the browser blocks audio.
  }
}

function sweep(startFrequency: number, endFrequency: number, duration: number, type: OscillatorType, gain = 0.06) {
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const volume = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(startFrequency, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), ctx.currentTime + duration)
    volume.gain.setValueAtTime(gain, ctx.currentTime)
    volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(volume)
    volume.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Sound effects are optional when the browser blocks audio.
  }
}

function noiseBurst(duration: number, gain = 0.045, filterFrequency = 900) {
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const volume = ctx.createGain()
    filter.type = 'bandpass'
    filter.frequency.value = filterFrequency
    filter.Q.value = 1.2
    volume.gain.setValueAtTime(gain, ctx.currentTime)
    volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    source.buffer = buffer
    source.connect(filter)
    filter.connect(volume)
    volume.connect(ctx.destination)
    source.start()
    source.stop(ctx.currentTime + duration)
  } catch {
    // Sound effects are optional when the browser blocks audio.
  }
}

export function playBgm() {
  try {
    if (!bgmEnabled || !isPageVisible()) return
    const music = ensureBgm()
    if (audioContext?.state === 'suspended') void audioContext.resume()
    const promise = music.play()
    if (promise) {
      void promise.catch(() => {
        setMediaSessionState('paused')
        primeBgmOnNextGesture()
      })
    }
  } catch {
    primeBgmOnNextGesture()
  }
}

export function primeBgmOnNextGesture() {
  if (bgmGesturePrimed || typeof window === 'undefined') return
  bgmGesturePrimed = true
  const start = () => {
    bgmGesturePrimed = false
    window.removeEventListener('pointerdown', start)
    window.removeEventListener('touchstart', start)
    window.removeEventListener('keydown', start)
    if (!bgmEnabled || !isPageVisible()) return
    playBgm()
  }
  window.addEventListener('pointerdown', start, { once: true })
  window.addEventListener('touchstart', start, { once: true })
  window.addEventListener('keydown', start, { once: true })
}

export function stopBgm() {
  saveBgmPreference(false)
  bgm?.pause()
  setMediaSessionState('paused')
}

export function pauseBgm() {
  bgm?.pause()
  setMediaSessionState('paused')
  if (audioContext?.state === 'running') void audioContext.suspend()
}

export function syncBgmWithAppVisibility() {
  if (!bgmEnabled || !isPageVisible()) {
    pauseBgm()
    return
  }
  playBgm()
}

export function toggleBgm() {
  if (bgmEnabled) {
    stopBgm()
    return false
  }
  saveBgmPreference(true)
  playBgm()
  return true
}

export function isBgmEnabled() {
  return bgmEnabled
}

export function playSelect() {
  tone(520, 0.05, 'triangle', 0.045)
  setTimeout(() => tone(720, 0.06, 'triangle', 0.04), 45)
}

export function playDiceRoll() {
  ;[180, 220, 260, 310].forEach((frequency, index) => {
    setTimeout(() => tone(frequency, 0.045, 'square', 0.035), index * 55)
  })
}

export function playDiceLand() {
  tone(90, 0.09, 'sawtooth', 0.08)
  setTimeout(() => tone(160, 0.08, 'triangle', 0.055), 80)
}

export function playWhoosh() {
  tone(420, 0.08, 'sawtooth', 0.04)
  setTimeout(() => tone(240, 0.1, 'sawtooth', 0.035), 70)
}

function attributeSeed(attribute: string) {
  return Array.from(attribute).reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function attributeProfile(attribute: string) {
  const seed = attributeSeed(attribute)
  const profiles = [
    { base: 210, high: 680, type: 'sawtooth' as OscillatorType, noise: 1200, style: 'fire' },
    { base: 520, high: 1420, type: 'triangle' as OscillatorType, noise: 2400, style: 'ice' },
    { base: 330, high: 1900, type: 'square' as OscillatorType, noise: 3200, style: 'electric' },
    { base: 160, high: 430, type: 'sine' as OscillatorType, noise: 520, style: 'earth' },
    { base: 390, high: 980, type: 'triangle' as OscillatorType, noise: 1600, style: 'light' },
    { base: 95, high: 560, type: 'sawtooth' as OscillatorType, noise: 760, style: 'dark' },
    { base: 280, high: 860, type: 'sine' as OscillatorType, noise: 1400, style: 'water' },
    { base: 460, high: 1220, type: 'triangle' as OscillatorType, noise: 1900, style: 'magic' },
  ]
  return profiles[seed % profiles.length]
}

export function playAttributeWhoosh(attribute: string) {
  const profile = attributeProfile(attribute)
  sweep(profile.base, profile.high, 0.22, profile.type, 0.045)
  setTimeout(() => tone(profile.high * 0.75, 0.08, profile.type, 0.034), 95)
  if (profile.style === 'fire' || profile.style === 'dark') noiseBurst(0.18, 0.025, profile.noise)
  if (profile.style === 'ice') {
    ;[profile.high, profile.high * 1.22, profile.high * 1.48].forEach((frequency, index) => {
      setTimeout(() => tone(frequency, 0.05, 'triangle', 0.026), index * 42)
    })
  }
  if (profile.style === 'electric') {
    ;[profile.high, profile.base, profile.high * 1.35].forEach((frequency, index) => {
      setTimeout(() => tone(frequency, 0.035, 'square', 0.035), index * 35)
    })
  }
}

export function playAttributeHit(attribute: string) {
  const profile = attributeProfile(attribute)
  tone(Math.max(55, profile.base * 0.55), 0.16, 'sawtooth', 0.085)
  noiseBurst(0.12, 0.05, profile.noise)
  setTimeout(() => tone(profile.high, 0.09, profile.type, 0.055), 58)
  setTimeout(() => sweep(profile.high * 0.85, profile.base * 0.6, 0.16, profile.type, 0.04), 120)
}

export function playAttributeCharge(attribute: string) {
  const profile = attributeProfile(attribute)
  sweep(profile.base * 0.65, profile.high * 0.9, 0.5, profile.type, 0.035)
  setTimeout(() => tone(profile.high, 0.12, profile.type, 0.04), 360)
}

export function playAttributeUltimate(attribute: string, rank: 4 | 5 | 6) {
  const profile = attributeProfile(attribute)
  playAttributeCharge(attribute)
  setTimeout(() => noiseBurst(0.18 + rank * 0.02, 0.035 + rank * 0.006, profile.noise), 210)
  setTimeout(() => sweep(profile.high * 0.65, profile.high * (1.2 + rank * 0.1), 0.34, profile.type, 0.052), 420)
  setTimeout(() => tone(Math.max(60, profile.base * 0.42), 0.25, 'sawtooth', 0.08), 720)
  if (rank === 6) {
    setTimeout(() => noiseBurst(0.26, 0.075, profile.noise * 1.2), 920)
    setTimeout(() => tone(72, 0.38, 'sawtooth', 0.09), 1020)
  }
}

export function playDynamiteSet() {
  tone(120, 0.08, 'square', 0.065)
  setTimeout(() => tone(210, 0.07, 'triangle', 0.05), 80)
  setTimeout(() => noiseBurst(0.12, 0.035, 900), 145)
}

export function playDynamiteFuse() {
  ;[1320, 1480, 1180, 1620, 1240].forEach((frequency, index) => {
    setTimeout(() => {
      tone(frequency, 0.035, 'square', 0.025)
      noiseBurst(0.04, 0.012, 2600)
    }, index * 95)
  })
}

export function playDynamiteExplosion() {
  noiseBurst(0.34, 0.1, 620)
  tone(58, 0.42, 'sawtooth', 0.12)
  setTimeout(() => tone(96, 0.28, 'square', 0.08), 95)
  setTimeout(() => noiseBurst(0.22, 0.065, 1100), 170)
  setTimeout(() => sweep(220, 72, 0.36, 'sawtooth', 0.075), 250)
}

export function playRouletteStart() {
  tone(300, 0.08, 'triangle', 0.05)
  setTimeout(() => tone(620, 0.1, 'triangle', 0.045), 80)
}

export function playRouletteTick() {
  tone(760 + Math.random() * 120, 0.028, 'square', 0.025)
}

export function playRouletteStop() {
  tone(420, 0.08, 'triangle', 0.06)
  setTimeout(() => tone(860, 0.16, 'triangle', 0.06), 90)
}

export function playCrystal() {
  ;[880, 1175, 1568].forEach((frequency, index) => {
    setTimeout(() => tone(frequency, 0.12, 'triangle', 0.055), index * 80)
  })
}

export function playLevelUp() {
  ;[523, 659, 784, 1046, 1318].forEach((frequency, index) => {
    setTimeout(() => tone(frequency, 0.16, 'triangle', 0.07), index * 90)
  })
}

export function playPunch() {
  tone(140, 0.11, 'square', 0.06)
  setTimeout(() => tone(80, 0.08, 'sawtooth', 0.04), 45)
}

export function playDamage() {
  tone(95, 0.16, 'sawtooth', 0.07)
}

export function playUltimate() {
  tone(260, 0.12, 'triangle', 0.08)
  setTimeout(() => tone(520, 0.16, 'triangle', 0.08), 110)
  setTimeout(() => tone(780, 0.22, 'square', 0.06), 230)
}

export function playVictory() {
  ;[330, 440, 660, 880].forEach((frequency, index) => {
    setTimeout(() => tone(frequency, 0.18, 'triangle', 0.08), index * 120)
  })
}
