let audioContext: AudioContext | null = null
let bgm: HTMLAudioElement | null = null
let bgmEnabled = false

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
    // ブラウザの自動再生制限中は無音で進める。
  }
}

export function playBgm() {
  try {
    if (!bgm) {
      bgm = new Audio('/audio/lion-switch.mp3')
      bgm.loop = true
      bgm.volume = 0.28
    }
    bgmEnabled = true
    void bgm.play()
  } catch {
    // 自動再生制限中は次のタップで再試行する。
  }
}

export function primeBgmOnNextGesture() {
  const start = () => {
    playBgm()
    window.removeEventListener('pointerdown', start)
    window.removeEventListener('keydown', start)
  }
  window.addEventListener('pointerdown', start, { once: true })
  window.addEventListener('keydown', start, { once: true })
}

export function stopBgm() {
  bgmEnabled = false
  bgm?.pause()
}

export function toggleBgm() {
  if (bgmEnabled && bgm && !bgm.paused) {
    stopBgm()
    return false
  }
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
