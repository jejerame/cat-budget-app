import { useLayoutEffect, useRef, useEffect, useState } from 'react'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'
import { ensureNagBubbleImageReady } from '../utils/preloadNagBubbleImages'
import { playNagBubblePop } from '../utils/nagBubblePopSound'

export type NagBubbleVariant = 'instant' | 'weekly'

type NagBubbleOverlayProps = {
  variant: NagBubbleVariant
  text: string
  visible: boolean
  autoHideMs?: number
  onAutoClose?: () => void
  showConfirm?: boolean
  onConfirm?: () => void
}

export function NagBubbleOverlay({
  variant,
  text,
  visible,
  autoHideMs,
  onAutoClose,
  showConfirm,
  onConfirm,
}: NagBubbleOverlayProps) {
  const padRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [layoutTick, setLayoutTick] = useState(0)
  const [imgReady, setImgReady] = useState(false)

  useEffect(() => {
    if (!visible) {
      setImgReady(false)
      return
    }
    let cancelled = false
    void ensureNagBubbleImageReady(variant).then(() => {
      if (!cancelled) setImgReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [visible, variant])

  useLayoutEffect(() => {
    if (!visible || !imgReady) return
    const wrap = padRef.current
    const el = textRef.current
    if (!wrap || !el) return

    const maxPx = variant === 'instant' ? 22 : 23
    const minPx = 11
    let size = maxPx
    el.style.fontSize = `${size}px`
    el.style.lineHeight = '1.16'

    for (let i = 0; i < 100 && size > minPx; i += 1) {
      const overY = el.scrollHeight > wrap.clientHeight + 0.5
      const overX = el.scrollWidth > wrap.clientWidth + 0.5
      if (!overY && !overX) break
      size -= 0.4
      el.style.fontSize = `${size}px`
    }
  }, [visible, imgReady, text, variant, layoutTick])

  useEffect(() => {
    if (!visible || !imgReady) return
    playNagBubblePop()
  }, [visible, imgReady])

  const onAutoCloseRef = useRef(onAutoClose)
  onAutoCloseRef.current = onAutoClose

  useEffect(() => {
    if (!visible || !imgReady || autoHideMs == null || !onAutoCloseRef.current) return
    const id = window.setTimeout(() => onAutoCloseRef.current?.(), autoHideMs)
    return () => window.clearTimeout(id)
  }, [visible, imgReady, autoHideMs])

  if (!visible) return null
  if (!imgReady) return null

  const imgSrc = variant === 'instant' ? say1Url : say2Url

  return (
    <div className="nag-bubble-overlay nag-bubble-overlay--visible" role="dialog" aria-modal="true" aria-live="polite">
      <div className={`nag-bubble-card nag-bubble-card--${variant}`}>
        <div className="nag-bubble-visual">
          <img
            src={imgSrc}
            alt=""
            className="nag-bubble-img"
            draggable={false}
            decoding="sync"
            onLoad={() => setLayoutTick((n) => n + 1)}
          />
          <div className="nag-bubble-text-pad">
            <div ref={padRef} className="nag-bubble-text-slot">
              <p ref={textRef} className="nag-bubble-text">
                {text}
              </p>
            </div>
          </div>
        </div>
        {showConfirm && (
          <button type="button" className="nag-bubble-confirm" onClick={onConfirm}>
            확인
          </button>
        )}
      </div>
    </div>
  )
}
