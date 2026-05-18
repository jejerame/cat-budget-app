import { useEffect, useRef, useState } from 'react'
import splashCatUrl from '../../1won.png'

const STORAGE_KEY = 'compound-daily-cat-splash-at'
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000
const FADE_MS = 500
const HOLD_MS = 700

const SPLASH_BUBBLE_MESSAGES = [
  '샀니? 샀어?',
  '그게 꼭 필요해?',
  '1억 안 모을 거야?',
  '또 샀어?',
] as const

function isSplashDue(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return true
  const last = Number(raw)
  if (!Number.isFinite(last)) return true
  return Date.now() - last >= TWENTY_FOUR_H_MS
}

type Phase = 'idle' | 'peak' | 'out'

type SplashCatOverlayProps = {
  /** 잔소리 금지 기간이 켜져 있으면 스플래시 고양이도 표시하지 않음 */
  silenced?: boolean
}

export function SplashCatOverlay({ silenced = false }: SplashCatOverlayProps) {
  const [finished, setFinished] = useState(() => silenced || !isSplashDue())
  const [phase, setPhase] = useState<Phase>('idle')
  const bubbleTextRef = useRef<string | null>(null)
  if (bubbleTextRef.current === null) {
    const i = Math.floor(Math.random() * SPLASH_BUBBLE_MESSAGES.length)
    bubbleTextRef.current = SPLASH_BUBBLE_MESSAGES[i] ?? SPLASH_BUBBLE_MESSAGES[0]
  }

  useEffect(() => {
    if (silenced) {
      setFinished(true)
      return
    }
    if (finished) return

    let cancelled = false
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (!cancelled) setPhase('peak')
      })
    })

    const tFadeOut = window.setTimeout(() => {
      if (!cancelled) setPhase('out')
    }, FADE_MS + HOLD_MS)
    const tDone = window.setTimeout(() => {
      if (!cancelled) {
        localStorage.setItem(STORAGE_KEY, String(Date.now()))
        setFinished(true)
      }
    }, FADE_MS + HOLD_MS + FADE_MS)

    return () => {
      cancelled = true
      cancelAnimationFrame(outerRaf)
      cancelAnimationFrame(innerRaf)
      window.clearTimeout(tFadeOut)
      window.clearTimeout(tDone)
    }
  }, [finished, silenced])

  if (silenced || finished) return null

  const imgClass =
    phase === 'out'
      ? 'splash-cat-img splash-cat-img--out'
      : phase === 'peak'
        ? 'splash-cat-img splash-cat-img--peak'
        : 'splash-cat-img'

  const bubblePhaseClass =
    phase === 'out'
      ? 'splash-cat-bubble-wrap splash-cat-bubble-wrap--out'
      : phase === 'peak'
        ? 'splash-cat-bubble-wrap splash-cat-bubble-wrap--peak'
        : 'splash-cat-bubble-wrap splash-cat-bubble-wrap--idle'

  return (
    <div className="splash-cat-overlay" aria-hidden="true">
      <div className="splash-cat-cluster">
        <div className="splash-cat-figure">
          <img src={splashCatUrl} alt="" className={imgClass} draggable={false} />
          <div className={bubblePhaseClass}>
            <div className="splash-cat-bubble">
              <p className="splash-cat-bubble-text">{bubbleTextRef.current}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
