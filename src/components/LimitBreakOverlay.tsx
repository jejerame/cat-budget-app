import { useEffect, useRef, useState } from 'react'
import begCatUrl from '../../beg.png'
import malBubbleUrl from '../../mal.png'
import { playLimitBreakBoom } from '../utils/limitBreakBoomSound'

const LIMIT_BREAK_ARIA_LABEL =
  '펑! 통장이 박살 났다. 담달 월급까지 삼시세끼 라면 먹으면서 숨만 쉬고 살아.'

const EXPLOSION_MS = 1600

type LimitBreakPhase = 'explosion' | 'scene'

type LimitBreakOverlayProps = {
  open: boolean
  onClose: () => void
  onExplosionPhaseChange?: (active: boolean) => void
}

export function LimitBreakOverlay({ open, onClose, onExplosionPhaseChange }: LimitBreakOverlayProps) {
  const [phase, setPhase] = useState<LimitBreakPhase>('explosion')
  const [dismissTaps, setDismissTaps] = useState(0)
  const timersRef = useRef<number[]>([])
  const explosionCbRef = useRef(onExplosionPhaseChange)
  explosionCbRef.current = onExplosionPhaseChange

  const clearTimers = (): void => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }

  useEffect(() => {
    if (!open) {
      clearTimers()
      setPhase('explosion')
      setDismissTaps(0)
      explosionCbRef.current?.(false)
      return undefined
    }

    setPhase('explosion')
    setDismissTaps(0)
    explosionCbRef.current?.(true)
    playLimitBreakBoom()

    const sceneTimer = window.setTimeout(() => {
      setPhase('scene')
      explosionCbRef.current?.(false)
    }, EXPLOSION_MS)
    timersRef.current.push(sceneTimer)

    return () => {
      clearTimers()
      explosionCbRef.current?.(false)
    }
  }, [open])

  if (!open) return null

  const handleDismissTap = (): void => {
    setDismissTaps((n) => {
      const next = n + 1
      if (next >= 2) onClose()
      return next
    })
  }

  return (
    <div className="limit-break-overlay" role="dialog" aria-modal="true" aria-labelledby="limit-break-title">
      {phase === 'explosion' ? (
        <div className="limit-break-explosion" aria-hidden>
          <span className="limit-break-burst limit-break-burst--core" />
          <span className="limit-break-burst limit-break-burst--ring" />
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => (
            <span key={id} className={`limit-break-spark limit-break-spark--${id}`} />
          ))}
          <p className="limit-break-boom-text">펑!</p>
        </div>
      ) : null}

      {phase === 'scene' ? (
        <div className="limit-break-scene-wrap">
          <div className="limit-break-scene" role="group" aria-labelledby="limit-break-title">
            <p id="limit-break-title" className="limit-break-sr-only">
              {LIMIT_BREAK_ARIA_LABEL}
            </p>
            <img src={begCatUrl} alt="" className="limit-break-beg" draggable={false} />
            <img src={malBubbleUrl} alt="" className="limit-break-mal" draggable={false} />
          </div>
          <div className="limit-break-actions">
            <button type="button" className="limit-break-btn" onClick={handleDismissTap}>
              정신 차리기
            </button>
            <button type="button" className="limit-break-btn limit-break-btn--alt" onClick={handleDismissTap}>
              반성합니다
            </button>
          </div>
          {dismissTaps === 1 ? <p className="limit-break-hint">한 번 더 눌러야 닫혀요</p> : null}
        </div>
      ) : null}
    </div>
  )
}
