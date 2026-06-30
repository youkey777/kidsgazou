let audioContext: AudioContext | null = null

function getContext() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function tone(frequency: number, duration: number, type: OscillatorType, gain = 0.08) {
  try {
    const ctx = getContext()
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
