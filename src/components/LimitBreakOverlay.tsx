import { useEffect, useRef, useState } from 'react'
import begCatUrl from '../../beg.png'
import malBubbleUrl from '../../mal.png'
import { playLimitBreakBoom } from '../utils/limitBreakBoomSound'

const LIMIT_BREAK_ARIA_LABEL =
  '\uC651! \uD1B5\uC7A5\uC774 \uBC15\uC0B4 \uB0AC\uB2E4. \uB2F4\uB2EC \uC6D4\uAE09\uAE4C\uC9C0 \uC0BC\uC2DC\uC138\uB07C \uB77C\uBA74 \uBA39\uC73C\uBA74\uC11C \uC228\uB9CC \uC26C\uACE0 \uC0B4\uC544.'

const SCENE_ASSET_URLS = [begCatUrl, malBubbleUrl] as const

const EXPLOSION_MS = 1600

type LimitBreakPhase = 'explosion' | 'scene'

type LimitBreakOverlayProps = {
  open: boolean
  onClose: () => void
  onExplosionPhaseChange?: (active: boolean) => void
}

function preloadSceneAssets(): void {
  SCENE_ASSET_URLS.forEach((url) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  })
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

    preloadSceneAssets()
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
      <div className="limit-break-preload" aria-hidden="true">
        <img src={begCatUrl} alt="" decoding="async" fetchPriority="high" />
        <img src={malBubbleUrl} alt="" decoding="async" fetchPriority="high" />
      </div>

      {phase === 'explosion' ? (
        <div className="limit-break-explosion" aria-hidden>
          <span className="limit-break-burst limit-break-burst--core" />
          <span className="limit-break-burst limit-break-burst--ring" />
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => (
            <span key={id} className={`limit-break-spark limit-break-spark--${id}`} />
          ))}
          <p className="limit-break-boom-text">BOMB!</p>
        </div>
      ) : null}

      {phase === 'scene' ? (
        <div className="limit-break-scene-wrap">
          <div className="limit-break-scene" role="group" aria-labelledby="limit-break-title">
            <p id="limit-break-title" className="limit-break-sr-only">
              {LIMIT_BREAK_ARIA_LABEL}
            </p>
            <img src={begCatUrl} alt="" className="limit-break-beg" draggable={false} decoding="async" />
            <img src={malBubbleUrl} alt="" className="limit-break-mal" draggable={false} decoding="async" />
          </div>
          <div className="limit-break-actions">
            <button type="button" className="limit-break-btn" onClick={handleDismissTap}>
              {'\uC815\uC2E0 \uCC28\uB9AC\uAE30'}
            </button>
            <button type="button" className="limit-break-btn limit-break-btn--alt" onClick={handleDismissTap}>
              {'\uBC18\uC131\uD569\uB2C8\uB2E4'}
            </button>
          </div>
          {dismissTaps === 1 ? (
            <p className="limit-break-hint">{'\uD55C \uBC88 \uB354 \uB204\uB974\uC57C \uB2EB\uD600\uC694'}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
