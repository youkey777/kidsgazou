import confetti from 'canvas-confetti'

export function fireBattleConfetti() {
  confetti({
    particleCount: 140,
    spread: 85,
    origin: { y: 0.62 },
    scalar: 1.1,
  })
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
    })
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
    })
  }, 250)
}
