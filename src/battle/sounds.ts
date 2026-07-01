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

export function playAttributeWhoosh(attribute: string) {
  const seed = attributeSeed(attribute)
  const base = 260 + (seed % 360)
  const type: OscillatorType = seed % 3 === 0 ? 'sawtooth' : seed % 3 === 1 ? 'triangle' : 'square'
  tone(base, 0.08, type, 0.045)
  setTimeout(() => tone(base * 1.45, 0.09, type, 0.038), 70)
  setTimeout(() => tone(Math.max(120, base * 0.72), 0.1, 'sawtooth', 0.028), 145)
}

export function playAttributeHit(attribute: string) {
  const seed = attributeSeed(attribute)
  const low = 70 + (seed % 90)
  const high = 420 + (seed % 520)
  tone(low, 0.13, 'sawtooth', 0.075)
  setTimeout(() => tone(high, 0.09, seed % 2 === 0 ? 'square' : 'triangle', 0.052), 62)
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
