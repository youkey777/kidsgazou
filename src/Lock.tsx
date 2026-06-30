import { useEffect, useRef, useState } from 'react'

const LS_KEY = 'gallery_unlocked_v1'
const CODE_LEN = 4

export function isUnlocked(): boolean {
  const expected = (import.meta.env.VITE_GALLERY_PASSCODE as string | undefined) || ''
  if (!expected) return true // パスコード未設定なら鍵なし
  return localStorage.getItem(LS_KEY) === expected
}

export function lock() {
  localStorage.removeItem(LS_KEY)
}

export default function Lock({ onUnlock }: { onUnlock: () => void }) {
  const expected =
    (import.meta.env.VITE_GALLERY_PASSCODE as string | undefined) || ''
  const [code, setCode] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (code.length === CODE_LEN) {
      if (code === expected) {
        localStorage.setItem(LS_KEY, expected)
        onUnlock()
      } else {
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setCode('')
          inputRef.current?.focus()
        }, 400)
      }
    }
  }, [code, expected, onUnlock])

  return (
    <div className="min-h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-pink-900 flex flex-col items-center justify-center safe-top safe-bottom px-6">
      <div className={`text-center ${shake ? 'animate-wiggle' : ''}`}>
        <div className="text-7xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-white mb-1">ルイ＆ミオ ギャラリー</h1>
        <p className="text-pink-200 text-sm mb-8">4けたの あいことばを いれてね</p>

        <div className="flex gap-3 justify-center mb-6" onClick={() => inputRef.current?.focus()}>
          {Array.from({ length: CODE_LEN }).map((_, i) => (
            <div
              key={i}
              className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                code.length > i
                  ? 'bg-white text-zinc-900 border-pink-300 scale-110'
                  : 'bg-white/10 text-white/30 border-white/30'
              }`}
            >
              {code.length > i ? '●' : ''}
            </div>
          ))}
        </div>

        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={CODE_LEN}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LEN))}
          className="absolute opacity-0 pointer-events-none w-px h-px"
          aria-label="passcode"
        />

        {!expected && (
          <p className="text-amber-300 text-xs mt-4">
            VITE_GALLERY_PASSCODE 未設定（誰でも入れます）
          </p>
        )}
      </div>
    </div>
  )
}
